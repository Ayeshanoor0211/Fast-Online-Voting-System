// Load header and footer components
document.addEventListener('DOMContentLoaded', function() {
    loadComponent('header', 'components/header.html');
    loadComponent('footer', 'components/footer.html');
});

function loadComponent(elementId, filePath) {
    fetch(filePath)
        .then(response => response.text())
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
        })
        .catch(error => console.error('Error loading component:', error));
}

// Form Validation Functions
function validateLoginForm() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!email || !password || !role) {
        showPopup('Please fill all fields', 'error');
        return false;
    }

    if (!validateEmail(email)) {
        showPopup('Please enter a valid email address', 'error');
        return false;
    }

    return true;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Popup Notification System
function showPopup(message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = `popup-notification popup-${type}`;
    popup.innerHTML = `
        <div class="popup-content">
            <i class="fas fa-${getPopupIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#popup-styles')) {
        const styles = document.createElement('style');
        styles.id = 'popup-styles';
        styles.textContent = `
            .popup-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem;
                border-radius: 5px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 1000;
                border-left: 4px solid #007bff;
                max-width: 300px;
            }
            .popup-success { border-left-color: #28a745; }
            .popup-error { border-left-color: #dc3545; }
            .popup-warning { border-left-color: #ffc107; }
            .popup-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .popup-content button {
                background: none;
                border: none;
                cursor: pointer;
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(popup);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (popup.parentElement) {
            popup.remove();
        }
    }, 5000);
}

function getPopupIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Election Countdown Timer
function startElectionCountdown(endDate, elementId) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) return;

    const countdown = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(endDate).getTime();
        const distance = end - now;

        if (distance < 0) {
            clearInterval(countdown);
            countdownElement.innerHTML = "Election Ended";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m`;
    }, 1000);
}
// ================= ELECTION INTERACTION HANDLERS =================
// Add this code to your existing script.js file

// Handle election button clicks
document.addEventListener('DOMContentLoaded', function() {
    // Handle vote buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('vote-btn')) {
            const electionId = e.target.getAttribute('data-election-id');
            voteElection(electionId);
        }
        
        if (e.target.classList.contains('view-candidates-btn')) {
            const electionId = e.target.getAttribute('data-election-id');
            viewCandidates(electionId);
        }
    });
});

// Vote Election Function
function voteElection(electionId) {
    console.log('Voting for election:', electionId);
    showPopup(`Redirecting to voting for election ${electionId}`, 'info');
    
    // Redirect to voting page with election ID
    setTimeout(() => {
        window.location.href = `pages/elections.html?election=${encodeURIComponent(electionId)}`;
    }, 1000);
}

// View Candidates Function
function viewCandidates(electionId) {
    console.log('Viewing candidates for election:', electionId);
    showPopup(`Loading candidates for election ${electionId}`, 'info');
    
    // Redirect to candidates page with election ID
    setTimeout(() => {
        window.location.href = `pages/candidates.html?election=${encodeURIComponent(electionId)}`;
    }, 1000);
}

// Get election ID from URL parameters
function getElectionIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('election');
}

// Utility function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}