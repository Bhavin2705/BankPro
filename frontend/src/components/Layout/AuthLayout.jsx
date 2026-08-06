import { Home, Moon, Sun, Menu, X } from 'lucide-react';
import '../../styles/pages/AuthLayout.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, darkMode, toggleDarkMode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' }
  ];

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
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu backdrop"
        />
      )}

      <div className={`auth-layout ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <aside className="sidebar auth-layout-sidebar">
          <div className="sidebar-header auth-layout-sidebar-header">
            <div className="sidebar-brand auth-layout-sidebar-brand">BankPro</div>
          </div>

          <nav className="auth-layout-nav">
            <ul className="sidebar-nav auth-layout-nav-list">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="sidebar-nav-item auth-layout-nav-item">
                    <Link
                      to={item.path}
                      className="sidebar-nav-link auth-layout-nav-link"
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

          <div className="sidebar-footer auth-layout-footer">
            <button
              onClick={toggleDarkMode}
              className="auth-layout-theme-toggle"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </aside>

        <main className="auth-layout-main">
          {children}
        </main>
      </div>
    </>
  );
};

export default AuthLayout;