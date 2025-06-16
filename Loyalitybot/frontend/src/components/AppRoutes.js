import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import { useUser } from '../context/UserContext';
import Auth from './Auth';
import AuthCallback from './AuthCallback';

const ProtectedRoute = ({ element }) => {
    const { isAuthenticated, loading, isTelegramApp } = useUser();
    console.log('isTelegramApp', isTelegramApp);
    console.log('loading', loading);
    if (loading) return null;

    // Allow access if authenticated or in Telegram app
    if (isAuthenticated || isTelegramApp) {
        return element;
    }

    // Redirect to auth page if not authenticated
    return <Navigate to="/auth" replace />;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<ProtectedRoute element={<Home />} />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;