const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const roleSelect = document.getElementById('role');
    const campusSelect = document.getElementById('campusId');
    const departmentSelect = document.getElementById('departmentId');
    const registerForm = document.getElementById('register-form');
    
    // --- INITIALIZE PAGE ---
    initializeRegistrationPage();

    // --- EVENT LISTENERS ---
    roleSelect.addEventListener('change', handleRoleChange);
    campusSelect.addEventListener('change', handleCampusChange);
    registerForm.addEventListener('submit', handleRegistrationSubmit);
});


// --- INITIALIZATION ---

async function initializeRegistrationPage() {
    await populateCampuses();
    handleRoleChange(); // Set initial role-specific field visibility
}

async function populateCampuses() {
    const campusSelect = document.getElementById('campusId');
    const campusStatus = document.getElementById('campusStatus');
    campusStatus.textContent = 'Loading campuses...';
    try {
        const response = await fetch(`${API_URL}/elections/campuses`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load campuses.');

        campusSelect.innerHTML = '<option value="">Select Campus</option>';
        data.campuses.forEach(campus => {
            campusSelect.add(new Option(campus.CampusName, campus.CampusID));
        });
        campusStatus.textContent = '';
    } catch (error) {
        console.error('Error populating campuses:', error);
        campusStatus.textContent = 'Could not load campuses.';
        campusStatus.className = 'status-message status-error';
    }
}

async function populateDepartments(campusId) {
    const departmentSelect = document.getElementById('departmentId');
    const departmentStatus = document.getElementById('departmentStatus');
    
    departmentSelect.innerHTML = '<option value="">Select Department</option>';
    departmentSelect.disabled = true;
    departmentStatus.textContent = 'Loading departments...';

    try {
        const response = await fetch(`${API_URL}/elections/campuses/${campusId}/departments`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load departments.');

        data.departments.forEach(dept => {
            departmentSelect.add(new Option(dept.DeptName, dept.DepartmentID));
        });
        departmentSelect.disabled = false;
        departmentStatus.textContent = '';
    } catch (error) {
        console.error('Error populating departments:', error);
        departmentStatus.textContent = 'Could not load departments.';
        departmentStatus.className = 'status-message status-error';
    }
}


// --- EVENT HANDLERS ---

function handleRoleChange() {
    const selectedRole = document.getElementById('role').value;
    document.querySelectorAll('.role-specific-fields').forEach(field => {
        field.style.display = 'none';
    });

    const section = document.getElementById(`${selectedRole.toLowerCase()}-details`);
    if (section) {
        section.style.display = 'block';
    }
}

function handleCampusChange() {
    const campusId = document.getElementById('campusId').value;
    if (campusId) {
        populateDepartments(campusId);
    } else {
        const departmentSelect = document.getElementById('departmentId');
        departmentSelect.innerHTML = '<option value="">Select Department</option>';
        departmentSelect.disabled = true;
    }
}

async function handleRegistrationSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Clean and prepare data
    for (const key in data) {
        if (data[key] === '') delete data[key];
    }
    if (data.campusId) data.campusId = parseInt(data.campusId);
    if (data.departmentId) data.departmentId = parseInt(data.departmentId);

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unknown registration error.');

        alert('Registration successful! Please log in.');
        window.location.href = 'login.html';

    } catch (error) {
        console.error('Registration Submit Error:', error);
        alert(`Registration failed: ${error.message}`);
    }
}
