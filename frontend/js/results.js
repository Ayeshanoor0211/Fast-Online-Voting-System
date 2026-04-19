document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('resultsContainer')) {
        loadResults();
    }
});

async function loadResults() {
    const electionSelect = document.getElementById('electionSelect');
    const container = document.getElementById('resultsContainer');
    const noResults = document.getElementById('noResults');

    try {
        const response = await fetch(`${API_URL}/elections`);
        const data = await response.json();

        if (data.success) {
            electionSelect.innerHTML = '<option value="">-- Choose an Election --</option>';
            data.elections.forEach(election => {
                const option = document.createElement('option');
                option.value = election.ElectionID;
                option.textContent = election.Title;
                electionSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading elections for results page:', error);
    }

    electionSelect.addEventListener('change', async () => {
        const electionId = electionSelect.value;
        if (!electionId) {
            container.innerHTML = '';
            container.classList.remove('show');
            noResults.style.display = 'block';
            return;
        }

        const electionTitle = electionSelect.options[electionSelect.selectedIndex].text;

        try {
            const response = await fetch(`${API_URL}/votes/results/${electionId}`);
            const data = await response.json();

            if (data.success && data.results.length > 0) {
                noResults.style.display = 'none';
                container.innerHTML = createResultsHTML(data, electionTitle);
                
                setTimeout(() => {
                    container.classList.add('show');
                    renderChart(data);
                    animateProgressBars(data);
                }, 100);
            } else {
                container.innerHTML = '';
                container.classList.remove('show');
                noResults.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading results:', error);
        }
    });
}

function createResultsHTML(data, electionTitle) {
    const { results } = data;
    const totalVotes = results.reduce((sum, candidate) => sum + candidate.TotalVotes, 0);
    const winner = results.reduce((prev, current) => (prev.TotalVotes > current.TotalVotes) ? prev : current);

    let html = `
        <div class="results-header">
            <h2>${electionTitle}</h2>
            <div class="results-stats">
                <p><strong>Total Votes Cast:</strong> ${totalVotes}</p>
                <p><strong>Winner:</strong> ${winner.Name} <span class="winner-badge"><i class="fas fa-trophy"></i> Winner</span></p>
            </div>
        </div>
        <div class="results-content">
            <div class="results-chart">
                <canvas id="resultsChart"></canvas>
            </div>
            <div class="results-table">
                <h3><i class="fas fa-list-ol"></i> Detailed Results</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Candidate</th>
                            <th>Symbol</th>
                            <th>Votes</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    results.forEach(candidate => {
        const percentage = totalVotes > 0 ? ((candidate.TotalVotes / totalVotes) * 100).toFixed(1) : 0;
        const isWinner = candidate.Name === winner.Name;
        html += `
            <tr>
                <td>${candidate.Name} ${isWinner ? '<span class="winner-badge"><i class="fas fa-crown"></i></span>' : ''}</td>
                <td>${candidate.Symbol}</td>
                <td>${candidate.TotalVotes}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
                
                <div class="vote-progress">
                    <h4 style="margin: 20px 0 15px 0; color: var(--primary);">Vote Distribution</h4>
    `;

    results.forEach((candidate, index) => {
        const percentage = totalVotes > 0 ? ((candidate.TotalVotes / totalVotes) * 100).toFixed(1) : 0;
        const colors = ['#1a365d', '#2E8B57', '#007bff', '#ffc107', '#dc3545'];
        html += `
            <div class="candidate-progress">
                <div class="candidate-info">
                    <span>${candidate.Name}</span>
                    <span>${percentage}% (${candidate.TotalVotes} votes)</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-fill" data-percentage="${percentage}" 
                         style="background: ${colors[index % colors.length]}; width: 0%"></div>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    return html;
}

function renderChart(data) {
    const { results } = data;
    const ctx = document.getElementById('resultsChart').getContext('2d');
    const candidateNames = results.map(c => c.Name);
    const votes = results.map(c => c.TotalVotes);
    const backgroundColors = ['#1a365d', '#2E8B57', '#007bff', '#ffc107', '#dc3545'];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: candidateNames,
            datasets: [{
                data: votes,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: 'Vote Distribution',
                    color: '#1a365d',
                    font: {
                        size: 16,
                        weight: '600'
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

function animateProgressBars() {
    setTimeout(() => {
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
            const percentage = bar.getAttribute('data-percentage');
            bar.style.width = percentage + '%';
        });
    }, 500);
}