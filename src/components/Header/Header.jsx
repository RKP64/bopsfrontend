import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { API_CONFIG } from '../../config';
import styles from './Header.module.css';

function Header({ onLogout }) {
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    }
    setShowUserMenu(false);
  };

  return (
    <header className={styles.appHeader}>
      <div className={styles.leftSection}>
        <div className={styles.logoContainer}>
          <img
            src="/bail_logo.png"
            alt="BIAL Logo"
            style={{
              height: '50px',
              width: 'auto',
              marginRight: '12px',
              objectFit: 'contain'
            }}
          />
          <h1 className={styles.title}>
            <span style={{ color: '#000000' }}>BIAL Operational  Brain</span>
            {/* <span style={{ color: '#000000' }}>Fin</span>
            <span style={{ color: '#000000' }}>.AI</span> */}
          </h1>
        </div>
      </div>

      {user && (
        <div className={styles.rightSection}>
          {/* <button
            className={styles.playgroundButton}
            onClick={() => {
              window.location.replace(API_CONFIG.MARKETPLACE_URL);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '8px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
            Marketplace
          </button> */}
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor" />
                <path d="M8 10C5.79086 10 4 11.7909 4 14V16H12V14C12 11.7909 10.2091 10 8 10Z" fill="currentColor" />
              </svg>
            </div>
            <span className={styles.userName}>{user?.username || user?.email || 'User'}</span>
            <div className={styles.userMenu}>
              <button
                className={styles.userButton}
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
              >
                <svg className={styles.dropdownIcon} width="12" height="8" viewBox="0 0 12 8">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>

              {showUserMenu && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.menuItem}>
                    <span className={styles.menuLabel}>Username:</span>
                    <span className={styles.menuValue}>{user.username}</span>
                  </div>
                  <div className={styles.menuItem}>
                    <span className={styles.menuLabel}>Role:</span>
                    <span className={styles.menuValue}>{user.role || 'User'}</span>
                  </div>
                  <div className={styles.menuItem}>
                    <span className={styles.menuLabel}>Status:</span>
                    <span className={`${styles.menuValue} ${user.isActive ? styles.active : styles.inactive}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.menuDivider}></div>
                  <button className={styles.logoutButton} onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 11.3333L14 7.33333L10 3.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 7.33333H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

Header.propTypes = {
  onLogout: PropTypes.func
};

export default Header;