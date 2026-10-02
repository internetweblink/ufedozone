require("dotenv").config();

console.log("Gmail:", process.env.GMAIL_USER);
console.log(
    "App password loaded:",
    !!process.env.GMAIL_APP_PASSWORD
);
console.log(
    "Password length:",
    process.env.GMAIL_APP_PASSWORD
        ? process.env.GMAIL_APP_PASSWORD.length
        : 0
);