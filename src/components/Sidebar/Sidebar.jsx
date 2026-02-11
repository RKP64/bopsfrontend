import React from 'react';
import styles from './Sidebar.module.css';

function Sidebar({ onSelectApp, selectedApp }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <h3 className={styles.sectionHeader}>Agents</h3>
        <ul className={styles.agentList}>
          <li
            className={`${styles.agentItem} ${selectedApp === 'conversational' ? styles.active : ''}`}
            onClick={() => onSelectApp('conversational')}
          >
            <div className={styles.agentIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="currentColor"/>
                <path d="M8 4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor"/>
              </svg>
            </div>
            Operational Copilot
          </li>
          <li
            className={`${styles.agentItem} ${selectedApp === 'mda-reviewer' ? styles.active : ''}`}
            onClick={() => onSelectApp('mda-reviewer')}
          >
            <div className={styles.agentIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="currentColor"/>
                <path d="M4 6h8v1H4V6zm0 2h8v1H4V8zm0 2h6v1H4v-1z" fill="white"/>
              </svg>
            </div>
            Operations Report Generator
          </li>
        </ul>
      </div>

      <div className={styles.bottomIcons}>
        <button className={styles.bottomIcon} title="Home">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/>
          </svg>
        </button>
        <button className={styles.bottomIcon} title="Settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
            <path d="M10 1l-.5.5a6.5 6.5 0 00-2.5 5v.5H5a1 1 0 00-1 1v2a1 1 0 001 1h2v.5a6.5 6.5 0 002.5 5l.5.5.5-.5a6.5 6.5 0 002.5-5v-.5h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2v-.5a6.5 6.5 0 00-2.5-5L10 1z" fill="currentColor"/>
          </svg>
        </button>
        <button className={styles.bottomIcon} title="Power">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a1 1 0 011 1v6a1 1 0 11-2 0V3a1 1 0 011-1z" fill="currentColor"/>
            <path d="M6 4a6 6 0 108 0 1 1 0 00-1.732-.5A4 4 0 1110 14a4 4 0 01-3.732-2.5A1 1 0 006 4z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;