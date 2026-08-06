import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Shield, QrCode, CheckCircle2, AlertCircle, X, Copy, Key, ArrowRight } from 'lucide-react';
import { useNotification } from '../../../components/providers/NotificationProvider';
import api from '../../../utils/api';

const SecurityTab = ({ twoFactorEnabled, onTwoFactorChange }) => {
  const { showSuccess, showError } = useNotification();
  const [secTab, setSecTab] = useState('password');

  // Password state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Account PIN state
  const [accountPinForm, setAccountPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [showCurrentAccountPin, setShowCurrentAccountPin] = useState(false);
  const [showNewAccountPin, setShowNewAccountPin] = useState(false);
  const [showConfirmAccountPin, setShowConfirmAccountPin] = useState(false);
  const [updatingAccountPin, setUpdatingAccountPin] = useState(false);

  // Card PIN state
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardPinForm, setCardPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [showCurrentCardPin, setShowCurrentCardPin] = useState(false);
  const [showNewCardPin, setShowNewCardPin] = useState(false);
  const [showConfirmCardPin, setShowConfirmCardPin] = useState(false);
  const [updatingCardPin, setUpdatingCardPin] = useState(false);

  // 2FA Wizard Modal State
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [settingUp2Fa, setSettingUp2Fa] = useState(false);
  const [verifying2Fa, setVerifying2Fa] = useState(false);
  const [disabling2Fa, setDisabling2Fa] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      const res = await api.cards.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setCards(res.data);
        if (res.data.length > 0 && !selectedCardId) {
          setSelectedCardId(res.data[0]._id || res.data[0].id);
        }
      }
    } catch {
      setCards([]);
    }
  }, [selectedCardId]);

  useEffect(() => {
    if (secTab === 'card-pin') {
      loadCards();
    }
  }, [secTab, loadCards]);

  // Password Submit Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (updatingPassword) return;

    if (!passwordForm.currentPassword) {
      showError('Current password is required');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showError('New password must be at least 8 characters long');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      const result = await api.auth.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (result?.success) {
        showSuccess(result.message || 'Password updated successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showError(result?.error || 'Password update failed');
      }
    } catch (err) {
      showError(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Account PIN Submit Handler
  const handleAccountPinSubmit = async (e) => {
    e.preventDefault();
    if (updatingAccountPin) return;

    if (!/^\d{4,6}$/.test(accountPinForm.currentPin)) {
      showError('Current Account PIN must be 4-6 digits');
      return;
    }
    if (!/^\d{4,6}$/.test(accountPinForm.newPin)) {
      showError('New Account PIN must be 4-6 digits');
      return;
    }
    if (accountPinForm.newPin !== accountPinForm.confirmPin) {
      showError('Account PINs do not match');
      return;
    }

    setUpdatingAccountPin(true);
    try {
      const result = await api.users.updatePin({
        currentPin: accountPinForm.currentPin,
        newPin: accountPinForm.newPin
      });
      if (result?.success) {
        showSuccess(result.message || 'Account PIN updated successfully!');
        setAccountPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        showError(result?.error || 'Failed to update Account PIN');
      }
    } catch (err) {
      showError(err.message || 'Failed to update Account PIN');
    } finally {
      setUpdatingAccountPin(false);
    }
  };

  // Card PIN Submit Handler
  const handleCardPinSubmit = async (e) => {
    e.preventDefault();
    if (updatingCardPin) return;

    if (!selectedCardId) {
      showError('Please select a card');
      return;
    }
    if (!/^\d{4,6}$/.test(cardPinForm.currentPin)) {
      showError('Current Card PIN must be 4-6 digits');
      return;
    }
    if (!/^\d{4,6}$/.test(cardPinForm.newPin)) {
      showError('New Card PIN must be 4-6 digits');
      return;
    }
    if (cardPinForm.newPin !== cardPinForm.confirmPin) {
      showError('Card PINs do not match');
      return;
    }

    setUpdatingCardPin(true);
    try {
      const result = await api.cards.updatePin(selectedCardId, {
        currentPin: cardPinForm.currentPin,
        newPin: cardPinForm.newPin
      });
      if (result?.success) {
        showSuccess(result.message || 'Card PIN updated successfully!');
        setCardPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        showError(result?.error || 'Failed to update Card PIN');
      }
    } catch (err) {
      showError(err.message || 'Failed to update Card PIN');
    } finally {
      setUpdatingCardPin(false);
    }
  };

  // Start 2FA Setup Flow
  const handleStart2FaSetup = async () => {
    setSettingUp2Fa(true);
    try {
      const res = await api.settings.setupTwoFactor();
      if (res?.success && res?.data) {
        setTwoFactorSetupData(res.data);
        setVerificationCode('');
        setShow2FaModal(true);
      } else {
        showError(res?.error || 'Failed to initiate 2FA setup');
      }
    } catch (err) {
      showError(err.message || 'Failed to initiate 2FA setup');
    } finally {
      setSettingUp2Fa(false);
    }
  };

  // Verify and Confirm 2FA
  const handleVerify2FaCode = async (e) => {
    e.preventDefault();
    if (!verificationCode || !/^\d{6}$/.test(verificationCode.trim())) {
      showError('Please enter a valid 6-digit code');
      return;
    }

    setVerifying2Fa(true);
    try {
      const res = await api.settings.verifyTwoFactor({
        code: verificationCode.trim(),
        secret: twoFactorSetupData?.secret
      });

      if (res?.success) {
        showSuccess('Two-Factor Authentication enabled successfully!');
        setShow2FaModal(false);
        setTwoFactorSetupData(null);
        setVerificationCode('');
        if (onTwoFactorChange) onTwoFactorChange(true);
      } else {
        showError(res?.error || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      showError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying2Fa(false);
    }
  };

  // Disable 2FA
  const handleDisable2Fa = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication?')) return;
    setDisabling2Fa(true);
    try {
      const res = await api.settings.updateTwoFactor({ enable: false });
      if (res?.success) {
        showSuccess('Two-Factor Authentication disabled successfully.');
        if (onTwoFactorChange) onTwoFactorChange(false);
      } else {
        showError(res?.error || 'Failed to disable Two-Factor Authentication');
      }
    } catch (err) {
      showError(err.message || 'Failed to disable 2FA');
    } finally {
      setDisabling2Fa(false);
    }
  };

  return (
    <div>
      <h3 className="settings-section-title">
        <Lock size={20} />
        Security Settings
      </h3>

      {/* 2FA Status Panel */}
      <div className="settings-security-panel settings-top-gap-lg">
        <div className="settings-row-between settings-security-header">
          <div>
            <div className="settings-security-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} className={twoFactorEnabled ? 'text-success' : ''} />
              Two-Factor Authentication
            </div>
            <div className="settings-security-subtitle">Add an extra verification step to protect your account.</div>
          </div>
          {twoFactorEnabled ? (
            <button
              onClick={handleDisable2Fa}
              disabled={disabling2Fa}
              className="btn btn-secondary"
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
            >
              {disabling2Fa ? 'Disabling...' : 'Disable 2FA'}
            </button>
          ) : (
            <button
              onClick={handleStart2FaSetup}
              disabled={settingUp2Fa}
              className="btn btn-primary"
            >
              {settingUp2Fa ? 'Generating...' : 'Set Up 2FA'}
            </button>
          )}
        </div>
        <div className="settings-security-note" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {twoFactorEnabled ? (
            <>
              <CheckCircle2 size={18} style={{ color: '#10b981' }} />
              <span>Two-factor authentication is enabled.</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} style={{ color: '#f59e0b' }} />
              <span>Two-factor authentication is disabled.</span>
            </>
          )}
        </div>
      </div>

      {/* 2FA Setup Modal Wizard */}
      {show2FaModal && twoFactorSetupData && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px', position: 'relative', padding: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setShow2FaModal(false)}
              style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <QrCode size={22} style={{ color: 'var(--primary-color, #38bdf8)' }} /> Set Up Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'inline-block', background: '#ffffff', padding: '0.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)', marginBottom: '0.85rem' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    twoFactorSetupData.otpauthUrl || `otpauth://totp/BankPro?secret=${twoFactorSetupData.secret}&issuer=BankPro`
                  )}`}
                  alt="2FA QR Code"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Or enter secret key manually:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <code style={{ fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1.5px', color: 'var(--primary-color, #38bdf8)' }}>
                  {twoFactorSetupData.secret}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorSetupData.secret);
                    showSuccess('Secret key copied to clipboard!');
                  }}
                >
                  <Copy size={13} /> Copy Key
                </button>
              </div>
            </div>

            <form onSubmit={handleVerify2FaCode}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">2. Enter 6-digit code from Authenticator App:</label>
                <input
                  type="text"
                  className="form-input"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShow2FaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={verifying2Fa}>
                  {verifying2Fa ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link to Master Security Page */}
      <div className="settings-security-panel settings-top-gap-lg" style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="settings-row-between settings-security-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="settings-security-title" style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Key size={20} style={{ color: 'var(--primary-color, #38bdf8)' }} />
              Passwords, PINs & Session Audit
            </div>
            <div className="settings-security-subtitle" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Manage your Account Password, Card & Account PINs, Security Questions, and view complete Login & Session timestamps on the dedicated Security page.
            </div>
          </div>
          <Link
            to="/security"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Manage Credentials <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SecurityTab;
