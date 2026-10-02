const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const credentialsPath = path.join(
    __dirname,
    "..",
    "credentials"
);

const credentialFiles = fs
    .readdirSync(credentialsPath)
    .filter(file => file.endsWith(".json"));

if (credentialFiles.length === 0) {
    throw new Error(
        "No Google OAuth JSON file found in the credentials folder."
    );
}

const credentials = JSON.parse(
    fs.readFileSync(
        path.join(credentialsPath, credentialFiles[0]),
        "utf8"
    )
);

const { client_secret, client_id, redirect_uris } =
    credentials.web;

const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
);

module.exports = oauth2Client;