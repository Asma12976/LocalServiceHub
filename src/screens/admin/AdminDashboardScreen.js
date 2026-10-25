// src/screens/admin/AdminDashboardScreen.js
// Landing tab of the Admin Panel — a quick read on platform health
// (pending providers, open disputes, flagged reviews) with shortcuts into
// the other admin tabs, plus logout.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useProvider } from '../../context/ProviderContext';
import { useAdmin } from '../../context/AdminContext';

export default function AdminDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { user } = useUser();
  const { allProvidersRaw, loadingAllProviders } = useProvider();
  const { openDisputes, flaggedReviews, loading: loadingAdmin, error } = useAdmin();

  const pendingProviders = allProvidersRaw.filter((p) => p.status === 'pending').length;
  const suspendedProviders = allProvidersRaw.filter((p) => p.status === 'suspended').length;
  const approvedProviders = allProvidersRaw.filter((p) => p.status === 'approved').length;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of the Admin Panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
      },
    ]);
  };

  const stats = [
    {
      label: 'Approved Providers',
      value: approvedProviders,
      icon: 'checkmark-circle-outline',
      color: colors.success,
      onPress: () => navigation.navigate('Providers', { statusFilter: 'approved' }),
    },
    {
      label: 'Pending Approval',
      value: pendingProviders,
      icon: 'time-outline',
      color: '#D97706',
      onPress: () => navigation.navigate('Providers', { statusFilter: 'pending' }),
    },
    {
      label: 'Suspended',
      value: suspendedProviders,
      icon: 'ban-outline',
      color: colors.error,
      onPress: () => navigation.navigate('Providers', { statusFilter: 'suspended' }),
    },
    {
      label: 'Open Disputes',
      value: openDisputes.length,
      icon: 'alert-circle-outline',
      color: colors.error,
      onPress: () => navigation.navigate('Disputes'),
    },
    {
      label: 'Flagged Reviews',
      value: flaggedReviews.length,
      icon: 'flag-outline',
      color: '#D97706',
      onPress: () => navigation.navigate('Reviews'),
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
        >
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerEyebrow}>ADMIN PANEL</Text>
              <Text style={styles.headerTitle}>Hi, {user?.name || 'Admin'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Moderate providers, resolve disputes, and manage reviews across Local Service Hub.
          </Text>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl + 40 }}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={stat.onPress}
            >
              <View style={styles.statCardInner}>
                <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}1A` }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={styles.statValue}>
                  {loadingAllProviders || loadingAdmin ? '—' : stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Providers')}
        >
          <Ionicons name="briefcase-outline" size={18} color={colors.accent} />
          <Text style={styles.actionText}>Review & moderate provider listings</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Disputes')}
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.actionText}>Resolve open customer/provider disputes</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Reviews')}
        >
          <Ionicons name="star-outline" size={18} color={colors.accent} />
          <Text style={styles.actionText}>Hide fake or reported reviews</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
    headerGradient: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerEyebrow: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    headerTitle: { color: colors.white, fontSize: 21, fontWeight: '800', marginTop: 4 },
    headerSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12.5,
      marginTop: 10,
      lineHeight: 17,
    },
    logoutBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.errorBg,
      borderRadius: radius.md,
      padding: spacing.sm + 2,
      marginBottom: spacing.md,
    },
    errorBannerText: { color: colors.error, fontSize: 12, marginLeft: 8, flex: 1 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
    statCard: {
      width: '50%',
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.sm + 2,
    },
    statCardInner: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm + 4,
    },
    statIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
    statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm + 4,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: { flex: 1, marginLeft: 10, fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  });
}