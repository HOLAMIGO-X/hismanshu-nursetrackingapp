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

    // Check auth state on page load. If already logged in and not an admin, redirect.
    // If already logged in as an admin, redirect to nurses dashboard.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const isUserAdmin = ADMIN_EMAILS.includes(user.email);
            if (isUserAdmin) {
                // If an admin is already logged in, redirect to the nurses dashboard in admin mode
                localStorage.setItem('isAdminModeActive', 'true');
                window.location.href = 'index.html'; // Redirect to nurses dashboard
            } else {
                // If a non-admin user somehow lands on this page and is logged in, redirect them to the normal dashboard
                localStorage.setItem('isAdminModeActive', 'false'); // Ensure admin mode is off
                window.location.href = 'index.html'; // Redirect to nurses dashboard
            }
        } else {
            // User is not logged in, allow them to see the login form
            console.log("No user logged in, displaying admin login form.");
            localStorage.removeItem('isAdminModeActive'); // Ensure admin mode is off
        }
    });
});

// --- Admin Login Handler ---
async function handleAdminLogin(event) {
    event.preventDefault(); // Prevent default form submission

    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;

    // Client-side check for admin email before attempting Firebase login
    if (!ADMIN_EMAILS.includes(email)) {
        displayMessage(adminLoginErrorMessage, 'This email is not authorized for admin access.', 'error');
        return;
    }

    try {
        // Attempt to sign in with Firebase Authentication
        await signInWithEmailAndPassword(auth, email, password);
        
        // If login is successful and email is in ADMIN_EMAILS, set admin mode
        localStorage.setItem('isAdminModeActive', 'true');
        displayMessage(adminLoginErrorMessage, 'Login successful! Redirecting...', 'success');
        window.location.href = 'index.html'; // Redirect to nurses dashboard
    } catch (error) {
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
function displayMessage(element, msg, type) {
    element.textContent = msg;
    element.className = 'message ' + type;
}

// Custom Alert Modal (replaces browser's alert)
function showCustomAlert(message) {
    customAlertMessage.textContent = message;
    customAlertModal.style.display = 'flex'; // Use flex to center
}
