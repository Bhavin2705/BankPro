import { Bell, RefreshCw } from 'lucide-react';

const PreferencesTab = ({
  preferencesData,
  handlePreferencesChange,
  handlePreferencesUpdate,
  handleResetPreferences,
  loading
}) => (
  <div>
    <h3 className="settings-section-title">
      <Bell size={20} />
      Preferences & Notifications
    </h3>

    <form onSubmit={handlePreferencesUpdate}>
      <div className="settings-grid-250 settings-preferences-grid">
        <div className="form-group">
          <label className="form-label">Preferred Currency</label>
          <select
            name="currency"
            className="form-input"
            value={preferencesData.currency}
            onChange={handlePreferencesChange}
          >
            <option value="INR">INR (Indian Rupee)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="GBP">GBP (British Pound)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Display Theme</label>
          <select
            name="theme"
            className="form-input"
            value={preferencesData.theme}
            onChange={handlePreferencesChange}
          >
            <option value="light">Light Mode</option>
            <option value="dark">Dark Mode</option>
          </select>
        </div>
      </div>

      <div className="settings-panel settings-top-gap-lg">
        <h4 className="settings-panel-title">Notification Channels</h4>
        <div className="settings-list-grid">
          <div className="settings-row-between">
            <div>
              <div className="settings-item-title">Email Notifications</div>
              <div className="settings-item-subtitle">Receive account alerts and statements via email</div>
            </div>
            <input
              type="checkbox"
              name="email"
              checked={preferencesData.notifications.email}
              onChange={handlePreferencesChange}
              className="settings-checkbox"
            />
          </div>

          <div className="settings-row-between">
            <div>
              <div className="settings-item-title">SMS Notifications</div>
              <div className="settings-item-subtitle">Receive transactional OTPs and security alerts via SMS</div>
            </div>
            <input
              type="checkbox"
              name="sms"
              checked={preferencesData.notifications.sms}
              onChange={handlePreferencesChange}
              className="settings-checkbox"
            />
          </div>

          <div className="settings-row-between">
            <div>
              <div className="settings-item-title">Push Notifications</div>
              <div className="settings-item-subtitle">Receive real-time push alerts on your browser</div>
            </div>
            <input
              type="checkbox"
              name="push"
              checked={preferencesData.notifications.push}
              onChange={handlePreferencesChange}
              className="settings-checkbox"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
        <button
          type="button"
          onClick={handleResetPreferences}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <RefreshCw size={16} /> Reset to Defaults
        </button>
      </div>
    </form>
  </div>
);

export default PreferencesTab;
