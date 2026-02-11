import React from 'react';
import styles from './Spinner.module.css';

/**
 * Reusable Spinner component for loading indicators.
 *
 * @param {object} props - Component props.
 * @param {string} [props.size='medium'] - Size of the spinner ('small', 'medium', 'large').
 * @param {string} [props.color='primary'] - Color variant ('primary', 'white', 'dark').
 * @param {string} [props.className=''] - Additional CSS classes.
 */
const Spinner = ({ size = 'medium', color = 'primary', className = '' }) => {
  const spinnerClasses = `${styles.spinner} ${styles[size]} ${styles[color]} ${className}`;
  return (
    <div className={spinnerClasses} role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span> {/* For screen readers */}
    </div>
  );
};

export default Spinner;