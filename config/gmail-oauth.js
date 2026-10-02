const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const credentialsPath = path.join(
    __dirname,
    "..",
    "credentials"
);

let oauth2Client = null;

try {
    if (fs.existsSync(credentialsPath)) {

        const credentialFiles = fs
            .readdirSync(credentialsPath)
            .filter(file => file.endsWith(".json"));

        if (credentialFiles.length > 0) {

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

            oauth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            );
        }
    }
} catch (error) {
    console.error(
        "Gmail OAuth setup skipped:",
        error.message
    );
}

module.exports = oauth2Client;