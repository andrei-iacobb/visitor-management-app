// UI Utilities

// HTML Escape function to prevent XSS attacks
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Whitelist of allowed status values (prevents class injection)
const VALID_STATUSES = ['approved', 'pending', 'denied', 'available', 'in_use', 'maintenance', 'signed_in', 'signed_out', 'visitor', 'contractor'];

function sanitizeStatus(status) {
    if (!status) return '';
    const lower = String(status).toLowerCase();
    return VALID_STATUSES.includes(lower) ? lower : '';
}

// Show alert message
function showAlert(message, type = 'success', duration = 3000) {
    const alertEl = document.getElementById('alert');
    alertEl.textContent = message;
    alertEl.className = `alert show ${type}`;

    setTimeout(() => {
        alertEl.classList.remove('show');
    }, duration);
}

// Switch between pages
function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active');
    }

    // Update sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        contractors: 'Contractors Management',
        vehicles: 'Vehicles Management',
        visitors: 'Visitors Log',
    };
    document.querySelector('.page-title').textContent = titles[pageId] || 'Dashboard';
}

// Modal controls
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

// Helper to create a table cell with safe text content
function createCell(text) {
    const td = document.createElement('td');
    td.textContent = text || '-';
    return td;
}

// Helper to create a status badge safely
function createStatusBadge(status) {
    const span = document.createElement('span');
    span.className = `status-badge ${sanitizeStatus(status)}`;
    span.textContent = status || '';
    return span;
}

// Table rendering helpers - XSS-safe implementations
function renderContractorsTable(contractors = []) {
    const tbody = document.getElementById('contractorsList');
    tbody.innerHTML = '';

    if (contractors.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        cell.textContent = 'No contractors found';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    contractors.forEach(contractor => {
        const row = document.createElement('tr');
        const approvalDate = contractor.approval_date
            ? new Date(contractor.approval_date).toLocaleDateString()
            : '-';

        // Create cells safely using textContent
        row.appendChild(createCell(contractor.company_name));
        row.appendChild(createCell(contractor.contractor_name));
        row.appendChild(createCell(contractor.email));
        row.appendChild(createCell(contractor.phone_number));

        // Status badge
        const statusCell = document.createElement('td');
        statusCell.appendChild(createStatusBadge(contractor.status));
        row.appendChild(statusCell);

        row.appendChild(createCell(approvalDate));

        // Actions cell - IDs are validated as integers
        const actionsCell = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '8px';
        actionsDiv.style.flexWrap = 'wrap';

        // Validate ID is a safe integer
        const contractorId = parseInt(contractor.id, 10);
        if (!isNaN(contractorId) && contractorId > 0) {
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-success';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editBtn.onclick = () => editContractor(contractorId);
            actionsDiv.appendChild(editBtn);

            // Approve/Deny buttons for pending status
            if (contractor.status === 'pending') {
                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn btn-success';
                approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
                approveBtn.onclick = () => approveContractor(contractorId);
                actionsDiv.appendChild(approveBtn);

                const denyBtn = document.createElement('button');
                denyBtn.className = 'btn btn-danger';
                denyBtn.innerHTML = '<i class="fas fa-times"></i> Deny';
                denyBtn.onclick = () => denyContractor(contractorId);
                actionsDiv.appendChild(denyBtn);
            }

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.onclick = () => deleteContractor(contractorId);
            actionsDiv.appendChild(deleteBtn);
        }

        actionsCell.appendChild(actionsDiv);
        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });
}

function renderVehiclesTable(vehicles = []) {
    const tbody = document.getElementById('vehiclesList');
    tbody.innerHTML = '';

    if (vehicles.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        cell.textContent = 'No vehicles found';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    vehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        const createdDate = new Date(vehicle.created_at).toLocaleDateString();

        // Registration (bold)
        const regCell = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = vehicle.registration || '-';
        regCell.appendChild(strong);
        row.appendChild(regCell);

        // Status badge
        const statusCell = document.createElement('td');
        statusCell.appendChild(createStatusBadge(vehicle.status));
        row.appendChild(statusCell);

        // Mileage
        const mileageCell = document.createElement('td');
        mileageCell.textContent = vehicle.current_mileage
            ? vehicle.current_mileage.toLocaleString() + ' mi'
            : '0 mi';
        row.appendChild(mileageCell);

        // Last checkout
        const checkoutCell = document.createElement('td');
        checkoutCell.textContent = vehicle.last_checkout_id
            ? `#${vehicle.last_checkout_id}`
            : '-';
        row.appendChild(checkoutCell);

        // Created date
        row.appendChild(createCell(createdDate));

        // Actions cell
        const actionsCell = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '8px';

        // Validate ID is a safe integer
        const vehicleId = parseInt(vehicle.id, 10);
        if (!isNaN(vehicleId) && vehicleId > 0) {
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-success';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editBtn.onclick = () => editVehicle(vehicleId);
            actionsDiv.appendChild(editBtn);

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            deleteBtn.onclick = () => deleteVehicle(vehicleId);
            actionsDiv.appendChild(deleteBtn);
        }

        actionsCell.appendChild(actionsDiv);
        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });
}

function renderVisitorsTable(visitors = []) {
    const tbody = document.getElementById('visitorsList');
    tbody.innerHTML = '';

    if (visitors.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        cell.textContent = 'No visitors found';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    visitors.forEach(visitor => {
        const row = document.createElement('tr');
        const signInTime = new Date(visitor.sign_in_time).toLocaleString();
        const signOutTime = visitor.sign_out_time
            ? new Date(visitor.sign_out_time).toLocaleString()
            : '-';

        // Name
        row.appendChild(createCell(visitor.full_name));

        // Visitor type badge
        const typeCell = document.createElement('td');
        typeCell.appendChild(createStatusBadge(visitor.visitor_type));
        row.appendChild(typeCell);

        // Company
        row.appendChild(createCell(visitor.company_name));

        // Sign-in time
        row.appendChild(createCell(signInTime));

        // Sign-out time
        row.appendChild(createCell(signOutTime));

        // Status badge
        const statusCell = document.createElement('td');
        statusCell.appendChild(createStatusBadge(visitor.status));
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });
}

// Filter and search helpers
function filterTable(items, searchValue, filterValue = null, searchFields = []) {
    return items.filter(item => {
        // Search filter
        let searchMatch = true;
        if (searchValue) {
            searchMatch = searchFields.some(field => {
                const value = getNestedProperty(item, field);
                return value && value.toString().toLowerCase().includes(searchValue.toLowerCase());
            });
        }

        // Status filter
        let statusMatch = true;
        if (filterValue) {
            statusMatch = item.status === filterValue;
        }

        return searchMatch && statusMatch;
    });
}

function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// Loading state
function setLoadingState(elementId, isLoading) {
    const element = document.getElementById(elementId);
    if (element) {
        if (isLoading) {
            element.disabled = true;
            element.style.opacity = '0.6';
        } else {
            element.disabled = false;
            element.style.opacity = '1';
        }
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
}

// Format numbers
function formatMileage(miles) {
    return miles ? miles.toLocaleString() + ' mi' : '0 mi';
}
