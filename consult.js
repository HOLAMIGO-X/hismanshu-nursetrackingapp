// --- Firebase SDK Imports and Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, getDocs, onSnapshot, query, limit } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

// Global variables to store user status
let currentUserId = null;
let currentUserEmail = null;
let isSuperAdmin = false; // Normal users are never super admins on this page

// --- Define Admin Emails (Used for redirection logic) ---
const ADMIN_EMAILS = ["admin@example.com", "admin@123.com"]; // REPLACE with your actual admin email(s)

// --- Global Data Storage ---
let consultationParsedData = [];
let consultationFilteredData = [];

// Store current sort state for detailed consultation table
let currentDetailedConsultationSortColumn = null;
let currentDetailedConsultationSortDirection = 'asc';

// --- DOM Elements (Declared globally and initialized in initializeDOMElements) ---
let logoutButton;
let navTabs;
let dashboardSections;
let universalSearchBar;
let clearUniversalSearchButton;
let downloadButtons;
let loggedInUserStatusSpan;
let loginAsAdminButton; // New: Login as Admin button

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
let customConfirmModal; // Not used for normal users, but initialized for consistency
let customConfirmMessage;
let customConfirmYes;
let customConfirmNo;


// --- Firebase Authentication State Listener ---
document.addEventListener('DOMContentLoaded', () => { // Ensure DOM is loaded before running
    initializeDOMElements(); // Initialize elements as soon as DOM is ready

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            currentUserEmail = user.email;
            isSuperAdmin = ADMIN_EMAILS.includes(currentUserEmail);

            // IMPORTANT CHANGE: Removed the redirection for isSuperAdmin from here.
            // Admins should now be allowed to view the normal dashboard (consult.html).
            // The redirection logic to admin page is handled only when a non-admin
            // tries to access an admin page directly (e.g., in consultadmin.js).
            // if (isSuperAdmin) {
            //     window.location.href = 'consultadmin.html';
            //     return;
            // }

            console.log("User logged in:", currentUserEmail || "Anonymous", "Is Super Admin:", isSuperAdmin);
            fetchConsultationDataFromFirestore(); // Fetch data for display
        } else {
            // If no user is logged in, sign in anonymously to allow read access as a normal user
            signInAnonymously(auth).then(() => {
                console.log("Signed in anonymously. Normal user view.");
                // onAuthStateChanged will be called again with the anonymous user
            }).catch((error) => {
                console.error("Error signing in anonymously:", error);
                // If anonymous sign-in fails, clear data and show empty dashboard
                currentUserId = null;
                currentUserEmail = null;
                isSuperAdmin = false;
                clearConsultationDashboard();
                updateUIForUserStatus(); // Update UI to reflect no user
            });
        }
        updateUIForUserStatus(); // Update UI elements based on current login status
    });
});


// --- Function to initialize DOM elements ---
function initializeDOMElements() {
    // Only initialize if not already initialized
    if (logoutButton) return;

    logoutButton = document.getElementById('logoutButton');
    navTabs = document.querySelectorAll('.nav-tab');
    dashboardSections = document.querySelectorAll('.dashboard-section'); // Assuming these exist in consult.html
    universalSearchBar = document.getElementById('universalSearchBar');
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    downloadButtons = document.querySelectorAll('.download-button');
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    loginAsAdminButton = document.getElementById('loginAsAdminButton');

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

    // Attach event listeners after elements are initialized
    attachEventListeners();

    // Set initial active tab
    const consultTab = document.querySelector('.nav-tab[data-target="consultDashboard"]');
    if (consultTab) consultTab.classList.add('active');
    const consultDashboardSection = document.getElementById('consultDashboard');
    if (consultDashboardSection) consultDashboardSection.classList.add('active');
}


// --- Function to attach all event listeners ---
function attachEventListeners() {
    // Login as Admin Button Listener
    if (loginAsAdminButton) {
        loginAsAdminButton.removeEventListener('click', handleLoginAsAdminClick); // Prevent duplicates
        loginAsAdminButton.addEventListener('click', handleLoginAsAdminClick);
    }

    // Logout button (only for authenticated non-admin users, though current flow might not create them)
    if (logoutButton) {
        logoutButton.removeEventListener('click', handleLogoutClick); // Prevent duplicates
        logoutButton.addEventListener('click', handleLogoutClick);
    }

    // Navigation Tabs
    if (navTabs) {
        navTabs.forEach(tab => {
            tab.removeEventListener('click', handleNavTabClick); // Prevent duplicates
            tab.addEventListener('click', handleNavTabClick);
        });
    }

    if (universalSearchBar) {
        universalSearchBar.removeEventListener('input', handleUniversalSearchBarInput);
        universalSearchBar.addEventListener('input', handleUniversalSearchBarInput);
    }

    if (clearUniversalSearchButton) {
        clearUniversalSearchButton.removeEventListener('click', handleClearUniversalSearchClick);
        clearUniversalSearchButton.addEventListener('click', handleClearUniversalSearchClick);
    }

    document.removeEventListener('input', handleIndividualSearchBarInput); // Prevent duplicates
    document.addEventListener('input', handleIndividualSearchBarInput);

    if (downloadButtons) {
        downloadButtons.forEach(button => {
            button.removeEventListener('click', handleDownloadButtonClick); // Prevent duplicates
            button.addEventListener('click', handleDownloadButtonClick);
        });
    }

    // Custom modal close buttons
    if (customAlertModal) {
        const closeBtn = customAlertModal.querySelector('.close-button');
        if (closeBtn) {
            closeBtn.removeEventListener('click', handleCustomAlertClose);
            closeBtn.addEventListener('click', handleCustomAlertClose);
        }
    }
    if (customConfirmYes) {
        customConfirmYes.removeEventListener('click', handleCustomConfirmYes);
        customConfirmYes.addEventListener('click', handleCustomConfirmYes);
    }
    if (customConfirmNo) {
        customConfirmNo.removeEventListener('click', handleCustomConfirmNo);
        customConfirmNo.addEventListener('click', handleCustomConfirmNo);
    }

    if (showTopConsultationAgentsButton) {
        showTopConsultationAgentsButton.removeEventListener('click', handleShowTopConsultationAgentsClick);
        showTopConsultationAgentsButton.addEventListener('click', handleShowTopConsultationAgentsClick);
    }

    if (showBottomConsultationAgentsButton) {
        showBottomConsultationAgentsButton.removeEventListener('click', handleShowBottomConsultationAgentsClick);
        showBottomConsultationAgentsButton.addEventListener('click', handleShowBottomConsultationAgentsClick);
    }

    if (generateConsultationChartButton) {
        generateConsultationChartButton.removeEventListener('click', handleGenerateConsultationChartClick);
        generateConsultationChartButton.addEventListener('click', handleGenerateConsultationChartClick);
    }

    if (expandChartButton) {
        expandChartButton.removeEventListener('click', handleExpandChartClick);
        expandChartButton.addEventListener('click', handleExpandChartClick);
    }

    if (closeExpandedChartButton) {
        closeExpandedChartButton.removeEventListener('click', handleCloseExpandedChartClick);
        closeExpandedChartButton.addEventListener('click', handleCloseExpandedChartClick);
    }

    if (expandedChartModal) {
        window.removeEventListener('click', handleExpandedChartModalClickOutside);
        window.addEventListener('click', handleExpandedChartModalClickOutside);
    }

    // Event delegation for detailed consultation table header sort
    const detailedTableHead = document.querySelector('#detailedConsultationTable thead');
    if (detailedTableHead) {
        detailedTableHead.removeEventListener('click', handleDetailedConsultationTableSort);
        detailedTableHead.addEventListener('click', handleDetailedConsultationTableSort);
    }
} // End of attachEventListeners


// --- Event Handler Functions ---

function handleLoginAsAdminClick() {
    window.location.href = 'consultadmin.html'; // Redirect to the dedicated admin login page
}

async function handleLogoutClick() {
    try {
        await signOut(auth);
        // onAuthStateChanged will handle anonymous sign-in and UI update
    } catch (error) {
        console.error("Error during logout:", error);
        showCustomAlert("Error during logout. Please try again.");
    }
}

function handleNavTabClick() {
    const targetId = this.dataset.target;

    navTabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    dashboardSections.forEach(section => {
        if (section.id === targetId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    if (targetId === 'consultDashboard') {
        if (universalSearchBar) universalSearchBar.value = '';
        filterAndDisplayConsultationData(consultationParsedData, '');
    } else if (targetId === 'nursesDashboard') {
        window.location.href = 'nurses.html'; // Redirect to the normal nurses dashboard
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

function handleDownloadButtonClick(event) {
    const tableId = event.target.dataset.tableId;
    const table = document.getElementById(tableId);
    if (table) {
        downloadTableAsCsv(table, `${tableId}_data.csv`);
    } else {
        console.error(`Table with ID ${tableId} not found for download.`);
        showCustomAlert(`Error: Table with ID ${tableId} not found for download.`);
    }
}

function handleCustomAlertClose() {
    if (customAlertModal) customAlertModal.style.display = 'none';
}

// These two functions are placeholders for customConfirmYes/No handlers
// The actual logic for onConfirm is passed directly in showCustomConfirm
function handleCustomConfirmYes() { /* Logic handled by `onclick` in showCustomConfirm */ }
function handleCustomConfirmNo() { /* Logic handled by `onclick` in showCustomConfirm */ }


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


// --- Function to fetch data from Firestore ---
async function fetchConsultationDataFromFirestore() {
    // Ensure a user (even anonymous) is logged in before setting up snapshot listeners
    if (!auth.currentUser) {
        console.log("No authenticated user found, waiting for anonymous sign-in or admin login.");
        return; // Exit if no user, onAuthStateChanged will re-trigger when user is available
    }

    // Consultation Data Listener
    onSnapshot(collection(db, `artifacts/default-app-id/public/data/consultations_data`), (snapshot) => {
        consultationParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayConsultationData(consultationParsedData, universalSearchBar ? universalSearchBar.value : '');
    }, (error) => {
        console.error("Error fetching consultation data from Firestore:", error);
        showCustomAlert('Failed to load Consultation data from database. Please check console for details.');
    });
}


// --- Function to update UI visibility based on user status ---
function updateUIForUserStatus() {
    if (loggedInUserStatusSpan) {
        if (currentUserEmail) { // Authenticated user (non-admin)
            loggedInUserStatusSpan.textContent = `Logged in: ${currentUserEmail}`;
            loggedInUserStatusSpan.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'inline-block';
            if (loginAsAdminButton) loginAsAdminButton.style.display = 'none'; // Hide if already logged in
        } else if (auth.currentUser && auth.currentUser.isAnonymous) { // Anonymous user (guest)
            loggedInUserStatusSpan.textContent = `Logged in: Guest`;
            loggedInUserStatusSpan.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'none'; // Guests don't explicitly "logout"
            if (loginAsAdminButton) loginAsAdminButton.style.display = 'inline-block'; // Show "Login as Admin" for guests
        } else { // No user (initial state before anonymous sign-in completes)
            loggedInUserStatusSpan.textContent = '';
            loggedInUserStatusSpan.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
            if (loginAsAdminButton) loginAsAdminButton.style.display = 'inline-block'; // Default to showing login for unauthenticated
        }
    }
    // No admin-specific features on this page, so no need to hide/show them.
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
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No data available or matches your search.</td>`; // Adjusted colspan
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
            <!-- Admin actions column removed from normal view -->
        `;

        const detailRow = document.createElement('tr');
        detailRow.innerHTML = `
            <td colspan="5">
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
    // No delete/edit buttons for normal users
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
        tr.innerHTML = `<td colspan="4" style="text-align: center; color: #777;">No completed consultation data for leaderboard.</td>`; // Adjusted colspan
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
            <!-- Admin actions column removed from normal view -->
        `;
        nurseConsultationLeaderboardTableBody.appendChild(tr);
    });
    // No delete/edit buttons for normal users
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
            if (cellData.includes(',') || cellData.includes('\n')) {
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
