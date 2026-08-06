import { CreditCard } from 'lucide-react';

const AccountsTab = ({ linkedAccounts, loading, onRefresh, onToggleCardStatus }) => (
  <div>
    <div className="settings-header-row">
      <h3 className="settings-section-title settings-no-margin">
        <CreditCard size={20} />
        Linked Accounts & Cards
      </h3>
      <button type="button" className="btn btn-secondary" onClick={() => onRefresh(true)} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
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
                  <div className="settings-account-expiry">Expires: {card.expiryMonth}/{card.expiryYear}</div>
                  {hasPendingRequest && (
                    <div className="settings-account-expiry">
                      Request pending: {card?.statusRequest?.requestedStatus === 'inactive' ? 'lock' : 'unlock'}
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
                        ? 'Contact Bank'
                        : hasPendingRequest
                          ? 'Request Pending'
                          : card.status === 'active'
                            ? 'Request Lock'
                            : 'Request Unlock'}
                    </button>
                  ) : (
                    <span className="settings-closed-note">Permanently closed</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="settings-empty-box">
        <div className="settings-empty-text">No linked cards found.</div>
      </div>
    )}
  </div>
);

export default AccountsTab;
