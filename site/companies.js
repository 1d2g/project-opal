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
const db = firebase.firestore();
const auth = firebase.auth();

let monitoredCompanies = [];
let allSp500Companies = []; // To store the full S&P 500 list

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            setupLogout();
            setupDarkMode();
            setupSidebarNavigation();
            fetchSp500Companies().then(() => {
                setupCompanyManagement(user.uid);
            });
        } else {
            // User is signed out.
            window.location.href = 'login.html';
        }
    });
});

function setupSidebarNavigation() {
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    // Also ensure the sidebar toggle works
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

    logoutBtn.addEventListener('click', () => {
        logoutConfirmModal.style.display = 'flex'; // Show the modal
    });

    cancelLogoutBtn.addEventListener('click', () => {
        logoutConfirmModal.style.display = 'none'; // Hide the modal
    });

    confirmLogoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Logout failed:", error);
        }
    });
}

function setupDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const body = document.body;

    const setDarkMode = (enabled) => {
        if (enabled) {
            body.classList.add('dark-mode');
            darkModeToggle.checked = true;
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
            localStorage.setItem('darkMode', 'disabled');
        }
    };

    // Check for saved preference
    const darkModeSaved = localStorage.getItem('darkMode') === 'enabled';
    setDarkMode(darkModeSaved);

    darkModeToggle.addEventListener('change', () => {
        setDarkMode(darkModeToggle.checked);
    });

    darkModeIcon.addEventListener('click', () => {
        setDarkMode(!body.classList.contains('dark-mode'));
    });
}

async function fetchSp500Companies() {
    try {
        const response = await fetch('sp500_companies.json');
        allSp500Companies = await response.json();
    } catch (error) {
        console.error("Error fetching S&P 500 companies:", error);
        allSp500Companies = [];
    }
}

async function setupCompanyManagement(userId) {
    const userPreferencesDoc = db.collection('user_preferences').doc(userId);
    const addCompanyBtn = document.getElementById('add-new-company-btn');
    const newCompanyTickerInput = document.getElementById('new-company-ticker');
    const companySearchInput = document.getElementById('company-search');
    const companySortSelect = document.getElementById('company-sort');
    const monitoredCompaniesListDiv = document.getElementById('monitored-companies-list');

    // Initial fetch of monitored companies
    try {
        const doc = await userPreferencesDoc.get();
        if (doc.exists) {
            monitoredCompanies = doc.data().monitored_companies || [];
        }
        renderMonitoredCompanies();
    } catch (error) {
        console.error("Error fetching monitored companies:", error);
    }

    // Add Company
    addCompanyBtn.addEventListener('click', async () => {
        const newTicker = newCompanyTickerInput.value.trim().toUpperCase();
        if (newTicker && !monitoredCompanies.includes(newTicker)) {
            // Optional: Validate against S&P 500 list if desired
            // const isValidTicker = allSp500Companies.some(c => c.symbol === newTicker);
            // if (!isValidTicker) { alert("Invalid S&P 500 ticker."); return; }

            monitoredCompanies.push(newTicker);
            monitoredCompanies.sort(); // Keep sorted
            await userPreferencesDoc.set({ monitored_companies: monitoredCompanies }, { merge: true });
            newCompanyTickerInput.value = '';
            renderMonitoredCompanies();
        }
    });

    // Search and Sort
    companySearchInput.addEventListener('input', renderMonitoredCompanies);
    companySortSelect.addEventListener('change', renderMonitoredCompanies);

    function renderMonitoredCompanies() {
        let filteredCompanies = [...monitoredCompanies];

        // Apply search filter
        const searchTerm = companySearchInput.value.trim().toUpperCase();
        if (searchTerm) {
            filteredCompanies = filteredCompanies.filter(ticker => 
                ticker.includes(searchTerm) || 
                allSp500Companies.some(c => c.symbol === ticker && c.name.toUpperCase().includes(searchTerm))
            );
        }

        // Apply sort
        const sortValue = companySortSelect.value;
        if (sortValue === 'ticker-asc') {
            filteredCompanies.sort();
        } else if (sortValue === 'ticker-desc') {
            filteredCompanies.sort((a, b) => b.localeCompare(a));
        }
        // Add more sorting options here if needed (e.g., by company name)

        monitoredCompaniesListDiv.innerHTML = '';
        if (filteredCompanies.length === 0) {
            monitoredCompaniesListDiv.innerHTML = '<p class="no-companies">No companies found matching your criteria.</p>';
            return;
        }

        filteredCompanies.forEach(ticker => {
            const companyName = allSp500Companies.find(c => c.symbol === ticker)?.name || 'N/A';
            const companyCard = document.createElement('div');
            companyCard.className = 'company-card';
            companyCard.innerHTML = `
                <span>${ticker} - ${companyName}</span>
                <button class="remove-company-btn" data-ticker="${ticker}">Remove</button>
            `;
            monitoredCompaniesListDiv.appendChild(companyCard);
        });

        // Add event listeners for remove buttons
        monitoredCompaniesListDiv.querySelectorAll('.remove-company-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const tickerToRemove = event.target.dataset.ticker;
                monitoredCompanies = monitoredCompanies.filter(t => t !== tickerToRemove);
                await userPreferencesDoc.set({ monitored_companies: monitoredCompanies }, { merge: true });
                renderMonitoredCompanies();
            });
        });
    }
}
