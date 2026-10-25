// src/screens/SignupScreen.js
import React, { useState, useMemo } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
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
import { spacing, radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
  validateRequired,
  getPasswordStrength,
} from '../utils/validation';

const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#DC2626', '#EA580C', '#D97706', '#16A34A', '#15803D'];

export default function SignupScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
    area: '',
  });
  const [role, setRole] = useState('customer'); // 'customer' | 'provider'
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const strength = getPasswordStrength(form.password);

  const handleSignup = async () => {
  const newErrors = {
    name: validateName(form.name),
    email: validateEmail(form.email),
    phone: validatePhone(form.phone),
    password: validatePassword(form.password),
    confirmPassword: validateConfirmPassword(
      form.password,
      form.confirmPassword
    ),
    city: validateRequired(form.city, 'City'),
    area: validateRequired(form.area, 'Area'),
  };

  setErrors(newErrors);

  if (Object.values(newErrors).some(Boolean)) return;

  setLoading(true);

  try {
    // 1. Create Firebase Authentication account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      form.email.trim(),
      form.password
    );

    const user = userCredential.user;

    // 2. Save user's name in Firebase Authentication profile
    await updateProfile(user, {
      displayName: form.name.trim(),
    });

    // 3. Save complete user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      area: form.area.trim(),
      role: role,
      createdAt: serverTimestamp(),
    });

    setLoading(false);

    Alert.alert(
  'Account Created',
  `Welcome, ${form.name.split(' ')[0]}! Your account has been created successfully.`,
  [
    {
      text: 'OK',
      onPress: () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      },
    },
  ]
);
  } catch (error) {
    setLoading(false);

    let message = 'Something went wrong. Please try again.';

    if (error.code === 'auth/email-already-in-use') {
      message = 'This email is already registered.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your internet connection.';
    }

    Alert.alert('Signup Failed', message);
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
            <Logo size={64} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Local Service Hub today</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>I want to join as</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
              onPress={() => setRole('customer')}
            >
              <Ionicons
                name="person-outline"
                size={17}
                color={role === 'customer' ? colors.white : colors.accent}
              />
              <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'provider' && styles.roleBtnActive]}
              onPress={() => setRole('provider')}
            >
              <Ionicons
                name="construct-outline"
                size={17}
                color={role === 'provider' ? colors.white : colors.accent}
              />
              <Text style={[styles.roleText, role === 'provider' && styles.roleTextActive]}>
                Service Provider
              </Text>
            </TouchableOpacity>
          </View>

          <InputField
            label="Full Name"
            icon="person-outline"
            placeholder="Your full name"
            value={form.name}
            onChangeText={(t) => setField('name', t)}
            autoCapitalize="words"
            error={errors.name}
          />
          <InputField
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(t) => setField('email', t)}
            keyboardType="email-address"
            error={errors.email}
          />
          <InputField
            label="Phone"
            icon="call-outline"
            placeholder="03XXXXXXXXX"
            value={form.phone}
            onChangeText={(t) => setField('phone', t)}
            keyboardType="phone-pad"
            error={errors.phone}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <InputField
                label="City"
                icon="location-outline"
                placeholder="e.g. Lahore"
                value={form.city}
                onChangeText={(t) => setField('city', t)}
                autoCapitalize="words"
                error={errors.city}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <InputField
                label="Area"
                icon="map-outline"
                placeholder="e.g. Johar Town"
                value={form.area}
                onChangeText={(t) => setField('area', t)}
                autoCapitalize="words"
                error={errors.area}
              />
            </View>
          </View>

          <InputField
            label="Password"
            icon="lock-closed-outline"
            placeholder="Min. 8 characters"
            value={form.password}
            onChangeText={(t) => setField('password', t)}
            secureTextEntry
            error={errors.password}
          />

          {form.password.length > 0 && (
            <View style={styles.strengthWrapper}>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    { width: `${(strength / 4) * 100}%`, backgroundColor: STRENGTH_COLORS[strength] },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                {STRENGTH_LABELS[strength]}
              </Text>
            </View>
          )}

          <InputField
            label="Confirm Password"
            icon="lock-closed-outline"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChangeText={(t) => setField('confirmPassword', t)}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <GradientButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signupLink}>Login</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 46,
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
    marginTop: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.cardBg,
    marginTop: -24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: colors.white,
  },
  roleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  roleTextActive: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
  },
  strengthWrapper: {
    marginTop: -8,
    marginBottom: spacing.md,
  },
  strengthBarBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signupText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  signupLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
}