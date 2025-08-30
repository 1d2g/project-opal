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
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const signupBtn = document.getElementById('signup-btn');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const organizationInput = document.getElementById('organization');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const retypePasswordInput = document.getElementById('retype-password');
    const errorMessage = document.getElementById('error-message');

    signupBtn.addEventListener('click', async () => {
        const firstName = firstNameInput.value;
        const lastName = lastNameInput.value;
        const organization = organizationInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const retypePassword = retypePasswordInput.value;

        if (password !== retypePassword) {
            errorMessage.textContent = "Passwords do not match.";
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Fetch S&P 500 companies
            const response = await fetch('sp500_companies.json');
            const sp500Companies = await response.json();
            const allSp500Tickers = sp500Companies.map(company => company.symbol);

            // Store additional user data in Firestore, including default monitored companies
            await db.collection('users').doc(user.uid).set({
                firstName,
                lastName,
                organization,
                email,
                monitored_companies: allSp500Tickers // Set default watchlist
            });

            // Also create a user_preferences document for consistency, if needed by other parts of the app
            await db.collection('user_preferences').doc(user.uid).set({
                monitored_companies: allSp500Tickers
            }, { merge: true });

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
        case 'auth/weak-password':
            errorMessageElement.textContent = 'Password should be at least 6 characters.';
            break;
        case 'auth/email-already-in-use':
            errorMessageElement.textContent = 'An account with this email already exists.';
            break;
        default:
            errorMessageElement.textContent = 'An unexpected error occurred. Please try again.';
            console.error(error);
    }
}