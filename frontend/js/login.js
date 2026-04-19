const API_URL = 'http://localhost:3000/api';

// --- 1. UTILITY FUNCTIONS (Notification, UI Effects) ---

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notification && notificationMessage) {
        notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    } else {
        alert(message); // Fallback if HTML elements missing
    }
}

// Password toggle functionality
const passwordToggle = document.getElementById('passwordToggle');
if (passwordToggle) {
    passwordToggle.addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });
}

// Input focus effects
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });

    // Check initial values
    if (input.value) {
        input.parentElement.classList.add('focused');
    }
});

// Email Validation Regex
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// --- 2. MAIN LOGIN LOGIC ---

async function validateLoginForm(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Basic Validation
    if (!email || !password) {
        showNotification('Please fill all fields', 'error');
        return false;
    }

    if (!validateEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return false;
    }

    // Button Loading State
    const button = document.querySelector('.login-button');
    const buttonText = button.querySelector('.button-text');
    const buttonIcon = button.querySelector('.button-icon');
    const originalButtonText = buttonText.textContent;
    const originalButtonIcon = buttonIcon.className;

    buttonText.textContent = 'Signing In...';
    buttonIcon.className = 'fas fa-spinner fa-spin';
    button.disabled = true;

    try {
        console.log("Sending request to:", `${API_URL}/auth/login`);
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        console.log("Login Response:", data); // Debugging ke liye zaroori

        if (response.ok) {
            showNotification('Login successful! Redirecting...', 'success');
            
            // Save Token & User Details
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // --- REDIRECTION LOGIC (UPDATED) ---
            // Database se Role "Admin", "Student", "Faculty" aata hai (Capitalized).
            // Hum safe side ke liye exact match check karenge.
            
            setTimeout(() => {
                const userRole = data.user.Role; 

                if (userRole === 'Admin' || userRole === 'SuperAdmin') {
                    window.location.href = 'dashboard_admin.html';
                } 
                else if (userRole === 'Faculty') {
                    window.location.href = 'dashboard_faculty.html';
                } 
                else if (userRole === 'Student') {
                    window.location.href = 'dashboard_student.html';
                } 
                else {
                    // Agar Management ya koi aur role ho, to filhal Student dashboard par bhej do
                    // ya phir dashboard_management.html agar bana ho.
                    window.location.href = 'dashboard_student.html';
                }
            }, 1000);

        } else {
            // Login Failed (Wrong password/email)
            showNotification(data.error || 'Login failed. Please check credentials.', 'error');
            resetButton();
        }

    } catch (error) {
        console.error('Login Network Error:', error);
        showNotification('Server error. Is Backend running?', 'error');
        resetButton();
    }

    // Helper to reset button state
    function resetButton() {
        buttonText.textContent = originalButtonText;
        buttonIcon.className = originalButtonIcon;
        button.disabled = false;
    }

    return false;
}

// Attach Event Listener
const loginForm = document.querySelector('.login-form');
if (loginForm) {
    loginForm.addEventListener('submit', validateLoginForm);
}