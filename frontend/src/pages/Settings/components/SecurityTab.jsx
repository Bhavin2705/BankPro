import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Lock, Shield, QrCode, CheckCircle2, AlertCircle, X, Copy, Check, Key, ArrowRight, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useNotification } from '../../../components/providers/NotificationProvider';
import api from '../../../utils/api';

const SecurityTab = ({ twoFactorEnabled, onTwoFactorChange }) => {
  const { showSuccess, showError } = useNotification();

  // 2FA Wizard Modal State
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [modalError, setModalError] = useState(null);
  const [settingUp2Fa, setSettingUp2Fa] = useState(false);
  const [verifying2Fa, setVerifying2Fa] = useState(false);
  const [disabling2Fa, setDisabling2Fa] = useState(false);

  // Generate QR code locally whenever 2FA modal opens
  useEffect(() => {
    if (show2FaModal && twoFactorSetupData) {
      setModalError(null);
      const url = twoFactorSetupData.otpauthUrl || `otpauth://totp/BankPro?secret=${twoFactorSetupData.secret}&issuer=BankPro`;
      QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then((dataUrl) => setQrCodeUrl(dataUrl))
        .catch(() => setQrCodeUrl(''));
    } else {
      setQrCodeUrl('');
      setCopied(false);
    }
  }, [show2FaModal, twoFactorSetupData]);

  // Start 2FA Setup Flow
  const handleStart2FaSetup = async () => {
    setSettingUp2Fa(true);
    setModalError(null);
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
    setModalError(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
      const msg = 'Please enter a valid 6-digit verification code from your authenticator app';
      setModalError(msg);
      return;
    }

    setVerifying2Fa(true);
    try {
      const res = await api.settings.verifyTwoFactor({
        code: cleanCode,
        secret: twoFactorSetupData?.secret
      });

      if (res?.success) {
        showSuccess('Two-Factor Authentication enabled successfully!');
        setShow2FaModal(false);
        setTwoFactorSetupData(null);
        setVerificationCode('');
        setModalError(null);
        if (onTwoFactorChange) onTwoFactorChange(true);
      } else {
        const msg = res?.error || 'Invalid 6-digit code. Please check your authenticator app (Google Authenticator, Authy, etc.) and try again.';
        setModalError(msg);
      }
    } catch (err) {
      const msg = err.message || 'Invalid 6-digit code. Please check your authenticator app (Google Authenticator, Authy, etc.) and try again.';
      setModalError(msg);
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

  const handleCopyKey = () => {
    if (twoFactorSetupData?.secret) {
      navigator.clipboard.writeText(twoFactorSetupData.secret);
      setCopied(true);
      showSuccess('Secret key copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
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
      {show2FaModal && twoFactorSetupData && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            color: 'var(--text-color, #0f172a)',
            borderRadius: '1rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setShow2FaModal(false)}
              style={{
                position: 'absolute',
                right: '1.25rem',
                top: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #64748b)',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <QrCode size={24} style={{ color: 'var(--primary-color, #38bdf8)' }} />
              Set Up Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #64748b)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              1. Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator):
            </p>

            <div style={{
              background: 'var(--bg-tertiary, #f8fafc)',
              padding: '1.25rem',
              borderRadius: '0.875rem',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '1.25rem'
            }}>
              <div style={{
                background: '#ffffff',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '196px',
                height: '196px',
                marginBottom: '1rem'
              }}>
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="2FA QR Code"
                    style={{ width: '180px', height: '180px', display: 'block', borderRadius: '0.5rem' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary, #64748b)' }}>
                    <Loader2 className="animate-spin" size={28} style={{ color: 'var(--primary-color, #38bdf8)' }} />
                    <span style={{ fontSize: '0.75rem' }}>Generating QR Code...</span>
                  </div>
                )}
              </div>

              <div style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginBottom: '0.5rem', textAlign: 'left' }}>
                Or enter secret key manually:
              </div>
              <div style={{
                width: '100%',
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '0.625rem',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <code style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  fontFamily: 'monospace',
                  color: 'var(--primary-color, #0284c7)',
                  wordBreak: 'break-all'
                }}>
                  {twoFactorSetupData.secret}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={handleCopyKey}
                >
                  {copied ? (
                    <>
                      <Check size={14} style={{ color: '#10b981' }} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Key
                    </>
                  )}
                </button>
              </div>
            </div>

            {modalError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                padding: '0.75rem 1rem',
                borderRadius: '0.625rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                lineHeight: 1.4
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleVerify2FaCode}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                  2. Enter 6-digit code from Authenticator App:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (modalError) setModalError(null);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    textAlign: 'center',
                    letterSpacing: '0.5rem',
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '0.625rem'
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShow2FaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={verifying2Fa}>
                  {verifying2Fa ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 className="animate-spin" size={16} /> Verifying...
                    </span>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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

