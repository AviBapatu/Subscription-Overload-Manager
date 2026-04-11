import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/AuthContext';
import TopNavBar from './components/TopNavBar';
import MobileNav from './components/MobileNav';
import Dashboard from './components/Dashboard';
import SubscriptionsGrid from './components/SubscriptionsGrid';
import Profile from './components/Profile';
import Login from './components/Login';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30_000, // 30 seconds
        }
    }
});

/** Route guard — redirects to /login if not authenticated */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
};

const AppShell = () => {
    const { isAuthenticated } = useAuth();
    return (
        <div className="flex flex-col min-h-screen">
            {isAuthenticated && <TopNavBar />}
            <main className={`flex-1 ${isAuthenticated ? 'pt-28 pb-20 px-6 md:px-10 max-w-[1600px] mx-auto w-full' : ''}`}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsGrid /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            {isAuthenticated && <MobileNav />}
        </div>
    );
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <Router>
                <AppShell />
            </Router>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
