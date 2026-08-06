import { AlertTriangle, CreditCard, Lock, Search, Shield, Unlock, User as UserIcon, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../components/providers/NotificationProvider';
import api from '../../utils/api';
import '../../styles/pages/CardControls.css';
import { getAllUsers } from '../../utils/auth';

const getUserId = (entry) => entry?._id || entry?.id || '';

export default function CardControls() {
  const { showError, showSuccess } = useNotification();
  const [users, setUsers] = useState([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCards, setUserCards] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [processingCardId, setProcessingCardId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const pendingRequests = useMemo(
    () => userCards.filter((card) => card?.statusRequest?.status === 'pending'),
    [userCards]
  );

  const inactiveCardsCount = useMemo(
    () => userCards.filter((card) => String(card?.status || '').toLowerCase() === 'inactive').length,
    [userCards]
  );

  const blockedCardsCount = useMemo(
    () => userCards.filter((card) => String(card?.status || '').toLowerCase() === 'blocked').length,
    [userCards]
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((entry) => {
      const haystack = `${entry?.name || ''} ${entry?.email || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, userSearch]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await getAllUsers();
      const allUsers = Array.isArray(response?.users) ? response.users : [];
      const totalUsers = Number(response?.pagination?.total);
      setTotalUsersCount(Number.isFinite(totalUsers) ? totalUsers : allUsers.length);
      const nonAdminUsers = allUsers.filter((entry) => entry?.role !== 'admin');
      setUsers(nonAdminUsers);
      if (!selectedUser && nonAdminUsers.length > 0) {
        await handleSelectUser(nonAdminUsers[0]);
      }
    } catch (error) {
      
      showError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectUser = async (entry) => {
    const userId = getUserId(entry);
    if (!userId) return;
    setSelectedUser(entry);
    setLoadingCards(true);
    try {
      const cardsRes = await api.cards.getByUserAdmin(userId);
      if (cardsRes?.success) {
        setUserCards(cardsRes.data || []);
      } else {
        setUserCards([]);
        showError(cardsRes?.error || 'Failed to load user cards');
      }
    } catch (error) {
      
      setUserCards([]);
      showError(error.message || 'Failed to load user cards');
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const refreshSelectedUserCards = async () => {
    if (!selectedUser) return;
    await handleSelectUser(selectedUser);
  };

  const handleReviewRequest = async (cardId, action) => {
    try {
      setProcessingCardId(cardId);
      const response = await api.cards.reviewStatusRequest(cardId, { action });
      if (response?.success) {
        showSuccess(response.message || `Request ${action}d successfully`);
        await refreshSelectedUserCards();
      } else {
        showError(response?.error || `Failed to ${action} request`);
      }
    } catch (error) {
      showError(error.message || `Failed to ${action} request`);
    } finally {
      setProcessingCardId('');
    }
  };

  const handleBankAction = async (card) => {
    const cardId = card?._id;
    const currentStatus = card?.status;
    if (!cardId) return;
    if (card?.statusRequest?.status === 'pending') {
      showError('Please review pending request first');
      return;
    }
    if (['closed', 'lost', 'expired'].includes(currentStatus)) {
      showError('This card status cannot be changed');
      return;
    }

    let nextStatus = 'active';
    let actionText = 'updated';
    if (currentStatus === 'active') {
      nextStatus = 'blocked';
      actionText = 'blocked by bank';
    } else if (currentStatus === 'blocked') {
      nextStatus = 'active';
      actionText = 'unblocked by bank';
    } else if (currentStatus === 'inactive') {
      nextStatus = 'active';
      actionText = 'unlocked';
    }

    try {
      setProcessingCardId(cardId);
      const response = await api.cards.updateStatus(cardId, { status: nextStatus });
      if (response?.success) {
        showSuccess(`Card ${actionText} successfully`);
        await refreshSelectedUserCards();
      } else {
        showError(response?.error || 'Failed to update card status');
      }
    } catch (error) {
      showError(error.message || 'Failed to update card status');
    } finally {
      setProcessingCardId('');
    }
  };

  return (
    <div className="container card-controls-page">
      <div className="card-controls-header">
        <div>
          <h1 className="card-controls-title">Card Controls</h1>
          <p className="card-controls-subtitle">Review lock and unlock requests, then apply secure bank-side overrides.</p>
        </div>
        <Link to="/users" className="card-controls-link-btn">
          Back to User Management
        </Link>
      </div>

      <div className="card-controls-overview">
        <div className="card-controls-overview-card">
          <div className="card-controls-overview-label">Total Users</div>
          <div className="card-controls-overview-value">{totalUsersCount}</div>
          <Users size={18} className="card-controls-overview-icon is-users" />
        </div>
        <div className="card-controls-overview-card">
          <div className="card-controls-overview-label">Pending Requests</div>
          <div className="card-controls-overview-value">{pendingRequests.length}</div>
          <AlertTriangle size={18} className="card-controls-overview-icon is-pending" />
        </div>
        <div className="card-controls-overview-card">
          <div className="card-controls-overview-label">Inactive Cards</div>
          <div className="card-controls-overview-value">{inactiveCardsCount}</div>
          <Lock size={18} className="card-controls-overview-icon is-inactive" />
        </div>
        <div className="card-controls-overview-card">
          <div className="card-controls-overview-label">Blocked Cards</div>
          <div className="card-controls-overview-value">{blockedCardsCount}</div>
          <Unlock size={18} className="card-controls-overview-icon is-blocked" />
        </div>
      </div>

      <div className="card-controls-layout">
        <section className="card card-controls-users">
          <div className="card-controls-users-head">
            <h3 className="users-section-title">
              <UserIcon size={18} />
              Customer Directory
            </h3>
            <label className="card-controls-search" aria-label="Search users">
              <Search size={14} />
              <input
                type="text"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name or email"
              />
            </label>
          </div>

          <div className="card-controls-users-list">
            {loadingUsers ? (
              <div className="users-loading-note">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="users-muted-note">No users found.</div>
            ) : (
              filteredUsers.map((entry) => {
                const userId = getUserId(entry);
                const isSelected = userId === getUserId(selectedUser);
                return (
                  <button
                    key={userId}
                    type="button"
                    className={`card-controls-user-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectUser(entry)}
                  >
                    <div className="card-controls-user-header">
                      <div className="card-controls-user-name">{entry.name}</div>
                      <span className={`card-controls-status-pill is-${String(entry.status || 'active').toLowerCase()}`}>
                        {String(entry.status || 'active').toUpperCase()}
                      </span>
                    </div>
                    <div className="card-controls-user-meta">{entry.email}</div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="card card-controls-main">
          <div className="card-controls-main-head">
            <h3 className="users-section-title">
              <CreditCard size={18} />
              {selectedUser ? `Cards: ${selectedUser.name}` : 'Select a user'}
            </h3>
            {selectedUser && (
              <span className="card-controls-main-subhead">
                {userCards.length} card{userCards.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {!selectedUser ? (
            <div className="users-muted-note">Choose a user from the left panel to manage card requests.</div>
          ) : loadingCards ? (
            <div className="users-loading-note">Loading cards...</div>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <div className="users-card-requests-panel">
                  <div className="users-card-requests-title">Pending Requests ({pendingRequests.length})</div>
                  <div className="users-card-requests-list">
                    {pendingRequests.map((card) => {
                      const requestedStatus = card?.statusRequest?.requestedStatus;
                      const isProcessing = processingCardId === card._id;
                      return (
                        <div key={`pending-${card._id}`} className="users-card-request-row">
                          <div className="users-card-request-main">
                            <div className="users-card-request-name">
                              {card.cardName || 'Card'} **** {String(card.cardNumber || '').slice(-4)}
                            </div>
                            <div className="users-card-request-meta">
                              Current: {(card.status || 'active').toUpperCase()} | Requested: {requestedStatus === 'inactive' ? 'LOCK' : 'UNLOCK'}
                            </div>
                          </div>
                          <div className="users-card-request-actions">
                            <button
                              type="button"
                              className="users-card-action-btn is-approve"
                              disabled={isProcessing}
                              onClick={() => handleReviewRequest(card._id, 'approve')}
                            >
                              {isProcessing ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="users-card-action-btn is-reject"
                              disabled={isProcessing}
                              onClick={() => handleReviewRequest(card._id, 'reject')}
                            >
                              {isProcessing ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card-controls-cards-list">
                {userCards.length === 0 ? (
                  <div className="users-muted-note">No cards found for this user.</div>
                ) : (
                  userCards.map((card) => {
                    const isProcessing = processingCardId === card._id;
                    const canAct = !['closed', 'lost', 'expired'].includes(card.status) && card?.statusRequest?.status !== 'pending';
                    const cardStatus = String(card.status || 'active').toLowerCase();
                    return (
                      <div key={card._id} className="card-controls-card-item">
                        <div className="card-controls-card-main">
                          <div className="card-controls-card-title">{card.cardName || 'Card'} **** {String(card.cardNumber || '').slice(-4)}</div>
                          <div className="card-controls-card-meta">
                            <span className={`card-controls-status-pill is-${cardStatus}`}>{(card.status || 'active').toUpperCase()}</span>
                          </div>
                          {card.statusRequest?.status === 'pending' && (
                            <div className="card-controls-request-note">
                              Request pending: {card.statusRequest?.requestedStatus === 'inactive' ? 'LOCK' : 'UNLOCK'}
                            </div>
                          )}
                        </div>
                        <div className="card-controls-card-actions">
                          <button
                            type="button"
                            className={`card-controls-action-btn ${card.status === 'active' ? 'is-block' : 'is-unblock'}`}
                            disabled={!canAct || isProcessing}
                            onClick={() => handleBankAction(card)}
                          >
                            {isProcessing
                              ? 'Processing...'
                              : card.status === 'active'
                                ? 'Block by Bank'
                                : card.status === 'blocked'
                                  ? 'Unblock by Bank'
                                  : 'Unlock'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card card-controls-note">
        <div className="users-subsection-title">
          <Shield size={16} />
          Notes
        </div>
        <div className="card-controls-note-list">
          <div className="users-muted-note">Active card: can be blocked by bank.</div>
          <div className="users-muted-note">Inactive card: can be unlocked by bank.</div>
          <div className="users-muted-note">Blocked card: only bank can unblock.</div>
        </div>
      </section>
    </div>
  );
}
