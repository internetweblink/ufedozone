require("dotenv").config();

const transporter = require("./config/mail");

async function sendTestEmail() {
    try {

        const info = await transporter.sendMail({

            from: `"UfedoZone" <${process.env.GMAIL_USER}>`,

            to: process.env.GMAIL_USER,

            subject: "UfedoZone Gmail Test",

            text: "This is a test email from your UfedoZone application."

        });

        console.log("Email sent successfully!");
        console.log("Message ID:", info.messageId);

    } catch (error) {

        console.error("Email sending failed:");
        console.error(error);

    }
}

sendTestEmail();