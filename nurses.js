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
let nursesParsedData = [];
let nursesFilteredData = [];

// --- DOM Elements (Declared globally and initialized in initializeDOMElements) ---
let logoutButton;
let navTabs;
let dashboardSections;
let universalSearchBar;
let clearUniversalSearchButton;
let downloadButtons;
let loggedInUserStatusSpan;
let loginAsAdminButton; // New: Login as Admin button

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
let customConfirmModal; // Not used for normal users, but initialized for consistency
let customConfirmMessage;
let customConfirmYes;
let customConfirmNo;


// --- Firebase Authentication State Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements(); // Initialize elements as soon as DOM is ready

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            currentUserEmail = user.email;
            isSuperAdmin = ADMIN_EMAILS.includes(currentUserEmail);

            // IMPORTANT CHANGE: Removed the redirection for isSuperAdmin from here.
            // Admins should now be allowed to view the normal dashboard (nurses.html).
            // The redirection logic to admin page is handled only when a non-admin
            // tries to access an admin page directly (in nursesadmin.js).
            // if (isSuperAdmin) {
            //     window.location.href = 'nursesadmin.html';
            //     return;
            // }

            console.log("User logged in:", currentUserEmail || "Anonymous", "Is Super Admin:", isSuperAdmin);
            fetchNursesDataFromFirestore(); // Fetch data for display
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
                clearNursesDashboard();
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
    dashboardSections = document.querySelectorAll('.dashboard-section');
    universalSearchBar = document.getElementById('universalSearchBar');
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    downloadButtons = document.querySelectorAll('.download-button');
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    loginAsAdminButton = document.getElementById('loginAsAdminButton');

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
    // FIX: Corrected typo - removed extra 'document ='
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

    // Set initial active tab
    const nursesTab = document.querySelector('.nav-tab[data-target="nursesDashboard"]');
    if (nursesTab) nursesTab.classList.add('active');
    const nursesDashboardSection = document.getElementById('nursesDashboard');
    if (nursesDashboardSection) nursesDashboardSection.classList.add('active');
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

    if (closeModalButton) {
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

    // Event delegation for tree node headers
    if (channelHierarchyTree) {
        channelHierarchyTree.removeEventListener('click', handleTreeNodeHeaderDelegation);
        channelHierarchyTree.addEventListener('click', handleTreeNodeHeaderDelegation);
    }
} // End of attachEventListeners


// --- Event Handler Functions ---

function handleLoginAsAdminClick() {
    window.location.href = 'nursesadmin.html'; // Redirect to the dedicated admin login page
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

    if (targetId === 'nursesDashboard') {
        universalSearchBar.value = '';
        filterAndDisplayNursesData(nursesParsedData, '');
    } else if (targetId === 'consultDashboard') {
        window.location.href = 'consult.html'; // Redirect to the normal consultation dashboard
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
        let dataToFilter = nursesParsedData;

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
    if (showTopShiftsButton) showTopShiftsButton.classList.add('active');
    if (showBottomShiftsButton) showBottomShiftsButton.classList.remove('active');
}

function handleShowBottomShiftsClick() {
    renderLeaderboard(nursesFilteredData, 'bottom');
    if (showBottomShiftsButton) showBottomShiftsButton.classList.add('active');
    if (showTopShiftsButton) showTopShiftsButton.classList.remove('active');
}

function handleTreeNodeHeaderDelegation(e) {
    const header = e.target.closest('.tree-node-header');
    if (header) {
        header.classList.toggle('active');
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
    onSnapshot(collection(db, `artifacts/default-app-id/public/data/nurses_data`), (snapshot) => {
        nursesParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayNursesData(nursesParsedData, universalSearchBar ? universalSearchBar.value : '');
    }, (error) => {
        console.error("Error fetching nurses data from Firestore:", error);
        showCustomAlert('Failed to load Nurses data from database. Please check console for details.');
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
        tr.innerHTML = `<td colspan="4" style="text-align: center; color: #777;">No data available or matches your search.</td>`; // Adjusted colspan
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
            <!-- Admin actions column removed from normal view -->
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
            if (e.target.classList.contains('action-button')) return; // Prevent modal from opening if action button is clicked
            showShiftDetail(tr.dataset);
        });
        clinicLoginTableBody.appendChild(tr);
    });
    // No delete/edit buttons for normal users
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
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No active sessions found (all logged out or no login time).</td>`; // Adjusted colspan
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
            <!-- Admin actions column removed from normal view -->
        `;
        activeSessionsTableBody.appendChild(tr);
    });
    // No delete/edit buttons for normal users
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
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No completed shift data for leaderboard.</td>`; // Adjusted colspan
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
            <!-- Admin actions column removed from normal view -->
        `;
        leaderboardTableBody.appendChild(tr);
    });
    // No delete/edit buttons for normal users
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
        channelHeader.innerHTML = `<span class="arrow">▶</span> <span>Channel: <strong>${channelName}</strong> (${Object.keys(channelsData[channelName]).length} Clinics)</span>`;
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
                clinicHeader.innerHTML = `<span class="arrow">▶</span> <span>Clinic: <strong>${clinicName}</strong> (${channelsData[channelName][clinicName].size} Login IDs)</span>`;
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

        // Event listeners for tree node headers are now attached via attachEventListeners
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
