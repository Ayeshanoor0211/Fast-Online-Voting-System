document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role !== 'Faculty') {
        window.location.href = 'login.html'; // Redirect to login or unauthorized page
        return;
    }

    // Populate user info
    document.getElementById('facultyName').textContent = user.Name;

    loadFacultyDashboard(user);
});

async function loadFacultyDashboard(user) {
    try {
        const response = await fetch(`${API_URL}/users/dashboard`, { // Assuming a generic dashboard endpoint for faculty
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const { elections, voteHistory } = data.dashboard;

            // Populate stats (adjust as needed for faculty-specific stats)
            // For now, using similar stats as student dashboard
            const activeElections = elections.filter(e => new Date(e.EndDate) > new Date());
            const votedCount = voteHistory.length; // Faculty might not vote in student elections
            const pendingElections = elections.filter(e => e.RegistrationStatus === 'Pending').length;
            const upcomingElections = elections.filter(e => new Date(e.StartDate) > new Date()).length;

            document.getElementById('activeElections').textContent = activeElections.length;
            document.getElementById('votedCount').textContent = votedCount; // This might need adjustment for faculty
            document.getElementById('pendingElections').textContent = pendingElections;
            document.getElementById('upcomingElections').textContent = upcomingElections;
            
            // Populate active elections
            const activeElectionsGrid = document.getElementById('activeElectionsGrid');
            activeElectionsGrid.innerHTML = '';
            activeElections.forEach(election => {
                const electionCard = createElectionCard(election, user.Role);
                activeElectionsGrid.appendChild(electionCard);
            });

            // Populate upcoming elections
            const upcomingElectionsGrid = document.getElementById('upcomingElectionsGrid');
            upcomingElectionsGrid.innerHTML = '';
            upcomingElections.forEach(election => {
                const electionCard = createElectionCard(election, user.Role, true);
                upcomingElectionsGrid.appendChild(electionCard);
            });

            // Populate vote history (if faculty participate in any elections)
            const votingHistory = document.querySelector('.voting-history');
            if (votingHistory) { // Check if the element exists
                votingHistory.innerHTML = '';
                voteHistory.forEach(vote => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    historyItem.innerHTML = `
                        <div class="history-info">
                            <h4>${vote.Title}</h4>
                            <p>You voted for <strong>${vote.CandidateName}</strong></p>
                            <small>Voted on: ${formatDate(vote.VotedAt)}</small>
                        </div>
                        <span class="status-ended">Completed</span>
                    `;
                    votingHistory.appendChild(historyItem);
                });
            }
        }
    } catch (error) {
        console.error('Error loading faculty dashboard:', error);
    }
}

function createElectionCard(election, userRole, isUpcoming = false) {
    const electionCard = document.createElement('div');
    electionCard.className = 'election-card';
    electionCard.dataset.electionId = election.ElectionID;

    const endDate = new Date(election.EndDate);
    const timeLeft = isUpcoming ? '' : `Time Left: <span id="countdown-${election.ElectionID}"></span>`;

    let actions = '';
    // Customize actions based on faculty role or election type
    if (isUpcoming) {
        actions = `<button class="btn-secondary" disabled>Upcoming</button>`;
    } else if (election.RegistrationStatus === 'Approved') {
        actions = `
            <button class="btn-primary vote-btn" onclick="location.href='elections.html?election=${election.ElectionID}'">Vote Now</button>
            <button class="btn-secondary view-candidates-btn" onclick="location.href='candidates.html?election=${election.ElectionID}'">View Candidates</button>
        `;
    } else if (election.RegistrationStatus === 'Pending') {
        actions = `<button class="btn-secondary" disabled>Registration Pending</button>`;
    } else {
        actions = `<button class="btn-primary" onclick="registerForElection(${election.ElectionID})">Register to Vote</button>`;
    }

    electionCard.innerHTML = `
        <h3>${election.Title}</h3>
        <span class="election-status status-${isUpcoming ? 'upcoming' : 'active'}">${isUpcoming ? 'Upcoming' : 'Active'}</span>
        <p>${election.Description}</p>
        <div class="election-meta">
            <p><i class="fas fa-calendar"></i> ${isUpcoming ? 'Starts' : 'Ends'}: ${formatDate(isUpcoming ? election.StartDate : election.EndDate)}</p>
            <p><i class="fas fa-clock"></i> ${timeLeft}</p>
        </div>
        <div class="election-actions">
            ${actions}
        </div>
    `;

    if (!isUpcoming) {
        setTimeout(() => startElectionCountdown(election.EndDate, `countdown-${election.ElectionID}`), 0);
    }

    return electionCard;
}

async function registerForElection(electionId) {
    try {
        const response = await fetch(`${API_URL}/users/register-election`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ electionId })
        });
        const data = await response.json();
        if (data.success) {
            alert(data.message);
            window.location.reload();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error registering for election:', error);
        alert('An error occurred. Please try again.');
    }
}

function startElectionCountdown(endDate, elementId) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) return;

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = new Date(endDate).getTime() - now;

        if (distance < 0) {
            clearInterval(interval);
            countdownElement.textContent = 'Ended';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        countdownElement.textContent = `${days}d ${hours}h ${minutes}m`;
    }, 1000);
}