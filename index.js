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
let nursesParsedData = [];
let nursesFilteredData = [];

// --- DOM Elements (Declared globally and initialized in initializeDOMElements) ---
let logoutButton;
let navTabs;
let dashboardSections; // Will only contain nursesDashboard now
let universalSearchBar;
let clearUniversalSearchButton;
let downloadButtons;
let loggedInUserStatusSpan;
let adminModeToggle; // Admin toggle button
let loginAsAdminButton; // New: Login as Admin button

let nursesCsvFileInput;
let nursesFileNameSpan;
let uploadNursesCsvButton;
let nursesUploadMessage;
let nursesUploadProgressBar; // New: Progress bar element

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
        
        fetchNursesDataFromFirestore(); // Fetch data specific to Nurses Dashboard
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
            clearNursesDashboard();
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
    dashboardSections = document.querySelectorAll('.dashboard-section'); // Will only contain nursesDashboard now
    universalSearchBar = document.getElementById('universalSearchBar');
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    downloadButtons = document.querySelectorAll('.download-button');
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    adminModeToggle = document.getElementById('adminModeToggle');
    loginAsAdminButton = document.getElementById('loginAsAdminButton'); // Initialize new button

    nursesCsvFileInput = document.getElementById('nursesCsvFileInput');
    nursesFileNameSpan = document.getElementById('nursesFileName');
    uploadNursesCsvButton = document.getElementById('uploadNursesCsvButton');
    nursesUploadMessage = document.getElementById('nursesUploadMessage');
    nursesUploadProgressBar = document.getElementById('nursesUploadProgressBar'); // Initialize progress bar

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
    closeModalButton = shiftDetailModal.querySelector('.close-button');
    detailLoginId = document.getElementById('detailLoginId');
    detailChannel = document.getElementById('detailChannel');
    detailClinic = document.getElementById('detailClinic');
    detailLoginTime = document.getElementById('detailLoginTime');
    detailLogoutTime = document.getElementById('detailLogoutTime');
    detailShiftDuration = document.getElementById('detailShiftDuration');
    detailIpAddress = document.getElementById('detailIpAddress');

    // Custom Modal elements
    customAlertModal = document.getElementById('customAlertModal');
    customAlertMessage = document.getElementById('customAlertMessage');
    customConfirmModal = document.getElementById('customConfirmModal');
    customConfirmMessage = document.getElementById('customConfirmMessage');
    customConfirmYes = document.getElementById('customConfirmYes');
    customConfirmNo = document.getElementById('customConfirmNo');

    // Attach event listeners after elements are initialized
    attachEventListeners();

    // Set initial active tab (Nurses Dashboard is the only one on this page)
    document.querySelector('.nav-tab[data-target="nursesDashboard"]').classList.add('active');
    document.getElementById('nursesDashboard').classList.add('active');
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

    // New: Login as Admin Button Listener
    if (loginAsAdminButton) {
        loginAsAdminButton.addEventListener('click', () => {
            window.location.href = 'adminlogin.html'; // Redirect to the dedicated admin login page
        });
    }

    // Navigation Tabs (only Nurses and Consultation exist)
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.target;

            // Handle navigation between Nurses (index.html) and Consultation (consultationDashboard.html)
            if (targetId === 'nursesDashboard') {
                // Already on nurses dashboard, just ensure it's active
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('nursesDashboard').classList.add('active');
                universalSearchBar.value = '';
                filterAndDisplayNursesData(nursesParsedData, '');
            } else if (targetId === 'consultationDashboard') {
                // Redirect to the separate consultation dashboard page
                window.location.href = 'consultationDashboard.html';
            }
        });
    });

    universalSearchBar.addEventListener('input', () => {
        // On index.html, universal search only applies to Nurses data
        const searchTerm = universalSearchBar.value;
        filterAndDisplayNursesData(nursesParsedData, searchTerm);
    });

    clearUniversalSearchButton.addEventListener('click', () => {
        universalSearchBar.value = '';
        filterAndDisplayNursesData(nursesParsedData, '');
    });

    document.addEventListener('input', (event) => {
        if (event.target.classList.contains('individual-search-bar')) {
            const searchTerm = event.target.value.toLowerCase();
            const tableId = event.target.dataset.table;
            let dataToFilter = nursesParsedData; // All individual searches on this page use nursesParsedData

            if (tableId === 'clinicLoginTable') {
                renderClinicLoginTable(filterTableData(dataToFilter, searchTerm, ['Clinic', 'Location']));
            } else if (tableId === 'activeSessionsTable') {
                renderActiveSessionsTable(filterTableData(dataToFilter, searchTerm, ['Clinic', 'login_id', 'ip', 'Location']));
            } else if (tableId === 'leaderboardTable') {
                const type = showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom';
                renderLeaderboard(filterLeaderboardData(dataToFilter, searchTerm), type);
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

    nursesCsvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        nursesFileNameSpan.textContent = file ? file.name : 'No file chosen';
        nursesUploadMessage.textContent = '';
        if (isAdmin) { // Only upload to Firestore if in admin mode
            uploadCsvToFirestore(file, 'nurses');
        } else {
            // Normal users cannot upload, and local parsing is removed.
            showCustomAlert('CSV upload is only available in Admin Mode.');
            nursesCsvFileInput.value = ''; // Clear the selected file
            nursesFileNameSpan.textContent = 'No file chosen';
        }
    });

    uploadNursesCsvButton.addEventListener('click', () => {
        const file = nursesCsvFileInput.files[0];
        if (file) {
            if (isAdmin) { // Only upload to Firestore if in admin mode
                uploadCsvToFirestore(file, 'nurses');
            } else {
                // Normal users cannot upload, and local parsing is removed.
                showCustomAlert('CSV upload is only available in Admin Mode.');
                nursesCsvFileInput.value = ''; // Clear the selected file
                nursesFileNameSpan.textContent = 'No file chosen';
            }
        } else {
            displayMessage(nursesUploadMessage, 'Please select a Nurses CSV file to upload.', 'error');
        }
    });

    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
        // After logout, onAuthStateChanged will handle anonymous sign-in and UI update
        // No explicit redirect to index.html needed as it's the current page
    });

    closeModalButton.addEventListener('click', () => {
        shiftDetailModal.classList.remove('show');
    });

    window.addEventListener('click', (event) => {
        if (event.target == shiftDetailModal) {
            shiftDetailModal.classList.remove('show');
        }
    });

    showTopShiftsButton.addEventListener('click', () => {
        renderLeaderboard(nursesFilteredData, 'top');
        showTopShiftsButton.classList.add('active');
        showBottomShiftsButton.classList.remove('active');
    });

    showBottomShiftsButton.addEventListener('click', () => {
        renderLeaderboard(nursesFilteredData, 'bottom');
        showBottomShiftsButton.classList.add('active');
        showTopShiftsButton.classList.remove('active');
    });
} // End of attachEventListeners


// --- Function to fetch data from Firestore ---
async function fetchNursesDataFromFirestore() {
    // Ensure a user (even anonymous) is logged in before setting up snapshot listeners
    if (!auth.currentUser) {
        console.log("No authenticated user found, waiting for anonymous sign-in or admin login.");
        return; // Exit if no user, onAuthStateChanged will re-trigger when user is available
    }

    // Nurses Data Listener
    // Using __app_id for the collection path as specified in project overview
    onSnapshot(collection(db, `artifacts/default-app-id/public/data/nurses_data`), (snapshot) => {
        nursesParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayNursesData(nursesParsedData, universalSearchBar.value);
        displayMessage(nursesUploadMessage, `Loaded ${nursesParsedData.length} Nurses records from database.`, 'success');
    }, (error) => {
        console.error("Error fetching nurses data from Firestore:", error);
        displayMessage(nursesUploadMessage, 'Failed to load Nurses data from database.', 'error');
    });
}


// --- Function to update Admin UI visibility ---
function updateAdminUI() {
    // User status display
    if (loggedInUserStatusSpan) {
        if (currentUserEmail) { // User is logged in (could be admin or regular authenticated user)
            loggedInUserStatusSpan.textContent = `Logged in: ${currentUserEmail} ${isAdmin ? '(Admin Mode)' : ''}`;
            loggedInUserStatusSpan.style.display = 'inline-block';
            logoutButton.style.display = 'inline-block'; // Show logout for authenticated users
            loginAsAdminButton.style.display = 'none'; // Hide "Login as Admin" if already logged in
        } else if (auth.currentUser && auth.currentUser.isAnonymous) { // User is anonymous (guest)
            loggedInUserStatusSpan.textContent = `Logged in: Guest`;
            loggedInUserStatusSpan.style.display = 'inline-block';
            logoutButton.style.display = 'none'; // Hide logout for anonymous users
            loginAsAdminButton.style.display = 'inline-block'; // Show "Login as Admin" for guests
        }
        else { // No user is logged in (initial state before anonymous sign-in completes)
            loggedInUserStatusSpan.textContent = '';
            loggedInUserStatusSpan.style.display = 'none';
            logoutButton.style.display = 'none';
            loginAsAdminButton.style.display = 'inline-block'; // Default to showing login for unauthenticated
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
    renderClinicLoginTable(nursesFilteredData);
    renderActiveSessionsTable(nursesFilteredData);
    renderLeaderboard(nursesFilteredData, showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom');
}


// --- CSV Parsing Functions ---
// Note: parseNursesCSV is now only used internally by uploadCsvToFirestore for data cleaning,
// or if you re-introduce a local-only parsing for non-admins (which is currently removed).
function parseNursesCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error('Nurses CSV Parsing Errors:', results.errors);
                    reject(new Error('Error parsing Nurses CSV. Check format.'));
                    return;
                }
                const parsedData = results.data.map(row => ({
                    Channel: row.Channel ? String(row.Channel).trim() : '',
                    Clinic: row.Clinic ? String(row.Clinic).trim() : '',
                    login_id: row.login_id ? String(row.login_id).trim() : '',
                    'login time': row['login time'] ? String(row['login time']).trim() : '',
                    'logout time': row['logout time'] ? String(row['logout time']).trim() : '',
                    ip: row.ip ? String(row.ip).trim() : '',
                    'Lat Long': row['Lat Long'] ? String(row['Lat Long']).trim() : ''
                }));
                resolve(parsedData);
            },
            error: function(err, file, inputElem, reason) {
                console.error('Papa Parse Error (Nurses):', err, reason);
                reject(new Error('Failed to parse Nurses CSV file.'));
            }
        });
    });
}

// --- Data Filtering and Display Functions ---

function filterAndDisplayNursesData(data, searchTerm) {
    if (!searchTerm) {
        nursesFilteredData = data;
    } else {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        nursesFilteredData = data.filter(row =>
            (row.Clinic && row.Clinic.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.login_id && row.login_id.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.ip && row.ip.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.Channel && row.Channel.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }
    processAndDisplayNursesData(nursesFilteredData);
}

function processAndDisplayNursesData(data) {
    renderNursesSummaryCards(data);
    renderClinicLoginTable(data);
    renderActiveSessionsTable(data);
    renderLeaderboard(data, showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom');
    renderChannelHierarchyTree(data);
}

function clearNursesDashboard() {
    totalClinicsLoggedIn.textContent = '0';
    totalLoginSessions.textContent = '0';
    activeSessionsCount.textContent = '0';
    clinicLoginTableBody.innerHTML = '';
    activeSessionsTableBody.innerHTML = '';
    leaderboardTableBody.innerHTML = '';
    channelHierarchyTree.innerHTML = '';
}

// --- Nurses Dashboard Rendering Functions ---

function renderNursesSummaryCards(data) {
    const uniqueClinics = new Set(data.map(row => row.Clinic).filter(Boolean));
    totalClinicsLoggedIn.textContent = uniqueClinics.size;
    totalLoginSessions.textContent = data.length;
    const activeSessions = data.filter(row => !row['logout time'] && row['login time']);
    activeSessionsCount.textContent = activeSessions.length;
}

function renderClinicLoginTable(data) {
    clinicLoginTableBody.innerHTML = '';
    
    // The clinicFilter functionality has been removed from HTML and JS.
    const filteredData = data; // Now, it just uses the data passed to it (which is already filtered by universal search)

    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No data available or matches your search.</td>`;
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
            ${isAdmin ? `<td><button class="action-button edit-btn" data-id="${row.id}">Edit</button><button class="action-button delete-btn" data-id="${row.id}" data-type="nurses">Delete</button></td>` : `<td class="admin-action-col"></td>`}
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

        tr.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-button')) return;
            showShiftDetail(tr.dataset);
        });
        clinicLoginTableBody.appendChild(tr);
    });

    clinicLoginTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.target.dataset.id;
            showCustomConfirm('Are you sure you want to delete this Nurses record?', () => {
                deleteDocument('nurses_data', docId);
            });
        });
    });
}

function showShiftDetail(data) {
    detailLoginId.textContent = data.loginId;
    detailChannel.textContent = data.channel;
    detailClinic.textContent = data.clinic;
    detailLoginTime.textContent = data.loginTime;
    detailLogoutTime.textContent = data.logoutTime;
    detailShiftDuration.textContent = data.shiftDuration;
    detailIpAddress.textContent = data.ipAddress;
    shiftDetailModal.classList.add('show');
}

function renderActiveSessionsTable(data) {
    activeSessionsTableBody.innerHTML = '';
    const activeSessions = data.filter(row => !row['logout time'] && row['login time']);

    if (activeSessions.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align: center; color: #777;">No active sessions found (all logged out or no login time).</td>`;
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
            ${isAdmin ? `<td><button class="action-button edit-btn" data-id="${row.id}">Edit</button><button class="action-button delete-btn" data-id="${row.id}" data-type="nurses">Delete</button></td>` : `<td class="admin-action-col"></td>`}
        `;
        activeSessionsTableBody.appendChild(tr);
    });

    activeSessionsTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.target.dataset.id;
            showCustomConfirm('Are you sure you want to delete this Nurses record?', () => {
                deleteDocument('nurses_data', docId);
            });
        });
    });
}

function renderLeaderboard(data, type = 'top') {
    leaderboardTableBody.innerHTML = '';

    const clinicShiftTimes = {};

    data.forEach(row => {
        const loginTime = row['login time'] ? new Date(row['login time']) : null;
        const logoutTime = row['logout time'] ? new Date(row['logout time']) : null;

        if (loginTime && logoutTime && !isNaN(loginTime) && !isNaN(logoutTime)) {
            const duration = logoutTime - loginTime;
            if (duration > 0) {
                const key = `${row.Clinic}-${row.login_id}`;
                if (!clinicShiftTimes[key]) {
                    clinicShiftTimes[key] = {
                        id: row.id,
                        clinic: row.Clinic,
                        login_id: row.login_id,
                        firstLoginTime: row['login time'],
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

    sortedClinics = sortedClinics.slice(0, 5);

    if (sortedClinics.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" style="text-align: center; color: #777;">No completed shift data for leaderboard.</td>`;
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
            ${isAdmin ? `<td><button class="action-button edit-btn" data-id="${entry.id}">Edit</button><button class="action-button delete-btn" data-id="${entry.id}" data-type="nurses">Delete</button></td>` : `<td class="admin-action-col"></td>`}
        `;
        leaderboardTableBody.appendChild(tr);
    });

    leaderboardTableBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const docId = e.target.dataset.id;
            showCustomConfirm('Are you sure you want to delete this Nurses record?', () => {
                deleteDocument('nurses_data', docId);
            });
        });
    });
}

function filterLeaderboardData(data, searchTerm) {
    if (!searchTerm) return data;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return data.filter(row =>
        (row.Clinic && row.Clinic.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (row.login_id && row.login_id.toLowerCase().includes(lowerCaseSearchTerm))
    );
}

function renderChannelHierarchyTree(data) {
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
        channelHeader.innerHTML = `<span class="arrow">&#9654;</span> <span>Channel: <strong>${channelName}</strong> (${Object.keys(channelsData[channelName]).length} Clinics)</span>`;
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
                clinicHeader.innerHTML = `<span class="arrow">&#9654;</span> <span>Clinic: <strong>${clinicName}</strong> (${channelsData[channelName][clinicName].size} Login IDs)</span>`;
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

                        listItem.innerHTML = `<strong>${loginId}</strong> (Total Shift: ${formatDuration(totalDurationMillis)})`;
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

        channelHeader.addEventListener('click', () => {
            channelHeader.classList.toggle('active');
            channelContent.classList.toggle('show');
        });
        channelNode.querySelectorAll('.tree-node-header').forEach(header => {
            if (header !== channelHeader) {
                header.addEventListener('click', () => {
                    header.classList.toggle('active');
                    header.nextElementSibling.classList.toggle('show');
                });
            }
        });
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
        displayMessage(nursesUploadMessage, 'You must be in Admin Mode to upload data to the database.', 'error');
        return;
    }

    displayMessage(nursesUploadMessage, 'Uploading and processing data...', 'info');
    nursesUploadProgressBar.style.width = '0%'; // Reset progress bar
    nursesUploadProgressBar.parentElement.style.display = 'block'; // Show progress container

    try {
        const dataToUpload = await parseNursesCSV(file);
        const collectionName = type === 'nurses' ? 'nurses_data' : 'consultations_data'; 
        const collectionRef = collection(db, `artifacts/default-app-id/public/data/${collectionName}`);

        // 1. Delete all existing documents in batches
        displayMessage(nursesUploadMessage, 'Clearing existing data...', 'info');
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
            displayMessage(nursesUploadMessage, `Deleted ${totalDocsDeleted} existing records...`, 'info');
            // Small delay to yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 50)); 
        } while (deleteSnapshot.size > 0);

        displayMessage(nursesUploadMessage, `Finished clearing ${totalDocsDeleted} records. Uploading new data...`, 'info');

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
            nursesUploadProgressBar.style.width = `${progress}%`;
            displayMessage(nursesUploadMessage, `Uploaded ${totalDocsUploaded} of ${dataToUpload.length} records...`, 'info');
            // Small delay to yield to UI thread
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        displayMessage(nursesUploadMessage, `Successfully uploaded ${dataToUpload.length} records to database.`, 'success');
        nursesUploadProgressBar.parentElement.style.display = 'none'; // Hide progress bar
        // onSnapshot listener will automatically update the dashboard
    } catch (e) {
        console.error("Error during CSV upload to Firestore:", e);
        displayMessage(nursesUploadMessage, `Failed to upload data to database: ${e.message}`, 'error');
        nursesUploadProgressBar.parentElement.style.display = 'none'; // Hide progress bar on error
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
