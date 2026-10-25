// src/screens/customer/SettingsScreen.js
// Reached from ProfileScreen's "Settings" menu item and from the drawer's
// "Settings" item (see CustomerNavigator.js — both just navigate('Settings')
// so they land on this exact same screen).
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Everything below reads from the live theme instead of the static
  // `colors` export, and the styles are rebuilt whenever it changes - so
  // flipping Dark Mode below recolors this whole screen immediately,
  // proving the switch actually does something rather than just sitting
  // there.
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

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
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="moon"
            label="Dark Mode"
            value={isDark}
            onValueChange={toggleTheme}
            colors={colors}
            isLast
          />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <MenuRow icon="person" label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} colors={colors} />
          <MenuRow icon="lock-closed" label="Change Password" onPress={handleChangePassword} colors={colors} isLast />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <MenuRow
            icon="help-circle"
            label="Help & Support"
            onPress={() => navigation.navigate('HelpSupport')}
            colors={colors}
            isLast
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>QuickServe v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ icon, label, value, onValueChange, isLast, colors }) {
  return (
    <View style={[rowStyles(colors).menuRow, isLast && rowStyles(colors).menuRowLast]}>
      <View style={rowStyles(colors).menuIconWrap}>
        <Ionicons name={`${icon}-outline`} size={17} color={colors.accent} />
      </View>
      <Text style={rowStyles(colors).menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function MenuRow({ icon, label, onPress, isLast, colors }) {
  return (
    <TouchableOpacity
      style={[rowStyles(colors).menuRow, isLast && rowStyles(colors).menuRowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={rowStyles(colors).menuIconWrap}>
        <Ionicons name={`${icon}-outline`} size={17} color={colors.accent} />
      </View>
      <Text style={rowStyles(colors).menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.placeholder} />
    </TouchableOpacity>
  );
}

// Shared row styling for ToggleRow/MenuRow - kept as a small function
// (rather than importing from makeStyles) so these two helper components
// don't need extra props threading beyond the `colors` they already take.
function rowStyles(colors) {
  return StyleSheet.create({
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuRowLast: {
      borderBottomWidth: 0,
    },
    menuIconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: colors.circleTintSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm + 2,
    },
    menuLabel: {
      flex: 1,
      fontSize: 13.5,
      color: colors.textPrimary,
      fontWeight: '600',
    },
  });
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

    sectionTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: spacing.sm,
      marginLeft: 2,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },

    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: radius.lg,
      backgroundColor: colors.errorBg,
    },
    logoutText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.error,
      marginLeft: 8,
    },

    versionText: {
      textAlign: 'center',
      fontSize: 11,
      color: colors.placeholder,
      marginTop: spacing.lg,
    },
  });
}
