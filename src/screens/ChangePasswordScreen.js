// src/screens/ChangePasswordScreen.js
// Reached from Settings > Account > "Change Password" (see SettingsScreen.js).
// Unlike ForgotPasswordScreen (for someone who's logged OUT and can't
// remember their password), this is for someone already logged IN who
// knows their current password and wants to set a new one, without
// leaving the app. Firebase treats updatePassword as a "sensitive"
// operation that needs a recent sign-in, so this re-authenticates with the
// current password first, then calls updatePassword - both go straight to
// Firebase Auth, so the change is real and takes effect immediately.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import { spacing, radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { validatePassword, validateConfirmPassword } from '../utils/validation';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export default function ChangePasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser || !firebaseUser.email) {
      Alert.alert('Change Password', 'You need to be logged in to change your password.');
      return;
    }

    // This account has no email/password credential to reauthenticate with
    // (e.g. it was only ever signed in another way) - updatePassword would
    // just fail, so say so up front instead of a confusing Firebase error.
    const hasPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === 'password'
    );
    if (!hasPasswordProvider) {
      Alert.alert(
        'Change Password',
        "This account doesn't use a password sign-in, so there's no password to change here."
      );
      return;
    }

    const currentPasswordError = currentPassword ? null : 'Current password is required';
    const newPasswordError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    const sameAsOldError =
      !newPasswordError && newPassword === currentPassword
        ? 'New password must be different from your current password'
        : null;

    const nextErrors = {
      currentPassword: currentPasswordError,
      newPassword: newPasswordError || sameAsOldError,
      confirmPassword: confirmError,
    };
    setErrors(nextErrors);

    if (nextErrors.currentPassword || nextErrors.newPassword || nextErrors.confirmPassword) {
      return;
    }

    setLoading(true);

    try {
      // Step 1: prove they still know the current password.
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      // Step 2: actually change it in Firebase Auth.
      await updatePassword(firebaseUser, newPassword);

      setLoading(false);
      setDone(true);
    } catch (error) {
      setLoading(false);

      let message = 'Unable to update your password. Please try again.';

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Your current password is incorrect.';
        setErrors((prev) => ({ ...prev, currentPassword: 'Incorrect password' }));
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please wait a moment and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'For your security, please log out and log back in before changing your password.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Please choose a stronger password.';
      }

      Alert.alert('Change Password', message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Change Password</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {done ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={30} color={colors.white} />
            </View>
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successText}>
              Your password has been changed. Use your new password the next time you log in.
            </Text>
            <GradientButton
              title="Done"
              onPress={() => navigation.goBack()}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />
          </View>
        ) : (
          <>
            <Text style={styles.instructions}>
              Enter your current password, then choose a new one.
            </Text>

            <InputField
              label="Current Password"
              icon="lock-closed-outline"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={(t) => {
                setCurrentPassword(t);
                if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: null }));
              }}
              secureTextEntry
              error={errors.currentPassword}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotLinkText}>Forgot your current password?</Text>
            </TouchableOpacity>

            <InputField
              label="New Password"
              icon="lock-closed-outline"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
              }}
              secureTextEntry
              error={errors.newPassword}
            />

            <InputField
              label="Confirm New Password"
              icon="lock-closed-outline"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
              }}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <GradientButton
              title="Update Password"
              onPress={handleSave}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  instructions: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },

  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  forgotLinkText: {
    color: colors.accent,
    fontSize: 12.5,
    fontWeight: '600',
  },

  successBox: {
    alignItems: 'center',
    paddingTop: spacing.xl,
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
    paddingHorizontal: spacing.md,
  },
});
}
