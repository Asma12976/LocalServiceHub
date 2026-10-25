// src/screens/customer/HomeScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import AuthBackdrop from '../../components/Authbackdrop';
import SearchBar from '../../components/SearchBar';
import CategoryFilterSheet from '../../components/CategoryFilterSheet';
import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { categories, providers as mockProviders } from '../../data/mockData';
import { useProvider } from '../../context/ProviderContext';
import { useChat } from '../../context/ChatContext';
import { useNotifications } from '../../context/NotificationContext';
import { useBookings } from '../../context/BookingsContext';
import { useFavorites } from '../../context/FavoritesContext';
import { getCurrentCoords, ISLAMABAD_CENTER } from '../../utils/location';
import { computeRecommendations } from '../../utils/recommendation';

// Deeper shade of colors.error, used only for the big Emergency promo card's
// gradient — kept local to this screen rather than added to the theme file.
const EMERGENCY_GRADIENT_END = '#8E2A2A';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PROMO_CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Real providers who have saved a business profile (ProviderProfileSetupScreen)
  // come live from Firestore via ProviderContext — merge them in with the
  // starter mock providers so both show up side by side everywhere on Home.
  const { allProviders, liveStatsById } = useProvider();
  const { totalUnreadMessages } = useChat();
  const { unreadCount } = useNotifications();

  // Mock providers ship with fixed rating/reviews numbers in mockData.js,
  // so once real bookings get reviewed against one, the count needs to
  // come from the live Firestore aggregate instead of the hardcoded value
  // — otherwise "Nearby Providers" keeps showing the same static number
  // no matter how many real reviews come in.
  //
  // Real providers (allProviders) need this exact same merge: their
  // providers/{id} doc always starts at reviews: 0, and the transaction in
  // BookingsContext.submitReview that's supposed to bump it up commonly
  // fails with permission-denied (see the comment on liveStatsById in
  // ProviderContext) — so without merging liveStatsById in here too, every
  // real provider's card would keep showing "0 reviews" forever even after
  // being reviewed.
  const withLiveStats = (list) =>
    list.map((p) => {
      const live = liveStatsById[p.id];
      return live ? { ...p, rating: live.rating, reviews: live.reviews } : p;
    });

  const providers = useMemo(() => {
    return [...withLiveStats(mockProviders), ...withLiveStats(allProviders)];
  }, [allProviders, liveStatsById]);

  // Real multi-factor "match" score (src/utils/recommendation.js):
  // this customer's own booking-history + favorites (category affinity),
  // each provider's live rating/reviews, real GPS distance, and current
  // availability — see that file for the exact weights. Replaces the old
  // hardcoded matchPercents = [94, 89, 84].
  const { bookings } = useBookings();
  const { favorites } = useFavorites();

  // Live device GPS, same pattern NearMeScreen uses — falls back to the
  // Islamabad-center anchor so distance scoring still works (just less
  // precisely) if location permission isn't granted.
  const [origin, setOrigin] = useState(ISLAMABAD_CENTER);
  useEffect(() => {
    let mounted = true;
    getCurrentCoords().then((result) => {
      if (mounted && result.isReal) setOrigin(result.coords);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const { recommended, isPersonalized } = useMemo(
    () => computeRecommendations({ providers, bookings, favorites, origin, limit: 3 }),
    [providers, bookings, favorites, origin]
  );

  // Local, client-side filtering only — replace with a real query (Firebase/
  // Supabase) once the providers collection exists.
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
      const matchesSearch = search
        ? p.name.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [providers, search, selectedCategory]);

  const handleCategoryPress = (id) => {
    setSelectedCategory((prev) => (prev === id ? null : id));
  };

  const handleAIAssistant = () => {
    navigation.navigate('AIAssistant');
  };

  const handleEmergency = () => {
    navigation.navigate('EmergencyService');
  };

  const handleProviderPress = (provider) => {
    navigation.navigate('ProviderDetails', { provider });
  };

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const handleMessagesPress = () => {
    navigation.navigate('Messages');
  };

  const handleFilterPress = () => {
    setFilterSheetVisible(true);
  };

  // Picking a category from the sheet jumps straight into the Explore tab,
  // pre-filtered — a quick shortcut rather than filtering the Home feed.
  const handleFilterSheetSelect = (categoryId) => {
    navigation.navigate('Categories', { categoryId });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Colorful navy header — same treatment as the Login/Signup screens */}
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.navy, colors.navySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
          >
            <AuthBackdrop />

            <View style={styles.greetingWrap}>
              <View style={styles.brandHeadingRow}>
                <View style={styles.brandLeft}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.openDrawer()} hitSlop={10}>
                    <Ionicons name="menu-outline" size={20} color={colors.white} />
                  </TouchableOpacity>
                  <Text style={styles.greeting}>Local Service Hub</Text>
                </View>

                <View style={styles.headerIconsRow}>
                  <TouchableOpacity style={styles.iconBtn} onPress={handleNotificationsPress} hitSlop={6}>
                    <Ionicons name="notifications-outline" size={17} color={colors.white} />
                    {unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { marginLeft: 8 }]}
                    onPress={handleMessagesPress}
                    hitSlop={6}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={colors.white} />
                    {totalUnreadMessages > 0 ? <View style={styles.badgeDot} /> : null}
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.locationRow}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('NearMe')}
              >
                <Ionicons name="location-sharp" size={13} color={colors.accentGradientStart} />
                <Text style={styles.locationText}>Islamabad, PK</Text>
                <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Floating search bar + filter button, overlapping the header edge */}
        <View style={styles.searchRow}>
          <SearchBar value={search} onChangeText={setSearch} />
          <TouchableOpacity style={styles.filterBtn} onPress={handleFilterPress} activeOpacity={0.85}>
            <Ionicons name="options-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Promo cards — AI Assistant + Emergency, swipe between them */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoRow}
          snapToInterval={PROMO_CARD_WIDTH + spacing.md}
          decelerationRate="fast"
          snapToAlignment="start"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleAIAssistant}
            style={[styles.promoCardWrap, { width: PROMO_CARD_WIDTH }]}
          >
            <LinearGradient
              colors={[colors.accentGradientStart, colors.accentGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoCard}
            >
              <View style={styles.promoDecorCircleBig} />
              <View style={styles.promoDecorCircleSmall} />

              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>Not sure what service{'\n'}you need?</Text>
                <Text style={styles.promoSubtitle}>
                  Describe your problem — AI will suggest the right expert.
                </Text>
                <View style={styles.promoButton}>
                  <Text style={styles.promoButtonText}>Ask QuickServe AI</Text>
                </View>
              </View>

              <Ionicons
                name="sparkles"
                size={72}
                color="rgba(255,255,255,0.22)"
                style={styles.promoGhostIcon}
              />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleEmergency}
            style={[styles.promoCardWrap, { width: PROMO_CARD_WIDTH }]}
          >
            <LinearGradient
              colors={[colors.error, EMERGENCY_GRADIENT_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoCard}
            >
              <View style={styles.promoDecorCircleBig} />
              <View style={styles.promoDecorCircleSmall} />

              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>Need urgent{'\n'}help right now?</Text>
                <Text style={styles.promoSubtitle}>
                  Get priority matching with the nearest available expert.
                </Text>
                <View style={styles.promoButton}>
                  <Text style={[styles.promoButtonText, { color: colors.error }]}>
                    Get Emergency Help
                  </Text>
                </View>
              </View>

              <Ionicons
                name="alert"
                size={72}
                color="rgba(255,255,255,0.22)"
                style={styles.promoGhostIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Categories */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
          {selectedCategory ? (
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.85}
                onPress={() => handleCategoryPress(cat.id)}
                style={styles.categoryChip}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={[colors.accentGradientStart, colors.accentGradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.categoryIconWrap, styles.categoryIconWrapSelected]}
                  >
                    <Ionicons name={cat.icon || 'apps-outline'} size={26} color={colors.white} />
                  </LinearGradient>
                ) : (
                  <View style={styles.categoryIconWrap}>
                    <Ionicons name={cat.icon || 'apps-outline'} size={26} color={colors.accent} />
                  </View>
                )}

                <Text
                  style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>

                {isSelected ? <View style={styles.categoryActiveBar} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recommended For You — real match score (see computeRecommendations).
            Title is honest about whether we actually have personalization
            data yet: a brand-new customer with no bookings/favorites sees
            "Popular Near You" (ranked by rating/distance/availability)
            instead of a "Recommended" label that wouldn't be true yet. */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.sectionTitle}>
              {isPersonalized ? 'Recommended For You' : 'Popular Near You'}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedRow}
        >
          {recommended.map((provider) => {
            return (
            <TouchableOpacity
              key={provider.id}
              activeOpacity={0.88}
              style={styles.recommendedCard}
              onPress={() => handleProviderPress(provider)}
            >
              <LinearGradient
                colors={[colors.navy, colors.navySoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recommendedTopBar}
              />

              <View style={styles.recommendedMedalBadge}>
                <Text style={styles.recommendedMedalText}>{provider.medal}</Text>
              </View>

              <View style={styles.recommendedAvatarRing}>
                <Image source={{ uri: provider.image }} style={styles.recommendedAvatar} resizeMode="cover" />
              </View>

              <Text style={styles.recommendedName} numberOfLines={1}>
                {provider.name}
              </Text>

              <View style={styles.recommendedRatingRow}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.recommendedRatingText}>{provider.rating}</Text>
              </View>

              <View style={styles.recommendedMatchPill}>
                <Text style={styles.recommendedMatchText}>{provider.matchPercent}% Match</Text>
              </View>
            </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Nearby providers */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleBar} />
            <Text style={styles.sectionTitle}>Nearby Providers</Text>
          </View>
          <View style={styles.nearbyHeaderRight}>
            <Text style={styles.resultCount}>{filteredProviders.length} found</Text>
            <TouchableOpacity
              style={styles.mapLinkBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('NearMe')}
            >
              <Ionicons name="map-outline" size={13} color={colors.accent} />
              <Text style={styles.mapLinkText}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredProviders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={28} color={colors.placeholder} />
            <Text style={styles.emptyText}>No providers match your search</Text>
          </View>
        ) : (
          filteredProviders.map((provider) => {
            const category = categories.find((c) => c.id === provider.categoryId);
            return (
              <TouchableOpacity
                key={provider.id}
                activeOpacity={0.9}
                style={styles.nearbyCard}
                onPress={() => handleProviderPress(provider)}
              >
                <View style={styles.nearbyImageWrap}>
                  <Image source={{ uri: provider.image }} style={styles.nearbyImage} resizeMode="cover" />

                  <View style={styles.nearbyRatingChip}>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text style={styles.nearbyRatingText}>{provider.rating}</Text>
                  </View>

                  <View style={styles.nearbyCategoryBadge}>
                    <Ionicons name={category?.icon || 'apps-outline'} size={12} color={colors.white} />
                  </View>
                </View>

                <View style={styles.nearbyInfo}>
                  <Text style={styles.nearbyName} numberOfLines={1}>
                    {provider.name}
                  </Text>

                  <View style={styles.nearbySubRow}>
                    <Text style={styles.nearbyCategoryText} numberOfLines={1}>
                      {category?.name || 'Service'}
                    </Text>
                    <View style={styles.nearbyDotSeparator} />
                    <Text style={styles.nearbyReviewsText} numberOfLines={1}>
                      {provider.reviews} reviews
                    </Text>
                  </View>

                  <View style={styles.nearbyMetaRow}>
                    <View style={styles.nearbyMetaChip}>
                      <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                      <Text style={styles.nearbyMetaChipText} numberOfLines={1}>
                        {provider.location || 'Location N/A'}
                      </Text>
                    </View>

                    <Text style={styles.nearbyPriceText}>Rs. {provider.startingPrice}+</Text>

                    {provider.available ? (
                      <View style={styles.nearbyAvailablePill}>
                        <View style={styles.nearbyAvailableDot} />
                        <Text style={styles.nearbyAvailablePillText}>Available</Text>
                      </View>
                    ) : (
                      <View style={[styles.nearbyAvailablePill, styles.nearbyBusyPill]}>
                        <Text style={styles.nearbyBusyPillText}>Busy</Text>
                      </View>
                    )}
                  </View>
                </View>

                <LinearGradient
                  colors={[colors.accentGradientStart, colors.accentGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nearbyArrowBtn}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <CategoryFilterSheet
        visible={filterSheetVisible}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={handleFilterSheetSelect}
        onClose={() => setFilterSheetVisible(false)}
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
  scrollContent: {
    paddingBottom: spacing.xxl + 70, // clears the floating (position: absolute) tab bar
  },

  // Header
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 34,
    paddingHorizontal: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  brandBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 5,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F87171',
    borderWidth: 1,
    borderColor: colors.navy,
  },
  greetingWrap: {
    marginTop: spacing.lg,
  },
  brandHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 2,
  },
  locationText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 3,
  },
  subGreeting: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 3,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: -22,
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // Promo cards (AI Assistant + Emergency) — big swipeable cards
  promoRow: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginTop: spacing.xl,
  },
  promoCardWrap: {
    marginRight: spacing.md,
  },
  promoCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    minHeight: 150,
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  promoDecorCircleBig: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    right: -50,
  },
  promoDecorCircleSmall: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    right: 40,
  },
  promoContent: {
    maxWidth: '78%',
  },
  promoTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    marginTop: 8,
    lineHeight: 17,
  },
  promoButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  promoButtonText: {
    color: colors.accentGradientEnd,
    fontSize: 12.5,
    fontWeight: '800',
  },
  promoGhostIcon: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  clearText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.accent,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  nearbyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  mapLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    marginLeft: 3,
  },
  categoriesRow: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  categoryChip: {
    width: 82,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  categoryIconWrapSelected: {
    borderWidth: 0,
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  categoryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.accentGradientEnd,
    fontWeight: '800',
  },
  categoryActiveBar: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accentGradientEnd,
    marginTop: 4,
  },

  // Recommended For You
  recommendedRow: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  recommendedCard: {
    width: 148,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  recommendedTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  recommendedMedalBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  recommendedMedalText: {
    fontSize: 16,
  },
  recommendedAvatarRing: {
    width: 60,
    height: 60,
    borderRadius: radius.md + 4,
    borderWidth: 2,
    borderColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  recommendedAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
  },
  recommendedName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  recommendedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  recommendedRatingText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginLeft: 3,
    fontWeight: '600',
  },
  recommendedMatchPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  recommendedMatchText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentGradientEnd,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },

  // Nearby providers — redesigned card
  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    padding: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.navy,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  nearbyImageWrap: {
    marginRight: spacing.md,
    marginLeft: 6,
    marginTop: 4,
  },
  nearbyImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md + 2,
  },
  nearbyRatingChip: {
    position: 'absolute',
    top: -8,
    left: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: colors.navy,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  nearbyRatingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 2,
  },
  nearbyCategoryBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  nearbyInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nearbyName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  nearbySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  nearbyCategoryText: {
    fontSize: 11.5,
    color: colors.accentGradientEnd,
    fontWeight: '700',
    flexShrink: 1,
  },
  nearbyDotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.placeholder,
    marginHorizontal: 6,
  },
  nearbyReviewsText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  nearbyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  nearbyMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
    maxWidth: 150,
  },
  nearbyMetaChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 3,
    fontWeight: '600',
    flexShrink: 1,
  },
  nearbyPriceText: {
    fontSize: 11.5,
    color: colors.accentGradientEnd,
    fontWeight: '800',
    marginRight: 6,
  },
  nearbyAvailablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  nearbyAvailableDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  nearbyAvailablePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  nearbyBusyPill: {
    backgroundColor: 'rgba(198, 63, 63, 0.08)',
  },
  nearbyBusyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  nearbyArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
}