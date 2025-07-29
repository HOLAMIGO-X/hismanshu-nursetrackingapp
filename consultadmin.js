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
let consultationParsedData = [];
let consultationFilteredData = [];

// Store current sort state for detailed consultation table
let currentDetailedConsultationSortColumn = null;
let currentDetailedConsultationSortDirection = 'asc';

// --- DOM Elements (Declared globally and initialized in initializeDOMElements) ---
// Elements for both login form and dashboard content
let loggedInUserStatusSpan;
let logoutButton;
let backToNormalViewButton; // New button for "Back to Normal View"
let adminNavTabs; // The navigation tabs for admin dashboards
let universalSearchBar;
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
let consultAdminDashboardContent; // The main container for consult admin dashboard
let consultationCsvFileInput;
let consultationFileNameSpan;
let uploadConsultationCsvButton;
let consultationUploadMessage;

let totalConsultationsToday;
let detailedConsultationTableBody;
let nurseConsultationLeaderboardTableBody;
let showTopConsultationAgentsButton;
let showBottomConsultationAgentsButton;

let consultationChartDimension;
let consultationChartType;
let generateConsultationChartButton;
let consultationChartCanvas;
let chartMessage;
let consultationChartInstance = null;

let expandChartButton;
let expandedChartModal;
let closeExpandedChartButton;
let expandedChartTitle;
let expandedConsultationChartCanvas;
let expandedChartInstance = null;

let customAlertModal;
let customAlertMessage;
let customConfirmModal;
let customConfirmMessage;
let customConfirmYes;
let customConfirmNo;


// --- Firebase Authentication State Listener ---
// Use DOMContentLoaded to ensure elements are ready before initial auth state check
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements(); // Initialize elements as soon as DOM is ready

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            currentUserEmail = user.email;
            isSuperAdmin = ADMIN_EMAILS.includes(currentUserEmail);

            if (!isSuperAdmin) {
                // If a non-admin user somehow lands on this admin page, redirect them to the normal consult dashboard
                localStorage.removeItem('isAdminModeActive'); // Ensure admin mode is off
                window.location.replace('consult.html'); // Use replace to prevent back button to admin login
                return; // Stop further execution
            }

            // If it's a super admin, show the dashboard content
            localStorage.setItem('isAdminModeActive', 'true'); // Admin mode is always active on admin pages
            console.log("Admin user logged in:", currentUserEmail);

            showAdminDashboardContent(); // Show dashboard, hide login form
            fetchConsultationDataFromFirestore(); // Fetch data specific to Consultation Dashboard
        } else {
            // No user logged in, show the login form
            localStorage.removeItem('isAdminModeActive'); // Ensure admin mode is off
            showAdminLoginForm(); // Show login form, hide dashboard content
        }
        updateUIForUserStatus(); // Update UI elements based on current login status
    });
});


// --- Function to initialize DOM elements ---
function initializeDOMElements() {
    // Header elements
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    logoutButton = document.getElementById('logoutButton');
    backToNormalViewButton = document.getElementById('backToNormalViewButton'); // Initialize new button
    adminNavTabs = document.getElementById('adminNavTabs'); // The navigation tabs container

    // Login Form Elements
    adminLoginSection = document.getElementById('adminLoginSection');
    adminLoginForm = document.getElementById('adminLoginForm');
    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    adminLoginErrorMessage = document.getElementById('adminLoginErrorMessage');

    // Dashboard Content Elements
    consultAdminDashboardContent = document.getElementById('consultAdminDashboardContent');
    universalSearchBar = document.getElementById('universalSearchBar');
    // Get the parent element of universalSearchBar, assuming it's the container
    if (universalSearchBar) {
        universalSearchBarContainer = universalSearchBar.parentElement;
    }
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    downloadButtons = document.querySelectorAll('.download-button');

    consultationCsvFileInput = document.getElementById('consultationCsvFileInput');
    consultationFileNameSpan = document.getElementById('consultationFileName');
    uploadConsultationCsvButton = document.getElementById('uploadConsultationCsvButton');
    consultationUploadMessage = document.getElementById('consultationUploadMessage');

    totalConsultationsToday = document.getElementById('totalConsultationsToday');
    detailedConsultationTableBody = document.querySelector('#detailedConsultationTable tbody');
    nurseConsultationLeaderboardTableBody = document.querySelector('#nurseConsultationLeaderboardTable tbody');
    showTopConsultationAgentsButton = document.getElementById('showTopConsultationAgents');
    showBottomConsultationAgentsButton = document.getElementById('showBottomConsultationAgents');

    consultationChartDimension = document.getElementById('consultationChartDimension');
    consultationChartType = document.getElementById('consultationChartType');
    generateConsultationChartButton = document.getElementById('generateConsultationChart');
    consultationChartCanvas = document.getElementById('consultationChartCanvas');
    chartMessage = document.getElementById('chartMessage');

    expandChartButton = document.getElementById('expandChartButton');
    expandedChartModal = document.getElementById('expandedChartModal');
    if (expandedChartModal) { // Ensure modal exists before querying its children
        closeExpandedChartButton = expandedChartModal.querySelector('.close-expanded-chart-button');
    }
    expandedChartTitle = document.getElementById('expandedChartTitle');
    expandedConsultationChartCanvas = document.getElementById('expandedConsultationChartCanvas');

    // Custom Modal elements
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

    if (consultationCsvFileInput) { // Check if consultationCsvFileInput is initialized
        consultationCsvFileInput.removeEventListener('change', handleConsultationCsvFileChange);
        consultationCsvFileInput.addEventListener('change', handleConsultationCsvFileChange);
    }

    if (uploadConsultationCsvButton) { // Check if uploadConsultationCsvButton is initialized
        uploadConsultationCsvButton.removeEventListener('click', handleUploadConsultationCsvClick);
        uploadConsultationCsvButton.addEventListener('click', handleUploadConsultationCsvClick);
    }

    if (expandChartButton) { // Check if expandChartButton is initialized
        expandChartButton.removeEventListener('click', handleExpandChartClick);
        expandChartButton.addEventListener('click', handleExpandChartClick);
    }

    if (closeExpandedChartButton) { // Check if closeExpandedChartButton is initialized
        closeExpandedChartButton.removeEventListener('click', handleCloseExpandedChartClick);
        closeExpandedChartButton.addEventListener('click', handleCloseExpandedChartClick);
    }

    if (expandedChartModal) { // Check if expandedChartModal is initialized
        window.removeEventListener('click', handleExpandedChartModalClickOutside);
        window.addEventListener('click', handleExpandedChartModalClickOutside);
    }

    if (document.querySelector('#detailedConsultationTable thead')) { // Check if element exists
        document.querySelector('#detailedConsultationTable thead').removeEventListener('click', handleDetailedConsultationTableSort);
        document.querySelector('#detailedConsultationTable thead').addEventListener('click', handleDetailedConsultationTableSort);
    }

    if (showTopConsultationAgentsButton) { // Check if showTopConsultationAgentsButton is initialized
        showTopConsultationAgentsButton.removeEventListener('click', handleShowTopConsultationAgentsClick);
        showTopConsultationAgentsButton.addEventListener('click', handleShowTopConsultationAgentsClick);
    }

    if (showBottomConsultationAgentsButton) { // Check if showBottomConsultationAgentsButton is initialized
        showBottomConsultationAgentsButton.removeEventListener('click', handleShowBottomConsultationAgentsClick);
        showBottomConsultationAgentsButton.addEventListener('click', handleShowBottomConsultationAgentsClick);
    }

    if (generateConsultationChartButton) { // Check if generateConsultationChartButton is initialized
        generateConsultationChartButton.removeEventListener('click', handleGenerateConsultationChartClick);
        generateConsultationChartButton.addEventListener('click', handleGenerateConsultationChartClick);
    }
} // End of attachDashboardEventListeners


// --- Event Handlers (separated for clarity and reusability) ---

function handleBackToNormalViewClick() {
    // Keep admin session active in Firebase, just redirect to normal view.
    // IMPORTANT: Removed localStorage.setItem('isAdminModeActive', 'true'); from here.
    // The normal view (consult.js) should be updated to allow authenticated admins to view it.
    window.location.href = 'consult.html'; // Redirect to the normal consultation dashboard
}

function handleAdminNavTabClick() {
    const targetId = this.dataset.target; // 'this' refers to the clicked tab

    if (targetId === 'consultAdminDashboardContent') {
        // Already on consult admin dashboard, just ensure it's active
        adminNavTabs.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        if (universalSearchBar) universalSearchBar.value = '';
        filterAndDisplayConsultationData(consultationParsedData, '');
    } else if (targetId === 'nursesAdminDashboard') {
        window.location.href = 'nursesadmin.html'; // Redirect to the nurses admin dashboard
    }
}

function handleUniversalSearchBarInput() {
    const searchTerm = universalSearchBar.value;
    filterAndDisplayConsultationData(consultationParsedData, searchTerm);
}

function handleClearUniversalSearchClick() {
    if (universalSearchBar) universalSearchBar.value = '';
    filterAndDisplayConsultationData(consultationParsedData, '');
}

function handleIndividualSearchBarInput(event) {
    if (event.target.classList.contains('individual-search-bar')) {
        const searchTerm = event.target.value.toLowerCase();
        const tableId = event.target.dataset.table;
        let dataToFilter = consultationParsedData;

        if (tableId === 'detailedConsultationTable') {
            const filtered = filterTableData(dataToFilter, searchTerm, ['Product', 'Med Agent', 'Employee Code', 'Consult Time (mins)', 'Docs', 'Region Name', 'Branch Name', 'Total Doc Time (mins)', 'Total Hold Time (mins)']);
            sortAndRenderDetailedConsultationTable(filtered);
        } else if (tableId === 'nurseConsultationLeaderboardTable') {
            const type = showTopConsultationAgentsButton && showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom';
            renderNurseConsultationLeaderboard(filterConsultationLeaderboardData(dataToFilter, searchTerm), type);
        }
    }
}

function handleTableActionButtons(e) {
    if (e.target.classList.contains('action-button')) {
        const docId = e.target.dataset.id;
        const type = e.target.dataset.type; // nurses or consultations

        if (e.target.classList.contains('delete-btn')) {
            showCustomConfirm('Are you sure you want to delete this Consultation record?', () => {
                deleteDocument('consultations_data', docId);
            });
        } else if (e.target.classList.contains('edit-btn')) {
            // For 'Edit' functionality, you'll need to:
            // 1. Get the current row data for the docId
            const rowData = consultationParsedData.find(d => d.id === docId);
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
    // Handle click on detailed consultation row to toggle details
    if (e.target.closest('.detailed-consultation-row')) {
        const tr = e.target.closest('.detailed-consultation-row');
        // Ensure it's not a click on an action button within the row
        if (!e.target.classList.contains('action-button')) {
            const detailRow = tr.nextElementSibling; // The detail row is the next sibling
            if (detailRow && detailRow.classList.contains('detailed-row-toggle')) {
                detailRow.querySelector('.detailed-row-content').classList.toggle('show');
            }
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
    }
}

function handleConsultationCsvFileChange(event) {
    const file = event.target.files[0];
    if (consultationFileNameSpan) consultationFileNameSpan.textContent = file ? file.name : 'No file chosen';
    if (consultationUploadMessage) consultationUploadMessage.textContent = '';
}

function handleUploadConsultationCsvClick() {
    const file = consultationCsvFileInput && consultationCsvFileInput.files[0];
    if (file) {
        uploadCsvToFirestore(file, 'consultations'); // Admin always uploads to Firestore
    } else {
        displayMessage(consultationUploadMessage, 'Please select a Consultation CSV file to upload.', 'error');
    }
}

function handleExpandChartClick() {
    const dimension = consultationChartDimension && consultationChartDimension.value;
    const chartType = consultationChartType && consultationChartType.value;
    if (!dimension) {
        displayMessage(chartMessage, 'Please select a dimension and generate the chart first.', 'error');
        return;
    }
    if (!consultationChartInstance) {
        displayMessage(chartMessage, 'Please generate the chart first before expanding.', 'error');
        return;
    }

    if (expandedChartTitle) expandedChartTitle.textContent = consultationChartInstance.options.plugins.title?.text || `Expanded Chart: ${dimension} (${chartType})`;
    renderExpandedChart(consultationChartInstance.data, chartType);
    if (expandedChartModal) expandedChartModal.classList.add('show');
}

function handleCloseExpandedChartClick() {
    if (expandedChartModal) expandedChartModal.classList.remove('show');
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
    }
}

function handleExpandedChartModalClickOutside(event) {
    if (event.target === expandedChartModal) {
        expandedChartModal.classList.remove('show');
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
            expandedChartInstance = null;
        }
    }
}

function handleDetailedConsultationTableSort(event) {
    const th = event.target.closest('th');
    if (th) {
        const columnIndex = Array.from(th.parentNode.children).indexOf(th);
        // Map table header index to data key
        const columnKeyMap = ['Product', 'Med Agent', 'Employee Code', 'Consult Time (mins)', 'Docs'];
        const sortColumn = columnKeyMap[columnIndex];

        if (sortColumn) {
            if (currentDetailedConsultationSortColumn === sortColumn) {
                currentDetailedConsultationSortDirection = currentDetailedConsultationSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentDetailedConsultationSortColumn = sortColumn;
                currentDetailedConsultationSortDirection = 'asc';
            }
            sortAndRenderDetailedConsultationTable(consultationFilteredData);
        }
    }
}

function handleShowTopConsultationAgentsClick() {
    renderNurseConsultationLeaderboard(consultationFilteredData, 'top');
    if (showTopConsultationAgentsButton) showTopConsultationAgentsButton.classList.add('active');
    if (showBottomConsultationAgentsButton) showBottomConsultationAgentsButton.classList.remove('active');
}

function handleShowBottomConsultationAgentsClick() {
    renderNurseConsultationLeaderboard(consultationFilteredData, 'bottom');
    if (showBottomConsultationAgentsButton) showBottomConsultationAgentsButton.classList.add('active');
    if (showTopConsultationAgentsButton) showTopConsultationAgentsButton.classList.remove('active');
}

function handleGenerateConsultationChartClick() {
    const dimension = consultationChartDimension && consultationChartDimension.value;
    const chartType = consultationChartType && consultationChartType.value;
    if (dimension) {
        renderConsultationChart(consultationFilteredData, dimension, chartType);
        if (chartMessage) chartMessage.textContent = '';
    } else {
        displayMessage(chartMessage, 'Please select a dimension to generate the chart.', 'error');
        if (consultationChartInstance) {
            consultationChartInstance.destroy();
            consultationChartInstance = null;
        }
    }
}


// --- Admin Login Handler (Moved from adminlogin.js, adapted for this page) ---
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


// --- Functions to show/hide sections ---
function showAdminLoginForm() {
    if (adminLoginSection) adminLoginSection.style.display = 'flex'; // Use flex to center the form
    if (consultAdminDashboardContent) consultAdminDashboardContent.style.display = 'none';
    if (adminNavTabs) adminNavTabs.style.display = 'none';
    if (universalSearchBarContainer) universalSearchBarContainer.style.display = 'none'; // Hide universal search
    if (clearUniversalSearchButton) clearUniversalSearchButton.style.display = 'none'; // Hide clear button
    if (logoutButton) logoutButton.style.display = 'none';
    if (loggedInUserStatusSpan) loggedInUserStatusSpan.style.display = 'none';
    if (backToNormalViewButton) backToNormalViewButton.style.display = 'none'; // Hide back to normal button
}

function showAdminDashboardContent() {
    if (adminLoginSection) adminLoginSection.style.display = 'none';
    if (consultAdminDashboardContent) consultAdminDashboardContent.style.display = 'block';
    if (adminNavTabs) adminNavTabs.style.display = 'flex'; // Show navigation tabs
    if (universalSearchBarContainer) universalSearchBarContainer.style.display = 'flex'; // Show universal search
    if (clearUniversalSearchButton) clearUniversalSearchButton.style.display = 'inline-block'; // Show clear button
    if (logoutButton) logoutButton.style.display = 'inline-block';
    if (loggedInUserStatusSpan) loggedInUserStatusSpan.style.display = 'inline-block';
    if (backToNormalViewButton) backToNormalViewButton.style.display = 'inline-block'; // Show back to normal button
    // Attach dashboard-specific listeners only when content is shown
    attachDashboardEventListeners();
}


// --- Function to fetch data from Firestore ---
async function fetchConsultationDataFromFirestore() {
    // Ensure a user (even anonymous) is logged in before setting up snapshot listeners
    if (!auth.currentUser) {
        console.log("No authenticated user found, waiting for admin login.");
        return; // Exit if no user, onAuthStateChanged will re-trigger when user is available
    }

    // Consultation Data Listener
    onSnapshot(collection(db, `artifacts/default-app-id/public/data/consultations_data`), (snapshot) => {
        consultationParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayConsultationData(consultationParsedData, universalSearchBar ? universalSearchBar.value : '');
        // Only display upload message if there's an actual file being processed or a recent upload
        if (consultationUploadMessage && (consultationUploadMessage.textContent === '' || consultationUploadMessage.textContent.includes('Loaded'))) {
               displayMessage(consultationUploadMessage, `Loaded ${consultationParsedData.length} Consultation records from database.`, 'success');
        }
    }, (error) => {
        console.error("Error fetching consultation data from Firestore:", error);
        if (consultationUploadMessage) {
            displayMessage(consultationUploadMessage, 'Failed to load Consultation data from database. Please check console for details.', 'error');
        }
    });
}


// --- Function to update UI visibility based on user status ---
function updateUIForUserStatus() {
    if (loggedInUserStatusSpan) {
        if (currentUserEmail) { // Authenticated user (admin)
            loggedInUserStatusSpan.textContent = `Logged in: ${currentUserEmail} (Admin Mode)`;
        } else { // Not logged in (showing login form)
            loggedInUserStatusSpan.textContent = '';
        }
    }
}


// --- CSV Parsing Functions ---
function parseConsultationCSV(file) {
    return new Promise((resolve, reject) => {
        if (!window.Papa) {
            return reject(new Error("Papa Parse library not loaded. Ensure 'papaparse.min.js' is included."));
        }
        Papa.parse(file, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error('Consultation CSV Parsing Errors:', results.errors);
                    reject(new Error('Error parsing Consultation CSV. Check format.'));
                    return;
                }
                console.log("***ACTUAL CSV HEADERS DETECTED BY PAPA PARSE:***", results.meta.fields);

                const parsedData = results.data.map(row => {
                    const cleanNumeric = (value) => {
                        if (typeof value === 'string') {
                            const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
                            const parsed = parseFloat(cleaned);
                            return isNaN(parsed) ? 0 : parsed;
                        }
                        const parsed = parseFloat(value);
                        return isNaN(parsed) ? 0 : parsed;
                    };

                    return {
                        Product: row.Product ? String(row.Product).trim() : '',
                        'Region Name': row['Region Name'] ? String(row['Region Name']).trim() : '',
                        'Branch Name': row['Branch Name'] ? String(row['Branch Name']).trim() : '',
                        'Med Agent': row['Med Agent'] ? String(row['Med Agent']).trim() : '',
                        'Employee Code': row['Employee Code'] ? String(row['Employee Code']).trim() : '',
                        'Docs': row.Docs ? String(row.Docs).replace(/,/g, '').trim() : '',
                        'Consult Time (mins)': cleanNumeric(row['Consult Time(mins)']),
                        'Total Doc Time (mins)': cleanNumeric(row['Total Doc(mins)']),
                        'Total Hold Time (mins)': cleanNumeric(row['Total Hold Time(mins)']),
                        'Consultation Date': row.Date ? String(row.Date).trim() : '',
                    };
                });
                resolve(parsedData);
            },
            error: function(err, file, inputElem, reason) {
                console.error('Papa Parse Error (Consultation):', err, reason);
                reject(new Error('Failed to parse Consultation CSV file.'));
            }
        });
    });
}

// --- Data Filtering and Display Functions ---

function filterAndDisplayConsultationData(data, searchTerm) {
    if (!searchTerm) {
        consultationFilteredData = data;
    } else {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        consultationFilteredData = data.filter(row =>
            (row.Product && String(row.Product).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Region Name'] && String(row['Region Name']).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Branch Name'] && String(row['Branch Name']).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Med Agent'] && String(row['Med Agent']).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.Docs && String(row.Docs).toLowerCase().includes(lowerCaseSearchTerm))
        );
    }
    processAndDisplayConsultationData(consultationFilteredData);
}

function processAndDisplayConsultationData(data) {
    clearConsultationDashboard();
    renderConsultationSummaryCards(data);
    sortAndRenderDetailedConsultationTable(data);
    const leaderboardType = showTopConsultationAgentsButton && showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom';
    renderNurseConsultationLeaderboard(data, leaderboardType);
    // Reset chart state when data changes or filters apply
    if (consultationChartInstance) {
        consultationChartInstance.destroy();
        consultationChartInstance = null;
    }
    if (chartMessage) chartMessage.textContent = '';
    if (consultationChartDimension) consultationChartDimension.value = '';
    if (consultationChartType) consultationChartType.value = 'bar';
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
        if (expandedChartModal) expandedChartModal.classList.remove('show');
    }
}

function clearConsultationDashboard() {
    if (totalConsultationsToday) totalConsultationsToday.textContent = '0';
    if (detailedConsultationTableBody) detailedConsultationTableBody.innerHTML = '';
    if (nurseConsultationLeaderboardTableBody) nurseConsultationLeaderboardTableBody.innerHTML = '';
    if (consultationChartInstance) {
        consultationChartInstance.destroy();
        consultationChartInstance = null;
    }
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
        if (expandedChartModal) expandedChartModal.classList.remove('show');
    }
    if (chartMessage) chartMessage.textContent = '';
    if (consultationChartDimension) consultationChartDimension.value = '';
    if (consultationChartType) consultationChartType.value = 'bar';
    currentDetailedConsultationSortColumn = null;
    currentDetailedConsultationSortDirection = 'asc';
}

// --- Consultation Dashboard Rendering Functions ---

function renderConsultationSummaryCards(data) {
    if (totalConsultationsToday) totalConsultationsToday.textContent = data.length;
}

function sortAndRenderDetailedConsultationTable(data) {
    let dataToSort = [...data];

    if (currentDetailedConsultationSortColumn) {
        dataToSort.sort((a, b) => {
            let valA = a[currentDetailedConsultationSortColumn];
            let valB = b[currentDetailedConsultationSortColumn];

            if (typeof valA === 'number' && typeof valB === 'number') {
                return currentDetailedConsultationSortDirection === 'asc' ? valA - valB : valB - valA;
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                return currentDetailedConsultationSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return 0;
        });
    }
    renderDetailedConsultationRecords(dataToSort, universalSearchBar ? universalSearchBar.value : '');
}

function renderDetailedConsultationRecords(data, searchTerm = '') {
    if (!detailedConsultationTableBody) {
        console.error("detailedConsultationTableBody element not found.");
        return;
    }
    detailedConsultationTableBody.innerHTML = '';

    const filteredData = searchTerm ? data.filter(row => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (row.Product && String(row.Product).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Med Agent'] && String(row['Med Agent']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row.Docs && String(row.Docs).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Consult Time (mins)'] && String(row['Consult Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Region Name'] && String(row['Region Name']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Branch Name'] && String(row['Branch Name']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Total Doc Time (mins)'] && String(row['Total Doc Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Total Hold Time (mins)'] && String(row['Total Hold Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm));
    }) : data;

    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align: center; color: #777;">No data available or matches your search.</td>`;
        detailedConsultationTableBody.appendChild(tr);
        return;
    }

    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        tr.classList.add('detailed-consultation-row');
        tr.innerHTML = `
            <td>${row.Product || 'N/A'}</td>
            <td>${row['Med Agent'] || 'N/A'}</td>
            <td>${row['Employee Code'] || 'N/A'}</td>
            <td>${row['Consult Time (mins)'] || '0'} min</td>
            <td>${row.Docs || 'N/A'}</td>
            <td class="admin-action-col"><button class="action-button edit-btn" data-id="${row.id}">Edit</button><button class="action-button delete-btn" data-id="${row.id}" data-type="consultations">Delete</button></td>
        `;

        const detailRow = document.createElement('tr');
        detailRow.innerHTML = `
            <td colspan="6">
                <div class="detailed-row-content">
                    <p><strong>Region Name:</strong> ${row['Region Name'] || 'N/A'}</p>
                    <p><strong>Branch Name:</strong> ${row['Branch Name'] || 'N/A'}</p>
                    <p><strong>Total Doc Time (mins):</strong> ${row['Total Doc Time (mins)'] || '0'} min</p>
                    <p><strong>Total Hold Time (mins):</strong> ${row['Total Hold Time (mins)'] || '0'} min</p>
                </div>
            </td>
        `;
        detailRow.classList.add('detailed-row-toggle');

        // Event listener for row click (for detail modal) - handled by delegated `handleTableActionButtons`

        detailedConsultationTableBody.appendChild(tr);
        detailedConsultationTableBody.appendChild(detailRow);
    });
    // Edit/Delete buttons event listeners are handled by delegated `handleTableActionButtons`
}

function renderNurseConsultationLeaderboard(data, type = 'top') {
    if (!nurseConsultationLeaderboardTableBody) {
        console.error("nurseConsultationLeaderboardTableBody element not found.");
        return;
    }
    nurseConsultationLeaderboardTableBody.innerHTML = '';

    const agentConsultationCounts = {};

    data.forEach(row => {
        const agent = row['Med Agent'] || 'N/A';
        const employeeCode = row['Employee Code'] || 'N/A';
        const consultationTime = row['Consult Time (mins)'] || 0;

        if (employeeCode !== 'N/A' && (consultationTime > 0 || (consultationTime === 0 && row.Docs))) {
            const key = `${agent}-${employeeCode}`;
            if (!agentConsultationCounts[key]) {
                agentConsultationCounts[key] = {
                    id: row.id,
                    agent: agent,
                    employeeCode: employeeCode,
                    count: 0
                };
            }
            agentConsultationCounts[key].count += 1;
        }
    });

    let sortedAgents = Object.values(agentConsultationCounts).sort((a, b) => {
        return type === 'top' ? b.count - a.count : a.count - b.count;
    });

    sortedAgents = sortedAgents.slice(0, 5);

    if (sortedAgents.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No completed consultation data for leaderboard.</td>`;
        nurseConsultationLeaderboardTableBody.appendChild(tr);
        return;
    }

    sortedAgents.forEach((entry, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.agent || 'N/A'}</td>
            <td>${entry.employeeCode || 'N/A'}</td>
            <td>${entry.count}</td>
            <td class="admin-action-col"><button class="action-button edit-btn" data-id="${entry.id}">Edit</button><button class="action-button delete-btn" data-id="${entry.id}" data-type="consultations">Delete</button></td>
        `;
        nurseConsultationLeaderboardTableBody.appendChild(tr);
    });
    // Edit/Delete buttons event listeners are handled by delegated `handleTableActionButtons`
}

function filterConsultationLeaderboardData(data, searchTerm) {
    if (!searchTerm) return data;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return data.filter(row =>
        (row['Med Agent'] && String(row['Med Agent']).toLowerCase().includes(lowerCaseSearchTerm)) ||
        (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm))
    );
}

function renderConsultationChart(data, dimension, chartType) {
    if (consultationChartInstance) {
        consultationChartInstance.destroy();
    }
    if (!consultationChartCanvas) {
        console.error("consultationChartCanvas element not found.");
        if (chartMessage) displayMessage(chartMessage, 'Chart canvas element not found.', 'error');
        return;
    }

    if (!dimension) {
        if (chartMessage) displayMessage(chartMessage, 'Please select a dimension to generate the chart.', 'error');
        return;
    }

    const labels = [];
    const counts = [];
    const groupedData = {};

    data.forEach(row => {
        const value = row[dimension] || 'N/A';
        if (value !== 'N/A') {
            groupedData[value] = (groupedData[value] || 0) + 1;
        }
    });

    Object.keys(groupedData).sort().forEach(key => {
        labels.push(key);
        counts.push(groupedData[key]);
    });

    if (labels.length === 0) {
        if (chartMessage) displayMessage(chartMessage, 'No data available for the selected dimension to generate a chart.', 'error');
        return;
    }

    const ctx = consultationChartCanvas.getContext('2d');
    consultationChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: `Number of Consultations by ${dimension}`,
                data: counts,
                backgroundColor: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? [
                    'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(255, 99, 71, 0.7)',
                    'rgba(60, 179, 113, 0.7)', 'rgba(218, 112, 214, 0.7)', 'rgba(255, 140, 0, 0.7)'
                ] : 'rgba(37, 117, 252, 0.7)',
                borderColor: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? [
                    'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)', 'rgba(83, 102, 255, 1)', 'rgba(255, 99, 71, 1)',
                    'rgba(60, 179, 113, 1)', 'rgba(218, 112, 214, 1)', 'rgba(255, 140, 0, 1)'
                ] : 'rgba(37, 117, 252, 1)',
                borderWidth: 1,
                fill: chartType === 'line' ? false : true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? {} : {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Consultations'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: dimension
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== undefined) {
                                label += context.parsed.y;
                            } else if (context.parsed) {
                                label += context.parsed.toFixed(0);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
    if (chartMessage) displayMessage(chartMessage, 'Chart generated successfully!', 'success');
}

function renderExpandedChart(chartData, chartType) {
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
    }
    if (!expandedConsultationChartCanvas) {
        console.error("expandedConsultationChartCanvas element not found.");
        return;
    }

    const ctx = expandedConsultationChartCanvas.getContext('2d');
    expandedChartInstance = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? {} : {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Consultations'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: consultationChartDimension ? consultationChartDimension.value : ''
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== undefined) {
                                label += context.parsed.y;
                            } else if (context.parsed) {
                                label += context.parsed.toFixed(0);
                            }
                            return label;
                        }
                    }
                }
            }
        }
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
                    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${long}`;
                    return `<a href="${googleMapsUrl}" target="_blank">View on Map</a>`;
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
    return `${hours}h ${minutes}m ${seconds}s`;
}

function displayMessage(element, msg, type) {
    if (element) { // Check if element exists
        element.textContent = msg;
        element.className = 'message ' + type;
    } else {
        console.warn("Message element not found to display:", msg);
    }
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
    // Get table headers (from thead)
    const headerRow = tableElement.querySelector('thead tr');
    if (headerRow) {
        const headerCells = headerRow.querySelectorAll('th');
        const headers = Array.from(headerCells)
                                .filter(th => !th.classList.contains('admin-action-col')) // Exclude action column
                                .map(th => th.innerText.trim());
        csv.push(headers.join(','));
    }

    // Get table body rows
    const rows = tableElement.querySelectorAll('tbody tr');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Skip empty message rows (e.g., "No data available")
        if (row.querySelector('td[colspan]')) {
            continue;
        }
        // Exclude detailed-row-toggle rows if they are not part of the main data
        if (row.classList.contains('detailed-row-toggle')) {
            continue;
        }

        const rowData = [];
        const cols = row.querySelectorAll('td');
        for (let j = 0; j < cols.length; j++) {
            // Skip admin action column in download
            if (cols[j].classList.contains('admin-action-col')) {
                continue;
            }

            let cellData = cols[j].innerText.trim();
            // If it's a link, get the link text or href
            const link = cols[j].querySelector('a');
            if (link) {
                cellData = link.innerText.trim() || link.href; // Prioritize text, fall back to href
            }
            // CSV escape if data contains commas or newlines
            if (cellData.includes(',') || cellData.includes('\n') || cellData.includes('"')) {
                cellData = `"${cellData.replace(/"/g, '""')}"`;
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

// Custom Alert/Confirm Modals (replaces browser's alert/confirm)
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


// --- Firestore Integration Functions ---
const FIRESTORE_BATCH_SIZE = 499; // Max 500 operations per batch, so 499 is safer

async function uploadCsvToFirestore(file, type) {
    if (!currentUserId || !isSuperAdmin) { // Ensure only super admins can upload
        displayMessage(consultationUploadMessage, 'You must be logged in as an Admin to upload data to the database.', 'error');
        return;
    }

    displayMessage(consultationUploadMessage, 'Uploading and processing data...', 'info');

    try {
        const dataToUpload = await parseConsultationCSV(file);
        const collectionName = 'consultations_data';
        const collectionRef = collection(db, `artifacts/default-app-id/public/data/${collectionName}`);

        // 1. Delete all existing documents
        displayMessage(consultationUploadMessage, 'Clearing existing data (this may take time for large files)...', 'info');
        let docsToDelete = [];
        let lastDoc = null;
        let querySnapshot;

        // Loop to fetch all documents in batches for deletion
        do {
            let q = query(collectionRef, limit(FIRESTORE_BATCH_SIZE));
            querySnapshot = await getDocs(q);
            docsToDelete = docsToDelete.concat(querySnapshot.docs);
            lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]; // Get the last document for next iteration
            displayMessage(consultationUploadMessage, `Fetched ${docsToDelete.length} documents for deletion...`, 'info');
        } while (querySnapshot.size === FIRESTORE_BATCH_SIZE); // Keep fetching if we're hitting the limit

        if (docsToDelete.length > 0) {
            const deletePromises = [];
            const numBatches = Math.ceil(docsToDelete.length / FIRESTORE_BATCH_SIZE);
            for (let i = 0; i < numBatches; i++) {
                const batch = writeBatch(db);
                const start = i * FIRESTORE_BATCH_SIZE;
                const end = Math.min((i + 1) * FIRESTORE_BATCH_SIZE, docsToDelete.length);
                const currentBatchDocs = docsToDelete.slice(start, end);

                currentBatchDocs.forEach(d => {
                    batch.delete(d.ref);
                });
                deletePromises.push(batch.commit());
            }
            await Promise.all(deletePromises);
            displayMessage(consultationUploadMessage, `Finished clearing ${docsToDelete.length} records. Uploading new data...`, 'info');
        } else {
             displayMessage(consultationUploadMessage, 'No existing records to clear. Uploading new data...', 'info');
        }


        // 2. Upload new documents in batches
        displayMessage(consultationUploadMessage, `Uploading ${dataToUpload.length} new records...`, 'info');
        const uploadPromises = [];
        const numUploadBatches = Math.ceil(dataToUpload.length / FIRESTORE_BATCH_SIZE);

        for (let i = 0; i < numUploadBatches; i++) {
            const batch = writeBatch(db);
            const start = i * FIRESTORE_BATCH_SIZE;
            const end = Math.min((i + 1) * FIRESTORE_BATCH_SIZE, dataToUpload.length);
            const currentBatchData = dataToUpload.slice(start, end);

            currentBatchData.forEach(row => {
                const newDocRef = doc(collectionRef); // Create a new document reference with an auto-generated ID
                batch.set(newDocRef, row); // Use set with a new doc ref for each row
            });
            uploadPromises.push(batch.commit());
        }
        await Promise.all(uploadPromises);

        displayMessage(consultationUploadMessage, `Successfully uploaded ${dataToUpload.length} records to database.`, 'success');
        // onSnapshot listener will automatically update the dashboard
    } catch (e) {
        console.error("Error during CSV upload to Firestore:", e);
        displayMessage(consultationUploadMessage, `Failed to upload data to database: ${e.message}`, 'error');
    }
}

async function deleteDocument(collectionName, docId) {
    if (!currentUserId || !isSuperAdmin) { // Ensure only super admins can delete
        showCustomAlert("You must be logged in as an Admin to delete records.");
        return;
    }
    try {
        await deleteDoc(doc(db, `artifacts/default-app-id/public/data/${collectionName}`, docId));
        console.log(`Document ${docId} deleted from ${collectionName}`);
        showCustomAlert("Record deleted successfully!");
    } catch (e) {
        console.error("Error deleting document:", e);
        showCustomAlert("Error deleting record: " + e.message);
    }
}

async function editDocument(collectionName, docId, newData) {
    if (!currentUserId || !isSuperAdmin) { // Ensure only super admins can edit
        showCustomAlert("You must be logged in as an Admin to edit records.");
        return;
    }
    try {
        await updateDoc(doc(db, `artifacts/default-app-id/public/data/${collectionName}`, docId), newData);
        console.log(`Document ${docId} updated in ${collectionName}`);
        showCustomAlert("Record updated successfully!");
    } catch (e) {
        console.error("Error updating document:", e);
        showCustomAlert("Error updating record: " + e.message);
    }
}
