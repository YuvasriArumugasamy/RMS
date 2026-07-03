// Lightweight form validation — no external library needed

export const rules = {
  required: (value) => {
    if (!value || String(value).trim() === '') return 'This field is required.';
    return null;
  },
  minLength: (min) => (value) => {
    if (!value || String(value).length < min) return `Minimum ${min} characters required.`;
    return null;
  },
  maxLength: (max) => (value) => {
    if (value && String(value).length > max) return `Maximum ${max} characters allowed.`;
    return null;
  },
  min: (minVal) => (value) => {
    if (Number(value) < minVal) return `Minimum value is ${minVal}.`;
    return null;
  },
  max: (maxVal) => (value) => {
    if (Number(value) > maxVal) return `Maximum value is ${maxVal}.`;
    return null;
  },
  phone: (value) => {
    if (!value) return null;
    if (!/^\+?[\d\s-]{7,15}$/.test(value)) return 'Enter a valid phone number.';
    return null;
  },
  email: (value) => {
    if (!value) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
    return null;
  },
  positiveNumber: (value) => {
    if (!value && value !== 0) return null;
    if (isNaN(Number(value)) || Number(value) <= 0) return 'Enter a positive number.';
    return null;
  },
  password: (value) => {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters.';
    return null;
  },
};

/**
 * Validate a form values object against a schema.
 * schema: { fieldName: [ruleFn, ruleFn, ...] }
 * Returns: { errors: { fieldName: 'error message' }, isValid: boolean }
 */
export const validate = (values, schema) => {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of fieldRules) {
      const error = rule(values[field]);
      if (error) { errors[field] = error; break; }
    }
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
};

/**
 * useFormValidation hook — lightweight form state with validation
 */
import { useState, useCallback } from 'react';

export const useFormValidation = (initialValues, schema) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;
    setValues(prev => ({ ...prev, [name]: newVal }));
    // Clear error on change
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (schema[name]) {
      for (const rule of schema[name]) {
        const error = rule(values[name]);
        if (error) { setErrors(prev => ({ ...prev, [name]: error })); break; }
        else setErrors(prev => ({ ...prev, [name]: null }));
      }
    }
  }, [values, schema]);

  const validateAll = useCallback(() => {
    const { errors: newErrors, isValid } = validate(values, schema);
    setErrors(newErrors);
    setTouched(Object.keys(schema).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return isValid;
  }, [values, schema]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  return { values, errors, touched, handleChange, handleBlur, validateAll, reset, setValue, setValues };
};
