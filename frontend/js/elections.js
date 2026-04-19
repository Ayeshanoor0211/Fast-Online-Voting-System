document.addEventListener('DOMContentLoaded', function() {
    let allElections = [];

    const electionsGrid = document.querySelector('.elections-grid');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const searchInput = document.querySelector('.search-box input');
    const sortSelect = document.getElementById('sort-elections');
    const votingModal = document.getElementById('votingModal');
    const closeModal = document.querySelector('.close-modal');
    const closeModalBtn = document.getElementById('closeModal');

    async function loadElections() {
        try {
            const response = await fetch(`${API_URL}/elections`);
            const data = await response.json();

            if (data.success) {
                allElections = data.elections;
                renderElections(allElections);
            }
        } catch (error) {
            console.error('Error loading elections:', error);
        }
    }

    function renderElections(elections) {
        electionsGrid.innerHTML = '';
        if (elections.length === 0) {
            electionsGrid.innerHTML = '<p>No elections found.</p>';
            return;
        }

        elections.forEach(election => {
            const electionCard = createElectionCard(election);
            electionsGrid.appendChild(electionCard);
        });
    }

    function createElectionCard(election) {
        const electionCard = document.createElement('div');
        electionCard.className = 'election-card';
        const now = new Date();
        const startDate = new Date(election.StartDate);
        const endDate = new Date(election.EndDate);
        let status = 'upcoming';
        let statusText = 'Upcoming';
        let participation = Math.random() * 100; // Placeholder

        if (now >= startDate && now <= endDate) {
            status = 'live';
            statusText = 'Live';
        } else if (now > endDate) {
            status = 'ended';
            statusText = 'Ended';
        }
        
        let voteButton = '';
        if (status === 'live') {
            voteButton = `<button class="btn-card btn-vote" data-election-id="${election.ElectionID}">Vote Now</button>`;
        } else if (status === 'ended') {
            voteButton = `<button class="btn-card btn-results" onclick="location.href='results.html?election=${election.ElectionID}'">View Results</button>`;
        } else {
            voteButton = `<button class="btn-card btn-details" disabled>Upcoming</button>`;
        }


        electionCard.innerHTML = `
            <div class="card-header">
                <h3 class="election-title">${election.Title}</h3>
                <p class="election-description">${election.CampusName}</p>
                <span class="status-badge status-${status}">${statusText}</span>
            </div>
            <div class="card-body">
                <div class="election-info">
                    <div class="info-item"><i class="fas fa-sitemap"></i> ${election.PositionName}</div>
                    <div class="info-item"><i class="fas fa-calendar-check"></i> Starts: ${formatDate(election.StartDate)}</div>
                    <div class="info-item"><i class="fas fa-calendar-times"></i> Ends: ${formatDate(election.EndDate)}</div>
                </div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Participation</span>
                        <span>${participation.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${participation.toFixed(0)}%;"></div>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                ${voteButton}
                <button class="btn-card btn-details" onclick="location.href='candidates.html?election=${election.ElectionID}'">View Candidates</button>
            </div>
        `;
        return electionCard;
    }

    function filterAndSortElections() {
        let filteredElections = [...allElections];
        const activeFilter = document.querySelector('.filter-tab.active').dataset.filter;
        const searchTerm = searchInput.value.toLowerCase();

        // Filter
        if (activeFilter === 'active') {
            filteredElections = filteredElections.filter(e => new Date(e.StartDate) <= new Date() && new Date(e.EndDate) >= new Date());
        } else if (activeFilter === 'upcoming') {
            filteredElections = filteredElections.filter(e => new Date(e.StartDate) > new Date());
        } else if (activeFilter === 'past') {
            filteredElections = filteredElections.filter(e => new Date(e.EndDate) < new Date());
        }

        // Search
        if (searchTerm) {
            filteredElections = filteredElections.filter(e => e.Title.toLowerCase().includes(searchTerm) || e.PositionName.toLowerCase().includes(searchTerm));
        }

        // Sort
        const sortBy = sortSelect.value;
        if (sortBy === 'name') {
            filteredElections.sort((a, b) => a.Title.localeCompare(b.Title));
        } else if (sortBy === 'participation') {
            // Placeholder for participation sort
            filteredElections.sort((a, b) => (Math.random() - 0.5));
        } else { // date
            filteredElections.sort((a, b) => new Date(b.StartDate) - new Date(a.StartDate));
        }

        renderElections(filteredElections);
    }
    
    // Event Listeners
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterAndSortElections();
        });
    });

    searchInput.addEventListener('input', filterAndSortElections);
    sortSelect.addEventListener('change', filterAndSortElections);
    
    electionsGrid.addEventListener('click', async function(e) {
        if (e.target.classList.contains('btn-vote')) {
            const electionId = e.target.dataset.electionId;
            openVotingModal(electionId);
        }
    });

    closeModal.addEventListener('click', () => votingModal.classList.remove('show'));
    closeModalBtn.addEventListener('click', () => votingModal.classList.remove('show'));
    
    async function openVotingModal(electionId) {
        const election = allElections.find(e => e.ElectionID == electionId);
        document.getElementById('electionTitle').textContent = election.Title;
        const candidateList = document.querySelector('.candidate-list');
        candidateList.innerHTML = 'Loading candidates...';
        
        try {
            const response = await fetch(`${API_URL}/elections/${electionId}`);
            const data = await response.json();

            if (data.success) {
                candidateList.innerHTML = '';
                data.candidates.forEach(candidate => {
                    const candidateCard = document.createElement('div');
                    candidateCard.className = 'candidate-card';
                    candidateCard.innerHTML = `
                        <div class="candidate-img"><i class="fas fa-user"></i></div>
                        <div class="candidate-info">
                            <div class="candidate-name">${candidate.Name}</div>
                        </div>
                        <button class="vote-btn" data-candidate-id="${candidate.CandidateID}" data-election-id="${election.ElectionID}">Vote</button>
                    `;
                    candidateList.appendChild(candidateCard);
                });
            }
        } catch (error) {
            console.error('Error loading candidates:', error);
            candidateList.innerHTML = 'Error loading candidates.';
        }
        
        votingModal.classList.add('show');
    }

    document.querySelector('.candidate-list').addEventListener('click', async function(e) {
        if (e.target.classList.contains('vote-btn')) {
            const candidateId = e.target.dataset.candidateId;
            const electionId = e.target.dataset.electionId;
            
            try {
                const response = await fetch(`${API_URL}/votes/cast`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ electionId, candidateId })
                });

                const result = await response.json();
                if (response.ok) {
                    alert('Vote cast successfully!');
                    votingModal.classList.remove('show');
                } else {
                    alert(result.error || 'Failed to cast vote.');
                }
            } catch (error) {
                console.error('Error casting vote:', error);
                alert('An error occurred while casting your vote.');
            }
        }
    });

    loadElections();
});
