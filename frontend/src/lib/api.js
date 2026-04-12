const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Generic fetch helper ────────────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
    const token = localStorage.getItem('som_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
    }
    return res.json();
};

// ─── Auth ────────────────────────────────────────────────────────────────────
export const registerUser = (email, password, name) =>
    apiFetch('/users/register', { method: 'POST', body: { email, password, name } });

export const loginUser = (email, password) =>
    apiFetch('/users/login', { method: 'POST', body: { email, password } });

export const requestPasswordReset = (email) =>
    apiFetch('/users/forgot-password', { method: 'POST', body: { email } });

export const verifyResetOtp = (email, otp) =>
    apiFetch('/users/verify-otp', { method: 'POST', body: { email, otp } });

export const resetPassword = (email, otp, newPassword) =>
    apiFetch('/users/reset-password', { method: 'POST', body: { email, otp, newPassword } });

// ─── Users ───────────────────────────────────────────────────────────────────
export const fetchUser = (userId) =>
    apiFetch(`/users/${userId}`);

export const updateUserProfile = (userId, data) =>
    apiFetch(`/users/${userId}`, { method: 'PUT', body: data });

export const updateUserPreferences = (userId, prefs) =>
    apiFetch(`/users/${userId}/preferences`, { method: 'PUT', body: prefs });

// ─── Subscriptions: Lists ────────────────────────────────────────────────────
export const fetchSubscriptions = (userId, status) =>
    apiFetch(`/subscriptions/${userId}${status ? `?status=${status}` : ''}`);

export const fetchStats = (userId) =>
    apiFetch(`/subscriptions/${userId}/stats`);

export const fetchUpcoming = (userId, limit = 5) =>
    apiFetch(`/subscriptions/${userId}/upcoming?limit=${limit}`);

export const fetchSpendingHistory = (userId) =>
    apiFetch(`/subscriptions/${userId}/spending-history`);

export const fetchCategoryBreakdown = (userId) =>
    apiFetch(`/subscriptions/${userId}/category-breakdown`);

// ─── Subscriptions: Mutations ─────────────────────────────────────────────────
export const addSubscription = (userId, data) =>
    apiFetch('/subscriptions', { method: 'POST', body: { ...data, userId } });

export const updateSubscription = (id, data) =>
    apiFetch(`/subscriptions/${id}`, { method: 'PUT', body: data });

export const updateSubscriptionStatus = (id, status) =>
    apiFetch(`/subscriptions/${id}/status`, { method: 'PUT', body: { status } });

export const paySubscription = (id) =>
    apiFetch(`/subscriptions/${id}/pay`, { method: 'PUT' });

export const deleteSubscription = (id) =>
    apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
