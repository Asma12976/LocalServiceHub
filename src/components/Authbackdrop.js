// src/components/AuthBackdrop.js
// Soft, monochrome glowing circles on a dark navy background — subtle depth,
// not a busy multi-color pattern. Reused on Splash + every auth header.
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function AuthBackdrop() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleLeft]} />
      <View style={[styles.circle, styles.circleBottomRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleTopRight: {
    width: 220,
    height: 220,
    top: -80,
    right: -60,
    backgroundColor: colors.circleTint,
  },
  circleLeft: {
    width: 160,
    height: 160,
    top: 110,
    left: -80,
    backgroundColor: colors.circleTintSoft,
  },
  circleBottomRight: {
    width: 90,
    height: 90,
    top: '62%',
    right: -20,
    backgroundColor: colors.circleTintFaint,
  },
  circleBottomLeft: {
    width: 28,
    height: 28,
    bottom: 30,
    left: 24,
    backgroundColor: colors.circleTintSoft,
  },
});
}