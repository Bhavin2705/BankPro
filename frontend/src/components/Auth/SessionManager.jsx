import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { api } from '../../utils/api';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_LOGOUT_MS = 60 * 1000; // 60 seconds warning
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Background refresh every 5 mins

export const SessionManager = ({ user, onLogout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastActivityRef = useRef(Date.now());
  const showWarningRef = useRef(showWarning);

  showWarningRef.current = showWarning;

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      setSecondsRemaining(60);
      return;
    }

    lastActivityRef.current = Date.now();

    const resetActivity = () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      if (idleTime >= INACTIVITY_LIMIT_MS) {
        setShowWarning(false);
        onLogout('inactivity');
        return;
      }

      lastActivityRef.current = now;
      if (showWarningRef.current) {
        setShowWarning(false);
      }
    };

    const checkInactivity = () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      const warningThreshold = INACTIVITY_LIMIT_MS - WARNING_BEFORE_LOGOUT_MS;

      if (idleTime >= INACTIVITY_LIMIT_MS) {
        setShowWarning(false);
        onLogout('inactivity');
      } else if (idleTime >= warningThreshold) {
        const remaining = Math.max(1, Math.ceil((INACTIVITY_LIMIT_MS - idleTime) / 1000));
        setSecondsRemaining(remaining);
        if (!showWarningRef.current) {
          setShowWarning(true);
        }
      } else if (showWarningRef.current) {
        setShowWarning(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetActivity, { passive: true }));
    window.addEventListener('visibilitychange', handleVisibilityChange);

    const inactivityTimer = setInterval(checkInactivity, 1000);

    const refreshTimer = setInterval(async () => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime < INACTIVITY_LIMIT_MS) {
        try {
          await api.auth.refreshToken();
        } catch {
          // Silent refresh error ignore
        }
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetActivity));
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(inactivityTimer);
      clearInterval(refreshTimer);
    };
  }, [user, onLogout]);

  if (!user || !showWarning) return null;

  const handleStayLoggedIn = async () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    try {
      await api.auth.refreshToken();
    } catch {
      // Silent refresh error ignore
    }
  };

  const handleLogoutNow = () => {
    setShowWarning(false);
    onLogout('manual');
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg, #ffffff)',
        color: 'var(--text-color, #0f172a)',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        border: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#fef3c7',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <Clock size={28} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Session Timeout Warning
        </h3>
        <p style={{ fontSize: '0.925rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          For your security, you will be automatically logged out due to inactivity in{' '}
          <strong style={{ color: '#ef4444' }}>{secondsRemaining} seconds</strong>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={handleLogoutNow}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '0.625rem 1rem' }}
          >
            Logout Now
          </button>
          <button
            onClick={handleStayLoggedIn}
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.625rem 1rem' }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SessionManager;

