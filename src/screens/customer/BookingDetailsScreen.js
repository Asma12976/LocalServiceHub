// src/screens/customer/BookingDetailsScreen.js
// Full detail view of a single booking — opened from BookingsScreen (My
// Bookings) or right after confirming a new booking. Shows every field from
// the spec (booking id, provider, service, date, time, address, problem
// description, estimate, status) plus Call / Chat / Cancel actions.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { getBookingStatusMeta } from '../../utils/bookingStatus';
import DisputeModal from '../../components/DisputeModal';

export default function BookingDetailsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { getBookingById, cancelBooking, fileDispute } = useBookings();
  const { bookingId } = route.params || {};
  const booking = getBookingById(bookingId);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);

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
  const canCancel = ['pending', 'accepted'].includes(booking.status);
  const canReview = booking.status === 'completed' && !booking.review;
  // A dispute only makes sense once the provider has actually engaged with
  // the job (not while it's still just "pending"), and only one dispute
  // can be open on a booking at a time.
  const canDispute =
    ['accepted', 'on_the_way', 'in_progress', 'completed'].includes(booking.status) &&
    (!booking.dispute || booking.dispute.status !== 'open');

  const handleCall = () => {
    const phone = booking.provider?.phone?.trim();

    if (!phone) {
      Alert.alert(
        'No Phone Number',
        `${booking.provider?.name || 'This provider'} hasn't added a contact number yet.`
      );
      return;
    }

    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Unable to Call', 'This device cannot place a call right now.')
    );
  };

  const handleChat = () => {
    if (!booking.provider?.id) {
      Alert.alert('Unavailable', `${booking.provider?.name || 'This provider'} can't be messaged right now.`);
      return;
    }

    navigation.navigate('Chat', {
      otherUser: {
        uid: booking.provider.id,
        name: booking.provider.name,
        photo: booking.provider.image,
      },
    });
  };

  const handleSubmitDispute = async (reason) => {
    setSubmittingDispute(true);
    try {
      await fileDispute(booking.id, reason);
      setDisputeModalVisible(false);
      Alert.alert(
        'Dispute Submitted',
        "We've received your dispute and our support team will review it shortly."
      );
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not submit your dispute. Please try again.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelBooking(booking.id),
        },
      ]
    );
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
        contentContainerStyle={{ paddingBottom: insets.bottom + (canCancel || canReview ? 100 : 40) }}
      >
        {/* Status */}
        <View style={styles.section}>
          <View style={[styles.statusBanner, { backgroundColor: statusMeta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={[styles.statusBannerText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        {/* Provider */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.providerCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ProviderDetails', { provider: booking.provider })}
          >
            <Image source={{ uri: booking.provider.image }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>{booking.provider.name}</Text>
              <Text style={styles.serviceName}>{booking.service.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
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
            {booking.hasImage ? (
              <View style={styles.imageTag}>
                <Ionicons name="image-outline" size={13} color={colors.accent} />
                <Text style={styles.imageTagText}>Photo attached</Text>
              </View>
            ) : null}
            {booking.imageUrl ? (
              <Image source={{ uri: booking.imageUrl }} style={styles.problemImage} resizeMode="cover" />
            ) : null}
          </View>
        </View>

        {/* Dispute — either the status of one already raised, or a way to
            raise a new one. Feeds straight into the Admin Panel's
            Disputes tab (AdminDisputesScreen). */}
        {booking.dispute ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dispute</Text>
            <View
              style={[
                styles.disputeBanner,
                booking.dispute.status === 'resolved' && { backgroundColor: 'rgba(22,163,74,0.10)' },
                booking.dispute.status === 'dismissed' && { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name={booking.dispute.status === 'open' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={16}
                color={booking.dispute.status === 'open' ? colors.error : colors.success}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.disputeStatusText}>
                  {booking.dispute.status === 'open'
                    ? 'Under review by our support team'
                    : booking.dispute.status === 'resolved'
                    ? 'Resolved'
                    : 'Dismissed'}
                </Text>
                <Text style={styles.disputeReasonText}>{booking.dispute.reason}</Text>
                {booking.dispute.resolutionNote ? (
                  <Text style={styles.disputeResolutionText}>Note: {booking.dispute.resolutionNote}</Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : canDispute ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.disputeLink}
              onPress={() => setDisputeModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="flag-outline" size={15} color={colors.error} />
              <Text style={styles.disputeLinkText}>Something wrong with this booking? Raise a dispute</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <DisputeModal
        visible={disputeModalVisible}
        onClose={() => setDisputeModalVisible(false)}
        onSubmit={handleSubmitDispute}
        colors={colors}
        submitting={submittingDispute}
      />

      {/* Sticky actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
          <Ionicons name="call-outline" size={20} color={colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.85}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>

        {canCancel ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        ) : null}

        {canReview ? (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => navigation.navigate('MyReviews')}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={15} color={colors.white} />
            <Text style={styles.reviewBtnText}>Rate & Review</Text>
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

  disputeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  disputeLinkText: {
    fontSize: 12.5,
    color: colors.error,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  disputeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  disputeStatusText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  disputeReasonText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  disputeResolutionText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
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

  providerCard: {
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
  imageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  imageTagText: {
    fontSize: 11.5,
    color: colors.accent,
    fontWeight: '700',
    marginLeft: 4,
  },
  problemImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginTop: spacing.sm,
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
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.error,
  },
  reviewBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  reviewBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.white,
    marginLeft: 6,
  },
});
}