const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is Admin
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.Role !== 'Admin') {
        alert('Unauthorized! Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    loadCampuses();

    // --- CREATE ELECTION FORM HANDLER ---
    document.getElementById('createElectionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Format data for Backend
        data.CampusID = parseInt(data.CampusID);
        data.PositionID = parseInt(data.PositionID);
        // SQL expects 'IsActive' bit, default true set in DB but good to be explicit if needed

        try {
            const response = await fetch(`${API_URL}/elections/create`, { // Backend route assumed
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Secure route
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Election Created Successfully! 🎉');
                e.target.reset();
            } else {
                alert('Error: ' + (result.message || 'Failed to create election'));
            }
        } catch (error) {
            console.error(error);
            alert('Server Error. Check console.');
        }
    });
});

// --- LOAD CAMPUSES (From Register Logic) ---
function loadCampuses() {
    const campusSelect = document.getElementById('campusSelect');
    // Hardcoded to match SQL DB IDs
    const campuses = [
        { id: 1, name: 'FAST Islamabad' },
        { id: 2, name: 'FAST Lahore' },
        { id: 3, name: 'FAST Karachi' },
        { id: 4, name: 'FAST Peshawar' },
        { id: 5, name: 'FAST Faisalabad' },
        { id: 6, name: 'FAST Multan' }
    ];

    campusSelect.innerHTML = '<option value="">Select Campus</option>';
    campuses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        campusSelect.appendChild(opt);
    });
}

// --- LOGOUT FUNCTION ---
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// --- TAB SWITCHING LOGIC ---
function showSection(sectionId) {
    // Hide all
    document.getElementById('create-election-section').style.display = 'none';
    document.getElementById('manage-voters-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';

    // Show Selected
    if(sectionId === 'create-election') document.getElementById('create-election-section').style.display = 'block';
    if(sectionId === 'manage-voters') document.getElementById('manage-voters-section').style.display = 'block';
    if(sectionId === 'results') document.getElementById('results-section').style.display = 'block';
}