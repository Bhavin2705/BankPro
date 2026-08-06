import { Eye, EyeOff, Key, Lock, Shield } from 'lucide-react';
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

  const handleSecurityQuestions = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!securityQuestions.question1 || !securityQuestions.answer1) {
      showError('Please fill in at least one security question');
      return;
    }

    clientData.setSection('securityQuestions', securityQuestions)
      .then(() => showSuccess('Security questions updated successfully!'))
      .catch((saveSecurityQuestionsError) => showError(saveSecurityQuestionsError.message || 'Failed to save security questions'));
  };

  useEffect(() => {
    let mounted = true;
    clientData.getClientData().then((data) => {
      if (mounted) setClientDataState(data || {});
    }).catch(() => { });
    return () => {
      mounted = false;
    };
  }, [user?._id, user?.id]);

  useEffect(() => {
    loadCards();
  }, [user?._id, user?.id, loadCards]);

  const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const loginHistory = getRecentLoginHistory(clientDataState);

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
            <button onClick={() => setActiveTab('history')} className={`tab-btn${activeTab === 'history' ? ' active' : ''}`}>Login History</button>
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

        {activeTab === 'pin' && (
          <form onSubmit={handlePinChange}>
            <h3 className="security-section-title">Change Card PIN</h3>

            <div className="form-group">
              <label className="form-label">Select Card</label>
              {cards.length === 0 ? (
                <div className="security-empty-note">No cards found. Add a card first.</div>
              ) : (
                <div className="card-selection">
                  {cards.map((card, idx) => {
                    const cardId = getCardId(card);
                    const isActive = card.status === 'active';
                    const isSelected = cardId === selectedCardId;
                    return (
                    <div key={cardId} className={`card-tile${isSelected ? ' selected' : ''}`}>
                      <div className="card-index">{idx + 1}</div>
                      <div className="card-meta">
                        <div className="card-name">{card.cardName}</div>
                        <div className="card-last4">**** {String(card.cardNumber || '').slice(-4)}</div>
                      </div>
                      <div className="card-choose">
                        <button
                          type="button"
                          className="choose-btn"
                          onClick={() => setSelectedCardId(cardId)}
                          disabled={!isActive}
                          title={!isActive ? 'This card is not active and cannot be selected for PIN changes' : (isSelected ? 'Selected' : 'Choose this card')}
                        >
                          {!isActive ? card.status : (isSelected ? 'Chosen' : 'Choose')}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Current PIN</label>
              <div className="security-input-wrap">
                <input type={showCurrentPin ? 'text' : 'password'} className="form-input" value={pinForm.currentPin} onChange={(event) => setPinForm({ ...pinForm, currentPin: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} maxLength="6" required />
                <button type="button" onClick={() => setShowCurrentPin(!showCurrentPin)} className="security-input-toggle" title={showCurrentPin ? 'Hide PIN' : 'Show PIN'}>
                  {showCurrentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New PIN (4-6 digits)</label>
              <div className="security-input-wrap">
                <input type={showNewPin ? 'text' : 'password'} className="form-input" value={pinForm.newPin} onChange={(event) => setPinForm({ ...pinForm, newPin: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} maxLength="6" required />
                <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="security-input-toggle" title={showNewPin ? 'Hide PIN' : 'Show PIN'}>
                  {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New PIN</label>
              <div className="security-input-wrap">
                <input type={showConfirmPin ? 'text' : 'password'} className="form-input" value={pinForm.confirmPin} onChange={(event) => setPinForm({ ...pinForm, confirmPin: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} maxLength="6" required />
                <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="security-input-toggle" title={showConfirmPin ? 'Hide PIN' : 'Show PIN'}>
                  {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingCardPin}>
              {updatingCardPin ? 'Updating...' : 'Update PIN'}
            </button>
          </form>
        )}

        {activeTab === 'account-pin' && (
          <form onSubmit={handleAccountPinChange}>
            <h3 className="security-section-title">Change Account PIN</h3>
            <p className="security-section-subtitle">
              This is the 4-6 digit PIN set during registration.
            </p>

            <div className="form-group">
              <label className="form-label">Current Account PIN</label>
              <div className="security-input-wrap">
                <input type={showCurrentAccountPin ? 'text' : 'password'} className="form-input" value={accountPinForm.currentPin} onChange={(event) => setAccountPinForm({ ...accountPinForm, currentPin: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} maxLength="6" required />
                <button type="button" onClick={() => setShowCurrentAccountPin(!showCurrentAccountPin)} className="security-input-toggle" title={showCurrentAccountPin ? 'Hide PIN' : 'Show PIN'}>
                  {showCurrentAccountPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Account PIN</label>
              <div className="security-input-wrap">
                <input type={showNewAccountPin ? 'text' : 'password'} className="form-input" value={accountPinForm.newPin} onChange={(event) => setAccountPinForm({ ...accountPinForm, newPin: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} maxLength="6" required />
                <button type="button" onClick={() => setShowNewAccountPin(!showNewAccountPin)} className="security-input-toggle" title={showNewAccountPin ? 'Hide PIN' : 'Show PIN'}>
                  {showNewAccountPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Account PIN</label>
              <div className="security-input-wrap">
                <input type={showConfirmAccountPin ? 'text' : 'password'} className="form-input" value={accountPinForm.confirmPin} onChange={(event) => setAccountPinForm({ ...accountPinForm, confirmPin: event.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} maxLength="6" required />
                <button type="button" onClick={() => setShowConfirmAccountPin(!showConfirmAccountPin)} className="security-input-toggle" title={showConfirmAccountPin ? 'Hide PIN' : 'Show PIN'}>
                  {showConfirmAccountPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={updatingAccountPin}>
              {updatingAccountPin ? 'Updating...' : 'Update Account PIN'}
            </button>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleSecurityQuestions}>
            <h3 className="security-section-title">Security Questions</h3>
            <p className="security-section-subtitle">
              Set up security questions to help recover your account if needed.
            </p>

            <div className="form-group">
              <label className="form-label">Security Question 1</label>
              <select className="form-input" value={securityQuestions.question1} onChange={(event) => setSecurityQuestions({ ...securityQuestions, question1: event.target.value })}>
                <option value="">Select a question</option>
                {SECURITY_QUESTIONS.map((question) => <option key={`q1-${question}`} value={question}>{question}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Answer 1</label>
              <input type="text" className="form-input" value={securityQuestions.answer1} onChange={(event) => setSecurityQuestions({ ...securityQuestions, answer1: event.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Security Question 2</label>
              <select className="form-input" value={securityQuestions.question2} onChange={(event) => setSecurityQuestions({ ...securityQuestions, question2: event.target.value })}>
                <option value="">Select a question</option>
                {SECURITY_QUESTIONS.map((question) => <option key={`q2-${question}`} value={question}>{question}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Answer 2</label>
              <input type="text" className="form-input" value={securityQuestions.answer2} onChange={(event) => setSecurityQuestions({ ...securityQuestions, answer2: event.target.value })} />
            </div>

            <button type="submit" className="btn btn-primary">Save Security Questions</button>
          </form>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="security-section-title">Login History</h3>
            <p className="security-section-subtitle">Your recent login activity</p>

            {loginHistory.length === 0 ? (
              <div className="security-history-empty">
                No login history available
              </div>
            ) : (
              <div className="transaction-list security-history-list">
                {loginHistory.map((login, index) => (
                  <div key={index} className="transaction-item">
                    <div className="security-history-main security-history-main-row">
                      <div className="security-history-icon-wrap">
                        <Shield size={16} />
                      </div>
                      <div>
                        <div className="security-history-title">Login</div>
                        <div className="security-history-date">{formatDate(login.timestamp)}</div>
                        <div className="security-history-meta">
                          {login.ip || 'Local'} | {login.device || 'Web Browser'}
                        </div>
                      </div>
                    </div>
                    <div className="security-history-status-badge">
                      {login.status || 'SUCCESS'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;


