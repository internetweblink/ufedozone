const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");


// ========================================
// LOAD GOOGLE OAUTH CREDENTIALS
// ========================================

const credentialsPath = path.join(
    __dirname,
    "..",
    "credentials"
);

const credentialFiles = fs
    .readdirSync(credentialsPath)
    .filter(file =>
        file.endsWith(".json") &&
        file !== "gmail-token.json"
    );

if (credentialFiles.length === 0) {
    throw new Error(
        "No Google OAuth credentials JSON file found."
    );
}

const credentials = JSON.parse(
    fs.readFileSync(
        path.join(
            credentialsPath,
            credentialFiles[0]
        ),
        "utf8"
    )
);

const {
    client_secret,
    client_id,
    redirect_uris
} = credentials.web;


// ========================================
// CREATE OAUTH CLIENT
// ========================================

const oauth2Client =
    new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );


// ========================================
// LOAD SAVED GMAIL TOKEN
// ========================================

const tokenPath = path.join(
    credentialsPath,
    "gmail-token.json"
);

if (!fs.existsSync(tokenPath)) {
    throw new Error(
        "gmail-token.json was not found. Please connect Gmail first."
    );
}

const tokens = JSON.parse(
    fs.readFileSync(
        tokenPath,
        "utf8"
    )
);

oauth2Client.setCredentials(tokens);


// ========================================
// CREATE GMAIL API
// ========================================

const gmail =
    google.gmail({
        version: "v1",
        auth: oauth2Client
    });


// ========================================
// SEND EMAIL
// ========================================

async function sendEmail({
    to,
    subject,
    text
}) {

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


module.exports = {
    sendEmail
};