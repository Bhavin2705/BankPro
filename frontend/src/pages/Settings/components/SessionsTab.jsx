import { Clock } from 'lucide-react';
import { getTranslation } from '../../../utils/i18n';

const SessionsTab = ({ lang = 'en', sessions, loading, onRefresh }) => (
  <div>
    <div className="settings-header-row">
      <h3 className="settings-section-title settings-no-margin">
        <Clock size={20} />
        {getTranslation('accountSessionInfo', lang)}
      </h3>
      <button type="button" className="btn btn-secondary" onClick={() => onRefresh(true)} disabled={loading}>
        {loading ? getTranslation('refreshing', lang) : getTranslation('refresh', lang)}
      </button>
    </div>

    {sessions ? (
      <div className="settings-sessions-grid">
        <div className="settings-session-card">
          <div className="settings-session-label">{getTranslation('accountCreated', lang)}</div>
          <div className="settings-session-value">{new Date(sessions.accountCreated).toLocaleDateString()}</div>
        </div>

        <div className="settings-session-card">
          <div className="settings-session-label">{getTranslation('accountAge', lang)}</div>
          <div className="settings-session-value">{sessions.accountAge} {getTranslation('days', lang)}</div>
        </div>

        <div className="settings-session-card">
          <div className="settings-session-label">{getTranslation('lastLogin', lang)}</div>
          <div className="settings-session-value">{sessions.lastLogin ? new Date(sessions.lastLogin).toLocaleDateString() : getTranslation('firstLogin', lang)}</div>
        </div>

        <div className="settings-session-card">
          <div className="settings-session-label">{getTranslation('currentSession', lang)}</div>
          <div className="settings-session-value">{sessions.currentSession ? new Date(sessions.currentSession).toLocaleString() : getTranslation('activeNow', lang)}</div>
        </div>
      </div>
    ) : (
      <div className="settings-empty-box">
        <div className="settings-empty-text">
          {loading ? getTranslation('loadingSessionInfo', lang) : getTranslation('noSessionData', lang)}
        </div>
      </div>
    )}
  </div>
);

export default SessionsTab;
