import { Eye, EyeOff, Key, Lock, Shield, CheckCircle2, HelpCircle, Edit3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import api from '../../utils/api';
import clientData from '../../utils/clientData';
import '../../styles/pages/Security.css';
import {
  getRecentLoginHistory,
  INITIAL_ACCOUNT_PIN_FORM,
  INITIAL_PASSWORD_FORM,
  INITIAL_PIN_FORM,
  INITIAL_SECURITY_QUESTIONS_FORM,
  SECURITY_QUESTIONS,
  validateAccountPinForm,
  validatePasswordForm,
  validatePinForm
} from './utils';

const Security = ({ user }) => {
  const getCardId = (card) => String(card?._id || card?.id || '');
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('password');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showCurrentAccountPin, setShowCurrentAccountPin] = useState(false);
  const [showNewAccountPin, setShowNewAccountPin] = useState(false);
  const [showConfirmAccountPin, setShowConfirmAccountPin] = useState(false);
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [pinForm, setPinForm] = useState(INITIAL_PIN_FORM);
  const [accountPinForm, setAccountPinForm] = useState(INITIAL_ACCOUNT_PIN_FORM);
  const [updatingCardPin, setUpdatingCardPin] = useState(false);
  const [updatingAccountPin, setUpdatingAccountPin] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [securityQuestions, setSecurityQuestions] = useState(INITIAL_SECURITY_QUESTIONS_FORM);
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [clientDataState, setClientDataState] = useState({});

  const handlePasswordChange = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const validationError = validatePasswordForm(passwordForm);
    if (validationError) {
      showError(validationError);
      return;
    }

    api.auth.updatePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
      .then((result) => {
        if (result.success) {
          showSuccess(result.message || 'Password updated successfully!');
          setPasswordForm(INITIAL_PASSWORD_FORM);
        } else {
          showError(result.error || 'Password update failed.');
        }
      })
      .catch((updatePasswordError) => {
        showError(updatePasswordError.message || 'Password update failed.');
      });
  };

  const loadCards = useCallback(() => {
    api.cards.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCards(res.data);
          if (res.data.length > 0 && !selectedCardId) setSelectedCardId(getCardId(res.data[0]));
        } else {
          setCards([]);
        }
      })
      .catch((loadCardsError) => {
        
        setCards([]);
      });
  }, [selectedCardId]);

  const handlePinChange = async (event) => {
    event.preventDefault();
    if (updatingCardPin) return;
    setError('');
    setMessage('');

    const validationError = validatePinForm({ selectedCardId, cards, pinForm });
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      setUpdatingCardPin(true);
      const res = await api.cards.updatePin(selectedCardId, { currentPin: pinForm.currentPin, newPin: pinForm.newPin });
      if (res.success) {
        showSuccess(res.message || 'PIN updated successfully for the selected card!');
        setPinForm(INITIAL_PIN_FORM);
        loadCards();
      } else {
        showError(res.error || 'Failed to update PIN');
      }
    } catch (updatePinError) {
      
      showError(updatePinError.message || 'Failed to update PIN');
    } finally {
      setUpdatingCardPin(false);
    }
  };

  const handleAccountPinChange = async (event) => {
    event.preventDefault();
    if (updatingAccountPin) return;
    setError('');
    setMessage('');

    const validationError = validateAccountPinForm(accountPinForm);
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      setUpdatingAccountPin(true);
      const res = await api.users.updatePin({
        currentPin: accountPinForm.currentPin,
        newPin: accountPinForm.newPin
      });
      if (res.success) {
        showSuccess(res.message || 'Account PIN updated successfully!');
        setAccountPinForm(INITIAL_ACCOUNT_PIN_FORM);
      } else {
        showError(res.error || 'Failed to update account PIN');
      }
    } catch (updateAccountPinError) {
      
      showError(updateAccountPinError.message || 'Failed to update account PIN');
    } finally {
      setUpdatingAccountPin(false);
    }
  };

  const handleSecurityQuestions = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!securityQuestions.question1 || !securityQuestions.answer1?.trim()) {
      showError('Please select Question 1 and provide an answer');
      return;
    }

    if (!securityQuestions.question2 || !securityQuestions.answer2?.trim()) {
      showError('Please select Question 2 and provide an answer');
      return;
    }

    if (securityQuestions.question1 === securityQuestions.question2) {
      showError('Please select two different security questions');
      return;
    }

    setSavingQuestions(true);
    try {
      await clientData.setSection('securityQuestions', {
        question1: securityQuestions.question1,
        answer1: securityQuestions.answer1.trim(),
        question2: securityQuestions.question2,
        answer2: securityQuestions.answer2.trim(),
        updatedAt: new Date()
      });

      const updated = await clientData.getClientData();
      setClientDataState(updated || {});
      showSuccess('Security questions saved successfully!');
      setIsEditingQuestions(false);
    } catch (saveError) {
      showError(saveError.message || 'Failed to save security questions');
    } finally {
      setSavingQuestions(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    clientData.getClientData().then((data) => {
      if (mounted && data) {
        setClientDataState(data);
        if (data.securityQuestions?.question1) {
          setSecurityQuestions({
            question1: data.securityQuestions.question1 || '',
            answer1: data.securityQuestions.answer1 || '',
            question2: data.securityQuestions.question2 || '',
            answer2: data.securityQuestions.answer2 || ''
          });
        }
      }
    }).catch(() => { });
    return () => {
      mounted = false;
    };
  }, [user?._id, user?.id]);

  useEffect(() => {
    loadCards();
  }, [user?._id, user?.id, loadCards]);

  const formatDuration = (start, end) => {
    if (!start) return '';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMins = Math.max(0, Math.floor((endTime - startTime) / 60000));
    if (diffMins < 1) return 'less than 1 min';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  };

  const loginHistory = getRecentLoginHistory(clientDataState, user);

  const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="container security-page">
      <div className="security-header">
        <h1 className="security-title">
          Account Security
        </h1>
        <p className="security-subtitle">
          Manage your account security settings and preferences
        </p>
      </div>

      <div className="dashboard-grid security-stats-grid">
        <div className="stat-card">
          <div className="security-stats-row">
            <div>
              <div className="stat-value">Strong</div>
              <div className="stat-label">Password Strength</div>
            </div>
            <Shield size={32} className="security-stats-icon security-stats-icon-ok" />
          </div>
        </div>

        <div className="stat-card">
          <div className="security-stats-row">
            <div>
              <div className="stat-value">{loginHistory.length}</div>
              <div className="stat-label">Recent Logins</div>
            </div>
            <Lock size={32} className="security-stats-icon security-stats-icon-lock" />
          </div>
        </div>

        <div className="stat-card">
          <div className="security-stats-row">
            <div>
              <div className="stat-value">Active</div>
              <div className="stat-label">Account Status</div>
            </div>
            <Key size={32} className="security-stats-icon security-stats-icon-ok" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="security-tab-header">
          <div className="tab-buttons security-tab-buttons">
            <button onClick={() => setActiveTab('password')} className={`tab-btn${activeTab === 'password' ? ' active' : ''}`}>Change Password</button>
            <button onClick={() => setActiveTab('account-pin')} className={`tab-btn${activeTab === 'account-pin' ? ' active' : ''}`}>Account PIN</button>
            <button onClick={() => setActiveTab('pin')} className={`tab-btn${activeTab === 'pin' ? ' active' : ''}`}>Card PIN</button>
            <button onClick={() => setActiveTab('security')} className={`tab-btn${activeTab === 'security' ? ' active' : ''}`}>Security Questions</button>
            <button onClick={() => setActiveTab('history')} className={`tab-btn${activeTab === 'history' ? ' active' : ''}`}>Login & Session History</button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange}>
            <h3 className="security-section-title">Change Password</h3>

            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div className="security-input-wrap">
                <input type={showCurrentPassword ? 'text' : 'password'} className="form-input" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="security-input-toggle">
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="security-input-wrap">
                <input type={showNewPassword ? 'text' : 'password'} className="form-input" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="security-input-toggle">
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="security-input-wrap">
                <input type={showConfirmPassword ? 'text' : 'password'} className="form-input" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="security-input-toggle">
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Update Password</button>
          </form>
        )}

        {activeTab === 'account-pin' && (
          <form onSubmit={handleAccountPinChange}>
            <h3 className="security-section-title">Change Account PIN</h3>

            <div className="form-group">
              <label className="form-label">Current Account PIN</label>
              <div className="security-input-wrap">
                <input type={showCurrentAccountPin ? 'text' : 'password'} className="form-input" maxLength={6} value={accountPinForm.currentPin} onChange={(event) => setAccountPinForm({ ...accountPinForm, currentPin: event.target.value.replace(/\D/g, '') })} required />
                <button type="button" onClick={() => setShowCurrentAccountPin(!showCurrentAccountPin)} className="security-input-toggle">
                  {showCurrentAccountPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Account PIN (4-6 digits)</label>
              <div className="security-input-wrap">
                <input type={showNewAccountPin ? 'text' : 'password'} className="form-input" maxLength={6} value={accountPinForm.newPin} onChange={(event) => setAccountPinForm({ ...accountPinForm, newPin: event.target.value.replace(/\D/g, '') })} required />
                <button type="button" onClick={() => setShowNewAccountPin(!showNewAccountPin)} className="security-input-toggle">
                  {showNewAccountPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Account PIN</label>
              <div className="security-input-wrap">
                <input type={showConfirmAccountPin ? 'text' : 'password'} className="form-input" maxLength={6} value={accountPinForm.confirmPin} onChange={(event) => setAccountPinForm({ ...accountPinForm, confirmPin: event.target.value.replace(/\D/g, '') })} required />
                <button type="button" onClick={() => setShowConfirmAccountPin(!showConfirmAccountPin)} className="security-input-toggle">
                  {showConfirmAccountPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingAccountPin}>{updatingAccountPin ? 'Updating...' : 'Update Account PIN'}</button>
          </form>
        )}

        {activeTab === 'pin' && (
          <form onSubmit={handlePinChange}>
            <h3 className="security-section-title">Change Card PIN</h3>

            {cards.length === 0 ? (
              <div className="security-history-empty">No active debit/credit cards found to update PIN.</div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Select Card</label>
                  <select className="form-input" value={selectedCardId || ''} onChange={(event) => setSelectedCardId(event.target.value)}>
                    {cards.map((card) => (
                      <option key={getCardId(card)} value={getCardId(card)}>
                        {card.cardType || 'Card'} - **** {card.cardNumber?.slice(-4) || '****'} ({card.cardholderName || user?.name || 'Cardholder'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Card PIN</label>
                  <div className="security-input-wrap">
                    <input type={showCurrentPin ? 'text' : 'password'} className="form-input" maxLength={4} value={pinForm.currentPin} onChange={(event) => setPinForm({ ...pinForm, currentPin: event.target.value.replace(/\D/g, '') })} required />
                    <button type="button" onClick={() => setShowCurrentPin(!showCurrentPin)} className="security-input-toggle">
                      {showCurrentPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Card PIN (4 digits)</label>
                  <div className="security-input-wrap">
                    <input type={showNewPin ? 'text' : 'password'} className="form-input" maxLength={4} value={pinForm.newPin} onChange={(event) => setPinForm({ ...pinForm, newPin: event.target.value.replace(/\D/g, '') })} required />
                    <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="security-input-toggle">
                      {showNewPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Card PIN</label>
                  <div className="security-input-wrap">
                    <input type={showConfirmPin ? 'text' : 'password'} className="form-input" maxLength={4} value={pinForm.confirmPin} onChange={(event) => setPinForm({ ...pinForm, confirmPin: event.target.value.replace(/\D/g, '') })} required />
                    <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="security-input-toggle">
                      {showConfirmPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={updatingCardPin}>{updatingCardPin ? 'Updating PIN...' : 'Update Card PIN'}</button>
              </>
            )}
          </form>
        )}

        {activeTab === 'security' && (() => {
          const hasConfiguredQuestions = Boolean(clientDataState?.securityQuestions?.question1 && clientDataState?.securityQuestions?.answer1);

          return (
            <div>
              <h3 className="security-section-title">Security Questions</h3>
              <p className="security-section-subtitle" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                Security questions assist in verifying your identity when recovering your account or resetting credentials.
              </p>

              {hasConfiguredQuestions && !isEditingQuestions ? (
                <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#10b981', fontWeight: '600', fontSize: '1.05rem' }}>
                      <CheckCircle2 size={22} /> Security Questions Configured & Active
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
                      onClick={() => setIsEditingQuestions(true)}
                    >
                      <Edit3 size={16} /> Edit Security Questions
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>
                        Security Question 1
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        {clientDataState.securityQuestions.question1}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Answer: <strong style={{ color: 'var(--primary-color, #38bdf8)', letterSpacing: '2px' }}>••••••••</strong>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>
                        Security Question 2
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                        {clientDataState.securityQuestions.question2 || 'Not set'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Answer: <strong style={{ color: 'var(--primary-color, #38bdf8)', letterSpacing: '2px' }}>••••••••</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSecurityQuestions}>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                      Security Question 1
                    </label>
                    <select
                      className="form-input"
                      style={{ marginBottom: '0.75rem' }}
                      value={securityQuestions.question1}
                      onChange={(event) => {
                        const newQ1 = event.target.value;
                        setSecurityQuestions(prev => ({
                          ...prev,
                          question1: newQ1,
                          question2: prev.question2 === newQ1 ? '' : prev.question2
                        }));
                      }}
                      required
                    >
                      <option value="">Select a security question...</option>
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <option
                          key={`q1-${index}`}
                          value={question}
                          disabled={question === securityQuestions.question2 && question !== ''}
                        >
                          {question} {question === securityQuestions.question2 ? ' (Selected in Question 2)' : ''}
                        </option>
                      ))}
                    </select>

                    <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Answer 1
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type secret answer for Question 1..."
                      value={securityQuestions.answer1}
                      onChange={(event) => setSecurityQuestions({ ...securityQuestions, answer1: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                      Security Question 2
                    </label>
                    <select
                      className="form-input"
                      style={{ marginBottom: '0.75rem' }}
                      value={securityQuestions.question2}
                      onChange={(event) => {
                        const newQ2 = event.target.value;
                        setSecurityQuestions(prev => ({
                          ...prev,
                          question2: newQ2,
                          question1: prev.question1 === newQ2 ? '' : prev.question1
                        }));
                      }}
                      required
                    >
                      <option value="">Select a second security question...</option>
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <option
                          key={`q2-${index}`}
                          value={question}
                          disabled={question === securityQuestions.question1 && question !== ''}
                        >
                          {question} {question === securityQuestions.question1 ? ' (Selected in Question 1)' : ''}
                        </option>
                      ))}
                    </select>

                    <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Answer 2
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type secret answer for Question 2..."
                      value={securityQuestions.answer2}
                      onChange={(event) => setSecurityQuestions({ ...securityQuestions, answer2: event.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingQuestions}>
                      {savingQuestions ? 'Saving...' : (hasConfiguredQuestions ? 'Save Updated Questions' : 'Set Up Security Questions')}
                    </button>
                    {hasConfiguredQuestions && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsEditingQuestions(false)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          );
        })()}

        {activeTab === 'history' && (
          <div>
            <h3 className="security-section-title">Login & Session History</h3>
            <p className="security-section-subtitle">Detailed records of when you logged in and logged out</p>

            {loginHistory.length === 0 ? (
              <div className="security-history-empty">
                No login history available
              </div>
            ) : (
              <div className="transaction-list security-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {loginHistory.map((login, index, allHistory) => {
                  const loginTime = login.loginTime || login.timestamp;
                  const isOnline = !login.logoutTime && index === 0;

                  let logoutText = 'Session currently active';
                  let durationText = formatDuration(loginTime, Date.now());

                  if (!isOnline) {
                    let endObj = login.logoutTime ? new Date(login.logoutTime) : null;
                    if (!endObj) {
                      const prevRealTimeSession = allHistory[index - 1];
                      const startTime = new Date(loginTime);
                      if (prevRealTimeSession) {
                        const nextTime = new Date(prevRealTimeSession.loginTime || prevRealTimeSession.timestamp);
                        endObj = new Date(Math.min(startTime.getTime() + 3600000, nextTime.getTime()));
                      } else {
                        endObj = new Date(startTime.getTime() + 1800000);
                      }
                    }
                    logoutText = formatDate(endObj);
                    durationText = formatDuration(loginTime, endObj);
                  }

                  return (
                    <div key={index} className="transaction-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div className="security-history-main security-history-main-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="security-history-icon-wrap" style={{ background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '50%', color: isOnline ? '#10b981' : 'var(--text-secondary)' }}>
                          <Shield size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                            <span>App Session</span>
                            {isOnline ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.75rem', fontWeight: '600', padding: '0.15rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                                🟢 Active Now
                              </span>
                            ) : (
                              <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '500', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                Ended
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Logged In:</span> <strong>{formatDate(loginTime)}</strong>
                          </div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Logged Out:</span> <strong>{logoutText}</strong>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span>Duration: <strong style={{ color: 'var(--primary-color, #38bdf8)' }}>{durationText}</strong></span>
                            <span>•</span>
                            <span>IP: {login.ip || 'Local'}</span>
                            <span>•</span>
                            <span>{login.device || 'Web Browser'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;


