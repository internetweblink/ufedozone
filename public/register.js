const registerForm = document.getElementById("registerForm");

const stateSelect = document.getElementById("state");

const lgaSelect = document.getElementById("lga");


// ========================================
// SHOW MESSAGE
// ========================================

function showMessage(title, message, showLogin = false) {

    const oldMessage =
        document.getElementById("registerMessage");

    if (oldMessage) {
        oldMessage.remove();
    }


    const messageBox =
        document.createElement("div");

    messageBox.id =
        "registerMessage";

    messageBox.className =
        "register-message";


    let loginButton = "";


    if (showLogin) {

        loginButton = `
            <button
                type="button"
                id="registerLoginButton"
                class="register-login-button"
            >
                Login to your account
            </button>
        `;
    }


    messageBox.innerHTML = `
        <div class="register-message-icon">
            ⚠
        </div>

        <div class="register-message-content">

            <strong>${title}</strong>

            <p>${message}</p>

            ${loginButton}

        </div>
    `;


    if (registerForm) {

        registerForm.insertBefore(
            messageBox,
            registerForm.firstChild
        );
    }


    const loginButtonElement =
        document.getElementById(
            "registerLoginButton"
        );


    if (loginButtonElement) {

        loginButtonElement.addEventListener(
            "click",
            function () {

                window.location.href =
                    "login.html";

            }
        );
    }


    setTimeout(function () {

        messageBox.classList.add("show");

    }, 10);


    messageBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ========================================
// REMOVE MESSAGE
// ========================================

function clearMessage() {

    const message =
        document.getElementById(
            "registerMessage"
        );

    if (message) {
        message.remove();
    }
}


// ========================================
// CLEAR MESSAGE WHEN USER TYPES
// ========================================

if (registerForm) {

    registerForm.addEventListener(
        "input",
        function () {

            clearMessage();

        }
    );
}


// ========================================
// LOAD STATES
// ========================================

async function loadStates() {

    try {

        if (!stateSelect) {

            console.error(
                "State select element was not found."
            );

            return;
        }


        stateSelect.innerHTML =
            '<option value="">Loading states...</option>';

        stateSelect.disabled = true;


        const response =
            await fetch(
                "/api/states"
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load states"
            );
        }


        const data =
            await response.json();


        console.log(
            "States API response:",
            data
        );


        if (
            !data ||
            !data.success ||
            !Array.isArray(data.states)
        ) {

            throw new Error(
                "Invalid states response from server."
            );
        }


        stateSelect.innerHTML =
            '<option value="">Select your state</option>';


        data.states.forEach(
            function (state) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    state.state_code;


                option.textContent =
                    state.state_name;


                stateSelect.appendChild(
                    option
                );

            }
        );


        stateSelect.disabled = false;


        console.log(
            `States loaded: ${data.states.length}`
        );


    } catch (error) {

        console.error(
            "Error loading states:",
            error
        );


        if (stateSelect) {

            stateSelect.innerHTML =
                '<option value="">Unable to load states</option>';

            stateSelect.disabled = true;
        }
    }
}


// ========================================
// LOAD LGAs
// ========================================

if (stateSelect) {

    stateSelect.addEventListener(
        "change",
        async function () {

            const stateCode =
                stateSelect.value;


            if (!lgaSelect) {

                console.error(
                    "LGA select element was not found."
                );

                return;
            }


            lgaSelect.innerHTML =
                '<option value="">Loading LGAs...</option>';


            lgaSelect.disabled = true;


            if (!stateCode) {

                lgaSelect.innerHTML =
                    '<option value="">Select your LGA</option>';

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/states/" +
                        encodeURIComponent(
                            stateCode
                        ) +
                        "/lgas"
                    );


                if (!response.ok) {

                    throw new Error(
                        "Unable to load LGAs"
                    );
                }


                const data =
                    await response.json();


                console.log(
                    "LGA API response:",
                    data
                );


                if (
                    !data ||
                    !data.success ||
                    !Array.isArray(data.lgas)
                ) {

                    throw new Error(
                        "Invalid LGA response from server."
                    );
                }


                lgaSelect.innerHTML =
                    '<option value="">Select your LGA</option>';


                data.lgas.forEach(
                    function (lga) {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            lga.lga_code;


                        option.textContent =
                            lga.lga_name;


                        lgaSelect.appendChild(
                            option
                        );

                    }
                );


                lgaSelect.disabled = false;


                console.log(
                    `LGAs loaded: ${data.lgas.length}`
                );


            } catch (error) {

                console.error(
                    "Error loading LGAs:",
                    error
                );


                lgaSelect.innerHTML =
                    '<option value="">Unable to load LGAs</option>';

                lgaSelect.disabled = true;
            }

        }
    );
}


// ========================================
// REGISTER
// ========================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            clearMessage();


            // ========================================
            // GET FORM VALUES
            // ========================================

            const fullName =
                document
                    .getElementById("fullName")
                    .value
                    .trim();


            const phone =
                document
                    .getElementById("phone")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("password")
                    .value;


            const dateOfBirth =
                document
                    .getElementById("dateOfBirth")
                    .value;


            const gender =
                document
                    .getElementById("gender")
                    .value;


            const relationshipStatus =
                document
                    .getElementById(
                        "relationshipStatus"
                    )
                    .value;


            const stateCode =
                stateSelect
                    ? stateSelect.value
                    : "";


            const stateName =
                stateSelect &&
                stateSelect.selectedIndex >= 0
                    ? stateSelect.options[
                        stateSelect.selectedIndex
                    ].textContent
                    : "";


            const lgaCode =
                lgaSelect
                    ? lgaSelect.value
                    : "";


            const lgaName =
                lgaSelect &&
                lgaSelect.selectedIndex >= 0
                    ? lgaSelect.options[
                        lgaSelect.selectedIndex
                    ].textContent
                    : "";


            const termsElement =
                document.getElementById(
                    "terms"
                );


            const terms =
                termsElement
                    ? termsElement.checked
                    : false;


            // ========================================
            // VALIDATION
            // ========================================

            if (
                !fullName ||
                !phone ||
                !email ||
                !password ||
                !dateOfBirth ||
                !gender ||
                !relationshipStatus ||
                !stateCode ||
                !lgaCode
            ) {

                showMessage(
                    "Missing information",
                    "Please fill in all required fields."
                );

                return;
            }


            if (
                password.length < 8
            ) {

                showMessage(
                    "Password too short",
                    "Your password must be at least 8 characters long."
                );

                return;
            }


            if (!terms) {

                showMessage(
                    "Terms and Conditions",
                    "Please accept the Terms and Conditions before creating your account."
                );

                return;
            }


            // ========================================
            // SUBMIT BUTTON
            // ========================================

            const submitButton =
                registerForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Sending code...";
            }


            // ========================================
            // SEND TO SERVER
            // ========================================

            try {

                const response =
                    await fetch(
                        "/api/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    full_name:
                                        fullName,

                                    phone:
                                        phone,

                                    email:
                                        email,

                                    password:
                                        password,

                                    date_of_birth:
                                        dateOfBirth,

                                    gender:
                                        gender,

                                    relationship_status:
                                        relationshipStatus,

                                    state_code:
                                        stateCode,

                                    state_name:
                                        stateName,

                                    lga_code:
                                        lgaCode,

                                    lga_name:
                                        lgaName

                                })
                        }
                    );


                // ========================================
                // READ SERVER RESPONSE
                // ========================================

                let data = {};


                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";


                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    data =
                        await response.json();

                } else {

                    const responseText =
                        await response.text();


                    console.error(
                        "Server response:",
                        responseText
                    );


                    data = {

                        message:
                            "The server returned an unexpected response."

                    };
                }


                // ========================================
                // REGISTRATION FAILED
                // ========================================

                if (!response.ok) {

                    const message =
                        data.message ||
                        "Registration failed.";


                    const lowerMessage =
                        message.toLowerCase();


                    // ========================================
                    // PHONE ALREADY EXISTS
                    // ========================================

                    if (
                        lowerMessage.includes("phone") &&
                        (
                            lowerMessage.includes("already") ||
                            lowerMessage.includes("exist") ||
                            lowerMessage.includes("registered")
                        )
                    ) {

                        showMessage(
                            "Phone number already registered",
                            "This phone number is already connected to a UfedoZone account. Please login instead.",
                            true
                        );

                    }


                    // ========================================
                    // EMAIL ALREADY EXISTS
                    // ========================================

                    else if (
                        lowerMessage.includes("email") &&
                        (
                            lowerMessage.includes("already") ||
                            lowerMessage.includes("exist") ||
                            lowerMessage.includes("registered")
                        )
                    ) {

                        showMessage(
                            "Email already registered",
                            "This email is already connected to a UfedoZone account. Please login instead.",
                            true
                        );

                    }


                    // ========================================
                    // GENERAL DUPLICATE
                    // ========================================

                    else if (
                        lowerMessage.includes("already") ||
                        lowerMessage.includes("duplicate") ||
                        lowerMessage.includes("exist")
                    ) {

                        showMessage(
                            "Account already exists",
                            "An account with these details is already registered on UfedoZone. Please login instead.",
                            true
                        );

                    }


                    // ========================================
                    // OTHER ERROR
                    // ========================================

                    else {

                        showMessage(
                            "Registration failed",
                            message
                        );
                    }


                    // Enable button again

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            "Create Account";
                    }


                    return;
                }


                // ========================================
                // OTP SENT
                // ========================================

                if (
                    data.success &&
                    data.requires_verification
                ) {

                    window.location.href =
                        "verify.html?email=" +
                        encodeURIComponent(
                            email
                        );

                    return;
                }


                // ========================================
                // UNEXPECTED SUCCESS RESPONSE
                // ========================================

                showMessage(
                    "Something went wrong",
                    data.message ||
                    "Your registration was not completed. Please try again."
                );


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Create Account";
                }


            } catch (error) {

                // ========================================
                // CONNECTION ERROR
                // ========================================

                console.error(
                    "Registration error:",
                    error
                );


                showMessage(
                    "Connection problem",
                    "Unable to connect to the server. Please check your connection and try again."
                );


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Create Account";
                }
            }

        }
    );
}


// ========================================
// START
// ========================================

loadStates();