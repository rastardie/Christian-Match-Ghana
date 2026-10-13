import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import MainApp from './MainApp'; // Imports the original App component (default export)
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthorized' | 'unauthenticated'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // PERMISSION CHECK: Only allow specific email or admin role
        // For now, hardcoding the single admin email as requested
        if (user.email === 'christianmatchghanaltd@gmail.com') {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthorized');
        }
      } else {
        setAuthStatus('unauthenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  if (authStatus === 'loading') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
    ); 
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  if (authStatus === 'unauthorized') {
    // If logged in but not admin, redirect to main app
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Dashboard Routes */}
        <Route path="/admin" element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        } />

        {/* All other routes flow to the main user app */}
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
};

export default App;
