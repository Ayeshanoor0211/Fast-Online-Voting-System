const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Security Check
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Update Name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.Name;
    }

    // 2. Load Elections
    await loadActiveElections(token);
    
    // 3. Load My Vote Count [YE NAYA HAI]
    await loadMyVoteCount(user.UserID);
});

async function loadActiveElections(token) {
    try {
        const response = await fetch(`${API_URL}/elections/active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        
        const listContainer = document.getElementById('active-elections-list');
        const countElement = document.getElementById('active-count');

        if (result.elections) {
            if (countElement) countElement.textContent = result.elections.length;
            if (listContainer) listContainer.innerHTML = '';

            if (result.elections.length === 0) {
                listContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-box-open fa-3x text-muted mb-3 opacity-50"></i>
                        <h5 class="text-muted">No active elections found at the moment.</h5>
                    </div>`;
                return;
            }

            // --- RENDER CARDS ---
            for (const election of result.elections) {
                
                // CHECK REGISTRATION STATUS
                let isRegistered = false;
                try {
                    const regCheck = await fetch(`${API_URL}/elections/${election.ElectionID}/check-registration`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const regData = await regCheck.json();
                    isRegistered = regData.registered;
                } catch (err) {
                    console.error("Check registration error", err);
                }

                // DECIDE BUTTON
                let actionButton = '';
                
                if (isRegistered) {
                    actionButton = `
                        <a href="vote.html?electionId=${election.ElectionID}" class="btn btn-success rounded-pill px-4 py-2 fw-bold flex-grow-1 shadow-sm">
                            <i class="fas fa-vote-yea me-2"></i> Vote Now
                        </a>
                    `;
                } else {
                    actionButton = `
                        <button class="btn btn-primary rounded-pill px-4 py-2 fw-bold flex-grow-1 shadow-sm" onclick="registerAsVoter(${election.ElectionID})">
                            Register to Vote <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    `;
                }

                // Calculate Time
                const endDate = new Date(election.EndDate);
                const now = new Date();
                const diffTime = endDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                let timeBadge = diffTime < 0 
                    ? '<span class="badge bg-secondary">Ended</span>' 
                    : `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill"><i class="fas fa-circle fa-xs me-1"></i> LIVE NOW</span>`;

                const card = `
                    <div class="col-lg-6">
                        <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden" style="transition: all 0.3s hover:shadow-lg;">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    ${timeBadge}
                                    <small class="text-muted fw-bold">
                                        <i class="far fa-clock me-1"></i> Ends in ${diffDays} days
                                    </small>
                                </div>
                                <h4 class="card-title fw-bold text-dark mb-2">${election.Title}</h4>
                                <p class="text-muted small mb-4 text-truncate">${election.Description}</p>
                                
                                <div class="d-flex flex-wrap gap-3 mb-4 text-sm">
                                    <div class="d-flex align-items-center text-secondary bg-light px-3 py-1 rounded">
                                        <i class="fas fa-university me-2 text-primary"></i>
                                        <span>${election.CampusName}</span>
                                    </div>
                                    <div class="d-flex align-items-center text-secondary bg-light px-3 py-1 rounded">
                                        <i class="fas fa-user-tie me-2 text-primary"></i>
                                        <span>${election.PositionName}</span>
                                    </div>
                                </div>

                                <div class="d-grid gap-2 d-md-flex">
                                    ${actionButton}
                                    <button class="btn btn-outline-secondary rounded-pill px-4 py-2 fw-bold" onclick="applyAsCandidate(${election.ElectionID})">
                                        Apply Candidate
                                    </button>
                                </div>
                            </div>
                            <div class="card-footer bg-light border-0 py-2 px-4 text-center">
                                <small class="text-muted" style="font-size: 0.8rem;">
                                    <i class="fas fa-info-circle me-1"></i> Registration closes 24h before election ends
                                </small>
                            </div>
                        </div>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', card);
            }
        }
    } catch (error) {
        console.error('Error loading elections:', error);
        const listContainer = document.getElementById('active-elections-list');
        if(listContainer) listContainer.innerHTML = `<div class="col-12 text-center text-danger py-5">Failed to load elections. Check Backend.</div>`;
    }
}

// --- GET MY VOTE COUNT [YE NAYA FUNCTION HAI] ---
async function loadMyVoteCount(userId) {
    try {
        const response = await fetch(`${API_URL}/votes/count/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            const countElement = document.getElementById('my-vote-count'); // Make sure HTML mein ye ID ho
            if (countElement) {
                countElement.textContent = result.count;
            }
        }
    } catch (error) {
        console.error('Error fetching vote count:', error);
    }
}

// --- REGISTER FUNCTION ---
async function registerAsVoter(electionId) {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!confirm("Are you sure you want to register for this election?")) return;

    try {
        const response = await fetch(`${API_URL}/votes/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: user.UserID, 
                electionId: electionId 
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Success: ' + result.message);
            location.reload(); 
        } else {
            alert('⚠️ Error: ' + result.message);
        }

    } catch (error) {
        console.error(error);
        alert('Server Error. Try again later.');
    }
}

function applyAsCandidate(electionId) {
    alert(`Applying for Candidacy in Election ID: ${electionId}...\n(Backend Logic Coming Soon)`);
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}