// Global state
let currentContractors = [];
let currentVehicles = [];
let currentVisitors = [];
let editingContractorId = null;
let editingVehicleId = null;

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    showAlert('An unexpected error occurred. Please refresh the page.', 'error');
    // Prevent default browser error handling
    event.preventDefault();
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showAlert('A network error occurred. Please check your connection.', 'error');
    // Prevent default browser error handling
    event.preventDefault();
});

// Check authentication
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }

    // Verify token is valid
    authAPI.verify()
        .then(data => {
            if (!data.valid) {
                clearAuthAndRedirect();
            }
        })
        .catch(() => {
            clearAuthAndRedirect();
        });

    return true;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check authentication first
        if (!checkAuth()) {
            return;
        }

        // Display username
        const username = localStorage.getItem('username');
        if (username) {
            const usernameEl = document.querySelector('.username');
            if (usernameEl) {
                usernameEl.textContent = username;
            }
        }

        initializeEventListeners();
        loadDashboard();
    } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('Failed to initialize application. Please refresh the page.', 'error');
    }
});

// Event Listeners
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);

            if (page === 'contractors') loadContractors();
            else if (page === 'vehicles') loadVehicles();
            else if (page === 'visitors') loadVisitors();
        });
    });

    // Modal controls
    document.getElementById('addContractorBtn').addEventListener('click', openAddContractorModal);
    document.getElementById('addVehicleBtn').addEventListener('click', openAddVehicleModal);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.remove('show');
        });
    });

    document.getElementById('contractorModalClose').addEventListener('click', () => {
        closeModal('contractorModal');
    });

    document.getElementById('vehicleModalClose').addEventListener('click', () => {
        closeModal('vehicleModal');
    });

    // Close modal when clicking outside
    document.getElementById('contractorModal').addEventListener('click', (e) => {
        if (e.target.id === 'contractorModal') {
            closeModal('contractorModal');
        }
    });

    document.getElementById('vehicleModal').addEventListener('click', (e) => {
        if (e.target.id === 'vehicleModal') {
            closeModal('vehicleModal');
        }
    });

    // Form submissions
    document.getElementById('contractorForm').addEventListener('submit', handleContractorFormSubmit);
    document.getElementById('vehicleForm').addEventListener('submit', handleVehicleFormSubmit);

    // Filters and search
    document.getElementById('contractorSearch').addEventListener('input', filterContractors);
    document.getElementById('contractorFilter').addEventListener('change', filterContractors);

    document.getElementById('vehicleSearch').addEventListener('input', filterVehicles);
    document.getElementById('vehicleFilter').addEventListener('change', filterVehicles);

    document.getElementById('visitorSearch').addEventListener('input', filterVisitors);
    document.getElementById('visitorFilter').addEventListener('change', filterVisitors);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            authAPI.logout();
        }
    });
}

// Dashboard
async function loadDashboard() {
    try {
        const contractorStats = await statsAPI.getContractorStats();
        const vehicleStats = await statsAPI.getVehicleStats();

        document.getElementById('totalContractors').textContent = contractorStats.total;
        document.getElementById('approvedContractors').textContent = contractorStats.approved;
        document.getElementById('totalVehicles').textContent = vehicleStats.total;
        document.getElementById('vehiclesInUse').textContent = vehicleStats.inUse;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('Error loading dashboard', 'error');
    }
}

// Contractors Management
async function loadContractors() {
    try {
        const result = await contractorAPI.getAll();
        currentContractors = result.data || [];
        renderContractorsTable(currentContractors);
    } catch (error) {
        console.error('Error loading contractors:', error);
        showAlert('Error loading contractors', 'error');
    }
}

function openAddContractorModal() {
    editingContractorId = null;
    resetForm('contractorForm');
    document.getElementById('contractorModalTitle').textContent = 'Add Contractor';
    openModal('contractorModal');
}

async function editContractor(id) {
    try {
        // Fetch fresh data from server to ensure we have all fields
        const result = await contractorAPI.getSingle(id);
        const contractor = result.data;

        editingContractorId = id;
        document.getElementById('companyName').value = contractor.company_name || '';
        document.getElementById('contractorName').value = contractor.contractor_name || '';
        document.getElementById('contractorEmail').value = contractor.email || '';
        document.getElementById('contractorPhone').value = contractor.phone_number || '';
        document.getElementById('contractorStatus').value = contractor.status || 'pending';
        document.getElementById('contractorNotes').value = contractor.notes || '';

        document.getElementById('contractorModalTitle').textContent = 'Edit Contractor';
        openModal('contractorModal');
    } catch (error) {
        console.error('Error loading contractor for edit:', error);
        showAlert('Error loading contractor data: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function handleContractorFormSubmit(e) {
    e.preventDefault();

    const data = {
        company_name: document.getElementById('companyName').value,
        contractor_name: document.getElementById('contractorName').value,
        email: document.getElementById('contractorEmail').value,
        phone_number: document.getElementById('contractorPhone').value,
        status: document.getElementById('contractorStatus').value,
        notes: document.getElementById('contractorNotes').value,
    };

    try {
        if (editingContractorId) {
            await contractorAPI.update(editingContractorId, data);
            showAlert('Contractor updated successfully', 'success');
        } else {
            await contractorAPI.create(data);
            showAlert('Contractor added successfully', 'success');
        }

        closeModal('contractorModal');
        loadContractors();
    } catch (error) {
        console.error('Error saving contractor:', error);
        showAlert(error.message || 'Error saving contractor', 'error');
    }
}

async function approveContractor(id) {
    if (!confirm('Approve this contractor?')) return;

    try {
        await contractorAPI.approve(id);
        showAlert('Contractor approved successfully', 'success');
        loadContractors();
    } catch (error) {
        console.error('Error approving contractor:', error);
        showAlert('Error approving contractor', 'error');
    }
}

async function denyContractor(id) {
    if (!confirm('Deny this contractor?')) return;

    try {
        await contractorAPI.deny(id);
        showAlert('Contractor denied', 'success');
        loadContractors();
    } catch (error) {
        console.error('Error denying contractor:', error);
        showAlert('Error denying contractor', 'error');
    }
}

async function deleteContractor(id) {
    if (!confirm('Are you sure you want to delete this contractor?')) return;

    try {
        await contractorAPI.delete(id);
        showAlert('Contractor deleted successfully', 'success');
        loadContractors();
    } catch (error) {
        console.error('Error deleting contractor:', error);
        showAlert('Error deleting contractor', 'error');
    }
}

function filterContractors() {
    const searchValue = document.getElementById('contractorSearch').value;
    const filterValue = document.getElementById('contractorFilter').value;

    const filtered = filterTable(
        currentContractors,
        searchValue,
        filterValue,
        ['company_name', 'contractor_name', 'email']
    );

    renderContractorsTable(filtered);
}

// Vehicles Management
async function loadVehicles() {
    try {
        const result = await vehicleAPI.getAll();
        currentVehicles = result.data || [];
        renderVehiclesTable(currentVehicles);
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showAlert('Error loading vehicles', 'error');
    }
}

function openAddVehicleModal() {
    editingVehicleId = null;
    resetForm('vehicleForm');
    document.getElementById('vehicleModalTitle').textContent = 'Add Vehicle';
    openModal('vehicleModal');
}

async function editVehicle(id) {
    try {
        // Fetch fresh data from server to ensure we have all fields
        const result = await vehicleAPI.getSingle(id);
        const vehicle = result.data;

        editingVehicleId = id;
        document.getElementById('vehicleReg').value = vehicle.registration || '';
        document.getElementById('vehicleStatus').value = vehicle.status || 'available';
        document.getElementById('vehicleMileage').value = vehicle.current_mileage || 0;

        document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
        openModal('vehicleModal');
    } catch (error) {
        console.error('Error loading vehicle for edit:', error);
        showAlert('Error loading vehicle data: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function handleVehicleFormSubmit(e) {
    e.preventDefault();

    const data = {
        registration: document.getElementById('vehicleReg').value,
        status: document.getElementById('vehicleStatus').value,
        current_mileage: parseInt(document.getElementById('vehicleMileage').value) || 0,
    };

    try {
        if (editingVehicleId) {
            await vehicleAPI.update(editingVehicleId, data);
            showAlert('Vehicle updated successfully', 'success');
        } else {
            await vehicleAPI.create(data);
            showAlert('Vehicle added successfully', 'success');
        }

        closeModal('vehicleModal');
        loadVehicles();
    } catch (error) {
        console.error('Error saving vehicle:', error);
        showAlert(error.message || 'Error saving vehicle', 'error');
    }
}

async function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
        await vehicleAPI.delete(id);
        showAlert('Vehicle deleted successfully', 'success');
        loadVehicles();
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        showAlert('Error deleting vehicle', 'error');
    }
}

function filterVehicles() {
    const searchValue = document.getElementById('vehicleSearch').value;
    const filterValue = document.getElementById('vehicleFilter').value;

    const filtered = filterTable(
        currentVehicles,
        searchValue,
        filterValue,
        ['registration']
    );

    renderVehiclesTable(filtered);
}

// Visitors Management
async function loadVisitors() {
    try {
        const result = await visitorAPI.getAll();
        currentVisitors = result.data || [];
        renderVisitorsTable(currentVisitors);
    } catch (error) {
        console.error('Error loading visitors:', error);
        showAlert('Error loading visitors', 'error');
    }
}

function filterVisitors() {
    const searchValue = document.getElementById('visitorSearch').value;
    const filterValue = document.getElementById('visitorFilter').value;

    const filtered = filterTable(
        currentVisitors,
        searchValue,
        filterValue,
        ['full_name', 'company_name', 'email']
    );

    renderVisitorsTable(filtered);
}
