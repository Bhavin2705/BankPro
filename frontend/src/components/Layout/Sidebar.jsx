import {
  Bell,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Settings,
  Shield,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { canAccessAdminFeatures } from '../../utils/auth';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/pages/Sidebar.css';

const BASE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, path: '/transactions' },
  { id: 'cards', label: 'My Cards', icon: CreditCard, path: '/cards' },
  { id: 'payments', label: 'Payments', icon: Receipt, path: '/payments' },
  { id: 'security', label: 'Security', icon: Shield, path: '/security' },
  { id: 'statements', label: 'Statements & Reports', icon: FileText, path: '/statements' },
  { id: 'currency-exchange', label: 'Currency Exchange', icon: DollarSign, path: '/currency-exchange' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

const ADMIN_NAV_ITEMS = [
  { id: 'users', label: 'User Management', icon: Users, path: '/users' },
  { id: 'kyc', label: 'KYC Verifications', icon: User, path: '/admin-kyc' },
  { id: 'card-controls', label: 'Card Controls', icon: Shield, path: '/card-controls' },
  { id: 'admin-banks', label: 'Manage Banks', icon: Users, path: '/admin-banks' },
];

const Sidebar = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = useMemo(() => (
    canAccessAdminFeatures(user)
      ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : BASE_NAV_ITEMS
  ), [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    onLogout();
  };

  const getAbsolutePhotoUrl = (photoUrl) => {
    if (!photoUrl) return '';
    if (String(photoUrl).startsWith('blob:') || String(photoUrl).startsWith('data:')) {
      return photoUrl;
    }
    if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
    const base = API_BASE_URL.replace('/api', '');
    return `${base}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
  };

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isMobileMenuOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu backdrop"
        />
      )}

      <aside
        className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">BankPro</div>
        </div>

        <nav className="sidebar-nav-wrap">
          <ul className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            {(() => {
              const photoUrl = getAbsolutePhotoUrl(user?.profile?.photoUrl);
              const initials = (user?.name || 'U')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('');

              return photoUrl ? (
                <img src={photoUrl} alt="Profile" className="sidebar-user-avatar" />
              ) : (
                <div className="sidebar-user-avatar sidebar-user-avatar-fallback">
                  <span>{initials || 'U'}</span>
                </div>
              );
            })()}
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className="sidebar-logout-btn"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <button
        onClick={toggleDarkMode}
        className="theme-toggle"
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </>
  );
};

export default Sidebar;

