import { AlertTriangle, Bell, CheckCircle, CreditCard, ShieldAlert, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import { api } from '../../utils/api';
import '../../styles/pages/notifications.css';

const isLikelyDummyNotification = (item) => {
  const text = `${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  return /dummy|sample|placeholder|mock notification|test notification/.test(text);
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { showError } = useNotification();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.notifications.getAll();
        const list = Array.isArray(response?.data) ? response.data : [];
        const normalized = list
          .filter((item) => item && (item.id || item._id))
          .filter((item) => typeof item.message === 'string' && item.message.trim().length > 0)
          .filter((item) => !isLikelyDummyNotification(item))
          .map((item) => ({
            ...item,
            id: item.id || item._id,
            timestamp: item.timestamp || item.createdAt || null
          }));
        setNotifications(normalized);
      } catch (err) {
        
        const errorMsg = 'Failed to load notifications. Please try again.';
        setError(errorMsg);
        showError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [showError]);

  const markAsRead = async (id) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id || n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      
      showError('Failed to mark notification as read');
    } finally {
      setIsUpdating(false);
    }
  };

  const markAllAsRead = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      
      showError('Failed to mark all as read');
    } finally {
      setIsUpdating(false);
    }
  };

  const getIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('warning') || t.includes('alert')) return <AlertTriangle size={20} />;
    if (t.includes('transaction') || t.includes('debit') || t.includes('credit')) return <ShoppingBag size={20} />;
    if (t.includes('payment') || t.includes('success')) return <CheckCircle size={20} />;
    if (t.includes('security') || t.includes('login')) return <ShieldAlert size={20} />;
    if (t.includes('card')) return <CreditCard size={20} />;
    return <Bell size={20} />;
  };

  const getIconColorClass = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('warning') || t.includes('alert')) return 'is-warning';
    if (t.includes('transaction') || t.includes('debit') || t.includes('credit')) return 'is-transaction';
    if (t.includes('payment') || t.includes('success')) return 'is-success';
    if (t.includes('security') || t.includes('login')) return 'is-security';
    if (t.includes('card')) return 'is-card';
    return 'is-default';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const normalizeCurrencySpacing = (text) => {
    if (typeof text !== 'string') return '';
    return text.replace(/\bRs\s*(?=\d)/g, 'Rs ');
  };

  const hasUnread = notifications.some((n) => !n.read);

  if (loading) {
    return (
      <div className="container">
        <div className="notifications-loading">
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="container notifications-page">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">
            Notifications
          </h1>
          <p className="notifications-subtitle">
            Recent account and transaction updates
          </p>
        </div>

        {hasUnread && notifications.length > 0 && (
          <button
            className="notifications-mark-all-btn"
            onClick={markAllAsRead}
            disabled={isUpdating}
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="notifications-error">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <p>No notifications available</p>
        </div>
      ) : (
        <div className="notifications-list-wrap">
          {notifications.map((n) => (
            <div
              className={`notifications-row ${n.read ? 'is-read' : 'is-unread'}`}
              key={n.id || n._id}
            >
              <div className={`notifications-icon-wrap ${getIconColorClass(n.type)}`}>
                {getIcon(n.type)}
              </div>

              <div className="notifications-content">
                <p className={`notifications-message ${n.read ? 'is-read' : 'is-unread'}`}>
                  {normalizeCurrencySpacing(n.message)}
                </p>
                <p className="notifications-timestamp">
                  {formatTimestamp(n.timestamp)}
                </p>
              </div>

              {!n.read && (
                <div className="notifications-actions">
                  <div className="notifications-unread-dot" />
                  <button
                    onClick={() => markAsRead(n.id || n._id)}
                    className="notifications-mark-read-btn"
                    disabled={isUpdating}
                  >
                    Mark read
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;


