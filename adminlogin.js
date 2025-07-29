// --- Firebase SDK Imports and Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// IMPORTANT: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyA8LGdw7tguuLVAp1RimwaJwsu7sEFwb5w",
    authDomain: "nursetrackingdashboard.firebaseapp.com",
    projectId: "nursetrackingdashboard",
    storageBucket: "nursetrackingdashboard.firebasestorage.app",
    messagingSenderId: "127610116363",
    appId: "1:127610116363:web:ea78b1a8a3cd0cd5616a0e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Define Admin Emails (Hardcoded for simplicity, ideally from secure config) ---
const ADMIN_EMAILS = ["admin@example.com", "admin@123.com"]; // REPLACE with your actual admin email(s)

// --- DOM Elements ---
let adminLoginForm;
let adminEmailInput;
let adminPasswordInput;
let adminLoginErrorMessage;
let customAlertModal;
let customAlertMessage;

// --- Initialize DOM elements and attach event listeners when the DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
    adminLoginForm = document.getElementById('adminLoginForm');
    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    adminLoginErrorMessage = document.getElementById('adminLoginErrorMessage');
    customAlertModal = document.getElementById('customAlertModal');
    customAlertMessage = document.getElementById('customAlertMessage');

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }

    // Check auth state on page load.
    // This listener is crucial for preventing the redirect loop.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const isUserAdmin = ADMIN_EMAILS.includes(user.email);
            if (isUserAdmin) {
                // If an admin is already logged in, and they land on adminlogin.html,
                // DO NOT redirect them back to index.html immediately.
                // This allows them to stay on the login page if they manually navigated here,
                // or if they're about to log out/switch accounts.
                console.log("Admin user already logged in, allowing them to stay on admin login page.");
                // Ensure admin mode is active in localStorage if they are an admin
                localStorage.setItem('isAdminModeActive', 'true'); 
                // Optionally, you could hide the login form and show a message like "You are already logged in as admin."
                // For now, we just prevent the automatic redirect.
            } else {
                // If a non-admin user is logged in (e.g., anonymous) and tries to access adminlogin.html,
                // redirect them to the main dashboard as they shouldn't be here.
                console.log("Non-admin user logged in, redirecting to main dashboard.");
                localStorage.setItem('isAdminModeActive', 'false'); // Ensure admin mode is off
                window.location.href = 'index.html'; // Redirect to nurses dashboard
            }
        } else {
            // User is not logged in, allow them to see the login form to proceed with login.
            console.log("No user logged in, displaying admin login form.");
            localStorage.removeItem('isAdminModeActive'); // Ensure admin mode is off if no user is logged in
        }
    });
});

// --- Admin Login Handler ---
async function handleAdminLogin(event) {
    event.preventDefault(); // Prevent default form submission to handle login asynchronously

    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;

    // Client-side check for admin email before attempting Firebase login.
    // This adds an initial layer of validation.
    if (!ADMIN_EMAILS.includes(email)) {
        displayMessage(adminLoginErrorMessage, 'This email is not authorized for admin access.', 'error');
        return;
    }

    try {
        // Attempt to sign in with Firebase Authentication using provided credentials.
        await signInWithEmailAndPassword(auth, email, password);
        
        // If login is successful and the email is in ADMIN_EMAILS,
        // activate admin mode in local storage and redirect to the dashboard.
        // This is the ONLY place where a successful admin login should trigger a redirect.
        localStorage.setItem('isAdminModeActive', 'true');
        displayMessage(adminLoginErrorMessage, 'Login successful! Redirecting...', 'success');
        window.location.href = 'index.html'; // Redirect to nurses dashboard
    } catch (error) {
        // Handle various Firebase authentication errors and display user-friendly messages.
        let message = 'Admin login failed. Please check your credentials.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = 'Invalid admin email or password.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email format.';
        } else {
            console.error("Firebase Admin Auth Error:", error.message);
            message = `Login error: ${error.message}`;
        }
        displayMessage(adminLoginErrorMessage, message, 'error');
    }
}

// --- Helper Functions ---

/**
 * Displays a message in a specified HTML element.
 * @param {HTMLElement} element The DOM element where the message will be displayed.
 * @param {string} msg The message text.
 * @param {string} type The type of message ('success', 'error', 'info') for styling.
 */
function displayMessage(element, msg, type) {
    element.textContent = msg;
    element.className = 'message ' + type;
}

/**
 * Shows a custom alert modal with a given message.
 * This replaces the browser's native alert() to maintain UI consistency.
 * @param {string} message The message to display in the alert.
 */
function showCustomAlert(message) {
    customAlertMessage.textContent = message;
    customAlertModal.style.display = 'flex'; // Use flexbox for centering the modal
}
