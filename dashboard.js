document.addEventListener('DOMContentLoaded', () => {
    // --- Global Elements ---
    const logoutButton = document.getElementById('logoutButton');
    const navTabs = document.querySelectorAll('.nav-tab');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    const universalSearchBar = document.getElementById('universalSearchBar');
    const clearUniversalSearchButton = document.getElementById('clearUniversalSearchButton');
    const downloadButtons = document.querySelectorAll('.download-button'); // Select all download buttons

    // --- Nurses Dashboard Elements ---
    const nursesCsvFileInput = document.getElementById('nursesCsvFileInput');
    const nursesFileNameSpan = document.getElementById('nursesFileName');
    const uploadNursesCsvButton = document.getElementById('uploadNursesCsvButton');
    const nursesUploadMessage = document.getElementById('nursesUploadMessage');

    const totalClinicsLoggedIn = document.getElementById('totalClinicsLoggedIn');
    const totalLoginSessions = document.getElementById('totalLoginSessions');
    const activeSessionsCount = document.getElementById('activeSessionsCount');

    const clinicLoginTableBody = document.querySelector('#clinicLoginTable tbody');
    const activeSessionsTableBody = document.querySelector('#activeSessionsTable tbody');
    const leaderboardTableBody = document.querySelector('#leaderboardTable tbody');
    const showTopShiftsButton = document.getElementById('showTopShifts');
    const showBottomShiftsButton = document.getElementById('showBottomShifts');
    const channelHierarchyTree = document.getElementById('channelHierarchyTree'); // Tree view element

    // Nurses Modal elements
    const shiftDetailModal = document.getElementById('shiftDetail');
    const closeModalButton = shiftDetailModal.querySelector('.close-button');
    const detailLoginId = document.getElementById('detailLoginId');
    const detailChannel = document.getElementById('detailChannel');
    const detailClinic = document = document.getElementById('detailClinic');
    const detailLoginTime = document.getElementById('detailLoginTime');
    const detailLogoutTime = document.getElementById('detailLogoutTime');
    const detailShiftDuration = document.getElementById('detailShiftDuration');
    const detailIpAddress = document.getElementById('detailIpAddress');

    // --- Consultation Dashboard Elements ---
    const consultationCsvFileInput = document.getElementById('consultationCsvFileInput');
    const consultationFileNameSpan = document.getElementById('consultationFileName');
    const uploadConsultationCsvButton = document.getElementById('uploadConsultationCsvButton');
    const consultationUploadMessage = document.getElementById('consultationUploadMessage');

    const totalConsultationsToday = document.getElementById('totalConsultationsToday');
    const detailedConsultationTableBody = document.querySelector('#detailedConsultationTable tbody'); // New table body
    const agentTimePivotTableBody = document.querySelector('#agentTimePivotTable tbody');
    const agentTimePivotTableHead = document.querySelector('#agentTimePivotTable thead');
    const nurseConsultationLeaderboardTableBody = document.querySelector('#nurseConsultationLeaderboardTable tbody');
    const showTopConsultationAgentsButton = document.getElementById('showTopConsultationAgents');
    const showBottomConsultationAgentsButton = document.getElementById('showBottomConsultationAgents');

    // Chart elements
    const consultationChartDimension = document.getElementById('consultationChartDimension');
    const consultationChartType = document.getElementById('consultationChartType');
    const generateConsultationChartButton = document.getElementById('generateConsultationChart');
    const consultationChartCanvas = document.getElementById('consultationChartCanvas');
    const chartMessage = document.getElementById('chartMessage');
    let consultationChartInstance = null;

    // Expanded Chart Modal elements
    const expandChartButton = document.getElementById('expandChartButton');
    const expandedChartModal = document.getElementById('expandedChartModal');
    const closeExpandedChartButton = document.querySelector('.close-expanded-chart-button');
    const expandedChartTitle = document.getElementById('expandedChartTitle');
    const expandedConsultationChartCanvas = document.getElementById('expandedConsultationChartCanvas');
    let expandedChartInstance = null;


    // --- Data Storage ---
    let nursesParsedData = [];
    let nursesFilteredData = [];
    let consultationParsedData = [];
    let consultationFilteredData = [];

    // Store current sort state for detailed consultation table
    let currentDetailedConsultationSortColumn = null;
    let currentDetailedConsultationSortDirection = 'asc';


    // --- Event Listeners ---

    // Tab Navigation
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.target;

            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            dashboardSections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });

            // Clear universal search when switching tabs
            universalSearchBar.value = '';
            // Re-render data for the active tab (without search filter initially)
            if (targetId === 'nursesDashboard') {
                filterAndDisplayNursesData(nursesParsedData, '');
            } else if (targetId === 'consultationDashboard') {
                filterAndDisplayConsultationData(consultationParsedData, '');
            }
        });
    });

    // Universal Search
    universalSearchBar.addEventListener('input', () => {
        const activeDashboard = document.querySelector('.dashboard-section.active').id;
        const searchTerm = universalSearchBar.value;
        if (activeDashboard === 'nursesDashboard') {
            filterAndDisplayNursesData(nursesParsedData, searchTerm);
        } else if (activeDashboard === 'consultationDashboard') {
            filterAndDisplayConsultationData(consultationParsedData, searchTerm);
        }
    });

    clearUniversalSearchButton.addEventListener('click', () => {
        universalSearchBar.value = '';
        const activeDashboard = document.querySelector('.dashboard-section.active').id;
        if (activeDashboard === 'nursesDashboard') {
            filterAndDisplayNursesData(nursesParsedData, '');
        } else if (activeDashboard === 'consultationDashboard') {
            filterAndDisplayConsultationData(consultationParsedData, '');
        }
    });

    // Individual Search Bars (delegated event listener)
    document.addEventListener('input', (event) => {
        if (event.target.classList.contains('individual-search-bar')) {
            const searchTerm = event.target.value.toLowerCase();
            const tableId = event.target.dataset.table;
            let dataToFilter = [];

            // Determine which dataset to filter based on the table
            if (['clinicLoginTable', 'activeSessionsTable', 'leaderboardTable'].includes(tableId)) {
                dataToFilter = nursesParsedData;
            } else if (['detailedConsultationTable', 'agentTimePivotTable', 'nurseConsultationLeaderboardTable'].includes(tableId)) {
                dataToFilter = consultationParsedData;
            }

            // Re-process and display only the specific table
            if (tableId === 'clinicLoginTable') {
                renderClinicLoginTable(filterTableData(dataToFilter, searchTerm, ['Clinic', 'Location']));
            } else if (tableId === 'activeSessionsTable') {
                renderActiveSessionsTable(filterTableData(dataToFilter, searchTerm, ['Clinic', 'login_id', 'ip', 'Location']));
            } else if (tableId === 'leaderboardTable') {
                const type = showTopShiftsButton.classList.contains('active') ? 'top' : 'bottom';
                renderLeaderboard(filterLeaderboardData(dataToFilter, searchTerm), type);
            } else if (tableId === 'detailedConsultationTable') {
                // For detailed consultation table, re-filter and re-sort
                const filtered = filterTableData(dataToFilter, searchTerm, ['Product', 'Region Name', 'Branch Name', 'Med Agent', 'Employee Code', 'Docs', 'Consult Time (mins)', 'Total Doc Time (mins)', 'Total Hold Time (mins)']);
                sortAndRenderDetailedConsultationTable(filtered);
            } else if (tableId === 'agentTimePivotTable') {
                renderAgentTimePivotTable(dataToFilter, searchTerm);
            } else if (tableId === 'nurseConsultationLeaderboardTable') {
                const type = showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom';
                renderNurseConsultationLeaderboard(filterConsultationLeaderboardData(dataToFilter, searchTerm), type);
            }
        }
    });

    // Download button event listener
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


    // Nurses Dashboard Event Listeners
    nursesCsvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        nursesFileNameSpan.textContent = file ? file.name : 'No file chosen';
        nursesUploadMessage.textContent = '';
    });

    uploadNursesCsvButton.addEventListener('click', () => {
        const file = nursesCsvFileInput.files[0];
        if (file) {
            parseNursesCSV(file);
        } else {
            displayMessage(nursesUploadMessage, 'Please select a Nurses CSV file to upload.', 'error');
        }
    });

    logoutButton.addEventListener('click', () => {
        window.location.href = 'index.html';
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

    // Consultation Dashboard Event Listeners
    consultationCsvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        consultationFileNameSpan.textContent = file ? file.name : 'No file chosen';
        consultationUploadMessage.textContent = '';
    });

    uploadConsultationCsvButton.addEventListener('click', () => {
        const file = consultationCsvFileInput.files[0];
        if (file) {
            parseConsultationCSV(file);
        } else {
            displayMessage(consultationUploadMessage, 'Please select a Consultation CSV file to upload.', 'error');
        }
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

    // Expanded Chart Modal Event Listeners
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

        // Transfer chart data and type to the expanded modal
        expandedChartTitle.textContent = consultationChartInstance.options.plugins.title?.text || `Expanded Chart: ${dimension} (${chartType})`;
        renderExpandedChart(consultationChartInstance.data, chartType);
        expandedChartModal.classList.add('show');
    });

    closeExpandedChartButton.addEventListener('click', () => {
        expandedChartModal.classList.remove('show');
        if (expandedChartInstance) {
            expandedChartInstance.destroy(); // Destroy expanded chart when closing
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

    // Sorting for Detailed Consultation Records Table
    document.querySelector('#detailedConsultationTable thead').addEventListener('click', (event) => {
        const th = event.target.closest('th');
        if (th) {
            const columnIndex = Array.from(th.parentNode.children).indexOf(th);
            const columnKeyMap = ['Product', 'Region Name', 'Branch Name', 'Med Agent', 'Employee Code', 'Consult Time (mins)', 'Docs']; // Map column index to data key
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


    // --- CSV Parsing Functions ---
    function parseNursesCSV(file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error('Nurses CSV Parsing Errors:', results.errors);
                    displayMessage(nursesUploadMessage, 'Error parsing Nurses CSV. Check format.', 'error');
                    nursesParsedData = [];
                    clearNursesDashboard();
                    return;
                }
                nursesParsedData = results.data.map(row => ({
                    Channel: row.Channel ? String(row.Channel).trim() : '',
                    Clinic: row.Clinic ? String(row.Clinic).trim() : '',
                    login_id: row.login_id ? String(row.login_id).trim() : '',
                    'login time': row['login time'] ? String(row['login time']).trim() : '',
                    'logout time': row['logout time'] ? String(row['logout time']).trim() : '',
                    ip: row.ip ? String(row.ip).trim() : '',
                    'Lat Long': row['Lat Long'] ? String(row['Lat Long']).trim() : ''
                }));
                displayMessage(nursesUploadMessage, `Loaded ${nursesParsedData.length} Nurses records.`, 'success');
                filterAndDisplayNursesData(nursesParsedData, universalSearchBar.value);
            },
            error: function(err, file, inputElem, reason) {
                console.error('Papa Parse Error (Nurses):', err, reason);
                displayMessage(nursesUploadMessage, 'Failed to parse Nurses CSV file.', 'error');
                nursesParsedData = [];
                clearNursesDashboard();
            }
        });
    }

    function parseConsultationCSV(file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.error('Consultation CSV Parsing Errors:', results.errors);
                    displayMessage(consultationUploadMessage, 'Error parsing Consultation CSV. Check format.', 'error');
                    consultationParsedData = [];
                    clearConsultationDashboard();
                    return;
                }
                console.log("***ACTUAL CSV HEADERS DETECTED BY PAPA PARSE:***", results.meta.fields); // Log detected headers

                // --- IMPORTANT: Adjusted column names and robust numeric parsing ---
                consultationParsedData = results.data.map(row => {
                    // Refined cleanNumeric function
                    const cleanNumeric = (value) => {
                        if (typeof value === 'string') {
                            // Remove all non-digit characters except for a single decimal point
                            // This regex handles commas as thousands separators by removing them.
                            // If the decimal separator is a comma, this would need a different approach (e.g., replace comma with dot).
                            // For now, assuming dot is decimal and commas are thousands separators.
                            const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
                            const parsed = parseFloat(cleaned);
                            // console.log(`Raw: "${value}", Cleaned: "${cleaned}", Parsed: ${parsed}`); // Debugging line
                            return isNaN(parsed) ? 0 : parsed;
                        }
                        const parsed = parseFloat(value);
                        // console.log(`Raw (non-string): "${value}", Parsed: ${parsed}`); // Debugging line
                        return isNaN(parsed) ? 0 : parsed;
                    };

                    // console.log("Processing row:", row); // Debugging line

                    return {
                        Product: row.Product ? String(row.Product).trim() : '',
                        'Region Name': row['Region Name'] ? String(row['Region Name']).trim() : '',
                        'Branch Name': row['Branch Name'] ? String(row['Branch Name']).trim() : '',
                        'Med Agent': row['Med Agent'] ? String(row['Med Agent']).trim() : '',
                        'Employee Code': row['Employee Code'] ? String(row['Employee Code']).trim() : '',
                        'Docs': row.Docs ? String(row.Docs).replace(/,/g, '').trim() : '', // Remove commas from Docs
                        'Consult Time (mins)': cleanNumeric(row['Consult Time(mins)']), // Corrected header name based on user's input
                        'Total Doc Time (mins)': cleanNumeric(row['Total Doc(mins)']), // Corrected header name based on user's input
                        'Total Hold Time (mins)': cleanNumeric(row['Total Hold Time(mins)']), // Corrected header name based on user's input
                        // Use 'Date' column for Consultation Date
                        'Consultation Date': row.Date ? String(row.Date).trim() : '', // Corrected header name based on user's input
                    };
                });
                displayMessage(consultationUploadMessage, `Loaded ${consultationParsedData.length} Consultation records.`, 'success');
                filterAndDisplayConsultationData(consultationParsedData, universalSearchBar.value);
            },
            error: function(err, file, inputElem, reason) {
                console.error('Papa Parse Error (Consultation):', err, reason);
                displayMessage(consultationUploadMessage, 'Failed to parse Consultation CSV file.', 'error');
                consultationParsedData = [];
                clearConsultationDashboard();
            }
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
        renderChannelHierarchyTree(data); // Render tree view
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
        sortAndRenderDetailedConsultationTable(data); // Call sorting function here
        renderAgentTimePivotTable(data);
        renderNurseConsultationLeaderboard(data, showTopConsultationAgentsButton.classList.contains('active') ? 'top' : 'bottom');
        // Clear chart when data changes
        if (consultationChartInstance) {
            consultationChartInstance.destroy();
            chartMessage.textContent = '';
        }
        consultationChartDimension.value = ''; // Reset chart selection
        consultationChartType.value = 'bar'; // Reset chart type selection
        // Also destroy expanded chart if open
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
            expandedChartInstance = null;
            expandedChartModal.classList.remove('show');
        }
    }

    function clearConsultationDashboard() {
        totalConsultationsToday.textContent = '0';
        detailedConsultationTableBody.innerHTML = ''; // Clear new table
        agentTimePivotTableBody.innerHTML = '';
        agentTimePivotTableHead.innerHTML = '';
        nurseConsultationLeaderboardTableBody.innerHTML = '';
        if (consultationChartInstance) {
            consultationChartInstance.destroy();
            consultationChartInstance = null;
        }
        if (expandedChartInstance) { // Clear expanded chart too
            expandedChartInstance.destroy();
            expandedChartInstance = null;
            expandedChartModal.classList.remove('show');
        }
        chartMessage.textContent = '';
        consultationChartDimension.value = '';
        consultationChartType.value = 'bar';
        currentDetailedConsultationSortColumn = null; // Reset sort state
        currentDetailedConsultationSortDirection = 'asc'; // Reset sort state
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
        if (data.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align: center; color: #777;">No data available or matches your search.</td>`;
            clinicLoginTableBody.appendChild(tr);
            return;
        }

        data.forEach(row => {
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
            `;
            // Store all data attributes for modal
            tr.dataset.loginId = row.login_id || 'N/A';
            tr.dataset.channel = row.Channel || 'N/A';
            tr.dataset.clinic = row.Clinic || 'N/A';
            tr.dataset.loginTime = row['login time'] || 'N/A';
            tr.dataset.logoutTime = row['logout time'] || 'N/A';
            tr.dataset.shiftDuration = shiftDuration;
            tr.dataset.shiftDurationMillis = shiftDurationMillis;
            tr.dataset.ipAddress = row.ip || 'N/A';

            tr.addEventListener('click', () => showShiftDetail(tr.dataset));
            clinicLoginTableBody.appendChild(tr);
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
            tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No active sessions found (all logged out or no login time).</td>`;
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
            `;
            activeSessionsTableBody.appendChild(tr);
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
                            clinic: row.Clinic,
                            login_id: row.login_id,
                            firstLoginTime: row['login time'], // Store the first login time for this entry
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

        sortedClinics = sortedClinics.slice(0, 5); // Limit to top/bottom 5

        if (sortedClinics.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" style="text-align: center; color: #777;">No completed shift data for leaderboard.</td>`; // Adjusted colspan
            leaderboardTableBody.appendChild(tr);
            return;
        }

        sortedClinics.forEach((entry, index) => {
            const formattedDuration = formatDuration(entry.totalDuration);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.clinic || 'N/A'}</td>
                <td>${entry.login_id || 'N/A'}</td>
                <td>${entry.firstLoginTime || 'N/A'}</td>
                <td>${formattedDuration}</td>
            `;
            leaderboardTableBody.appendChild(tr);
        });
    }

    // Filter data for leaderboard search
    function filterLeaderboardData(data, searchTerm) {
        if (!searchTerm) return data;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return data.filter(row =>
            (row.Clinic && row.Clinic.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (row.login_id && row.login_id.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }


    // Render Channel Hierarchy as a Tree View
    function renderChannelHierarchyTree(data) {
        channelHierarchyTree.innerHTML = ''; // Clear existing content
        const channelsData = {}; // { Channel: { Clinic: Set<login_id> } }

        data.forEach(row => {
            const channel = row.Channel;
            const clinic = row.Clinic;
            const loginId = row.login_id;

            if (!channel || !clinic) return; // Login ID can be empty

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
            channelContent.classList.add('tree-node-content');
            const clinicList = document.createElement('ul');

            const clinicNames = Object.keys(channelsData[channelName]).sort();
            if (clinicNames.length === 0) {
                const listItem = document.createElement('li');
                listItem.textContent = 'No clinics found for this channel.';
                clinicList.appendChild(listItem);
            } else {
                clinicNames.forEach(clinicName => {
                    const clinicNode = document.createElement('div');
                    clinicNode.classList.add('tree-node'); // Nested tree node for clinics

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
                            // Find total shift time for this loginId within this clinic
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
                    clinicList.appendChild(clinicNode); // Append clinic node to channel's clinic list
                });
            }
            channelContent.appendChild(clinicList);
            channelNode.appendChild(channelContent);
            channelHierarchyTree.appendChild(channelNode);

            // Add click listeners for toggling
            channelHeader.addEventListener('click', () => {
                channelHeader.classList.toggle('active');
                channelContent.classList.toggle('show');
            });
            channelNode.querySelectorAll('.tree-node-header').forEach(header => {
                if (header !== channelHeader) { // Avoid re-adding listener to channel header
                    header.addEventListener('click', () => {
                        header.classList.toggle('active');
                        header.nextElementSibling.classList.toggle('show');
                    });
                }
            });
        });
    }


    // --- Consultation Dashboard Rendering Functions ---

    function renderConsultationSummaryCards(data) {
        // Total consultations: count rows where Employee Code is present and Consult Time (mins) > 0 or Docs exist
        const validConsultations = data.filter(row =>
            (row['Employee Code'] || row['Med Agent']) && // Ensure there's an identifier
            (row['Consult Time (mins)'] > 0 || (row['Consult Time (mins)'] === 0 && row.Docs)) // Count if time > 0 OR time is 0 but Docs exist
        );
        // totalConsultationsAllTime.textContent = validConsultations.length; // Removed as per request

        // Total consultations today: based on the latest date in the dataset
        let latestDate = null;
        data.forEach(row => {
            if (row['Consultation Date']) {
                const consultDate = new Date(row['Consultation Date']);
                if (!isNaN(consultDate) && (!latestDate || consultDate > latestDate)) {
                    latestDate = consultDate;
                }
            }
        });

        let consultationsToday = 0;
        if (latestDate) {
            const latestDateString = latestDate.toISOString().split('T')[0]; // YYYY-MM-DD
            consultationsToday = validConsultations.filter(row =>
                row['Consultation Date'] &&
                new Date(row['Consultation Date']).toISOString().split('T')[0] === latestDateString
            ).length;
        }
        totalConsultationsToday.textContent = consultationsToday;
    }

    // Function to sort and render the detailed consultation table
    function sortAndRenderDetailedConsultationTable(data) {
        let dataToSort = [...data]; // Create a shallow copy to avoid modifying the original filteredData

        if (currentDetailedConsultationSortColumn) {
            dataToSort.sort((a, b) => {
                let valA = a[currentDetailedConsultationSortColumn];
                let valB = b[currentDetailedConsultationSortColumn];

                // Handle numeric columns
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return currentDetailedConsultationSortDirection === 'asc' ? valA - valB : valB - valA;
                }
                // Handle string columns
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return currentDetailedConsultationSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return 0; // No change if types are mixed or uncomparable
            });
        }
        renderDetailedConsultationRecords(dataToSort, universalSearchBar.value); // Pass the sorted data to the renderer
    }


    function renderDetailedConsultationRecords(data, searchTerm = '') {
        detailedConsultationTableBody.innerHTML = '';

        const filteredData = searchTerm ? data.filter(row => {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            return (row.Product && row.Product.toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Region Name'] && row['Region Name'].toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Branch Name'] && row['Branch Name'].toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Med Agent'] && row['Med Agent'].toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Employee Code'] && String(row['Employee Code']).toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row.Docs && row.Docs.toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Consult Time (mins)'] && String(row['Consult Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Total Doc Time (mins)'] && String(row['Total Doc Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm)) ||
                   (row['Total Hold Time (mins)'] && String(row['Total Hold Time (mins)']).toLowerCase().includes(lowerCaseSearchTerm));
        }) : data;


        if (filteredData.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" style="text-align: center; color: #777;">No data available or matches your search.</td>`;
            detailedConsultationTableBody.appendChild(tr);
            return;
        }

        filteredData.forEach(row => {
            const tr = document.createElement('tr');
            tr.classList.add('detailed-consultation-row'); // Add class for styling/selection
            tr.innerHTML = `
                <td>${row.Product || 'N/A'}</td>
                <td>${row['Region Name'] || 'N/A'}</td>
                <td>${row['Branch Name'] || 'N/A'}</td>
                <td>${row['Med Agent'] || 'N/A'}</td>
                <td>${row['Employee Code'] || 'N/A'}</td>
                <td>${row['Consult Time (mins)'] || '0'} min</td>
                <td>${row.Docs || 'N/A'}</td>
            `;

            const detailRow = document.createElement('tr');
            detailRow.innerHTML = `
                <td colspan="7">
                    <div class="detailed-row-content">
                        <p><strong>Total Doc Time (mins):</strong> ${row['Total Doc Time (mins)'] || '0'} min</p>
                        <p><strong>Total Hold Time (mins):</strong> ${row['Total Hold Time (mins)'] || '0'} min</p>
                    </div>
                </td>
            `;
            detailRow.classList.add('detailed-row-toggle'); // Class to identify the toggleable detail row

            tr.addEventListener('click', () => {
                // Toggle the visibility of the detail row
                detailRow.querySelector('.detailed-row-content').classList.toggle('show');
            });

            detailedConsultationTableBody.appendChild(tr);
            detailedConsultationTableBody.appendChild(detailRow);
        });
    }


    function renderAgentTimePivotTable(data, searchTerm = '') {
        const pivotData = {}; // { MedicalAgent: { ConsultationDate: totalTime } }
        const consultationDates = new Set();

        data.forEach(row => {
            const agent = row['Med Agent'] || 'N/A';
            const consultDate = row['Consultation Date']; // Use the parsed Consultation Date
            const time = row['Consult Time (mins)'] || 0; // Use Consult Time (mins) for daily pivot

            if (!consultDate || isNaN(new Date(consultDate))) { // Skip if date is invalid
                return;
            }
            const formattedDate = new Date(consultDate).toISOString().split('T')[0]; // YYYY-MM-DD

            if (searchTerm && !(agent.toLowerCase().includes(searchTerm.toLowerCase()) || formattedDate.toLowerCase().includes(searchTerm.toLowerCase()))) {
                return; // Skip if no match and search term exists
            }

            if (!pivotData[agent]) {
                pivotData[agent] = {};
            }
            pivotData[agent][formattedDate] = (pivotData[agent][formattedDate] || 0) + time;
            consultationDates.add(formattedDate);
        });

        const sortedAgents = Object.keys(pivotData).sort();
        const sortedConsultationDates = Array.from(consultationDates).sort();

        // Render Header
        agentTimePivotTableHead.innerHTML = '';
        let headerRow = '<tr><th>Med Agent</th>';
        sortedConsultationDates.forEach(date => {
            headerRow += `<th>${date}</th>`;
        });
        headerRow += '<th>Total</th></tr>';
        agentTimePivotTableHead.innerHTML = headerRow;

        // Render Body
        agentTimePivotTableBody.innerHTML = '';
        if (sortedAgents.length === 0) {
            agentTimePivotTableBody.innerHTML = `<tr><td colspan="${sortedConsultationDates.length + 2}" style="text-align: center; color: #777;">No data available or matches search.</td></tr>`;
            return;
        }

        sortedAgents.forEach(agent => {
            let rowHtml = `<tr><td>${agent}</td>`;
            let total = 0;
            sortedConsultationDates.forEach(date => {
                const time = pivotData[agent][date] || 0;
                rowHtml += `<td>${time}</td>`;
                total += time;
            });
            rowHtml += `<td><strong>${total} min</strong></td></tr>`;
            agentTimePivotTableBody.innerHTML += rowHtml;
        });
    }

    function renderNurseConsultationLeaderboard(data, type = 'top') {
        nurseConsultationLeaderboardTableBody.innerHTML = '';

        const agentConsultationCounts = {}; // { MedicalAgent_EmployeeCode: { agent: '...', empCode: '...', count: 0 } }

        data.forEach(row => {
            const agent = row['Med Agent'] || 'N/A';
            const employeeCode = row['Employee Code'] || 'N/A';
            const consultationTime = row['Consult Time (mins)'] || 0; // Use Consult Time (mins) for counting

            // Count a consultation if Employee Code is present and Consultation Time is positive
            if (employeeCode !== 'N/A' && (consultationTime > 0 || (consultationTime === 0 && row.Docs))) {
                const key = `${agent}-${employeeCode}`; // Use combined key for uniqueness
                if (!agentConsultationCounts[key]) {
                    agentConsultationCounts[key] = {
                        agent: agent,
                        employeeCode: employeeCode,
                        count: 0
                    };
                }
                agentConsultationCounts[key].count += 1; // Increment count for each valid consultation
            }
        });

        let sortedAgents = Object.values(agentConsultationCounts).sort((a, b) => {
            return type === 'top' ? b.count - a.count : a.count - b.count;
        });

        sortedAgents = sortedAgents.slice(0, 5); // Limit to top/bottom 5

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
            `;
            nurseConsultationLeaderboardTableBody.appendChild(tr);
        });
    }

    // Filter data for consultation leaderboard search
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
            consultationChartInstance.destroy(); // Destroy existing chart
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
            if (value !== 'N/A') { // Only count valid dimension values
                groupedData[value] = (groupedData[value] || 0) + 1; // Count occurrences
            }
        });

        // Sort data for consistent chart display
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
            type: chartType, // Use selected chart type
            data: {
                labels: labels,
                datasets: [{
                    label: `Number of Consultations by ${dimension}`,
                    data: counts,
                    backgroundColor: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? [ // Different colors for circular charts
                        'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(255, 99, 71, 0.7)',
                        'rgba(60, 179, 113, 0.7)', 'rgba(218, 112, 214, 0.7)', 'rgba(255, 140, 0, 0.7)'
                    ] : 'rgba(37, 117, 252, 0.7)', // Blue for bar/line
                    borderColor: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? [
                        'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)', 'rgba(83, 102, 255, 1)', 'rgba(255, 99, 71, 1)',
                        'rgba(60, 179, 113, 1)', 'rgba(218, 112, 214, 1)', 'rgba(255, 140, 0, 1)'
                    ] : 'rgba(37, 117, 252, 1)',
                    borderWidth: 1,
                    fill: chartType === 'line' ? false : true // No fill for line chart
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea' ? {} : { // No scales for circular charts
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
                                if (context.parsed.y !== undefined) { // For bar/line
                                    label += context.parsed.y;
                                } else if (context.parsed) { // For pie/doughnut/polarArea
                                    label += context.parsed.toFixed(0); // Display as integer
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

    // Render expanded chart in the modal
    function renderExpandedChart(chartData, chartType) {
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
        }

        const ctx = expandedConsultationChartCanvas.getContext('2d');
        expandedChartInstance = new Chart(ctx, {
            type: chartType,
            data: chartData, // Use the data directly from the main chart
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
                            text: consultationChartDimension.value // Use the current dimension
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

    // Generic function to filter table data based on multiple columns
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

    // Function to download table data as CSV
    function downloadTableAsCsv(tableElement, filename) {
        let csv = [];
        const rows = tableElement.querySelectorAll('tr');

        // Get headers
        const headerCells = rows[0].querySelectorAll('th');
        const headers = Array.from(headerCells).map(th => th.innerText.trim());
        csv.push(headers.join(','));

        // Get data rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Skip the detailed content rows for direct CSV download from main table
            if (row.classList.contains('detailed-row-toggle')) {
                continue;
            }

            const rowData = [];
            const cols = row.querySelectorAll('td');
            for (let j = 0; j < cols.length; j++) {
                let cellData = cols[j].innerText.trim();
                // Handle links: extract the text content only
                if (cols[j].querySelector('a')) {
                    cellData = cols[j].querySelector('a').innerText.trim();
                }
                // Escape commas and newlines in cell data
                if (cellData.includes(',') || cellData.includes('\n')) {
                    cellData = `"${cellData.replace(/"/g, '""')}"`; // Double quotes and wrap in quotes
                }
                rowData.push(cellData);
            }
            csv.push(rowData.join(','));
        }

        const csvString = csv.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

        // Create a link element and trigger a download
        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection for download attribute
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Clean up
        } else {
            // Fallback for browsers that don't support download attribute
            alert('Your browser does not support downloading files directly. Please copy the data manually.');
            window.open('data:text/csv;charset=utf-8,' + escape(csvString));
        }
    }


    // --- Initial Load ---
    // Set Nurses Dashboard as active by default
    document.querySelector('.nav-tab[data-target="nursesDashboard"]').click();

    // Optional: Auto-load default CSVs on dashboard load
    // Uncomment these blocks if you want the dashboards to load CSVs automatically
    // without requiring manual upload on every visit.
    /*
    fetch('Nurses Login Report_21-07-2025.csv')
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true, dynamicTyping: false, skipEmptyLines: true,
                complete: function(results) {
                    if (results.errors.length > 0) { console.error('Auto-load Nurses CSV Errors:', results.errors); return; }
                    nursesParsedData = results.data.map(row => ({
                        Channel: row.Channel ? String(row.Channel).trim() : '', Clinic: row.Clinic ? String(row.Clinic).trim() : '',
                        login_id: row.login_id ? String(row.login_id).trim() : '', 'login time': row['login time'] ? String(row['login time']).trim() : '',
                        'logout time': row['logout time'] ? String(row['logout time']).trim() : '', ip: row.ip ? String(row.ip).trim() : '',
                        'Lat Long': row['Lat Long'] ? String(row['Lat Long']).trim() : '',
                    }));
                    displayMessage(nursesUploadMessage, 'Default Nurses CSV loaded automatically.', 'success');
                    filterAndDisplayNursesData(nursesParsedData, universalSearchBar.value);
                }
            });
        }).catch(error => console.error('Error fetching default Nurses CSV:', error));

    // Assuming a consultation CSV named 'Consultation_Report.csv'
    fetch('Consultation_Report.csv') // Replace with your actual consultation CSV filename
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true, dynamicTyping: false, skipEmptyLines: true,
                complete: function(results) {
                    if (results.errors.length > 0) { console.error('Auto-load Consultation CSV Errors:', results.errors); return; }
                    consultationParsedData = results.data.map(row => ({
                        Product: row.Product ? String(row.Product).trim() : '',
                        'Region Name': row['Region Name'] ? String(row['Region Name']).trim() : '',
                        'Branch Name': row['Branch Name'] ? String(row['Branch Name']).trim() : '',
                        'Med Agent': row['Med Agent'] ? String(row['Med Agent']).trim() : '',
                        'Employee Code': row['Employee Code'] ? String(row['Employee Code']).trim() : '',
                        'Docs': row.Docs ? String(row.Docs).replace(/,/g, '').trim() : '',
                        'Consult Time (mins)': row['Consult Time (mins)'] ? parseFloat(row['Consult Time (mins)']) || 0 : 0,
                        'Total Doc Time (mins)': row['Total Doc Time (mins)'] ? parseFloat(row['Total Doc Time (mins)']) || 0 : 0,
                        'Total Hold Time (mins)': row['Total Hold Time (mins)'] ? parseFloat(row['Total Hold Time (mins)']) || 0 : 0,
                        'Consultation Date': row['Consultation Date'] ? String(row['Consultation Date']).trim() : '',
                    }));
                    displayMessage(consultationUploadMessage, 'Default Consultation CSV loaded automatically.', 'success');
                    // Only process and display if consultation tab is active initially, otherwise it will be processed when tab is clicked
                    if (document.getElementById('consultationDashboard').classList.contains('active')) {
                         filterAndDisplayConsultationData(consultationParsedData, universalSearchBar.value);
                    }
                }
            });
        }).catch(error => console.error('Error fetching default Consultation CSV:', error));
    */
});
