// src/screens/customer/BookingsScreen.js
// "My Bookings" tab — every booking the logged-in customer has made, split
// into Upcoming / Completed / Cancelled. This is the screen the bottom tab
// bar's "Bookings" icon (and Profile's "My Bookings" row / drawer link)
// points to.
//
// NOTE: this file previously contained a duplicated copy of BookingScreen.js
// (the "create a new booking" flow) by mistake, which is why opening the
// Bookings tab used to show "Provider not found." — that screen expects a
// `provider` param from route.params which the tab never passes. This is
// the real "My Bookings" list, backed by BookingsContext, with no required
// params.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { getBookingStatusMeta } from '../../utils/bookingStatus';

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function BookingsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { upcomingBookings, completedBookings, cancelledBookings } = useBookings();
  const [activeFilter, setActiveFilter] = useState('upcoming');

  const listByFilter = useMemo(
    () => ({
      upcoming: upcomingBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
    }),
    [upcomingBookings, completedBookings, cancelledBookings]
  );

  const activeList = listByFilter[activeFilter];

  const emptyCopy = {
    upcoming: {
      icon: 'calendar-outline',
      title: 'No upcoming bookings',
      text: 'Once you book a service, it will show up here until it\u2019s completed.',
    },
    completed: {
      icon: 'checkmark-done-outline',
      title: 'No completed bookings yet',
      text: 'Services you\u2019ve finished with a provider will appear here.',
    },
    cancelled: {
      icon: 'close-circle-outline',
      title: 'No cancelled bookings',
      text: 'Bookings you cancel will be listed here.',
    },
  }[activeFilter];

  const handleOpenBooking = (booking) => {
    navigation.navigate('BookingDetails', { bookingId: booking.id });
  };

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
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>Track and manage every service you\u2019ve booked</Text>

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
          <BookingCard colors={colors} styles={styles} booking={item} onPress={() => handleOpenBooking(item)} />
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

function BookingCard({ booking, onPress, colors, styles}) {
  const statusMeta = getBookingStatusMeta(booking.status);
  const providerName = booking.provider?.name || 'Provider';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardTopRow}>
        {booking.provider?.image ? (
          <Image source={{ uri: booking.provider.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="construct-outline" size={18} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName} numberOfLines={1}>{providerName}</Text>
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

      {booking.status === 'completed' ? (
        booking.review ? (
          <View style={styles.reviewBox}>
            <View style={styles.reviewHeaderRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.reviewRatingText}>{booking.review.rating} / 5 \u00b7 Your review</Text>
            </View>
            {booking.review.comment ? (
              <Text style={styles.reviewComment} numberOfLines={2}>{booking.review.comment}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.rateHintText}>Tap to rate this service.</Text>
        )
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    marginTop: 4,
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
  providerName: {
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
  rateHintText: {
    fontSize: 11.5,
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.sm,
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