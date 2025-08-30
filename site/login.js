const firebaseConfig = {
  apiKey: "AIzaSyDM_CdyN_3LLEccYZIhKz-2V63W0D6ORh4",
  authDomain: "opal-230c9.firebaseapp.com",
  projectId: "opal-230c9",
  storageBucket: "opal-230c9.firebasestorage.app",
  messagingSenderId: "534314384816",
  appId: "1:534314384816:web:1ac71dbd42b65d7e186a75",
  measurementId: "G-LC24W6NL91"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = 'index.html';
        } catch (error) {
            handleAuthError(error, errorMessage);
        }
    });
});

function handleAuthError(error, errorMessageElement) {
    switch (error.code) {
        case 'auth/invalid-email':
            errorMessageElement.textContent = 'Please enter a valid email address.';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            errorMessageElement.textContent = 'Invalid email or password.';
            break;
        default:
            errorMessageElement.textContent = 'An unexpected error occurred. Please try again.';
            console.error(error);
    }
}