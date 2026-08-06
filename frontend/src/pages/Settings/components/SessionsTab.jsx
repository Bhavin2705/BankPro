import { Clock } from 'lucide-react';

const SessionsTab = ({ sessions, loading, onRefresh }) => (
  <div>
    <div className="settings-header-row">
      <h3 className="settings-section-title settings-no-margin">
        <Clock size={20} />
        Account Session Info
      </h3>
      <button type="button" className="btn btn-secondary" onClick={() => onRefresh(true)} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>

    {sessions ? (
      <div className="settings-sessions-grid">
        <div className="settings-session-card">
          <div className="settings-session-label">Account Created</div>
          <div className="settings-session-value">{new Date(sessions.accountCreated).toLocaleDateString()}</div>
        </div>

        <div className="settings-session-card">
          <div className="settings-session-label">Account Age</div>
          <div className="settings-session-value">{sessions.accountAge} days</div>
        </div>

        <div className="settings-session-card">
          <div className="settings-session-label">Last Login</div>
          <div className="settings-session-value">{sessions.lastLogin ? new Date(sessions.lastLogin).toLocaleDateString() : 'First login'}</div>
        </div>

        <div className="settings-session-card">
          <div className="settings-session-label">Current Session</div>
          <div className="settings-session-value">{sessions.currentSession ? new Date(sessions.currentSession).toLocaleString() : 'Active now'}</div>
        </div>
      </div>
    ) : (
      <div className="settings-empty-box">
        <div className="settings-empty-text">
          {loading ? 'Loading session info...' : 'No session data available.'}
        </div>
      </div>
    )}
  </div>
);

export default SessionsTab;
