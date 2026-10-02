require("dotenv").config();

const resend = require("./config/resend");

async function sendTestEmail() {
    try {
        const { data, error } = await resend.emails.send({
            from: "UfedoZone <onboarding@resend.dev>",
            to: [process.env.GMAIL_USER],
            subject: "UfedoZone Email Test",
            html: `
                <h2>UfedoZone</h2>
                <p>This is a test email from your UfedoZone application.</p>
                <p>If you received this email, your email system is working.</p>
            `
        });

        if (error) {
            console.error("Resend email failed:");
            console.error(error);
            return;
        }

        console.log("Email sent successfully!");
        console.log("Email ID:", data.id);

    } catch (error) {
        console.error("Email sending failed:");
        console.error(error);
    }
}

sendTestEmail();