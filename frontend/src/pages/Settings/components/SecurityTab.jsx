import { useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Key, Lock, Shield, QrCode, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useNotification } from '../../../components/providers/NotificationProvider';
import api from '../../../utils/api';
import { getTranslation } from '../../../utils/i18n';

const SecurityTab = ({ lang = 'en', user, twoFactorEnabled, onTwoFactorChange }) => {
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
        {getTranslation('securitySettings', lang)}
      </h3>

      {/* 2FA Status Panel */}
      <div className="settings-security-panel settings-top-gap-lg">
        <div className="settings-row-between settings-security-header">
          <div>
            <div className="settings-security-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} className={twoFactorEnabled ? 'text-success' : ''} />
              {getTranslation('twoFactorAuth', lang)}
            </div>
            <div className="settings-security-subtitle">{getTranslation('twoFactorSubtitle', lang)}</div>
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
              <span>{getTranslation('twoFactorEnabledNote', lang)}</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} style={{ color: '#f59e0b' }} />
              <span>{getTranslation('twoFactorDisabledNote', lang)}</span>
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
              <QrCode size={22} style={{ color: 'var(--primary)' }} /> Set Up Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              1. Scan the secret key or enter it into your authenticator app (Google Authenticator / Authy).
            </p>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your 2FA Secret Key:</div>
              <code style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--primary)' }}>
                {twoFactorSetupData.secret}
              </code>
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

      {/* Embedded Security Section Tabs */}
      <div className="settings-panel settings-top-gap-lg" style={{ padding: '1.5rem' }}>
        <div className="tab-buttons" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSecTab('password')}
            className={`btn ${secTab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={() => setSecTab('account-pin')}
            className={`btn ${secTab === 'account-pin' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Account PIN
          </button>
          <button
            type="button"
            onClick={() => setSecTab('card-pin')}
            className={`btn ${secTab === 'card-pin' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Card PIN
          </button>
        </div>

        {/* Change Password Form */}
        {secTab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <h4 style={{ marginBottom: '1rem' }}>Change Account Password</h4>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Current Password</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">New Password (min 8 chars)</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm New Password</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingPassword}>
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Change Account PIN Form */}
        {secTab === 'account-pin' && (
          <form onSubmit={handleAccountPinSubmit}>
            <h4 style={{ marginBottom: '0.5rem' }}>Change Account PIN</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Your Account PIN (4-6 digits) is used for validating internal transfers and payments.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Current Account PIN</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showCurrentAccountPin ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={accountPinForm.currentPin}
                  onChange={(e) => setAccountPinForm({ ...accountPinForm, currentPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowCurrentAccountPin(!showCurrentAccountPin)}
                >
                  {showCurrentAccountPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">New Account PIN (4-6 digits)</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showNewAccountPin ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={accountPinForm.newPin}
                  onChange={(e) => setAccountPinForm({ ...accountPinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowNewAccountPin(!showNewAccountPin)}
                >
                  {showNewAccountPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm New Account PIN</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showConfirmAccountPin ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={accountPinForm.confirmPin}
                  onChange={(e) => setAccountPinForm({ ...accountPinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowConfirmAccountPin(!showConfirmAccountPin)}
                >
                  {showConfirmAccountPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingAccountPin}>
              {updatingAccountPin ? 'Updating...' : 'Update Account PIN'}
            </button>
          </form>
        )}

        {/* Change Card PIN Form */}
        {secTab === 'card-pin' && (
          <form onSubmit={handleCardPinSubmit}>
            <h4 style={{ marginBottom: '1rem' }}>Change Card PIN</h4>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Select Card</label>
              {cards.length === 0 ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No active cards found.</div>
              ) : (
                <select
                  className="form-input"
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                >
                  {cards.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.cardHolder || c.cardName || 'Card'} — **** {String(c.cardNumber || '').slice(-4)} ({c.cardType || 'Debit'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Current Card PIN</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showCurrentCardPin ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={cardPinForm.currentPin}
                  onChange={(e) => setCardPinForm({ ...cardPinForm, currentPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowCurrentCardPin(!showCurrentCardPin)}
                >
                  {showCurrentCardPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">New Card PIN (4-6 digits)</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showNewCardPin ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={cardPinForm.newPin}
                  onChange={(e) => setCardPinForm({ ...cardPinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowNewCardPin(!showNewCardPin)}
                >
                  {showNewCardPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm New Card PIN</label>
              <div className="settings-input-icon-wrap">
                <input
                  type={showConfirmCardPin ? 'text' : 'password'}
                  className="form-input settings-input-icon-pad"
                  value={cardPinForm.confirmPin}
                  onChange={(e) => setCardPinForm({ ...cardPinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  className="settings-input-icon-btn"
                  onClick={() => setShowConfirmCardPin(!showConfirmCardPin)}
                >
                  {showConfirmCardPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingCardPin || !selectedCardId}>
              {updatingCardPin ? 'Updating...' : 'Update Card PIN'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SecurityTab;
