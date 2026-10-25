// src/screens/customer/EmergencyServiceScreen.js
// Spec section 21 — "Water pipe burst? Need an electrician urgently?".
// Lets the customer jump straight to the best-matched providers in
// urgency-prone categories, with a one-tap Call Now action.
//
// MATCHING LOGIC — this is the actual heart of the screen. Every provider
// (mock + real, merged from ProviderContext) gets a 0-100 "Emergency Match
// Score" built from four real signals, each weighted by how much it matters
// when something is urgent:
//
//   1. Availability (55 pts)  — can they even respond right now? This is
//      weighted the heaviest: a 5-star provider who is marked "Busy" is
//      useless for an emergency, so availability dominates the score.
//   2. Rating (25 pts)        — quality signal, scaled from the 0-5 rating.
//   3. Track record (10 pts)  — review count, on a diminishing-returns curve
//      (log scale) so a provider with 300 reviews doesn't get 6x the score
//      of one with 50 — both are already "proven", the difference stops
//      mattering much past a point.
//   4. Experience (10 pts)    — years in the field, capped at 10 years for
//      full marks, since a 25-year veteran isn't meaningfully "more ready"
//      for a burst pipe than a 10-year one.
//
// Providers are sorted by this score, highest first, with starting price as
// a tie-breaker (cheaper first) when two providers score the same. The
// score is also shown to the customer as a "% Match" chip so the ranking
// isn't a black box — and the single top-ranked *available* provider gets
// a "Best Match Right Now" badge with the actual reason spelled out.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { categories, providers as mockProviders } from '../../data/mockData';
import { useProvider } from '../../context/ProviderContext';

// Categories where an "emergency" request realistically applies.
const EMERGENCY_CATEGORY_IDS = ['electrician', 'plumber', 'ac', 'mechanic'];
const EMERGENCY_GRADIENT_END = '#8E2A2A';

// Score weights — kept as named constants so the logic above stays honest
// and easy to tune later without hunting through the math.
const WEIGHT_AVAILABILITY = 55;
const WEIGHT_RATING = 25; // out of a 0-5 rating
const WEIGHT_REVIEWS = 10; // diminishing returns, log-scaled
const WEIGHT_EXPERIENCE = 10; // capped at 10 years for full marks
const REVIEWS_SOFT_CAP = 150; // reviews beyond this add ~nothing more
const EXPERIENCE_SOFT_CAP = 10; // years beyond this add ~nothing more

// Builds the 0-100 "Emergency Match Score" described above for one provider.
function computeEmergencyScore(provider) {
  const availabilityPoints = provider.available ? WEIGHT_AVAILABILITY : 0;

  const rating = Math.max(0, Math.min(provider.rating || 0, 5));
  const ratingPoints = (rating / 5) * WEIGHT_RATING;

  const reviews = Math.max(0, provider.reviews || 0);
  // log1p curve: fast climb early on, flattens out — 10 reviews already
  // earns most of the credit; 150+ reviews is basically maxed out.
  const reviewsPoints =
    (Math.log(1 + Math.min(reviews, REVIEWS_SOFT_CAP)) / Math.log(1 + REVIEWS_SOFT_CAP)) *
    WEIGHT_REVIEWS;

  const experience = Math.max(0, provider.experienceYears || 0);
  const experiencePoints =
    (Math.min(experience, EXPERIENCE_SOFT_CAP) / EXPERIENCE_SOFT_CAP) * WEIGHT_EXPERIENCE;

  const total = availabilityPoints + ratingPoints + reviewsPoints + experiencePoints;

  return Math.round(Math.min(100, total));
}

// A short, honest one-liner explaining *why* a provider ranks where it
// does — shown as the badge text so the ranking is never a black box.
function matchReason(provider) {
  if (!provider.available) return null;
  if ((provider.experienceYears || 0) >= 8 && (provider.rating || 0) >= 4.5) {
    return 'Available now · Highly experienced';
  }
  if ((provider.reviews || 0) >= 100) {
    return 'Available now · Proven track record';
  }
  if ((provider.rating || 0) >= 4.7) {
    return 'Available now · Top rated';
  }
  return 'Available now';
}

export default function EmergencyServiceScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Real providers (saved via ProviderProfileSetupScreen) merge in with the
  // starter mock providers — same pattern as Home/Categories — so a real
  // registered electrician/plumber/etc. actually shows up here too, not
  // just the demo data.
  const { allProviders } = useProvider();
  const providers = useMemo(() => [...mockProviders, ...allProviders], [allProviders]);

  const emergencyCategories = useMemo(
    () => categories.filter((c) => EMERGENCY_CATEGORY_IDS.includes(c.id)),
    []
  );

  const priorityProviders = useMemo(() => {
    return providers
      .filter((p) => EMERGENCY_CATEGORY_IDS.includes(p.categoryId))
      .filter((p) => (selectedCategory ? p.categoryId === selectedCategory : true))
      .map((p) => ({ ...p, matchScore: computeEmergencyScore(p) }))
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        // Tie-breaker: cheaper starting price first — practical for an
        // urgent situation where cost matters and quality is equal.
        return (a.startingPrice || 0) - (b.startingPrice || 0);
      });
  }, [providers, selectedCategory]);

  const topPickId =
    priorityProviders.length && priorityProviders[0].available
      ? priorityProviders[0].id
      : null;

  const handleCallNow = (provider) => {
    const phone = provider.phone?.trim();

    if (!phone) {
      Alert.alert(
        'No Phone Number',
        `${provider.name} hasn't added a contact number yet.`
      );
      return;
    }

    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Unable to Call', 'This device cannot place a call right now.')
    );
  };

  const handleViewProfile = (provider) => {
    navigation.navigate('ProviderDetails', { provider });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.error, EMERGENCY_GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Emergency Service</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={16} color={colors.white} />
            <Text style={styles.warningText}>
              Ranked by a live match score: availability, rating, experience & reviews —
              the readiest expert shows first.
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Category chips */}
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All Urgent</Text>
        </TouchableOpacity>
        {emergencyCategories.map((c) => {
          const active = selectedCategory === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedCategory((prev) => (prev === c.id ? null : c.id))}
            >
              <Ionicons name={c.icon} size={13} color={active ? colors.white : colors.textSecondary} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={priorityProviders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.placeholder} />
            <Text style={styles.emptyTitle}>No providers in this category right now</Text>
          </View>
        }
        renderItem={({ item }) => {
          const reason = item.id === topPickId ? matchReason(item) : null;
          return (
            <View style={[styles.card, item.id === topPickId && styles.cardTopPick]}>
              {reason ? (
                <View style={styles.priorityBadge}>
                  <Ionicons name="flash" size={11} color={colors.error} />
                  <Text style={styles.priorityBadgeText}>Best Match Right Now · {reason}</Text>
                </View>
              ) : null}
              <View style={styles.cardTopRow}>
                <Image source={{ uri: item.image }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.metaText}>{item.rating}</Text>
                    <View style={styles.dot} />
                    <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.metaText} numberOfLines={1}>{item.location || 'Location N/A'}</Text>
                  </View>
                </View>
                <View style={styles.rightCol}>
                  {item.available ? (
                    <View style={styles.availablePill}>
                      <View style={styles.availableDot} />
                      <Text style={styles.availablePillText}>Available</Text>
                    </View>
                  ) : (
                    <View style={[styles.availablePill, styles.busyPill]}>
                      <Text style={styles.busyPillText}>Busy</Text>
                    </View>
                  )}
                  <View style={styles.matchPill}>
                    <Text style={styles.matchPillText}>{item.matchScore}% Match</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.callBtn} onPress={() => handleCallNow(item)} activeOpacity={0.85}>
                  <Ionicons name="call" size={15} color={colors.white} />
                  <Text style={styles.callBtnText}>Call Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileBtn}
                  onPress={() => handleViewProfile(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.profileBtnText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
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
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  warningText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.white,
    marginLeft: 8,
    lineHeight: 16,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  chipTextActive: {
    color: colors.white,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopPick: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.errorBg,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.error,
    marginLeft: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginLeft: 3,
    flexShrink: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.placeholder,
    marginHorizontal: 6,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  availablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  availablePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  busyPill: {
    backgroundColor: 'rgba(198, 63, 63, 0.08)',
  },
  busyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  matchPill: {
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  matchPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
  },

  cardActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.error,
    marginRight: spacing.sm,
  },
  callBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.white,
    marginLeft: 6,
  },
  profileBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  profileBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
}