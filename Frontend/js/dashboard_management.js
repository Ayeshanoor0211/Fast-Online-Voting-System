const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

document.addEventListener('DOMContentLoaded', () => {
    // 1. Security and Authentication Check
    if (!token || !user || user.Role !== 'Management') {
        alert('Unauthorized access. Redirecting...');
        window.location.href = 'login.html';
        return;
    }

    // 2. Personalize UI
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.Name || 'Management';
    }

    // 3. Load dynamic data
    loadActiveElections();
});

async function loadActiveElections() {
    const listContainer = document.getElementById('active-elections-list');
    const countElement = document.getElementById('active-count');

    try {
        const response = await fetch(`${API_URL}/elections/active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch elections.');

        const data = await response.json();

        // Management can see all elections
        const managementElections = data.elections || [];

        if (countElement) countElement.textContent = managementElections.length;
        listContainer.innerHTML = ''; // Clear spinner

        if (managementElections.length === 0) {
            listContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No active elections at the moment.</h5>
                </div>`;
            return;
        }

        for (const election of managementElections) {
            const card = await createElectionCard(election);
            listContainer.insertAdjacentHTML('beforeend', card);
        }

    } catch (error) {
        console.error('Error loading active elections:', error);
        listContainer.innerHTML = `<div class="col-12 text-center text-danger py-5">Could not load elections.</div>`;
    }
}

async function createElectionCard(election) {
    const registration = await checkRegistrationStatus(election.ElectionID);
    const voteStatus = await checkVoteStatus(election.ElectionID);

    const endDate = new Date(election.EndDate);
    const endsInDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    let actionButton;
    let voteInfo = '';

    if (voteStatus.hasVoted) {
        actionButton = `<button class="btn btn-success rounded-pill px-4 py-2 fw-bold flex-grow-1" disabled><i class="fas fa-check-circle"></i> Already Voted</button>`;
        voteInfo = `
            <div class="alert alert-success mt-3 mb-0" role="alert">
                <strong><i class="fas fa-vote-yea"></i> You voted for:</strong> ${voteStatus.votedFor.candidateName}
                ${voteStatus.votedFor.symbol ? `<br><small>Symbol: ${voteStatus.votedFor.symbol}</small>` : ''}
                <br><small class="text-muted">Voted on: ${new Date(voteStatus.votedFor.votedAt).toLocaleString()}</small>
            </div>
        `;
    } else if (registration.registered) {
        if (registration.status === 'Approved') {
            actionButton = `<a href="vote.html?electionId=${election.ElectionID}" class="btn btn-success rounded-pill px-4 py-2 fw-bold flex-grow-1">Vote Now</a>`;
        } else {
            actionButton = `<button class="btn btn-warning rounded-pill px-4 py-2 fw-bold flex-grow-1" disabled>${registration.status}</button>`;
        }
    } else {
        actionButton = `<button class="btn btn-success rounded-pill px-4 py-2 fw-bold flex-grow-1" onclick="registerToVote(${election.ElectionID})">Register to Vote</button>`;
    }

    return `
        <div class="col-lg-6 mb-4">
            <div class="card h-100 shadow-sm border-0 rounded-3" style="border-left: 4px solid #8e24aa !important;">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-purple" style="background: linear-gradient(135deg, #8e24aa, #ba68c8);">MANAGEMENT ELECTION</span>
                        <small class="text-muted">Ends in ${endsInDays} days</small>
                    </div>
                    <h4 class="card-title fw-bold" style="color: #6a1b9a;">${election.Title}</h4>
                    <p class="card-text text-muted small">${election.Description || 'No description'}</p>
                    <div class="my-3">
                        <span class="badge bg-light text-dark me-2 p-2"><i class="fas fa-university"></i> ${election.CampusName}</span>
                        <span class="badge bg-light text-dark p-2"><i class="fas fa-user-tie"></i> ${election.PositionName}</span>
                    </div>
                    <div class="d-grid">
                        ${actionButton}
                    </div>
                    ${voteInfo}
                </div>
            </div>
        </div>`;
}

async function checkRegistrationStatus(electionId) {
    try {
        const response = await fetch(`${API_URL}/elections/${electionId}/check-registration`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return { registered: false };
        const data = await response.json();
        return { registered: data.registered, status: data.registration?.Status };
    } catch (error) {
        console.error(`Error checking registration for election ${electionId}:`, error);
        return { registered: false };
    }
}

async function checkVoteStatus(electionId) {
    try {
        const response = await fetch(`${API_URL}/votes/${electionId}/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return { hasVoted: false };
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error checking vote status for election ${electionId}:`, error);
        return { hasVoted: false };
    }
}

async function registerToVote(electionId) {
    if (!confirm('Are you sure you want to register to vote in this election?')) return;

    try {
        const response = await fetch(`${API_URL}/elections/${electionId}/register-voter`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to register.');

        alert('Registration successful! Your registration is now pending approval.');
        location.reload();

    } catch (error) {
        console.error(`Error registering for election ${electionId}:`, error);
        alert(`Registration failed: ${error.message}`);
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
