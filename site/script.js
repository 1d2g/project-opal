document.addEventListener('DOMContentLoaded', () => {
    fetchReports();
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

async function fetchReports() {
    const reportContainer = document.getElementById('report-container');
    try {
        const response = await fetch('analysis_manifest.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reports = await response.json();

        if (reports.length === 0) {
            reportContainer.innerHTML = '<p class="no-reports">No recent analysis reports found.</p>';
            return;
        }

        // Clear any placeholder content
        reportContainer.innerHTML = '';

        reports.forEach(report => {
            const reportCard = createReportCard(report);
            reportContainer.appendChild(reportCard);
        });

    } catch (error) {
        console.error("Failed to fetch or process reports:", error);
        reportContainer.innerHTML = '<p class="no-reports">Error loading analysis reports. See console for details.</p>';
    }
}

function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    // Use backticks for multi-line HTML strings
    card.innerHTML = `
        <div class="report-header">
            <h3>${report.company_name} (${report.ticker})</h3>
            <span class="report-date">${report.date}</span>
        </div>
        <div class="report-body">
            <p><strong>Form:</strong> ${report.form}</p>
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
            innerContent.innerHTML = `<pre>${reportText}</pre>`;
            fullReportContainer.appendChild(innerContent);

            // Insert the full report content after the button
            button.insertAdjacentElement('afterend', fullReportContainer);

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