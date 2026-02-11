import React from 'react';
import styles from './Button.module.css';

/**
 * Reusable Button component.
 *
 * @param {object} props - Component props.
 * @param {string} [props.variant='primary'] - Button style variant ('primary', 'secondary', 'danger', etc.).
 * @param {string} [props.size='medium'] - Button size ('small', 'medium', 'large').
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {React.ReactNode} props.children - The content to display inside the button.
 * @param {string} [props.type='button'] - The type attribute of the button ('button', 'submit', 'reset').
 * @param {string} [props.className=''] - Additional CSS classes for custom styling.
 * @param {function} [props.onClick] - Click event handler.
 * @param {object} [props.rest] - Any other HTML button attributes.
 */
const Button = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  children,
  type = 'button',
  className = '',
  onClick,
  ...rest
}) => {
  const buttonClasses = `${styles.button} ${styles[variant]} ${styles[size]} ${className}`;

  return (
    <button
      className={buttonClasses}
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;