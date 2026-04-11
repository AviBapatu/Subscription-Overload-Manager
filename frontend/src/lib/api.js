const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Normally fetched from auth context
export const USER_ID = '60d5ecb8b392d70f00000000'; // Dummy ID for development

export const fetchSubscriptions = async () => {
    const res = await fetch(`${API_URL}/subscriptions/${USER_ID}`);
    if (!res.ok) throw new Error('Failed to fetch subscriptions');
    return res.json();
};

export const addSubscription = async (data) => {
    const res = await fetch(`${API_URL}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: USER_ID })
    });
    if (!res.ok) throw new Error('Failed to add subscription');
    return res.json();
};

export const paySubscription = async (id) => {
    const res = await fetch(`${API_URL}/subscriptions/${id}/pay`, {
        method: 'PUT'
    });
    if (!res.ok) throw new Error('Failed to pay for subscription');
    return res.json();
};

export const deleteSubscription = async (id) => {
    const res = await fetch(`${API_URL}/subscriptions/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete subscription');
    return res.json();
};

export const seedUserIfNeeded = async () => {
    // Quick helper to seed a user if it doesn't exist
    await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            _id: USER_ID,
            email: 'test@example.com',
            phoneNumber: '+15555555555',
            name: 'Test User',
            preferences: {
                notifyViaEmail: true,
                notifyViaWhatsApp: false,
                alertDaysBefore: 3
            }
        })
    });
};
