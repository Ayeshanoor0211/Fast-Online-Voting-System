const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    console.log("Loading components...");
    
    // Get current page path to determine correct paths
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    
    console.log("Current path:", currentPath);
    console.log("Current URL:", currentUrl);
    
    let headerPath = 'components/header.html';
    let footerPath = 'components/footer.html';
    
    // If we're in pages folder, adjust paths
    if (currentPath.includes('/pages/') || currentUrl.includes('/pages/')) {
        headerPath = '../components/header.html';
        footerPath = '../components/footer.html';
        console.log("Adjusted paths for pages folder");
    }
    
    // SPECIAL CASE: For login page, use minimal header with only logo
    if (currentPath.includes('/login.html') || currentUrl.includes('/login.html')) {
        if (currentPath.includes('/pages/') || currentUrl.includes('/pages/')) {
            headerPath = '../components/header-login.html';
        } else {
            headerPath = 'components/header-login.html';
        }
        console.log("Using minimal header for login page");
    }
    
    console.log("Loading header from:", headerPath);
    console.log("Loading footer from:", footerPath);
    
    loadComponent('header', headerPath);
    loadComponent('footer', footerPath);
});

function loadComponent(elementId, filePath) {
    console.log(`Loading ${elementId} from: ${filePath}`);
    
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = data;
                console.log(`✅ ${elementId} loaded successfully`);
            }
        })
        .catch(error => {
            console.error(`Error loading ${elementId}:`, error);
            createFallbackHeaderFooter(elementId);
        });
}

function createFallbackHeaderFooter(elementId) {
    console.log(`Creating fallback for ${elementId}`);
    
    if (elementId === 'header') {
        const header = document.createElement('header');
        header.className = 'header';
        header.innerHTML = `
            <nav class="navbar">
                <div class="logo">
                    <span>FAST Voting System</span>
                </div>
                <ul class="nav-links">
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="elections.html">Elections</a></li>
                    <li><a href="results.html">Results</a></li>
                    <li><a href="login.html" class="btn-secondary">Login</a></li>
                </ul>
            </nav>
        `;
        document.body.insertBefore(header, document.body.firstChild);
        console.log("✅ Fallback header created");
    }
    
    if (elementId === 'footer') {
        const footer = document.createElement('footer');
        footer.className = 'footer';
        footer.innerHTML = `
            <div class="footer-content">
                <p>&copy; 2024 FAST University Online Voting System. All rights reserved.</p>
                <p>Secure • Transparent • Efficient</p>
            </div>
        `;
        document.body.appendChild(footer);
        console.log("✅ Fallback footer created");
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
