import { Building2, ShieldCheck, Lock, HelpCircle } from 'lucide-react';

const BankTab = ({ user, bankData }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <h3 className="settings-section-title" style={{ margin: 0 }}>
        <Building2 size={20} />
        Bank Information
      </h3>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        padding: '0.35rem 0.75rem',
        borderRadius: '2rem',
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        <ShieldCheck size={14} /> System Verified
      </span>
    </div>

    <div className="settings-grid-300">
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          Bank Name <Lock size={12} style={{ color: 'var(--text-secondary, #94a3b8)' }} />
        </label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={bankData?.bankName || user?.bankDetails?.bankName || 'BankPro'}
          disabled
          readOnly
        />
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          IFSC Code <Lock size={12} style={{ color: 'var(--text-secondary, #94a3b8)' }} />
        </label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={bankData?.ifscCode || user?.bankDetails?.ifscCode || 'BNKP0000001'}
          disabled
          readOnly
        />
      </div>

      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          Branch Name <Lock size={12} style={{ color: 'var(--text-secondary, #94a3b8)' }} />
        </label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={bankData?.branchName || user?.bankDetails?.branchName || 'Main Branch'}
          disabled
          readOnly
        />
      </div>
    </div>

    <div className="form-group settings-top-gap">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        Account Number <Lock size={12} style={{ color: 'var(--text-secondary, #94a3b8)' }} />
      </label>
      <input
        type="text"
        className="form-input settings-readonly"
        value={user?.accountNumber || 'Not assigned'}
        disabled
        readOnly
        style={{ letterSpacing: '0.05em', fontWeight: 600 }}
      />
    </div>

    <div className="info-box" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <HelpCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary-color, #0284c7)' }} />
      <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
        <strong>Official Bank Credentials:</strong> Your primary bank routing details and account number are issued by BankPro upon account setup and verification. To request a branch transfer or update account details, please contact BankPro Support.
      </div>
    </div>
  </div>
);

export default BankTab;
