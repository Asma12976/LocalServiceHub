// src/screens/customer/ProviderDetailsScreen.js
// Shown when a customer taps any provider card (Home's Nearby/Recommended
// rows, or the Explore/Categories list & grid). Gives full provider + service
// info plus the primary actions: Message, Call, Book Service, Favorite.
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { categories } from '../../data/mockData';
import { useFavorites } from '../../context/FavoritesContext';
import { useUser } from '../../context/UserContext';
import { useProvider } from '../../context/ProviderContext';
import { db } from '../../config/firebase';

export default function ProviderDetailsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { provider: routeProvider } = route.params || {};
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useUser();
  const { liveStatsById } = useProvider();

  // Most entry points (Home, Categories, Emergency Service) already pass
  // the full provider object from ProviderContext.allProviders. But a few
  // (e.g. tapping the provider row on BookingDetailsScreen) only have the
  // small snapshot that was saved onto the booking at the time it was made
  // — { id, name, image, categoryId, phone } — with no services/about/
  // ownerUid/rating. Rendering straight off that would leave "Services
  // Offered" empty and Book Service unable to tell whose profile this is
  // (which used to surface as a broken/incomplete screen further down the
  // booking flow). So if what we got looks partial, fetch the real, live
  // "providers/{id}" doc once and use that instead.
  const [liveProvider, setLiveProvider] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(false);

  const looksComplete = routeProvider && Array.isArray(routeProvider.services);

  useEffect(() => {
    if (!routeProvider?.id || looksComplete) return;

    let cancelled = false;
    setLoadingProvider(true);

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'providers', routeProvider.id));
        if (!cancelled && snap.exists()) {
          setLiveProvider({ id: routeProvider.id, ...snap.data(), isRealProvider: true });
        }
      } catch (err) {
        console.log('Could not load full provider profile:', err?.message);
      } finally {
        if (!cancelled) setLoadingProvider(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeProvider?.id, looksComplete]);

  const baseProvider = liveProvider || routeProvider;

  // Same overlay HomeScreen uses: mock providers (and even real ones, in
  // case this screen's copy of the doc is a beat behind the live
  // aggregate) get their rating/reviews replaced by the live Firestore
  // count so this always matches what submitReview has actually tallied,
  // not a stale/hardcoded number.
  const liveStats = baseProvider ? liveStatsById[baseProvider.id] : null;
  const provider =
    baseProvider && liveStats
      ? { ...baseProvider, rating: liveStats.rating, reviews: liveStats.reviews }
      : baseProvider;

  const favorite = provider ? isFavorite(provider.id) : false;

  const category = categories.find((c) => c.id === provider?.categoryId);

  // Most recent real review left for this provider, so the "Reviews"
  // teaser at the bottom of the screen shows an actual customer's words
  // instead of a fixed placeholder line.
  const [recentReviewBooking, setRecentReviewBooking] = useState(null);

  useEffect(() => {
    if (!provider?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const q = query(collection(db, 'bookings'), where('provider.id', '==', provider.id));
        const snap = await getDocs(q);

        const docs = snap.docs
          .map((d) => d.data())
          .filter((b) => b.review)
          .sort((a, b) => new Date(b.review.createdAt) - new Date(a.review.createdAt));

        const latest = docs[0] || null;

        // Same fix as ProviderReviewsScreen/ProviderMyReviewsScreen: the
        // "customer" field on a booking is only ever a snapshot, and older
        // reviews were saved before reviewerName existed — so look up this
        // one reviewer's *current* profile from "users" (via the always-
        // present customerId) as an extra fallback instead of showing a
        // generic "Customer".
        if (latest && !latest.review?.reviewerName && !latest.customer?.name) {
          const customerId = latest.customerId || latest.customer?.id;
          if (customerId) {
            try {
              const userSnap = await getDoc(doc(db, 'users', customerId));
              if (!cancelled && userSnap.exists()) {
                const data = userSnap.data();
                latest.customer = { ...latest.customer, name: data.name || '', photo: data.photoURL || '' };
              }
            } catch (err) {
              console.log('Could not load reviewer profile:', err?.message);
            }
          }
        }

        if (!cancelled) setRecentReviewBooking(latest);
      } catch (err) {
        console.log('Could not load recent review:', err?.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [provider?.id]);

  if (!provider) {
    return (
      <View style={styles.missingScreen}>
        <Text style={styles.missingText}>Provider not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.missingBtn}>
          <Text style={styles.missingBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingProvider && !liveProvider) {
    return (
      <View style={styles.missingScreen}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const handleCall = () => {
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

  const handleMessage = () => {
    // Only real (Firestore-backed) providers have a Firebase Auth uid to
    // actually chat with — the starter mock providers in mockData.js are
    // just sample cards, not signed-in accounts.
    if (!provider.isRealProvider || !provider.ownerUid) {
      Alert.alert(
        'Demo Provider',
        `${provider.name} is a sample listing, so it can't receive real messages yet.`
      );
      return;
    }

    if (provider.ownerUid === user?.uid) {
      Alert.alert('That\'s You', "This is your own provider profile.");
      return;
    }

    navigation.navigate('Chat', {
      otherUser: {
        uid: provider.ownerUid,
        name: provider.name,
        photo: provider.image,
      },
    });
  };

  const handleBookService = (service) => {
    // A provider browsing their own listing (dual customer/provider
    // account, same pattern already used for handleMessage above) should
    // not be able to book their own service.
    if (provider.ownerUid && provider.ownerUid === user?.uid) {
      Alert.alert("That's You", "You can't book your own service.");
      return;
    }

    navigation.navigate('BookingScreen', { provider, service: service || null });
  };

  const handleToggleFavorite = () => {
    toggleFavorite(provider);
  };

  const handleSeeAllReviews = () => {
    navigation.navigate('ProviderReviews', { provider });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
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

              <TouchableOpacity onPress={handleToggleFavorite} hitSlop={10} style={styles.circleBtn}>
                <Ionicons
                  name={favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={favorite ? '#F87171' : colors.white}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.decorCircleBig} pointerEvents="none" />
            <View style={styles.decorCircleSmall} pointerEvents="none" />
          </LinearGradient>
        </View>

        {/* Floating profile card, overlapping the header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: provider.image }} style={styles.avatar} resizeMode="cover" />
            {provider.available ? <View style={styles.availableRing} /> : null}
          </View>

          <Text style={styles.name}>{provider.name}</Text>

          <View style={styles.categoryPill}>
            <Ionicons name={category?.icon || 'apps-outline'} size={13} color={colors.accent} />
            <Text style={styles.categoryPillText}>{category?.name || 'Service'}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color="#F59E0B" />
            <Text style={styles.ratingText}>{provider.rating}</Text>
            <TouchableOpacity onPress={handleSeeAllReviews}>
              <Text style={styles.reviewsLink}>({provider.reviews} reviews)</Text>
            </TouchableOpacity>
            <View style={styles.dotSeparator} />
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.distanceText} numberOfLines={1}>{provider.location || 'Location N/A'}</Text>
          </View>

          {provider.available ? (
            <View style={styles.availablePill}>
              <View style={styles.availableDot} />
              <Text style={styles.availablePillText}>Available Now</Text>
            </View>
          ) : (
            <View style={[styles.availablePill, styles.busyPill]}>
              <Text style={styles.busyPillText}>Currently Busy</Text>
            </View>
          )}
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="ribbon-outline" size={18} color={colors.accent} />
            <Text style={styles.statValue}>{provider.experienceYears} yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="pricetag-outline" size={18} color={colors.accent} />
            <Text style={styles.statValue}>Rs. {provider.startingPrice}+</Text>
            <Text style={styles.statLabel}>Starting Price</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="navigate-outline" size={18} color={colors.accent} />
            <Text style={styles.statValue}>{provider.location?.split(',')[0]}</Text>
            <Text style={styles.statLabel}>Location</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{provider.about}</Text>
        </View>

        {/* Services offered */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <Text style={styles.sectionCount}>{provider.services?.length || 0} services</Text>
          </View>

          {(provider.services || []).map((service) => (
            <View key={service.id} style={styles.serviceRow}>
              <View style={styles.serviceIconWrap}>
                <Ionicons name={category?.icon || 'construct-outline'} size={18} color={colors.accent} />
              </View>

              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceMetaRow}>
                  <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.serviceDuration}>{service.duration}</Text>
                </View>
              </View>

              <View style={styles.servicePriceCol}>
                <Text style={styles.servicePrice}>Rs. {service.price}</Text>
                <TouchableOpacity
                  style={styles.serviceBookBtn}
                  onPress={() => handleBookService(service)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.serviceBookBtnText}>Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Reviews teaser */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity onPress={handleSeeAllReviews}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewSummaryCard}>
            <View style={styles.reviewScoreCol}>
              <Text style={styles.reviewScoreValue}>{provider.rating}</Text>
              <View style={styles.reviewStarsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(provider.rating) ? 'star' : 'star-outline'}
                    size={12}
                    color="#F59E0B"
                  />
                ))}
              </View>
              <Text style={styles.reviewScoreCount}>{provider.reviews} reviews</Text>
            </View>

            <View style={styles.reviewDividerVertical} />

            {recentReviewBooking?.review?.comment ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewSummaryHint} numberOfLines={4}>
                  "{recentReviewBooking.review.comment}"
                </Text>
                <Text style={styles.reviewSummaryAuthor}>
                  — {recentReviewBooking.review?.reviewerName || recentReviewBooking.customer?.name || 'Customer'}
                </Text>
              </View>
            ) : (
              <Text style={styles.reviewSummaryHint}>
                {provider.reviews > 0
                  ? 'Customers have rated this provider, but no written comments yet.'
                  : 'No reviews yet — be the first to book and leave one!'}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
          <Ionicons name="call-outline" size={20} color={colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.85}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookBtnWrap} onPress={() => handleBookService(null)} activeOpacity={0.9}>
          <LinearGradient
            colors={[colors.accentGradientStart, colors.accentGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bookBtn}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.white} />
            <Text style={styles.bookBtnText}>Book Service</Text>
          </LinearGradient>
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

  // Header
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    height: 132,
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
  decorCircleBig: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -70,
    right: -50,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: 30,
  },

  // Profile card
  profileCard: {
    marginTop: -56,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarWrap: {
    marginTop: -46,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  availableRing: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {
    ...typography.h2,
    fontSize: 19,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  reviewsLink: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginLeft: 5,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.placeholder,
    marginHorizontal: 8,
  },
  distanceText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  availablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.sm,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  availablePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  busyPill: {
    backgroundColor: 'rgba(198, 63, 63, 0.08)',
  },
  busyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Sections
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.accent,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  // Services
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  serviceDuration: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  servicePriceCol: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accentGradientEnd,
  },
  serviceBookBtn: {
    marginTop: 6,
    backgroundColor: 'rgba(31, 78, 121, 0.10)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  serviceBookBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
  },

  // Reviews
  reviewSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewScoreCol: {
    alignItems: 'center',
    paddingRight: spacing.md,
  },
  reviewScoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  reviewScoreCount: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 4,
  },
  reviewDividerVertical: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  reviewSummaryHint: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  reviewSummaryAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },

  // Bottom bar
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
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    marginRight: spacing.sm,
  },
  messageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: 6,
  },
  bookBtnWrap: {
    flex: 1,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: radius.md,
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    marginLeft: 8,
  },
});
}