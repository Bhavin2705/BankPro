import { CreditCard } from 'lucide-react';
import { getTranslation } from '../../../utils/i18n';

const AccountsTab = ({ lang = 'en', linkedAccounts, loading, onRefresh, onToggleCardStatus }) => (
  <div>
    <div className="settings-header-row">
      <h3 className="settings-section-title settings-no-margin">
        <CreditCard size={20} />
        {getTranslation('linkedAccountsCards', lang)}
      </h3>
      <button type="button" className="btn btn-secondary" onClick={() => onRefresh(true)} disabled={loading}>
        {loading ? getTranslation('refreshing', lang) : getTranslation('refresh', lang)}
      </button>
    </div>

    {linkedAccounts && linkedAccounts.length > 0 ? (
      <div className="settings-accounts-grid">
        {linkedAccounts.map((card) => {
          const status = (card.status || 'active').toLowerCase();
          const hasPendingRequest = card?.statusRequest?.status === 'pending';
          const isNonToggleStatus = ['blocked', 'lost', 'expired', 'closed'].includes(status);
          return (
            <div key={card._id} className="settings-account-card">
              <div className="settings-row-between settings-align-start">
                <div>
                  <div className="settings-account-name">{card.cardHolder || card.cardName || 'Card'}</div>
                  <div className="settings-account-meta">{(card.cardType || 'Credit Card').toUpperCase()} | ******{card.cardNumber?.slice(-4)}</div>
                  <div className="settings-account-expiry">{getTranslation('expires', lang)}: {card.expiryMonth}/{card.expiryYear}</div>
                  {hasPendingRequest && (
                    <div className="settings-account-expiry">
                      {getTranslation('requestPending', lang)}: {card?.statusRequest?.requestedStatus === 'inactive' ? getTranslation('lock', lang) : getTranslation('unlock', lang)}
                    </div>
                  )}
                </div>
                <div className="settings-account-actions">
                  <span className={`settings-status-badge is-${status}`}>{status}</span>
                  {card.status !== 'closed' ? (
                    <button
                      type="button"
                      className="btn btn-secondary settings-account-toggle-btn"
                      disabled={loading || isNonToggleStatus || hasPendingRequest}
                      onClick={() => onToggleCardStatus(card)}
                    >
                      {card.status === 'blocked'
                        ? getTranslation('contactBank', lang)
                        : hasPendingRequest
                          ? getTranslation('requestPendingBtn', lang)
                          : card.status === 'active'
                            ? getTranslation('requestLock', lang)
                            : getTranslation('requestUnlock', lang)}
                    </button>
                  ) : (
                    <span className="settings-closed-note">{getTranslation('permanentlyClosed', lang)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="settings-empty-box">
        <div className="settings-empty-text">{getTranslation('noLinkedCards', lang)}</div>
      </div>
    )}
  </div>
);

export default AccountsTab;
