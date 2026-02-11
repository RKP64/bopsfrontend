import React from 'react';
import styles from './Input.module.css';

/**
 * Reusable Input component.
 * Supports various input types and a textarea.
 *
 * @param {object} props - Component props.
 * @param {string} [props.label] - Optional label for the input.
 * @param {string} [props.type='text'] - Input type ('text', 'email', 'password', 'number', 'textarea').
 * @param {string} [props.value] - The current value of the input.
 * @param {function} [props.onChange] - Change event handler.
 * @param {string} [props.placeholder] - Placeholder text.
 * @param {boolean} [props.disabled=false] - Whether the input is disabled.
 * @param {boolean} [props.readOnly=false] - Whether the input is read-only.
 * @param {string} [props.className=''] - Additional CSS classes for custom styling.
 * @param {number} [props.rows] - Number of rows for textarea.
 * @param {string} [props.id] - ID for the input, useful for labels.
 * @param {object} [props.rest] - Any other HTML input/textarea attributes.
 */
const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  className = '',
  rows,
  id,
  ...rest
}) => {
  const inputClasses = `${styles.inputBase} ${className}`;

  return (
    <div className={styles.inputWrapper}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      {type === 'textarea' ? (
        <textarea
          id={id}
          className={`${inputClasses} ${styles.textarea}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          {...rest}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={inputClasses}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          {...rest}
        />
      )}
    </div>
  );
};

export default Input;