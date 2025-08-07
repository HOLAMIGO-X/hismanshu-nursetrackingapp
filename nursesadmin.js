// --- Firebase SDK Imports and Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, getDocs, onSnapshot, query, limit, deleteDoc, doc, setDoc, writeBatch, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js"; // Added updateDoc

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
const db = getFirestore(app);

// Global variables to store admin status and current user ID
let currentUserId = null;
let currentUserEmail = null;
let isSuperAdmin = false;

// --- Define Admin Emails ---
const ADMIN_EMAILS = ["admin@example.com", "admin@123.com"]; // REPLACE with your actual admin email(s)

// --- Global Data Storage ---
let nursesParsedData = [];
let nursesFilteredData = [];

// --- DOM Elements (Declared globally and initialized in initializeDOMElements) ---
// Elements for both login form and dashboard content
let loggedInUserStatusSpan;
let logoutButton;
let backToNormalViewButton; // New button for "Back to Normal View"
let adminNavTabs; // The navigation tabs for admin dashboards
let universalSearchBar; // This refers to the input element
let universalSearchBarContainer; // This will hold the div wrapping the search bar
let clearUniversalSearchButton;
let downloadButtons;

// Login Form Elements
let adminLoginSection;
let adminLoginForm;
let adminEmailInput;
let adminPasswordInput;
let adminLoginErrorMessage;

// Dashboard Content Elements
let nursesAdminDashboardContent; // The main container for nurses admin dashboard
let nursesCsvFileInput;
let nursesFileNameSpan;
let uploadNursesCsvButton;
let nursesUploadMessage;

let totalClinicsLoggedIn;
let totalLoginSessions;
let activeSessionsCount;

let clinicLoginTableBody;
let activeSessionsTableBody;
let leaderboardTableBody;
let showTopShiftsButton;
let showBottomShiftsButton;
let channelHierarchyTree;

let shiftDetailModal;
let closeModalButton;
let detailLoginId;
let detailChannel;
let detailClinic;
let detailLoginTime;
let detailLogoutTime;
let detailShiftDuration;
let detailIpAddress;

let customAlertModal;
let customAlertMessage;
let customConfirmModal;
let customConfirmMessage;
let customConfirmYes;
let customConfirmNo;

// --- MANDATORY: Get the Canvas-provided __app_id ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


// --- Custom Alert/Confirm Modals (replaces browser's alert/confirm) ---
// These functions are intentionally placed at the top-level scope
// to ensure they are defined before any other code attempts to use them.
function displayMessage(element, msg, type) {
    if (element) { // Check if element exists
        element.textContent = msg;
        element.className = 'message ' + type;
    } else {
        console.warn("Message element not found to display:", msg);
    }
}

function showCustomAlert(message) {
    if (customAlertMessage && customAlertModal) {
        customAlertMessage.textContent = message;
        customAlertModal.style.display = 'flex'; // Use flex to center
        // Add listener to close alert
        const closeButton = customAlertModal.querySelector('.close-button') || customAlertModal.querySelector('button');
        if (closeButton) {
            closeButton.onclick = () => { customAlertModal.style.display = 'none'; };
        }
    } else {
        alert(message); // Fallback if custom modal elements are missing
    }
}

function showCustomConfirm(message, onConfirm) {
    if (customConfirmMessage && customConfirmModal && customConfirmYes && customConfirmNo) {
        customConfirmMessage.textContent = message;
        customConfirmModal.style.display = 'flex'; // Use flex to center

        // Clear previous listeners to prevent multiple calls
        customConfirmYes.onclick = null;
        customConfirmNo.onclick = null;

        customConfirmYes.onclick = () => {
            customConfirmModal.style.display = 'none';
            onConfirm();
        };
        customConfirmNo.onclick = () => {
            customConfirmModal.style.display = 'none';
        };
    } else {
        // Fallback to browser's confirm if custom modal elements are missing
        if (confirm(message)) {
            onConfirm();
        }
    }
}


// --- Admin Login Handler (Moved to top-level scope) ---
// This function is intentionally placed at the top-level scope
// to ensure it is defined before it's referenced in initializeDOMElements.
async function handleAdminLogin(event) {
    event.preventDefault(); // Prevent default form submission

    const email = adminEmailInput ? adminEmailInput.value : '';
    const password = adminPasswordInput ? adminPasswordInput.value : '';

    if (!email || !password) {
        displayMessage(adminLoginErrorMessage, 'Please enter both email and password.', 'error');
        return;
    }

    // Client-side check for admin email before attempting Firebase login
    if (!ADMIN_EMAILS.includes(email)) {
        displayMessage(adminLoginErrorMessage, 'This email is not authorized for admin access.', 'error');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle showing the dashboard content
        displayMessage(adminLoginErrorMessage, 'Login successful! Loading dashboard...', 'success');
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


// --- Firebase Authentication State Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements(); // Initialize elements as soon as DOM is ready

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            currentUserEmail = user.email;
            isSuperAdmin = ADMIN_EMAILS.includes(currentUserEmail);

            if (isSuperAdmin) {
                // If it's a super admin, show the dashboard content
                localStorage.setItem('isAdminModeActive', 'true'); // Admin mode is always active on admin pages
                console.log("Admin user logged in:", currentUserEmail);
                showAdminDashboardContent(); // Show dashboard, hide login form
                fetchNursesDataFromFirestore(); // Fetch data specific to Nurses Dashboard
            } else {
                // If an authenticated user is NOT a super admin (e.g., anonymous user),
                // show the login form, but don't redirect them back to nurses.html immediately.
                // They should be able to attempt to log in as an admin from here.
                localStorage.removeItem('isAdminModeActive'); // Ensure admin mode is off
                console.log("Non-admin user (or anonymous) on admin page. Showing login form.");
                showAdminLoginForm(); // Show login form, hide dashboard content
            }

        } else {
            // No user logged in, show the login form
            localStorage.removeItem('isAdminModeActive'); // Ensure admin mode is off
            console.log("No user logged in. Showing login form.");
            showAdminLoginForm(); // Show login form, hide dashboard content
        }
        updateUIForUserStatus(); // Update UI elements based on current login status
    });
});


// --- Function to initialize DOM elements ---
function initializeDOMElements() {
    // Only initialize if not already initialized
    if (logoutButton) return;

    // Header elements
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    logoutButton = document.getElementById('logoutButton');
    backToNormalViewButton = document.getElementById('backToNormalViewButton');
    adminNavTabs = document.getElementById('adminNavTabs');

    // Login Form Elements
    adminLoginSection = document.getElementById('adminLoginSection');
    adminLoginForm = document.getElementById('adminLoginForm');
    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    adminLoginErrorMessage = document.getElementById('adminLoginErrorMessage');

    // Dashboard Content Elements
    nursesAdminDashboardContent = document.getElementById('nursesAdminDashboardContent');
    universalSearchBar = document.getElementById('universalSearchBar');
    // Get the parent element of universalSearchBar, assuming it's the container
    if (universalSearchBar) {
        universalSearchBarContainer = universalSearchBar.parentElement;
    }
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    downloadButtons = document.querySelectorAll('.download-button'); // This returns a NodeList, safe to use even if empty

    nursesCsvFileInput = document.getElementById('nursesCsvFileInput');
    nursesFileNameSpan = document.getElementById('nursesFileName');
    uploadNursesCsvButton = document.getElementById('uploadNursesCsvButton');
    nursesUploadMessage = document.getElementById('nursesUploadMessage');

    totalClinicsLoggedIn = document.getElementById('totalClinicsLoggedIn');
    totalLoginSessions = document.getElementById('totalLoginSessions');
    activeSessionsCount = document.getElementById('activeSessionsCount');

    clinicLoginTableBody = document.querySelector('#clinicLoginTable tbody');
    activeSessionsTableBody = document.querySelector('#activeSessionsTable tbody');
    leaderboardTableBody = document.querySelector('#leaderboardTable tbody');
    showTopShiftsButton = document.getElementById('showTopShifts');
    showBottomShiftsButton = document.getElementById('showBottomShifts');
    channelHierarchyTree = document.getElementById('channelHierarchyTree');

    shiftDetailModal = document.getElementById('shiftDetail');
    if (shiftDetailModal) { // Ensure modal exists before querying its children
        closeModalButton = shiftDetailModal.querySelector('.close-button');
    }
    detailLoginId = document.getElementById('detailLoginId');
    detailChannel = document.getElementById('detailChannel');
    detailClinic = document.getElementById('detailClinic');
    detailLoginTime = document.getElementById('detailLoginTime');
    detailLogoutTime = document.getElementById('detailLogoutTime');
    detailShiftDuration = document.getElementById('detailShiftDuration');
    detailIpAddress = document.getElementById('detailIpAddress');

    // Custom Alert/Confirm Modal elements
    customAlertModal = document.getElementById('customAlertModal');
    customAlertMessage = document.getElementById('customAlertMessage');
    customConfirmModal = document.getElementById('customConfirmModal');
    customConfirmMessage = document.getElementById('customConfirmMessage');
    customConfirmYes = document.getElementById('customConfirmYes');
    customConfirmNo = document.getElementById('customConfirmNo');


    // Attach event listeners for elements that are always present (like login form)
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                localStorage.removeItem('isAdminModeActive'); // Clear admin mode flag on logout
                // onAuthStateChanged will handle showing login form
            } catch (error) {
                console.error("Error during logout:", error);
                showCustomAlert("Error during logout. Please try again.");
            }
        });
    }
}


// --- Function to attach dashboard-specific event listeners (called after login) ---
function attachDashboardEventListeners() {
    // New: Back to Normal View Button Listener
    if (backToNormalViewButton) {
        backToNormalViewButton.removeEventListener('click', handleBackToNormalViewClick); // Prevent duplicate listeners
        backToNormalViewButton.addEventListener('click', handleBackToNormalViewClick);
    }

    // Navigation Tabs (between Nurses Admin and Consult Admin)
    if (adminNavTabs) { // Ensure adminNavTabs is not null before querying
        // Select all nav-tab elements within adminNavTabs
        adminNavTabs.querySelectorAll('.nav-tab').forEach(tab => {
            tab.removeEventListener('click', handleAdminNavTabClick); // Prevent duplicate listeners
            tab.addEventListener('click', handleAdminNavTabClick);
        });
    }

    if (universalSearchBar) { // Check if universalSearchBar is initialized
        universalSearchBar.removeEventListener('input', handleUniversalSearchBarInput);
        universalSearchBar.addEventListener('input', handleUniversalSearchBarInput);
    }

    if (clearUniversalSearchButton) { // Check if clearUniversalSearchButton is initialized
        clearUniversalSearchButton.removeEventListener('click', handleClearUniversalSearchClick);
        clearUniversalSearchButton.addEventListener('click', handleClearUniversalSearchClick);
    }

    // Event delegation for individual search bars (as they might be added dynamically)
    document.removeEventListener('input', handleIndividualSearchBarInput); // Remove existing to prevent duplicates
    document.addEventListener('input', handleIndividualSearchBarInput);

    // Event delegation for edit/delete buttons and row clicks (as table rows are re-rendered)
    document.removeEventListener('click', handleTableActionButtons); // Remove existing to prevent duplicates
    document.addEventListener('click', handleTableActionButtons);


    if (downloadButtons) { // downloadButtons is a NodeList, safe to iterate
        downloadButtons.forEach(button => {
            button.removeEventListener('click', handleDownloadButtonClick); // Remove existing
            button.addEventListener('click', handleDownloadButtonClick);
        });
    }

    if (nursesCsvFileInput) { // Check if nursesCsvFileInput is initialized
        nursesCsvFileInput.removeEventListener('change', handleNursesCsvFileChange);
        nursesCsvFileInput.addEventListener('change', handleNursesCsvFileChange);
    }

    if (uploadNursesCsvButton) { // Check if uploadNursesCsvButton isInitialized
        uploadNursesCsvButton.removeEventListener('click', handleUploadNursesCsvClick);
        uploadNursesCsvButton.addEventListener('click', handleUploadNursesCsvClick);
    }

    if (closeModalButton) { // Check if closeModalButton is initialized
        closeModalButton.removeEventListener('click', handleCloseModalClick);
        closeModalButton.addEventListener('click', handleCloseModalClick);
    }

    if (shiftDetailModal) {
        window.removeEventListener('click', handleShiftDetailModalClickOutside);
        window.addEventListener('click', handleShiftDetailModalClickOutside);
    }

    if (showTopShiftsButton) {
        showTopShiftsButton.removeEventListener('click', handleShowTopShiftsClick);
        showTopShiftsButton.addEventListener('click', handleShowTopShiftsClick);
    }

    if (showBottomShiftsButton) {
        showBottomShiftsButton.removeEventListener('click', handleShowBottomShiftsClick);
        showBottomShiftsButton.addEventListener('click', handleShowBottomShiftsClick);
    }

    // Add event listeners for tree-node headers if they exist
    if (channelHierarchyTree) {
        // Use event delegation for tree node headers as they might be re-rendered
        channelHierarchyTree.removeEventListener('click', handleTreeNodeHeaderDelegation);
        channelHierarchyTree.addEventListener('click', handleTreeNodeHeaderDelegation);
    }
} // End of attachDashboardEventListeners


// --- UI Visibility Functions ---
function showAdminLoginForm() {
    if (adminLoginSection) adminLoginSection.style.display = 'block';
    if (nursesAdminDashboardContent) nursesAdminDashboardContent.style.display = 'none';
    if (adminNavTabs) adminNavTabs.style.display = 'none'; // Hide navigation tabs
    if (universalSearchBarContainer) universalSearchBarContainer.style.display = 'none'; // Hide search bar
    // Reset login form fields and messages
    if (adminEmailInput) adminEmailInput.value = '';
    if (adminPasswordInput) adminPasswordInput.value = '';
    if (adminLoginErrorMessage) adminLoginErrorMessage.textContent = '';
}

function showAdminDashboardContent() {
    if (adminLoginSection) adminLoginSection.style.display = 'none';
    if (nursesAdminDashboardContent) nursesAdminDashboardContent.style.display = 'block';
    if (adminNavTabs) adminNavTabs.style.display = 'flex'; // Show navigation tabs
    if (universalSearchBarContainer) universalSearchBarContainer.style.display = 'block'; // Show search bar
    attachDashboardEventListeners(); // Attach event listeners only when dashboard is shown
}


// --- Event Handler Functions ---

function handleBackToNormalViewClick() {
    // Keep admin session active in Firebase, just redirect to normal view.
    // The normal view (nurses.js) should be updated to allow authenticated admins to view it.
    window.location.href = 'nurses.html'; // Redirect to the normal nurses dashboard
}

function handleAdminNavTabClick() {
    const targetId = this.dataset.target;

    // Remove 'active' from all tabs and add to the clicked one
    const allTabs = adminNavTabs.querySelectorAll('.nav-tab');
    allTabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    // Handle navigation based on the target data attribute
    if (targetId === 'nursesAdminDashboardContent') {
        // If already on nurses admin, just re-filter if needed, or ensure it's visible
        if (nursesAdminDashboardContent) nursesAdminDashboardContent.style.display = 'block';
        // You might want to also hide consult admin content if it's on the same page
        // For now, assuming redirect for consultadmin.html
        universalSearchBar.value = ''; // Clear search when switching tabs
        filterAndDisplayNursesData(nursesParsedData, ''); // Re-render with all data
    } else if (targetId === 'consultAdminDashboard') {
        window.location.href = 'consultadmin.html'; // Redirect to the consultation admin dashboard
    }
}

function handleUniversalSearchBarInput() {
    const searchTerm = universalSearchBar.value;
    filterAndDisplayNursesData(nursesParsedData, searchTerm);
}

function handleClearUniversalSearchClick() {
    if (universalSearchBar) universalSearchBar.value = '';
    filterAndDisplayNursesData(nursesParsedData, '');
}

function handleIndividualSearchBarInput(event) {
    if (event.target.classList.contains('individual-search-bar')) {
        const searchTerm = event.target.value.toLowerCase();
        const tableId = event.target.dataset.table;
        let dataToFilter = nursesParsedData; // Always filter from the original parsed data

        // Apply universal search filter first, if active
        if (universalSearchBar && universalSearchBar.value) {
            const universalSearchTerm = universalSearchBar.value.toLowerCase();
            dataToFilter = dataToFilter.filter(row =>
                (row.Clinic && String(row.Clinic).toLowerCase().includes(universalSearchTerm)) ||
                (row.login_id && String(row.login_id).toLowerCase().includes(universalSearchTerm)) ||
                (row.ip && String(row.ip).toLowerCase().includes(universalSearchTerm)) ||
                (row.Channel && String(row.Channel).toLowerCase().includes(universalSearchTerm))
            );
        }

        if (tableId === 'clinicLoginTable') {
            renderClinicLoginTable(filterTableData(dataToFilter, searchTerm, ['Clinic', 'Location']));
        } else if (tableId === 'activeSessionsTable') {
            renderActiveSessionsTable(filterTableData(dataToFilter, searchTerm, ['Clinic', 'login_id', 'ip', 'Location']));
        } else if (tableId === 'leaderboardTable') {
            const type = showTopShiftsButton && showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom';
            renderLeaderboard(filterLeaderboardData(dataToFilter, searchTerm), type);
        }
    }
}

function handleTableActionButtons(e) {
    if (e.target.classList.contains('action-button')) {
        const docId = e.target.dataset.id;
        const type = e.target.dataset.type; // nurses or consults, if needed in the future

        if (e.target.classList.contains('delete-btn')) {
            showCustomConfirm('Are you sure you want to delete this Nurses record?', () => {
                deleteDocument('nurses_data', docId);
            });
        } else if (e.target.classList.contains('edit-btn')) {
            // For 'Edit' functionality, you'll need to:
            // 1. Get the current row data for the docId
            const rowData = nursesParsedData.find(d => d.id === docId);
            if (rowData) {
                // 2. Populate an edit modal/form with rowData
                // 3. Implement save logic which calls editDocument
                console.log('Edit button clicked for ID:', docId, 'Data:', rowData);
                showCustomAlert('Edit functionality not yet implemented. Check console for data.');
                // Example of how you might open an edit modal:
                // openEditModal(rowData);
            } else {
                console.warn('Could not find data for ID:', docId, 'to edit.');
                showCustomAlert('Failed to find data for editing.');
            }
        }
    }
    // Also handle click on table row to show shift detail if not an action button
    // Ensure the click is on a TD and its parent TR has a data-id
    if (e.target.tagName === 'TD' && e.target.closest('tr') && e.target.closest('tr').dataset.id) {
        const tr = e.target.closest('tr');
        // Prevent opening detail modal if an action button was clicked within the TD
        if (!e.target.classList.contains('action-button')) {
             showShiftDetail(tr.dataset);
        }
    }
}

function handleDownloadButtonClick(event) {
    const tableId = event.target.dataset.tableId;
    const table = document.getElementById(tableId);
    if (table) {
        downloadTableAsCsv(table, `${tableId}_data.csv`);
    } else {
        console.error(`Table with ID ${tableId} not found for download.`);
showCustomAlert(`Error: Table with ID ${tableId} not found for download.`);
        showCustomAlert(Error: Table with ID ${tableId} not found for download.);
    }
}

function handleNursesCsvFileChange(event) {
    const file = event.target.files[0];
    if (nursesFileNameSpan) nursesFileNameSpan.textContent = file ? file.name : 'No file chosen';
    if (nursesUploadMessage) nursesUploadMessage.textContent = '';
    // No direct upload here, it will be triggered by the "Process CSV" button
}

function handleUploadNursesCsvClick() {
    const file = nursesCsvFileInput && nursesCsvFileInput.files[0];
    if (file) {
        uploadCsvToFirestore(file, 'nurses'); // Admin always uploads to Firestore
    } else {
        displayMessage(nursesUploadMessage, 'Please select a Nurses CSV file to upload.', 'error');
    }
}

function handleCloseModalClick() {
    if (shiftDetailModal) shiftDetailModal.classList.remove('show');
}

function handleShiftDetailModalClickOutside(event) {
    if (event.target === shiftDetailModal) {
        shiftDetailModal.classList.remove('show');
    }
}

function handleShowTopShiftsClick() {
    renderLeaderboard(nursesFilteredData, 'top');
    if (showTopShiftsButton) {
        showTopShiftsButton.classList.add('active');
        showTopShiftsButton.classList.remove('bg-gray-300'); // Remove inactive style
        showTopShiftsButton.classList.add('bg-blue-500', 'text-white'); // Add active style
    }
    if (showBottomShiftsButton) {
        showBottomShiftsButton.classList.remove('active');
        showBottomShiftsButton.classList.remove('bg-blue-500', 'text-white'); // Remove active style
        showBottomShiftsButton.classList.add('bg-gray-300'); // Add inactive style
    }
}

function handleShowBottomShiftsClick() {
    renderLeaderboard(nursesFilteredData, 'bottom');
    if (showBottomShiftsButton) {
        showBottomShiftsButton.classList.add('active');
        showBottomShiftsButton.classList.remove('bg-gray-300'); // Remove inactive style
        showBottomShiftsButton.classList.add('bg-blue-500', 'text-white'); // Add active style
    }
    if (showTopShiftsButton) {
        showTopShiftsButton.classList.remove('active');
        showTopShiftsButton.classList.remove('bg-blue-500', 'text-white'); // Remove active style
        showTopShiftsButton.classList.add('bg-gray-300'); // Add inactive style
    }
}

function handleTreeNodeHeaderDelegation(e) {
    const header = e.target.closest('.tree-node-header');
    if (header) {
        header.classList.toggle('active');
        const arrow = header.querySelector('.arrow');
        if (arrow) {
            arrow.textContent = header.classList.contains('active') ? '▼' : '▶';
        }
        const content = header.nextElementSibling;
        if (content) {
            content.classList.toggle('show');
        }
    }
}


// --- Function to fetch data from Firestore ---
async function fetchNursesDataFromFirestore() {
    // Ensure a user (even anonymous) is logged in before setting up snapshot listeners
    if (!auth.currentUser) {
        console.log("No authenticated user found, waiting for anonymous sign-in or admin login.");
        return; // Exit if no user, onAuthStateChanged will re-trigger when user is available
    }

    // Nurses Data Listener
    // IMPORTANT CHANGE: Use the dynamic appId here
    onSnapshot(collection(db, artifacts/${appId}/public/data/nurses_data), (snapshot) => {
        nursesParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayNursesData(nursesParsedData, universalSearchBar ? universalSearchBar.value : '');
    }, (error) => {
        console.error("Error fetching nurses data from Firestore:", error);
        showCustomAlert('Failed to load Nurses data from database. Please check console for details.');
    });
}

// --- Firestore Data Management Functions (Admin Specific) ---
// NEW CODE - USE THIS
async function uploadCsvToFirestore(file) {
    if (!isSuperAdmin) {
        showCustomAlert('You are not authorized to upload data.');
        return;
    }

    displayMessage(nursesUploadMessage, 'Processing CSV, please wait...', 'info');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const data = results.data;
            if (data.length === 0) {
                displayMessage(nursesUploadMessage, 'CSV file is empty or has no valid data.', 'error');
                return;
            }

            const collectionPath = `artifacts/default-app-id/public/data/nurses_data`;
            const collectionRef = collection(db, collectionPath);

            try {
                // Step 1: Delete all existing documents in small batches
                displayMessage(nursesUploadMessage, 'Clearing existing data...', 'info');
                const existingDocsSnapshot = await getDocs(query(collectionRef));
                const deletePromises = [];
                for (let i = 0; i < existingDocsSnapshot.docs.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = existingDocsSnapshot.docs.slice(i, i + BATCH_SIZE);
                    chunk.forEach(d => batch.delete(d.ref));
                    deletePromises.push(batch.commit());
                }
                await Promise.all(deletePromises);
                displayMessage(nursesUploadMessage, `Cleared ${existingDocsSnapshot.docs.length} old records.`, 'info');

                // Step 2: Upload new data in small batches
                displayMessage(nursesUploadMessage, `Uploading ${data.length} new records...`, 'info');
                const uploadPromises = [];
                for (let i = 0; i < data.length; i += BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = data.slice(i, i + BATCH_SIZE);
                    chunk.forEach(row => {
                        const cleanedRow = Object.fromEntries(
                            Object.entries(row).filter(([, v]) => v !== null && v !== undefined && v !== '')
                        );
                        batch.set(doc(collectionRef), cleanedRow);
                    });
                    uploadPromises.push(batch.commit());
                }
                await Promise.all(uploadPromises);

                displayMessage(nursesUploadMessage, `Successfully uploaded ${data.length} new records.`, 'success');

            } catch (error) {
                console.error("Error during batch upload:", error);
                displayMessage(nursesUploadMessage, `Upload failed: ${error.message}.`, 'error');
            }
        },
        error: function(err) {
            console.error("CSV parsing error:", err);
            displayMessage(nursesUploadMessage, `Error parsing CSV: ${err.message}`, 'error');
        }
    });
}

async function deleteDocument(collectionName, docId) {
    if (!isSuperAdmin) {
        showCustomAlert('You are not authorized to delete data.');
        return;
    }
    try {
        await deleteDoc(doc(db, artifacts/${appId}/public/data/${collectionName}, docId));
        showCustomAlert('Record deleted successfully!');
        // onSnapshot listener will automatically update the UI
    } catch (error) {
        console.error("Error deleting document:", error);
        showCustomAlert('Failed to delete record. Please try again.');
    }
}

async function editDocument(collectionName, docId, newData) {
    if (!isSuperAdmin) {
        showCustomAlert('You are not authorized to edit data.');
        return;
    }
    try {
        // Use updateDoc to merge new data with existing, or setDoc with merge: true
        await updateDoc(doc(db, artifacts/${appId}/public/data/${collectionName}, docId), newData);
        showCustomAlert('Record updated successfully!');
        // onSnapshot listener will automatically update the UI
    } catch (error) {
        console.error("Error updating document:", error);
        showCustomAlert('Failed to update record. Please try again.');
    }
}


// --- Function to update UI visibility based on user status ---
function updateUIForUserStatus() {
    // This function is for the header status, not the main dashboard content
    // The main content visibility (login form vs dashboard) is handled by onAuthStateChanged
    if (loggedInUserStatusSpan) {
        if (currentUserEmail) { // Authenticated user (admin or non-admin)
            loggedInUserStatusSpan.textContent = Logged in: ${currentUserEmail};
            loggedInUserStatusSpan.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'inline-block';
            // Assuming loginAsAdminButton is not present on admin pages, or hidden by CSS
        } else if (auth.currentUser && auth.currentUser.isAnonymous) { // Anonymous user (guest)
            loggedInUserStatusSpan.textContent = Logged in: Guest;
            loggedInUserStatusSpan.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'none'; // Guests don't explicitly "logout"
        } else { // No user (initial state before anonymous sign-in completes)
            loggedInUserStatusSpan.textContent = '';
            loggedInUserStatusSpan.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
        }
    }
}


// --- Data Filtering and Display Functions ---

function filterAndDisplayNursesData(data, searchTerm) {
    if (!searchTerm) {
        nursesFilteredData = data;
    } else {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        nursesFilteredData = data.filter(row =>
            (row.Clinic && String(row.Clinic).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.login_id && String(row.login_id).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.ip && String(row.ip).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.Channel && String(row.Channel).toLowerCase().includes(lowerCaseSearchTerm))
        );
    }
    processAndDisplayNursesData(nursesFilteredData);
}

function processAndDisplayNursesData(data) {
    clearNursesDashboard();
    renderNursesSummaryCards(data);
    renderClinicLoginTable(data);
    renderActiveSessionsTable(data);
    const leaderboardType = showTopShiftsButton && showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom';
    renderLeaderboard(data, leaderboardType);
    renderChannelHierarchyTree(data);
}

function clearNursesDashboard() {
    if (totalClinicsLoggedIn) totalClinicsLoggedIn.textContent = '0';
    if (totalLoginSessions) totalLoginSessions.textContent = '0';
    if (activeSessionsCount) activeSessionsCount.textContent = '0';
    if (clinicLoginTableBody) clinicLoginTableBody.innerHTML = '';
    if (activeSessionsTableBody) activeSessionsTableBody.innerHTML = '';
    if (leaderboardTableBody) leaderboardTableBody.innerHTML = '';
    if (channelHierarchyTree) channelHierarchyTree.innerHTML = '';
}

// --- Nurses Dashboard Rendering Functions ---

function renderNursesSummaryCards(data) {
    const uniqueClinics = new Set(data.map(row => row.Clinic).filter(Boolean));
    if (totalClinicsLoggedIn) totalClinicsLoggedIn.textContent = uniqueClinics.size;
    if (totalLoginSessions) totalLoginSessions.textContent = data.length;
    const activeSessions = data.filter(row => !row['logout time'] && row['login time']);
    if (activeSessionsCount) activeSessionsCount.textContent = activeSessions.length;
}

function renderClinicLoginTable(data) {
    if (!clinicLoginTableBody) {
        console.error("clinicLoginTableBody element not found.");
        return;
    }
    clinicLoginTableBody.innerHTML = '';

    const filteredData = data;

    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = <td colspan="5" style="text-align: center; color: #777;">No data available or matches your search.</td>; // Adjusted colspan for admin view
        clinicLoginTableBody.appendChild(tr);
        return;
    }

    filteredData.forEach(row => {
        const loginTime = row['login time'] ? new Date(row['login time']) : null;
        const logoutTime = row['logout time'] ? new Date(row['logout time']) : null;
        let shiftDuration = 'N/A';
        let shiftDurationMillis = 0;

        if (loginTime && logoutTime && !isNaN(loginTime) && !isNaN(logoutTime)) {
            shiftDurationMillis = logoutTime - loginTime;
            if (shiftDurationMillis < 0) {
                shiftDuration = 'Invalid Time';
                shiftDurationMillis = 0;
            } else {
                shiftDuration = formatDuration(shiftDurationMillis);
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Clinic || 'N/A'}</td>
            <td>${row['login time'] || 'N/A'}</td>
            <td>${row['logout time'] || 'N/A'}</td>
            <td>${generateLocationLink(row['Lat Long'])}</td>
            <td>
                <button class="action-button edit-btn text-blue-600 hover:text-blue-800 font-bold py-1 px-2 rounded-full transition duration-300 ease-in-out transform hover:scale-105" data-id="${row.id}" data-type="nurses">Edit</button>
                <button class="action-button delete-btn text-red-600 hover:text-red-800 font-bold py-1 px-2 rounded-full transition duration-300 ease-in-out transform hover:scale-105 ml-2" data-id="${row.id}" data-type="nurses">Delete</button>
            </td>
        `;
        tr.dataset.id = row.id;
        tr.dataset.loginId = row.login_id || 'N/A';
        tr.dataset.channel = row.Channel || 'N/A';
        tr.dataset.clinic = row.Clinic || 'N/A';
        tr.dataset.loginTime = row['login time'] || 'N/A';
        tr.dataset.logoutTime = row['logout time'] || 'N/A';
        tr.dataset.shiftDuration = shiftDuration;
        tr.dataset.shiftDurationMillis = shiftDurationMillis;
        tr.dataset.ipAddress = row.ip || 'N/A';

        // Event listener for row click (to show detail modal)
        // Note: The click event for action buttons is handled by event delegation in handleTableActionButtons
        // This listener is for clicks on TDs that are not action buttons
        tr.addEventListener('click', (e) => {
            if (!e.target.classList.contains('action-button')) {
                showShiftDetail(tr.dataset);
            }
        });
        clinicLoginTableBody.appendChild(tr);
    });
}

function showShiftDetail(data) {
    if (shiftDetailModal) {
        if (detailLoginId) detailLoginId.textContent = data.loginId;
        if (detailChannel) detailChannel.textContent = data.channel;
        if (detailClinic) detailClinic.textContent = data.clinic;
        if (detailLoginTime) detailLoginTime.textContent = data.loginTime;
        if (detailLogoutTime) detailLogoutTime.textContent = data.logoutTime;
        if (detailShiftDuration) detailShiftDuration.textContent = data.shiftDuration;
        if (detailIpAddress) detailIpAddress.textContent = data.ipAddress;
        shiftDetailModal.classList.add('show');
    }
}

function renderActiveSessionsTable(data) {
    if (!activeSessionsTableBody) {
        console.error("activeSessionsTableBody element not found.");
        return;
    }
    activeSessionsTableBody.innerHTML = '';
    const activeSessions = data.filter(row => !row['logout time'] && row['login time']);

    if (activeSessions.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = <td colspan="6" style="text-align: center; color: #777;">No active sessions found (all logged out or no login time).</td>; // Adjusted colspan for admin view
        activeSessionsTableBody.appendChild(tr);
        return;
    }

    activeSessions.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Clinic || 'N/A'}</td>
            <td>${row.login_id || 'N/A'}</td>
            <td>${row['login time'] || 'N/A'}</td>
            <td>${row.ip || 'N/A'}</td>
            <td>${generateLocationLink(row['Lat Long'])}</td>
            <td>
                <button class="action-button edit-btn text-blue-600 hover:text-blue-800 font-bold py-1 px-2 rounded-full transition duration-300 ease-in-out transform hover:scale-105" data-id="${row.id}" data-type="nurses">Edit</button>
                <button class="action-button delete-btn text-red-600 hover:text-red-800 font-bold py-1 px-2 rounded-full transition duration-300 ease-in-out transform hover:scale-105 ml-2" data-id="${row.id}" data-type="nurses">Delete</button>
            </td>
        `;
        activeSessionsTableBody.appendChild(tr);
    });
}

function renderLeaderboard(data, type = 'top') {
    if (!leaderboardTableBody) {
        console.error("leaderboardTableBody element not found.");
        return;
    }
    leaderboardTableBody.innerHTML = '';

    const clinicShiftTimes = {};

    data.forEach(row => {
        const loginTime = row['login time'] ? new Date(row['login time']) : null;
        const logoutTime = row['logout time'] ? new Date(row['logout time']) : null;

        if (loginTime && logoutTime && !isNaN(loginTime) && !isNaN(logoutTime)) {
            const duration = logoutTime - loginTime;
            if (duration > 0) {
                const key = ${row.Clinic}-${row.login_id};
                if (!clinicShiftTimes[key]) {
                    clinicShiftTimes[key] = {
                        id: row.id, // Store one ID, though this is aggregated data
                        clinic: row.Clinic,
                        login_id: row.login_id,
                        firstLoginTime: row['login time'], // Keep first login time for display
                        totalDuration: 0
                    };
                }
                clinicShiftTimes[key].totalDuration += duration;
            }
        }
    });

    let sortedClinics = Object.values(clinicShiftTimes).sort((a, b) => {
        return type === 'top' ? b.totalDuration - a.totalDuration : a.totalDuration - b.totalDuration;
    });

    sortedClinics = sortedClinics.slice(0, 5); // Display only top/bottom 5

    if (sortedClinics.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = <td colspan="6" style="text-align: center; color: #777;">No completed shift data for leaderboard.</td>; // Adjusted colspan for admin view
        leaderboardTableBody.appendChild(tr);
        return;
    }

    sortedClinics.forEach((entry, index) => {
        const tr = document.createElement('tr');
        const formattedDuration = formatDuration(entry.totalDuration);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.clinic || 'N/A'}</td>
            <td>${entry.login_id || 'N/A'}</td>
            <td>${entry.firstLoginTime || 'N/A'}</td>
            <td>${formattedDuration}</td>
            <td>
                <button class="action-button edit-btn text-blue-600 hover:text-blue-800 font-bold py-1 px-2 rounded-full transition duration-300 ease-in-out transform hover:scale-105" data-id="${entry.id}" data-type="nurses">Edit</button>
                <button class="action-button delete-btn text-red-600 hover:text-red-800 font-bold py-1 px-2 rounded-full transition duration-300 ease-in-out transform hover:scale-105 ml-2" data-id="${entry.id}" data-type="nurses">Delete</button>
            </td>
        `;
        leaderboardTableBody.appendChild(tr);
    });
}

function filterLeaderboardData(data, searchTerm) {
    if (!searchTerm) return data;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return data.filter(row =>
        (row.Clinic && String(row.Clinic).toLowerCase().includes(lowerCaseSearchTerm)) ||
        (row.login_id && String(row.login_id).toLowerCase().includes(lowerCaseSearchTerm))
    );
}

function renderChannelHierarchyTree(data) {
    if (!channelHierarchyTree) {
        console.error("channelHierarchyTree element not found.");
        return;
    }
    channelHierarchyTree.innerHTML = '';
    const channelsData = {};

    data.forEach(row => {
        const channel = row.Channel;
        const clinic = row.Clinic;
        const loginId = row.login_id;

        if (!channel || !clinic) return;

        if (!channelsData[channel]) {
            channelsData[channel] = {};
        }
        if (!channelsData[channel][clinic]) {
            channelsData[channel][clinic] = new Set();
        }
        if (loginId) {
            channelsData[channel][clinic].add(loginId);
        }
    });

    const channelNames = Object.keys(channelsData).sort();

    if (channelNames.length === 0) {
        channelHierarchyTree.innerHTML = '<p style="text-align: center; color: #777;">No channel hierarchy data available.</p>';
        return;
    }

    channelNames.forEach(channelName => {
        const channelNode = document.createElement('div');
        channelNode.classList.add('tree-node');

        const channelHeader = document.createElement('div');
        channelHeader.classList.add('tree-node-header');
        channelHeader.innerHTML = <span class="arrow">▶</span> <span>Channel: <strong>${channelName}</strong> (${Object.keys(channelsData[channelName]).length} Clinics)</span>;
        channelNode.appendChild(channelHeader);

        const channelContent = document.createElement('div');
        channelContent.classList.add('tree-node-content'); // This is where max-height and overflow-y will apply
        const clinicList = document.createElement('ul');

        const clinicNames = Object.keys(channelsData[channelName]).sort();
        if (clinicNames.length === 0) {
            const listItem = document.createElement('li');
            listItem.textContent = 'No clinics found for this channel.';
            clinicList.appendChild(listItem);
        } else {
            clinicNames.forEach(clinicName => {
                const clinicNode = document.createElement('div');
                clinicNode.classList.add('tree-node');

                const clinicHeader = document.createElement('div');
                clinicHeader.classList.add('tree-node-header');
                clinicHeader.innerHTML = <span class="arrow">▶</span> <span>Clinic: <strong>${clinicName}</strong> (${channelsData[channelName][clinicName].size} Login IDs)</span>;
                clinicNode.appendChild(clinicHeader);

                const clinicContent = document.createElement('div');
                clinicContent.classList.add('tree-node-content');
                const loginIdList = document.createElement('ul');

                const loginIdsInClinic = Array.from(channelsData[channelName][clinicName]).sort();
                if (loginIdsInClinic.length === 0) {
                    const listItem = document.createElement('li');
                    listItem.textContent = 'No login IDs found.';
                    loginIdList.appendChild(listItem);
                } else {
                    loginIdsInClinic.forEach(loginId => {
                        const listItem = document.createElement('li');
                        const totalDurationMillis = data
                            .filter(row => row.Clinic === clinicName && row.login_id === loginId && row['login time'] && row['logout time'])
                            .map(row => {
                                const loginTime = new Date(row['login time']);
                                const logoutTime = new Date(row['logout time']);
                                return (logoutTime - loginTime > 0) ? (logoutTime - loginTime) : 0;
                            })
                            .reduce((sum, duration) => sum + duration, 0);

                        listItem.innerHTML = <strong>${loginId}</strong> (Total Shift: ${formatDuration(totalDurationMillis)});
                        loginIdList.appendChild(listItem);
                    });
                }
                clinicContent.appendChild(loginIdList);
                clinicNode.appendChild(clinicContent);
                clinicList.appendChild(clinicNode);
            });
        }
        channelContent.appendChild(clinicList);
        channelNode.appendChild(channelContent);
        channelHierarchyTree.appendChild(channelNode);
    });
}

// --- Helper Functions ---
function generateLocationLink(latLongString) {
    try {
        if (latLongString) {
            const cleanedLatLongString = latLongString.replace(/'/g, '"');
            const latLong = JSON.parse(cleanedLatLongString);
            if (latLong.latitude && latLong.longitude) {
                const lat = parseFloat(latLong.latitude);
                const long = parseFloat(latLong.longitude);
                if (!isNaN(lat) && !isNaN(long)) {
                    const googleMapsUrl = https://www.google.com/maps/search/?api=1&query=${lat},${long};
                    return <a href="${googleMapsUrl}" target="_blank">View on Map</a>;
                }
            }
        }
    } catch (e) {
        console.warn('Could not parse Lat Long:', latLongString, e);
    }
    return 'N/A';
}

function formatDuration(millis) {
    if (typeof millis !== 'number' || isNaN(millis) || millis < 0) {
        return 'N/A';
    }
    const hours = Math.floor(millis / (1000 * 60 * 60));
    const minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((millis % (1000 * 60)) / 1000);
    return ${hours}h ${minutes}m ${seconds}s;
}

function filterTableData(data, searchTerm, columnsToSearch) {
    if (!searchTerm) return data;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return data.filter(row => {
        return columnsToSearch.some(col => {
            const value = row[col];
            return value && String(value).toLowerCase().includes(lowerCaseSearchTerm);
        });
    });
}

function downloadTableAsCsv(tableElement, filename) {
    if (!tableElement) {
        console.error("Table element not found for download.");
        showCustomAlert("Error: Table not found for download.");
        return;
    }

    let csv = [];
    const rows = tableElement.querySelectorAll('tr');

    const headerCells = rows[0].querySelectorAll('th');
    const headers = Array.from(headerCells).map(th => th.innerText.trim());
    csv.push(headers.join(','));

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('detailed-row-toggle')) {
            continue;
        }

        const rowData = [];
        const cols = row.querySelectorAll('td');
        for (let j = 0; j < cols.length; j++) {
            let cellData = cols[j].innerText.trim();
            if (cols[j].querySelector('a')) {
                cellData = cols[j].querySelector('a').innerText.trim();
            }
            // Handle commas and newlines in cell data for CSV
            if (cellData.includes(',') || cellData.includes('\n') || cellData.includes('"')) {
                cellData = "${cellData.replace(/"/g, '""')}"; // Escape double quotes and wrap in quotes
            }
            rowData.push(cellData);
        }
        csv.push(rowData.join(','));
    }

    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        showCustomAlert('Your browser does not support downloading files directly. Please copy the data manually.');
        window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csvString));
    }
}



