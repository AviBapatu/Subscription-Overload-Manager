import axios from 'axios';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('som_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor — unwrap data, normalise errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'An unexpected error occurred';
        return Promise.reject(new Error(message));
    }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const registerUser  = (email, password, name) =>
    api.post('/users/register', { email, password, name });

export const loginUser = (email, password) =>
    api.post('/users/login', { email, password });

export const googleLoginApi = (googleToken) =>
    api.post('/users/google', { token: googleToken });

export const requestPasswordReset = (email) =>
    api.post('/users/forgot-password', { email });

export const verifyResetOtp = (email, otp) =>
    api.post('/users/verify-otp', { email, otp });

export const resetPassword = (email, otp, newPassword) =>
    api.post('/users/reset-password', { email, otp, newPassword });

// ─── Users ────────────────────────────────────────────────────────────────────
export const fetchUser = (userId) =>
    api.get(`/users/${userId}`);

export const updateUserProfile = (userId, data) =>
    api.put(`/users/${userId}`, data);

export const updateUserPreferences = (userId, prefs) =>
    api.put(`/users/${userId}/preferences`, prefs);

export const sendTestEmail = (userId) =>
    api.post(`/users/${userId}/test-email`);

// ─── Subscriptions: Queries ───────────────────────────────────────────────────
export const fetchSubscriptions = (userId, status) =>
    api.get(`/subscriptions/${userId}${status ? `?status=${status}` : ''}`);

export const fetchStats = (userId) =>
    api.get(`/subscriptions/${userId}/stats`);

export const fetchUpcoming = (userId, limit = 5) =>
    api.get(`/subscriptions/${userId}/upcoming?limit=${limit}`);

export const fetchSpendingHistory = (userId) =>
    api.get(`/subscriptions/${userId}/spending-history`);

export const fetchCategoryBreakdown = (userId) =>
    api.get(`/subscriptions/${userId}/category-breakdown`);

export const fetchInsights = () =>
    api.get('/subscriptions/insights');

export const fetchUpcomingTimeline = () =>
    api.get('/subscriptions/upcoming');

// ─── Subscriptions: Mutations ─────────────────────────────────────────────────
export const addSubscription = (userId, data) =>
    api.post('/subscriptions', { ...data, userId });

export const updateSubscription = (id, data) =>
    api.put(`/subscriptions/${id}`, data);

export const updateSubscriptionStatus = (id, status) =>
    api.put(`/subscriptions/${id}/status`, { status });

export const paySubscription = (id) =>
    api.put(`/subscriptions/${id}/pay`);

export const ignoreSubscription = (id) =>
    api.patch(`/subscriptions/${id}/ignore`);

export const deleteSubscription = (id) =>
    api.delete(`/subscriptions/${id}`);

export const syncFromGmail = (userId, accessToken) =>
    api.post('/subscriptions/sync-gmail', { userId, accessToken });

export const setupAutoSync = (userId, code) =>
    api.post('/subscriptions/auto-setup', { userId, code });
