// ========================================
// UFEDOZONE PROFILE
// ========================================


// ========================================
// ELEMENTS
// ========================================

const loadingMessage =
    document.getElementById("loadingMessage");

const profileCard =
    document.getElementById("profileCard");

const errorMessage =
    document.getElementById("errorMessage");

const successMessage =
    document.getElementById("successMessage");

const fullNameInput =
    document.getElementById("fullName");

const emailInput =
    document.getElementById("email");

const phoneInput =
    document.getElementById("phone");

const dateOfBirthInput =
    document.getElementById("dateOfBirth");

const genderSelect =
    document.getElementById("gender");

const relationshipStatusSelect =
    document.getElementById("relationshipStatus");

const stateSelect =
    document.getElementById("state");

const lgaSelect =
    document.getElementById("lga");

const bioInput =
    document.getElementById("bio");

const bioCount =
    document.getElementById("bioCount");

const profilePhoto =
    document.getElementById("profilePhoto");

const photoInitial =
    document.getElementById("photoInitial");

const photoInput =
    document.getElementById("photoInput");

const displayName =
    document.getElementById("displayName");

const displayLocation =
    document.getElementById("displayLocation");

const emailVerification =
    document.getElementById("emailVerification");

const memberSince =
    document.getElementById("memberSince");

const saveProfileButton =
    document.getElementById("saveProfileButton");

const logoutButton =
    document.getElementById("logoutButton");


// ========================================
// LOCK ACCOUNT FIELDS
// ========================================
//
// These fields are controlled by the account
// created during registration.
//
// They must never become editable from
// the profile page.
//

function lockAccountFields() {

    if (emailInput) {

        emailInput.readOnly = true;

        emailInput.setAttribute(
            "aria-readonly",
            "true"
        );

        emailInput.classList.add(
            "locked-field"
        );
    }


    if (phoneInput) {

        phoneInput.readOnly = true;

        phoneInput.setAttribute(
            "aria-readonly",
            "true"
        );

        phoneInput.classList.add(
            "locked-field"
        );
    }


    if (dateOfBirthInput) {

        dateOfBirthInput.readOnly = true;

        dateOfBirthInput.setAttribute(
            "aria-readonly",
            "true"
        );

        dateOfBirthInput.classList.add(
            "locked-field"
        );

        // Prevent opening the date picker.
        dateOfBirthInput.addEventListener(
            "click",
            function () {

                dateOfBirthInput.blur();

            }
        );

        dateOfBirthInput.addEventListener(
            "keydown",
            function (event) {

                event.preventDefault();

            }
        );
    }
}


// Lock them immediately.
lockAccountFields();


// ========================================
// GET LOGGED-IN USER
// ========================================

function getUserId() {

    const storedUser =
        localStorage.getItem("ufedozone_user");


    if (storedUser) {

        try {

            const user =
                JSON.parse(storedUser);


            if (user && user.id) {

                return String(user.id);
            }


            if (user && user.user_id) {

                return String(user.user_id);
            }

        } catch (error) {

            console.error(
                "Unable to read ufedozone_user:",
                error
            );
        }
    }


    const userId =
        localStorage.getItem("userId");


    if (userId) {

        return userId;
    }


    showError(
        "Your session has expired. Please log in again."
    );


    setTimeout(function () {

        window.location.href = "/";

    }, 2000);


    return null;
}


// ========================================
// SHOW ERROR
// ========================================

function showError(message) {

    if (errorMessage) {

        errorMessage.textContent =
            message;

        errorMessage.style.display =
            "block";
    }


    if (successMessage) {

        successMessage.style.display =
            "none";
    }
}


// ========================================
// SHOW SUCCESS
// ========================================

function showSuccess(message) {

    if (successMessage) {

        successMessage.textContent =
            message;

        successMessage.style.display =
            "block";
    }


    if (errorMessage) {

        errorMessage.style.display =
            "none";
    }


    setTimeout(function () {

        if (successMessage) {

            successMessage.style.display =
                "none";
        }

    }, 4000);
}


// ========================================
// READ JSON RESPONSE
// ========================================

async function getResponseData(response) {

    const contentType =
        response.headers.get("content-type") || "";


    if (!contentType.includes("application/json")) {

        const text =
            await response.text();


        console.error(
            "Server returned:",
            text
        );


        throw new Error(
            "The server returned an unexpected response."
        );
    }


    return await response.json();
}


// ========================================
// SET SELECT VALUE SAFELY
// ========================================

function setSelectValue(
    selectElement,
    value
) {

    if (!selectElement) {
        return;
    }


    if (
        value === null ||
        value === undefined
    ) {

        selectElement.value = "";

        return;
    }


    const cleanValue =
        String(value)
            .trim()
            .toLowerCase();


    let found = false;


    for (
        const option of selectElement.options
    ) {

        const optionValue =
            String(option.value)
                .trim()
                .toLowerCase();


        const optionText =
            String(option.textContent)
                .trim()
                .toLowerCase();


        if (
            optionValue === cleanValue ||
            optionText === cleanValue
        ) {

            selectElement.value =
                option.value;

            found = true;

            break;
        }
    }


    if (!found) {

        selectElement.value = "";

        console.warn(
            `Could not find "${value}" in select options.`
        );
    }
}


// ========================================
// LOAD STATES
// ========================================

async function loadStates(
    selectedStateCode = ""
) {

    try {

        const response =
            await fetch(
                "/api/states"
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load states."
            );
        }


        if (!stateSelect) {
            return;
        }


        stateSelect.innerHTML =
            '<option value="">Select your state</option>';


        const states =
            Array.isArray(data.states)
                ? data.states
                : [];


        states.forEach(
            function (state) {

                const stateCode =
                    state.state_code ||
                    state.code ||
                    "";


                const stateName =
                    state.state_name ||
                    state.name ||
                    "";


                if (
                    !stateCode ||
                    !stateName
                ) {
                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    stateCode;


                option.textContent =
                    stateName;


                stateSelect.appendChild(
                    option
                );

            }
        );


        if (selectedStateCode) {

            setSelectValue(
                stateSelect,
                selectedStateCode
            );
        }


    } catch (error) {

        console.error(
            "Load states error:",
            error
        );


        showError(
            error.message ||
            "Unable to load Nigerian states."
        );
    }
}


// ========================================
// LOAD LGAs
// ========================================

async function loadLgas(
    stateCode,
    selectedLgaCode = ""
) {

    if (!lgaSelect) {
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
                `/api/states/${encodeURIComponent(stateCode)}/lgas`
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load LGAs."
            );
        }


        lgaSelect.innerHTML =
            '<option value="">Select your LGA</option>';


        const lgas =
            Array.isArray(data.lgas)
                ? data.lgas
                : [];


        lgas.forEach(
            function (lga) {

                const lgaCode =
                    lga.lga_code ||
                    lga.code ||
                    lga.id ||
                    "";


                const lgaName =
                    lga.lga_name ||
                    lga.name ||
                    "";


                if (
                    !lgaCode ||
                    !lgaName
                ) {
                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    lgaCode;


                option.textContent =
                    lgaName;


                lgaSelect.appendChild(
                    option
                );

            }
        );


        lgaSelect.disabled = false;


        if (selectedLgaCode) {

            setSelectValue(
                lgaSelect,
                selectedLgaCode
            );
        }


    } catch (error) {

        console.error(
            "Load LGAs error:",
            error
        );


        lgaSelect.innerHTML =
            '<option value="">Unable to load LGAs</option>';


        showError(
            error.message ||
            "Unable to load LGAs for this state."
        );
    }
}


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile() {

    const userId =
        getUserId();


    if (!userId) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/profile/${encodeURIComponent(userId)}`
            );


        const data =
            await getResponseData(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load your profile."
            );
        }


        const profile =
            data.profile;


        if (!profile) {

            throw new Error(
                "Profile information was not found."
            );
        }


        // ====================================
        // FULL NAME
        // ====================================

        if (fullNameInput) {

            fullNameInput.value =
                profile.full_name || "";
        }


        if (displayName) {

            displayName.textContent =
                profile.full_name ||
                "UfedoZone User";
        }


        // ====================================
        // EMAIL
        // ====================================

        if (emailInput) {

            emailInput.value =
                profile.email || "";

            emailInput.readOnly = true;
        }


        // ====================================
        // PHONE
        // ====================================

        if (phoneInput) {

            phoneInput.value =
                profile.phone || "";

            phoneInput.readOnly = true;
        }


        // ====================================
        // DATE OF BIRTH
        // ====================================

        if (dateOfBirthInput) {

            if (profile.date_of_birth) {

                dateOfBirthInput.value =
                    String(
                        profile.date_of_birth
                    ).substring(0, 10);

            } else {

                dateOfBirthInput.value = "";
            }

            dateOfBirthInput.readOnly = true;
        }


        // Make absolutely sure the account
        // fields remain locked after loading.
        lockAccountFields();


        // ====================================
        // GENDER
        // ====================================

        setSelectValue(
            genderSelect,
            profile.gender
        );


        // ====================================
        // RELATIONSHIP STATUS
        // ====================================

        setSelectValue(
            relationshipStatusSelect,
            profile.relationship_status
        );


        // ====================================
        // BIO
        // ====================================

        if (bioInput) {

            bioInput.value =
                profile.bio || "";

            updateBioCount();
        }


        // ====================================
        // EMAIL VERIFICATION
        // ====================================

        if (emailVerification) {

            if (
                profile.email_verified ||
                profile.phone_verified
            ) {

                emailVerification.textContent =
                    "Verified";

                emailVerification.classList.add(
                    "verification-status"
                );

            } else {

                emailVerification.textContent =
                    "Not verified";

                emailVerification.classList.remove(
                    "verification-status"
                );
            }
        }


        // ====================================
        // MEMBER SINCE
        // ====================================

        if (
            memberSince &&
            profile.created_at
        ) {

            const createdDate =
                new Date(
                    profile.created_at
                );


            if (
                !isNaN(
                    createdDate.getTime()
                )
            ) {

                memberSince.textContent =
                    createdDate.toLocaleDateString(
                        "en-NG",
                        {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                        }
                    );
            }
        }


        // ====================================
        // STATE AND LGA
        // ====================================

        const stateCode =
            profile.state_code || "";


        const lgaCode =
            profile.lga_code || "";


        const stateName =
            profile.state_name || "";


        const lgaName =
            profile.lga_name || "";


        await loadStates(
            stateCode
        );


        if (stateCode) {

            await loadLgas(
                stateCode,
                lgaCode
            );
        }


        updateLocation(
            stateName,
            lgaName
        );


        // ====================================
        // PROFILE PHOTO
        // ====================================

        if (profile.profile_photo) {

            setProfilePhoto(
                profile.profile_photo
            );

        } else {

            showProfileInitial(
                profile.full_name
            );
        }


        // ====================================
        // SHOW PROFILE
        // ====================================

        if (loadingMessage) {

            loadingMessage.style.display =
                "none";
        }


        if (profileCard) {

            profileCard.style.display =
                "block";
        }


    } catch (error) {

        console.error(
            "Load profile error:",
            error
        );


        if (loadingMessage) {

            loadingMessage.style.display =
                "none";
        }


        showError(
            error.message ||
            "Unable to load your profile."
        );
    }
}


// ========================================
// UPDATE LOCATION
// ========================================

function updateLocation(
    stateName,
    lgaName
) {

    if (!displayLocation) {
        return;
    }


    if (
        stateName &&
        lgaName
    ) {

        displayLocation.textContent =
            `${lgaName}, ${stateName}, Nigeria`;

    } else if (stateName) {

        displayLocation.textContent =
            `${stateName}, Nigeria`;

    } else {

        displayLocation.textContent =
            "Nigeria";
    }
}


// ========================================
// PROFILE INITIAL
// ========================================

function showProfileInitial(
    name
) {

    if (!photoInitial || !profilePhoto) {
        return;
    }


    const cleanName =
        name || "U";


    const firstLetter =
        cleanName
            .trim()
            .charAt(0)
            .toUpperCase();


    photoInitial.textContent =
        firstLetter || "U";


    photoInitial.style.display =
        "block";


    const existingImage =
        profilePhoto.querySelector(
            "img"
        );


    if (existingImage) {

        existingImage.remove();
    }
}


// ========================================
// PROFILE PHOTO
// ========================================

function setProfilePhoto(
    photoUrl
) {

    if (
        !photoUrl ||
        !profilePhoto
    ) {
        return;
    }


    let image =
        profilePhoto.querySelector(
            "img"
        );


    if (!image) {

        image =
            document.createElement(
                "img"
            );


        profilePhoto.appendChild(
            image
        );
    }


    image.src =
        photoUrl;


    image.alt =
        "Profile photo";


    if (photoInitial) {

        photoInitial.style.display =
            "none";
    }
}


// ========================================
// COMPRESS PROFILE PHOTO
// ========================================

function compressImage(
    file
) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    const image =
                        new Image();


                    image.onload =
                        function () {

                            const maxWidth =
                                1000;

                            const maxHeight =
                                1000;


                            let width =
                                image.width;

                            let height =
                                image.height;


                            if (
                                width >
                                maxWidth ||
                                height >
                                maxHeight
                            ) {

                                const ratio =
                                    Math.min(
                                        maxWidth /
                                            width,

                                        maxHeight /
                                            height
                                    );


                                width =
                                    Math.round(
                                        width *
                                        ratio
                                    );


                                height =
                                    Math.round(
                                        height *
                                        ratio
                                    );
                            }


                            const canvas =
                                document.createElement(
                                    "canvas"
                                );


                            canvas.width =
                                width;

                            canvas.height =
                                height;


                            const context =
                                canvas.getContext(
                                    "2d"
                                );


                            context.drawImage(
                                image,
                                0,
                                0,
                                width,
                                height
                            );


                            const compressedImage =
                                canvas.toDataURL(
                                    "image/jpeg",
                                    0.78
                                );


                            if (
                                compressedImage.length >
                                4000000
                            ) {

                                const smallerImage =
                                    canvas.toDataURL(
                                        "image/jpeg",
                                        0.60
                                    );


                                resolve(
                                    smallerImage
                                );

                            } else {

                                resolve(
                                    compressedImage
                                );
                            }
                        };


                    image.onerror =
                        function () {

                            reject(
                                new Error(
                                    "Unable to process the selected image."
                                )
                            );
                        };


                    image.src =
                        event.target.result;
                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Unable to read the selected image."
                        )
                    );
                };


            reader.readAsDataURL(
                file
            );
        }
    );
}


// ========================================
// PHOTO INPUT
// ========================================

if (photoInput) {

    photoInput.addEventListener(
        "change",
        async function () {

            const file =
                photoInput.files[0];


            if (!file) {
                return;
            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showError(
                    "Please select an image file."
                );


                photoInput.value = "";

                return;
            }


            if (
                file.size >
                10 * 1024 * 1024
            ) {

                showError(
                    "Please choose an image smaller than 10MB."
                );


                photoInput.value = "";

                return;
            }


            try {

                showSuccess(
                    "Processing your profile picture..."
                );


                const compressedImage =
                    await compressImage(
                        file
                    );


                setProfilePhoto(
                    compressedImage
                );


                if (profilePhoto) {

                    profilePhoto.dataset.image =
                        compressedImage;
                }


                if (successMessage) {

                    successMessage.style.display =
                        "none";
                }


            } catch (error) {

                console.error(
                    "Image processing error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to process your selected image."
                );


                photoInput.value = "";
            }
        }
    );
}


// ========================================
// STATE CHANGE
// ========================================

if (stateSelect) {

    stateSelect.addEventListener(
        "change",
        async function () {

            const stateCode =
                stateSelect.value;


            await loadLgas(
                stateCode
            );


            const selectedState =
                stateSelect.options[
                    stateSelect.selectedIndex
                ];


            const stateName =
                selectedState
                    ? selectedState.textContent
                    : "";


            updateLocation(
                stateName,
                ""
            );
        }
    );
}


// ========================================
// LGA CHANGE
// ========================================

if (lgaSelect) {

    lgaSelect.addEventListener(
        "change",
        function () {

            const selectedState =
                stateSelect.options[
                    stateSelect.selectedIndex
                ];


            const selectedLga =
                lgaSelect.options[
                    lgaSelect.selectedIndex
                ];


            const stateName =
                selectedState
                    ? selectedState.textContent
                    : "";


            const lgaName =
                selectedLga &&
                lgaSelect.value
                    ? selectedLga.textContent
                    : "";


            updateLocation(
                stateName,
                lgaName
            );
        }
    );
}


// ========================================
// NAME CHANGE
// ========================================

if (fullNameInput) {

    fullNameInput.addEventListener(
        "input",
        function () {

            const name =
                fullNameInput.value.trim();


            if (displayName) {

                displayName.textContent =
                    name ||
                    "UfedoZone User";
            }


            if (
                profilePhoto &&
                !profilePhoto.querySelector(
                    "img"
                )
            ) {

                showProfileInitial(
                    name
                );
            }
        }
    );
}


// ========================================
// BIO COUNTER
// ========================================

function updateBioCount() {

    if (
        !bioInput ||
        !bioCount
    ) {
        return;
    }


    bioCount.textContent =
        bioInput.value.length;
}


if (bioInput) {

    bioInput.addEventListener(
        "input",
        updateBioCount
    );
}


// ========================================
// SAVE PROFILE
// ========================================

if (saveProfileButton) {

    saveProfileButton.addEventListener(
        "click",
        async function () {

            const userId =
                getUserId();


            if (!userId) {
                return;
            }


            // --------------------------------
            // FULL NAME
            // --------------------------------

            const fullName =
                fullNameInput.value.trim();


            if (!fullName) {

                showError(
                    "Please enter your full name."
                );


                fullNameInput.focus();

                return;
            }


            // --------------------------------
            // STATE
            // --------------------------------

            const stateCode =
                stateSelect.value || null;


            const selectedState =
                stateSelect.options[
                    stateSelect.selectedIndex
                ];


            const stateName =
                stateCode &&
                selectedState
                    ? selectedState.textContent.trim()
                    : null;


            // --------------------------------
            // LGA
            // --------------------------------

            const lgaCode =
                lgaSelect.value || null;


            const selectedLga =
                lgaSelect.options[
                    lgaSelect.selectedIndex
                ];


            const lgaName =
                lgaCode &&
                selectedLga
                    ? selectedLga.textContent.trim()
                    : null;


            // --------------------------------
            // PROFILE PHOTO
            // --------------------------------

            let profilePhotoValue =
                null;


            if (
                profilePhoto &&
                profilePhoto.dataset.image
            ) {

                profilePhotoValue =
                    profilePhoto.dataset.image;

            } else if (profilePhoto) {

                const currentImage =
                    profilePhoto.querySelector(
                        "img"
                    );


                if (currentImage) {

                    profilePhotoValue =
                        currentImage.src;
                }
            }


            // --------------------------------
            // BIO
            // --------------------------------

            const cleanBio =
                bioInput.value.trim();


            if (
                cleanBio.length >
                500
            ) {

                showError(
                    "About Me must not be more than 500 characters."
                );

                return;
            }


            // --------------------------------
            // PROFILE DATA
            // --------------------------------
            //
            // IMPORTANT:
            //
            // email
            // phone
            // date_of_birth
            //
            // are intentionally NOT included.
            //
            // They cannot be changed through
            // this profile update request.
            //

            const profileData = {

                full_name:
                    fullName,

                gender:
                    genderSelect.value ||
                    null,

                relationship_status:
                    relationshipStatusSelect.value ||
                    null,

                state_code:
                    stateCode,

                state_name:
                    stateName,

                lga_code:
                    lgaCode,

                lga_name:
                    lgaName,

                profile_photo:
                    profilePhotoValue,

                bio:
                    cleanBio ||
                    null
            };


            // --------------------------------
            // DISABLE BUTTON
            // --------------------------------

            saveProfileButton.disabled =
                true;


            saveProfileButton.textContent =
                "Saving...";


            try {

                const response =
                    await fetch(
                        `/api/profile/${encodeURIComponent(userId)}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    profileData
                                )
                        }
                    );


                const data =
                    await getResponseData(
                        response
                    );


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Unable to save your profile."
                    );
                }


                const updatedProfile =
                    data.profile ||
                    profileData;


                // --------------------------------
                // UPDATE FORM
                // --------------------------------

                fullNameInput.value =
                    updatedProfile.full_name ||
                    fullName;


                displayName.textContent =
                    updatedProfile.full_name ||
                    fullName;


                setSelectValue(
                    genderSelect,
                    updatedProfile.gender
                );


                setSelectValue(
                    relationshipStatusSelect,
                    updatedProfile.relationship_status
                );


                bioInput.value =
                    updatedProfile.bio ||
                    "";


                updateBioCount();


                // --------------------------------
                // UPDATE PHOTO
                // --------------------------------

                if (
                    updatedProfile.profile_photo
                ) {

                    setProfilePhoto(
                        updatedProfile.profile_photo
                    );


                    profilePhoto.dataset.image =
                        updatedProfile.profile_photo;
                }


                // --------------------------------
                // UPDATE LOCATION
                // --------------------------------

                updateLocation(
                    updatedProfile.state_name ||
                        stateName,

                    updatedProfile.lga_name ||
                        lgaName
                );


                // --------------------------------
                // UPDATE STORED USER
                // --------------------------------

                const storedUser =
                    localStorage.getItem(
                        "ufedozone_user"
                    );


                if (storedUser) {

                    try {

                        const user =
                            JSON.parse(
                                storedUser
                            );


                        user.full_name =
                            updatedProfile.full_name ||
                            fullName;


                        user.gender =
                            updatedProfile.gender;


                        user.relationship_status =
                            updatedProfile.relationship_status;


                        user.state_code =
                            updatedProfile.state_code;


                        user.state_name =
                            updatedProfile.state_name;


                        user.lga_code =
                            updatedProfile.lga_code;


                        user.lga_name =
                            updatedProfile.lga_name;


                        user.profile_photo =
                            updatedProfile.profile_photo;


                        user.bio =
                            updatedProfile.bio;


                        // DO NOT modify:
                        //
                        // user.email
                        // user.phone
                        // user.date_of_birth
                        //
                        // These remain the original
                        // registration values.


                        localStorage.setItem(
                            "ufedozone_user",
                            JSON.stringify(user)
                        );


                    } catch (error) {

                        console.warn(
                            "Could not update local user data:",
                            error
                        );
                    }
                }


                // --------------------------------
                // SUCCESS
                // --------------------------------

                showSuccess(
                    "Your profile has been updated successfully."
                );


            } catch (error) {

                console.error(
                    "Save profile error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to save your profile."
                );


            } finally {

                saveProfileButton.disabled =
                    false;


                saveProfileButton.textContent =
                    "Save Changes";
            }
        }
    );
}


// ========================================
// LOGOUT
// ========================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "userId"
            );


            localStorage.removeItem(
                "user"
            );


            localStorage.removeItem(
                "ufedozone_user"
            );


            window.location.href =
                "/";
        }
    );
}


// ========================================
// START PROFILE PAGE
// ========================================

loadProfile();