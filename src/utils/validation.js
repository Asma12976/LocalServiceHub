// src/utils/validation.js
// Pure client-side validation — no network / storage calls here.

export const validateName = (name) => {
  if (!name || !name.trim()) return 'Full name is required';
  if (name.trim().length < 3) return 'Name must be at least 3 characters';
  if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) return 'Name contains invalid characters';
  return null;
};

export const validateEmail = (email) => {
  if (!email || !email.trim()) return 'Email is required';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email.trim())) return 'Enter a valid email address';
  return null;
};

export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) return 'Phone number is required';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return 'Enter a valid phone number';
  return null;
};

// Password must be 8+ chars, at least 1 uppercase, 1 lowercase, 1 number
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password needs at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password needs at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password needs at least one number';
  return null;
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
};

// Simple password strength score 0-4, used to drive a strength meter in the UI
export const getPasswordStrength = (password) => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0-4
};