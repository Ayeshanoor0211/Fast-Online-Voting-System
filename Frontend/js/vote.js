const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));
const urlParams = new URLSearchParams(window.location.search);
const electionId = urlParams.get('electionId');

let selectedCandidateId = null;
let voterToken = null; // Store the voter token here

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Basic security and validation
    if (!token || !user) {
        alert("Please login first!");
        window.location.href = 'login.html';
        return;
    }
    if (!electionId) {
        alert('Invalid Election Link!');
        window.location.href = 'dashboard_student.html';
        return;
    }

    // 2. Verify voter eligibility and get token
    const isEligible = await checkVoterEligibility();
    if (isEligible) {
        // 3. Load election details and candidates
        await loadElectionData();
    }
});

async function checkVoterEligibility() {
    try {
        const response = await fetch(`${API_URL}/elections/${electionId}/check-registration`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok || !data.registered || data.registration.Status !== 'Approved') {
            document.getElementById('candidates-container').innerHTML = `
                <div class="col-12 text-center text-danger">
                    <h3>Access Denied</h3>
                    <p>You are not approved to vote in this election. Status: ${data.registration?.Status || 'Not Registered'}</p>
                    <a href="dashboard_student.html">Go Back</a>
                </div>`;
            document.getElementById('submit-vote-btn').style.display = 'none';
            document.getElementById('election-title').textContent = 'Access Denied';
            document.getElementById('election-desc').textContent = '';
            return false;
        }
        
        // Store the voter token
        voterToken = data.registration.VoterToken;
        return true;

    } catch (error) {
        console.error('Error checking voter eligibility:', error);
        alert('Could not verify your voting status.');
        return false;
    }
}

async function loadElectionData() {
    try {
        const response = await fetch(`${API_URL}/elections/${electionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load election data.');

        // Populate header
        document.getElementById('election-title').textContent = data.election.Title;
        document.getElementById('election-desc').textContent = data.election.Description;

        // Populate candidates
        const container = document.getElementById('candidates-container');
        container.innerHTML = '';
        if (data.candidates.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No candidates are running in this election.</p>';
            return;
        }

        data.candidates.forEach(candidate => {
            const cardHtml = `
                <div class="col-md-4 col-lg-3">
                    <div class="card candidate-card h-100 p-3 text-center" onclick="selectCandidate(this, ${candidate.CandidateID})">
                        <img src="../assets/default-avatar.jpg" alt="${candidate.Name}" class="candidate-img mb-3">
                        <h5 class="fw-bold mb-1">${candidate.Name}</h5>
                        <p class="text-muted small">${candidate.Manifesto || 'No manifesto provided.'}</p>
                        <div class="selection-indicator text-success fs-2" style="opacity: 0;"><i class="fas fa-check-circle"></i></div>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });

    } catch (error) {
        console.error('Error loading election data:', error);
        document.getElementById('candidates-container').innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
    }
}

function selectCandidate(cardElement, candidateId) {
    document.querySelectorAll('.candidate-card').forEach(card => card.classList.remove('selected'));
    cardElement.classList.add('selected');
    selectedCandidateId = candidateId;

    const btn = document.getElementById('submit-vote-btn');
    btn.classList.remove('disabled');
}

async function submitVote() {
    if (!selectedCandidateId) {
        alert("Please select a candidate before casting your vote.");
        return;
    }
    if (!voterToken) {
        alert("Your voter token is missing. Please refresh the page.");
        return;
    }
    if (!confirm("Are you sure? This action is final and cannot be undone.")) return;

    const btn = document.getElementById('submit-vote-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/votes/${electionId}/cast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                candidateId: selectedCandidateId,
                voterToken: voterToken
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
        
        alert('🎉 Your vote has been cast successfully!');
        window.location.href = 'dashboard_student.html';

    } catch (error) {
        console.error('Error submitting vote:', error);
        alert(`Vote failed: ${error.message}`);
        btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Cast My Vote';
        btn.disabled = false;
    }
}
