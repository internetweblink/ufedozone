
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const pool = require("./config/database");
const oauth2Client = require("./config/gmail-oauth");
const { sendEmail } = require("./config/gmail-send");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// NIGERIAN LOCATION DATA
// ========================================

const locationsPath = path.join(
    __dirname,
    "data",
    "nigeria-locations.json"
);

let nigeriaLocations = [];

try {
    nigeriaLocations = JSON.parse(
        fs.readFileSync(locationsPath, "utf8")
    );

    console.log(`Loaded ${nigeriaLocations.length} LGA records.`);
} catch (error) {
    console.error("Error loading Nigerian locations:", error.message);
}

// ========================================
// SHARED HELPERS
// ========================================

function positiveId(value) {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

function apiError(res, status, message) {
    return res.status(status).json({
        success: false,
        message
    });
}

async function userExists(userId) {
    const [rows] = await pool.query(
        "SELECT id FROM users WHERE id = ? LIMIT 1",
        [userId]
    );

    return rows.length > 0;
}

async function areAcceptedFriends(userA, userB) {
    if (!userA || !userB || userA === userB) {
        return false;
    }

    const [rows] = await pool.query(
        `SELECT id
         FROM friend_requests
         WHERE requester_id = ?
           AND recipient_id = ?
           AND status = 'accepted'
         LIMIT 1`,
        [Math.min(userA, userB), Math.max(userA, userB)]
    );

    // Friend requests are stored in their original direction.
    if (rows.length > 0) {
        return true;
    }

    const [reverseRows] = await pool.query(
        `SELECT id
         FROM friend_requests
         WHERE requester_id = ?
           AND recipient_id = ?
           AND status = 'accepted'
         LIMIT 1`,
        [userB, userA]
    );

    return reverseRows.length > 0;
}

async function findFriendRequest(userA, userB) {
    const [rows] = await pool.query(
        `SELECT id, requester_id, recipient_id, status, created_at
         FROM friend_requests
         WHERE (requester_id = ? AND recipient_id = ?)
            OR (requester_id = ? AND recipient_id = ?)
         LIMIT 1`,
        [userA, userB, userB, userA]
    );

    return rows[0] || null;
}

async function getConversation(conversationId) {
    const [rows] = await pool.query(
        `SELECT id, user_one_id, user_two_id
         FROM conversations
         WHERE id = ?
         LIMIT 1`,
        [conversationId]
    );

    return rows[0] || null;
}

function conversationIncludesUser(conversation, userId) {
    return Boolean(
        conversation &&
        (
            Number(conversation.user_one_id) === userId ||
            Number(conversation.user_two_id) === userId
        )
    );
}

async function canUseConversation(conversation, userId) {
    if (!conversationIncludesUser(conversation, userId)) {
        return false;
    }

    return areAcceptedFriends(
        Number(conversation.user_one_id),
        Number(conversation.user_two_id)
    );
}

// ========================================
// DATABASE CONNECTION TEST
// ========================================

async function testDatabase() {
    const connection = await pool.getConnection();

    try {
        console.log("MySQL database connected successfully.");
    } finally {
        connection.release();
    }
}

// ========================================
// GET NIGERIAN STATES
// ========================================

app.get("/api/states", (req, res) => {
    try {
        const states = new Map();

        nigeriaLocations.forEach((lga) => {
            if (
                lga.parent &&
                lga.parent.id &&
                lga.parent.name &&
                lga.parent.name.en
            ) {
                states.set(lga.parent.id, {
                    state_code: lga.parent.id,
                    state_name: lga.parent.name.en
                });
            }
        });

        const result = Array.from(states.values());

        result.sort((a, b) =>
            a.state_name.localeCompare(b.state_name)
        );

        return res.json({
            success: true,
            states: result
        });
    } catch (error) {
        console.error("Get states error:", error);

        return apiError(
            res,
            500,
            "Unable to load Nigerian states."
        );
    }
});

// ========================================
// GET LOCAL GOVERNMENT AREAS
// ========================================

app.get("/api/states/:state/lgas", (req, res) => {
    try {
        const stateId = req.params.state;

        const lgas = nigeriaLocations
            .filter((lga) =>
                lga.parent &&
                String(lga.parent.id) === String(stateId)
            )
            .map((lga) => ({
                lga_code: lga.id,
                lga_name: lga.name.en
            }));

        lgas.sort((a, b) =>
            a.lga_name.localeCompare(b.lga_name)
        );

        return res.json({
            success: true,
            lgas
        });
    } catch (error) {
        console.error("Get LGAs error:", error);

        return apiError(res, 500, "Unable to load LGAs.");
    }
});

// ========================================
// REGISTRATION
// ========================================

app.post("/api/register", async (req, res) => {
    try {
        const {
            full_name,
            phone,
            email,
            password,
            date_of_birth,
            gender,
            relationship_status,
            state_code,
            state_name,
            lga_code,
            lga_name
        } = req.body;

        if (
            !full_name ||
            !phone ||
            !email ||
            !password ||
            !date_of_birth ||
            !gender ||
            !relationship_status ||
            !state_code ||
            !state_name ||
            !lga_code ||
            !lga_name
        ) {
            return apiError(
                res,
                400,
                "Please fill in all required fields."
            );
        }

        if (String(password).length < 8) {
            return apiError(
                res,
                400,
                "Password must be at least 8 characters."
            );
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPhone = String(phone).trim();

        const [existing] = await pool.query(
            `SELECT id FROM users
             WHERE phone = ? OR email = ?
             LIMIT 1`,
            [cleanPhone, cleanEmail]
        );

        if (existing.length > 0) {
            return apiError(
                res,
                409,
                "This phone number or email address is already registered."
            );
        }

        const otp = crypto.randomInt(100000, 1000000).toString();
        const passwordHash = await bcrypt.hash(password, 12);
        const otpHash = await bcrypt.hash(otp, 10);

        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            "DELETE FROM pending_registrations WHERE phone = ? OR email = ?",
            [cleanPhone, cleanEmail]
        );

        await pool.query(
            `INSERT INTO pending_registrations
            (
                full_name, phone, email, password_hash,
                date_of_birth, gender, relationship_status,
                state_code, state_name, lga_code, lga_name,
                otp_hash, otp_expires_at, otp_attempts
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                String(full_name).trim(),
                cleanPhone,
                cleanEmail,
                passwordHash,
                date_of_birth,
                gender,
                relationship_status,
                state_code,
                state_name,
                lga_code,
                lga_name,
                otpHash,
                otpExpiresAt
            ]
        );

        try {
            await sendEmail({
                to: cleanEmail,
                subject: "Your UfedoZone verification code",
                text:
                    `Welcome to UfedoZone!\n\n` +
                    `Your verification code is: ${otp}\n\n` +
                    `This code will expire in 10 minutes.\n\n` +
                    `Do not share this code with anyone.\n\nUfedoZone`
            });
        } catch (emailError) {
            console.error("OTP email error:", emailError);

            await pool.query(
                "DELETE FROM pending_registrations WHERE email = ?",
                [cleanEmail]
            );

            return apiError(
                res,
                500,
                "Unable to send the verification email. Please try again."
            );
        }

        return res.json({
            success: true,
            message: "A verification code has been sent to your email.",
            requires_verification: true
        });
    } catch (error) {
        console.error("Registration error:", error);

        return apiError(
            res,
            500,
            "Unable to register right now. Please try again."
        );
    }
});

// ========================================
// VERIFY REGISTRATION OTP
// ========================================

app.post("/api/verify-registration", async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const otp = String(req.body.otp || "").trim();

        if (!email || !otp) {
            return apiError(
                res,
                400,
                "Email and verification code are required."
            );
        }

        const [rows] = await connection.query(
            `SELECT *
             FROM pending_registrations
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        if (rows.length === 0) {
            return apiError(
                res,
                404,
                "Registration request not found. Please register again."
            );
        }

        const registration = rows[0];

        if (
            new Date(registration.otp_expires_at).getTime() < Date.now()
        ) {
            await connection.query(
                "DELETE FROM pending_registrations WHERE id = ?",
                [registration.id]
            );

            return apiError(
                res,
                400,
                "This verification code has expired. Please register again."
            );
        }

        if (Number(registration.otp_attempts) >= 5) {
            await connection.query(
                "DELETE FROM pending_registrations WHERE id = ?",
                [registration.id]
            );

            return apiError(
                res,
                429,
                "Too many incorrect attempts. Please register again."
            );
        }

        const otpIsCorrect = await bcrypt.compare(
            otp,
            registration.otp_hash
        );

        if (!otpIsCorrect) {
            await connection.query(
                `UPDATE pending_registrations
                 SET otp_attempts = otp_attempts + 1
                 WHERE id = ?`,
                [registration.id]
            );

            return apiError(
                res,
                400,
                "Incorrect verification code."
            );
        }

        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO users
            (
                full_name, phone, email, password_hash,
                date_of_birth, gender, relationship_status,
                state_code, state_name, lga_code, lga_name,
                email_verified
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                registration.full_name,
                registration.phone,
                registration.email,
                registration.password_hash,
                registration.date_of_birth,
                registration.gender,
                registration.relationship_status,
                registration.state_code,
                registration.state_name,
                registration.lga_code,
                registration.lga_name
            ]
        );

        await connection.query(
            "DELETE FROM pending_registrations WHERE id = ?",
            [registration.id]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Your UfedoZone account has been created successfully.",
            user_id: result.insertId
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch (_) {}

        console.error("OTP verification error:", error);

        return apiError(
            res,
            500,
            "Unable to verify your account. Please try again."
        );
    } finally {
        connection.release();
    }
});

// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!emailOrPhone || !password) {
            return apiError(
                res,
                400,
                "Please enter your email/phone and password."
            );
        }

        const identifier = String(emailOrPhone).trim();

        const [users] = await pool.query(
            `SELECT
                id, full_name, phone, email, password_hash,
                date_of_birth, gender, relationship_status,
                state_code, state_name, lga_code, lga_name,
                email_verified, profile_photo, bio
             FROM users
             WHERE phone = ? OR email = ?
             LIMIT 1`,
            [identifier, identifier.toLowerCase()]
        );

        if (users.length === 0) {
            return apiError(
                res,
                401,
                "Email/phone or password is incorrect."
            );
        }

        const user = users[0];

        if (!user.email_verified) {
            return apiError(
                res,
                403,
                "Please verify your email address before logging in."
            );
        }

        if (!user.password_hash) {
            return apiError(
                res,
                500,
                "Your account password is not properly configured."
            );
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return apiError(
                res,
                401,
                "Email/phone or password is incorrect."
            );
        }

        delete user.password_hash;

        return res.json({
            success: true,
            message: "Login successful.",
            user
        });
    } catch (error) {
        console.error("Login error:", error);

        return apiError(
            res,
            500,
            "Unable to log you in right now. Please try again."
        );
    }
});

// ========================================
// GET USER PROFILE
// ========================================

app.get("/api/profile/:userId", async (req, res) => {
    try {
        const userId = positiveId(req.params.userId);

        if (!userId) {
            return apiError(res, 400, "Invalid user ID.");
        }

        const [users] = await pool.query(
            `SELECT
                id, full_name, phone, email, date_of_birth,
                gender, relationship_status, state_code,
                state_name, lga_code, lga_name, profile_photo,
                bio, email_verified, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        if (users.length === 0) {
            return apiError(res, 404, "User profile not found.");
        }

        return res.json({
            success: true,
            profile: users[0]
        });
    } catch (error) {
        console.error("Get profile error:", error);

        return apiError(
            res,
            500,
            "Unable to load the profile right now."
        );
    }
});

// ========================================
// UPDATE USER PROFILE
// ========================================

app.put("/api/profile/:userId", async (req, res) => {
    try {
        const userId = positiveId(req.params.userId);

        if (!userId) {
            return apiError(res, 400, "Invalid user ID.");
        }

        const {
            full_name,
            gender,
            relationship_status,
            state_code,
            state_name,
            lga_code,
            lga_name,
            profile_photo,
            bio
        } = req.body;

        if (
            typeof full_name !== "string" ||
            !full_name.trim()
        ) {
            return apiError(res, 400, "Full name is required.");
        }

        const cleanBio = typeof bio === "string" ? bio.trim() : "";

        if (cleanBio.length > 500) {
            return apiError(
                res,
                400,
                "About Me must not be more than 500 characters."
            );
        }

        let cleanProfilePhoto = null;

        if (
            typeof profile_photo === "string" &&
            profile_photo.trim()
        ) {
            cleanProfilePhoto = profile_photo.trim();

            if (
                cleanProfilePhoto.startsWith("data:image/") &&
                cleanProfilePhoto.length > 9000000
            ) {
                return apiError(
                    res,
                    400,
                    "Profile picture is too large. Please choose a smaller image."
                );
            }
        }

        if (!(await userExists(userId))) {
            return apiError(res, 404, "User profile not found.");
        }

        await pool.query(
            `UPDATE users
             SET full_name = ?,
                 gender = ?,
                 relationship_status = ?,
                 state_code = ?,
                 state_name = ?,
                 lga_code = ?,
                 lga_name = ?,
                 profile_photo = ?,
                 bio = ?
             WHERE id = ?`,
            [
                full_name.trim(),
                gender ? String(gender).trim() : null,
                relationship_status
                    ? String(relationship_status).trim()
                    : null,
                state_code ? String(state_code).trim() : null,
                state_name ? String(state_name).trim() : null,
                lga_code ? String(lga_code).trim() : null,
                lga_name ? String(lga_name).trim() : null,
                cleanProfilePhoto,
                cleanBio || null,
                userId
            ]
        );

        const [updatedUsers] = await pool.query(
            `SELECT
                id, full_name, phone, email, date_of_birth,
                gender, relationship_status, state_code,
                state_name, lga_code, lga_name, profile_photo,
                bio, email_verified, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        return res.json({
            success: true,
            message: "Profile updated successfully.",
            profile: updatedUsers[0]
        });
    } catch (error) {
        console.error("Update profile error:", error);

        return apiError(
            res,
            500,
            "Unable to update the profile right now."
        );
    }
});

// ========================================
// DISCOVER USERS
// ========================================

app.get("/api/discover", async (req, res) => {
    try {
        const userId = positiveId(req.query.userId);

        if (!userId) {
            return apiError(
                res,
                400,
                "A valid user ID is required."
            );
        }

        if (!(await userExists(userId))) {
            return apiError(res, 404, "User account not found.");
        }

        const [users] = await pool.query(
            `SELECT
                u.id,
                u.full_name,
                u.date_of_birth,
                u.gender,
                u.relationship_status,
                u.state_name,
                u.lga_name,
                u.profile_photo,
                u.bio,
                TIMESTAMPDIFF(
                    YEAR,
                    u.date_of_birth,
                    CURDATE()
                ) AS age,
                EXISTS (
                    SELECT 1
                    FROM user_likes ul
                    WHERE ul.liker_id = ?
                      AND ul.liked_user_id = u.id
                ) AS liked_by_me,
                (
                    SELECT fr.status
                    FROM friend_requests fr
                    WHERE (
                        fr.requester_id = ?
                        AND fr.recipient_id = u.id
                    ) OR (
                        fr.requester_id = u.id
                        AND fr.recipient_id = ?
                    )
                    LIMIT 1
                ) AS friendship_status,
                (
                    SELECT fr.requester_id
                    FROM friend_requests fr
                    WHERE (
                        fr.requester_id = ?
                        AND fr.recipient_id = u.id
                    ) OR (
                        fr.requester_id = u.id
                        AND fr.recipient_id = ?
                    )
                    LIMIT 1
                ) AS friendship_requester_id
             FROM users u
             WHERE u.id != ?
               AND u.email_verified = TRUE
             ORDER BY u.created_at DESC
             LIMIT 50`,
            [
                userId,
                userId,
                userId,
                userId,
                userId,
                userId
            ]
        );

        const results = users.map((user) => {
            const requestStatus = user.friendship_status;
            const requesterId = Number(
                user.friendship_requester_id
            );

            let friendshipStatus = requestStatus || "none";

            if (
                requestStatus === "pending"
            ) {
                friendshipStatus = requesterId === userId
                    ? "pending"
                    : "received";
            }

            return {
                ...user,
                liked_by_me: Boolean(user.liked_by_me),
                friendship_status: friendshipStatus
            };
        });

        return res.json({
            success: true,
            users: results
        });
    } catch (error) {
        console.error("Discover users error:", error);

        return apiError(
            res,
            500,
            "Unable to load people right now."
        );
    }
});

// ========================================
// SEND FRIEND REQUEST
// ========================================

app.post("/api/friend-requests", async (req, res) => {
    try {
        const requesterId = positiveId(req.body.requesterId);
        const recipientId = positiveId(req.body.recipientId);

        if (
            !requesterId ||
            !recipientId ||
            requesterId === recipientId
        ) {
            return apiError(res, 400, "Invalid friend request.");
        }

        if (
            !(await userExists(requesterId)) ||
            !(await userExists(recipientId))
        ) {
            return apiError(
                res,
                404,
                "One or both users could not be found."
            );
        }

        const existing = await findFriendRequest(
            requesterId,
            recipientId
        );

        if (existing && existing.status === "accepted") {
            return res.json({
                success: true,
                status: "accepted",
                message: "You are already friends."
            });
        }

        if (existing && existing.status === "pending") {
            return res.json({
                success: true,
                status: existing.requester_id === requesterId
                    ? "pending"
                    : "received",
                requestId: existing.id,
                message: existing.requester_id === requesterId
                    ? "Your friend request is already pending."
                    : "This person has already sent you a friend request."
            });
        }

        if (existing && existing.status === "declined") {
            await pool.query(
                `UPDATE friend_requests
                 SET requester_id = ?,
                     recipient_id = ?,
                     status = 'pending'
                 WHERE id = ?`,
                [requesterId, recipientId, existing.id]
            );

            return res.json({
                success: true,
                status: "pending",
                requestId: existing.id,
                message: "Friend request sent successfully."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO friend_requests
             (requester_id, recipient_id, status)
             VALUES (?, ?, 'pending')`,
            [requesterId, recipientId]
        );

        return res.status(201).json({
            success: true,
            status: "pending",
            requestId: result.insertId,
            message: "Friend request sent successfully."
        });
    } catch (error) {
        console.error("Send friend request error:", error);

        return apiError(
            res,
            500,
            "Unable to send friend request."
        );
    }
});

// ========================================
// GET INCOMING AND OUTGOING REQUESTS
// ========================================

app.get("/api/friend-requests/:userId", async (req, res) => {
    try {
        const userId = positiveId(req.params.userId);

        if (!userId) {
            return apiError(res, 400, "Invalid user ID.");
        }

        const [incoming] = await pool.query(
            `SELECT
                fr.id,
                fr.requester_id,
                fr.recipient_id,
                fr.status,
                fr.created_at,
                u.full_name,
                u.profile_photo,
                u.state_name,
                u.lga_name
             FROM friend_requests fr
             JOIN users u ON u.id = fr.requester_id
             WHERE fr.recipient_id = ?
               AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );

        const [outgoing] = await pool.query(
            `SELECT
                fr.id,
                fr.requester_id,
                fr.recipient_id,
                fr.status,
                fr.created_at,
                u.full_name,
                u.profile_photo,
                u.state_name,
                u.lga_name
             FROM friend_requests fr
             JOIN users u ON u.id = fr.recipient_id
             WHERE fr.requester_id = ?
               AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );

        return res.json({
            success: true,
            incoming,
            outgoing
        });
    } catch (error) {
        console.error("Get friend requests error:", error);

        return apiError(
            res,
            500,
            "Unable to load friend requests."
        );
    }
});

// ========================================
// ACCEPT OR DECLINE A FRIEND REQUEST
// ========================================

app.put(
    "/api/friend-requests/:requestId/respond",
    async (req, res) => {
        try {
            const requestId = positiveId(req.params.requestId);
            const userId = positiveId(req.body.userId);
            const action = String(
                req.body.action || ""
            ).toLowerCase();

            if (
                !requestId ||
                !userId ||
                !["accept", "decline"].includes(action)
            ) {
                return apiError(
                    res,
                    400,
                    "Invalid friend request response."
                );
            }

            const [requests] = await pool.query(
                `SELECT id, requester_id, recipient_id, status
                 FROM friend_requests
                 WHERE id = ?
                 LIMIT 1`,
                [requestId]
            );

            if (requests.length === 0) {
                return apiError(
                    res,
                    404,
                    "Friend request not found."
                );
            }

            const request = requests[0];

            if (Number(request.recipient_id) !== userId) {
                return apiError(
                    res,
                    403,
                    "You cannot respond to this friend request."
                );
            }

            if (request.status !== "pending") {
                return apiError(
                    res,
                    409,
                    "This friend request has already been handled."
                );
            }

            const newStatus = action === "accept"
                ? "accepted"
                : "declined";

            const [result] = await pool.query(
                `UPDATE friend_requests
                 SET status = ?
                 WHERE id = ?
                   AND recipient_id = ?
                   AND status = 'pending'`,
                [newStatus, requestId, userId]
            );

            if (result.affectedRows !== 1) {
                return apiError(
                    res,
                    409,
                    "This request has already been handled."
                );
            }

            return res.json({
                success: true,
                status: newStatus,
                message: action === "accept"
                    ? "Friend request accepted."
                    : "Friend request declined."
            });
        } catch (error) {
            console.error("Respond to friend request error:", error);

            return apiError(
                res,
                500,
                "Unable to respond to friend request."
            );
        }
    }
);

// ========================================
// REMOVE AN ACCEPTED FRIEND
// ========================================

app.delete("/api/friends/:otherUserId", async (req, res) => {
    try {
        const userId = positiveId(req.body.userId);
        const otherUserId = positiveId(req.params.otherUserId);

        if (
            !userId ||
            !otherUserId ||
            userId === otherUserId
        ) {
            return apiError(res, 400, "Invalid user IDs.");
        }

        const [result] = await pool.query(
            `DELETE FROM friend_requests
             WHERE status = 'accepted'
               AND (
                    (requester_id = ? AND recipient_id = ?)
                    OR
                    (requester_id = ? AND recipient_id = ?)
               )`,
            [userId, otherUserId, otherUserId, userId]
        );

        if (result.affectedRows === 0) {
            return apiError(res, 404, "Friendship not found.");
        }

        return res.json({
            success: true,
            message: "Friend removed successfully."
        });
    } catch (error) {
        console.error("Remove friend error:", error);

        return apiError(res, 500, "Unable to remove friend.");
    }
});

// ========================================
// LIST ACCEPTED FRIENDS
// ========================================

app.get("/api/friends/:userId", async (req, res) => {
    try {
        const userId = positiveId(req.params.userId);

        if (!userId) {
            return apiError(res, 400, "Invalid user ID.");
        }

        const [friends] = await pool.query(
            `SELECT
                u.id,
                u.full_name,
                u.profile_photo,
                u.gender,
                u.state_name,
                u.lga_name,
                fr.updated_at AS friends_since
             FROM friend_requests fr
             JOIN users u
               ON u.id = CASE
                   WHEN fr.requester_id = ?
                   THEN fr.recipient_id
                   ELSE fr.requester_id
               END
             WHERE (
                 fr.requester_id = ?
                 OR fr.recipient_id = ?
             )
             AND fr.status = 'accepted'
             ORDER BY u.full_name`,
            [userId, userId, userId]
        );

        return res.json({
            success: true,
            friends
        });
    } catch (error) {
        console.error("List friends error:", error);

        return apiError(res, 500, "Unable to load friends.");
    }
});

// ========================================
// CHECK FRIENDSHIP STATUS
// ========================================

app.get("/api/friendship-status", async (req, res) => {
    try {
        const userId = positiveId(req.query.userId);
        const otherUserId = positiveId(req.query.otherUserId);

        if (
            !userId ||
            !otherUserId ||
            userId === otherUserId
        ) {
            return apiError(res, 400, "Invalid user IDs.");
        }

        const request = await findFriendRequest(
            userId,
            otherUserId
        );

        if (!request) {
            return res.json({
                success: true,
                status: "none",
                areFriends: false,
                canMessage: false
            });
        }

        let status = request.status;

        if (status === "pending") {
            status = Number(request.requester_id) === userId
                ? "pending"
                : "received";
        }

        const areFriends = request.status === "accepted";

        return res.json({
            success: true,
            status,
            areFriends,
            canMessage: areFriends,
            requestId: request.id
        });
    } catch (error) {
        console.error("Friendship status error:", error);

        return apiError(
            res,
            500,
            "Unable to check friendship status."
        );
    }
});

// ========================================
// LIKE A PERSON
// ========================================

app.post("/api/likes", async (req, res) => {
    try {
        const likerId = positiveId(req.body.likerId);
        const likedUserId = positiveId(req.body.likedUserId);

        if (
            !likerId ||
            !likedUserId ||
            likerId === likedUserId
        ) {
            return apiError(res, 400, "Invalid like request.");
        }

        if (
            !(await userExists(likerId)) ||
            !(await userExists(likedUserId))
        ) {
            return apiError(
                res,
                404,
                "One or both users could not be found."
            );
        }

        await pool.query(
            `INSERT IGNORE INTO user_likes
             (liker_id, liked_user_id)
             VALUES (?, ?)`,
            [likerId, likedUserId]
        );

        return res.json({
            success: true,
            liked: true,
            message: "Like saved."
        });
    } catch (error) {
        console.error("Like user error:", error);

        return apiError(res, 500, "Unable to like this person.");
    }
});

// ========================================
// UNLIKE A PERSON
// ========================================

app.delete("/api/likes", async (req, res) => {
    try {
        const likerId = positiveId(req.body.likerId);
        const likedUserId = positiveId(req.body.likedUserId);

        if (
            !likerId ||
            !likedUserId ||
            likerId === likedUserId
        ) {
            return apiError(res, 400, "Invalid unlike request.");
        }

        await pool.query(
            `DELETE FROM user_likes
             WHERE liker_id = ?
               AND liked_user_id = ?`,
            [likerId, likedUserId]
        );

        return res.json({
            success: true,
            liked: false,
            message: "Like removed."
        });
    } catch (error) {
        console.error("Unlike user error:", error);

        return apiError(
            res,
            500,
            "Unable to remove this like."
        );
    }
});

// ========================================
// CREATE OR REOPEN A CONVERSATION
// ACCEPTED FRIENDS ONLY
// ========================================

app.post("/api/conversations", async (req, res) => {
    try {
        const userId = positiveId(req.body.userId);
        const otherUserId = positiveId(req.body.otherUserId);

        if (
            !userId ||
            !otherUserId ||
            userId === otherUserId
        ) {
            return apiError(res, 400, "Invalid conversation users.");
        }

        if (
            !(await userExists(userId)) ||
            !(await userExists(otherUserId))
        ) {
            return apiError(res, 404, "User not found.");
        }

        if (!(await areAcceptedFriends(userId, otherUserId))) {
            return apiError(
                res,
                403,
                "You can message only after the friend request is accepted."
            );
        }

        const userOneId = Math.min(userId, otherUserId);
        const userTwoId = Math.max(userId, otherUserId);

        await pool.query(
            `INSERT INTO conversations (user_one_id, user_two_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
                id = LAST_INSERT_ID(id)`,
            [userOneId, userTwoId]
        );

        const [rows] = await pool.query(
            `SELECT id, user_one_id, user_two_id, created_at, updated_at
             FROM conversations
             WHERE user_one_id = ? AND user_two_id = ?
             LIMIT 1`,
            [userOneId, userTwoId]
        );

        return res.json({
            success: true,
            conversation: rows[0]
        });
    } catch (error) {
        console.error("Create conversation error:", error);

        return apiError(
            res,
            500,
            "Unable to open conversation."
        );
    }
});

// ========================================
// LIST A USER'S CONVERSATIONS
// ========================================

app.get("/api/conversations/:userId", async (req, res) => {
    try {
        const userId = positiveId(req.params.userId);

        if (!userId) {
            return apiError(res, 400, "Invalid user ID.");
        }

        const [rows] = await pool.query(
            `SELECT
                c.id AS conversation_id,
                c.user_one_id,
                c.user_two_id,
                c.created_at,
                c.updated_at,
                other.id AS other_user_id,
                other.full_name AS other_user_name,
                other.profile_photo AS other_user_photo,
                (
                    SELECT m.message
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC, m.id DESC
                    LIMIT 1
                ) AS last_message,
                (
                    SELECT m.created_at
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC, m.id DESC
                    LIMIT 1
                ) AS last_message_at,
                (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.conversation_id = c.id
                      AND m.receiver_id = ?
                      AND m.is_read = 0
                ) AS unread_count
             FROM conversations c
             JOIN users other
               ON other.id = CASE
                   WHEN c.user_one_id = ?
                   THEN c.user_two_id
                   ELSE c.user_one_id
               END
             WHERE (c.user_one_id = ? OR c.user_two_id = ?)
               AND EXISTS (
                   SELECT 1
                   FROM friend_requests fr
                   WHERE fr.status = 'accepted'
                     AND (
                         (fr.requester_id = c.user_one_id
                          AND fr.recipient_id = c.user_two_id)
                         OR
                         (fr.requester_id = c.user_two_id
                          AND fr.recipient_id = c.user_one_id)
                     )
               )
             ORDER BY COALESCE(last_message_at, c.updated_at) DESC`,
            [userId, userId, userId, userId]
        );

        return res.json({
            success: true,
            conversations: rows
        });
    } catch (error) {
        console.error("List conversations error:", error);

        return apiError(
            res,
            500,
            "Unable to load conversations."
        );
    }
});

// ========================================
// GET CONVERSATION MESSAGES
// ========================================

app.get(
    "/api/conversations/:conversationId/messages",
    async (req, res) => {
        try {
            const conversationId = positiveId(
                req.params.conversationId
            );

            const userId = positiveId(req.query.userId);

            if (!conversationId || !userId) {
                return apiError(
                    res,
                    400,
                    "Valid conversation and user IDs are required."
                );
            }

            const conversation = await getConversation(
                conversationId
            );

            if (!conversation) {
                return apiError(
                    res,
                    404,
                    "Conversation not found."
                );
            }

            if (!(await canUseConversation(conversation, userId))) {
                return apiError(
                    res,
                    403,
                    "Only accepted friends in this conversation can view messages."
                );
            }

            const [messages] = await pool.query(
                `SELECT
                    id,
                    conversation_id,
                    sender_id,
                    receiver_id,
                    message,
                    created_at,
                    is_read
                 FROM messages
                 WHERE conversation_id = ?
                 ORDER BY created_at ASC, id ASC`,
                [conversationId]
            );

            return res.json({
                success: true,
                messages
            });
        } catch (error) {
            console.error("Get messages error:", error);

            return apiError(
                res,
                500,
                "Unable to load messages."
            );
        }
    }
);

// ========================================
// SEND A MESSAGE
// ACCEPTED FRIENDS ONLY
// ========================================

app.post(
    "/api/conversations/:conversationId/messages",
    async (req, res) => {
        try {
            const conversationId = positiveId(
                req.params.conversationId
            );

            const senderId = positiveId(req.body.senderId);
            const message = typeof req.body.message === "string"
                ? req.body.message.trim()
                : "";

            if (
                !conversationId ||
                !senderId ||
                !message
            ) {
                return apiError(
                    res,
                    400,
                    "A conversation, sender, and message are required."
                );
            }

            if (message.length > 5000) {
                return apiError(
                    res,
                    400,
                    "Messages must not exceed 5,000 characters."
                );
            }

            const conversation = await getConversation(
                conversationId
            );

            if (!conversation) {
                return apiError(
                    res,
                    404,
                    "Conversation not found."
                );
            }

            if (
                !(await canUseConversation(
                    conversation,
                    senderId
                ))
            ) {
                return apiError(
                    res,
                    403,
                    "Only accepted friends in this conversation can send messages."
                );
            }

            const receiverId =
                Number(conversation.user_one_id) === senderId
                    ? Number(conversation.user_two_id)
                    : Number(conversation.user_one_id);

            const [result] = await pool.query(
                `INSERT INTO messages
                 (conversation_id, sender_id, receiver_id, message)
                 VALUES (?, ?, ?, ?)`,
                [
                    conversationId,
                    senderId,
                    receiverId,
                    message
                ]
            );

            await pool.query(
                `UPDATE conversations
                 SET updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [conversationId]
            );

            const [rows] = await pool.query(
                `SELECT
                    id,
                    conversation_id,
                    sender_id,
                    receiver_id,
                    message,
                    created_at,
                    is_read
                 FROM messages
                 WHERE id = ?
                 LIMIT 1`,
                [result.insertId]
            );

            return res.status(201).json({
                success: true,
                message: "Message sent.",
                data: rows[0]
            });
        } catch (error) {
            console.error("Send message error:", error);

            return apiError(
                res,
                500,
                "Unable to send message."
            );
        }
    }
);

// ========================================
// MARK A MESSAGE AS READ
// ========================================

app.put("/api/messages/:messageId/read", async (req, res) => {
    try {
        const messageId = positiveId(req.params.messageId);
        const userId = positiveId(req.body.userId);

        if (!messageId || !userId) {
            return apiError(res, 400, "Invalid message or user ID.");
        }

        const [rows] = await pool.query(
            `SELECT
                m.id,
                m.receiver_id,
                m.conversation_id,
                c.user_one_id,
                c.user_two_id
             FROM messages m
             JOIN conversations c
               ON c.id = m.conversation_id
             WHERE m.id = ?
             LIMIT 1`,
            [messageId]
        );

        if (rows.length === 0) {
            return apiError(res, 404, "Message not found.");
        }

        const row = rows[0];

        if (Number(row.receiver_id) !== userId) {
            return apiError(
                res,
                403,
                "Only the message recipient can mark it as read."
            );
        }

        if (!(await canUseConversation(row, userId))) {
            return apiError(
                res,
                403,
                "You no longer have permission to access this conversation."
            );
        }

        await pool.query(
            `UPDATE messages
             SET is_read = 1
             WHERE id = ? AND receiver_id = ?`,
            [messageId, userId]
        );

        return res.json({
            success: true,
            message: "Message marked as read."
        });
    } catch (error) {
        console.error("Mark message read error:", error);

        return apiError(
            res,
            500,
            "Unable to update message status."
        );
    }
});

// ========================================
// GMAIL OAUTH AUTHORIZATION
// ========================================

app.get("/auth/gmail", (req, res) => {
    const scopes = [
        "https://www.googleapis.com/auth/gmail.send"
    ];

    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent"
    });

    return res.redirect(authorizationUrl);
});

// ========================================
// GMAIL OAUTH CALLBACK
// ========================================

app.get("/oauth2callback", async (req, res) => {
    try {
        const code = req.query.code;

        if (!code) {
            return res.status(400).send(
                "Authorization code was not received."
            );
        }

        const { tokens } = await oauth2Client.getToken(code);

        const credentialsDirectory = path.join(
            __dirname,
            "credentials"
        );

        fs.mkdirSync(credentialsDirectory, {
            recursive: true
        });

        const tokenPath = path.join(
            credentialsDirectory,
            "gmail-token.json"
        );

        fs.writeFileSync(
            tokenPath,
            JSON.stringify(tokens, null, 2)
        );

        console.log("Gmail authorization successful.");
        console.log("Gmail token saved.");

        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0">
                <title>UfedoZone Gmail</title>
            </head>
            <body style="font-family:Arial;text-align:center;padding:60px">
                <h1>UfedoZone Gmail Connected</h1>
                <p>Your Gmail account has been successfully connected.</p>
                <p>You can close this page.</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Gmail OAuth error:", error);

        return res.status(500).send(
            "Gmail authorization failed. Check the server terminal."
        );
    }
});

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
    return res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// ========================================
// START SERVER
// ========================================

async function startServer() {
    try {
        await testDatabase();

        app.listen(PORT, () => {
            console.log(
                `UfedoZone server running at http://localhost:${PORT}`
            );

            console.log(
                `Gmail OAuth: http://localhost:${PORT}/auth/gmail`
            );
        });
    } catch (error) {
        console.error("Unable to start UfedoZone:", error);
        process.exit(1);
    }
}

startServer();