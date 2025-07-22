document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // --- IMPORTANT: Login Credentials ---
    // For this example, we're using simple hardcoded credentials.
    // In a real-world application, you would use a secure backend for authentication.
    const CORRECT_USERNAME = 'admin';
    const CORRECT_PASSWORD = 'admin123';
    // ------------------------------------

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const usernameInput = document.getElementById('username').value;
        const passwordInput = document.getElementById('password').value;

        if (usernameInput === CORRECT_USERNAME && passwordInput === CORRECT_PASSWORD) {
            // Successful login
            errorMessage.classList.remove('show');
            errorMessage.textContent = '';
            alert('Login successful! Redirecting to dashboard...'); // For demonstration
            // In a real application, you would redirect to the dashboard page:
            window.location.href = 'dashboard.html'; // We will create this next
        } else {
            // Failed login
            errorMessage.textContent = 'Invalid username or password. Please try again.';
            errorMessage.classList.add('show');
            console.log(`Attempted login with: User="${usernameInput}", Pass="${passwordInput}"`);
        }
    });
});