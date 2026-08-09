import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, BrowserRouter as Router } from 'react-router-dom';

import { NotificationProvider } from './components/providers/NotificationProvider';
import Sidebar from './components/Layout/Sidebar';
import { BackendWakeScreen, SessionExpiredScreen, ErrorScreen } from './components/Layout/StatusScreens';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import PasswordResetSuccess from './components/Auth/PasswordResetSuccess';
import SessionManager from './components/Auth/SessionManager';

import Dashboard from './components/Dashboard/Dashboard';
import {
  AdminBanks,
  AdminKyc,
  CardControls,
  Budget,
  Cards,
  CurrencyExchange,
  Notifications,
  Payments,
  Security,
  Settings,
  Statements,
  Transactions,
  Users,
} from './pages';

import { api, checkBackendHealth, clearLegacyLocalStorage } from './utils/api';
import { setExchangeRates } from './utils/currency';
import {
  canAccessAdminFeatures,
  initializeUsers,
  isPageReload,
  isSessionActive,
  logout,
  refreshUserData,
  writeStoredUser,
} from './utils/auth';

function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({ type: 'loading', message: 'Preparing Your Workspace', attempt: 0, error: null });
  const [darkMode, setDarkMode] = useState(false);

  const retryTimeoutRef = useRef(null);

  // Send beacon logout on tab close
  useEffect(() => {
    const handlePageHide = (e) => {
      if (!e.persisted) {
        try {
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(`${API_BASE_URL}/auth/logout`);
          }
        } catch {
          // silent
        }
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  // ──────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────

  const applyTheme = (userData) => {
    const isDark = userData?.preferences?.theme === 'dark';
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };

  const toggleDarkMode = async () => {
    if (!user) return;

    const nextDark = !darkMode;
    applyTheme({ ...user, preferences: { ...user.preferences, theme: nextDark ? 'dark' : 'light' } });

    try {
      const updated = {
        ...user.preferences,
        theme: nextDark ? 'dark' : 'light',
      };
      const res = await api.settings.updatePreferences(updated);
      if (res?.success) {
        setUser((prev) => ({ ...prev, preferences: res.data }));
      }
    } catch {
      applyTheme(user);
    }
  };

  const handleLogin = (userData) => {
    writeStoredUser(userData);
    setUser(userData);
    applyTheme(userData);
    setStatus({ type: 'ready' });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      applyTheme(null);
      setStatus({ type: 'ready' });
    }
  };

  const handleSessionExpired = () => {
    document.cookie = 'bank_auth_token=; path=/; max-age=0';
    document.cookie = 'bank_auth_refresh_token=; path=/; max-age=0';
    setUser(null);
    setStatus({ type: 'ready' });
  };

  const handleUserUpdate = (updatedUser) => {
    setUser((prevUser) => {
      const nextUser = typeof updatedUser === 'function' ? updatedUser(prevUser) : updatedUser;
      applyTheme(nextUser);
      writeStoredUser(nextUser);
      return nextUser;
    });
  };

  // ──────────────────────────────────────────────
  //  Initialization & Health check
  // ──────────────────────────────────────────────

  const scheduleRetry = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    setStatus((prev) => ({
      type: 'waking',
      message: 'Waking Secure Banking Services',
      attempt: prev.attempt + 1,
    }));

    retryTimeoutRef.current = setTimeout(() => initializeApp({ silent: true }), 5000);
  };

  const initializeApp = async ({ silent = false } = {}) => {
    clearLegacyLocalStorage();
    if (!silent) setStatus({ type: 'loading', message: 'Preparing Your Workspace', attempt: 0, error: null });

    const pathname = window.location.pathname;
    const isAuthPage = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/password-reset-success',
    ].some((p) => pathname.startsWith(p));

    if (!(await checkBackendHealth())) {
      scheduleRetry();
      return;
    }

    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    try {
      await Promise.race([
        initializeUsers(),
        new Promise((_, r) => setTimeout(() => r(new Error('init timeout')), 3000)),
      ]).catch(() => {});

      if (!isAuthPage) {
        if (!isPageReload() || !isSessionActive()) {
          await logout();
          setUser(null);
          applyTheme(null);
          setStatus({ type: 'ready' });
          return;
        }

        const freshUser = await Promise.race([
          refreshUserData(),
          new Promise((_, r) => setTimeout(() => r(new Error('refresh timeout')), 5000)),
        ]).catch(() => null);

        if (freshUser) {
          setUser(freshUser);
          applyTheme(freshUser);
          setStatus({ type: 'ready' });
        } else {
          setUser(null);
          applyTheme(null);
          const hasToken = document.cookie.includes('token=') || document.cookie.includes('refreshToken=');
          setStatus(hasToken ? { type: 'session-expired' } : { type: 'ready' });
        }
      } else {
        setUser(null);
        applyTheme(null);
        setStatus({ type: 'ready' });
      }
    } catch (err) {
      setStatus({ type: 'error', error: err.message || 'Initialization failed' });
    }
  };

  useEffect(() => {
    if (!user?.preferences?.currency) {
      setExchangeRates(null);
      return;
    }

    (async () => {
      try {
        const res = await api.exchange.getRates();
        if (res?.success && res.rates) {
          setExchangeRates(res.rates);
        }
      } catch (err) {
        console.debug('Exchange rates unavailable:', err?.message || 'unknown error');
      }
    })();
  }, [user?._id, user?.preferences?.currency]);

  useEffect(() => {
    initializeApp();
    return () => clearTimeout(retryTimeoutRef.current);
  }, []);

  // ──────────────────────────────────────────────
  //  Route Wrappers
  // ──────────────────────────────────────────────

  const AuthWrapper = ({ children }) => (user ? <Navigate to="/dashboard" replace /> : children);

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && !canAccessAdminFeatures(user)) return <Navigate to="/dashboard" replace />;
    return children;
  };

  const Layout = ({ children }) => (
    <div className="app-layout">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <main className="main-content">{children}</main>
    </div>
  );

  // ──────────────────────────────────────────────
  //  Render
  // ──────────────────────────────────────────────

  if (status.type === 'loading') {
    return <BackendWakeScreen message={status.message || 'Preparing Your Workspace'} />;
  }

  if (status.type === 'session-expired') {
    return (
      <SessionExpiredScreen
        onClick={() => {
          handleSessionExpired();
          window.location.href = '/login';
        }}
      />
    );
  }

  if (status.type === 'waking') {
    return <BackendWakeScreen message="Waking Secure Banking Services" attempt={status.attempt} />;
  }

  if (status.type === 'error') {
    return (
      <ErrorScreen
        message={status.error}
        onRetry={() => {
          initializeApp();
        }}
      />
    );
  }

  return (
    <Router>
      <NotificationProvider>
        <SessionManager user={user} onLogout={handleLogout} />
        <Routes>
            {/* Public / Auth routes */}
            <Route path="/login" element={<AuthWrapper><Login onLogin={handleLogin} /></AuthWrapper>} />
            <Route path="/register" element={<AuthWrapper><Register onLogin={handleLogin} /></AuthWrapper>} />
            <Route path="/forgot-password" element={<AuthWrapper><ForgotPassword /></AuthWrapper>} />
            <Route
              path="/reset-password/:token"
              element={
                <AuthWrapper>
                  <ResetPassword onSuccess={() => window.location.href = '/password-reset-success'} />
                </AuthWrapper>
              }
            />
            <Route path="/password-reset-success" element={<AuthWrapper><PasswordResetSuccess /></AuthWrapper>} />

            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard user={user} /></Layout></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />
            <Route path="/cards" element={<ProtectedRoute><Layout><Cards user={user} /></Layout></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Layout><Payments user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />
            <Route path="/security" element={<ProtectedRoute><Layout><Security user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />
            <Route path="/statements" element={<ProtectedRoute><Layout><Statements user={user} /></Layout></ProtectedRoute>} />
            <Route path="/currency-exchange" element={<ProtectedRoute><Layout><CurrencyExchange user={user} /></Layout></ProtectedRoute>} />
            <Route path="/budget" element={<ProtectedRoute><Layout><Budget user={user} /></Layout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings user={user} onUserUpdate={handleUserUpdate} /></Layout></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin-banks" element={<ProtectedRoute adminOnly><Layout><AdminBanks /></Layout></ProtectedRoute>} />
            <Route path="/admin-kyc" element={<ProtectedRoute adminOnly><Layout><AdminKyc /></Layout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><Layout><Users user={user} /></Layout></ProtectedRoute>} />
            <Route path="/card-controls" element={<ProtectedRoute adminOnly><Layout><CardControls /></Layout></ProtectedRoute>} />

            {/* Fallback / root */}
            <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </Router>
  );
}

export default App;
