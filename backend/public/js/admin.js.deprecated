// Admin Dashboard JavaScript

const ADMIN_PASSWORD = 'admin123'; // Change this to your preferred password
const API_BASE = '/api';

let currentFilter = 'all';
let allLogs = [];
let isLoggedIn = false;

// Check login state on page load
function checkLoginState() {
    const loginState = localStorage.getItem('adminLoggedIn');
    if (loginState === 'true') {
        isLoggedIn = true;
        showDashboard();
        loadActiveVisitors();
        loadLogs();
    }
}

// Login
function login() {
    const password = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        isLoggedIn = true;
        localStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        loadActiveVisitors();
        loadLogs();
        errorElement.textContent = '';
    } else {
        errorElement.textContent = 'Incorrect password';
    }
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
}

// Logout
function logout() {
    isLoggedIn = false;
    localStorage.setItem('adminLoggedIn', 'false');
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('passwordInput').value = '';
}

// Tab Switching
function showTab(tabName, evt) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }

    // Load data for tab
    if (tabName === 'active') {
        loadActiveVisitors();
    } else if (tabName === 'logs') {
        loadLogs();
    } else if (tabName === 'contractors') {
        loadContractors();
    } else if (tabName === 'sharepoint') {
        loadSharePointStats();
    }
}

// Refresh All
function refreshAll() {
    const activeTab = document.querySelector('.tab-content.active').id;
    if (activeTab === 'activeTab') {
        loadActiveVisitors();
    } else if (activeTab === 'logsTab') {
        loadLogs();
    } else if (activeTab === 'contractorsTab') {
        loadContractors();
    } else if (activeTab === 'sharepointTab') {
        loadSharePointStats();
    }
}

// Load Active Visitors
async function loadActiveVisitors() {
    try {
        const response = await fetch(`${API_BASE}/sign-ins/status/active`);
        const data = await response.json();

        if (data.success) {
            displayActiveVisitors(data.data);
        } else {
            console.error('Error loading active visitors:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayActiveVisitors(visitors) {
    const tbody = document.getElementById('activeVisitorsBody');
    const emptyMessage = document.getElementById('activeEmpty');
    const table = document.getElementById('activeVisitorsTable');

    // Update stats
    document.getElementById('activeCount').textContent = visitors.length;
    document.getElementById('visitorCount').textContent = visitors.filter(v => v.visitor_type === 'visitor').length;
    document.getElementById('contractorCount').textContent = visitors.filter(v => v.visitor_type === 'contractor').length;

    if (visitors.length === 0) {
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    tbody.innerHTML = visitors.map((visitor) => {
        const signInTime = new Date(visitor.sign_in_time);
        const duration = getDuration(signInTime);

        return `
            <tr>
                <td><strong>${visitor.full_name}</strong></td>
                <td><span class="badge badge-${visitor.visitor_type}">${visitor.visitor_type.toUpperCase()}</span></td>
                <td>${visitor.company_name || 'N/A'}</td>
                <td>${visitor.visiting_person}</td>
                <td>${formatTime(signInTime)}</td>
                <td>${duration}</td>
                <td>${visitor.purpose_of_visit}</td>
                <td><button class="btn-sign-out" onclick="signOutVisitor(${visitor.id})">Sign Out</button></td>
            </tr>
        `;
    }).join('');
}

// Sign Out Visitor
async function signOutVisitor(id) {
    if (!confirm('Are you sure you want to sign out this visitor?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/sign-ins/${id}/sign-out`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (data.success) {
            alert('Visitor signed out successfully!');
            loadActiveVisitors();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error signing out visitor: ' + error.message);
    }
}

// Load All Logs
async function loadLogs() {
    try {
        console.log('Loading logs from API...');
        const response = await fetch(`${API_BASE}/sign-ins?limit=100`);
        console.log('API Response status:', response.status);

        const data = await response.json();
        console.log('API Response data:', data);

        if (data.success) {
            console.log('Successfully loaded', data.data.length, 'logs');
            allLogs = data.data;
            filterLogs(currentFilter);
        } else {
            console.error('Error loading logs:', data.message);
            alert('Error loading logs: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        alert('Error loading logs: ' + error.message);
    }
}

function filterLogs(filter, evt) {
    console.log('filterLogs called with filter:', filter, 'event:', evt);
    currentFilter = filter;

    // Update filter button states - remove active from all
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active to the correct button
    const filterMap = {
        'all': 'All',
        'signed_in': 'Signed In',
        'signed_out': 'Signed Out',
        'today': 'Today'
    };

    const filterText = filterMap[filter] || 'All';
    console.log('Looking for button with text:', filterText);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.textContent.trim() === filterText) {
            console.log('Found and activating button:', btn.textContent);
            btn.classList.add('active');
        }
    });

    // Apply filter
    let filtered = allLogs;

    if (filter === 'signed_in') {
        console.log('Filtering for signed_in');
        filtered = allLogs.filter(log => log.status === 'signed_in');
    } else if (filter === 'signed_out') {
        console.log('Filtering for signed_out');
        filtered = allLogs.filter(log => log.status === 'signed_out');
    } else if (filter === 'today') {
        console.log('Filtering for today');
        const today = new Date().toISOString().split('T')[0];
        filtered = allLogs.filter(log => log.sign_in_time.startsWith(today));
    } else {
        console.log('Showing all logs');
    }

    console.log('After filter:', filtered.length, 'logs');
    displayLogs(filtered);
}

function displayLogs(logs) {
    console.log('displayLogs called with', logs.length, 'logs');
    const tbody = document.getElementById('logsBody');
    const emptyMessage = document.getElementById('logsEmpty');
    const table = document.getElementById('logsTable');

    console.log('tbody:', tbody, 'table:', table, 'emptyMessage:', emptyMessage);

    if (logs.length === 0) {
        console.log('No logs to display');
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    console.log('Displaying', logs.length, 'logs in table');
    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    tbody.innerHTML = logs.map((log) => {
        return `
            <tr>
                <td><strong>${log.full_name}</strong></td>
                <td><span class="badge badge-${log.visitor_type}">${log.visitor_type.toUpperCase()}</span></td>
                <td><span class="badge badge-${log.status.replace('_', '-')}">${log.status.replace('_', ' ').toUpperCase()}</span></td>
                <td>${log.company_name || 'N/A'}</td>
                <td>${log.phone_number}</td>
                <td>${log.visiting_person}</td>
                <td>${formatTime(new Date(log.sign_in_time))}</td>
                <td>${log.sign_out_time ? formatTime(new Date(log.sign_out_time)) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// SharePoint Functions
async function syncToSharePoint() {
    const progressBar = document.getElementById('spProgress');
    const message = document.getElementById('spMessage');

    progressBar.style.display = 'block';
    message.textContent = '';
    message.className = 'sp-message';

    try {
        const response = await fetch(`${API_BASE}/sharepoint/sync`, {
            method: 'POST'
        });
        const data = await response.json();

        progressBar.style.display = 'none';

        if (data.success) {
            message.textContent = '✅ Successfully synced to SharePoint!';
            message.classList.add('success');
            document.getElementById('spStatusDot').className = 'status-dot online';
            document.getElementById('spStatusText').textContent = 'Connected';
            document.getElementById('spLastSync').textContent = `Last sync: ${new Date().toLocaleString()}`;
        } else {
            message.textContent = '❌ ' + (data.message || data.error || 'Sync failed');
            message.classList.add('error');
        }
    } catch (error) {
        progressBar.style.display = 'none';
        message.textContent = '❌ Error: ' + error.message;
        message.classList.add('error');
    }
}

async function readFromSharePoint() {
    const progressBar = document.getElementById('spProgress');
    const message = document.getElementById('spMessage');

    progressBar.style.display = 'block';
    message.textContent = '';
    message.className = 'sp-message';

    try {
        const response = await fetch(`${API_BASE}/sharepoint/read`);
        const data = await response.json();

        progressBar.style.display = 'none';

        if (data.success) {
            message.textContent = '✅ Successfully read from SharePoint!';
            message.classList.add('success');
        } else {
            message.textContent = '❌ ' + (data.message || data.error || 'Read failed');
            message.classList.add('error');
        }
    } catch (error) {
        progressBar.style.display = 'none';
        message.textContent = '❌ Error: ' + error.message;
        message.classList.add('error');
    }
}

async function loadSharePointStats() {
    try {
        const response = await fetch(`${API_BASE}/sign-ins?limit=1000`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('spTotalRecords').textContent = data.data.length;
            // Note: sharepoint_synced field not in current model
            document.getElementById('spSyncedRecords').textContent = '0';
            document.getElementById('spUnsyncedRecords').textContent = data.data.length;
        }
    } catch (error) {
        console.error('Error loading SharePoint stats:', error);
    }
}

// Utility Functions
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function getDuration(signInTime) {
    const now = new Date();
    const diff = now - signInTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}


// Handle Enter key on password input and setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    checkLoginState();

    // Password input - Enter key
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = btn.getAttribute('data-tab');
            showTab(tabName, e);
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = btn.getAttribute('data-filter');
            filterLogs(filter, e);
        });
    });

    // Header action buttons
    document.getElementById('btnRefresh').addEventListener('click', refreshAll);
    document.getElementById('btnLogout').addEventListener('click', logout);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = btn.getAttribute('data-tab');
            showTab(tab, e);
        });
    });

    // Refresh button
    document.getElementById('btnRefresh').addEventListener('click', refreshAll);

    // Contractor search
    const searchInput = document.getElementById('contractorSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterContractors);
    }
});

// ========================================
// CONTRACTORS MANAGEMENT
// ========================================

let allContractors = [];

// Load contractors from API
async function loadContractors() {
    try {
        const response = await fetch(`${API_BASE}/contractors/approved?limit=100`);
        const data = await response.json();

        if (data.success) {
            allContractors = data.data || [];
            displayContractors(allContractors);
            loadUnauthorizedAttempts();
        } else {
            console.error('Error loading contractors:', data.message);
        }
    } catch (error) {
        console.error('Error loading contractors:', error);
        showMessage('Failed to load contractors', 'error');
    }
}

// Display contractors in table
function displayContractors(contractors) {
    const tbody = document.getElementById('contractorsBody');
    const emptyMessage = document.getElementById('contractorsEmpty');
    const table = document.getElementById('contractorsTable');

    if (contractors.length === 0) {
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    tbody.innerHTML = contractors.map(contractor => `
        <tr>
            <td><strong>${contractor.company_name}</strong></td>
            <td>${contractor.contractor_name || '-'}</td>
            <td>${contractor.email || '-'}</td>
            <td>${contractor.phone_number || '-'}</td>
            <td><span class="badge badge-${contractor.status}">${contractor.status.toUpperCase()}</span></td>
            <td>${contractor.approval_date ? formatTime(new Date(contractor.approval_date)) : '-'}</td>
            <td>${contractor.notes || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editContractor(${contractor.id})">Edit</button>
                <button class="btn-delete" onclick="deleteContractor(${contractor.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Filter contractors by search term
function filterContractors() {
    const searchTerm = document.getElementById('contractorSearchInput').value.toLowerCase();
    const filtered = allContractors.filter(c =>
        c.company_name.toLowerCase().includes(searchTerm) ||
        (c.contractor_name && c.contractor_name.toLowerCase().includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm))
    );
    displayContractors(filtered);
}

// Submit add contractor form
async function submitAddContractor(event) {
    event.preventDefault();

    const companyName = document.getElementById('companyName').value;
    const contractorName = document.getElementById('contractorName').value;
    const email = document.getElementById('contractorEmail').value;
    const phone = document.getElementById('contractorPhone').value;
    const status = document.getElementById('contractorStatus').value;
    const notes = document.getElementById('contractorNotes').value;

    try {
        const response = await fetch(`${API_BASE}/contractors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_name: companyName,
                contractor_name: contractorName || null,
                email: email || null,
                phone_number: phone || null,
                status: status,
                notes: notes || null
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Contractor added successfully', 'success');
            document.getElementById('addContractorForm').reset();
            loadContractors();
        } else {
            showMessage(data.message || 'Failed to add contractor', 'error');
        }
    } catch (error) {
        console.error('Error adding contractor:', error);
        showMessage('Error adding contractor', 'error');
    }
}

// Edit contractor (simplified - just delete and re-add for now)
async function editContractor(id) {
    const contractor = allContractors.find(c => c.id === id);
    if (!contractor) return;

    const newStatus = prompt('Enter new status (approved/pending/denied):', contractor.status);
    if (!newStatus) return;

    if (!['approved', 'pending', 'denied'].includes(newStatus)) {
        alert('Invalid status. Use: approved, pending, or denied');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/contractors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                notes: prompt('Notes (optional):', contractor.notes || '')
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Contractor updated successfully', 'success');
            loadContractors();
        } else {
            showMessage(data.message || 'Failed to update contractor', 'error');
        }
    } catch (error) {
        console.error('Error updating contractor:', error);
        showMessage('Error updating contractor', 'error');
    }
}

// Delete contractor
async function deleteContractor(id) {
    if (!confirm('Are you sure you want to delete this contractor?')) return;

    try {
        const response = await fetch(`${API_BASE}/contractors/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Contractor deleted successfully', 'success');
            loadContractors();
        } else {
            showMessage(data.message || 'Failed to delete contractor', 'error');
        }
    } catch (error) {
        console.error('Error deleting contractor:', error);
        showMessage('Error deleting contractor', 'error');
    }
}

// Load unauthorized attempts
async function loadUnauthorizedAttempts() {
    try {
        const response = await fetch(`${API_BASE}/contractors/unauthorized-attempts?days=30&limit=50`);
        const data = await response.json();

        if (data.success) {
            displayUnauthorizedAttempts(data.data || []);
        }
    } catch (error) {
        console.error('Error loading unauthorized attempts:', error);
    }
}

// Display unauthorized attempts
function displayUnauthorizedAttempts(attempts) {
    const tbody = document.getElementById('unauthorizedAttemptsBody');
    const emptyMessage = document.getElementById('unauthorizedEmpty');
    const table = document.getElementById('unauthorizedAttemptsTable');

    if (attempts.length === 0) {
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    tbody.innerHTML = attempts.map(attempt => `
        <tr>
            <td>${attempt.company_name}</td>
            <td>${attempt.contractor_name}</td>
            <td>${attempt.phone_number || '-'}</td>
            <td>${attempt.email || '-'}</td>
            <td><span class="badge badge-denied">${attempt.reason || 'Not approved'}</span></td>
            <td>${formatTime(new Date(attempt.attempt_time))}</td>
        </tr>
    `).join('');
}

// Show message
function showMessage(message, type) {
    const messageEl = document.getElementById('formMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `form-message ${type}`;
        messageEl.style.display = 'block';
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 4000);
    }
}
