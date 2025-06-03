// DOM Elements
const body = document.body;
const profile = document.querySelector('.header .flex .profile');
const searchForm = document.querySelector('.header .flex .search-form');
const sideBar = document.querySelector('.side-bar');
const toggleBtn = document.querySelector('#toggle-btn');

// Toggle profile and search visibility
document.querySelector('#user-btn')?.addEventListener('click', () => {
    profile.classList.toggle('active');
    searchForm.classList.remove('active');
});

document.querySelector('#search-btn')?.addEventListener('click', () => {
    searchForm.classList.toggle('active');
    profile.classList.remove('active');
});

// Sidebar toggle
document.querySelector('#menu-btn')?.addEventListener('click', () => {
    sideBar.classList.toggle('active');
    body.classList.toggle('active');
});

document.querySelector('.side-bar .close-side-bar')?.addEventListener('click', () => {
    sideBar.classList.remove('active');
    body.classList.remove('active');
});

// Close elements on scroll
window.addEventListener('scroll', () => {
    profile.classList.remove('active');
    searchForm.classList.remove('active');

    if (window.innerWidth < 1200) {
        sideBar.classList.remove('active');
        body.classList.remove('active');
    }
});

// Dark mode functionality
const enableDarkMode = () => {
    toggleBtn.classList.replace('fa-sun', 'fa-moon');
    body.classList.add('dark');
    localStorage.setItem('dark-mode', 'enabled');
};

const disableDarkMode = () => {
    toggleBtn.classList.replace('fa-moon', 'fa-sun');
    body.classList.remove('dark');
    localStorage.setItem('dark-mode', 'disabled');
};

// Initialize dark mode
const darkMode = localStorage.getItem('dark-mode');
if (darkMode === 'enabled') {
    enableDarkMode();
}

// Toggle dark mode
toggleBtn?.addEventListener('click', () => {
    const currentMode = localStorage.getItem('dark-mode');
    if (currentMode === 'disabled') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
});

// Form handling
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const action = form.getAttribute('action');
        const method = form.getAttribute('method') || 'POST';

        try {
            const response = await fetch(action, {
                method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const result = await response.json();
                if (result.success) {
                    showMessage(result.success, 'success');
                } else if (result.error) {
                    showMessage(result.error, 'error');
                }
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
});

// Show message function
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add message styles
const style = document.createElement('style');
style.textContent = `
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    
    .message.success {
        background-color: var(--green);
    }
    
    .message.error {
        background-color: var(--red);
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    
    .error {
        border-color: var(--red) !important;
    }
`;
document.head.appendChild(style);