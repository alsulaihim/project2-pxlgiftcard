/**
 * Validated Input Component with built-in validation and formatting
 */

import React, { useState, useEffect } from 'react';
import { validateUsername, validateEmail, validateAmount, validateMessage, formatBalanceInput, enforceUsernamePrefix } from '@/lib/validation';

interface ValidatedInputProps {
  type: 'username' | 'email' | 'amount' | 'message' | 'text';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  validateOnEmpty?: boolean; // New prop to control validation on empty fields
}

/**
 * Validated input component with automatic validation and formatting
 */
export function ValidatedInput({
  type,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  className = '',
  maxLength,
  onValidationChange,
  validateOnEmpty = false
}: ValidatedInputProps) {
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  // Validate input based on type
  const validateInput = (inputValue: string) => {
    let validation;
    
    switch (type) {
      case 'username':
        validation = validateUsername(inputValue, required && validateOnEmpty);
        break;
      case 'email':
        validation = validateEmail(inputValue, required && validateOnEmpty);
        break;
      case 'amount':
        validation = validateAmount(inputValue, required && validateOnEmpty);
        break;
      case 'message':
        validation = validateMessage(inputValue, required && validateOnEmpty);
        break;
      default:
        validation = { isValid: true };
    }
    
    const errorMessage = validation.isValid ? '' : validation.error || '';
    setError(errorMessage);
    
    if (onValidationChange) {
      onValidationChange(validation.isValid, errorMessage);
    }
    
    return validation.isValid;
  };

  // Handle input change with formatting
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Apply formatting based on type
    switch (type) {
      case 'username':
        newValue = enforceUsernamePrefix(newValue);
        break;
      case 'amount':
        newValue = formatBalanceInput(newValue);
        break;
    }
    
    onChange(newValue);
  };

  // Handle blur for validation
  const handleBlur = () => {
    setTouched(true);
    validateInput(value);
  };

  // Validate on value change if already touched
  useEffect(() => {
    if (touched) {
      validateInput(value);
    }
  }, [value, touched]);

  const inputClasses = `
    w-full rounded-lg border bg-black px-3 py-2 text-white placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
    ${error && touched ? 'border-red-500' : 'border-gray-700 hover:border-gray-600'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  const isTextarea = type === 'message';
  const inputType = type === 'amount' ? 'text' : type === 'username' ? 'text' : type;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {isTextarea ? (
          <textarea
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={3}
            className={inputClasses}
          />
        ) : (
          <input
            type={inputType}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={inputClasses}
          />
        )}
      </div>
      
      {/* Fixed height container for error message to prevent layout shift */}
      <div className="h-5 mt-1">
        {error && touched && (
          <p className="text-sm text-red-400 absolute">{error}</p>
        )}
      </div>
      
      {type === 'message' && maxLength && (
        <p className="text-xs text-gray-500 text-right mt-1">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
