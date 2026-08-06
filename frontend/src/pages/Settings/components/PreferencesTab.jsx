import { Bell, Eye, Globe, Moon, RefreshCw, Sparkles, Sun } from 'lucide-react';

const LANGUAGE_SAMPLES = {
  en: {
    title: 'English Interface Preview',
    welcome: 'Welcome to BankPro! Manage your balances, transfers, and security settings.',
    nav: ['Dashboard', 'Transactions', 'Cards', 'Security', 'Settings'],
    tag: 'English (US / UK)'
  },
  hi: {
    title: 'हिंदी इंटरफेस पूर्वावलोकन (Hindi Interface Preview)',
    welcome: 'BankPro में आपका स्वागत है! अपना बैलेंस, ट्रांसफर और सुरक्षा सेटिंग्स प्रबंधित करें।',
    nav: ['डैशबोर्ड', 'लेन-देन', 'कार्ड्स', 'सुरक्षा', 'सेटिंग्स'],
    tag: 'हिंदी (Hindi)'
  },
  es: {
    title: 'Vista Previa en Español (Spanish Interface Preview)',
    welcome: '¡Bienvenido a BankPro! Gestione sus saldos, transferencias y seguridad.',
    nav: ['Panel', 'Transacciones', 'Tarjetas', 'Seguridad', 'Ajustes'],
    tag: 'Español (Spanish)'
  },
  fr: {
    title: 'Aperçu Interface Français (French Interface Preview)',
    welcome: 'Bienvenue sur BankPro! Gérez vos soldes, virements et paramètres de sécurité.',
    nav: ['Tableau de bord', 'Transactions', 'Cartes', 'Sécurité', 'Paramètres'],
    tag: 'Français (French)'
  }
};

const CURRENCY_SYMBOLS = {
  INR: '₹ (Indian Rupee)',
  USD: '$ (US Dollar)',
  EUR: '€ (Euro)',
  GBP: '£ (British Pound)'
};

const PreferencesTab = ({
  preferencesData,
  handlePreferencesChange,
  handlePreferencesUpdate,
  handleResetPreferences,
  loading
}) => {
  const sample = LANGUAGE_SAMPLES[preferencesData.language] || LANGUAGE_SAMPLES.en;

  return (
    <div>
      <h3 className="settings-section-title">
        <Bell size={20} />
        Preferences & Live Customization
      </h3>

      {/* Live Preview Banner */}
      <div
        className="settings-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          color: 'var(--text-color)',
          borderRadius: '0.75rem',
          padding: '0.875rem 1.25rem',
          marginBottom: '1.5rem'
        }}
      >
        <Eye size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: '0.9rem' }}>
          <strong>Live Preview Active:</strong> Changing Theme, Language, or Currency applies <strong>instantly on your screen</strong>. Click <em>"Save Preferences"</em> to save permanently.
        </div>
      </div>

      <form onSubmit={handlePreferencesUpdate}>
        <div className="settings-grid-250 settings-preferences-grid">
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              name="currency"
              className="form-input"
              value={preferencesData.currency}
              onChange={handlePreferencesChange}
            >
              <option value="INR">INR (Rs)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (Pound)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Language</label>
            <select
              name="language"
              className="form-input"
              value={preferencesData.language}
              onChange={handlePreferencesChange}
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Theme</label>
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

        {/* Live Preview Box */}
        <div
          className="settings-panel settings-top-gap-lg"
          style={{
            background: 'var(--card-bg, #ffffff)',
            border: '2px dashed var(--primary, #2563eb)',
            borderRadius: '1rem',
            padding: '1.25rem',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
              <Sparkles size={18} style={{ color: '#2563eb' }} /> Live Preference Preview Box
            </div>
            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '1rem', background: 'var(--border-color)', fontWeight: 600 }}>
              {sample.tag} • {CURRENCY_SYMBOLS[preferencesData.currency]}
            </span>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', marginBottom: '1rem', fontStyle: 'italic' }}>
            "{sample.welcome}"
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {sample.nav.map((item, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--text-color)',
                  fontWeight: 500
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="settings-panel settings-top-gap-lg">
          <h4 className="settings-panel-title">Notification Channels</h4>
          <div className="settings-list-grid">
            <div className="settings-row-between">
              <div>
                <div className="settings-item-title">Email Notifications</div>
                <div className="settings-item-subtitle">Receive updates via email</div>
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
                <div className="settings-item-subtitle">Receive updates via SMS</div>
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
                <div className="settings-item-subtitle">Receive real-time alerts</div>
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
            <RefreshCw size={16} /> Reset Preview
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesTab;
