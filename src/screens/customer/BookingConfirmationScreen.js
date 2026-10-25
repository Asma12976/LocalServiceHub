// src/screens/customer/BookingConfirmationScreen.js
// Shown immediately after BookingScreen's "Confirm Booking" succeeds.
// Matches the spec's "Booking Request Sent" screen — provider, service,
// date, time and a Pending status — with quick actions to view the full
// booking or head back to Home.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { getBookingStatusMeta } from '../../utils/bookingStatus';

export default function BookingConfirmationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { getBookingById } = useBookings();
  const { bookingId } = route.params || {};
  const booking = getBookingById(bookingId);

  if (!booking) {
    return (
      <View style={styles.missingScreen}>
        <Text style={styles.missingText}>Booking not found.</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomerRoot')}
          style={styles.missingBtn}
        >
          <Text style={styles.missingBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusMeta = getBookingStatusMeta(booking.status);

  const handleViewBooking = () => {
    navigation.replace('BookingDetails', { bookingId: booking.id });
  };

  const handleBackToHome = () => {
    navigation.navigate('CustomerRoot', { screen: 'CustomerTabs', params: { screen: 'Home' } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <StatusBar style="dark" />

      <View style={styles.successIconWrap}>
        <Ionicons name="checkmark-circle" size={84} color={colors.success} />
      </View>

      <Text style={styles.title}>Booking Request Sent</Text>
      <Text style={styles.subtitle}>
        {booking.provider.name} will review your request and respond shortly.
      </Text>

      <View style={styles.card}>
        <View style={styles.providerRow}>
          <Image source={{ uri: booking.provider.image }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.providerName}>{booking.provider.name}</Text>
            <Text style={styles.serviceName}>{booking.service.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{booking.dateLabel}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{booking.timeSlot}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue} numberOfLines={2}>{booking.address}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleViewBooking} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>View Booking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackToHome} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  missingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  missingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  missingBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  missingBtnText: {
    color: colors.white,
    fontWeight: '700',
  },

  successIconWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  providerName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  serviceName: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  detailLabel: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginLeft: 8,
    width: 60,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  actions: {
    marginTop: spacing.xl,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 14.5,
    fontWeight: '800',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '700',
  },
});
}
