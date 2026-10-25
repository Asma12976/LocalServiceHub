// src/screens/provider/ProviderBookingsScreen.js
// Provider-side "Booking Requests" screen — opened from ProfileScreen's
// Business menu (or tapping a "New Booking Request" notification). Shows
// every booking made *with* the logged-in provider (BookingsContext.
// incomingBookings), split into New / Confirmed / Completed:
//
//   New        -> "Confirm" button: booking -> accepted, provider goes
//                 busy, customer gets notified.
//   Confirmed  -> "Mark Complete" button: booking -> completed, provider
//                 goes available again, customer gets notified (and can
//                 now leave a review).
//   Completed  -> read-only, shows the customer's review once they leave
//                 one.
//
// Same visual language as the customer-facing BookingsScreen so the app
// feels like one product, not two.
//
// Tapping anywhere on a card (outside the Confirm/Mark Complete button)
// opens ProviderBookingDetailsScreen for the full picture.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { getBookingStatusMeta } from '../../utils/bookingStatus';

const FILTERS = [
  { key: 'new', label: 'New', statuses: ['pending'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['accepted'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
];

export default function ProviderBookingsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { incomingBookings, confirmBooking, completeBooking } = useBookings();
  const [activeFilter, setActiveFilter] = useState('new');

  const listByFilter = useMemo(() => {
    const map = {};
    FILTERS.forEach((f) => {
      map[f.key] = incomingBookings.filter((b) => f.statuses.includes(b.status));
    });
    return map;
  }, [incomingBookings]);

  const activeList = listByFilter[activeFilter];

  const emptyCopy = {
    new: {
      icon: 'calendar-outline',
      title: 'No new requests',
      text: 'Bookings customers make with you will show up here for you to confirm.',
    },
    confirmed: {
      icon: 'checkmark-circle-outline',
      title: 'No confirmed jobs',
      text: 'Once you confirm a request, it will move here until you mark it complete.',
    },
    completed: {
      icon: 'checkmark-done-outline',
      title: 'No completed jobs yet',
      text: 'Jobs you finish will appear here, along with any customer review.',
    },
  }[activeFilter];

  const handleConfirm = (booking) => {
    Alert.alert(
      'Confirm Booking',
      `Confirm ${booking.service?.name || 'this service'} for ${booking.customer?.name || 'this customer'}? You'll be marked busy until it's complete.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        { text: 'Confirm', onPress: () => confirmBooking(booking.id) },
      ]
    );
  };

  const handleComplete = (booking) => {
    Alert.alert(
      'Mark as Complete',
      `Mark this job as complete? You'll be shown as available again and ${booking.customer?.name || 'the customer'} will be able to leave a review.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        { text: 'Mark Complete', onPress: () => completeBooking(booking.id) },
      ]
    );
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
            <Text style={styles.headerTitle}>Booking Requests</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
          <Text style={styles.headerSubtitle}>Confirm new jobs and mark finished ones complete</Text>

          <View style={styles.filterRow}>
            {FILTERS.map((filter) => {
              const isActive = filter.key === activeFilter;
              return (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                  <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                    <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                      {listByFilter[filter.key].length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </View>

      <FlatList
        data={activeList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          activeList.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <BookingRequestCard colors={colors} styles={styles}
            booking={item}
            onPress={() => navigation.navigate('ProviderBookingDetails', { bookingId: item.id })}
            onConfirm={() => handleConfirm(item)}
            onComplete={() => handleComplete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={emptyCopy.icon} size={36} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
            <Text style={styles.emptyText}>{emptyCopy.text}</Text>
          </View>
        }
      />
    </View>
  );
}

function BookingRequestCard({ booking, onPress, onConfirm, onComplete, colors, styles}) {
  const statusMeta = getBookingStatusMeta(booking.status);
  const customerName = booking.customer?.name || 'Customer';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardTopRow}>
        {booking.customer?.photo ? (
          <Image source={{ uri: booking.customer.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.serviceName} numberOfLines={1}>{booking.service?.name}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
          <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.metaText}>{booking.dateLabel}</Text>
        <Ionicons name="time-outline" size={13} color={colors.textSecondary} style={{ marginLeft: spacing.sm }} />
        <Text style={styles.metaText}>{booking.timeSlot}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.metaText} numberOfLines={1}>{booking.address}</Text>
      </View>

      {booking.problemDescription ? (
        <Text style={styles.problemText} numberOfLines={2}>{booking.problemDescription}</Text>
      ) : null}

      {booking.status === 'completed' && booking.review ? (
        <View style={styles.reviewBox}>
          <View style={styles.reviewHeaderRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.reviewRatingText}>{booking.review.rating} / 5</Text>
          </View>
          {booking.review.comment ? (
            <Text style={styles.reviewComment} numberOfLines={3}>{booking.review.comment}</Text>
          ) : null}
        </View>
      ) : booking.status === 'completed' ? (
        <Text style={styles.waitingReviewText}>Waiting for the customer's review.</Text>
      ) : null}

      {booking.status === 'pending' ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onConfirm} activeOpacity={0.9}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
          <Text style={styles.actionBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      ) : null}

      {booking.status === 'accepted' ? (
        <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={onComplete} activeOpacity={0.9}>
          <Ionicons name="checkmark-done-outline" size={16} color={colors.white} />
          <Text style={styles.actionBtnText}>Mark Complete</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
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
    paddingBottom: spacing.lg,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    marginTop: spacing.sm,
  },

  filterRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.white,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  filterChipTextActive: {
    color: colors.accent,
  },
  filterCountBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(31, 78, 121, 0.12)',
  },
  filterCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.white,
  },
  filterCountTextActive: {
    color: colors.accent,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm + 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  serviceName: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  metaText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },

  problemText: {
    fontSize: 12.5,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  reviewBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  reviewComment: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  waitingReviewText: {
    fontSize: 11.5,
    color: colors.placeholder,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    marginTop: spacing.md,
  },
  completeBtn: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
    marginLeft: 6,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
}