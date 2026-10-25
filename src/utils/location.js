// src/utils/location.js
// Real geolocation for "Near Me" — replaces the old hardcoded
// provider.distanceKm (always 1.2 for every real provider). Three pieces:
//
//   1. getCurrentCoords()      — reads the customer's ACTUAL device GPS
//      position (with permission), used by NearMeScreen.
//   2. haversineDistanceKm()   — real great-circle distance between two
//      lat/lng points, used to sort/label every provider by how far they
//      actually are from the customer right now.
//   3. resolveProviderCoords() — figures out a lat/lng to plot a provider
//      at, in priority order:
//        a) a real GPS pin the provider dropped on their profile
//           (ProviderProfileSetupScreen -> "Use my current location"),
//        b) a best-effort match against the Islamabad sector/area they
//           typed into the free-text "location" field (e.g. "G-9,
//           Islamabad"),
//        c) a deterministic (not random-every-render) spread point around
//           Islamabad so a provider with neither of the above still shows
//           up somewhere sensible on the map instead of stacking on 0,0
//           or disappearing.
//
// None of this touches providers/{id} in Firestore — it's all computed
// on-device, live, every time NearMeScreen renders.
import * as Location from 'expo-location';

// -------------------------------------------------------------------
// 1. DEVICE GPS
// -------------------------------------------------------------------

// Returns { isReal: true, coords: { latitude, longitude } } on success,
// or { isReal: false, coords: null, reason } if permission was denied or
// the device couldn't get a fix. NearMeScreen and
// ProviderProfileSetupScreen both fall back gracefully on isReal: false
// instead of treating it as a thrown error.
export async function getCurrentCoords() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return { isReal: false, coords: null, reason: 'permission-denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      isReal: true,
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      reason: null,
    };
  } catch (err) {
    return { isReal: false, coords: null, reason: err?.message || 'location-unavailable' };
  }
}

// -------------------------------------------------------------------
// 2. REAL DISTANCE — haversine great-circle formula
// -------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((n) => typeof n !== 'number' || Number.isNaN(n))) {
    return null;
  }

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// "650 m" for anything under 1km, "3.2 km" otherwise — NearMeScreen adds
// the " away" suffix itself so this stays reusable elsewhere too.
export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// -------------------------------------------------------------------
// 3. PROVIDER COORDINATES
// -------------------------------------------------------------------

// Roughly the middle of Islamabad (Blue Area) — used as the map's default
// center and as the anchor point for the area lookup + fallback spread
// below. This app's whole provider base is assumed to be Islamabad/Rawalpindi,
// matching the "Islamabad, PK" location shown on HomeScreen.
export const ISLAMABAD_CENTER = { latitude: 33.6844, longitude: 73.0479 };

// Approximate center points for the Islamabad sectors/areas providers
// commonly type into the "location" field on their profile. These are
// best-effort estimates (not a real geocoding service) — good enough to
// place a provider in roughly the right part of the city on the map when
// they haven't dropped a real GPS pin.
const AREA_COORDS = {
  'E-7': { latitude: 33.7215, longitude: 73.0645 },
  'E-11': { latitude: 33.6975, longitude: 72.9740 },
  'F-6': { latitude: 33.7205, longitude: 73.0890 },
  'F-7': { latitude: 33.7180, longitude: 73.0650 },
  'F-8': { latitude: 33.7090, longitude: 73.0475 },
  'F-10': { latitude: 33.6960, longitude: 73.0180 },
  'F-11': { latitude: 33.6970, longitude: 73.0000 },
  'G-6': { latitude: 33.7115, longitude: 73.0890 },
  'G-7': { latitude: 33.7080, longitude: 73.0710 },
  'G-8': { latitude: 33.7000, longitude: 73.0500 },
  'G-9': { latitude: 33.6920, longitude: 73.0330 },
  'G-10': { latitude: 33.6800, longitude: 73.0250 },
  'G-11': { latitude: 33.6790, longitude: 73.0070 },
  'G-13': { latitude: 33.6660, longitude: 72.9870 },
  'G-14': { latitude: 33.6570, longitude: 72.9700 },
  'G-15': { latitude: 33.6480, longitude: 72.9520 },
  'H-8': { latitude: 33.6870, longitude: 73.0680 },
  'H-9': { latitude: 33.6790, longitude: 73.0530 },
  'I-8': { latitude: 33.6720, longitude: 73.0770 },
  'I-9': { latitude: 33.6650, longitude: 73.0600 },
  'I-10': { latitude: 33.6560, longitude: 73.0430 },
  'BLUE AREA': { latitude: 33.7100, longitude: 73.0550 },
  'BAHRIA TOWN': { latitude: 33.5250, longitude: 73.1000 },
  'DHA': { latitude: 33.5450, longitude: 73.1300 },
  'BANI GALA': { latitude: 33.7180, longitude: 73.1350 },
  'RAWALPINDI': { latitude: 33.6007, longitude: 73.0679 },
  'SADDAR': { latitude: 33.5985, longitude: 73.0470 },
};

function matchAreaCoords(locationText) {
  if (!locationText || typeof locationText !== 'string') return null;

  const upper = locationText.toUpperCase();

  // Sector-style token first, e.g. "G-9", "F-10" out of "G-9, Islamabad".
  const sectorMatch = upper.match(/[A-Z]{1,2}-\d{1,2}/);
  if (sectorMatch && AREA_COORDS[sectorMatch[0]]) {
    return AREA_COORDS[sectorMatch[0]];
  }

  // Otherwise, a named-area substring match (Blue Area, Bahria Town, etc.)
  const namedMatch = Object.keys(AREA_COORDS).find((key) => upper.includes(key));
  return namedMatch ? AREA_COORDS[namedMatch] : null;
}

// Deterministic (same input -> same output every time, not Math.random())
// spread point around Islamabad so a provider with no GPS pin and no
// recognizable area name still lands somewhere plausible on the map,
// instead of every such provider stacking on the exact same point.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackSpreadCoords(seed) {
  const hash = hashString(String(seed || 'provider'));
  const angleRad = (hash % 360) * (Math.PI / 180);
  const radiusKm = 0.8 + (hash % 37) / 10; // spreads roughly 0.8km - 4.5km out

  const latOffset = (radiusKm / 111) * Math.sin(angleRad);
  const lonOffset =
    (radiusKm / (111 * Math.cos(toRad(ISLAMABAD_CENTER.latitude)))) * Math.cos(angleRad);

  return {
    latitude: ISLAMABAD_CENTER.latitude + latOffset,
    longitude: ISLAMABAD_CENTER.longitude + lonOffset,
  };
}

// The single entry point NearMeScreen (and anything else that needs to
// plot a provider) should call. Always returns a usable { latitude,
// longitude, source } — source tells you how confident to be:
// 'gps' (provider's real pin) > 'area' (matched their typed location) >
// 'fallback' (deterministic spread, least accurate).
export function resolveProviderCoords(provider) {
  if (typeof provider?.latitude === 'number' && typeof provider?.longitude === 'number') {
    return { latitude: provider.latitude, longitude: provider.longitude, source: 'gps' };
  }

  const areaCoords = matchAreaCoords(provider?.location);
  if (areaCoords) {
    return { ...areaCoords, source: 'area' };
  }

  return { ...fallbackSpreadCoords(provider?.id || provider?.name), source: 'fallback' };
}