// --- Firebase SDK Imports and Initialization (Moved to top of module scope) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, limit, deleteDoc, doc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
let isAdmin = false; // This determines if the user is currently in admin mode
let isSuperAdmin = false; // This determines if the logged-in user *can* be an admin
let currentUserId = null;
let currentUserEmail = null;

// --- Define Admin Emails (Hardcoded for simplicity, ideally from secure config) ---
const ADMIN_EMAILS = ["admin@example.com", "admin@123.com"]; // REPLACE with your actual admin email(s) that you use for login

// --- Global Data Storage ---
let consultationParsedData = [];
let consultationFilteredData = [];

// Store current sort state for detailed consultation table
let currentDetailedConsultationSortColumn = null;
let currentDetailedConsultationSortDirection = 'asc';

// --- DOM Elements (Declared globally and initialized in initializeDOMElements) ---
let logoutButton;
let navTabs;
let dashboardSections; // Will only contain consultationDashboard now
let universalSearchBar;
let clearUniversalSearchButton;
let downloadButtons;
let loggedInUserStatusSpan;
let adminModeToggle; // Admin toggle button

let consultationCsvFileInput;
let consultationFileNameSpan;
let uploadConsultationCsvButton;
let consultationUploadMessage;
let consultationUploadProgressBar; // New: Progress bar element

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
onAuthStateChanged(auth, (user) => {
    // Ensure DOM elements are initialized before trying to access them
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDOMElements);
    } else {
        initializeDOMElements();
    }

    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        isSuperAdmin = ADMIN_EMAILS.includes(currentUserEmail);
        
        // Admin mode is persisted in localStorage. If user is super admin, check if admin mode was active.
        isAdmin = isSuperAdmin && (localStorage.getItem('isAdminModeActive') === 'true');

        console.log("User logged in:", currentUserEmail, "Is Super Admin:", isSuperAdmin, "Current Admin Mode:", isAdmin);
        
        fetchConsultationDataFromFirestore(); // Fetch data specific to Consultation Dashboard
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
            isAdmin = false;
            isSuperAdmin = false;
            clearConsultationDashboard();
            updateAdminUI(); // Update UI to reflect no user/admin state
        });

        // Clear local storage flags related to admin/user state
        localStorage.removeItem('isAdminModeActive');
        // Do NOT redirect to index.html here, as index.html is now the dashboard itself.
        // The anonymous sign-in handles the "normal user" access.
    }
    updateAdminUI(); // Update UI elements based on current login and admin status
});


// --- Function to initialize DOM elements ---
function initializeDOMElements() {
    // Only initialize if not already initialized
    if (logoutButton) return; 

    logoutButton = document.getElementById('logoutButton');
    navTabs = document.querySelectorAll('.nav-tab');
    dashboardSections = document.querySelectorAll('.dashboard-section'); // Will only contain consultationDashboard now
    universalSearchBar = document.getElementById('universalSearchBar');
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    downloadButtons = document.querySelectorAll('.download-button');
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    adminModeToggle = document.getElementById('adminModeToggle');

    consultationCsvFileInput = document.getElementById('consultationCsvFileInput');
    consultationFileNameSpan = document.getElementById('consultationFileName');
    uploadConsultationCsvButton = document.getElementById('uploadConsultationCsvButton');
    consultationUploadMessage = document.getElementById('consultationUploadMessage');
    consultationUploadProgressBar = document.getElementById('consultationUploadProgressBar'); // Initialize progress bar

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
    closeExpandedChartButton = document.querySelector('.close-expanded-chart-button');
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

    // Set initial active tab (Consultation Dashboard is the only one on this page)
    document.querySelector('.nav-tab[data-target="consultationDashboard"]').classList.add('active');
    document.getElementById('consultationDashboard').classList.add('active');
}


// --- Function to attach all event listeners ---
function attachEventListeners() {
    // Admin Toggle Button Listener
    if (adminModeToggle) {
        adminModeToggle.addEventListener('click', () => {
            if (isSuperAdmin) { // Only super admins can toggle admin mode
                isAdmin = !isAdmin; // Toggle the admin state
                localStorage.setItem('isAdminModeActive', isAdmin ? 'true' : 'false');
                updateAdminUI();
                // No re-fetch needed here, onSnapshot will handle data updates if any
                console.log("Admin Mode Toggled:", isAdmin);
            } else {
                showCustomAlert("Only authorized administrators can switch to Admin Mode.");
            }
        });
    }

    // Navigation Tabs (only Nurses and Consultation exist)
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.target;

            // Handle navigation between Nurses (index.html) and Consultation (consultationDashboard.html)
            if (targetId === 'consultationDashboard') {
                // Already on consultation dashboard, just ensure it's active
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('consultationDashboard').classList.add('active');
                universalSearchBar.value = '';
                filterAndDisplayConsultationData(consultationParsedData, '');
            } else if (targetId === 'nursesDashboard') {
                // Redirect to the separate nurses dashboard page
                window.location.href = 'index.html';
            }
        });
    });

    universalSearchBar.addEventListener('input', () => {
        // On consultationDashboard.html, universal search only applies to Consultation data
        const searchTerm = universalSearchBar.value;
        filterAndDisplayConsultationData(consultationParsedData, searchTerm);
    });

    clearUniversalSearchButton.addEventListener('click', () => {
        universalSearchBar.value = '';
        filterAndDisplayConsultationData(consultationParsedData, '');
    });

    document.addEventListener('input', (event) => {
        if (event.target.classList.contains('individual-search-bar')) {
            const searchTerm = event.target.value.toLowerCase();
            const tableId = event.target.dataset.table;
            let dataToFilter = consultationParsedData; // All individual searches on this page use consultationParsedData

            if (tableId === 'detailedConsultationTable') {
                const filtered = filterTableData(dataToFilter, searchTerm, ['Product', 'Med Agent', 'Employee Code', 'Consult Time (mins)', 'Docs', 'Region Name', 'Branch Name', 'Total Doc Time (mins)', 'Total Hold Time (mins)']);
                sortAndRenderDetailedConsultationTable(filtered);
            } else if (tableId === 'nurseConsultationLeaderboardTable') {
                const type = showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom';
                renderNurseConsultationLeaderboard(filterConsultationLeaderboardData(dataToFilter, searchTerm), type);
            }
        }
    });

    downloadButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const tableId = event.target.dataset.tableId;
            const table = document.getElementById(tableId);
            if (table) {
                downloadTableAsCsv(table, `${tableId}_data.csv`);
            } else {
                console.error(`Table with ID ${tableId} not found for download.`);
            }
        });
    });

    consultationCsvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        consultationFileNameSpan.textContent = file ? file.name : 'No file chosen';
        consultationUploadMessage.textContent = '';
        if (isAdmin) { // Only upload to Firestore if in admin mode
            uploadCsvToFirestore(file, 'consultations');
        } else {
            // Normal users cannot upload, and local parsing is removed.
            showCustomAlert('CSV upload is only available in Admin Mode.');
            consultationCsvFileInput.value = ''; // Clear the selected file
            consultationFileNameSpan.textContent = 'No file chosen';
        }
    });

    uploadConsultationCsvButton.addEventListener('click', () => {
        const file = consultationCsvFileInput.files[0];
        if (file) {
            if (isAdmin) { // Only upload to Firestore if in admin mode
                uploadCsvToFirestore(file, 'consultations');
            } else {
                // Normal users cannot upload, and local parsing is removed.
                showCustomAlert('CSV upload is only available in Admin Mode.');
                consultationCsvFileInput.value = ''; // Clear the selected file
                consultationFileNameSpan.textContent = 'No file chosen';
            }
        } else {
            displayMessage(consultationUploadMessage, 'Please select a Consultation CSV file to upload.', 'error');
        }
    });

    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
        // After logout, onAuthStateChanged will handle anonymous sign-in and UI update
        // No explicit redirect to index.html needed as it's the current page
    });

    showTopConsultationAgentsButton.addEventListener('click', () => {
        renderNurseConsultationLeaderboard(consultationFilteredData, 'top');
        showTopConsultationAgentsButton.classList.add('active');
        showBottomConsultationAgentsButton.classList.remove('active');
    });

    showBottomConsultationAgentsButton.addEventListener('click', () => {
        renderNurseConsultationLeaderboard(consultationFilteredData, 'bottom');
        showBottomConsultationAgentsButton.classList.add('active');
        showTopConsultationAgentsButton.classList.remove('active');
    });

    generateConsultationChartButton.addEventListener('click', () => {
        const dimension = consultationChartDimension.value;
        const chartType = consultationChartType.value;
        if (dimension) {
            renderConsultationChart(consultationFilteredData, dimension, chartType);
            displayMessage(chartMessage, '', '');
        } else {
            displayMessage(chartMessage, 'Please select a dimension to generate the chart.', 'error');
            if (consultationChartInstance) {
                consultationChartInstance.destroy();
            }
        }
    });

    expandChartButton.addEventListener('click', () => {
        const dimension = consultationChartDimension.value;
        const chartType = consultationChartType.value;
        if (!dimension) {
            displayMessage(chartMessage, 'Please select a dimension and generate the chart first.', 'error');
            return;
        }
        if (!consultationChartInstance) {
            displayMessage(chartMessage, 'Please generate the chart first before expanding.', 'error');
            return;
        }

        expandedChartTitle.textContent = consultationChartInstance.options.plugins.title?.text || `Expanded Chart: ${dimension} (${chartType})`;
        renderExpandedChart(consultationChartInstance.data, chartType);
        expandedChartModal.classList.add('show');
    });

    closeExpandedChartButton.addEventListener('click', () => {
        expandedChartModal.classList.remove('show');
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
            expandedChartInstance = null;
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target == expandedChartModal) {
            expandedChartModal.classList.remove('show');
            if (expandedChartInstance) {
                expandedChartInstance.destroy();
                expandedChartInstance = null;
            }
        }
    });

    document.querySelector('#detailedConsultationTable thead').addEventListener('click', (event) => {
        const th = event.target.closest('th');
        if (th) {
            const columnIndex = Array.from(th.parentNode.children).indexOf(th);
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
    });
} // End of attachEventListeners


// --- Function to fetch data from Firestore ---
async function fetchConsultationDataFromFirestore() {
    // Ensure a user (even anonymous) is logged in before setting up snapshot listeners
    if (!auth.currentUser) {
        console.log("No authenticated user found, waiting for anonymous sign-in or admin login.");
        return; // Exit if no user, onAuthStateChanged will re-trigger when user is available
    }

    // Consultation Data Listener
    // Using __app_id for the collection path as specified in project overview
    onSnapshot(collection(db, `artifacts/default-app-id/public/data/consultations_data`), (snapshot) => {
        consultationParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayConsultationData(consultationParsedData, universalSearchBar.value);
        displayMessage(consultationUploadMessage, `Loaded ${consultationParsedData.length} Consultation records from database.`, 'success');
    }, (error) => {
        console.error("Error fetching consultation data from Firestore:", error);
        displayMessage(consultationUploadMessage, 'Failed to load Consultation data from database.', 'error');
    });
}


// --- Function to update Admin UI visibility ---
function updateAdminUI() {
    // User status display
    if (loggedInUserStatusSpan) {
        if (currentUserEmail) {
            loggedInUserStatusSpan.textContent = `Logged in: ${currentUserEmail} ${isAdmin ? '(Admin Mode)' : ''}`;
            loggedInUserStatusSpan.style.display = 'inline-block';
        } else if (auth.currentUser && auth.currentUser.isAnonymous) {
            loggedInUserStatusSpan.textContent = `Logged in: Guest`;
            loggedInUserStatusSpan.style.display = 'inline-block';
        }
        else {
            loggedInUserStatusSpan.textContent = '';
            loggedInUserStatusSpan.style.display = 'none';
        }
    }

    // Admin toggle button visibility
    if (adminModeToggle) {
        if (isSuperAdmin) { // Only show toggle if the user is a super admin
            adminModeToggle.style.display = 'inline-block';
            adminModeToggle.textContent = isAdmin ? 'Exit Admin Mode' : 'Switch to Admin Mode';
            adminModeToggle.classList.toggle('admin-active', isAdmin); // Add/remove class for styling
        } else {
            adminModeToggle.style.display = 'none'; // Hide for non-super admins
        }
    }

    // Admin-only features visibility (e.g., CSV upload sections, action columns)
    const adminOnlyFeatures = document.querySelectorAll('.admin-only-feature');
    adminOnlyFeatures.forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none'; // Show if isAdmin is true
    });

    const adminActionCols = document.querySelectorAll('.admin-action-col');
    adminActionCols.forEach(col => {
        col.style.display = isAdmin ? 'table-cell' : 'none'; // Show/hide admin action columns
    });

    // Re-render tables to update admin action columns
    // This is crucial to show/hide the "Actions" column
    sortAndRenderDetailedConsultationTable(consultationFilteredData);
    renderNurseConsultationLeaderboard(consultationFilteredData, showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom');
    // Chart rendering is handled by explicit button click
}


// --- CSV Parsing Functions ---
// Note: parseConsultationCSV is now only used internally by uploadCsvToFirestore for data cleaning.
function parseConsultationCSV(file) {
    return new Promise((resolve, reject) => {
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
            (row.Product && row.Product.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Region Name'] && row['Region Name'].toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Branch Name'] && row['Branch Name'].toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Med Agent'] && row['Med Agent'].toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.Docs && row.Docs.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }
    processAndDisplayConsultationData(consultationFilteredData);
}

function processAndDisplayConsultationData(data) {
    renderConsultationSummaryCards(data);
    sortAndRenderDetailedConsultationTable(data);
    renderNurseConsultationLeaderboard(data, showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom');
    // Reset chart state when data changes or filters apply
    if (consultationChartInstance) {
        consultationChartInstance.destroy();
        chartMessage.textContent = '';
    }
    consultationChartDimension.value = '';
    consultationChartType.value = 'bar';
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
        expandedChartModal.classList.remove('show');
    }
}

function clearConsultationDashboard() {
    totalConsultationsToday.textContent = '0';
    detailedConsultationTableBody.innerHTML = '';
    nurseConsultationLeaderboardTableBody.innerHTML = '';
    if (consultationChartInstance) {
        consultationChartInstance.destroy();
        consultationChartInstance = null;
    }
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
        expandedChartInstance = null;
        expandedChartModal.classList.remove('show');
    }
    chartMessage.textContent = '';
    consultationChartDimension.value = '';
    consultationChartType.value = 'bar';
    currentDetailedConsultationSortColumn = null;
    currentDetailedConsultationSortDirection = 'asc';
}

// --- Consultation Dashboard Rendering Functions ---

function renderConsultationSummaryCards(data) {
    totalConsultationsToday.textContent = data.length;
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
    renderDetailedConsultationRecords(dataToSort, universalSearchBar.value);
}

function renderDetailedConsultationRecords(data, searchTerm = '') {
    detailedConsultationTableBody.innerHTML = '';

    const filteredData = searchTerm ? data.filter(row => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (row.Product && row.Product.toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Med Agent'] && row['Med Agent'].toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row.Docs && row.Docs.toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Consult Time (mins)'] && String(row['Consult Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Region Name'] && row['Region Name'].toLowerCase().includes(lowerCaseSearchTerm)) ||
               (row['Branch Name'] && row['Branch Name'].toLowerCase().includes(lowerCaseSearchTerm)) ||
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
            ${isAdmin ? `<td><button class="action-button edit-btn" data-id="${row.id}">Edit</button><button class="action-button delete-btn" data-id="${row.id}" data-type="consultations">Delete</button></td>` : `<td class="admin-action-col"></td>`}
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

        tr.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-button')) return;
            detailRow.querySelector('.detailed-row-content').classList.toggle('show');
        });

        detailedConsultationTableBody.appendChild(tr);
        detailedConsultationTableBody.appendChild(detailRow);
    });

    detailedConsultationTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.target.dataset.id;
            showCustomConfirm('Are you sure you want to delete this Consultation record?', () => {
                deleteDocument('consultations_data', docId);
            });
        });
    });
}

function renderNurseConsultationLeaderboard(data, type = 'top') {
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
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No completed consultation data for leaderboard.</td>`; // Adjusted colspan
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
            ${isAdmin ? `<td><button class="action-button edit-btn" data-id="${entry.id}">Edit</button><button class="action-button delete-btn" data-id="${entry.id}" data-type="consultations">Delete</button></td>` : `<td class="admin-action-col"></td>`}
        `;
        nurseConsultationLeaderboardTableBody.appendChild(tr);
    });

    nurseConsultationLeaderboardTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.target.dataset.id;
            showCustomConfirm('Are you sure you want to delete this Consultation record?', () => {
                deleteDocument('consultations_data', docId);
            });
        });
    });
}

function filterConsultationLeaderboardData(data, searchTerm) {
    if (!searchTerm) return data;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return data.filter(row =>
        (row['Med Agent'] && row['Med Agent'].toLowerCase().includes(lowerCaseSearchTerm)) ||
        (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm))
    );
}

function renderConsultationChart(data, dimension, chartType) {
    if (consultationChartInstance) {
        consultationChartInstance.destroy();
    }

    if (!dimension) {
        displayMessage(chartMessage, 'Please select a dimension to generate the chart.', 'error');
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
        displayMessage(chartMessage, 'No data available for the selected dimension to generate a chart.', 'error');
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
    displayMessage(chartMessage, 'Chart generated successfully!', 'success');
}

function renderExpandedChart(chartData, chartType) {
    if (expandedChartInstance) {
        expandedChartInstance.destroy();
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
                        text: consultationChartDimension.value
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
    element.textContent = msg;
    element.className = 'message ' + type;
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
    customAlertMessage.textContent = message;
    customAlertModal.style.display = 'flex'; // Use flex to center
}

function showCustomConfirm(message, onConfirm) {
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
}


// --- Firestore Integration Functions ---
const FIRESTORE_BATCH_SIZE = 499; // Max 500 operations per batch, so 499 is safer

async function uploadCsvToFirestore(file, type) {
    if (!isAdmin) {
        displayMessage(consultationUploadMessage, 'You must be in Admin Mode to upload data to the database.', 'error');
        return;
    }

    displayMessage(consultationUploadMessage, 'Uploading and processing data...', 'info');
    consultationUploadProgressBar.style.width = '0%'; // Reset progress bar
    consultationUploadProgressBar.parentElement.style.display = 'block'; // Show progress container

    try {
        const dataToUpload = await parseConsultationCSV(file);
        const collectionName = type === 'nurses' ? 'nurses_data' : 'consultations_data'; 
        const collectionRef = collection(db, `artifacts/default-app-id/public/data/${collectionName}`);

        // 1. Delete all existing documents in batches
        displayMessage(consultationUploadMessage, 'Clearing existing data...', 'info');
        let totalDocsDeleted = 0;
        let deleteSnapshot;
        do {
            deleteSnapshot = await getDocs(query(collectionRef, limit(FIRESTORE_BATCH_SIZE)));
            if (deleteSnapshot.empty) break;

            const deleteBatch = writeBatch(db);
            deleteSnapshot.docs.forEach(d => {
                deleteBatch.delete(d.ref);
            });
            await deleteBatch.commit();
            totalDocsDeleted += deleteSnapshot.size;
            displayMessage(consultationUploadMessage, `Deleted ${totalDocsDeleted} existing records...`, 'info');
            // Small delay to yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 50)); 
        } while (deleteSnapshot.size > 0);

        displayMessage(consultationUploadMessage, `Finished clearing ${totalDocsDeleted} records. Uploading new data...`, 'info');

        // 2. Upload new documents in batches
        let totalDocsUploaded = 0;
        for (let i = 0; i < dataToUpload.length; i += FIRESTORE_BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = dataToUpload.slice(i, i + FIRESTORE_BATCH_SIZE);
            
            chunk.forEach(row => {
                batch.set(doc(collectionRef), row);
            });
            
            await batch.commit();
            totalDocsUploaded += chunk.length;
            const progress = (totalDocsUploaded / dataToUpload.length) * 100;
            consultationUploadProgressBar.style.width = `${progress}%`;
            displayMessage(consultationUploadMessage, `Uploaded ${totalDocsUploaded} of ${dataToUpload.length} records...`, 'info');
            // Small delay to yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        displayMessage(consultationUploadMessage, `Successfully uploaded ${dataToUpload.length} records to database.`, 'success');
        consultationUploadProgressBar.parentElement.style.display = 'none'; // Hide progress bar
        // onSnapshot listener will automatically update the dashboard
    } catch (e) {
        console.error("Error during CSV upload to Firestore:", e);
        displayMessage(consultationUploadMessage, `Failed to upload data to database: ${e.message}`, 'error');
        consultationUploadProgressBar.parentElement.style.display = 'none'; // Hide progress bar on error
    }
}

async function deleteDocument(collectionName, docId) {
    if (!isAdmin) {
        showCustomAlert("You must be in Admin Mode to delete records.");
        return;
    }
    try {
        await deleteDoc(doc(db, `artifacts/default-app-id/public/data/${collectionName}`, docId));
        console.log(`Document ${docId} deleted from ${collectionName}`);
    } catch (e) {
        console.error("Error deleting document:", e);
        showCustomAlert("Error deleting record: " + e.message);
    }
}

async function editDocument(collectionName, docId, newData) {
    if (!isAdmin) {
        showCustomAlert("You must be in Admin Mode to edit records.");
        return;
    }
    try {
        await updateDoc(doc(db, `artifacts/default-app-id/public/data/${collectionName}`, docId), newData);
        console.log(`Document ${docId} updated in ${collectionName}`);
    } catch (e) {
        console.error("Error updating document:", e);
        showCustomAlert("Error updating record: " + e.message);
    }
}
