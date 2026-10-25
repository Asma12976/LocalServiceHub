// src/screens/provider/ProviderBookingDetailsScreen.js
// Full detail view of a single incoming booking — opened by tapping a card
// on ProviderBookingsScreen. Mirrors the customer-side BookingDetailsScreen
// but from the provider's point of view: shows the customer's photo, name
// and phone (kept live via BookingsContext's customer-profile enrichment,
// see comment in BookingsContext.js), the job details, and the same
// Confirm / Mark Complete actions available on the list screen.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { getBookingStatusMeta } from '../../utils/bookingStatus';

export default function ProviderBookingDetailsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { getIncomingBookingById, confirmBooking, completeBooking } = useBookings();
  const { bookingId } = route.params || {};
  const booking = getIncomingBookingById(bookingId);

  if (!booking) {
    return (
      <View style={styles.missingScreen}>
        <Text style={styles.missingText}>Booking not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.missingBtn}>
          <Text style={styles.missingBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusMeta = getBookingStatusMeta(booking.status);
  const customerName = booking.customer?.name || 'Customer';

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Booking',
      `Confirm ${booking.service?.name || 'this service'} for ${customerName}? You'll be marked busy until it's complete.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        { text: 'Confirm', onPress: () => confirmBooking(booking.id) },
      ]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      'Mark as Complete',
      `Mark this job as complete? You'll be shown as available again and ${customerName} will be able to leave a review.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        { text: 'Mark Complete', onPress: () => completeBooking(booking.id) },
      ]
    );
  };

  const handleCall = () => {
    const phone = booking.customer?.phone?.trim();

    if (!phone) {
      Alert.alert('No Phone Number', `${customerName} hasn't added a contact number yet.`);
      return;
    }

    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Unable to Call', 'This device cannot place a call right now.')
    );
  };

  const handleChat = () => {
    if (!booking.customerId) {
      Alert.alert('Unavailable', `${customerName} can't be messaged right now.`);
      return;
    }

    navigation.navigate('Chat', {
      otherUser: {
        uid: booking.customerId,
        name: customerName,
        photo: booking.customer?.photo,
      },
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Header */}
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
            <Text style={styles.headerTitle}>Booking Details</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
          <Text style={styles.headerBookingId}>Booking ID: {booking.id}</Text>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (['pending', 'accepted'].includes(booking.status) ? 110 : 40),
        }}
      >
        {/* Status */}
        <View style={styles.section}>
          <View style={[styles.statusBanner, { backgroundColor: statusMeta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={[styles.statusBannerText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerCard}>
            {booking.customer?.photo ? (
              <Image source={{ uri: booking.customer.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={22} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.serviceName}>{booking.service?.name}</Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            <DetailRow colors={colors} styles={styles} icon="calendar-outline" label="Date" value={booking.dateLabel} />
            <DetailRow colors={colors} styles={styles} icon="time-outline" label="Time" value={booking.timeSlot} />
            <DetailRow colors={colors} styles={styles} icon="location-outline" label="Address" value={booking.address} />
            {booking.estimate ? (
              <DetailRow colors={colors} styles={styles}
                icon="cash-outline"
                label="Estimate"
                value={`Rs. ${booking.estimate.low} – ${booking.estimate.high}`}
              />
            ) : null}
          </View>
        </View>

        {/* Problem description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Description</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{booking.problemDescription}</Text>
            {booking.imageUrl ? (
              <Image source={{ uri: booking.imageUrl }} style={styles.problemImage} resizeMode="cover" />
            ) : null}
          </View>
        </View>

        {/* Review, once completed */}
        {booking.status === 'completed' && booking.review ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Review</Text>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeaderRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.reviewRatingText}>{booking.review.rating} / 5</Text>
              </View>
              {booking.review.comment ? (
                <Text style={styles.reviewComment}>{booking.review.comment}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
          <Ionicons name="call-outline" size={20} color={colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.85}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>

        {booking.status === 'pending' ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm} activeOpacity={0.9}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Confirm Booking</Text>
          </TouchableOpacity>
        ) : null}

        {booking.status === 'accepted' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, styles.completeBtn]}
            onPress={handleComplete}
            activeOpacity={0.9}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Mark Complete</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, colors, styles}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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

  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  headerBookingId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: spacing.sm,
  },

  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '800',
  },

  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  serviceName: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm + 2,
  },
  detailLabel: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginLeft: 8,
    width: 62,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  problemImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  reviewComment: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  callBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    marginRight: spacing.sm,
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: 6,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  completeBtn: {
    backgroundColor: colors.success,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.white,
    marginLeft: 6,
  },
});
}