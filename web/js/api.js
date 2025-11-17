// API Configuration
// Use relative URL so it works with any hostname/IP
const API_BASE_URL = '/api/v1';

// Get JWT token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Clear auth token and redirect to login
function clearAuthAndRedirect() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

// Helper function for API calls with JWT authentication
async function apiCall(endpoint, method = 'GET', data = null, requiresAuth = true) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Add JWT token to headers if authentication is required
    if (requiresAuth) {
        const token = getAuthToken();
        if (!token) {
            clearAuthAndRedirect();
            throw new Error('No authentication token');
        }
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();

        // Handle authentication errors
        if (response.status === 401) {
            clearAuthAndRedirect();
            throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
            throw new Error(result.message || 'API Error');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication API
const authAPI = {
    login: (username, password) => apiCall('/auth/login', 'POST', { username, password }, false),
    verify: () => apiCall('/auth/verify', 'POST'),
    logout: () => {
        clearAuthAndRedirect();
    }
};

// Contractor APIs
const contractorAPI = {
    // Get all contractors (all statuses) - for dashboard list and stats
    getAll: () => apiCall('/contractors'),

    // Get approved contractors only - for sign-in verification
    getApproved: () => apiCall('/contractors/approved'),

    getById: (id) => apiCall(`/contractors/${id}`),

    create: (data) => apiCall('/contractors', 'POST', data),

    update: (id, data) => apiCall(`/contractors/${id}`, 'PUT', data),

    delete: (id) => apiCall(`/contractors/${id}`, 'DELETE'),

    approve: (id) => apiCall(`/contractors/${id}`, 'PUT', { status: 'approved' }),

    deny: (id) => apiCall(`/contractors/${id}`, 'PUT', { status: 'denied' }),

    // Get single contractor by ID (for editing)
    getSingle: (id) => apiCall(`/contractors/${id}`),
};

// Vehicle APIs
const vehicleAPI = {
    getAll: () => apiCall('/vehicles'),

    getByReg: (registration) => apiCall(`/vehicles/${registration}`),

    // Get single vehicle by ID (for editing) - uses /vehicles/id/:id route
    getSingle: (id) => apiCall(`/vehicles/id/${id}`),

    create: (data) => apiCall('/vehicles', 'POST', data),

    update: (id, data) => apiCall(`/vehicles/${id}`, 'PUT', data),

    delete: (id) => apiCall(`/vehicles/${id}`, 'DELETE'),

    checkout: (data) => apiCall('/vehicles/checkout', 'POST', data),

    checkin: (data) => apiCall('/vehicles/checkin', 'POST', data),

    reportDamage: (data) => apiCall('/vehicles/damage', 'POST', data),
};

// Visitor APIs
const visitorAPI = {
    getAll: () => apiCall('/sign-ins'),

    getActive: () => apiCall('/sign-ins?status=signed_in'),

    getById: (id) => apiCall(`/sign-ins/${id}`),
};

// Statistics API
const statsAPI = {
    getContractorStats: async () => {
        try {
            const contractors = await contractorAPI.getAll();
            const approved = contractors.data.filter(c => c.status === 'approved').length;
            return {
                total: contractors.data.length,
                approved: approved,
            };
        } catch (error) {
            return { total: 0, approved: 0 };
        }
    },

    getVehicleStats: async () => {
        try {
            const vehicles = await vehicleAPI.getAll();
            const inUse = vehicles.data.filter(v => v.status === 'in_use').length;
            return {
                total: vehicles.data.length,
                inUse: inUse,
            };
        } catch (error) {
            return { total: 0, inUse: 0 };
        }
    },
};
