import { Activity, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatCurrencyByPreference } from '../../utils/currency';
import { getTransactionStats } from '../../utils/transactions';
import '../../styles/pages/Dashboard.css';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      console.log('Dashboard user object:', user);
    }
    const fetchStats = async () => {
      try {
        setLoading(true);
        const transactionStats = await getTransactionStats();
        setStats(transactionStats);
        setError('');
      } catch (fetchError) {
        setError('Failed to load dashboard data');
        
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchStats();
    }
  }, [user?._id]);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  const formatDate = (dateString) => (
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  );

  const isNewUser = Boolean(user?.firstLogin && stats.totalTransactions === 0 && (user?.balance || 0) === 0);

  return (
    <div className="container dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title dashboard-title-main">
          {isNewUser ? 'Welcome' : 'Welcome back'}, {user?.name}!
        </h1>
        <p className="dashboard-account dashboard-account-muted">
          Account No.: {user?.accountNumber}
        </p>

        {isNewUser && (
          <div className="dashboard-welcome-banner">
            <h3 className="dashboard-welcome-title">Welcome to Your New Account!</h3>
            <p className="dashboard-welcome-text">
              Your account is ready! Make your first deposit to start using banking features.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="dashboard-error-banner">
          {error}
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div>Loading dashboard...</div>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="dashboard-stat-row">
                <div>
                  <div className="stat-value">{formatCurrency(user?.balance || 0)}</div>
                  <div className="stat-label">Current Balance</div>
                </div>
                <Wallet size={32} className="dashboard-stat-icon dashboard-stat-icon-balance" />
              </div>
            </div>

            <div className="stat-card">
              <div className="dashboard-stat-row">
                <div>
                  <div className="stat-value">{formatCurrency(stats.monthlyIncome)}</div>
                  <div className="stat-label">Monthly Income</div>
                </div>
                <TrendingUp size={32} className="dashboard-stat-icon dashboard-stat-icon-income" />
              </div>
            </div>

            <div className="stat-card">
              <div className="dashboard-stat-row">
                <div>
                  <div className="stat-value">{formatCurrency(stats.monthlyExpenses)}</div>
                  <div className="stat-label">Monthly Expenses</div>
                </div>
                <TrendingDown size={32} className="dashboard-stat-icon dashboard-stat-icon-expense" />
              </div>
            </div>

            <div className="stat-card">
              <div className="dashboard-stat-row">
                <div>
                  <div className="stat-value">{stats.totalTransactions}</div>
                  <div className="stat-label">Total Transactions</div>
                </div>
                <Activity size={32} className="dashboard-stat-icon dashboard-stat-icon-activity" />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="dashboard-recent-title">
              <Activity size={20} />
              Recent Transactions
            </h3>

            {stats.recentTransactions.length > 0 ? (
              <div className="transaction-list">
                {stats.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-main dashboard-transaction-main">
                      <div className="dashboard-transaction-description">
                        {transaction.description}
                      </div>
                      <div className="dashboard-transaction-date">
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                    <div className={`transaction-amount ${transaction.type === 'credit' ? 'is-credit' : 'is-debit'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-wrap">
                {user?.balance === 0 ? (
                  <div className="dashboard-empty-state">
                    <div className="dashboard-empty-title">Ready to Start Banking?</div>
                    <div>Make your first deposit to begin tracking transactions</div>
                  </div>
                ) : (
                  <div>No transactions yet</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
