// src/screens/customer/NearMeScreen.js
//
// ---------------------------------------------------------------------
// WHY THIS FILE CHANGED (2nd pass)
// ---------------------------------------------------------------------
// v1 used react-native-maps -> blank map area in Expo Go (no native
// Google Maps module available there).
// v2 tried a WebView + Leaflet/OpenStreetMap -> still fragile in some
// Expo Go setups (missing/mismatched react-native-webview version, or no
// internet reaching the CDN, made the WHOLE screen crash to blank white
// instead of just the map).
//
// This version drops native maps AND webviews entirely. "Near Me" is now
// a plain React Native "radar" visual: the customer is a fixed dot in the
// center, and every provider is plotted around them at their REAL compass
// bearing and REAL distance (still computed from live GPS + haversine —
// nothing about the accuracy changed, only how it's drawn). It's built
// out of <View>/<Text>/Ionicons only — the exact same building blocks
// every other screen in this app already uses — so there is nothing new
// to install and nothing that can be "missing" in Expo Go.
//
// Distance rings (e.g. 1 km / 2 km / 4 km) give a sense of scale, and
// tapping a pin opens the same bottom detail card + "View" button as
// before. A List view (sorted by real distance) is still available via
// the header toggle for anyone who'd rather just scroll a list.
// ---------------------------------------------------------------------
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useProvider } from '../../context/ProviderContext';
import { categories, providers as mockProviders } from '../../data/mockData';
import {
  getCurrentCoords,
  haversineDistanceKm,
  resolveProviderCoords,
  formatDistance,
  ISLAMABAD_CENTER,
} from '../../utils/location';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RADAR_SIZE = Math.min(SCREEN_WIDTH - spacing.lg * 2, 340);
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_USABLE_RADIUS = RADAR_CENTER - 22; // leave room for pin size at the edge
const PIN_SIZE = 30;
const USER_DOT_SIZE = 16;
const RING_FRACTIONS = [0.34, 0.67, 1]; // 3 concentric distance rings

// Real compass bearing (0-360, 0 = north) from point 1 to point 2.
function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

export default function NearMeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { allProviders } = useProvider();
  const combinedProviders = useMemo(
    () => [...mockProviders, ...allProviders],
    [allProviders]
  );

  const [viewMode, setViewMode] = useState('map'); // 'map' (radar) | 'list'
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isReal, setIsReal] = useState(false);
  const [locating, setLocating] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const loadLocation = async () => {
    setLocating(true);
    const result = await getCurrentCoords();
    if (result.isReal) {
      setUserCoords(result.coords);
      setIsReal(true);
    } else {
      setIsReal(false);
    }
    setLocating(false);
  };

  useEffect(() => {
    loadLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const origin = userCoords || ISLAMABAD_CENTER;

  const providersWithDistance = useMemo(() => {
    return combinedProviders.map((p) => {
      const coords = resolveProviderCoords(p);
      const distanceKm = haversineDistanceKm(
        origin.latitude,
        origin.longitude,
        coords.latitude,
        coords.longitude
      );
      const bearing = bearingDeg(origin.latitude, origin.longitude, coords.latitude, coords.longitude);
      return { ...p, _coords: coords, _distanceKm: distanceKm, _bearing: bearing };
    });
  }, [combinedProviders, origin.latitude, origin.longitude]);

  const filtered = useMemo(() => {
    let list = providersWithDistance;
    if (categoryFilter) {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }
    return [...list].sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity));
  }, [providersWithDistance, categoryFilter]);

  // Radar range auto-scales to whoever is farthest (min 1km so a single
  // very-close provider doesn't blow up the scale), capped at 8km so a
  // stray fallback-spread provider can't stretch the radar too thin.
  const radarMaxKm = useMemo(() => {
    const distances = filtered.map((p) => p._distanceKm).filter((d) => typeof d === 'number');
    if (!distances.length) return 2;
    const farthest = Math.max(...distances);
    return Math.min(Math.max(farthest * 1.12, 1), 8);
  }, [filtered]);

  const plottedProviders = useMemo(() => {
    return filtered.map((p) => {
      const clampedKm = Math.min(p._distanceKm ?? radarMaxKm, radarMaxKm);
      const radiusPx = (clampedKm / radarMaxKm) * RADAR_USABLE_RADIUS;
      const bearingRad = (p._bearing * Math.PI) / 180;
      const x = RADAR_CENTER + radiusPx * Math.sin(bearingRad) - PIN_SIZE / 2;
      const y = RADAR_CENTER - radiusPx * Math.cos(bearingRad) - PIN_SIZE / 2;
      const isClamped = (p._distanceKm ?? 0) > radarMaxKm;
      return { ...p, _x: x, _y: y, _clamped: isClamped };
    });
  }, [filtered, radarMaxKm]);

  const selectedProvider = filtered.find((p) => p.id === selectedProviderId) || null;

  const handleOpenProfile = (provider) => {
    navigation.navigate('ProviderDetails', { provider });
  };

  const renderListRow = ({ item }) => (
    <TouchableOpacity style={styles.listRow} activeOpacity={0.88} onPress={() => handleOpenProfile(item)}>
      <Image source={{ uri: item.image }} style={styles.listAvatar} />
      <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
        <View style={styles.listNameRow}>
          <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.distancePill}>
            <Ionicons name="navigate" size={10} color={colors.accent} />
            <Text style={styles.distancePillText}>{formatDistance(item._distanceKm)}</Text>
          </View>
        </View>
        <View style={styles.listMetaRow}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={styles.listMetaText}>{item.rating} ({item.reviews})</Text>
          <Text style={styles.listMetaDot}>·</Text>
          <Text style={styles.listMetaText} numberOfLines={1}>{item.location || 'Location N/A'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </TouchableOpacity>
  );

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

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
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.headerTitle}>Providers Near You</Text>
              <Text style={styles.headerSubtitle}>
                {locating
                  ? 'Getting your location...'
                  : isReal
                  ? `${filtered.length} providers around you`
                  : `${filtered.length} providers · approximate`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setViewMode((m) => (m === 'map' ? 'list' : 'map'))}
              hitSlop={8}
            >
              <Ionicons name={viewMode === 'map' ? 'list-outline' : 'compass-outline'} size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.chipRow}>
        <FlatList
          data={[{ id: null, name: 'All', icon: 'apps-outline' }, ...categories]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => {
            const active = categoryFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategoryFilter(item.id)}
              >
                <Ionicons
                  name={item.icon}
                  size={13}
                  color={active ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {!locating && !isReal ? (
        <View style={styles.banner}>
          <Ionicons name="location-outline" size={15} color={colors.error} />
          <Text style={styles.bannerText}>
            Showing approximate distances from central Islamabad.
          </Text>
          <TouchableOpacity onPress={loadLocation}>
            <Text style={styles.bannerAction}>Enable GPS</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          {locating ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : (
            <View style={styles.radarWrap}>
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.radar, { width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: RADAR_SIZE / 2 }]}
                onPress={() => setSelectedProviderId(null)}
              >
                {RING_FRACTIONS.map((frac) => {
                  const d = RADAR_USABLE_RADIUS * frac * 2;
                  return (
                    <View
                      key={frac}
                      pointerEvents="none"
                      style={[
                        styles.ring,
                        {
                          width: d,
                          height: d,
                          borderRadius: d / 2,
                          left: RADAR_CENTER - d / 2,
                          top: RADAR_CENTER - d / 2,
                        },
                      ]}
                    />
                  );
                })}

                {RING_FRACTIONS.map((frac) => (
                  <Text
                    key={`label-${frac}`}
                    pointerEvents="none"
                    style={[
                      styles.ringLabel,
                      { left: RADAR_CENTER + 4, top: RADAR_CENTER - RADAR_USABLE_RADIUS * frac - 13 },
                    ]}
                  >
                    {formatDistance(radarMaxKm * frac)}
                  </Text>
                ))}

                {/* User position — always dead center */}
                <View pointerEvents="none" style={[styles.userDotWrap, { left: RADAR_CENTER - 30, top: RADAR_CENTER - 30 }]}>
                  <Animated.View
                    style={[
                      styles.userPulse,
                      { opacity: isReal ? pulseOpacity : 0, transform: [{ scale: isReal ? pulseScale : 1 }] },
                    ]}
                  />
                  <View style={[styles.userDot, { width: USER_DOT_SIZE, height: USER_DOT_SIZE, borderRadius: USER_DOT_SIZE / 2 }]} />
                </View>

                {plottedProviders.map((p) => {
                  const active = selectedProviderId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pin,
                        { left: p._x, top: p._y },
                        active && styles.pinActive,
                      ]}
                      onPress={() => setSelectedProviderId(p.id)}
                      hitSlop={4}
                    >
                      <Ionicons name="briefcase" size={13} color={colors.white} />
                      {p._clamped ? <View style={styles.pinClampDot} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </TouchableOpacity>

              <Text style={styles.radarHint}>
                {isReal ? 'You, centered · pins show real direction & distance' : 'Approximate · enable GPS above for your real position'}
              </Text>
            </View>
          )}

          {selectedProvider ? (
            <View style={[styles.mapCard, { marginBottom: insets.bottom + 12 }]}>
              <Image source={{ uri: selectedProvider.image }} style={styles.mapCardAvatar} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.mapCardName} numberOfLines={1}>{selectedProvider.name}</Text>
                <View style={styles.listMetaRow}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.listMetaText}>{selectedProvider.rating}</Text>
                  <Text style={styles.listMetaDot}>·</Text>
                  <Text style={styles.listMetaText}>{formatDistance(selectedProvider._distanceKm)} away</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.mapCardBtn}
                onPress={() => handleOpenProfile(selectedProvider)}
              >
                <Text style={styles.mapCardBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={renderListRow}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={28} color={colors.placeholder} />
              <Text style={styles.emptyText}>No providers in this category yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
    headerGradient: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    headerTopRow: { flexDirection: 'row', alignItems: 'center' },
    circleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.white },
    headerSubtitle: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    toggleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },

    chipRow: { paddingVertical: spacing.sm + 2 },
    chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, backgroundColor: colors.surface },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginLeft: 5 },
    chipTextActive: { color: colors.white },

    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.sm + 2, marginBottom: spacing.sm },
    bannerText: { flex: 1, fontSize: 11.5, color: colors.error, marginLeft: 8 },
    bannerAction: { fontSize: 11.5, fontWeight: '800', color: colors.error, textDecorationLine: 'underline' },

    mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    radarWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.md },
    radar: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'visible',
    },
    ring: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    ringLabel: {
      position: 'absolute',
      fontSize: 9.5,
      fontWeight: '700',
      color: colors.placeholder,
    },

    userDotWrap: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
    userPulse: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#4285F4' },
    userDot: { backgroundColor: '#4285F4', borderWidth: 3, borderColor: colors.surface },

    pin: {
      position: 'absolute',
      width: PIN_SIZE,
      height: PIN_SIZE,
      borderRadius: PIN_SIZE / 2,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
      shadowColor: colors.navy,
      shadowOpacity: 0.25,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    pinActive: { backgroundColor: colors.navy, transform: [{ scale: 1.18 }] },
    pinClampDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#F59E0B',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },

    radarHint: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.lg },

    mapCard: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm + 4,
      shadowColor: colors.navy,
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    mapCardAvatar: { width: 44, height: 44, borderRadius: radius.md },
    mapCardName: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary },
    mapCardBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 9 },
    mapCardBtnText: { color: colors.white, fontWeight: '800', fontSize: 12.5 },

    listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    listAvatar: { width: 52, height: 52, borderRadius: radius.md },
    listNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, flexShrink: 1, marginRight: 6 },
    distancePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.accent}1A`, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
    distancePillText: { fontSize: 10.5, fontWeight: '800', color: colors.accent, marginLeft: 3 },
    listMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    listMetaText: { fontSize: 11.5, color: colors.textSecondary, marginLeft: 4, fontWeight: '600' },
    listMetaDot: { fontSize: 11.5, color: colors.textSecondary, marginHorizontal: 5 },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },
  });
}