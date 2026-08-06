import {
  Activity,
  BarChart3,
  Building2,
  Filter,
  Search,
  IndianRupee,
  Shield,
  User as UserIcon,
  Users as UsersIcon
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../utils/api';
import { getAllUsers } from '../../utils/auth';
import { formatCurrencyByPreference } from '../../utils/currency';
import { calculateTotalBalance, getBlockModalConfig } from './utils';
import '../../styles/pages/Users.css';

const STATUS_ORDER = { active: 0, suspended: 1, inactive: 2 };

const Users = ({ user }) => {
  const getUserId = (listedUser) => listedUser?._id || listedUser?.id || '';
  const [users, setUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [bankMetrics, setBankMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadUsers();
    loadAdminOverview();
    (async () => {
      try {
        const me = await api.auth.getMe();
        if (me?.success && me?.data?._id) setCurrentUserId(me.data._id);
      } catch (fetchMeError) {
        console.debug('Failed to fetch current user:', fetchMeError?.message || 'unknown error');
      }
    })();
  }, []);

  const loadAdminOverview = async () => {
    try {
      const [statsResponse, metricsResponse] = await Promise.all([
        api.users.getStats(),
        api.users.getBankMetrics()
      ]);
      setAdminStats(statsResponse?.success ? statsResponse.data : null);
      setBankMetrics(metricsResponse?.success ? metricsResponse.data : null);
    } catch (error) {
      
      setAdminStats(null);
      setBankMetrics(null);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      const listedUsers = Array.isArray(response?.users) ? response.users : [];
      setUsers(listedUsers);

      if (!selectedUser && listedUsers.length > 0) {
        const defaultUser = listedUsers.find((entry) => entry.role !== 'admin') || listedUsers[0];
        await loadUserDetails(defaultUser);
      }
    } catch (error) {
      
      setUsers([]);
    }
  };

  const loadUserDetails = async (listedUser) => {
    const listedUserId = getUserId(listedUser);
    if (!listedUserId) return;

    setSelectedUser(listedUser);
    setDetailsLoading(true);
    try {
      const transactionsResponse = await api.transactions.getByUserAdmin(listedUserId, { limit: 12 });
      setUserTransactions(transactionsResponse?.data || []);
    } catch (error) {
      
      setUserTransactions([]);
      toast.error('Failed to load selected user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBlock = (userId, currentStatus, userName) => {
    setModal(getBlockModalConfig(userId, currentStatus, userName));
  };

  const handleModalConfirm = async () => {
    setLoading(true);
    if (modal.type === 'block') {
      try {
        const newStatus = modal.currentStatus === 'active' ? 'suspended' : 'active';
        await api.users.updateStatus(modal.userId, { status: newStatus });
        toast.success(`User ${newStatus === 'active' ? 'unblocked' : 'blocked'} successfully`);
        setModal({ open: false });
        await Promise.all([loadUsers(), loadAdminOverview()]);
        if (selectedUser && getUserId(selectedUser) === modal.userId) {
          await loadUserDetails({ ...selectedUser, status: newStatus });
        }
      } catch (error) {
        toast.error(`Failed to update user status: ${error.message}`);
        setModal({ open: false });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(false);
  };

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);
  const totalBalance = calculateTotalBalance(users);
  const totalDeposits = bankMetrics?.totalDeposits ?? totalBalance;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((listedUser) => {
        const matchesStatus = statusFilter === 'all' || String(listedUser.status || 'active').toLowerCase() === statusFilter;
        if (!matchesStatus) return false;
        if (!query) return true;
        const haystack = `${listedUser.name || ''} ${listedUser.email || ''} ${listedUser.accountNumber || ''}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const statusA = String(a?.status || 'active').toLowerCase();
        const statusB = String(b?.status || 'active').toLowerCase();
        const weightA = STATUS_ORDER[statusA] ?? 9;
        const weightB = STATUS_ORDER[statusB] ?? 9;
        if (weightA !== weightB) return weightA - weightB;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });
  }, [users, search, statusFilter]);

  return (
    <div className="container users-page">
      <div className="users-header">
        <h1 className="users-title">User Management</h1>
        <p className="users-subtitle">Administrative control center for user access, balances, and activity</p>
      </div>

      <div className="dashboard-grid users-stats-grid">
        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{adminStats?.totalUsers ?? users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <UsersIcon size={30} className="users-stats-icon users-stats-icon-total" />
          </div>
        </div>

        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{adminStats?.activeUsers ?? 0}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <Shield size={30} className="users-stats-icon users-stats-icon-active" />
          </div>
        </div>

        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{adminStats?.adminUsers ?? 0}</div>
              <div className="stat-label">Admin Users</div>
            </div>
            <BarChart3 size={30} className="users-stats-icon users-stats-icon-admin" />
          </div>
        </div>

        <div className="stat-card">
          <div className="users-stats-row">
            <div>
              <div className="stat-value">{formatCurrency(totalDeposits)}</div>
              <div className="stat-label">Total Deposits</div>
            </div>
            <IndianRupee size={30} className="users-stats-icon users-stats-icon-deposit" />
          </div>
        </div>
      </div>

      <div className="users-admin-layout">
        <section className="card users-directory-card">
          <div className="users-list-header">
            <h3 className="users-section-title">
              <UsersIcon size={18} />
              User Directory
            </h3>
            <div className="users-filters">
              <label className="users-filter-input-wrap" aria-label="Search users">
                <Search size={14} />
                <input
                  type="text"
                  className="users-filter-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users"
                />
              </label>
              <label className="users-filter-select-wrap" aria-label="Filter users by status">
                <Filter size={14} />
                <select
                  className="users-filter-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
          </div>

          <div className="users-table-container overflow-x-auto">
            <div className="users-table-head" role="row">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Balance</span>
            <span>Action</span>
          </div>

          <div className="users-table-body">
            {filteredUsers.length === 0 ? (
              <div className="users-empty-state">
                <UserIcon size={44} className="users-empty-icon" />
                <div>No users found</div>
                <small>Adjust your filters and try again.</small>
              </div>
            ) : (
              filteredUsers.map((listedUser) => {
                const listedUserId = getUserId(listedUser);
                const isAdmin = listedUser.role === 'admin';
                const isSelf = listedUserId === currentUserId;
                const isSelected = listedUserId === getUserId(selectedUser);
                const status = String(listedUser.status || 'active').toLowerCase();

                return (
                  <div key={listedUserId} className={`users-table-row ${isSelected ? 'is-selected' : ''}`}>
                    <button
                      type="button"
                      className="users-user-cell"
                      onClick={() => loadUserDetails(listedUser)}
                    >
                      <div className="users-avatar-wrap">
                        <UserIcon size={16} className="users-avatar-icon" />
                      </div>
                      <div>
                        <div className="users-name">{listedUser.name}</div>
                        <div className="users-meta">{listedUser.email}</div>
                        <div className="users-meta">{listedUser.accountNumber}</div>
                      </div>
                    </button>

                    <div className="users-role-cell">
                      <span className={`users-chip ${isAdmin ? 'is-admin' : 'is-user'}`}>{isAdmin ? 'Admin' : 'User'}</span>
                    </div>

                    <div className="users-status-cell">
                      <span className={`users-chip is-status is-${status}`}>{status}</span>
                    </div>

                    <div className="users-balance-cell">{formatCurrency(listedUser.balance)}</div>

                    <div className="users-action-cell">
                      {!isAdmin && !isSelf ? (
                        <button
                          disabled={loading}
                          className={`users-action-btn ${status === 'active' ? 'users-action-block' : 'users-action-unblock'}`}
                          onClick={() => handleBlock(listedUserId, listedUser.status, listedUser.name)}
                        >
                          {status === 'active' ? 'Block' : 'Unblock'}
                        </button>
                      ) : (
                        <span className="users-action-placeholder">-</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </section>

        <section className="card users-profile-card">
          <h3 className="users-section-title">
            <Activity size={18} />
            {selectedUser ? 'User Overview' : 'Select a User'}
          </h3>

          {!selectedUser ? (
            <div className="users-muted-note">Select a user from the directory to view profile and transaction activity.</div>
          ) : detailsLoading ? (
            <div className="users-loading-note">Loading user profile...</div>
          ) : (
            <>
              <div className="users-profile-grid">
                <div className="users-profile-item">
                  <div className="users-profile-label">Name</div>
                  <div className="users-profile-value">{selectedUser.name}</div>
                </div>
                <div className="users-profile-item">
                  <div className="users-profile-label">Email</div>
                  <div className="users-profile-value">{selectedUser.email}</div>
                </div>
                <div className="users-profile-item">
                  <div className="users-profile-label">Account</div>
                  <div className="users-profile-value">{selectedUser.accountNumber || 'N/A'}</div>
                </div>
                <div className="users-profile-item">
                  <div className="users-profile-label">Current Balance</div>
                  <div className="users-profile-value">{formatCurrency(selectedUser.balance || 0)}</div>
                </div>
                <div className="users-profile-item">
                  <div className="users-profile-label">Role</div>
                  <div className="users-profile-value">{selectedUser.role}</div>
                </div>
                <div className="users-profile-item">
                  <div className="users-profile-label">Status</div>
                  <div className="users-profile-value">{selectedUser.status || 'active'}</div>
                </div>
              </div>

              <div className="users-subheader-row">
                <h4 className="users-subsection-title">
                  <Activity size={15} />
                  Recent Transactions
                </h4>
                <Link to="/card-controls" className="users-link-action">
                  <Building2 size={14} />
                  Card Controls
                </Link>
              </div>

              <div className="users-ledger-head" role="row">
                <span>Type</span>
                <span>Amount</span>
                <span>Description</span>
              </div>
              <div className="users-ledger-body">
                {userTransactions.length === 0 ? (
                  <div className="users-muted-note">No recent transactions available for this user.</div>
                ) : (
                  userTransactions.map((transaction) => (
                    <div key={transaction._id} className="users-ledger-row">
                      <span className="users-ledger-type">{String(transaction.type || '').toUpperCase()}</span>
                      <span className="users-ledger-amount">{formatCurrency(transaction.amount || 0)}</span>
                      <span className="users-ledger-desc">{transaction.description || 'No description'}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={handleModalConfirm}
        onCancel={() => setModal({ open: false })}
      />
    </div>
  );
};

export default Users;
