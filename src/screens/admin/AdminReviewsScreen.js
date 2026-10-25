// src/screens/admin/AdminReviewsScreen.js
// "Reviews" tab of the Admin Panel — this is the actual "handle fake
// reviews" tool the project was missing. Three tabs:
//   Flagged - reviews flagged for a closer look, either by an admin
//             tapping "Flag" on the All tab (AdminContext.flagReview) or,
//             once some future customer/provider-facing screen calls
//             BookingsContext.flagReview, by a report from them too —
//             both write to the exact same review.flagged field, so
//             either source lands here with no extra wiring.
//   All     - every visible review platform-wide, so an admin can
//             proactively flag something without waiting for a report.
//   Hidden  - reviews an admin has already taken down, with a Restore
//             option in case one was hidden by mistake.
// Hiding a review actually removes it everywhere it's shown to customers
// (see the big comment in AdminContext.js on why) — no other screen
// needed to change for this to work.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAdmin } from '../../context/AdminContext';
import { formatRelativeTime } from '../../utils/dateFormat';

const TABS = [
  { key: 'flagged', label: 'Flagged' },
  { key: 'all', label: 'All' },
  { key: 'hidden', label: 'Hidden' },
];

export default function AdminReviewsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const {
    reviews,
    flaggedReviews,
    hiddenReviews,
    loading,
    hideReview,
    restoreReview,
    unflagReview,
    flagReview,
  } = useAdmin();

  // Default to "All" — "Flagged" only ever has something in it once a
  // customer/provider screen actually calls BookingsContext.flagReview
  // (not wired into any screen yet), so landing here by default made this
  // whole tab look empty/broken even though every review was there all
  // along under "All".
  const [tab, setTab] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const data = tab === 'flagged' ? flaggedReviews : tab === 'hidden' ? hiddenReviews : reviews;

  const handleHide = (booking) => {
    Alert.alert(
      'Hide This Review',
      `Hide ${booking.review.reviewerName || 'this customer'}'s review of ${booking.provider?.name || 'this provider'}? It will no longer be visible to anyone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            setBusyId(booking.id);
            try {
              await hideReview(booking);
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Could not hide this review.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (booking) => {
    setBusyId(booking.id);
    try {
      await restoreReview(booking);
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not restore this review.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnflag = async (booking) => {
    setBusyId(booking.id);
    try {
      await unflagReview(booking);
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not clear this flag.');
    } finally {
      setBusyId(null);
    }
  };

  // Lets an admin flag a review straight from "All" — the only way this
  // could happen before was a customer/provider report, which no screen
  // actually triggers yet, so "Flagged" always looked empty.
  const handleFlag = (booking) => {
    Alert.alert(
      'Flag This Review',
      `Mark ${booking.review.reviewerName || 'this customer'}'s review of ${booking.provider?.name || 'this provider'} for a closer look? It will move to the Flagged tab.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flag',
          onPress: async () => {
            setBusyId(booking.id);
            try {
              await flagReview(booking, 'Flagged by admin');
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Could not flag this review.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const review = tab === 'hidden' ? item.hiddenReview : item.review;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Image
            source={{ uri: review.reviewerPhoto || 'https://ui-avatars.com/api/?name=User' }}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.reviewerName}>{review.reviewerName || 'Customer'}</Text>
            <Text style={styles.providerName}>on {item.provider?.name || 'Unknown provider'}</Text>
            {item.service?.name ? (
              <Text style={styles.serviceText} numberOfLines={1}>
                {item.service.name} · Booking #{item.id.slice(0, 8)}
              </Text>
            ) : null}
          </View>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= review.rating ? 'star' : 'star-outline'}
                size={12}
                color="#F59E0B"
              />
            ))}
          </View>
        </View>

        {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatRelativeTime(review.createdAt)}</Text>
          {review.flagged ? (
            <View style={styles.flagPill}>
              <Ionicons name="flag" size={10} color={colors.error} />
              <Text style={styles.flagPillText}>{review.flagReason || 'Flagged'}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {tab === 'hidden' ? (
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={() => handleRestore(item)}
              disabled={busyId === item.id}
            >
              <Ionicons name="refresh" size={14} color={colors.success} />
              <Text style={styles.restoreBtnText}>Restore</Text>
            </TouchableOpacity>
          ) : (
            <>
              {tab === 'flagged' ? (
                <TouchableOpacity
                  style={styles.unflagBtn}
                  onPress={() => handleUnflag(item)}
                  disabled={busyId === item.id}
                >
                  <Text style={styles.unflagBtnText}>Not Fake — Keep</Text>
                </TouchableOpacity>
              ) : null}
              {tab === 'all' && !review.flagged ? (
                <TouchableOpacity
                  style={styles.flagBtn}
                  onPress={() => handleFlag(item)}
                  disabled={busyId === item.id}
                >
                  <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.flagBtnText}>Flag</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.hideBtn}
                onPress={() => handleHide(item)}
                disabled={busyId === item.id}
              >
                <Ionicons name="eye-off-outline" size={14} color={colors.error} />
                <Text style={styles.hideBtnText}>Hide Review</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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
          style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
        >
          <Text style={styles.headerTitle}>Reviews</Text>
          <Text style={styles.headerSubtitle}>{flaggedReviews.length} flagged for attention</Text>
        </LinearGradient>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={28} color={colors.placeholder} />
              <Text style={styles.emptyText}>No {tab} reviews.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
    headerGradient: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },

    tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.md },
    tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.md, marginRight: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: `${colors.accent}1A`, borderColor: colors.accent },
    tabText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.accent },

    card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    reviewerName: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
    providerName: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    serviceText: { fontSize: 10.5, color: colors.placeholder, marginTop: 1 },
    starsRow: { flexDirection: 'row' },
    comment: { fontSize: 12.5, color: colors.textPrimary, marginTop: 8, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    metaText: { fontSize: 11, color: colors.textSecondary },
    flagPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
    flagPillText: { fontSize: 10.5, color: colors.error, fontWeight: '700', marginLeft: 4 },

    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    hideBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
    hideBtnText: { fontSize: 11.5, color: colors.error, fontWeight: '700', marginLeft: 4 },
    unflagBtn: { paddingHorizontal: 10, paddingVertical: 7 },
    unflagBtnText: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '700' },
    flagBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
    flagBtnText: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '700', marginLeft: 4 },
    restoreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7 },
    restoreBtnText: { fontSize: 11.5, color: colors.success, fontWeight: '700', marginLeft: 4 },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },
  });
}