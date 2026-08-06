import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '../../utils/api';

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_LOGOUT_MS = 60 * 1000; // 60 seconds warning
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // Background refresh every 10 mins

export const SessionManager = ({ user, onLogout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastActivityRef = useRef(Date.now());
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      if (showWarning) {
        setShowWarning(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetActivity, { passive: true }));

    const inactivityTimer = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const warningThreshold = INACTIVITY_LIMIT_MS - WARNING_BEFORE_LOGOUT_MS;

      if (idleTime >= INACTIVITY_LIMIT_MS) {
        clearInterval(inactivityTimer);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        onLogout('inactivity');
      } else if (idleTime >= warningThreshold && !showWarning) {
        setShowWarning(true);
        setSecondsRemaining(Math.ceil((INACTIVITY_LIMIT_MS - idleTime) / 1000));

        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              onLogout('inactivity');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 5000);

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
      clearInterval(inactivityTimer);
      clearInterval(refreshTimer);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, onLogout, showWarning]);

  if (!showWarning) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
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
            onClick={() => onLogout('manual')}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '0.625rem 1rem' }}
          >
            Logout Now
          </button>
          <button
            onClick={() => {
              lastActivityRef.current = Date.now();
              setShowWarning(false);
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            }}
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.625rem 1rem' }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
