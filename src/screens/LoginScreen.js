
// src/screens/LoginScreen.js
import React, { useState, useMemo } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
import AuthBackdrop from '../components/Authbackdrop';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import Logo from '../components/Logo';
import { spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { validateEmail } from '../utils/validation';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = !password ? 'Password is required' : null;

    const newErrors = {
      email: emailError,
      password: passwordError,
    };

    setErrors(newErrors);

    if (emailError || passwordError) return;

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      let role = 'customer';
      try {
        const userSnap = await getDoc(doc(db, 'users', credential.user.uid));
        if (userSnap.exists()) {
          role = userSnap.data()?.role || 'customer';
        }
      } catch (roleErr) {
        console.log('Could not read role after login:', roleErr?.message);
      }

      setLoading(false);

      navigation.reset({
        index: 0,
        routes: [{ name: role === 'admin' ? 'AdminApp' : 'MainApp' }],
      });
    } catch (error) {
      setLoading(false);

      let message = 'Login failed. Please try again.';

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Login Failed', message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AuthBackdrop />
          <View style={styles.headerContent}>
            <Logo size={84} />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>
        </View>

        <View style={styles.card}>
          <InputField
            label="Email Address"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email)
                setErrors((e) => ({ ...e, email: null }));
            }}
            keyboardType="email-address"
            error={errors.email}
          />

          <InputField
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password)
                setErrors((e) => ({ ...e, password: null }));
            }}
            secureTextEntry
            error={errors.password}
          />

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <GradientButton
            title="Login"
            onPress={handleLogin}
            loading={loading}
          />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.signupLink}>Create Account</Text>
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
      paddingTop: 76,
      paddingBottom: 60,
      overflow: 'hidden',
    },
    headerContent: {
      alignItems: 'center',
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.white,
      marginTop: 22,
    },
    subtitle: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 14,
      marginTop: 6,
    },
    card: {
      backgroundColor: colors.cardBg,
      marginTop: -28,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      minHeight: 420,
    },
    forgotLink: {
      alignSelf: 'flex-end',
      marginBottom: spacing.lg,
    },
    forgotText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.xl,
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

