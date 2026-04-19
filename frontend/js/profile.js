document.addEventListener('DOMContentLoaded', function() {
    loadProfileData();
});

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = 'login.html'; // Redirect to login if no user data
        return;
    }

    // Set basic info
    document.getElementById('profileName').textContent = user.Name;
    document.getElementById('roleBadge').textContent = user.Role;
    document.getElementById('profileCampus').textContent = user.CampusName || 'N/A';
    document.getElementById('profileEmail').textContent = user.Email;
    document.getElementById('profilePhone').textContent = user.PhoneNumber || 'N/A';

    // Set personal details
    document.getElementById('detailName').textContent = user.Name;
    document.getElementById('detailCNIC').textContent = user.CNIC;
    document.getElementById('detailPhone').textContent = user.PhoneNumber || 'N/A';
    document.getElementById('detailEmail').textContent = user.Email;
    document.getElementById('detailCampus').textContent = user.CampusName || 'N/A';
    document.getElementById('detailDepartment').textContent = user.DeptName || 'N/A';


    // Show role-specific details
    document.getElementById('studentDetails').style.display = 'none';
    document.getElementById('facultyDetails').style.display = 'none';
    document.getElementById('managementDetails').style.display = 'none'; // Assuming ManagementDetails also exists
    document.getElementById('adminDetails').style.display = 'none'; // Assuming AdminDetails also exists


    if (user.Role === 'Student' && user.RollNumber) {
        document.getElementById('studentDetails').style.display = 'block';
        document.getElementById('studentRoll').textContent = user.RollNumber;
        document.getElementById('studentBatch').textContent = user.Batch;
        document.getElementById('studentSemester').textContent = user.Semester;
        document.getElementById('studentSection').textContent = user.Section;
        document.getElementById('studentAdmission').textContent = user.AdmissionYear;
    } else if (user.Role === 'Faculty' && user.Designation) {
        document.getElementById('facultyDetails').style.display = 'block';
        document.getElementById('facultyDesignation').textContent = user.Designation;
        document.getElementById('facultyQualification').textContent = user.Qualification;
        document.getElementById('facultyJoining').textContent = user.JoiningDate ? new Date(user.JoiningDate).toLocaleDateString() : 'N/A';
    } else if (user.Role === 'Management' && user.ManagementPosition) {
        document.getElementById('managementDetails').style.display = 'block';
        document.getElementById('managementPosition').textContent = user.ManagementPosition;
        document.getElementById('managementResponsibility').textContent = user.Responsibility;
    } else if (user.Role === 'Admin' && user.AccessLevel) {
        document.getElementById('adminDetails').style.display = 'block';
        document.getElementById('adminAccessLevel').textContent = user.AccessLevel;
    }
}

// Toast notification function (already in common.js, but duplicated here for standalone testing if needed)
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}