import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL, api } from '../../utils/api';
import { useNotification } from '../../components/providers/NotificationProvider';
import '../../styles/pages/AdminKyc.css';

const AdminKyc = () => {
  const { showError, showSuccess } = useNotification();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const base = API_BASE_URL.replace('/api', '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await api.adminKyc.list();
      setPending(res?.success ? res.data : []);
    } catch (error) {
      
      showError('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const approve = async (userId) => {
    if (actioningId) return;
    try {
      setActioningId(userId);
      const res = await api.adminKyc.approve(userId);
      if (res?.success) {
        showSuccess('Verification approved');
        await loadPending();
      } else {
        showError(res?.error || 'Failed to approve verification');
      }
    } catch {
      showError('Failed to approve verification');
    } finally {
      setActioningId(null);
    }
  };

  const reject = async (userId) => {
    if (actioningId) return;
    const reason = window.prompt('Enter rejection reason');
    if (!reason) return;
    try {
      setActioningId(userId);
      const res = await api.adminKyc.reject(userId, reason);
      if (res?.success) {
        showSuccess('Verification rejected');
        await loadPending();
      } else {
        showError(res?.error || 'Failed to reject verification');
      }
    } catch {
      showError('Failed to reject verification');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="container admin-kyc-page">
      <div className="admin-kyc-header">
        <h1 className="admin-kyc-title">KYC Verification</h1>
        <p className="admin-kyc-subtitle">Review and approve user verification requests.</p>
      </div>

      <div className="card admin-kyc-card">
        <h2 className="admin-kyc-section-title"><FileText size={20} /> Pending Verifications</h2>
        {loading ? (
          <div className="admin-kyc-empty">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="admin-kyc-empty">No pending verifications.</div>
        ) : (
          <div className="admin-kyc-list">
            {pending.map((user) => (
              <div key={user._id} className="admin-kyc-item">
                <div className="admin-kyc-main">
                  <div className="admin-kyc-name">{user.name}</div>
                  <div className="admin-kyc-meta">{user.email}</div>
                  <div className="admin-kyc-meta">ID Type: {user.kyc?.idType || 'N/A'}</div>
                  {user.kyc?.idNumberMasked && (
                    <div className="admin-kyc-meta">ID: {user.kyc.idNumberMasked}</div>
                  )}
                </div>
                <div className="admin-kyc-docs">
                  {(user.kyc?.documentUrls || []).map((doc) => (
                    <a key={doc} href={getAbsoluteUrl(doc)} target="_blank" rel="noreferrer">
                      View Document
                    </a>
                  ))}
                </div>
                <div className="admin-kyc-actions">
                  <button
                    className="btn btn-primary admin-kyc-approve"
                    onClick={() => approve(user._id)}
                    disabled={actioningId === user._id}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    className="btn btn-secondary admin-kyc-reject"
                    onClick={() => reject(user._id)}
                    disabled={actioningId === user._id}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminKyc;
