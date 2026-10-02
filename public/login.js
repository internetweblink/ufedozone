// ========================================
// UFEDOZONE LOGIN
// ========================================

const loginForm = document.getElementById("loginForm");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");


// ========================================
// SHOW / HIDE PASSWORD
// ========================================

const togglePassword =
    document.getElementById("togglePassword");

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (
                passwordInput.type === "password"
            ) {

                passwordInput.type = "text";

                togglePassword.textContent =
                    "Hide";

            } else {

                passwordInput.type =
                    "password";

                togglePassword.textContent =
                    "Show";
            }

        }
    );
}


// ========================================
// LOGIN FORM
// ========================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        // Stop the page from refreshing
        event.preventDefault();


        // Clear previous message
        message.textContent = "";
        message.style.color = "";


        const phone =
            phoneInput.value.trim();

        const password =
            passwordInput.value;


        // ====================================
        // BASIC VALIDATION
        // ====================================

        if (!phone || !password) {

            message.textContent =
                "Please enter your phone number and password.";

            message.style.color =
                "#dc2626";

            return;
        }


        // ====================================
        // DISABLE LOGIN BUTTON
        // ====================================

        loginBtn.disabled = true;

        loginBtn.textContent =
            "Logging in...";


        try {

            // ==================================
            // SEND LOGIN REQUEST
            // ==================================

            const response =
                await fetch(
                    "/api/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            phone:
                                phone,

                            password:
                                password

                        })
                    }
                );


            const data =
                await response.json();


            // ==================================
            // LOGIN FAILED
            // ==================================

            if (!response.ok || !data.success) {

                message.textContent =
                    data.message ||
                    "Login failed. Please check your details.";

                message.style.color =
                    "#dc2626";

                loginBtn.disabled =
                    false;

                loginBtn.textContent =
                    "Login";

                return;
            }


            // ==================================
            // LOGIN SUCCESS
            // ==================================

            message.textContent =
                "Login successful!";

            message.style.color =
                "#16a34a";


            // ==================================
            // SAVE USER INFORMATION
            // ==================================

            if (data.user) {

                localStorage.setItem(
                    "ufedozone_user",
                    JSON.stringify(data.user)
                );

            }


            // ==================================
            // GO TO HOME PAGE
            // ==================================

            setTimeout(
                function () {

                    window.location.href =
                        "index.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            message.textContent =
                "Unable to connect to the server. Please try again.";

            message.style.color =
                "#dc2626";


            loginBtn.disabled =
                false;

            loginBtn.textContent =
                "Login";
        }

    }
);