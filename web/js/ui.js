// UI Utilities

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

// Table rendering helpers
function renderContractorsTable(contractors = []) {
    const tbody = document.getElementById('contractorsList');
    tbody.innerHTML = '';

    if (contractors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No contractors found</td></tr>';
        return;
    }

    contractors.forEach(contractor => {
        const row = document.createElement('tr');
        const approvalDate = contractor.approval_date
            ? new Date(contractor.approval_date).toLocaleDateString()
            : '-';

        row.innerHTML = `
            <td>${contractor.company_name}</td>
            <td>${contractor.contractor_name || '-'}</td>
            <td>${contractor.email || '-'}</td>
            <td>${contractor.phone_number || '-'}</td>
            <td><span class="status-badge ${contractor.status}">${contractor.status}</span></td>
            <td>${approvalDate}</td>
            <td>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="editContractor(${contractor.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${contractor.status === 'pending' ? `
                        <button class="btn btn-success" onclick="approveContractor(${contractor.id})">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger" onclick="denyContractor(${contractor.id})">
                            <i class="fas fa-times"></i> Deny
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteContractor(${contractor.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderVehiclesTable(vehicles = []) {
    const tbody = document.getElementById('vehiclesList');
    tbody.innerHTML = '';

    if (vehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No vehicles found</td></tr>';
        return;
    }

    vehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        const createdDate = new Date(vehicle.created_at).toLocaleDateString();

        row.innerHTML = `
            <td><strong>${vehicle.registration}</strong></td>
            <td><span class="status-badge ${vehicle.status}">${vehicle.status}</span></td>
            <td>${vehicle.current_mileage?.toLocaleString() || '0'} mi</td>
            <td>${vehicle.last_checkout_id ? `#${vehicle.last_checkout_id}` : '-'}</td>
            <td>${createdDate}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-success" onclick="editVehicle(${vehicle.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteVehicle(${vehicle.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderVisitorsTable(visitors = []) {
    const tbody = document.getElementById('visitorsList');
    tbody.innerHTML = '';

    if (visitors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No visitors found</td></tr>';
        return;
    }

    visitors.forEach(visitor => {
        const row = document.createElement('tr');
        const signInTime = new Date(visitor.sign_in_time).toLocaleString();
        const signOutTime = visitor.sign_out_time
            ? new Date(visitor.sign_out_time).toLocaleString()
            : '-';

        row.innerHTML = `
            <td>${visitor.full_name}</td>
            <td><span class="status-badge ${visitor.visitor_type}">${visitor.visitor_type}</span></td>
            <td>${visitor.company_name || '-'}</td>
            <td>${signInTime}</td>
            <td>${signOutTime}</td>
            <td><span class="status-badge ${visitor.status}">${visitor.status}</span></td>
        `;
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
