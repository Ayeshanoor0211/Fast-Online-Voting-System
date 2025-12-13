document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.elections-grid')) {
        loadElections();
    }
});

async function loadElections() {
    const electionsGrid = document.querySelector('.elections-grid');
    if (!electionsGrid) return;

    try {
        const response = await fetch(`${API_URL}/elections`);
        const data = await response.json();

        if (data.success) {
            electionsGrid.innerHTML = ''; // Clear existing content
            data.elections.forEach(election => {
                const electionCard = document.createElement('div');
                electionCard.className = 'election-card';

                const now = new Date();
                const startDate = new Date(election.StartDate);
                const endDate = new Date(election.EndDate);
                let status = 'upcoming';
                let statusText = 'Upcoming';
                if (now >= startDate && now <= endDate) {
                    status = 'live';
                    statusText = 'Live';
                } else if (now > endDate) {
                    status = 'ended';
                    statusText = 'Ended';
                }

                electionCard.innerHTML = `
                    <div class="election-header">
                        <h3>${election.Title}</h3>
                        <span class="status-badge ${status}">${statusText}</span>
                    </div>
                    <p class="election-desc">${election.Description}</p>
                    
                    <div class="election-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <span class="progress-text">0% Participation</span>
                    </div>

                    <div class="election-meta">
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${election.PositionName}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Ends: ${formatDate(election.EndDate)}</span>
                        </div>
                    </div>

                    <div class="election-actions">
                        <button class="btn-outline" onclick="location.href='pages/elections.html?election=${election.ElectionID}'">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn-primary" onclick="location.href='pages/elections.html?election=${election.ElectionID}'" ${status !== 'live' ? 'disabled' : ''}>
                            <i class="fas fa-vote-yea"></i> ${status === 'live' ? 'Vote Now' : 'View'}
                        </button>
                    </div>
                `;
                electionsGrid.appendChild(electionCard);
            });
        }
    } catch (error) {
        console.error('Error loading elections:', error);
    }
}