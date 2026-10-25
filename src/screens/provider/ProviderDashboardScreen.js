// src/screens/provider/ProviderDashboardScreen.js
// Provider's dedicated home screen — opened from ProfileScreen's Business
// menu ("Dashboard"). Gives a provider a single at-a-glance view of their
// day instead of digging through ProviderBookingsScreen:
//
//   - Today's Bookings : jobs on the schedule for today (any active status)
//   - Pending Requests : new booking requests still waiting on a decision
//   - Earnings         : total Rs. earned from completed jobs
//
// Below the stats: today's schedule (so the provider knows where to be),
// a preview of the newest pending requests with a quick "Confirm" action,
// and shortcuts into the existing Business Profile / Booking Requests /
// My Reviews screens.
//
// Reads straight from BookingsContext.incomingBookings (already live-synced
// from Firestore) and ProviderContext.providerProfile — no new data layer
// needed, this screen is purely a curated view on top of what already
// exists.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { useProvider } from '../../context/ProviderContext';
import { getBookingStatusMeta } from '../../utils/bookingStatus';

// Same format BookingScreen.js stamps onto every booking as `dateLabel`
// (e.g. "14 September") — reusing it here is what lets us match "today"
// without needing a separate raw date field on the booking.
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function todayLabel() {
  const now = new Date();
  return `${now.getDate()} ${MONTH_LABELS[now.getMonth()]}`;
}

export default function ProviderDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { providerProfile, loading } = useProvider();
  const { incomingBookings, confirmBooking } = useBookings();

  const todaysLabel = useMemo(() => todayLabel(), []);

  const todaysBookings = useMemo(
    () =>
      incomingBookings.filter(
        (b) => b.dateLabel === todaysLabel && b.status !== 'cancelled'
      ),
    [incomingBookings, todaysLabel]
  );

  const pendingBookings = useMemo(
    () => incomingBookings.filter((b) => b.status === 'pending'),
    [incomingBookings]
  );

  const totalEarnings = useMemo(
    () =>
      incomingBookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + (Number(b.service?.price) || 0), 0),
    [incomingBookings]
  );

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

  const businessName = providerProfile?.name || 'your business';
  const isAvailable = providerProfile?.available ?? true;

  // No business profile yet — dashboard has nothing real to show, so point
  // the provider at setup instead of rendering empty stat cards.
  if (!loading && !providerProfile) {
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
              <Text style={styles.headerTitle}>Dashboard</Text>
              <View style={styles.circleBtnSpacer} />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.setupState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="briefcase-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Set up your business profile</Text>
          <Text style={styles.emptyText}>
            Add your services and details first — your dashboard will fill up as bookings come in.
          </Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => navigation.navigate('ProviderProfileSetup')}
            activeOpacity={0.9}
          >
            <Text style={styles.setupBtnText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
              <Text style={styles.headerTitle}>Dashboard</Text>
              <View style={styles.circleBtnSpacer} />
            </View>

            <View style={styles.greetingRow}>
              {providerProfile?.image ? (
                <Image source={{ uri: providerProfile.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="briefcase" size={20} color={colors.white} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.greetingName} numberOfLines={1}>{businessName}</Text>
                <View style={styles.availabilityRow}>
                  <View
                    style={[
                      styles.availabilityDot,
                      { backgroundColor: isAvailable ? colors.success : colors.error },
                    ]}
                  />
                  <Text style={styles.availabilityText}>
                    {isAvailable ? 'Available for new jobs' : 'Busy on a job'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProviderBookings')}
          >
            <View style={[styles.statIconWrap, { backgroundColor: colors.circleTint }]}>
              <Ionicons name="calendar" size={16} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>{todaysBookings.length}</Text>
            <Text style={styles.statLabel}>Today's Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProviderBookings')}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(181, 137, 0, 0.12)' }]}>
              <Ionicons name="time" size={16} color="#B58900" />
            </View>
            <Text style={styles.statValue}>{pendingBookings.length}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(62, 118, 88, 0.12)' }]}>
              <Ionicons name="cash" size={16} color={colors.success} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              Rs. {totalEarnings.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        {/* Today's schedule */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.sectionSubtitle}>{todaysLabel}</Text>
        </View>

        {todaysBookings.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Ionicons name="calendar-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.inlineEmptyText}>Nothing on the schedule for today.</Text>
          </View>
        ) : (
          todaysBookings.map((booking) => {
            const statusMeta = getBookingStatusMeta(booking.status);
            return (
              <TouchableOpacity
                key={booking.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ProviderBookingDetails', { bookingId: booking.id })}
              >
                <View style={styles.cardTopRow}>
                  {booking.customer?.photo ? (
                    <Image source={{ uri: booking.customer.photo }} style={styles.cardAvatar} />
                  ) : (
                    <View style={[styles.cardAvatar, styles.cardAvatarPlaceholder]}>
                      <Ionicons name="person" size={18} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardCustomerName} numberOfLines={1}>
                      {booking.customer?.name || 'Customer'}
                    </Text>
                    <Text style={styles.cardServiceName} numberOfLines={1}>
                      {booking.service?.name}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                    <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{booking.timeSlot}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Pending requests preview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>New Requests</Text>
          {pendingBookings.length > 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('ProviderBookings')}>
              <Text style={styles.sectionLink}>See All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {pendingBookings.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Ionicons name="checkmark-done-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.inlineEmptyText}>No new requests right now.</Text>
          </View>
        ) : (
          pendingBookings.slice(0, 3).map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ProviderBookingDetails', { bookingId: booking.id })}
            >
              <View style={styles.cardTopRow}>
                {booking.customer?.photo ? (
                  <Image source={{ uri: booking.customer.photo }} style={styles.cardAvatar} />
                ) : (
                  <View style={[styles.cardAvatar, styles.cardAvatarPlaceholder]}>
                    <Ionicons name="person" size={18} color={colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardCustomerName} numberOfLines={1}>
                    {booking.customer?.name || 'Customer'}
                  </Text>
                  <Text style={styles.cardServiceName} numberOfLines={1}>
                    {booking.service?.name} · {booking.dateLabel}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => handleConfirm(booking)}
                activeOpacity={0.9}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {/* Quick actions */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Manage</Text>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProviderProfileSetup')}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.circleTint }]}>
              <Ionicons name="briefcase-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.quickActionText}>Business Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProviderBookings')}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.circleTint }]}>
              <Ionicons name="list-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.quickActionText}>Booking Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProviderMyReviews')}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.circleTint }]}>
              <Ionicons name="star-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.quickActionText}>My Reviews</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
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

    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarPlaceholder: {
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.white,
    },
    availabilityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    availabilityDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginRight: 6,
    },
    availabilityText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '600',
    },

    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginTop: -spacing.lg,
      marginBottom: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm + 2,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'flex-start',
    },
    statIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 10.5,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    sectionLink: {
      fontSize: 12.5,
      color: colors.accent,
      fontWeight: '700',
    },

    inlineEmpty: {
      marginHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    inlineEmptyText: {
      fontSize: 12.5,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm + 2,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: spacing.sm,
    },
    cardAvatarPlaceholder: {
      backgroundColor: colors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCustomerName: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    cardServiceName: {
      fontSize: 12,
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
    },

    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      marginTop: spacing.md,
    },
    confirmBtnText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.white,
      marginLeft: 6,
    },

    quickActionsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
    },
    quickAction: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    quickActionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    quickActionText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },

    setupState: {
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
      marginBottom: spacing.lg,
    },
    setupBtn: {
      height: 46,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setupBtnText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.white,
    },
  });
}