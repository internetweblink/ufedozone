const { google } = require("googleapis");

// ========================================
// GMAIL OAUTH SETTINGS
// ========================================

const clientId = process.env.GMAIL_CLIENT_ID;

const clientSecret = process.env.GMAIL_CLIENT_SECRET;

const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

const redirectUri =
    process.env.GMAIL_REDIRECT_URI ||
    "http://localhost:3000/auth/gmail/callback";


// ========================================
// CREATE GMAIL CLIENT
// ========================================

let gmail = null;

if (
    clientId &&
    clientSecret &&
    refreshToken
) {
    const oauth2Client =
        new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    gmail = google.gmail({
        version: "v1",
        auth: oauth2Client
    });
}


// ========================================
// SEND EMAIL
// ========================================

async function sendEmail({
    to,
    subject,
    text
}) {

    if (!gmail) {
        throw new Error(
            "Gmail is not configured. Please add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN."
        );
    }

    const message = [
        `From: UfedoZone <${process.env.GMAIL_USER}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        text
    ].join("\r\n");


    const encodedMessage =
        Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");


    const result =
        await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage
            }
        });


    return result.data;
}


// ========================================
// EXPORT
// ========================================

module.exports = {
    sendEmail
};