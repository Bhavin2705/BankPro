import { Bell, Building2, Clock, CreditCard, Lock, User } from 'lucide-react';
import { getTranslation } from '../../../utils/i18n';

const tabs = [
  { id: 'profile', key: 'tabProfile', label: 'Profile', icon: User },
  { id: 'bank', key: 'tabBank', label: 'Bank', icon: Building2 },
  { id: 'security', key: 'tabSecurity', label: 'Security', icon: Lock },
  { id: 'preferences', key: 'tabPreferences', label: 'Preferences', icon: Bell },
  { id: 'accounts', key: 'tabAccounts', label: 'Accounts', icon: CreditCard },
  { id: 'sessions', key: 'tabSessions', label: 'Sessions', icon: Clock }
];

const SettingsTabs = ({ activeTab, setActiveTab, currentLang = 'en' }) => (
  <div className="settings-tabs-wrap">
    {tabs.map(({ id, key, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={`btn ${activeTab === id ? 'btn-primary' : 'btn-secondary'} settings-tab-btn`}
      >
        {Icon ? <Icon size={16} /> : null}
        {getTranslation(key, currentLang) || label}
      </button>
    ))}
  </div>
);

export default SettingsTabs;
