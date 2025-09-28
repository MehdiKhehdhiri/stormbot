// StormBot Frontend Application
class StormBotApp {
    constructor() {
        this.socket = null;
        this.activeTests = new Map();
        this.currentTab = 'dashboard';
        this.charts = {};
        this.settings = this.loadSettings();
        this.apiBaseUrl = this.getApiBaseUrl();
        
        this.init();
    }

    // Determine API base URL based on environment
    getApiBaseUrl() {
        if (typeof window !== 'undefined') {
            // Check if we're on Vercel or local development
            const hostname = window.location.hostname;
            if (hostname.includes('vercel.app') || hostname.includes('localhost')) {
                return window.location.origin;
            }
        }
        return 'http://localhost:3000';
    }

    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.setupTabs();
        this.loadInitialData();
        this.initializeCharts();
        
        console.log('🌩️ StormBot Dashboard initialized');
        this.showToast('Dashboard ready', 'success');
    }

    // Socket.IO Connection
    initializeSocket() {
        // Only initialize socket for local development
        if (window.location.hostname === 'localhost') {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 Connected to StormBot server');
                this.updateSystemStatus('Connected');
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from StormBot server');
                this.updateSystemStatus('Disconnected');
            });

            this.socket.on('test-update', (data) => {
                this.handleTestUpdate(data);
            });

            this.socket.on('active-tests', (tests) => {
                this.updateActiveTests(tests);
            });
        } else {
            // For Vercel deployment, simulate connection
            console.log('🔌 Connected to StormBot server');
            this.updateSystemStatus('Connected');
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Test configuration form
        const testForm = document.getElementById('test-config-form');
        if (testForm) {
            testForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startTest();
            });
        }

        // Duration selector
        const durationSelect = document.getElementById('test-duration');
        if (durationSelect) {
            durationSelect.addEventListener('change', (e) => {
                const customGroup = document.getElementById('custom-duration-group');
                if (e.target.value === 'custom') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
            });
        }

        // Test preview
        const previewBtn = document.getElementById('test-preview');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.showTestPreview();
            });
        }

        // Refresh buttons
        document.getElementById('refresh-tests')?.addEventListener('click', () => {
            this.refreshActiveTests();
        });

        document.getElementById('refresh-reports')?.addEventListener('click', () => {
            this.loadReports();
        });

        // Clear logs
        document.getElementById('clear-logs')?.addEventListener('click', () => {
            this.clearLogs();
        });

        // Settings
        document.getElementById('save-settings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Modal close
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.closeModal();
            }
        });

        // Form validation
        document.getElementById('test-url')?.addEventListener('input', (e) => {
            this.validateUrl(e.target);
        });
    }

    // Tab Management
    setupTabs() {
        // Set initial active tab
        this.switchTab('dashboard');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`)?.classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'settings':
                this.loadSettingsForm();
                break;
        }
    }

    // Data Loading
    async loadInitialData() {
        try {
            await this.refreshActiveTests();
            await this.loadReports();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Failed to load initial data', 'error');
        }
    }

    async refreshActiveTests() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/status`);
            const data = await response.json();
            
            this.updateActiveTests(data.tests || []);
            this.updateActiveTestsCount(data.activeTests || 0);
        } catch (error) {
            console.error('Error refreshing active tests:', error);
            this.showToast('Failed to refresh active tests', 'error');
        }
    }

    async loadReports() {
        const reportsList = document.getElementById('reports-list');
        if (!reportsList) return;

        reportsList.innerHTML = `
            <div class="loading-state">
                <span class="loading-spinner">⏳</span>
                <p>Loading reports...</p>
            </div>
        `;

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/reports`);
            const data = await response.json();
            
            this.displayReports(data.reports || []);
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">❌</span>
                    <p>Failed to load reports</p>
                    <button class="btn btn-secondary" onclick="app.loadReports()">Retry</button>
                </div>
            `;
        }
    }

    // Test Management
    async startTest() {
        const form = document.getElementById('test-config-form');
        const formData = new FormData(form);
        
        const config = {
            url: formData.get('url'),
            users: parseInt(formData.get('users')) || 5,
            duration: formData.get('duration') === 'custom' 
                ? parseInt(formData.get('customDuration')) || 60
                : parseInt(formData.get('duration')) || 60,
            aiEnabled: formData.get('aiEnabled') === 'on',
            reportDir: formData.get('reportDir') || './stormbot-reports'
        };

        // Validate configuration
        if (!config.url) {
            this.showToast('Please enter a valid URL', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/test/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(`Test started successfully (ID: ${result.testId})`, 'success');
                this.switchTab('dashboard');
                this.refreshActiveTests();
            } else {
                this.showToast(`Failed to start test: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error starting test:', error);
            this.showToast('Failed to start test', 'error');
        }
    }

    async stopTest(testId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/test/${testId}/stop`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showToast('Test stopped successfully', 'success');
                this.refreshActiveTests();
            } else {
                this.showToast('Failed to stop test', 'error');
            }
        } catch (error) {
            console.error('Error stopping test:', error);
            this.showToast('Failed to stop test', 'error');
        }
    }

    // UI Updates
    updateActiveTests(tests) {
        const container = document.getElementById('active-tests-list');
        if (!container) return;

        if (tests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🌤️</span>
                    <p>No active tests running</p>
                    <button class="btn btn-primary" onclick="app.switchTab('new-test')">Start New Test</button>
                </div>
            `;
            return;
        }

        container.innerHTML = tests.map(test => `
            <div class="test-item" data-test-id="${test.id}">
                <div class="test-info">
                    <h3>${test.config.url}</h3>
                    <div class="test-meta">
                        Started: ${new Date(test.startTime).toLocaleString()} | 
                        Users: ${test.config.users} | 
                        Duration: ${test.config.duration}s
                    </div>
                </div>
                <div class="test-status">
                    <span class="status-badge status-${test.status}">${test.status}</span>
                    ${test.status === 'running' ? 
                        `<button class="btn btn-secondary" onclick="app.stopTest('${test.id}')">Stop</button>` : 
                        `<button class="btn btn-secondary" onclick="app.viewTestDetails('${test.id}')">View</button>`
                    }
                </div>
            </div>
        `).join('');

        // Update active tests in memory
        tests.forEach(test => {
            this.activeTests.set(test.id, test);
        });
    }

    updateActiveTestsCount(count) {
        const element = document.getElementById('active-tests-count');
        if (element) {
            element.textContent = count;
        }
    }

    updateSystemStatus(status) {
        const element = document.getElementById('system-status');
        if (element) {
            element.textContent = status;
            element.className = `stat-value status-indicator ${status.toLowerCase()}`;
        }
    }

    updateMetrics(metrics) {
        if (metrics.requests !== undefined) {
            const element = document.getElementById('total-requests');
            if (element) element.textContent = metrics.requests;
        }

        if (metrics.errors !== undefined) {
            const element = document.getElementById('total-errors');
            if (element) element.textContent = metrics.errors;
        }

        if (metrics.agents !== undefined) {
            const element = document.getElementById('active-agents');
            if (element) element.textContent = metrics.agents.length;
        }
    }

    displayReports(reports) {
        const container = document.getElementById('reports-list');
        if (!container) return;

        if (reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📄</span>
                    <p>No reports available</p>
                    <button class="btn btn-primary" onclick="app.switchTab('new-test')">Run Your First Test</button>
                </div>
            `;
            return;
        }

        container.innerHTML = reports.map(report => `
            <div class="report-item" onclick="app.viewReport('${report.id}')">
                <div class="report-info">
                    <h3>Test Report - ${report.id}</h3>
                    <div class="report-meta">
                        Created: ${new Date(report.createdAt).toLocaleString()}
                    </div>
                </div>
                <div class="report-summary">
                    ${report.summary ? `
                        <div class="summary-item">
                            <div class="summary-value">${report.summary.totalRequests || 0}</div>
                            <div class="summary-label">Requests</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${report.summary.totalErrors || 0}</div>
                            <div class="summary-label">Errors</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${Math.round(report.summary.avgLoadTime || 0)}ms</div>
                            <div class="summary-label">Avg Load</div>
                        </div>
                    ` : '<div class="summary-item"><div class="summary-value">-</div><div class="summary-label">Processing</div></div>'}
                </div>
            </div>
        `).join('');
    }

    // Real-time Updates
    handleTestUpdate(data) {
        const { testId, type, data: updateData, metrics } = data;

        switch (type) {
            case 'log':
                this.addLogEntry(updateData, 'info');
                if (metrics) {
                    this.updateMetrics(metrics);
                }
                break;
            case 'error':
                this.addLogEntry(updateData, 'error');
                break;
            case 'completed':
                this.addLogEntry(`Test ${testId} completed with status: ${data.status}`, 'success');
                this.refreshActiveTests();
                break;
            case 'stopped':
                this.addLogEntry(`Test ${testId} was stopped`, 'warning');
                this.refreshActiveTests();
                break;
            case 'report-ready':
                this.addLogEntry(`Report ready for test ${testId}`, 'success');
                break;
        }

        // Update charts if needed
        if (metrics && this.charts.performance) {
            this.updatePerformanceChart(metrics);
        }
    }

    addLogEntry(message, type = 'info') {
        const logsContainer = document.getElementById('live-logs');
        if (!logsContainer) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;

        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        // Keep only last 100 log entries
        const entries = logsContainer.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
    }

    clearLogs() {
        const logsContainer = document.getElementById('live-logs');
        if (logsContainer) {
            logsContainer.innerHTML = `
                <div class="log-entry system">
                    <span class="log-time">[System]</span>
                    <span class="log-message">Logs cleared</span>
                </div>
            `;
        }
    }

    // Charts
    initializeCharts() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Requests/sec',
                    data: [],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Errors/sec',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    updatePerformanceChart(metrics) {
        if (!this.charts.performance) return;

        const chart = this.charts.performance;
        const now = new Date().toLocaleTimeString();

        // Add new data point
        chart.data.labels.push(now);
        chart.data.datasets[0].data.push(metrics.requests || 0);
        chart.data.datasets[1].data.push(metrics.errors || 0);

        // Keep only last 20 data points
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            chart.data.datasets[1].data.shift();
        }

        chart.update('none');
    }

    // Modal Management
    showModal(title, content, actions = []) {
        const modal = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');
        const modalActions = document.getElementById('modal-actions');

        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modalActions.innerHTML = actions.map(action => 
            `<button class="btn ${action.class || 'btn-secondary'}" onclick="${action.onclick || 'app.closeModal()'}">${action.text}</button>`
        ).join('');

        modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        modal.classList.remove('active');
    }

    // Test Preview
    showTestPreview() {
        const form = document.getElementById('test-config-form');
        const formData = new FormData(form);
        
        const config = {
            url: formData.get('url') || 'https://example.com',
            users: parseInt(formData.get('users')) || 5,
            duration: formData.get('duration') === 'custom' 
                ? parseInt(formData.get('customDuration')) || 60
                : parseInt(formData.get('duration')) || 60,
            aiEnabled: formData.get('aiEnabled') === 'on',
            reportDir: formData.get('reportDir') || './stormbot-reports'
        };

        const previewCard = document.getElementById('test-preview-card');
        const previewContent = document.getElementById('test-preview-content');

        previewContent.innerHTML = `
            <h4>Command Preview:</h4>
            <pre>node stormbot.js --url ${config.url} --users ${config.users} --duration ${config.duration} --report-dir "${config.reportDir}"${config.aiEnabled ? ' --ai-enabled' : ''}</pre>
            
            <h4>Configuration:</h4>
            <ul>
                <li><strong>Target URL:</strong> ${config.url}</li>
                <li><strong>Simulated Users:</strong> ${config.users}</li>
                <li><strong>Test Duration:</strong> ${config.duration} seconds</li>
                <li><strong>AI-Powered:</strong> ${config.aiEnabled ? 'Yes' : 'No'}</li>
                <li><strong>Report Directory:</strong> ${config.reportDir}</li>
            </ul>
            
            <h4>Expected Output:</h4>
            <ul>
                <li>Real-time performance metrics</li>
                <li>Agent behavior simulation</li>
                <li>Error detection and screenshots</li>
                <li>Comprehensive test report</li>
            </ul>
        `;

        previewCard.style.display = 'block';
    }

    // Report Viewing
    async viewReport(reportId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/reports/${reportId}`);
            const report = await response.json();

            let content = '<div class="report-details">';
            
            if (report.results) {
                const results = report.results;
                content += `
                    <h4>Test Summary</h4>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <div class="metric-value">${results.summary.totalRequests}</div>
                            <div class="metric-label">Total Requests</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${results.summary.totalErrors}</div>
                            <div class="metric-label">Total Errors</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${Math.round(results.summary.avgLoadTime)}ms</div>
                            <div class="metric-label">Avg Load Time</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${results.summary.successfulUsers}/${results.testInfo.users}</div>
                            <div class="metric-label">Successful Users</div>
                        </div>
                    </div>
                `;
            }

            if (report.agents) {
                content += `
                    <h4>Agent Performance</h4>
                    <div class="agents-list">
                        ${report.agents.agents.map(agent => `
                            <div class="agent-item">
                                <strong>${agent.name}</strong> (${agent.persona}): 
                                ${agent.actions} actions, ${agent.errors} errors
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            if (report.screenshots && report.screenshots.length > 0) {
                content += `
                    <h4>Error Screenshots</h4>
                    <div class="screenshots-grid">
                        ${report.screenshots.map(screenshot => `
                            <img src="${this.apiBaseUrl}${screenshot.path}" alt="${screenshot.filename}" 
                                 style="max-width: 200px; margin: 5px; border: 1px solid #ccc;">
                        `).join('')}
                    </div>
                `;
            }

            content += '</div>';

            this.showModal(`Test Report - ${reportId}`, content, [
                { text: 'Close', class: 'btn-secondary' }
            ]);
        } catch (error) {
            console.error('Error loading report:', error);
            this.showToast('Failed to load report', 'error');
        }
    }

    async viewTestDetails(testId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/test/${testId}`);
            const test = await response.json();

            const content = `
                <div class="test-details">
                    <h4>Test Configuration</h4>
                    <ul>
                        <li><strong>URL:</strong> ${test.config.url}</li>
                        <li><strong>Users:</strong> ${test.config.users}</li>
                        <li><strong>Duration:</strong> ${test.config.duration}s</li>
                        <li><strong>AI Enabled:</strong> ${test.config.aiEnabled ? 'Yes' : 'No'}</li>
                        <li><strong>Status:</strong> ${test.status}</li>
                        <li><strong>Started:</strong> ${new Date(test.startTime).toLocaleString()}</li>
                        ${test.endTime ? `<li><strong>Ended:</strong> ${new Date(test.endTime).toLocaleString()}</li>` : ''}
                    </ul>

                    <h4>Metrics</h4>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <div class="metric-value">${test.metrics.requests}</div>
                            <div class="metric-label">Requests</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${test.metrics.errors}</div>
                            <div class="metric-label">Errors</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${test.metrics.agents.length}</div>
                            <div class="metric-label">Agents</div>
                        </div>
                    </div>

                    ${test.logs && test.logs.length > 0 ? `
                        <h4>Recent Logs</h4>
                        <div class="logs-container" style="max-height: 200px;">
                            ${test.logs.map(log => `
                                <div class="log-entry ${log.type}">
                                    <span class="log-time">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span class="log-message">${log.message}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;

            this.showModal(`Test Details - ${testId}`, content, [
                { text: 'Close', class: 'btn-secondary' }
            ]);
        } catch (error) {
            console.error('Error loading test details:', error);
            this.showToast('Failed to load test details', 'error');
        }
    }

    // Settings Management
    loadSettings() {
        const saved = localStorage.getItem('stormbot-settings');
        return saved ? JSON.parse(saved) : {
            apiKey: '',
            defaultUsers: 5,
            defaultDuration: 60,
            autoRefresh: true
        };
    }

    saveSettings() {
        const settings = {
            apiKey: document.getElementById('api-key')?.value || '',
            defaultUsers: parseInt(document.getElementById('default-users')?.value) || 5,
            defaultDuration: parseInt(document.getElementById('default-duration')?.value) || 60,
            autoRefresh: document.getElementById('auto-refresh')?.checked || true
        };

        localStorage.setItem('stormbot-settings', JSON.stringify(settings));
        this.settings = settings;
        
        this.showToast('Settings saved successfully', 'success');
    }

    loadSettingsForm() {
        document.getElementById('api-key').value = this.settings.apiKey || '';
        document.getElementById('default-users').value = this.settings.defaultUsers || 5;
        document.getElementById('default-duration').value = this.settings.defaultDuration || 60;
        document.getElementById('auto-refresh').checked = this.settings.autoRefresh !== false;
    }

    // Utility Functions
    validateUrl(input) {
        try {
            new URL(input.value);
            input.setCustomValidity('');
        } catch {
            input.setCustomValidity('Please enter a valid URL');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    refreshDashboard() {
        this.refreshActiveTests();
        if (this.settings.autoRefresh) {
            // Auto-refresh every 5 seconds when on dashboard
            if (this.currentTab === 'dashboard') {
                setTimeout(() => {
                    if (this.currentTab === 'dashboard') {
                        this.refreshDashboard();
                    }
                }, 5000);
            }
        }
    }
}

// Global functions for onclick handlers
function switchTab(tabName) {
    if (window.app) {
        window.app.switchTab(tabName);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new StormBotApp();
});
