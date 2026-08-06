import { Lock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecurityTab = ({ loading, twoFactorEnabled, handleTwoFactorToggle }) => {
  const navigate = useNavigate();

  return (
    <div>
      <h3 className="settings-section-title">
        <Lock size={20} />
        Security Settings
      </h3>

      <div className="settings-security-panel settings-top-gap-lg">
        <div className="settings-row-between settings-security-header">
          <div>
            <div className="settings-security-title">Two-Factor Authentication</div>
            <div className="settings-security-subtitle">Add an extra layer of security to your account</div>
          </div>
          <button
            onClick={handleTwoFactorToggle}
            disabled={loading}
            className={`settings-2fa-btn ${twoFactorEnabled ? 'is-enabled' : 'is-disabled'}`}
          >
            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="settings-security-note">
          {twoFactorEnabled
            ? 'Your account is protected with two-factor authentication.'
            : 'Enable two-factor authentication for enhanced security.'}
        </div>
      </div>

      <div className="settings-security-panel settings-top-gap-lg">
        <div className="settings-row-between settings-security-header">
          <div>
            <div className="settings-security-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Password & Security Management
            </div>
            <div className="settings-security-subtitle">
              Manage your password, account PINs, and view login activity in Security Center.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/security')}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Go to Security
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityTab;
