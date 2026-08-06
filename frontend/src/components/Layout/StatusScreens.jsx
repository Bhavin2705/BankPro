export function BackendWakeScreen({ message, attempt = null }) {
  return (
    <div className="backend-wake-screen">
      <div className="backend-wake-orb backend-wake-orb-one" />
      <div className="backend-wake-orb backend-wake-orb-two" />
      <div className="backend-wake-card">
        <div className="backend-wake-spinner">
          <span /><span /><span />
        </div>
        <h1>{message}</h1>
        <p>
          {attempt
            ? `Our services are starting up after inactivity. Attempt ${attempt} – reconnecting...`
            : 'Please wait while we initialize your secure session.'}
        </p>
        {attempt && (
          <div className="backend-wake-status">
            Attempt {attempt} – reconnecting automatically
          </div>
        )}
      </div>
    </div>
  );
}

export function SessionExpiredScreen({ onClick }) {
  return (
    <div className="session-expired-screen">
      <h2>Your session has expired</h2>
      <p>Please sign in again to continue.</p>
      <button onClick={onClick}>Go to Login</button>
    </div>
  );
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="error-screen">
      <h2>Something went wrong</h2>
      <p>{message || 'Failed to initialize application'}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}
