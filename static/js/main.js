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
    const filenameModal = document.getElementById('filenameModal');
    const filenameInput = document.getElementById('filename');
    const confirmDownloadBtn = document.getElementById('confirmDownload');
    const cancelDownloadBtn = document.getElementById('cancelDownload');

    let currentJsonData = null;
    let allInsights = [];

    // Search functionality
    searchInput?.addEventListener('input', debounce(function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterInsights(searchTerm);
    }, 300));

    function showError(message) {
        console.error('Error:', message);
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }
        if (outputSection) {
            outputSection.classList.add('hidden');
        }
    }

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
        });
    }

    function activateTab(tabButton, panel) {
        if (!tabButton || !panel) return;

        // Deactivate all tabs
        document.querySelectorAll('#insightsTabs button').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-100', 'text-gray-700');
        });
        document.querySelectorAll('.insight-panel').forEach(p => {
            p.classList.add('hidden');
        });

        // Activate selected tab
        tabButton.classList.remove('bg-gray-100', 'text-gray-700');
        tabButton.classList.add('active', 'bg-blue-500', 'text-white');
        panel.classList.remove('hidden');
    }

    function updateStatistics(insights) {
        console.log('Updating statistics with insights:', insights);
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

    // Handle modal events
    downloadCSVBtn?.addEventListener('click', function() {
        if (!currentJsonData || !allInsights || allInsights.length === 0) {
            showError('No data to download');
            return;
        }
        
        // Set default filename
        const requestId = currentJsonData.requestId || 'insights';
        filenameInput.value = `${requestId}_${new Date().toISOString().split('T')[0]}.xlsx`;
        filenameModal.classList.remove('hidden');
    });

    cancelDownloadBtn?.addEventListener('click', function() {
        filenameModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    filenameModal?.addEventListener('click', function(e) {
        if (e.target === filenameModal) {
            filenameModal.classList.add('hidden');
        }
    });

    confirmDownloadBtn?.addEventListener('click', async function() {
        if (!currentJsonData || !allInsights || allInsights.length === 0) {
            showError('No data to download');
            return;
        }

        const filename = filenameInput.value.trim() || `insights_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        try {
            // Convert facts to the correct format for download
            const processedInsights = allInsights.map(insight => {
                const processedFacts = {};
                if (insight.facts) {
                    Object.entries(insight.facts).forEach(([factName, factData]) => {
                        if (factData.headers && factData.rows) {
                            processedFacts[factName] = {
                                cols: factData.headers,
                                rows: factData.rows,
                                type: factData.type
                            };
                        }
                    });
                }
                return {
                    ...insight,
                    facts: processedFacts
                };
            });

            // Make sure we're sending the full data structure
            const dataToSend = {
                requestId: currentJsonData.requestId,
                insights: processedInsights
            };
            
            console.log('Sending data for download:', dataToSend);
            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: dataToSend,
                    filename: filename
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            filenameModal.classList.add('hidden');
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
            console.log('Processing JSON data:', jsonData);
            
            // If the data already has an insights array, use it directly
            const dataToSend = jsonData.insights ? jsonData : {
                requestId: new Date().getTime().toString(),
                insights: Array.isArray(jsonData) ? jsonData : [jsonData]
            };
            
            console.log('Sending data to server:', dataToSend);
            
            const response = await fetch('/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error occurred');
            }

            const result = await response.json();
            console.log('Received response:', result);
            
            if (result.error) {
                throw new Error(result.error);
            }

            currentJsonData = result;
            allInsights = result.insights || [];
            
            console.log('Creating tabs with insights:', allInsights);
            createTabs(allInsights);
            updateStatistics(allInsights);
            
            if (outputSection) {
                outputSection.classList.remove('hidden');
            }
            if (errorMessage) {
                errorMessage.classList.add('hidden');
            }
        } catch (error) {
            console.error('Process error:', error);
            showError('Error processing data: ' + error.message);
        }
    }

    function createTabs(insights) {
        console.log('Creating tabs with insights:', insights);
        const tabsContainer = document.getElementById('insightsTabs');
        const contentContainer = document.getElementById('insightsContent');
        
        if (!tabsContainer || !contentContainer) {
            console.error('Container elements not found');
            return;
        }
        
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '';

        if (!Array.isArray(insights) || insights.length === 0) {
            console.error('No insights to display');
            showError('No insights found in the data');
            return;
        }

        insights.forEach((insight, index) => {
            // Create tab button
            const tabButton = document.createElement('button');
            tabButton.className = `w-full text-left px-4 py-2 rounded-lg transition-colors ${index === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
            tabButton.setAttribute('data-tab', `insight-${index}`);
            
            // Always use useCaseId for tab name
            const tabName = insight.useCaseId || `Insight ${index + 1}`;
            tabButton.textContent = tabName;
            
            tabsContainer.appendChild(tabButton);

            // Create content panel
            const panel = document.createElement('div');
            panel.id = `insight-${index}`;
            panel.className = `insight-panel ${index === 0 ? '' : 'hidden'}`;
            
            // Add insight details
            const details = document.createElement('div');
            details.className = 'insight-details bg-white p-4 rounded-lg mb-4';
            details.innerHTML = `
                <h3 class="text-lg font-semibold mb-3">Insight Details</h3>
                <table class="w-full">
                    <tr><th class="text-left py-2 px-4 bg-gray-50">ID</th><td class="py-2 px-4">${insight.id || ''}</td></tr>
                    <tr><th class="text-left py-2 px-4 bg-gray-50">Use Case</th><td class="py-2 px-4">${insight.useCaseId || ''}</td></tr>
                    <tr><th class="text-left py-2 px-4 bg-gray-50">Type</th><td class="py-2 px-4">${insight.type || ''}</td></tr>
                    <tr><th class="text-left py-2 px-4 bg-gray-50">Segment</th><td class="py-2 px-4">${insight.segment || ''}</td></tr>
                    <tr><th class="text-left py-2 px-4 bg-gray-50">Score</th><td class="py-2 px-4">${insight.score || ''}</td></tr>
                    <tr><th class="text-left py-2 px-4 bg-gray-50">Status</th><td class="py-2 px-4">${insight.status || ''}</td></tr>
                    <tr><th class="text-left py-2 px-4 bg-gray-50">Generated Date</th><td class="py-2 px-4">${insight.generatedDate || ''}</td></tr>
                </table>
            `;
            panel.appendChild(details);

            // Add facts
            const facts = insight.facts || {};
            Object.entries(facts).forEach(([factName, factData]) => {
                const factSection = document.createElement('div');
                factSection.className = 'fact-section bg-white p-4 rounded-lg mb-4';
                
                const factHeader = document.createElement('h4');
                factHeader.className = 'text-lg font-semibold mb-2';
                factHeader.textContent = `Fact: ${factName}`;
                factSection.appendChild(factHeader);

                // Add fact type if available
                if (factData.type) {
                    const typeInfo = document.createElement('p');
                    typeInfo.className = 'text-sm text-gray-600 mb-3';
                    typeInfo.textContent = `Type: ${factData.type}`;
                    factSection.appendChild(typeInfo);
                }

                // Create table for fact data
                if (factData.headers && factData.rows) {
                    const tableWrapper = document.createElement('div');
                    tableWrapper.className = 'overflow-x-auto';
                    
                    const table = document.createElement('table');
                    table.className = 'min-w-full divide-y divide-gray-200';
                    
                    // Add headers with attribute types
                    const thead = document.createElement('thead');
                    thead.className = 'bg-gray-50';
                    const headerRow = document.createElement('tr');
                    factData.headers.forEach((header, i) => {
                        const th = document.createElement('th');
                        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
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
                    tbody.className = 'bg-white divide-y divide-gray-200';
                    (factData.rows || []).forEach((row, rowIndex) => {
                        const tr = document.createElement('tr');
                        tr.className = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                        row.forEach(cell => {
                            const td = document.createElement('td');
                            td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
                            td.textContent = cell !== null ? cell : '';
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    
                    tableWrapper.appendChild(table);
                    factSection.appendChild(tableWrapper);
                }

                panel.appendChild(factSection);
            });

            contentContainer.appendChild(panel);
        });

        // Add click handlers for tabs
        const tabButtons = document.querySelectorAll('#insightsTabs button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const panel = document.getElementById(button.getAttribute('data-tab'));
                activateTab(button, panel);
            });
        });
    }
});
