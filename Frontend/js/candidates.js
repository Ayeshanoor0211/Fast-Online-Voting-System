document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('candidatesContainer')) {
        loadCandidatesAndElectionInfo();
    }
});

async function loadCandidatesAndElectionInfo() {
    const electionId = getElectionIdFromURL();
    if (!electionId) {
        document.getElementById('electionTitle').textContent = "No Election Selected";
        document.getElementById('electionDescription').textContent = "Please select an election to see the candidates.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/elections/${electionId}`);
        const data = await response.json();

        if (data.success) {
            const { election, candidates } = data;

            // Populate election info
            document.getElementById('electionTitle').textContent = election.Title;
            document.getElementById('electionDescription').textContent = election.Description;
            const now = new Date();
            const startDate = new Date(election.StartDate);
            const endDate = new Date(election.EndDate);
            let status = 'upcoming';
            if (now >= startDate && now <= endDate) {
                status = 'active';
            } else if (now > endDate) {
                status = 'ended';
            }
            document.getElementById('electionStatus').textContent = status;
            document.getElementById('electionStatus').className = `election-status status-${status}`;
            document.getElementById('electionDates').textContent = `${formatDate(election.StartDate)} - ${formatDate(election.EndDate)}`;

            // Populate candidates
            const container = document.getElementById('candidatesContainer');
            const noCandidates = document.getElementById('noCandidates');
            container.innerHTML = '';

            if (candidates.length === 0) {
                noCandidates.style.display = 'block';
                return;
            }

            noCandidates.style.display = 'none';

            candidates.forEach(candidate => {
                const candidateCard = createCandidateCard(candidate);
                container.appendChild(candidateCard);
            });
        }
    } catch (error) {
        console.error('Error loading candidates and election info:', error);
    }
}

function createCandidateCard(candidate) {
    const card = document.createElement('div');
    card.className = 'candidate-card';

    card.innerHTML = `
        <div class="candidate-image">
            <img src="../assets/default-avatar.jpg" 
                alt="${candidate.Name}" 
                onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDAzMzY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+${candidate.Name.split(' ')[0].charAt(0)}${candidate.Name.split(' ')[1] ? candidate.Name.split(' ')[1].charAt(0) : ''}</dGV4dD48L3N2Zz4='">
        </div>
        <div class="candidate-info">
            <h3>${candidate.Name}</h3>
            <p class="candidate-email">${candidate.Email}</p>
            <div class="candidate-symbol">
                <strong>Symbol:</strong> ${candidate.Symbol}
            </div>
            <div class="candidate-manifesto">
                <h4><i class="fas fa-bullhorn"></i> Manifesto</h4>
                <p>${candidate.Manifesto}</p>
            </div>
        </div>
    `;

    return card;
}

// Get election ID from URL parameters
function getElectionIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('election');
}