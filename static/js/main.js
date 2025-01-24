document.addEventListener('DOMContentLoaded', function() {
    const jsonInput = document.getElementById('jsonInput');
    const convertBtn = document.getElementById('convertBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const outputSection = document.getElementById('outputSection');
    const errorMessage = document.getElementById('errorMessage');
    const downloadCSVBtn = document.getElementById('downloadCSV');
    const copyMarkdownBtn = document.getElementById('copyMarkdown');
    const searchInput = document.getElementById('searchInput');
    const totalInsights = document.getElementById('totalInsights');
    const totalFacts = document.getElementById('totalFacts');
    const totalDataPoints = document.getElementById('totalDataPoints');

    let currentJsonData = null;
    let allInsights = [];

    // Search functionality
    searchInput?.addEventListener('input', debounce(function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterInsights(searchTerm);
    }, 300));

    function filterInsights(searchTerm) {
        if (!allInsights?.length) return;

        const insightElements = document.querySelectorAll('.insight-panel');
        const tabElements = document.querySelectorAll('#insightsTabs button');

        insightElements.forEach((panel, index) => {
            if (index >= allInsights.length) return;
            
            const insight = allInsights[index];
            const insightText = JSON.stringify(insight).toLowerCase();
            const isVisible = insightText.includes(searchTerm);
            
            panel.classList.toggle('hidden', !isVisible);
            tabElements[index]?.parentElement?.classList.toggle('hidden', !isVisible);

            // If this was visible and active, but now being hidden, show the first visible panel
            if (!isVisible && !panel.classList.contains('hidden')) {
                const firstVisiblePanel = document.querySelector('.insight-panel:not(.hidden)');
                const firstVisibleTab = document.querySelector('#insightsTabs button:not(.hidden)');
                if (firstVisiblePanel && firstVisibleTab) {
                    activateTab(firstVisibleTab, firstVisiblePanel);
                }
            }
        });
    }

    function activateTab(tabButton, panel) {
        if (!tabButton || !panel) return;

        // Deactivate all tabs
        document.querySelectorAll('#insightsTabs button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.insight-panel').forEach(p => {
            p.classList.add('hidden');
        });

        // Activate selected tab
        tabButton.classList.add('active');
        panel.classList.remove('hidden');
    }

    function updateStatistics(insights) {
        if (!Array.isArray(insights)) {
            console.error('Invalid insights data');
            return;
        }

        let totalFactsCount = 0;
        let totalDataPoints = 0;

        insights.forEach(insight => {
            if (insight?.facts) {
                const factCount = Object.keys(insight.facts).length;
                totalFactsCount += factCount;

                Object.values(insight.facts).forEach(fact => {
                    if (fact?.rows?.length && fact.rows[0]?.length) {
                        totalDataPoints += fact.rows.length * fact.rows[0].length;
                    }
                });
            }
        });

        if (totalInsights) totalInsights.textContent = insights.length.toString();
        if (totalFacts) totalFacts.textContent = totalFactsCount.toString();
        if (totalDataPoints) totalDataPoints.textContent = totalDataPoints.toLocaleString();
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    convertBtn?.addEventListener('click', async function() {
        const jsonText = jsonInput?.value?.trim();
        if (!jsonText) {
            showError('Please enter JSON data');
            return;
        }

        try {
            const jsonData = JSON.parse(jsonText);
            await processJsonData(jsonData);
        } catch (error) {
            showError('Invalid JSON format: ' + error.message);
        }
    });

    uploadBtn?.addEventListener('click', function() {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', function(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const jsonData = JSON.parse(e.target?.result);
                await processJsonData(jsonData);
            } catch (error) {
                showError('Invalid JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    });

    downloadCSVBtn?.addEventListener('click', async function() {
        if (!currentJsonData) {
            showError('No data available for download');
            return;
        }

        try {
            console.log('Sending data:', {
                requestId: currentJsonData.requestId,
                insights: currentJsonData.insights
            });

            const response = await fetch('/download-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: currentJsonData.requestId,
                    insights: currentJsonData.insights
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error occurred');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
            a.download = filenameMatch ? filenameMatch[1] : `insights_${currentJsonData.requestId || 'export'}.xlsx`;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            showError('Error downloading file: ' + error.message);
        }
    });

    copyMarkdownBtn?.addEventListener('click', function() {
        if (!currentJsonData) {
            showError('No data available to copy');
            return;
        }
        // Add markdown copy functionality here
    });

    async function processJsonData(jsonData) {
        try {
            const response = await fetch('/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }

            currentJsonData = result;
            allInsights = result.insights || [];
            createTabs(result.insights || []);
            updateStatistics(result.insights || []);
            
            if (outputSection) outputSection.classList.remove('hidden');
            if (errorMessage) errorMessage.classList.add('hidden');
        } catch (error) {
            showError('Error processing data: ' + error.message);
        }
    }

    function createTabs(insights) {
        const tabsContainer = document.getElementById('insightsTabs');
        const contentContainer = document.getElementById('insightsContent');
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        insights.forEach((insight, index) => {
            // Create tab button
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button' + (index === 0 ? ' active' : '');
            tabButton.setAttribute('data-tab', `insight-${index}`);
            tabButton.textContent = insight.useCaseId || `Insight ${index + 1}`;
            tabsContainer.appendChild(tabButton);

            // Create content panel
            const panel = document.createElement('div');
            panel.id = `insight-${index}`;
            panel.className = 'insight-panel' + (index === 0 ? '' : ' hidden');
            
            // Add insight details
            const details = document.createElement('div');
            details.className = 'insight-details';
            details.innerHTML = `
                <h3>Insight Details</h3>
                <table>
                    <tr><th>ID</th><td>${insight.id || ''}</td></tr>
                    <tr><th>Use Case</th><td>${insight.useCaseId || ''}</td></tr>
                    <tr><th>Type</th><td>${insight.type || ''}</td></tr>
                    <tr><th>Segment</th><td>${insight.segment || ''}</td></tr>
                    <tr><th>Score</th><td>${insight.score || ''}</td></tr>
                    <tr><th>Status</th><td>${insight.status || ''}</td></tr>
                    <tr><th>Generated Date</th><td>${insight.generatedDate || ''}</td></tr>
                </table>
            `;
            panel.appendChild(details);

            // Add facts
            const facts = insight.facts || {};
            Object.entries(facts).forEach(([factName, factData]) => {
                const factSection = document.createElement('div');
                factSection.className = 'fact-section';
                
                const factHeader = document.createElement('h4');
                factHeader.className = 'fact-header';
                factHeader.textContent = `Fact: ${factName}`;
                factSection.appendChild(factHeader);

                // Add fact type
                if (factData.type) {
                    const typeInfo = document.createElement('p');
                    typeInfo.className = 'fact-type';
                    typeInfo.textContent = `Type: ${factData.type}`;
                    factSection.appendChild(typeInfo);
                }

                // Create table for fact data
                if (factData.headers && factData.headers.length > 0) {
                    const table = document.createElement('table');
                    
                    // Add headers with attribute types
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    factData.headers.forEach((header, i) => {
                        const th = document.createElement('th');
                        const attrType = factData.attributesTypes && factData.attributesTypes[i] 
                            ? ` (${factData.attributesTypes[i]})` 
                            : '';
                        th.textContent = header + attrType;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);

                    // Add rows
                    const tbody = document.createElement('tbody');
                    (factData.rows || []).forEach(row => {
                        const tr = document.createElement('tr');
                        row.forEach(cell => {
                            const td = document.createElement('td');
                            td.textContent = cell !== null ? cell : '';
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    
                    factSection.appendChild(table);
                }

                panel.appendChild(factSection);
            });

            contentContainer.appendChild(panel);
        });

        // Add click handlers for tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs and hide all panels
                tabButtons.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.insight-panel').forEach(p => p.classList.add('hidden'));
                
                // Add active class to clicked tab and show corresponding panel
                button.classList.add('active');
                const panel = document.getElementById(button.getAttribute('data-tab'));
                if (panel) {
                    panel.classList.remove('hidden');
                }
            });
        });
    }

    function showError(message) {
        if (!errorMessage || !outputSection) return;
        
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        outputSection.classList.add('hidden');
    }
});
