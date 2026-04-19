// frontend/js/register.js
const API_URL = 'http://localhost:3001/api';//Backend port

document.addEventListener('DOMContentLoaded', () => {
  const roleSelect = document.getElementById('role');
  const studentDetails = document.getElementById('student-details');
  const facultyDetails = document.getElementById('faculty-details');
  const managementDetails = document.getElementById('management-details');
  const adminDetails = document.getElementById('admin-details');
  const registerForm = document.getElementById('register-form');
  
  const campusSelect = document.getElementById('campusId');
  const departmentSelect = document.getElementById('departmentId');

  // --- 1. CAMPUS DATA (IDs match your SQL Screenshot) ---
  const fastCampuses = [
      { id: 1, name: 'FAST Islamabad' },
      { id: 2, name: 'FAST Lahore' },
      { id: 3, name: 'FAST Karachi' },
      { id: 4, name: 'FAST Peshawar' },
      { id: 5, name: 'FAST Faisalabad' },
      { id: 6, name: 'FAST Multan' }
  ];

  // --- 2. DEPARTMENT TYPES ---
  // Har campus mein yehi 5 departments hain sequence mein.
  const deptTypes = [
      { name: 'Computer Science (CS)', offset: 0 },
      { name: 'Data Science (DS)', offset: 1 },
      { name: 'Electrical Eng (EE)', offset: 2 },
      { name: 'Business Admin (BBA)', offset: 3 },
      { name: 'Civil Eng (CV)', offset: 4 }
  ];

  // --- LOAD CAMPUSES ---
  function loadCampuses() {
      campusSelect.innerHTML = '<option value="">Select Campus</option>';
      fastCampuses.forEach(campus => {
          const option = document.createElement('option');
          option.value = campus.id;
          option.textContent = campus.name;
          campusSelect.appendChild(option);
      });
  }

  // --- LOAD DEPARTMENTS DYNAMICALLY ---
  campusSelect.addEventListener('change', () => {
      const campusId = parseInt(campusSelect.value);
      departmentSelect.innerHTML = '<option value="">Select Department</option>';
      
      if (campusId) {
          departmentSelect.disabled = false;
          
          // --- FORMULA TO MATCH SQL IDs ---
          // Screenshot mein Multan (ID 6) ka CS Dept ID 26 hai.
          // Formula: (CampusID - 1) * 5 + 1
          // (6 - 1) * 5 + 1 = 25 + 1 = 26. (Perfect Match!)
          
          const startId = (campusId - 1) * 5 + 1;

          deptTypes.forEach((dept) => {
              const option = document.createElement('option');
              // Calculate correct SQL ID
              option.value = startId + dept.offset; 
              option.textContent = dept.name;
              departmentSelect.appendChild(option);
          });
      } else {
          departmentSelect.disabled = true;
      }
  });

  // Load campuses initially
  loadCampuses();

  // --- ROLE SELECTION LOGIC ---
  roleSelect.addEventListener('change', () => {
    // Hide all first
    studentDetails.style.display = 'none';
    facultyDetails.style.display = 'none';
    managementDetails.style.display = 'none';
    adminDetails.style.display = 'none';

    const selectedRole = roleSelect.value;
    if (selectedRole === 'Student') studentDetails.style.display = 'block';
    else if (selectedRole === 'Faculty') facultyDetails.style.display = 'block';
    else if (selectedRole === 'Management') managementDetails.style.display = 'block';
    else if (selectedRole === 'Admin') adminDetails.style.display = 'block';
  });

  // --- SUBMIT FORM ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());

    // Clean empty fields
    for (const key in data) {
      if (data[key] === '') delete data[key];
    }

    // Ensure IDs are numbers
    if (data.campusId) data.campusId = parseInt(data.campusId);
    if (data.departmentId) data.departmentId = parseInt(data.departmentId);
    
    try {
      console.log("Submitting Data:", data);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        alert('Registration successful! Redirecting to Login...');
        window.location.href = 'login.html';
      } else {
        const errorMsg = result.errors
          ? result.errors.map(e => e.msg).join('\n')
          : result.message || 'Unknown error';
        alert(`Registration failed:\n${errorMsg}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to server. Is Backend running?');
    }
  });
});