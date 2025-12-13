const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

document.addEventListener('DOMContentLoaded', () => {
    // Authentication and Authorization Check
    if (!token || !user || user.Role !== 'Admin') {
        alert('Unauthorized access. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    // Initial Data Load
    loadDashboardData();
    loadCampuses();
    loadPositions();
    loadAllUsers();
    loadElectionsForResults();

    // Event Listeners
    document.getElementById('createElectionForm').addEventListener('submit', handleCreateElection);
    document.getElementById('addCandidateForm').addEventListener('submit', handleAddCandidate);
});

// --- SECTION NAVIGATION ---
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // Load section-specific data
    if (sectionId === 'manage-elections') {
        loadAllElectionsTable();
    } else if (sectionId === 'audit-logs') {
        loadAuditLogs();
    } else if (sectionId === 'manage-voters') {
        loadPendingVoters();
    } else if (sectionId === 'candidate-applications') {
        loadCandidateApplications();
        populateElectionFilterDropdown();
    }
}

// --- DATA LOADING FUNCTIONS ---

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard stats.');

        const data = await response.json();

        populateStats(data.stats);
        populateActiveElections(data.activeElections);
        populatePendingRegistrations(data.pendingRegistrations);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Could not load dashboard data.');
    }
}

async function loadCampuses() {
    const campusSelect = document.getElementById('campusSelect');
    try {
        const response = await fetch(`${API_URL}/admin/campuses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        campusSelect.innerHTML = '<option value="">Select Campus</option>';
        data.campuses.forEach(c => campusSelect.add(new Option(c.CampusName, c.CampusID)));
    } catch (error) {
        console.error('Error loading campuses:', error);
        campusSelect.innerHTML = '<option value="">Failed to load</option>';
    }
}

async function loadPositions() {
    const positionSelect = document.querySelector('select[name="positionId"]');
    try {
        const response = await fetch(`${API_URL}/admin/positions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        positionSelect.innerHTML = '<option value="">Select Position</option>';
        data.positions.forEach(p => positionSelect.add(new Option(p.PositionName, p.PositionID)));
    } catch (error) {
        console.error('Error loading positions:', error);
        positionSelect.innerHTML = '<option value="">Failed to load</option>';
    }
}

async function loadAllElectionsTable() {
    try {
        const response = await fetch(`${API_URL}/admin/elections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch elections.');

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const tableBody = document.getElementById('elections-table-body');
        tableBody.innerHTML = '';

        if (data.elections.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No elections found</td></tr>';
            return;
        }

        data.elections.forEach(election => {
            const now = new Date();
            const startDate = new Date(election.StartDate);
            const endDate = new Date(election.EndDate);

            let statusBadge = '';
            if (now < startDate) {
                statusBadge = '<span class="badge bg-secondary">Upcoming</span>';
            } else if (now >= startDate && now <= endDate && election.IsActive) {
                statusBadge = '<span class="badge bg-success">Active</span>';
            } else if (now > endDate) {
                statusBadge = '<span class="badge bg-dark">Ended</span>';
            } else if (!election.IsActive) {
                statusBadge = '<span class="badge bg-danger">Inactive</span>';
            }

            const row = `
                <tr>
                    <td>${election.Title}</td>
                    <td>${election.CampusName}</td>
                    <td>${election.PositionName}</td>
                    <td>${new Date(election.StartDate).toLocaleString()}</td>
                    <td>${new Date(election.EndDate).toLocaleString()}</td>
                    <td>${statusBadge}</td>
                    <td>${election.CandidateCount}</td>
                    <td>${election.VoteCount}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="openAddCandidateModal(${election.ElectionID})">
                            <i class="bi bi-person-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="viewCandidates(${election.ElectionID})">
                            <i class="bi bi-people"></i>
                        </button>
                        <button class="btn btn-sm ${election.IsActive ? 'btn-warning' : 'btn-success'}"
                                onclick="toggleElectionStatus(${election.ElectionID}, ${!election.IsActive})">
                            <i class="bi bi-${election.IsActive ? 'pause' : 'play'}-fill"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading elections:', error);
        document.getElementById('elections-table-body').innerHTML =
            '<tr><td colspan="9" class="text-center text-danger">Error loading elections</td></tr>';
    }
}

async function loadAllUsers() {
    const userSelect = document.getElementById('userSelect');
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        userSelect.innerHTML = '<option value="">Select User</option>';
        data.users.forEach(u => userSelect.add(new Option(`${u.Name} (${u.Role} - ${u.Email})`, u.UserID)));
    } catch (error) {
        console.error('Error loading users:', error);
        userSelect.innerHTML = '<option value="">Failed to load</option>';
    }
}

async function loadElectionsForResults() {
    const resultsSelect = document.getElementById('resultsElectionSelect');
    try {
        const response = await fetch(`${API_URL}/admin/elections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        resultsSelect.innerHTML = '<option value="">Choose an election...</option>';
        data.elections.forEach(e => {
            const endDate = new Date(e.EndDate);
            const now = new Date();
            if (now > endDate) {
                resultsSelect.add(new Option(e.Title, e.ElectionID));
            }
        });
    } catch (error) {
        console.error('Error loading elections for results:', error);
    }
}

async function loadElectionResults(electionId) {
    if (!electionId) {
        document.getElementById('results-container').innerHTML = '<p class="text-muted">Select an election to view results</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/elections/${electionId}/results`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const container = document.getElementById('results-container');

        let html = `
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h5>${data.election.Title}</h5>
                    <p class="mb-0">${data.election.PositionName} - ${data.election.CampusName}</p>
                </div>
                <div class="card-body">
                    <p><strong>Total Votes Cast:</strong> ${data.totalVotes}</p>
        `;

        if (data.winners && data.winners.length > 0) {
            html += `<h6><i class="bi bi-trophy-fill text-warning"></i> Winner${data.winners.length > 1 ? 's' : ''}:</h6>`;
            data.winners.forEach(winner => {
                html += `<p class="winner-badge">${winner.Name} - ${winner.VoteCount} votes (${winner.percentage}%)</p>`;
            });
        }

        html += `
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h6>Detailed Results</h6>
                </div>
                <div class="card-body">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Candidate</th>
                                <th>Symbol</th>
                                <th>Votes</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        data.results.forEach((candidate, index) => {
            html += `
                <tr ${index === 0 ? 'class="table-success"' : ''}>
                    <td>${index + 1}</td>
                    <td>${candidate.Name}</td>
                    <td>${candidate.Symbol || 'N/A'}</td>
                    <td>${candidate.VoteCount}</td>
                    <td>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: ${candidate.percentage}%">${candidate.percentage}%</div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading election results:', error);
        document.getElementById('results-container').innerHTML =
            '<p class="text-danger">Error loading results</p>';
    }
}

async function loadAuditLogs() {
    try {
        const response = await fetch(`${API_URL}/admin/audit-logs?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const tbody = document.getElementById('audit-logs-body');
        tbody.innerHTML = '';

        if (data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No audit logs found</td></tr>';
            return;
        }

        data.logs.forEach(log => {
            tbody.innerHTML += `
                <tr>
                    <td>${new Date(log.Timestamp).toLocaleString()}</td>
                    <td>${log.UserName || 'System'}</td>
                    <td><span class="badge bg-secondary">${log.Action}</span></td>
                    <td>${log.Details}</td>
                    <td>${log.IPAddress || 'N/A'}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading audit logs:', error);
        document.getElementById('audit-logs-body').innerHTML =
            '<tr><td colspan="5" class="text-center text-danger">Error loading logs</td></tr>';
    }
}

async function loadPendingVoters() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        populatePendingRegistrations(data.pendingRegistrations);
    } catch (error) {
        console.error('Error loading pending voters:', error);
    }
}

// --- UI POPULATION FUNCTIONS ---

function populateStats(stats) {
    document.getElementById('stat-elections').textContent = stats.TotalElections || 0;
    document.getElementById('stat-users').textContent = stats.TotalUsers || 0;
    document.getElementById('stat-votes').textContent = stats.TotalVotes || 0;
    document.getElementById('stat-candidates').textContent = stats.TotalCandidates || 0;
}

function populateActiveElections(elections) {
    const container = document.getElementById('active-elections-container');

    if (elections.length === 0) {
        container.innerHTML = '<p class="text-muted">No active elections at the moment.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'table table-hover';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Title</th>
                <th>Position</th>
                <th>End Date</th>
                <th>Votes Cast</th>
                <th>Registered Voters</th>
                <th>Turnout</th>
            </tr>
        </thead>
        <tbody>
            ${elections.map(e => `
                <tr>
                    <td>${e.Title}</td>
                    <td>${e.PositionName}</td>
                    <td>${new Date(e.EndDate).toLocaleString()}</td>
                    <td>${e.VotesCast}</td>
                    <td>${e.RegisteredVoters}</td>
                    <td>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar"
                                 style="width: ${e.RegisteredVoters > 0 ? ((e.VotesCast / e.RegisteredVoters) * 100).toFixed(0) : 0}%">
                                ${e.RegisteredVoters > 0 ? ((e.VotesCast / e.RegisteredVoters) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);
}

function populatePendingRegistrations(registrations) {
    const container = document.getElementById('pending-registrations-container');
    const manageContainer = document.getElementById('manage-voters-container');

    if (registrations.length === 0) {
        const message = '<p class="text-muted">No pending voter registrations.</p>';
        container.innerHTML = message;
        if (manageContainer) manageContainer.innerHTML = message;
        return;
    }

    const table = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Election</th>
                    <th>Registered On</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${registrations.map(r => `
                    <tr id="reg-row-${r.RegistrationID}">
                        <td>${r.Name}</td>
                        <td>${r.Email}</td>
                        <td>${r.ElectionTitle}</td>
                        <td>${new Date(r.RegistrationDate).toLocaleString()}</td>
                        <td>
                            <button class="btn btn-sm btn-success" onclick="manageRegistration(${r.RegistrationID}, 'Approved')">
                                <i class="bi bi-check-circle"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="manageRegistration(${r.RegistrationID}, 'Rejected')">
                                <i class="bi bi-x-circle"></i> Reject
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = table;
    if (manageContainer) manageContainer.innerHTML = table;
}

// --- EVENT HANDLERS ---

async function handleCreateElection(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.title || !data.campusId || !data.positionId || !data.startDate || !data.endDate || !data.eligibleVoters) {
        alert('Please fill all required fields.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/create-election`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create election.');

        alert('Election Created Successfully!');
        form.reset();
        loadDashboardData();

    } catch (error) {
        console.error('Create Election Error:', error);
        alert(`Error: ${error.message}`);
    }
}

function openAddCandidateModal(electionId) {
    document.getElementById('electionId').value = electionId;
    const addCandidateModal = new bootstrap.Modal(document.getElementById('addCandidateModal'));
    addCandidateModal.show();
}

async function handleAddCandidate(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/admin/add-candidate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to add candidate.');

        alert('Candidate Added Successfully!');
        const addCandidateModal = bootstrap.Modal.getInstance(document.getElementById('addCandidateModal'));
        addCandidateModal.hide();
        form.reset();
        loadAllElectionsTable();

    } catch (error) {
        console.error('Add Candidate Error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function manageRegistration(registrationId, status) {
    let rejectionReason = '';
    if (status === 'Rejected') {
        rejectionReason = prompt('Please provide a reason for rejection:');
        if (rejectionReason === null) return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/manage-registration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ registrationId, status, rejectionReason })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update registration.');

        alert(`Registration has been ${status.toLowerCase()}.`);

        // Remove the row from both tables
        const row = document.getElementById(`reg-row-${registrationId}`);
        if (row) row.remove();

        // Reload dashboard stats
        loadDashboardData();

    } catch (error) {
        console.error('Manage Registration Error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function toggleElectionStatus(electionId, isActive) {
    const action = isActive ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this election?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/update-election-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ electionId, isActive })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        alert(result.message);
        loadAllElectionsTable();
        loadDashboardData();

    } catch (error) {
        console.error('Toggle Election Status Error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function viewCandidates(electionId) {
    try {
        const response = await fetch(`${API_URL}/admin/elections/${electionId}/candidates`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        let candidatesList = data.candidates.map(c =>
            `${c.Name} (${c.Symbol || 'No symbol'}) - ${c.VoteCount} votes`
        ).join('\n');

        if (candidatesList) {
            alert(`Candidates:\n\n${candidatesList}`);
        } else {
            alert('No candidates registered for this election.');
        }
    } catch (error) {
        console.error('View Candidates Error:', error);
        alert(`Error: ${error.message}`);
    }
}

// --- CANDIDATE APPLICATIONS MANAGEMENT ---

async function loadCandidateApplications() {
    try {
        const statusFilter = document.getElementById('applicationStatusFilter')?.value || '';
        const electionFilter = document.getElementById('applicationElectionFilter')?.value || '';

        let url = `${API_URL}/admin/candidate-applications?`;
        if (statusFilter) url += `status=${statusFilter}&`;
        if (electionFilter) url += `electionId=${electionFilter}&`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch applications');

        const data = await response.json();
        displayCandidateApplications(data.applications);

    } catch (error) {
        console.error('Load applications error:', error);
        const tbody = document.getElementById('applications-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load applications</td></tr>';
        }
    }
}

function displayCandidateApplications(applications) {
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) return;

    if (!applications || applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No applications found</td></tr>';
        return;
    }

    tbody.innerHTML = applications.map(app => {
        const statusBadge = {
            'Pending': '<span class="badge bg-warning">Pending</span>',
            'Approved': '<span class="badge bg-success">Approved</span>',
            'Rejected': '<span class="badge bg-danger">Rejected</span>'
        }[app.Status] || app.Status;

        const actions = app.Status === 'Pending' ? `
            <button class="btn btn-sm btn-success me-1" onclick="approveApplication(${app.ApplicationID})" title="Approve">
                <i class="bi bi-check-circle"></i> Approve
            </button>
            <button class="btn btn-sm btn-danger" onclick="rejectApplication(${app.ApplicationID})" title="Reject">
                <i class="bi bi-x-circle"></i> Reject
            </button>
        ` : (app.Status === 'Rejected' ?
            `<small class="text-muted">${app.RejectionReason || 'No reason provided'}</small>` :
            '<span class="text-success"><i class="bi bi-check-circle"></i> Approved</span>');

        return `
            <tr>
                <td>
                    <strong>${app.ApplicantName}</strong><br>
                    <small class="text-muted">${app.ApplicantEmail} (${app.ApplicantRole})</small>
                </td>
                <td>
                    <strong>${app.ElectionTitle}</strong><br>
                    <small class="text-muted">${app.CampusName} - ${app.PositionName}</small>
                </td>
                <td>
                    <span class="badge bg-primary">${app.Symbol}</span><br>
                    <button class="btn btn-sm btn-link p-0" onclick="viewManifesto(${app.ApplicationID}, '${app.Symbol}', \`${app.Manifesto.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                        <small>View Manifesto</small>
                    </button>
                </td>
                <td><small>${new Date(app.ApplicationDate).toLocaleString()}</small></td>
                <td>${statusBadge}</td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');
}

async function populateElectionFilterDropdown() {
    try {
        const response = await fetch(`${API_URL}/admin/elections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        const select = document.getElementById('applicationElectionFilter');

        if (!select || !data.elections) return;

        const options = data.elections.map(e =>
            `<option value="${e.ElectionID}">${e.Title}</option>`
        ).join('');

        select.innerHTML = '<option value="">All Elections</option>' + options;

    } catch (error) {
        console.error('Error loading elections for filter:', error);
    }
}

async function approveApplication(applicationId) {
    if (!confirm('Are you sure you want to approve this candidate application?\n\nThe applicant will automatically become a candidate in the election.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/review-candidate-application`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                applicationId,
                status: 'Approved'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to approve application');
        }

        alert('Application approved successfully!\n\nThe candidate has been added to the election.');
        loadCandidateApplications();

    } catch (error) {
        console.error('Approve application error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function rejectApplication(applicationId) {
    const reason = prompt('Please provide a reason for rejection:');

    if (!reason || reason.trim() === '') {
        alert('Rejection reason is required');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/review-candidate-application`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                applicationId,
                status: 'Rejected',
                rejectionReason: reason.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to reject application');
        }

        alert('Application rejected successfully.\n\nThe applicant will be notified.');
        loadCandidateApplications();

    } catch (error) {
        console.error('Reject application error:', error);
        alert(`Error: ${error.message}`);
    }
}

function viewManifesto(applicationId, symbol, manifesto) {
    const modalContent = `
        <div style="max-width: 600px;">
            <h5>Campaign Symbol: <span class="badge bg-primary">${symbol}</span></h5>
            <hr>
            <h6>Manifesto:</h6>
            <p style="white-space: pre-wrap;">${manifesto}</p>
        </div>
    `;

    // Create a temporary modal or alert
    const manifestoWindow = window.open('', 'Manifesto', 'width=700,height=500');
    if (manifestoWindow) {
        manifestoWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Candidate Manifesto</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { padding: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${modalContent}
                    <hr>
                    <button class="btn btn-secondary" onclick="window.close()">Close</button>
                </div>
            </body>
            </html>
        `);
        manifestoWindow.document.close();
    } else {
        alert(`Symbol: ${symbol}\n\nManifesto:\n${manifesto}`);
    }
}

// --- UTILITY FUNCTIONS ---

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
