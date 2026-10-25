import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

import { useFavorites } from '../../context/FavoritesContext';
import { useUser } from '../../context/UserContext';
import { useBookings } from '../../context/BookingsContext';


// =====================================================
// MENU SECTIONS
// =====================================================

const MENU_SECTIONS = [
  {
    title: 'My Activity',
    items: [
      {
        key: 'favorites',
        icon: 'heart',
        label: 'Favorites',
        route: 'Favorites',
      },
      {
        key: 'bookings',
        icon: 'calendar',
        label: 'My Bookings',
        tab: 'Bookings',
      },
      {
        key: 'reviews',
        icon: 'star',
        label: 'My Reviews',
        route: 'MyReviews',
      },
    ],
  },

  {
    title: 'Account',
    items: [
      {
        key: 'edit',
        icon: 'person',
        label: 'Edit Profile',
        route: 'EditProfile',
      },
      {
        key: 'notifications',
        icon: 'notifications',
        label: 'Notifications',
        route: 'Notifications',
      },
      {
        key: 'settings',
        icon: 'settings',
        label: 'Settings',
        route: 'Settings',
      },
    ],
  },

  {
    title: 'Support',
    items: [
      {
        key: 'help',
        icon: 'help-circle',
        label: 'Help & Support',
        route: 'HelpSupport',
      },
    ],
  },
];

// Only shown to accounts signed up with role: 'provider' — lets them fill
// in / edit their business profile (category, services, photo) which is
// stored in the separate "providers" Firestore collection.
const PROVIDER_MENU_SECTION = {
  title: 'Business',
  items: [
    {
      key: 'providerDashboard',
      icon: 'speedometer',
      label: 'Dashboard',
      route: 'ProviderDashboard',
    },
    {
      key: 'providerProfile',
      icon: 'briefcase',
      label: 'My Business Profile',
      route: 'ProviderProfileSetup',
    },
    {
      key: 'providerBookings',
      icon: 'list',
      label: 'Booking Requests',
      route: 'ProviderBookings',
    },
    {
      key: 'providerReviews',
      icon: 'star',
      label: 'My Reviews',
      route: 'ProviderMyReviews',
    },
  ],
};


// =====================================================
// PROFILE SCREEN
// =====================================================

export default function ProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { favorites } = useFavorites();

  const { user } = useUser();

  const { bookings } = useBookings();

  // How many of this account's own bookings actually have a review
  // attached — powers the "Reviews" stat card below (was hardcoded to 0
  // before; now it updates to 1, 2, 3... as soon as a review is submitted,
  // the same way the "Bookings" stat next to it already does).
  const reviewsGivenCount = useMemo(
    () => bookings.filter((b) => b.review).length,
    [bookings]
  );


  // ===================================================
  // MENU SECTIONS (adds "My Business Profile" for providers)
  // ===================================================

  const menuSections = useMemo(() => {
    if (user?.role === 'provider') {
      return [PROVIDER_MENU_SECTION, ...MENU_SECTIONS];
    }
    return MENU_SECTIONS;
  }, [user?.role]);


  // ===================================================
  // USER INFORMATION
  // ===================================================

  const displayName = user?.name || 'Guest';

  const displayEmail = user?.email || '';

  const avatarInitial =
    displayName.trim().charAt(0).toUpperCase() || '?';

  const photoURL =
    typeof user?.photoURL === 'string'
      ? user.photoURL.trim()
      : '';

  const hasPhoto = photoURL.length > 0;


  // ===================================================
  // MENU HANDLER
  // ===================================================

  const handleMenuPress = (item) => {
    if (item.route) {
      navigation.navigate(item.route);
      return;
    }

    if (item.tab) {
      navigation.navigate(item.tab);
      return;
    }

    Alert.alert(
      item.label,
      'This screen is coming soon.'
    );
  };


  // ===================================================
  // EDIT PROFILE
  // ===================================================

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };


  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Login',
                },
              ],
            });
          },
        },
      ]
    );
  };


  // ===================================================
  // SCREEN
  // ===================================================

  return (
    <View style={styles.screen}>

      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          <LinearGradient
            colors={[
              colors.navy,
              colors.navySoft,
            ]}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 1,
            }}
            style={[
              styles.headerGradient,
              {
                paddingTop: insets.top + 14,
              },
            ]}
          >

            <View
              style={styles.decorCircleBig}
              pointerEvents="none"
            />

            <View
              style={styles.decorCircleSmall}
              pointerEvents="none"
            />

            <Text style={styles.headerLabel}>
              Profile
            </Text>

          </LinearGradient>

        </View>


        {/* =================================================
            PROFILE CARD
        ================================================= */}

        <View style={styles.profileCard}>

          {/* =================================================
              AVATAR
          ================================================= */}

          <View style={styles.avatarWrap}>

            {hasPhoto ? (

              <Image
                source={{
                  uri: photoURL,
                }}
                style={styles.avatar}
                resizeMode="cover"
              />

            ) : (

              <LinearGradient
                colors={[
                  colors.accentGradientStart,
                  colors.accentGradientEnd,
                ]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={styles.avatar}
              >

                <Text style={styles.avatarText}>
                  {avatarInitial}
                </Text>

              </LinearGradient>

            )}


            {/* Camera Button */}

            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handleEditProfile}
              hitSlop={6}
              activeOpacity={0.8}
            >

              <Ionicons
                name="camera"
                size={13}
                color={colors.white}
              />

            </TouchableOpacity>

          </View>


          {/* =================================================
              NAME
          ================================================= */}

          <Text style={styles.name}>
            {displayName}
          </Text>


          {/* =================================================
              EMAIL
          ================================================= */}

          <Text style={styles.email}>
            {displayEmail}
          </Text>


          {/* =================================================
              EDIT PROFILE BUTTON
          ================================================= */}

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleEditProfile}
            activeOpacity={0.85}
          >

            <Ionicons
              name="create-outline"
              size={14}
              color={colors.accent}
            />

            <Text style={styles.editProfileBtnText}>
              Edit Profile
            </Text>

          </TouchableOpacity>


          {/* =================================================
              STATS
          ================================================= */}

          <View style={styles.statsRow}>

            {/* Favorites */}

            <TouchableOpacity
              style={styles.statCard}
              onPress={() =>
                navigation.navigate('Favorites')
              }
              activeOpacity={0.85}
            >

              <Text style={styles.statValue}>
                {favorites.length}
              </Text>

              <Text style={styles.statLabel}>
                Favorites
              </Text>

            </TouchableOpacity>


            <View style={styles.statDivider} />


            {/* Bookings */}

            <TouchableOpacity
              style={styles.statCard}
              onPress={() =>
                navigation.navigate('Bookings')
              }
              activeOpacity={0.85}
            >

              <Text style={styles.statValue}>
                {bookings.length}
              </Text>

              <Text style={styles.statLabel}>
                Bookings
              </Text>

            </TouchableOpacity>


            <View style={styles.statDivider} />


            {/* Reviews */}

            <TouchableOpacity
              style={styles.statCard}
              onPress={() =>
                navigation.navigate('MyReviews')
              }
              activeOpacity={0.85}
            >

              <Text style={styles.statValue}>
                {reviewsGivenCount}
              </Text>

              <Text style={styles.statLabel}>
                Reviews
              </Text>

            </TouchableOpacity>

          </View>

        </View>


        {/* =================================================
            MENU SECTIONS
        ================================================= */}

        {menuSections.map((section) => (
          <View
            key={section.title}
            style={styles.section}
          >

            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>


            <View style={styles.menuCard}>

              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuRow,
                    index === section.items.length - 1
                      ? styles.menuRowLast
                      : null,
                  ]}
                  onPress={() =>
                    handleMenuPress(item)
                  }
                  activeOpacity={0.7}
                >

                  {/* Menu Icon */}

                  <View style={styles.menuIconWrap}>

                    <Ionicons
                      name={`${item.icon}-outline`}
                      size={17}
                      color={colors.accent}
                    />

                  </View>


                  {/* Menu Label */}

                  <Text style={styles.menuLabel}>
                    {item.label}
                  </Text>


                  {/* Favorites Badge */}

                  {item.key === 'favorites' &&
                  favorites.length > 0 ? (

                    <View style={styles.menuBadge}>

                      <Text style={styles.menuBadgeText}>
                        {favorites.length}
                      </Text>

                    </View>

                  ) : null}


                  {/* Arrow */}

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.placeholder}
                  />

                </TouchableOpacity>
              ))}

            </View>

          </View>
        ))}


        {/* =================================================
            LOGOUT
        ================================================= */}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >

          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.error}
          />

          <Text style={styles.logoutText}>
            Log Out
          </Text>

        </TouchableOpacity>


        {/* =================================================
            VERSION
        ================================================= */}

        <Text style={styles.versionText}>
          QuickServe v1.0.0
        </Text>

      </ScrollView>

    </View>
  );
}


// =====================================================
// STYLES
// =====================================================

function makeStyles(colors) {
  return StyleSheet.create({

  // ===================================================
  // SCREEN
  // ===================================================

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingBottom: spacing.xxl + 70,
  },


  // ===================================================
  // HEADER
  // ===================================================

  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  headerGradient: {
    height: 108,
    paddingHorizontal: spacing.lg,
  },

  headerLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
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


  // ===================================================
  // PROFILE CARD
  // ===================================================

  profileCard: {
    marginTop: -46,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',

    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 4,
  },


  // ===================================================
  // AVATAR
  // ===================================================

  avatarWrap: {
    marginTop: -40,
    position: 'relative',
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 3,
    borderColor: colors.surface,

    overflow: 'hidden',
  },

  avatarText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
  },


  // ===================================================
  // CAMERA BUTTON
  // ===================================================

  editAvatarBtn: {
    position: 'absolute',

    bottom: 0,
    right: 0,

    width: 26,
    height: 26,
    borderRadius: 13,

    backgroundColor: colors.accent,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 2,
    borderColor: colors.surface,
  },


  // ===================================================
  // NAME
  // ===================================================

  name: {
    ...typography.h2,

    fontSize: 18,

    color: colors.textPrimary,

    marginTop: spacing.sm,
  },


  // ===================================================
  // EMAIL
  // ===================================================

  email: {
    fontSize: 12.5,

    color: colors.textSecondary,

    marginTop: 2,
  },


  // ===================================================
  // EDIT PROFILE BUTTON
  // ===================================================

  editProfileBtn: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      'rgba(31, 78, 121, 0.08)',

    borderRadius: radius.pill,

    paddingHorizontal: 14,

    paddingVertical: 6,

    marginTop: spacing.sm,
  },

  editProfileBtnText: {
    fontSize: 12,

    fontWeight: '700',

    color: colors.accent,

    marginLeft: 5,
  },


  // ===================================================
  // STATS
  // ===================================================

  statsRow: {
    flexDirection: 'row',

    alignItems: 'center',

    width: '100%',

    marginTop: spacing.lg,

    paddingTop: spacing.md,

    borderTopWidth: 1,

    borderTopColor: colors.border,
  },

  statCard: {
    flex: 1,
    alignItems: 'center',
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  statValue: {
    fontSize: 17,

    fontWeight: '800',

    color: colors.textPrimary,
  },

  statLabel: {
    fontSize: 11,

    color: colors.textSecondary,

    marginTop: 2,
  },


  // ===================================================
  // MENU
  // ===================================================

  section: {
    marginHorizontal: spacing.lg,

    marginTop: spacing.xl,
  },

  sectionTitle: {
    fontSize: 12.5,

    fontWeight: '800',

    color: colors.textSecondary,

    textTransform: 'uppercase',

    letterSpacing: 0.4,

    marginBottom: spacing.sm,

    marginLeft: 2,
  },

  menuCard: {
    backgroundColor: colors.surface,

    borderRadius: radius.lg,

    borderWidth: 1,

    borderColor: colors.border,

    overflow: 'hidden',
  },

  menuRow: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 13,

    paddingHorizontal: spacing.md,

    borderBottomWidth: 1,

    borderBottomColor: colors.border,
  },

  menuRowLast: {
    borderBottomWidth: 0,
  },

  menuIconWrap: {
    width: 34,
    height: 34,

    borderRadius: radius.sm,

    backgroundColor:
      'rgba(31, 78, 121, 0.08)',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: spacing.sm + 2,
  },

  menuLabel: {
    flex: 1,

    fontSize: 13.5,

    color: colors.textPrimary,

    fontWeight: '600',
  },


  // ===================================================
  // FAVORITES BADGE
  // ===================================================

  menuBadge: {
    backgroundColor: colors.accent,

    borderRadius: radius.pill,

    minWidth: 20,

    height: 20,

    paddingHorizontal: 6,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: spacing.sm,
  },

  menuBadgeText: {
    fontSize: 10.5,

    fontWeight: '800',

    color: colors.white,
  },


  // ===================================================
  // LOGOUT
  // ===================================================

  logoutBtn: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    marginHorizontal: spacing.lg,

    marginTop: spacing.xl,

    paddingVertical: 13,

    borderRadius: radius.lg,

    backgroundColor: colors.errorBg,
  },

  logoutText: {
    fontSize: 13.5,

    fontWeight: '700',

    color: colors.error,

    marginLeft: 8,
  },


  // ===================================================
  // VERSION
  // ===================================================

  versionText: {
    textAlign: 'center',

    fontSize: 11,

    color: colors.placeholder,

    marginTop: spacing.lg,
  },

});
}