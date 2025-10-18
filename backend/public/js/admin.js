// Admin Dashboard JavaScript

const ADMIN_PASSWORD = 'admin123'; // Change this to your preferred password
const API_BASE = '/api';

let currentFilter = 'all';
let allLogs = [];

// Login
function login() {
    const password = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        loadActiveVisitors();
        loadLogs();
        errorElement.textContent = '';
    } else {
        errorElement.textContent = 'Incorrect password';
    }
}

// Logout
function logout() {
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('passwordInput').value = '';
}

// Tab Switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');

    // Load data for tab
    if (tabName === 'active') {
        loadActiveVisitors();
    } else if (tabName === 'logs') {
        loadLogs();
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

    tbody.innerHTML = visitors.map((visitor, index) => {
        const signInTime = new Date(visitor.sign_in_time);
        const duration = getDuration(signInTime);

        // Create photo thumbnail with data attribute instead of inline onclick
        const photoHtml = visitor.photo
            ? `<img src="${visitor.photo}" class="photo-thumbnail" data-photo-index="${index}" data-name="${escapeHtml(visitor.full_name)}" alt="Photo" />`
            : '<span class="no-photo">No Photo</span>';

        return `
            <tr>
                <td>${photoHtml}</td>
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

    // Add click handlers to photo thumbnails
    document.querySelectorAll('.photo-thumbnail').forEach((img, idx) => {
        const visitor = visitors[idx];
        if (visitor && visitor.photo) {
            img.addEventListener('click', () => showPhotoModal(visitor.photo, visitor.full_name));
        }
    });
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
        const response = await fetch(`${API_BASE}/sign-ins?limit=100`);
        const data = await response.json();

        if (data.success) {
            allLogs = data.data;
            filterLogs(currentFilter);
        } else {
            console.error('Error loading logs:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function filterLogs(filter) {
    currentFilter = filter;

    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    let filtered = allLogs;

    if (filter === 'signed_in') {
        filtered = allLogs.filter(log => log.status === 'signed_in');
    } else if (filter === 'signed_out') {
        filtered = allLogs.filter(log => log.status === 'signed_out');
    } else if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = allLogs.filter(log => log.sign_in_time.startsWith(today));
    }

    displayLogs(filtered);
}

function displayLogs(logs) {
    const tbody = document.getElementById('logsBody');
    const emptyMessage = document.getElementById('logsEmpty');
    const table = document.getElementById('logsTable');

    if (logs.length === 0) {
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    tbody.innerHTML = logs.map((log, index) => {
        // Create photo thumbnail with data attribute instead of inline onclick
        const photoHtml = log.photo
            ? `<img src="${log.photo}" class="photo-thumbnail" data-photo-index="${index}" data-name="${escapeHtml(log.full_name)}" alt="Photo" />`
            : '<span class="no-photo">No Photo</span>';

        return `
            <tr>
                <td>${photoHtml}</td>
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

    // Add click handlers to photo thumbnails
    document.querySelectorAll('#logsBody .photo-thumbnail').forEach((img, idx) => {
        const log = logs[idx];
        if (log && log.photo) {
            img.addEventListener('click', () => showPhotoModal(log.photo, log.full_name));
        }
    });
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Photo Modal Functions
function showPhotoModal(photoData, name) {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalPhoto');
    const modalCaption = document.getElementById('modalCaption');

    modal.style.display = 'flex';
    modalImg.src = photoData;
    modalCaption.textContent = name;
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    modal.style.display = 'none';
}

// Handle Enter key on password input
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });

    // Close modal when clicking outside the image
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePhotoModal();
            }
        });
    }
});
