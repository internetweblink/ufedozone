const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const pool = require("./config/database");
const oauth2Client = require("./config/gmail-oauth");
const { sendEmail } = require("./config/gmail-send");

const app = express();
const PORT = 3000;


// ========================================
// MIDDLEWARE
// ========================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ========================================
// LOAD NIGERIAN LOCATION DATA
// ========================================

const locationsPath = path.join(
    __dirname,
    "data",
    "nigeria-locations.json"
);

let nigeriaLocations = [];

try {

    nigeriaLocations = JSON.parse(
        fs.readFileSync(
            locationsPath,
            "utf8"
        )
    );

    console.log(
        `Loaded ${nigeriaLocations.length} LGA records.`
    );

} catch (error) {

    console.error(
        "ERROR loading location file:"
    );

    console.error(error);
}


// ========================================
// TEST DATABASE
// ========================================

async function testDatabase() {

    try {

        const connection =
            await pool.getConnection();

        console.log(
            "MySQL database connected successfully."
        );

        connection.release();

    } catch (error) {

        console.error(
            "MySQL database connection failed:"
        );

        console.error(
            error.message
        );
    }
}


// ========================================
// GET STATES
// ========================================

app.get(
    "/api/states",
    (req, res) => {

        try {

            const states =
                new Map();

            nigeriaLocations.forEach(
                lga => {

                    if (
                        lga.parent &&
                        lga.parent.id &&
                        lga.parent.name &&
                        lga.parent.name.en
                    ) {

                        states.set(
                            lga.parent.id,
                            {
                                state_code:
                                    lga.parent.id,

                                state_name:
                                    lga.parent.name.en
                            }
                        );
                    }
                }
            );

            const result =
                Array.from(
                    states.values()
                );

            result.sort(
                (a, b) =>
                    a.state_name.localeCompare(
                        b.state_name
                    )
            );

            console.log(
                `API /api/states -> ${result.length} states`
            );

            res.json({

                success: true,

                states: result

            });

        } catch (error) {

            console.error(
                "Get states error:"
            );

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Unable to load Nigerian states."

            });
        }
    }
);


// ========================================
// GET LGAs
// ========================================

app.get(
    "/api/states/:state/lgas",
    (req, res) => {

        try {

            const stateId =
                req.params.state;

            const lgas =
                nigeriaLocations

                    .filter(
                        lga =>
                            lga.parent &&
                            lga.parent.id ===
                                stateId
                    )

                    .map(
                        lga => ({

                            lga_code:
                                lga.id,

                            lga_name:
                                lga.name.en

                        })
                    );

            lgas.sort(
                (a, b) =>
                    a.lga_name.localeCompare(
                        b.lga_name
                    )
            );

            console.log(
                `API /api/states/${stateId}/lgas -> ${lgas.length} LGAs`
            );

            res.json({

                success: true,

                lgas: lgas

            });

        } catch (error) {

            console.error(
                "Get LGAs error:"
            );

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Unable to load LGAs."

            });
        }
    }
);


// ========================================
// REGISTRATION API
// ========================================

app.post(
    "/api/register",
    async (req, res) => {

        try {

            console.log(
                "Registration request received."
            );


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

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill in all required fields."

                });
            }


            if (
                password.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must be at least 8 characters."

                });
            }


            const [
                existingPhone
            ] =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE phone = ?
                    LIMIT 1
                    `,
                    [phone]
                );


            if (
                existingPhone.length > 0
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This phone number is already registered."

                });
            }


            const [
                existingEmail
            ] =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [email]
                );


            if (
                existingEmail.length > 0
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This email address is already registered."

                });
            }


            const otp =
                crypto
                    .randomInt(
                        100000,
                        1000000
                    )
                    .toString();


            console.log(
                "OTP generated for:",
                email
            );


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const otpHash =
                await bcrypt.hash(
                    otp,
                    10
                );


            const otpExpiresAt =
                new Date(
                    Date.now() +
                    10 * 60 * 1000
                );


            await pool.query(
                `
                DELETE FROM pending_registrations
                WHERE phone = ?
                `,
                [phone]
            );


            await pool.query(
                `
                INSERT INTO pending_registrations
                (
                    full_name,
                    phone,
                    email,
                    password_hash,
                    date_of_birth,
                    gender,
                    relationship_status,
                    state_code,
                    state_name,
                    lga_code,
                    lga_name,
                    otp_hash,
                    otp_expires_at,
                    otp_attempts
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `,
                [
                    full_name,
                    phone,
                    email,
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


            await sendEmail({

                to: email,

                subject:
                    "Your UfedoZone verification code",

                text:
`Welcome to UfedoZone!

Your verification code is:

${otp}

This code will expire in 10 minutes.

Do not share this code with anyone.

If you did not create a UfedoZone account, you can ignore this email.

UfedoZone`

            });


            console.log(
                "OTP email sent successfully to:",
                email
            );


            res.json({

                success: true,

                message:
                    "A verification code has been sent to your email.",

                requires_verification:
                    true

            });


        } catch (error) {

            console.error(
                "Registration error:"
            );

            console.error(error);


            res.status(500).json({

                success: false,

                message:
                    "Unable to send verification code. Please try again."

            });
        }
    }
);


// ========================================
// VERIFY REGISTRATION OTP
// ========================================

app.post(
    "/api/verify-registration",
    async (req, res) => {

        try {

            const {
                email,
                otp
            } = req.body;


            if (
                !email ||
                !otp
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and verification code are required."

                });
            }


            const [
                rows
            ] =
                await pool.query(
                    `
                    SELECT *
                    FROM pending_registrations
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [email]
                );


            if (
                rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Registration request not found. Please register again."

                });
            }


            const registration =
                rows[0];


            if (
                new Date(
                    registration.otp_expires_at
                ).getTime() <
                Date.now()
            ) {

                await pool.query(
                    `
                    DELETE FROM pending_registrations
                    WHERE id = ?
                    `,
                    [registration.id]
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "This verification code has expired. Please register again."

                });
            }


            if (
                registration.otp_attempts >= 5
            ) {

                await pool.query(
                    `
                    DELETE FROM pending_registrations
                    WHERE id = ?
                    `,
                    [registration.id]
                );


                return res.status(429).json({

                    success: false,

                    message:
                        "Too many incorrect attempts. Please register again."

                });
            }


            const otpIsCorrect =
                await bcrypt.compare(
                    otp.toString(),
                    registration.otp_hash
                );


            if (!otpIsCorrect) {

                await pool.query(
                    `
                    UPDATE pending_registrations
                    SET otp_attempts =
                        otp_attempts + 1
                    WHERE id = ?
                    `,
                    [registration.id]
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "Incorrect verification code."

                });
            }


            const [
                result
            ] =
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        full_name,
                        phone,
                        email,
                        password_hash,
                        date_of_birth,
                        gender,
                        relationship_status,
                        state_code,
                        state_name,
                        lga_code,
                        lga_name,
                        email_verified
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                    `,
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


            await pool.query(
                `
                DELETE FROM pending_registrations
                WHERE id = ?
                `,
                [registration.id]
            );


            console.log(
                "New UfedoZone account created:",
                registration.email
            );


            res.json({

                success: true,

                message:
                    "Your UfedoZone account has been created successfully.",

                user_id:
                    result.insertId

            });


        } catch (error) {

            console.error(
                "OTP verification error:"
            );

            console.error(error);


            res.status(500).json({

                success: false,

                message:
                    "Unable to verify your account. Please try again."

            });
        }
    }
);


// ========================================
// USER LOGIN
// ========================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                phone,
                password
            } = req.body;


            if (
                !phone ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter your phone number and password."

                });
            }


            const [
                users
            ] =
                await pool.query(
                    `
                    SELECT
                        id,
                        full_name,
                        phone,
                        email,
                        password_hash,
                        date_of_birth,
                        gender,
                        relationship_status,
                        state_code,
                        state_name,
                        lga_code,
                        lga_name,
                        email_verified,
                        profile_photo,
                        bio
                    FROM users
                    WHERE phone = ?
                    LIMIT 1
                    `,
                    [phone]
                );


            if (
                users.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Phone number or password is incorrect."

                });
            }


            const user =
                users[0];


            if (
                !user.email_verified
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Please verify your email address before logging in."

                });
            }


            if (
                !user.password_hash
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Your account password is not properly configured."

                });
            }


            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordMatches) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Phone number or password is incorrect."

                });
            }


            delete user.password_hash;


            return res.status(200).json({

                success: true,

                message:
                    "Login successful.",

                user:
                    user

            });


        } catch (error) {

            console.error(
                "Login error:"
            );

            console.error(error);


            return res.status(500).json({

                success: false,

                message:
                    "Unable to log you in right now. Please try again."

            });
        }
    }
);


// ========================================
// GET USER PROFILE
// ========================================

app.get(
    "/api/profile/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            if (
                !userId ||
                isNaN(userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });
            }


            const [
                users
            ] =
                await pool.query(
                    `
                    SELECT
                        id,
                        full_name,
                        phone,
                        email,
                        date_of_birth,
                        gender,
                        relationship_status,
                        state_code,
                        state_name,
                        lga_code,
                        lga_name,
                        profile_photo,
                        bio,
                        email_verified,
                        created_at
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [userId]
                );


            if (
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User profile not found."

                });
            }


            return res.status(200).json({

                success: true,

                profile:
                    users[0]

            });


        } catch (error) {

            console.error(
                "Get profile error:"
            );

            console.error(error);


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load your profile right now."

            });
        }
    }
);


// ========================================
// UPDATE USER PROFILE
// ========================================

app.put(
    "/api/profile/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


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
                !userId ||
                isNaN(userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });
            }


            if (
                !full_name ||
                !full_name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name is required."

                });
            }


            // --------------------------------
            // BIO VALIDATION
            // --------------------------------

            const cleanBio =
                typeof bio === "string"
                    ? bio.trim()
                    : "";


            if (
                cleanBio.length > 500
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "About Me must not be more than 500 characters."

                });
            }


            // --------------------------------
            // PROFILE PHOTO VALIDATION
            // --------------------------------

            let cleanProfilePhoto = null;


            if (
                typeof profile_photo === "string" &&
                profile_photo.trim() !== ""
            ) {

                cleanProfilePhoto =
                    profile_photo.trim();


                if (
                    cleanProfilePhoto.startsWith(
                        "data:image/"
                    )
                ) {

                    if (
                        cleanProfilePhoto.length >
                        9000000
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Profile picture is too large. Please choose a smaller image."

                        });
                    }
                }
            }


            // --------------------------------
            // CHECK USER EXISTS
            // --------------------------------

            const [
                existingUser
            ] =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [userId]
                );


            if (
                existingUser.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User profile not found."

                });
            }


            // --------------------------------
            // UPDATE PROFILE
            // --------------------------------

            await pool.query(
                `
                UPDATE users
                SET
                    full_name = ?,
                    gender = ?,
                    relationship_status = ?,
                    state_code = ?,
                    state_name = ?,
                    lga_code = ?,
                    lga_name = ?,
                    profile_photo = ?,
                    bio = ?
                WHERE id = ?
                `,
                [
                    full_name.trim(),

                    gender
                        ? String(gender).trim()
                        : null,

                    relationship_status
                        ? String(
                            relationship_status
                          ).trim()
                        : null,

                    state_code
                        ? String(state_code).trim()
                        : null,

                    state_name
                        ? String(state_name).trim()
                        : null,

                    lga_code
                        ? String(lga_code).trim()
                        : null,

                    lga_name
                        ? String(lga_name).trim()
                        : null,

                    cleanProfilePhoto,

                    cleanBio || null,

                    userId
                ]
            );


            // --------------------------------
            // GET UPDATED PROFILE
            // --------------------------------

            const [
                updatedUsers
            ] =
                await pool.query(
                    `
                    SELECT
                        id,
                        full_name,
                        phone,
                        email,
                        date_of_birth,
                        gender,
                        relationship_status,
                        state_code,
                        state_name,
                        lga_code,
                        lga_name,
                        profile_photo,
                        bio,
                        email_verified,
                        created_at
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [userId]
                );


            console.log(
                `Profile updated successfully for user ${userId}`
            );


            return res.status(200).json({

                success: true,

                message:
                    "Profile updated successfully.",

                profile:
                    updatedUsers[0]

            });


        } catch (error) {

            console.error(
                "Update profile error:"
            );

            console.error(error);


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update your profile right now."

            });
        }
    }
);


// ========================================
// DISCOVER USERS
// ========================================

app.get(
    "/api/discover",
    async (req, res) => {

        try {

            console.log(
                "Discover API request received:",
                req.query
            );


            // --------------------------------
            // GET USER ID
            // --------------------------------

            const userId =
                Number.parseInt(
                    req.query.userId,
                    10
                );


            // --------------------------------
            // VALIDATE USER ID
            // --------------------------------

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A valid user ID is required."

                });

            }


            // --------------------------------
            // CHECK CURRENT USER
            // --------------------------------

            const [
                currentUser
            ] =
                await pool.query(
                    `
                    SELECT
                        id
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [userId]
                );


            if (
                currentUser.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User account not found."

                });

            }


            // --------------------------------
            // GET OTHER VERIFIED USERS
            // --------------------------------

            const [
                users
            ] =
                await pool.query(
                    `
                    SELECT
                        id,
                        full_name,
                        date_of_birth,
                        gender,
                        relationship_status,
                        state_name,
                        lga_name,
                        profile_photo,
                        bio,
                        TIMESTAMPDIFF(
                            YEAR,
                            date_of_birth,
                            CURDATE()
                        ) AS age
                    FROM users
                    WHERE id != ?
                    AND email_verified = TRUE
                    ORDER BY created_at DESC
                    LIMIT 50
                    `,
                    [userId]
                );


            console.log(
                `Discover API returned ${users.length} users for user ${userId}`
            );


            // --------------------------------
            // ALWAYS RETURN JSON
            // --------------------------------

            return res.status(200).json({

                success: true,

                users: users

            });


        } catch (error) {

            console.error(
                "Discover users error:"
            );

            console.error(error);


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load people right now."

            });

        }

    }
);


// ========================================
// GMAIL OAUTH AUTHORIZATION
// ========================================

app.get(
    "/auth/gmail",
    (req, res) => {

        const scopes = [
            "https://www.googleapis.com/auth/gmail.send"
        ];

        const authorizationUrl =
            oauth2Client.generateAuthUrl({

                access_type:
                    "offline",

                scope:
                    scopes,

                prompt:
                    "consent"

            });

        res.redirect(
            authorizationUrl
        );
    }
);


// ========================================
// GMAIL OAUTH CALLBACK
// ========================================

app.get(
    "/oauth2callback",
    async (req, res) => {

        try {

            const code =
                req.query.code;


            if (!code) {

                return res.status(400).send(
                    "Authorization code was not received."
                );
            }


            const {
                tokens
            } =
                await oauth2Client.getToken(
                    code
                );


            const tokenPath =
                path.join(
                    __dirname,
                    "credentials",
                    "gmail-token.json"
                );


            fs.writeFileSync(
                tokenPath,
                JSON.stringify(
                    tokens,
                    null,
                    2
                )
            );


            console.log(
                "Gmail authorization successful."
            );

            console.log(
                "Gmail token saved."
            );


            res.send(`
                <html>

                    <head>
                        <title>UfedoZone Gmail</title>
                    </head>

                    <body
                        style="
                            font-family: Arial;
                            text-align: center;
                            padding: 60px;
                        "
                    >

                        <h1>
                            UfedoZone Gmail Connected ✅
                        </h1>

                        <p>
                            Your Gmail account has been successfully connected.
                        </p>

                        <p>
                            You can close this page.
                        </p>

                    </body>

                </html>
            `);

        } catch (error) {

            console.error(
                "Gmail OAuth error:"
            );

            console.error(error);


            res.status(500).send(
                "Gmail authorization failed. Check the server terminal."
            );
        }
    }
);


// ========================================
// HOME
// ========================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);


// ========================================
// START SERVER
// ========================================

async function startServer() {

    await testDatabase();

    app.listen(
        PORT,
        () => {

            console.log(
                `UfedoZone server running at http://localhost:${PORT}`
            );

            console.log(
                "Gmail OAuth: http://localhost:3000/auth/gmail"
            );
        }
    );
}


startServer();