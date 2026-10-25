// src/screens/SplashScreen.js
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import AuthBackdrop from '../components/Authbackdrop';
import Logo from '../components/Logo';
import { useTheme } from '../context/ThemeContext';

function PulsingDot({ delay, styles}) {
  const anim = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.25, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[styles.dot, { opacity: anim }]} />;
}

export default function SplashScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const timer = setTimeout(() => navigation.replace('Login'), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <AuthBackdrop />

      <Animated.View style={[styles.center, { opacity: fade }]}>
        <Logo size={84} />
        <Text style={styles.appName}>Local Service Hub</Text>
        <Text style={styles.tagline}>Find. Book. Get It Done.</Text>
      </Animated.View>

      <View style={styles.loader}>
        <PulsingDot styles={styles} delay={0} />
        <PulsingDot styles={styles} delay={150} />
        <PulsingDot styles={styles} delay={300} />
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginTop: 22,
    letterSpacing: 0.2,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 6,
  },
  loader: {
    position: 'absolute',
    bottom: 56,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
});
}