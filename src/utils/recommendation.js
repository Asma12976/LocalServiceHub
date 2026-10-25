// src/utils/recommendation.js
//
// Real scoring for HomeScreen's "Recommended For You" row. Replaces the
// old hardcoded matchPercents = [94, 89, 84] (same three numbers no
// matter who was logged in or which providers existed) with an actual
// score built from four real signals — nothing here is invented:
//
//   40% category affinity — how much of THIS customer's own booking
//       history + favorites falls in this provider's category. A
//       completed booking counts double a pending one; a cancelled one
//       counts half (they didn't follow through). This is the strongest
//       real signal of "what this person actually wants".
//   25% rating quality — the provider's live rating/review count
//       (src/context/ProviderContext.js liveStatsById, the same numbers
//       shown everywhere else in the app), Bayesian-adjusted so a 5.0
//       from 2 reviews can't outrank a 4.8 from 120 reviews.
//   20% proximity — real haversine distance from the customer's live
//       device GPS (src/utils/location.js — same math NearMeScreen
//       uses), closer scores higher. Falls back to the Islamabad-center
//       anchor if GPS isn't available, exactly like NearMeScreen does.
//   10% availability — a provider who can actually take a job right now
//       (available: true) scores higher than one who's currently busy.
//    5% already favorited — a small nudge for providers this exact
//       customer has explicitly saved before.
//
// If the customer has no booking/favorite history yet (brand-new
// account), category affinity is neutral (0.5) for every provider
// instead of silently being 0 — the row still ranks sensibly by rating +
// distance + availability instead of looking broken. `isPersonalized`
// tells HomeScreen whether real personalization data was actually used,
// so it can label the section honestly ("Recommended For You" vs
// "Popular Near You" for a new customer with no history yet).
import { haversineDistanceKm, resolveProviderCoords } from './location';

const WEIGHTS = {
  category: 0.4,
  rating: 0.25,
  proximity: 0.2,
  availability: 0.1,
  favorite: 0.05,
};

// Bayesian-adjusted rating: pulls a rating with few reviews toward a
// neutral prior so one or two 5-star ratings can't jump a brand-new
// listing above a provider with 100+ real reviews.
const PRIOR_RATING = 3.8;
const PRIOR_WEIGHT = 8; // "worth" ~8 reviews of neutral pull

function bayesianRating(rating, reviews) {
  const r = typeof rating === 'number' ? rating : 0;
  const n = typeof reviews === 'number' ? reviews : 0;
  return (PRIOR_RATING * PRIOR_WEIGHT + r * n) / (PRIOR_WEIGHT + n);
}

// Distance -> 0..1 score. 0km = 1, fades to 0 by PROXIMITY_MAX_KM — same
// 8km horizon NearMeScreen's radar uses at its widest, so "close" means
// the same thing in both places.
const PROXIMITY_MAX_KM = 8;
function proximityScore(km) {
  if (km == null || Number.isNaN(km)) return 0.5; // unknown distance: don't penalize
  return Math.max(0, 1 - km / PROXIMITY_MAX_KM);
}

const MEDALS = ['🥇', '🥈', '🥉'];

// providers: merged mock + live Firestore providers (already filtered to
//   approved/visible ones — see ProviderContext.allProviders)
// bookings: this customer's own bookings (useBookings().bookings)
// favorites: this customer's saved providers (useFavorites().favorites)
// origin: { latitude, longitude } — customer's live GPS, or the
//   ISLAMABAD_CENTER fallback (same pattern as NearMeScreen)
export function computeRecommendations({
  providers,
  bookings = [],
  favorites = [],
  origin,
  limit = 3,
}) {
  // --- Real category preference, built from this customer's own history ---
  const categoryCounts = {};
  let totalSignals = 0;

  bookings.forEach((b) => {
    const catId = b?.provider?.categoryId;
    if (!catId) return;
    const weight = b.status === 'completed' ? 2 : b.status === 'cancelled' ? 0.5 : 1;
    categoryCounts[catId] = (categoryCounts[catId] || 0) + weight;
    totalSignals += weight;
  });

  favorites.forEach((p) => {
    const catId = p?.categoryId;
    if (!catId) return;
    categoryCounts[catId] = (categoryCounts[catId] || 0) + 1.5;
    totalSignals += 1.5;
  });

  const isPersonalized = totalSignals > 0;
  const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts), 0);
  const favoriteIds = new Set(favorites.map((p) => p.id));

  const scored = (providers || []).map((p) => {
    const categoryScore = isPersonalized
      ? (categoryCounts[p.categoryId] || 0) / maxCategoryCount
      : 0.5; // neutral until this customer has real history

    const ratingScore = bayesianRating(p.rating, p.reviews) / 5;

    let distanceKm = null;
    if (origin) {
      const coords = resolveProviderCoords(p);
      distanceKm = haversineDistanceKm(
        origin.latitude,
        origin.longitude,
        coords.latitude,
        coords.longitude
      );
    }
    const proxScore = proximityScore(distanceKm);

    const availabilityScore = p.available ? 1 : 0.2;
    const favoriteScore = favoriteIds.has(p.id) ? 1 : 0;

    const matchScore =
      categoryScore * WEIGHTS.category +
      ratingScore * WEIGHTS.rating +
      proxScore * WEIGHTS.proximity +
      availabilityScore * WEIGHTS.availability +
      favoriteScore * WEIGHTS.favorite;

    return { ...p, _distanceKm: distanceKm, _matchScore: matchScore };
  });

  const ranked = scored
    .sort((a, b) => b._matchScore - a._matchScore)
    .slice(0, limit)
    .map((p, idx) => ({
      ...p,
      medal: MEDALS[idx] || '⭐',
      // Real score (0..1) shown as a percentage, clamped away from the
      // very edges (1%/100%) so a rounding fluke never displays as an
      // absolute 0 or a suspiciously perfect 100.
      matchPercent: Math.max(1, Math.min(99, Math.round(p._matchScore * 100))),
    }));

  return { recommended: ranked, isPersonalized };
}