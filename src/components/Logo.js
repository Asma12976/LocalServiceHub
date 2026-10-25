// src/components/Logo.js
// Rounded gradient badge with a glow, containing a simple line icon —
// matches the reference style (glowing colored square + white icon).
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function Logo({ size = 84 }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <LinearGradient
      colors={[colors.accentGradientStart, colors.accentGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          shadowColor: colors.accentGradientStart,
        },
      ]}
    >
      <Ionicons name="construct" size={size * 0.42} color={colors.white} />
    </LinearGradient>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
}