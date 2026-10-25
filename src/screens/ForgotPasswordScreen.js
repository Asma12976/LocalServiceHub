// src/screens/ForgotPasswordScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthBackdrop from '../components/Authbackdrop';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import Logo from '../components/Logo';

import { spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { validateEmail } from '../utils/validation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

const handleReset = async () => {
  const emailError = validateEmail(email);
  setError(emailError);

  if (emailError) return;

  setLoading(true);

  try {
    await sendPasswordResetEmail(auth, email.trim());

    setLoading(false);
    setSent(true);
  } catch (error) {
    setLoading(false);

    let message = 'Unable to send reset email. Please try again.';

    if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error.code === 'auth/user-not-found') {
      message = 'No account was found with this email address.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your internet connection.';
    }

    Alert.alert('Reset Password', message);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AuthBackdrop />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Logo size={72} />
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>No worries, we'll help you reset it</Text>
          </View>
        </View>

        <View style={styles.card}>
          {sent ? (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={30} color={colors.white} />
              </View>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                If an account exists for {email}, a password reset link has been
                sent to your email. Please check your inbox.
              </Text>
              <GradientButton
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
                style={{ marginTop: spacing.xl, width: '100%' }}
              />
            </View>
          ) : (
            <>
              <Text style={styles.instructions}>
                Enter the email associated with your account and we'll send you a
                link to reset your password.
              </Text>
              <InputField
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
                error={error}
              />
              <GradientButton
                title="Send Reset Link"
                onPress={handleReset}
                loading={loading}
                style={{ marginTop: spacing.sm }}
              />
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.backLinkText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    backgroundColor: colors.navy,
    paddingTop: 64,
    paddingBottom: 50,
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    top: 62,
    left: spacing.lg,
    zIndex: 2,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginTop: 18,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: colors.cardBg,
    marginTop: -28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    minHeight: 360,
  },
  instructions: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  backLinkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  successText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },
});
}