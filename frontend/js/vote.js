const API_URL = 'http://localhost:3000/api';
let selectedCandidateId = null;

// URL se Election ID nikalo
const urlParams = new URLSearchParams(window.location.search);
const electionId = urlParams.get('electionId');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Security Check
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Please login first!");
        window.location.href = 'login.html';
        return;
    }

    if (!electionId) {
        alert('Invalid Election Link!');
        window.location.href = 'dashboard_student.html';
        return;
    }

    // 2. Load Candidates
    await loadCandidates(token);
});

async function loadCandidates(token) {
    try {
        const response = await fetch(`${API_URL}/elections/${electionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Failed to load');

        // Header Update
        document.getElementById('election-title').textContent = result.election.Title;
        document.getElementById('election-desc').textContent = result.election.Description;

        // Render Candidates
        const container = document.getElementById('candidates-container');
        container.innerHTML = '';

        if (result.candidates.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No candidates found.</div>';
            return;
        }

        result.candidates.forEach(candidate => {
            const card = `
                <div class="col-md-4 col-lg-3">
                    <div class="card candidate-card h-100 p-3 text-center" onclick="selectCandidate(this, ${candidate.CandidateID})">
                        <div class="candidate-img mb-3">
                            ${candidate.Symbol ? `<i class="fas fa-${candidate.Symbol}"></i>` : '<i class="fas fa-user"></i>'}
                        </div>
                        <h5 class="fw-bold mb-1">${candidate.Name}</h5>
                        <p class="text-primary small mb-2">${result.election.PositionName}</p>
                        <div class="bg-light p-2 rounded small text-muted mb-3">
                            "${candidate.Manifesto || 'No manifesto provided.'}"
                        </div>
                        <div class="selection-indicator text-success" style="opacity: 0;">
                            <i class="fas fa-check-circle fa-2x"></i>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', card);
        });

    } catch (error) {
        console.error(error);
        alert('Error loading candidates. See console.');
    }
}

// --- CANDIDATE SELECT FUNCTION ---
function selectCandidate(cardElement, candidateId) {
    // 1. Purani selection hatao
    document.querySelectorAll('.candidate-card').forEach(el => {
        el.classList.remove('selected');
        el.querySelector('.selection-indicator').style.opacity = '0';
    });

    // 2. Nayi selection lagao
    cardElement.classList.add('selected');
    cardElement.querySelector('.selection-indicator').style.opacity = '1';
    
    // 3. ID Save karo
    selectedCandidateId = candidateId;
    console.log("Selected Candidate ID:", selectedCandidateId); // Debugging
    
    // 4. Button Enable karo
    const btn = document.getElementById('submit-vote-btn');
    btn.classList.remove('disabled');
    btn.removeAttribute('disabled'); // Just in case
}

// --- SUBMIT VOTE FUNCTION (FIXED) ---
async function submitVote() {
    console.log("Submit button clicked!"); // Check console if this appears

    if (!selectedCandidateId) {
        alert("Please select a candidate first!");
        return;
    }
    
    if (!confirm("Are you sure? You cannot change your vote later.")) return;

    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Button loading state
    const btn = document.getElementById('submit-vote-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Voting...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/votes/cast`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: user.UserID,
                electionId: electionId,
                candidateId: selectedCandidateId
            })
        });

        const result = await response.json();
        console.log("Vote Result:", result); // Backend response dekhein

        if (response.ok) {
            alert('🎉 Vote Cast Successfully!');
            window.location.href = 'dashboard_student.html';
        } else {
            alert('⚠️ Vote Failed: ' + result.message);
            btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Cast My Vote';
            btn.disabled = false;
        }

    } catch (error) {
        console.error("Voting Error:", error);
        alert('Server Error. Check Console.');
        btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Cast My Vote';
        btn.disabled = false;
    }
}