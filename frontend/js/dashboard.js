// Dashboard specific functionality
function initializeDashboard() {
    console.log('Dashboard initialized');
    
    // Update user stats dynamically
    updateUserStats();
    
    // Initialize any dashboard-specific features
    initializeElectionCountdowns();
}

function updateUserStats() {
    // This would typically fetch data from an API
    console.log('Updating user statistics...');
}

function initializeElectionCountdowns() {
    // Initialize countdown timers for active elections
    const activeElections = document.querySelectorAll('.election-card[data-election-id]');
    activeElections.forEach(card => {
        const electionId = card.getAttribute('data-election-id');
        const countdownElement = card.querySelector('.countdown-timer');
        if (countdownElement) {
            // Start countdown for this election
            const endDate = countdownElement.getAttribute('data-end-date');
            if (endDate) {
                startElectionCountdown(endDate, countdownElement.id);
            }
        }
    });
}