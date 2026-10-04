document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // ELEMENTS
    // =====================================================

    const loggedOutButtons =
        document.getElementById("loggedOutButtons");

    const loggedInButtons =
        document.getElementById("loggedInButtons");

    const welcomeUser =
        document.getElementById("welcomeUser");

    const headerUserName =
        document.getElementById("headerUserName");

    const welcomeAvatar =
        document.getElementById("welcomeAvatar");

    const welcomeAvatarInitial =
        document.getElementById(
            "welcomeAvatarInitial"
        );

    const welcomeAvatarImage =
        document.getElementById(
            "welcomeAvatarImage"
        );

    const heroLoggedOut =
        document.getElementById("heroLoggedOut");

    const heroLoggedIn =
        document.getElementById("heroLoggedIn");

    const logoutBtn =
        document.getElementById("logoutButton");

    const ctaButton =
        document.getElementById("ctaButton");

    const peopleGrid =
        document.getElementById("peopleGrid");

    const discoverJoinLink =
        document.getElementById("discoverJoinLink");

    const discoverSubtitle =
        document.getElementById("discoverSubtitle");


    // =====================================================
    // MOBILE MENU
    // =====================================================

    const mobileMenuBtn =
        document.getElementById(
            "mobileMenuButton"
        );

    const mobileMenu =
        document.getElementById(
            "mobileMenu"
        );


    if (mobileMenuBtn && mobileMenu) {

        mobileMenuBtn.addEventListener(
            "click",
            function () {

                mobileMenu.classList.toggle(
                    "open"
                );

                mobileMenuBtn.classList.toggle(
                    "open"
                );

            }
        );


        mobileMenu
            .querySelectorAll("a")
            .forEach(function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        mobileMenu.classList.remove(
                            "open"
                        );

                        mobileMenuBtn.classList.remove(
                            "open"
                        );

                    }
                );

            });

    }


    // =====================================================
    // STORAGE HELPERS
    // =====================================================

    function readStoredValue(key) {

        // Try localStorage first
        try {

            const localValue =
                localStorage.getItem(key);

            if (localValue) {

                return localValue;

            }

        } catch (error) {

            console.warn(
                "Local storage is unavailable:",
                error
            );

        }


        // If localStorage is unavailable or empty,
        // try sessionStorage.
        try {

            const sessionValue =
                sessionStorage.getItem(key);

            if (sessionValue) {

                return sessionValue;

            }

        } catch (error) {

            console.warn(
                "Session storage is unavailable:",
                error
            );

        }


        return null;

    }


    function saveStoredValue(
        key,
        value
    ) {

        // Save to localStorage
        try {

            localStorage.setItem(
                key,
                value
            );

        } catch (error) {

            console.warn(
                "Unable to save to local storage:",
                error
            );

        }


        // Also save to sessionStorage
        try {

            sessionStorage.setItem(
                key,
                value
            );

        } catch (error) {

            console.warn(
                "Unable to save to session storage:",
                error
            );

        }

    }


    function removeStoredValue(
        key
    ) {

        try {

            localStorage.removeItem(
                key
            );

        } catch (error) {

            console.warn(
                "Unable to remove local storage value:",
                error
            );

        }


        try {

            sessionStorage.removeItem(
                key
            );

        } catch (error) {

            console.warn(
                "Unable to remove session storage value:",
                error
            );

        }

    }


    // =====================================================
    // GET SAVED USER / RECOVER LOGIN STATE
    // =====================================================

    const savedUser =
        readStoredValue(
            "ufedozone_user"
        );


    const savedUserId =
        readStoredValue(
            "userId"
        );


    let currentUser = null;


    // -----------------------------------------------------
    // Try to recover the complete saved user
    // -----------------------------------------------------

    if (savedUser) {

        try {

            currentUser =
                JSON.parse(
                    savedUser
                );

        } catch (error) {

            console.error(
                "Unable to read saved user:",
                error
            );


            removeStoredValue(
                "ufedozone_user"
            );

        }

    }


    // -----------------------------------------------------
    // If the full user object is missing but the user ID
    // exists, recover the account from the server.
    // -----------------------------------------------------

    if (
        !currentUser &&
        savedUserId
    ) {

        const numericUserId =
            Number(
                savedUserId
            );


        if (
            Number.isFinite(
                numericUserId
            ) &&
            numericUserId > 0
        ) {

            currentUser = {

                id: numericUserId

            };

        }

    }


    // =====================================================
    // LOGGED-IN UI
    // =====================================================

    if (currentUser) {

        // -------------------------------------------------
        // Save user ID and user object again
        // -------------------------------------------------

        if (currentUser.id) {

            saveStoredValue(
                "userId",
                String(
                    currentUser.id
                )
            );


            saveStoredValue(
                "ufedozone_user",
                JSON.stringify(
                    currentUser
                )
            );

        }


        // -------------------------------------------------
        // Hide login/create buttons
        // -------------------------------------------------

        if (loggedOutButtons) {

            loggedOutButtons.style.display =
                "none";

        }


        // -------------------------------------------------
        // Show logged-in buttons
        // -------------------------------------------------

        if (loggedInButtons) {

            loggedInButtons.style.display =
                "flex";

        }


        // -------------------------------------------------
        // DISPLAY USER NAME
        // -------------------------------------------------

        updateHeaderUser(
            currentUser
        );


        // -------------------------------------------------
        // HERO BUTTONS
        // -------------------------------------------------

        if (heroLoggedOut) {

            heroLoggedOut.style.display =
                "none";

        }


        if (heroLoggedIn) {

            heroLoggedIn.style.display =
                "flex";

        }


        // -------------------------------------------------
        // CTA
        // -------------------------------------------------

        if (ctaButton) {

            ctaButton.innerHTML =
                'Go to My Profile <span>→</span>';

            ctaButton.href =
                "/profile.html";

        }


        // -------------------------------------------------
        // DISCOVER HEADING
        // -------------------------------------------------

        if (discoverJoinLink) {

            discoverJoinLink.style.display =
                "none";

        }


        if (discoverSubtitle) {

            discoverSubtitle.textContent =
                "Discover real people on UfedoZone and find someone you would like to know.";

        }


        // -------------------------------------------------
        // LOAD FRESH PROFILE INFORMATION
        // -------------------------------------------------

        if (currentUser.id) {

            loadCurrentUserProfile(
                currentUser.id,
                currentUser
            );

        }


        // -------------------------------------------------
        // LOAD DISCOVER USERS
        // -------------------------------------------------

        if (currentUser.id) {

            loadDiscoverUsers(
                currentUser.id
            );

        }

    } else {

        // =================================================
        // LOGGED OUT
        // =================================================

        if (peopleGrid) {

            peopleGrid.innerHTML = `
                <div class="discover-message discover-login-message">

                    <div class="discover-message-icon">
                        ♥
                    </div>

                    <h3>
                        Discover people on UfedoZone
                    </h3>

                    <p>
                        Create an account or login to discover
                        real people and make connections.
                    </p>

                    <div class="discover-message-actions">

                        <a
                            href="register.html"
                            class="primary-button"
                        >
                            Create Account
                            <span>→</span>
                        </a>

                        <a
                            href="login.html"
                            class="secondary-button"
                        >
                            Login
                        </a>

                    </div>

                </div>
            `;

        }

    }


    // =====================================================
    // UPDATE HEADER USER
    // =====================================================

    function updateHeaderUser(
        user
    ) {

        if (!user) {

            return;

        }


        const fullName =
            user.full_name ||
            user.name ||
            "User";


        // -------------------------------------------------
        // Header name
        // -------------------------------------------------

        if (headerUserName) {

            headerUserName.textContent =
                fullName;

        }


        // -------------------------------------------------
        // Avatar initial
        // -------------------------------------------------

        const firstLetter =
            getFirstLetter(
                fullName
            );


        if (welcomeAvatarInitial) {

            welcomeAvatarInitial.textContent =
                firstLetter;

        }


        // -------------------------------------------------
        // Profile photo
        // -------------------------------------------------

        const profilePhoto =
            user.profile_photo;


        if (
            typeof profilePhoto === "string" &&
            profilePhoto.trim() !== ""
        ) {

            showHeaderProfilePhoto(
                profilePhoto,
                fullName
            );

        } else {

            showHeaderInitial();

        }


        // -------------------------------------------------
        // Make welcome area clickable
        // -------------------------------------------------

        if (welcomeUser) {

            welcomeUser.style.cursor =
                "pointer";

            welcomeUser.title =
                "Open my profile";

        }

    }


    // =====================================================
    // SHOW HEADER PROFILE PHOTO
    // =====================================================

    function showHeaderProfilePhoto(
        photo,
        fullName
    ) {

        if (
            !welcomeAvatarImage ||
            !welcomeAvatarInitial
        ) {

            return;

        }


        welcomeAvatarImage.alt =
            fullName +
            " profile photo";


        welcomeAvatarImage.src =
            photo;


        welcomeAvatarImage.style.display =
            "block";


        welcomeAvatarInitial.style.display =
            "none";


        welcomeAvatarImage.onerror =
            function () {

                console.warn(
                    "Unable to load profile photo:",
                    photo
                );

                showHeaderInitial();

            };

    }


    // =====================================================
    // SHOW HEADER INITIAL
    // =====================================================

    function showHeaderInitial() {

        if (welcomeAvatarImage) {

            welcomeAvatarImage.style.display =
                "none";

            welcomeAvatarImage.removeAttribute(
                "src"
            );

        }


        if (welcomeAvatarInitial) {

            welcomeAvatarInitial.style.display =
                "flex";

        }

    }


    // =====================================================
    // LOAD CURRENT USER PROFILE
    // =====================================================

    async function loadCurrentUserProfile(
        userId,
        savedUserData
    ) {

        try {

            const response =
                await fetch(
                    "/api/profile/" +
                    encodeURIComponent(
                        userId
                    ),
                    {
                        method: "GET",
                        headers: {
                            "Accept":
                                "application/json"
                        },
                        cache: "no-store"
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                console.warn(
                    "Unable to load current profile:",
                    data.message
                );

                return;

            }


            const profile =
                data.user ||
                data.profile ||
                data.data ||
                null;


            if (!profile) {

                console.warn(
                    "Profile response did not contain user information."
                );

                return;

            }


            // -------------------------------------------------
            // Combine saved information with fresh server
            // information.
            // -------------------------------------------------

            const updatedUser = {

                ...savedUserData,

                ...profile

            };


            // -------------------------------------------------
            // Save the complete user profile to BOTH storage
            // locations so the account remains available
            // when the user opens the site on mobile.
            // -------------------------------------------------

            saveStoredValue(
                "ufedozone_user",
                JSON.stringify(
                    updatedUser
                )
            );


            if (updatedUser.id) {

                saveStoredValue(
                    "userId",
                    String(
                        updatedUser.id
                    )
                );

            }


            // -------------------------------------------------
            // Update the page immediately with fresh data.
            // -------------------------------------------------

            updateHeaderUser(
                updatedUser
            );


            // -------------------------------------------------
            // Keep currentUser updated.
            // -------------------------------------------------

            currentUser =
                updatedUser;

        } catch (error) {

            console.warn(
                "Current profile request failed:",
                error
            );

        }

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                // Remove login state from BOTH storage types.
                removeStoredValue(
                    "ufedozone_user"
                );


                removeStoredValue(
                    "userId"
                );


                currentUser =
                    null;


                window.location.href =
                    "/";

            }
        );

    }


    // =====================================================
    // LOAD DISCOVER USERS
    // =====================================================

    async function loadDiscoverUsers(
        userId
    ) {

        if (!peopleGrid) {

            return;

        }


        peopleGrid.innerHTML = `
            <div class="discover-message discover-loading">

                <div class="discover-spinner"></div>

                <p>
                    Finding people for you...
                </p>

            </div>
        `;


        try {

            const response =
                await fetch(
                    "/api/discover?userId=" +
                    encodeURIComponent(
                        userId
                    ),
                    {
                        method: "GET",
                        headers: {
                            "Accept":
                                "application/json"
                        },
                        cache: "no-store"
                    }
                );


            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            if (
                !contentType.includes(
                    "application/json"
                )
            ) {

                throw new Error(
                    "The Discover service returned an unexpected response."
                );

            }


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to load Discover."
                );

            }


            const users =
                Array.isArray(data.users)
                    ? data.users
                    : [];


            if (users.length === 0) {

                peopleGrid.innerHTML = `
                    <div class="discover-message discover-empty">

                        <div class="discover-message-icon">
                            ♥
                        </div>

                        <h3>
                            No other members yet
                        </h3>

                        <p>
                            There are no other verified UfedoZone
                            members to show right now.
                            Check back again soon.
                        </p>

                    </div>
                `;

                return;

            }


            peopleGrid.innerHTML =
                users
                    .map(function (user) {

                        return createPersonCard(
                            user
                        );

                    })
                    .join("");


            attachDiscoverActions();

        } catch (error) {

            console.error(
                "Discover loading error:",
                error
            );


            peopleGrid.innerHTML = `
                <div class="discover-message discover-error">

                    <div class="discover-message-icon">
                        !
                    </div>

                    <h3>
                        We couldn't load Discover
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Please try again."
                        )}
                    </p>

                    <button
                        type="button"
                        class="primary-button discover-retry"
                        id="discoverRetry"
                    >
                        Try Again
                        <span>↻</span>
                    </button>

                </div>
            `;


            const retryButton =
                document.getElementById(
                    "discoverRetry"
                );


            if (retryButton) {

                retryButton.addEventListener(
                    "click",
                    function () {

                        loadDiscoverUsers(
                            userId
                        );

                    }
                );

            }

        }

    }


    // =====================================================
    // CREATE PERSON CARD
    // =====================================================

    function createPersonCard(
        user
    ) {

        const name =
            user.full_name ||
            "UfedoZone Member";


        const firstLetter =
            getFirstLetter(
                name
            );


        const age =
            user.age !== null &&
            user.age !== undefined
                ? user.age
                : calculateAge(
                    user.date_of_birth
                );


        const gender =
            user.gender
                ? formatText(
                    user.gender
                )
                : "";


        const relationshipStatus =
            user.relationship_status
                ? formatText(
                    user.relationship_status
                )
                : "";


        const state =
            user.state_name ||
            "";


        const lga =
            user.lga_name ||
            "";


        const location =
            [lga, state]
                .filter(Boolean)
                .join(", ");


        const bio =
            user.bio
                ? user.bio
                : "Open to making new connections.";


        const profilePhoto =
            user.profile_photo;


        let photoHTML;


        if (
            typeof profilePhoto === "string" &&
            profilePhoto.trim() !== ""
        ) {

            photoHTML = `
                <img
                    src="${escapeAttribute(
                        profilePhoto
                    )}"
                    alt="${escapeAttribute(
                        name
                    )}"
                    class="person-real-photo"
                    loading="lazy"
                >

                <span
                    class="person-letter person-photo-fallback"
                    style="display:none;"
                >
                    ${escapeHtml(
                        firstLetter
                    )}
                </span>
            `;

        } else {

            photoHTML = `
                <span class="person-letter">
                    ${escapeHtml(
                        firstLetter
                    )}
                </span>
            `;

        }


        const basicInfo =
            [

                age
                    ? age + " years"
                    : "",

                gender,

                relationshipStatus

            ]
                .filter(Boolean)
                .join(" • ");


        return `
            <article
                class="person-card"
                data-user-id="${escapeAttribute(
                    user.id
                )}"
            >

                <div class="person-image person-blue">

                    ${photoHTML}

                    <span class="person-status">
                        ● UfedoZone
                    </span>

                </div>


                <div class="person-details">

                    <div class="person-main-info">

                        <h3>
                            ${escapeHtml(
                                name
                            )}
                        </h3>


                        ${
                            basicInfo
                                ? `
                                    <p class="person-basic-info">
                                        ${escapeHtml(
                                            basicInfo
                                        )}
                                    </p>
                                  `
                                : ""
                        }


                        ${
                            location
                                ? `
                                    <p class="person-location">
                                        📍 ${escapeHtml(
                                            location
                                        )}
                                    </p>
                                  `
                                : ""
                        }


                        <p class="person-bio">
                            ${escapeHtml(
                                bio
                            )}
                        </p>

                    </div>


                    <div class="person-card-actions">

                        <button
                            type="button"
                            class="person-action person-pass"
                            data-action="pass"
                            data-user-id="${escapeAttribute(
                                user.id
                            )}"
                            aria-label="Pass"
                            title="Pass"
                        >
                            ×
                        </button>


                        <button
                            type="button"
                            class="person-action person-connect"
                            data-action="connect"
                            data-user-id="${escapeAttribute(
                                user.id
                            )}"
                            aria-label="Connect"
                            title="Connect"
                        >
                            ♥
                        </button>

                    </div>

                </div>

            </article>
        `;

    }


    // =====================================================
    // DISCOVER BUTTON ACTIONS
    // =====================================================

    function attachDiscoverActions() {

        if (!peopleGrid) {

            return;

        }


        const actionButtons =
            peopleGrid.querySelectorAll(
                ".person-action"
            );


        actionButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const card =
                            button.closest(
                                ".person-card"
                            );


                        if (!card) {

                            return;

                        }


                        const action =
                            button.dataset.action;


                        if (
                            action === "pass"
                        ) {

                            card.classList.add(
                                "person-card-passed"
                            );


                            setTimeout(
                                function () {

                                    card.remove();

                                },
                                300
                            );

                        }


                        if (
                            action === "connect"
                        ) {

                            button.classList.add(
                                "person-connect-selected"
                            );


                            button.innerHTML =
                                "✓";


                            button.title =
                                "Connection selected";


                            setTimeout(
                                function () {

                                    button.classList.remove(
                                        "person-connect-selected"
                                    );


                                    button.innerHTML =
                                        "♥";


                                    button.title =
                                        "Connect";

                                },
                                1200
                            );

                        }

                    }
                );

            }
        );

    }


    // =====================================================
    // CALCULATE AGE
    // =====================================================

    function calculateAge(
        dateOfBirth
    ) {

        if (!dateOfBirth) {

            return null;

        }


        const birthDate =
            new Date(
                dateOfBirth
            );


        if (
            Number.isNaN(
                birthDate.getTime()
            )
        ) {

            return null;

        }


        const today =
            new Date();


        let age =
            today.getFullYear() -
            birthDate.getFullYear();


        const monthDifference =
            today.getMonth() -
            birthDate.getMonth();


        if (
            monthDifference < 0 ||
            (
                monthDifference === 0 &&
                today.getDate() <
                birthDate.getDate()
            )
        ) {

            age--;

        }


        if (
            age < 0 ||
            age > 120
        ) {

            return null;

        }


        return age;

    }


    // =====================================================
    // FORMAT TEXT
    // =====================================================

    function formatText(
        value
    ) {

        if (!value) {

            return "";

        }


        return String(value)
            .replace(
                /_/g,
                " "
            )
            .replace(
                /\b\w/g,
                function (letter) {

                    return letter.toUpperCase();

                }
            );

    }


    // =====================================================
    // FIRST LETTER
    // =====================================================

    function getFirstLetter(
        name
    ) {

        if (!name) {

            return "U";

        }


        const trimmed =
            String(name).trim();


        if (!trimmed) {

            return "U";

        }


        return trimmed
            .charAt(0)
            .toUpperCase();

    }


    // =====================================================
    // HTML ESCAPE
    // =====================================================

    function escapeHtml(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    // =====================================================
    // ATTRIBUTE ESCAPE
    // =====================================================

    function escapeAttribute(
        value
    ) {

        return escapeHtml(
            value
        );

    }

});