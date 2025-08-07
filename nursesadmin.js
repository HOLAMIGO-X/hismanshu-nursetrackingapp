// --- Firebase SDK Imports and Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, getDocs, onSnapshot, query, limit, deleteDoc, doc, setDoc, writeBatch, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// IMPORTANT: Using your new Firebase config for the local environment
const firebaseConfig = {
    apiKey: "AIzaSyAcUz7vD-Q9XrJn-DwmuaIdoPiEvnMzHXA",
    authDomain: "nursetracking-f4ded.firebaseapp.com",
    projectId: "nursetracking-f4ded",
    storageBucket: "nursetracking-f4ded.firebasestorage.app",
    messagingSenderId: "690414219736",
    appId: "1:690414219736:web:dedda2cc6f349437acc2ad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global variables ---
let currentUserId = null;
let currentUserEmail = null;
let isSuperAdmin = false;
const ADMIN_EMAILS = ["admin@example.com", "admin@123.com"];
let nursesParsedData = [];
let nursesFilteredData = [];
const BATCH_SIZE = 400; // Safe batch size for Firestore operations

// --- DOM Elements ---
let loggedInUserStatusSpan, logoutButton, backToNormalViewButton, adminNavTabs,
    universalSearchBar, clearUniversalSearchButton, adminLoginSection, adminLoginForm,
    adminEmailInput, adminPasswordInput, adminLoginErrorMessage,
    nursesAdminDashboardContent, nursesCsvFileInput, nursesFileNameSpan,
    uploadNursesCsvButton, nursesUploadMessage, totalClinicsLoggedIn,
    totalLoginSessions, activeSessionsCount, clinicLoginTableBody,
    activeSessionsTableBody, leaderboardTableBody, showTopShiftsButton,
    showBottomShiftsButton, channelHierarchyTree, shiftDetailModal,
    closeModalButton, detailLoginId, detailChannel, detailClinic,
    detailLoginTime, detailLogoutTime, detailShiftDuration, detailIpAddress,
    customAlertModal, customAlertMessage, customConfirmModal,
    customConfirmMessage, customConfirmYes, customConfirmNo;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    onAuthStateChanged(auth, handleAuthStateChange);
});

function initializeDOMElements() {
    loggedInUserStatusSpan = document.getElementById('loggedInUserStatus');
    logoutButton = document.getElementById('logoutButton');
    backToNormalViewButton = document.getElementById('backToNormalViewButton');
    adminNavTabs = document.getElementById('adminNavTabs');
    universalSearchBar = document.getElementById('universalSearchBar');
    clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    adminLoginSection = document.getElementById('adminLoginSection');
    adminLoginForm = document.getElementById('adminLoginForm');
    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    adminLoginErrorMessage = document.getElementById('adminLoginErrorMessage');
    nursesAdminDashboardContent = document.getElementById('nursesAdminDashboardContent');
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
    if (shiftDetailModal) closeModalButton = shiftDetailModal.querySelector('.close-button');
    detailLoginId = document.getElementById('detailLoginId');
    detailChannel = document.getElementById('detailChannel');
    detailClinic = document.getElementById('detailClinic');
    detailLoginTime = document.getElementById('detailLoginTime');
    detailLogoutTime = document.getElementById('detailLogoutTime');
    detailShiftDuration = document.getElementById('detailShiftDuration');
    detailIpAddress = document.getElementById('detailIpAddress');
    customAlertModal = document.getElementById('customAlertModal');
    customAlertMessage = document.getElementById('customAlertMessage');
    customConfirmModal = document.getElementById('customConfirmModal');
    customConfirmMessage = document.getElementById('customConfirmMessage');
    customConfirmYes = document.getElementById('customConfirmYes');
    customConfirmNo = document.getElementById('customConfirmNo');
}

// --- Authentication ---
function handleAuthStateChange(user) {
    if (user && ADMIN_EMAILS.includes(user.email)) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        isSuperAdmin = true;
        showAdminDashboardContent();
        fetchNursesDataFromFirestore();
    } else {
        currentUserId = null;
        currentUserEmail = null;
        isSuperAdmin = false;
        showAdminLoginForm();
    }
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    if (!email || !password) {
        displayMessage(adminLoginErrorMessage, 'Please enter both email and password.', 'error');
        return;
    }
    if (!ADMIN_EMAILS.includes(email)) {
        displayMessage(adminLoginErrorMessage, 'This email is not authorized for admin access.', 'error');
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        displayMessage(adminLoginErrorMessage, 'Admin login failed. Please check your credentials.', 'error');
    }
}

// --- UI Visibility and Event Listeners ---
function showAdminLoginForm() {
    if (adminLoginSection) adminLoginSection.style.display = 'flex';
    if (nursesAdminDashboardContent) nursesAdminDashboardContent.style.display = 'none';
    adminLoginForm?.addEventListener('submit', handleAdminLogin);
}

function showAdminDashboardContent() {
    if (adminLoginSection) adminLoginSection.style.display = 'none';
    if (nursesAdminDashboardContent) nursesAdminDashboardContent.style.display = 'block';
    attachDashboardEventListeners();
}

function attachDashboardEventListeners() {
    logoutButton?.addEventListener('click', () => signOut(auth));
    backToNormalViewButton?.addEventListener('click', () => { window.location.href = 'nurses.html'; });
    adminNavTabs?.querySelector('[data-target="consultAdminDashboard"]')?.addEventListener('click', () => { window.location.href = 'consultadmin.html'; });
    uploadNursesCsvButton?.addEventListener('click', handleUploadNursesCsvClick);
    nursesCsvFileInput?.addEventListener('change', (e) => {
        if(nursesFileNameSpan) nursesFileNameSpan.textContent = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    });
    universalSearchBar?.addEventListener('input', () => filterAndDisplayNursesData(nursesParsedData, universalSearchBar.value));
    clearUniversalSearchButton?.addEventListener('click', () => {
        if(universalSearchBar) universalSearchBar.value = '';
        filterAndDisplayNursesData(nursesParsedData, '');
    });
    showTopShiftsButton?.addEventListener('click', () => renderLeaderboard(nursesFilteredData, 'top'));
    showBottomShiftsButton?.addEventListener('click', () => renderLeaderboard(nursesFilteredData, 'bottom'));
    closeModalButton?.addEventListener('click', () => { if(shiftDetailModal) shiftDetailModal.style.display = 'none'; });
}


// --- Data Handling ---
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

function handleUploadNursesCsvClick() {
    const file = nursesCsvFileInput?.files[0];
    if (file) {
        uploadCsvToFirestore(file);
    } else {
        showCustomAlert('Please select a Nurses CSV file to upload.');
    }
}

function fetchNursesDataFromFirestore() {
    const nursesDataRef = collection(db, `artifacts/default-app-id/public/data/nurses_data`);
    onSnapshot(nursesDataRef, (snapshot) => {
        nursesParsedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndDisplayNursesData(nursesParsedData, universalSearchBar.value);
    });
}

function filterAndDisplayNursesData(data, searchTerm) {
    nursesFilteredData = !searchTerm ? data : data.filter(row =>
        Object.values(row).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    renderAllComponents(nursesFilteredData);
}

// --- UI Rendering Functions ---
function renderAllComponents(data) {
    renderNursesSummaryCards(data);
    renderClinicLoginTable(data);
    renderActiveSessionsTable(data);
    const leaderboardType = showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom';
    renderLeaderboard(data, leaderboardType);
    renderChannelHierarchyTree(data);
}

function renderNursesSummaryCards(data) {
    totalClinicsLoggedIn.textContent = new Set(data.map(row => row.Clinic).filter(Boolean)).size;
    totalLoginSessions.textContent = data.length;
    activeSessionsCount.textContent = data.filter(row => !row['logout time'] && row['login time']).length;
}

function renderClinicLoginTable(data) {
    clinicLoginTableBody.innerHTML = '';
    if (data.length === 0) {
        clinicLoginTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No matching data found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Clinic || 'N/A'}</td>
            <td>${row['login time'] || 'N/A'}</td>
            <td>${row['logout time'] || 'N/A'}</td>
            <td>${generateLocationLink(row['Lat Long'])}</td>
        `;
        tr.addEventListener('click', () => showShiftDetail(row));
        clinicLoginTableBody.appendChild(tr);
    });
}

function renderActiveSessionsTable(data) {
    activeSessionsTableBody.innerHTML = '';
    const activeSessions = data.filter(row => !row['logout time'] && row['login time']);
    if (activeSessions.length === 0) {
        activeSessionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No active sessions.</td></tr>`;
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
        `;
        activeSessionsTableBody.appendChild(tr);
    });
}

function renderLeaderboard(data, type) {
    leaderboardTableBody.innerHTML = '';
    const clinicShiftTimes = {};
    data.forEach(row => {
        const loginTime = row['login time'] ? new Date(row['login time']) : null;
        const logoutTime = row['logout time'] ? new Date(row['logout time']) : null;
        if (loginTime && logoutTime && (logoutTime - loginTime > 0)) {
            const duration = logoutTime - loginTime;
            const key = `${row.Clinic}-${row.login_id}`;
            if (!clinicShiftTimes[key]) {
                clinicShiftTimes[key] = { clinic: row.Clinic, login_id: row.login_id, firstLoginTime: row['login time'], totalDuration: 0 };
            }
            clinicShiftTimes[key].totalDuration += duration;
        }
    });
    const sortedClinics = Object.values(clinicShiftTimes)
        .sort((a, b) => type === 'top' ? b.totalDuration - a.totalDuration : a.totalDuration - b.totalDuration)
        .slice(0, 5);
    if (sortedClinics.length === 0) {
        leaderboardTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No completed shifts for leaderboard.</td></tr>`;
        return;
    }
    sortedClinics.forEach((entry, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.clinic || 'N/A'}</td>
            <td>${entry.login_id || 'N/A'}</td>
            <td>${entry.firstLoginTime || 'N/A'}</td>
            <td>${formatDuration(entry.totalDuration)}</td>
        `;
        leaderboardTableBody.appendChild(tr);
    });
}

function renderChannelHierarchyTree(data) {
    channelHierarchyTree.innerHTML = '';
    const channelsData = {};
    data.forEach(row => {
        if (!row.Channel || !row.Clinic) return;
        if (!channelsData[row.Channel]) channelsData[row.Channel] = {};
        if (!channelsData[row.Channel][row.Clinic]) channelsData[row.Channel][row.Clinic] = new Set();
        if (row.login_id) channelsData[row.Channel][row.Clinic].add(row.login_id);
    });
    if (Object.keys(channelsData).length === 0) {
        channelHierarchyTree.innerHTML = '<p style="text-align: center;">No channel data available.</p>';
        return;
    }
    Object.keys(channelsData).sort().forEach(channelName => {
        const channelNode = document.createElement('div');
        channelNode.innerHTML = `<div class="tree-node-header">▶ Channel: <strong>${channelName}</strong></div><div class="tree-node-content"></div>`;
        const channelContent = channelNode.querySelector('.tree-node-content');
        Object.keys(channelsData[channelName]).sort().forEach(clinicName => {
            const clinicNode = document.createElement('div');
            clinicNode.innerHTML = `<div class="tree-node-header">▶ Clinic: <strong>${clinicName}</strong></div><ul class="tree-node-content"></ul>`;
            const loginIdList = clinicNode.querySelector('ul');
            channelsData[channelName][clinicName].forEach(loginId => {
                const li = document.createElement('li');
                li.textContent = loginId;
                loginIdList.appendChild(li);
            });
            channelContent.appendChild(clinicNode);
        });
        channelHierarchyTree.appendChild(channelNode);
    });
}

// --- Helper Functions ---
function showShiftDetail(row) {
    if(shiftDetailModal) {
        detailLoginId.textContent = row.login_id || 'N/A';
        detailChannel.textContent = row.Channel || 'N/A';
        detailClinic.textContent = row.Clinic || 'N/A';
        detailLoginTime.textContent = row['login time'] || 'N/A';
        detailLogoutTime.textContent = row['logout time'] || 'N/A';
        const loginTime = row['login time'] ? new Date(row['login time']) : null;
        const logoutTime = row['logout time'] ? new Date(row['logout time']) : null;
        detailShiftDuration.textContent = (loginTime && logoutTime) ? formatDuration(logoutTime - loginTime) : 'N/A';
        detailIpAddress.textContent = row.ip || 'N/A';
        shiftDetailModal.style.display = 'flex';
    }
}

function generateLocationLink(latLongString) {
    try {
        if (latLongString) {
            const cleaned = latLongString.replace(/'/g, '"');
            const latLong = JSON.parse(cleaned);
            if (latLong.latitude && latLong.longitude) {
                const url = `https://www.google.com/maps/search/?api=1&query=${latLong.latitude},${latLong.longitude}`;
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">View on Map</a>`;
            }
        }
    } catch (e) { console.warn('Could not parse Lat Long:', latLongString, e); }
    return 'N/A';
}

function formatDuration(millis) {
    if (typeof millis !== 'number' || isNaN(millis) || millis < 0) return 'N/A';
    const hours = Math.floor(millis / 3600000);
    const minutes = Math.floor((millis % 3600000) / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

function displayMessage(element, msg, type) {
    if (element) {
        element.textContent = msg;
        element.className = `message ${type}`;
    }
}

function showCustomAlert(message) {
    if (customAlertMessage && customAlertModal) {
        customAlertMessage.textContent = message;
        customAlertModal.style.display = 'flex';
        const closeButton = customAlertModal.querySelector('button');
        if(closeButton) closeButton.onclick = () => { customAlertModal.style.display = 'none'; };
    } else {
        alert(message);
    }
}
