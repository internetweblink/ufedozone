const verifyForm =
    document.getElementById("verifyForm");

const otpInput =
    document.getElementById("otp");

const verifyBtn =
    document.getElementById("verifyBtn");

const message =
    document.getElementById("message");

const emailText =
    document.getElementById("emailText");


// ========================================
// GET EMAIL FROM URL
// ========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const email =
    params.get("email");


// ========================================
// SHOW EMAIL
// ========================================

if (email) {

    emailText.textContent =
        email;

} else {

    emailText.textContent =
        "your email";
}


// ========================================
// OTP INPUT
// ========================================

otpInput.addEventListener(
    "input",
    () => {

        otpInput.value =
            otpInput.value
                .replace(/\D/g, "")
                .slice(0, 6);
    }
);


// ========================================
// VERIFY OTP
// ========================================

verifyForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const otp =
            otpInput.value.trim();


        // -------------------------------
        // CHECK EMAIL
        // -------------------------------

        if (!email) {

            message.textContent =
                "Your registration email is missing. Please register again.";

            message.className =
                "message error";

            return;
        }


        // -------------------------------
        // CHECK OTP
        // -------------------------------

        if (otp.length !== 6) {

            message.textContent =
                "Please enter the complete 6-digit code.";

            message.className =
                "message error";

            return;
        }


        // -------------------------------
        // BUTTON
        // -------------------------------

        verifyBtn.disabled =
            true;

        verifyBtn.textContent =
            "Verifying...";


        message.textContent =
            "Checking your verification code...";

        message.className =
            "message";


        try {

            // ---------------------------
            // SEND OTP TO SERVER
            // ---------------------------

            const response =
                await fetch(
                    "/api/verify-registration",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                email:
                                    email,

                                otp:
                                    otp
                            })
                    }
                );


            // ---------------------------
            // READ SERVER RESPONSE
            // ---------------------------

            let data;

            try {

                data =
                    await response.json();

            } catch {

                data = {
                    success: false,
                    message:
                        "The server returned an invalid response."
                };
            }


            console.log(
                "Verification response:",
                data
            );


            // ---------------------------
            // FAILED
            // ---------------------------

            if (!response.ok || !data.success) {

                message.textContent =
                    data.message ||
                    "The verification code is incorrect.";

                message.className =
                    "message error";


                otpInput.value =
                    "";


                verifyBtn.disabled =
                    false;

                verifyBtn.textContent =
                    "Verify Account";

                return;
            }


            // ---------------------------
            // SUCCESS
            // ---------------------------

            message.textContent =
                "Account created successfully! Redirecting to login...";

            message.className =
                "message success";


            verifyBtn.textContent =
                "Account Created ✓";


            otpInput.disabled =
                true;


            // ---------------------------
            // GO TO LOGIN
            // ---------------------------

            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                1500
            );


        } catch (error) {

            console.error(
                "Verification error:",
                error
            );


            message.textContent =
                "Unable to connect to the server. Please try again.";

            message.className =
                "message error";


            verifyBtn.disabled =
                false;

            verifyBtn.textContent =
                "Verify Account";
        }
    }
);