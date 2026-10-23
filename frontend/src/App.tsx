import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import MainApp from './MainApp'; // Imports the original App component (default export)
import AdminLogin from './components/admin/AdminLogin';

// Legacy /admin URLs are handed back to the authenticated MainApp so the
// dashboard is always rendered inside Layout rather than as a standalone page.
const AdminAppEntry = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'unauthorized' | 'unauthenticated'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setStatus('unauthenticated');
        return;
      }

      void (async () => {
        try {
          const accessSnapshot = await getDoc(doc(db, 'adminUsers', user.uid));
          const accessData = accessSnapshot.exists() ? accessSnapshot.data() : {};
          const isLegacySuperAdmin = user.email === 'christianmatchghanaltd@gmail.com' || user.email === 'admin@example.com';
          const isAdmin = isLegacySuperAdmin || accessData.isSuperAdmin === true || accessData.isSystemAdmin === true || (Array.isArray(accessData.permissions) && accessData.permissions.length > 0);
          if (!isAdmin) {
            setStatus('unauthorized');
            return;
          }

          const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
          const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
          localStorage.setItem('cmg_demo_user', JSON.stringify({
            ...profile,
            ...accessData,
            id: user.uid,
            email: user.email || accessData.email,
            isSystemAdmin: accessData.isSystemAdmin === true || isLegacySuperAdmin,
            isSuperAdmin: accessData.isSuperAdmin === true || isLegacySuperAdmin,
            isPremium: true,
            subscriptionStatus: 'active',
            mustChangePassword: false,
          }));
          localStorage.setItem('cmg_current_view', 'ADMIN');
          sessionStorage.setItem('cmg_preserve_session_on_reload', 'true');
          setStatus('redirecting');
          navigate('/', { replace: true });
        } catch (error) {
          console.error('Unable to hand off Admin to the app shell:', error);
          setStatus('unauthorized');
        }
      })();
    });

    return () => unsubscribe();
  }, [navigate]);

  if (status === 'unauthenticated') return <Navigate to="/admin/login" replace />;
  if (status === 'unauthorized') return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="text-sm font-black">Opening Admin inside the app…</div>
    </div>
  );
};

const appBasePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

const App = () => {
  return (
    <Router basename={appBasePath === '/' ? undefined : appBasePath}>
      <Routes>
        {/* Public Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Dashboard routes always hand off into MainApp/Layout. */}
        <Route path="/admin" element={<AdminAppEntry />} />
        <Route path="/admin/*" element={<AdminAppEntry />} />

        {/* All other routes flow to the main user app */}
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
};

export default App;
