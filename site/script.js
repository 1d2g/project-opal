let allFetchedReports = [];
let currentFilter = 'ma_only'; // Set the default filter state

document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    fetchReports();
    setupDarkMode();
    fetchNews();
});

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

function setupFilters() {
    const filterContainer = document.getElementById('filter-controls');
    if (!filterContainer) return; // Guard against element not being found

    filterContainer.innerHTML = `
        <button class="filter-btn active" data-filter="ma_only">M&A Detected</button>
        <button class="filter-btn" data-filter="all">All Reports</button>
    `;

    filterContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('filter-btn')) {
            const filterValue = event.target.dataset.filter;
            if (filterValue !== currentFilter) {
                currentFilter = filterValue;
                
                // Update active button
                filterContainer.querySelector('.active').classList.remove('active');
                event.target.classList.add('active');

                // Re-render the reports with the new filter
                renderReports();
            }
        }
    });
}

function toggleHorizontalBox(button) {
    const box = document.getElementById('horizontal-box');
    box.classList.toggle('collapsed');

    if (box.classList.contains('collapsed')) {
        button.textContent = '+';
    } else {
        button.textContent = '-';
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

async function fetchReports() {
    const reportListContainer = document.getElementById('report-list-container');
    try {
        const response = await fetch('analysis_manifest.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allFetchedReports = await response.json();
        renderReports();

    } catch (error) {
        console.error("Failed to fetch or process reports:", error);
        if(reportListContainer) {
            reportListContainer.innerHTML = '<p class="no-reports">Error loading analysis reports. See console for details.</p>';
        }
    }
}

function renderReports() {
    const reportListContainer = document.getElementById('report-list-container');
    if (!reportListContainer) return;

    reportListContainer.innerHTML = ''; // Clear existing reports

    const reportsToRender = currentFilter === 'all'
        ? allFetchedReports
        : allFetchedReports.filter(report => report.sentiment !== 'None');

    if (reportsToRender.length === 0) {
        reportListContainer.innerHTML = '<p class="no-reports">No reports match the current filter.</p>';
        return;
    }

    reportsToRender.forEach(report => {
        const reportCard = createReportCard(report);
        reportListContainer.appendChild(reportCard);
    });
}

function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    // Create the link to the SEC filing index page
    const accessionNodash = report.accession_no.replace(/-/g, '');
    const secUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(report.cik, 10)}/${accessionNodash}/${report.accession_no}-index.html`;
    const formLink = `<a href="${secUrl}" class="sec-link-form" target="_blank" rel="noopener noreferrer" title="View filing on SEC.gov">${report.form}</a>`;

    card.innerHTML = `
        <div class="report-header">
            <h3>${report.company_name} (${report.ticker})</h3>
            <span class="report-date">${report.date}</span>
        </div>
        <div class="report-body">
            <p><strong>Form:</strong> ${formLink}</p>
            <p><strong>M&A Sentiment:</strong> <span class="sentiment">${report.sentiment}</span></p>
            <h4>Key Findings:</h4>
            <ul>${report.findings.map(finding => `<li>${finding}</li>`).join('')}</ul>
        </div>
        <button class="report-link" onclick="toggleFullReport(this, '${report.report_path}')">View Full Report</button>
    `;
    return card;
}

async function toggleFullReport(button, reportPath) {
    const card = button.closest('.report-card');
    const existingFullReport = card.querySelector('.full-report-content');

    if (existingFullReport) {
        // If it's open, start the closing animation
        existingFullReport.classList.remove('expanded');
        button.textContent = 'View Full Report';
        // Remove the element from the DOM after the animation completes
        existingFullReport.addEventListener('transitionend', () => {
            existingFullReport.remove();
        }, { once: true }); // Use { once: true } to auto-remove the listener
    } else {
        // If it's closed, create it, fetch the content, and start the opening animation
        button.textContent = 'Loading...';
        try {
            const response = await fetch(reportPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const reportText = await response.text();

            // Create the container for the animation
            const fullReportContainer = document.createElement('div');
            fullReportContainer.className = 'full-report-content';

            // Create an inner wrapper for the content. This is needed for the animation.
            const innerContent = document.createElement('div');
            innerContent.className = 'full-report-inner';

            // Create a container for the report text to style it
            const reportTextContainer = document.createElement('div');
            reportTextContainer.className = 'full-report-text';
            // Replace newlines with <br> to preserve line breaks without using <pre>
            reportTextContainer.innerHTML = reportText.replace(/\n/g, '<br>');

            innerContent.appendChild(reportTextContainer);
            fullReportContainer.appendChild(innerContent);

            // Insert the full report content BEFORE the button to keep the button at the bottom
            card.insertBefore(fullReportContainer, button);

            // Use a tiny timeout to ensure the browser has painted the collapsed element
            // before we add the class to expand it. This makes the animation reliable.
            setTimeout(() => {
                fullReportContainer.classList.add('expanded');
                button.textContent = 'Hide Full Report';
            }, 10);

        } catch (error) {
            console.error('Error loading full report:', error);
            button.textContent = 'Error - Retry';
        }
    }
}

async function fetchNews() {
    const newsListContainer = document.getElementById('news-list-container');
    try {
        const response = await fetch('news_summary.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newsData = await response.json();
        renderNews(newsData);

    } catch (error) {
        console.error("Failed to fetch or process news:", error);
        if(newsListContainer) {
            newsListContainer.innerHTML = '<p class="no-reports">Error loading news. See console for details.</p>';
        }
    }
}

function renderNews(newsData) {
    const newsListContainer = document.getElementById('news-list-container');
    if (!newsListContainer) return;

    newsListContainer.innerHTML = ''; // Clear existing news

    if (newsData.length === 0) {
        newsListContainer.innerHTML = '<p class="no-reports">No news available.</p>';
        return;
    }

    newsData.forEach(newsItem => {
        const newsCard = createNewsCard(newsItem);
        newsListContainer.appendChild(newsCard);
    });
}

function createNewsCard(newsItem) {
    const card = document.createElement('div');
    card.className = 'report-card';

    // Format the date for better display
    const publishedDate = new Date(newsItem.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    card.innerHTML = `
        <div class="report-header">
            <h3>${newsItem.company_name} (${newsItem.ticker})</h3>
            <span class="report-date">${publishedDate}</span>
        </div>
        <div class="report-body">
            <h4>${newsItem.title}</h4>
            <p>${newsItem.summary}</p>
        </div>
        <a href="${newsItem.url}" class="report-link" target="_blank" rel="noopener noreferrer">Read More at ${newsItem.source}</a>
    `;
    return card;
}
