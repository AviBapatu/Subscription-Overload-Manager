import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

/** Reads stored user from localStorage */
const getStoredAuth = () => {
    try {
        const raw = localStorage.getItem('som_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(() => getStoredAuth());

    const setUser = useCallback((data) => {
        if (data && data.user && data.token) {
            localStorage.setItem('som_user', JSON.stringify(data.user));
            localStorage.setItem('som_token', data.token);
            setUserState(data.user);
        } else {
            localStorage.removeItem('som_user');
            localStorage.removeItem('som_token');
            setUserState(null);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, [setUser]);

    const value = {
        user,           // full user object { _id, name, email, preferences, ... }
        userId: user?._id || null,
        setUser,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
