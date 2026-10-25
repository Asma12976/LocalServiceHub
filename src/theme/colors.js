// src/theme/colors.js

// Local Service Hub — Deep Dark Blue Theme

export const lightColors = {
  navy: '#071A2B',
  navySoft: '#0D2942',

  accent: '#1F4E79',
  accentGradientStart: '#2F6791',
  accentGradientEnd: '#163B5C',

  circleTint: 'rgba(47, 103, 145, 0.14)',
  circleTintSoft: 'rgba(47, 103, 145, 0.08)',
  circleTintFaint: 'rgba(7, 26, 43, 0.05)',

  background: '#F5F7F9',
  surface: '#FFFFFF',
  cardBg: '#E8EEF3',

  textPrimary: '#102536',
  textSecondary: '#5E7485',
  placeholder: '#91A5B3',

  border: '#D5E0E8',
  borderFocus: '#1F4E79',

  error: '#C63F3F',
  errorBg: '#FDF0F0',

  success: '#3E7658',

  white: '#FFFFFF',
  overlay: 'rgba(7, 26, 43, 0.68)',
};

// Same brand accent/navy tones as the light theme (so headers/gradients/
// buttons stay recognizably "the app"), but every surface, background, and
// text color is flipped for a real dark UI rather than just dimming the
// light one.
export const darkColors = {
  navy: '#071A2B',
  navySoft: '#0D2942',

  accent: '#4E8BBF',
  accentGradientStart: '#2F6791',
  accentGradientEnd: '#163B5C',

  circleTint: 'rgba(78, 139, 191, 0.20)',
  circleTintSoft: 'rgba(78, 139, 191, 0.12)',
  circleTintFaint: 'rgba(255, 255, 255, 0.06)',

  background: '#0B121C',
  surface: '#141E2B',
  cardBg: '#1B2734',

  textPrimary: '#EAF1F7',
  textSecondary: '#9FB2C2',
  placeholder: '#657789',

  border: '#26333F',
  borderFocus: '#4E8BBF',

  error: '#E36767',
  errorBg: 'rgba(227, 103, 103, 0.12)',

  success: '#5FA97E',

  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

// Default export used everywhere that hasn't switched to useTheme() yet -
// keeps this always equal to the light palette so existing screens are
// unaffected. Screens that want to follow the user's Dark Mode setting
// should pull colors from useTheme() (src/context/ThemeContext.js) instead.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: {
    fontSize: 30,
    fontWeight: '800',
  },

  h2: {
    fontSize: 22,
    fontWeight: '700',
  },

  h3: {
    fontSize: 17,
    fontWeight: '600',
  },

  body: {
    fontSize: 14,
    fontWeight: '400',
  },

  small: {
    fontSize: 12,
    fontWeight: '400',
  },
};

export default colors;