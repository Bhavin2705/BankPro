import { Bell, Building2, Clock, CreditCard, Lock, User } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'bank', label: 'Bank Details', icon: Building2 },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Bell },
  { id: 'accounts', label: 'Accounts & Cards', icon: CreditCard },
  { id: 'sessions', label: 'Sessions', icon: Clock }
];

const SettingsTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="settings-tabs-wrap">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          className={`btn ${activeTab === id ? 'btn-primary' : 'btn-secondary'} settings-tab-btn`}
        >
          {Icon ? <Icon size={16} /> : null}
          {label}
        </button>
      ))}
    </div>
  );
};

export default SettingsTabs;
