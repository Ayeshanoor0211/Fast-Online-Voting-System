const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    initializeResultsPage();
});

async function initializeResultsPage() {
    await populateElectionSelect();

    const electionSelect = document.getElementById('electionSelect');
    electionSelect.addEventListener('change', (event) => {
        const electionId = event.target.value;
        if (electionId) {
            loadElectionResults(electionId);
        } else {
            resetResultsView();
        }
    });
}

async function populateElectionSelect() {
    const selectElement = document.getElementById('electionSelect');
    try {
        // Fetch all elections (completed and active)
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/admin/elections`, {
            headers
        });
        if (!response.ok) throw new Error('Failed to load elections.');

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Could not fetch elections.');

        selectElement.innerHTML = '<option value="">-- Choose an Election --</option>';

        // Filter to show only completed elections for public viewing
        const completedElections = data.elections.filter(e => e.Status === 'Completed');

        if (completedElections.length === 0) {
            selectElement.innerHTML = '<option value="">No completed elections available</option>';
            return;
        }

        completedElections.forEach(election => {
            const optionText = `${election.Title} - ${election.CampusName} (${new Date(election.EndDate).toLocaleDateString()})`;
            selectElement.add(new Option(optionText, election.ElectionID));
        });

    } catch (error) {
        console.error('Error populating elections:', error);
        selectElement.innerHTML = '<option value="">Could not load elections</option>';
    }
}

async function loadElectionResults(electionId) {
    const container = document.getElementById('resultsContainer');
    const noResultsDiv = document.getElementById('noResults');

    try {
        // Fetch election results from admin endpoint
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/admin/elections/${electionId}/results`, {
            headers
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch results.');

        const { election, results, totalVotes, winners } = data;

        noResultsDiv.style.display = 'none';
        container.innerHTML = createResultsHTML(election, results, totalVotes, winners);

        // Render chart and animate progress bars after a short delay
        setTimeout(() => {
            container.classList.add('show');
            if (totalVotes > 0) {
                renderResultsChart(results);
                animateProgressBars();
            }
        }, 100);

    } catch (error) {
        console.error(`Error loading results for election ${electionId}:`, error);
        resetResultsView();
        alert(`Could not load results: ${error.message}`);
    }
}

function createResultsHTML(election, candidates, totalVotes, winners) {
    let tableRows = candidates.map(c => {
        const isWinner = winners && winners.some(w => w.CandidateID === c.CandidateID);
        return `
            <tr>
                <td>${c.Name} ${isWinner ? '<span class="winner-badge"><i class="fas fa-crown"></i> Winner</span>' : ''}</td>
                <td>${c.Symbol || 'N/A'}</td>
                <td>${c.VoteCount}</td>
                <td>${c.percentage}%</td>
            </tr>`;
    }).join('');

    let progressBars = candidates.map((c, index) => {
        const colors = ['#1a365d', '#2E8B57', '#007bff', '#ffc107', '#dc3545'];
        const isWinner = winners && winners.some(w => w.CandidateID === c.CandidateID);
        return `
            <div class="candidate-progress">
                <div class="candidate-info">
                    <span><strong>${c.Name}</strong> ${isWinner ? '<span class="winner-badge"><i class="fas fa-trophy"></i></span>' : ''}</span>
                    <span><strong>${c.VoteCount}</strong> votes (${c.percentage}%)</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-fill" data-percentage="${c.percentage}" style="background: ${colors[index % colors.length]}; width: 0%;"></div>
                </div>
            </div>`;
    }).join('');

    const winnerText = winners && winners.length > 0
        ? (winners.length === 1
            ? `<p><strong>Winner:</strong> ${winners[0].Name} <span class="winner-badge"><i class="fas fa-trophy"></i> Winner</span></p>`
            : `<p><strong>Tie Between:</strong> ${winners.map(w => w.Name).join(', ')} <span class="winner-badge"><i class="fas fa-trophy"></i> Tie</span></p>`)
        : '';

    return `
        <div class="results-header">
            <h2>${election.Title}</h2>
            <p class="text-muted"><i class="fas fa-university"></i> ${election.CampusName} - ${election.PositionName}</p>
            <p class="text-muted"><small>Election Period: ${new Date(election.StartDate).toLocaleDateString()} - ${new Date(election.EndDate).toLocaleDateString()}</small></p>
            <div class="results-stats">
                <p><strong>Total Votes Cast:</strong> ${totalVotes}</p>
                ${winnerText}
            </div>
        </div>
        <div class="results-content">
            <div class="results-chart">
                <canvas id="resultsChart"></canvas>
                ${totalVotes === 0 ? '<p class="text-center text-muted mt-3">No votes have been cast yet.</p>' : ''}
            </div>
            <div class="results-table">
                <h3><i class="fas fa-list-ol"></i> Detailed Breakdown</h3>
                <div class="vote-progress">${progressBars}</div>
            </div>
        </div>`;
}

function renderResultsChart(candidates) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    const labels = candidates.map(c => c.Name);
    const data = candidates.map(c => c.VoteCount);
    const backgroundColors = ['#1a365d', '#2E8B57', '#007bff', '#ffc107', '#dc3545'];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: backgroundColors, borderWidth: 2 }] },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20 } },
                title: { display: true, text: 'Vote Distribution', font: { size: 16 } }
            }
        }
    });
}

function animateProgressBars() {
    document.querySelectorAll('.progress-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-percentage') + '%';
    });
}

function resetResultsView() {
    const container = document.getElementById('resultsContainer');
    const noResultsDiv = document.getElementById('noResults');
    container.innerHTML = '';
    container.classList.remove('show');
    noResultsDiv.style.display = 'block';
}
