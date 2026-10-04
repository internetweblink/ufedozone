document.addEventListener("DOMContentLoaded", function () {

const loginForm = document.getElementById("loginForm");

if (!loginForm) {
    return;
}

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const emailOrPhoneInput =
        document.getElementById("emailOrPhone");

    const passwordInput =
        document.getElementById("password");

    const emailOrPhone =
        emailOrPhoneInput.value.trim();

    const password =
        passwordInput.value;

    // ============================================
    // VALIDATION
    // ============================================

    if (!emailOrPhone || !password) {
        alert("Please enter your email/phone and password.");
        return;
    }

    // ============================================
    // LOGIN
    // ============================================

    try {

        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                emailOrPhone: emailOrPhone,
                password: password
            })
        });

        const data = await response.json();

        // ========================================
        // LOGIN ERROR
        // ========================================

        if (!response.ok) {
            alert(data.message || "Login failed.");
            return;
        }

        // ========================================
        // CHECK USER DATA
        // ========================================

        if (!data.user || !data.user.id) {

            alert(
                "Login was successful, but your account information could not be loaded."
            );

            return;
        }

        // ========================================
        // PREPARE USER DATA
        // ========================================

        const user = {
            ...data.user,
            id: Number(data.user.id)
        };

        // ========================================
        // SAVE FULL USER ACCOUNT
        // ========================================

        localStorage.setItem(
            "ufedozone_user",
            JSON.stringify(user)
        );

        sessionStorage.setItem(
            "ufedozone_user",
            JSON.stringify(user)
        );

        // ========================================
        // SAVE USER ID
        // ========================================

        localStorage.setItem(
            "userId",
            String(user.id)
        );

        sessionStorage.setItem(
            "userId",
            String(user.id)
        );

        // ========================================
        // GO TO HOME PAGE
        // ========================================

        window.location.href = "/";

    } catch (error) {

        console.error("Login error:", error);

        alert(
            "Unable to connect to the server. Please try again."
        );
    }
});


});
