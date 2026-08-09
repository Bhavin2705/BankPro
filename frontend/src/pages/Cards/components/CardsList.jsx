import { CreditCard, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

const CardsList = ({
  cards,
  visibleCards,
  visibleCvvs,
  formatCardNumber,
  toggleCardVisibility,
  toggleCardLock,
  toggleCvvVisibility,
  showVirtualCard,
  closeCard,
  updatingCardId,
  closingCardId,
}) => {
  const getCardId = (card) => card?.id || card?._id;
  const getLast4 = (cardNumber) => String(cardNumber || '').slice(-4).padStart(4, '•');
  const getCardTypeLabel = (cardType) => String(cardType || 'card').toUpperCase();
  const isNonToggleStatus = (status) => ['blocked', 'lost', 'expired', 'closed'].includes(status);

  if (cards.length === 0) {
    return (
      <div className="cards-empty-state">
        <CreditCard size={48} className="cards-empty-icon" />
        <div>No cards found</div>
        <small>Add your first card to get started</small>
      </div>
    );
  }

  return (
    <div className="cards-list cards-list-grid">
      {cards.map((card) => {
        const cardId = getCardId(card);
        const isUpdatingCard = updatingCardId === cardId;
        const isClosingCard = closingCardId === cardId;
        const isBlockedByBank = card.status === 'blocked';
        const isLockedByStatus = isNonToggleStatus(card.status);
        const hasPendingRequest = card.statusRequest?.status === 'pending';
        const requestedStatus = card.statusRequest?.requestedStatus;
        const pendingLabel = requestedStatus === 'closed'
          ? 'Closure Pending Approval'
          : requestedStatus === 'inactive'
            ? 'Lock request pending review'
            : 'Unlock request pending review';
        const lockButtonDisabled = isUpdatingCard || isClosingCard || isBlockedByBank || isLockedByStatus || hasPendingRequest;
        const closeButtonDisabled = isUpdatingCard || isClosingCard || hasPendingRequest;
        const lockButtonTitle = isBlockedByBank
          ? 'Card blocked by bank. Contact support.'
          : hasPendingRequest
            ? 'Request pending bank review'
          : isLockedByStatus
            ? 'Card status cannot be changed'
            : card.status === 'active'
              ? 'Lock card'
              : 'Unlock card';

        return (
          <div
            key={cardId}
            className={`card-item ${card.status === 'inactive' || card.status === 'blocked' ? 'is-dimmed' : ''}`}
          >
            <div className="card-item-main">
              <div className="card-item-content">
                <div className="card-item-heading">
                  <CreditCard size={20} />
                  <span className="card-item-name">{card.cardName || 'Card'}</span>
                  <span className={`cards-type-chip ${card.cardType === 'debit' ? 'is-debit' : 'is-credit'} cards-type-chip-base`}>
                    {getCardTypeLabel(card.cardType)}
                  </span>
                </div>

                <div className="card-item-number cards-number-text">
                  {visibleCards.has(cardId)
                    ? formatCardNumber(String(card.cardNumber || ''))
                    : `**** **** **** ${getLast4(card.cardNumber)}`}
                </div>

                <div className="card-item-meta">
                  <span className="card-item-meta-value">Expires: {card.expiryDate || '--/----'}</span>
                  <span className="card-item-meta-value">
                    Status:{' '}
                    <span className={`card-item-status ${card.status === 'active' ? 'is-active' : 'is-inactive'}`}>
                      {card.status || 'unknown'}
                    </span>
                  </span>
                  {hasPendingRequest && (
                    <span
                      className="card-item-meta-value card-item-request-pending"
                      style={
                        requestedStatus === 'closed'
                          ? {
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              color: '#dc2626',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: 700,
                            }
                          : {}
                      }
                    >
                      ⏳ {pendingLabel}
                    </span>
                  )}
                  <span className="card-item-meta-value card-item-cvv-wrap">
                    CVV:
                    <strong className="card-item-cvv-value">{visibleCvvs.has(cardId) ? (card.cvv || '---') : '• • •'}</strong>
                    <button
                      onClick={() => toggleCvvVisibility(cardId)}
                      className="card-item-cvv-btn"
                      title={visibleCvvs.has(cardId) ? 'Hide CVV' : 'Show CVV'}
                    >
                      {visibleCvvs.has(cardId) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </div>
              </div>

              <div className="card-item-actions">
                <div className="card-item-quick-actions">
                  <button
                    onClick={() => toggleCardVisibility(cardId)}
                    className="card-item-action-btn card-item-icon-btn card-item-ghost-btn"
                    title={visibleCards.has(cardId) ? 'Hide card number' : 'Show card number'}
                    disabled={isUpdatingCard || isClosingCard}
                  >
                    {visibleCards.has(cardId) ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  <button
                    onClick={() => toggleCardLock(cardId)}
                    className={`card-item-action-btn card-item-icon-btn ${card.status === 'active' ? 'card-lock-btn lock' : 'card-lock-btn unlock'} card-item-lock-btn`}
                    title={lockButtonTitle}
                    disabled={lockButtonDisabled}
                  >
                    {card.status === 'active' || isLockedByStatus ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>

                <div className="card-item-main-actions">
                  <button
                    onClick={() => showVirtualCard(cardId)}
                    className="card-item-action-btn card-item-main-btn card-item-main-btn-virtual"
                    title="Open virtual card view"
                    disabled={isUpdatingCard || isClosingCard}
                  >
                    Virtual View
                  </button>

                  <button
                    onClick={() => closeCard(cardId, card.cardNumber)}
                    className="card-item-action-btn card-item-main-btn card-item-main-btn-close"
                    title={hasPendingRequest && requestedStatus === 'closed' ? 'Closure pending bank review' : 'Close card'}
                    disabled={closeButtonDisabled}
                  >
                    {isClosingCard ? 'Submitting...' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardsList;
