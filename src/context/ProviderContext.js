// src/context/ProviderContext.js
// Holds the logged-in provider's *business* profile — separate from their
// personal account (UserContext / users/{uid}). Stored in its own top-level
// "providers/{uid}" Firestore document so it lines up with the shape the
// customer-facing screens (ProviderDetailsScreen, HomeScreen, Emergency
// Service, etc.) already expect from src/data/mockData.js — once those
// screens are switched over from mock data to real providers, they can read
// straight from this collection.
//
// The profile photo upload reuses the exact same Cloudinary flow as
// UserContext.uploadProfilePhoto — same cloud name/unsigned preset, just a
// different destination folder so provider photos don't mix with personal
// avatars.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

import { db } from '../config/firebase';
import { useUser } from './UserContext';

// =====================================================
// CLOUDINARY CONFIG (same account as UserContext, own folder)
// =====================================================

const CLOUDINARY_CLOUD_NAME = 'ehirq7yx';
const CLOUDINARY_UPLOAD_PRESET = 'localservicehub_profiles';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const PROVIDERS_COLLECTION = 'providers';
const BOOKINGS_COLLECTION = 'bookings';

const ProviderContext = createContext(undefined);

// -------------------------------------------------------------------
// Fills in any fields a saved provider doc doesn't have yet (older docs,
// or fields the setup screen doesn't collect directly) so every provider —
// real or mock — has the exact same shape the customer-facing cards
// (ProviderCard, ProviderGridCard, HomeScreen, ProviderDetailsScreen)
// already expect.
// -------------------------------------------------------------------
function normalizeProviderDoc(id, data) {
  const services = Array.isArray(data.services) ? data.services : [];

  const servicePrices = services
    .map((s) => Number(s.price))
    .filter((n) => Number.isFinite(n) && n > 0);

  const startingPrice =
    typeof data.startingPrice === 'number'
      ? data.startingPrice
      : servicePrices.length
      ? Math.min(...servicePrices)
      : 0;

  return {
    id,
    ownerUid: data.ownerUid || id,
    name: data.name || 'Unnamed Provider',
    categoryId: data.categoryId || null,
    rating: typeof data.rating === 'number' ? data.rating : 0,
    reviews: typeof data.reviews === 'number' ? data.reviews : 0,
    // Legacy/placeholder field — kept only so any old screen still reading
    // provider.distanceKm doesn't break. Real "how far is this from me"
    // distance is computed live on-device from latitude/longitude via
    // src/utils/location.js (haversineDistanceKm), not from this number.
    distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : 1.2,
    // Real GPS pin the provider dropped on ProviderProfileSetupScreen
    // ("Use my current location"). null when they haven't set one yet —
    // src/utils/location.js.resolveProviderCoords() falls back to their
    // typed area name, then to a deterministic spread point, so the map
    // always has something to plot.
    latitude: typeof data.latitude === 'number' ? data.latitude : null,
    longitude: typeof data.longitude === 'number' ? data.longitude : null,
    startingPrice,
    available: data.available !== undefined ? data.available : true,
    experienceYears: data.experienceYears || 0,
    location: data.location || '',
    about: data.about || '',
    services,
    phone: data.phone || '',
    image:
      data.image ||
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&h=400&q=80',
    isRealProvider: true,
    // Moderation status set by the Admin Panel (AdminProvidersScreen):
    // 'approved' | 'pending' | 'suspended'. Older docs saved before this
    // field existed default to 'approved' so nothing that was already
    // live suddenly disappears from the customer-facing app.
    status: data.status || 'approved',
    suspendReason: data.suspendReason || '',
    // Separate from `status` on purpose: a flag is just "an admin wants a
    // second look at this listing" (fake photos, suspicious pricing, a
    // pattern of complaints that isn't a proven violation yet) and does
    // NOT hide the provider from customers the way `suspended` does — a
    // provider can be `approved` AND `flagged` at the same time. Set by
    // AdminProvidersScreen/AdminProviderDetailsScreen via flagProvider().
    flagged: data.flagged === true,
    flagReason: data.flagReason || '',
  };
}

export function ProviderProvider({ children }) {
  const { user } = useUser();
  const uid = user?.uid;

  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------
  // Every real provider that has saved a business profile — this is what
  // powers the "Categories"/"Home" screens once a provider goes live.
  // Live-synced (onSnapshot) the same way BookingsContext syncs bookings,
  // so a newly-saved profile shows up immediately without needing a
  // manual refresh or app restart.
  // -------------------------------------------------------------------
  const [allProvidersRaw, setAllProvidersRaw] = useState([]);
  const [loadingAllProviders, setLoadingAllProviders] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, PROVIDERS_COLLECTION),
      (snapshot) => {
        const docs = snapshot.docs
          // Skip any profile that hasn't actually been filled in yet —
          // shouldn't normally happen since saveProviderProfile requires
          // name/category/about/services before it ever writes, but this
          // keeps a stray/incomplete doc from showing up as a blank card.
          .filter((d) => d.data()?.name && d.data()?.categoryId)
          .map((d) => normalizeProviderDoc(d.id, d.data()));
        setAllProvidersRaw(docs);
        setLoadingAllProviders(false);
      },
      (err) => {
        console.log('Providers listener error:', err?.message);
        setLoadingAllProviders(false);
      }
    );

    return unsubscribe;
  }, []);

  // Customer-facing list — everything the Admin Panel hasn't suspended or
  // is still reviewing stays hidden from Home/Categories/Emergency/Search,
  // exactly like real provider moderation should work. Admin screens use
  // allProvidersRaw (below) instead, since they need to see every status.
  const allProviders = useMemo(
    () => allProvidersRaw.filter((p) => p.status !== 'suspended' && p.status !== 'pending'),
    [allProvidersRaw]
  );

  // -------------------------------------------------------------------
  // rating/reviews for EVERY provider id (mock or real), computed LIVE by
  // reading every reviewed booking directly — not by trusting a stored
  // aggregate on providers/{id}. submitReview (BookingsContext) *does*
  // still try to write that aggregate, but it needs the customer to have
  // write access to a doc they don't own, which Firestore Security Rules
  // commonly block (permission-denied) — leaving rating/reviews stuck at
  // 0 forever even though the review saved fine. Deriving the count from
  // "bookings" instead only ever needs READ access, which every screen
  // that shows reviews (ProviderReviewsScreen, ProviderMyReviewsScreen)
  // already relies on successfully, so this always reflects reality.
  // -------------------------------------------------------------------
  const [liveStatsById, setLiveStatsById] = useState({});

  useEffect(() => {
    // Firestore doesn't support a plain "field exists" filter, but every
    // real rating is 1-5, so "> 0" is equivalent to "has been reviewed".
    const reviewedBookingsQuery = query(
      collection(db, BOOKINGS_COLLECTION),
      where('review.rating', '>', 0)
    );

    const unsubscribe = onSnapshot(
      reviewedBookingsQuery,
      (snapshot) => {
        const grouped = {};

        snapshot.docs.forEach((d) => {
          const data = d.data();
          const providerId = data?.provider?.id;
          const rating = data?.review?.rating;
          if (!providerId || typeof rating !== 'number') return;

          if (!grouped[providerId]) {
            grouped[providerId] = { sum: 0, count: 0 };
          }
          grouped[providerId].sum += rating;
          grouped[providerId].count += 1;
        });

        const stats = {};
        Object.keys(grouped).forEach((id) => {
          const { sum, count } = grouped[id];
          stats[id] = {
            reviews: count,
            rating: Math.round((sum / count) * 10) / 10,
          };
        });

        setLiveStatsById(stats);
      },
      (err) => {
        console.log('Live review stats listener error:', err?.message);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) {
      setProviderProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, PROVIDERS_COLLECTION, uid));
        if (!cancelled) {
          setProviderProfile(snap.exists() ? snap.data() : null);
        }
      } catch (err) {
        console.log('Could not load provider profile:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // -------------------------------------------------------------------
  // Create or update the business profile document. Uses merge:true so
  // fields like rating/reviews (once real ratings exist) are never wiped
  // out by a later "save my details" call.
  // -------------------------------------------------------------------
  const saveProviderProfile = useCallback(
    async (updates) => {
      if (!uid) {
        throw new Error('No logged-in user');
      }

      const isFirstSave = !providerProfile;

      const payload = {
        ownerUid: uid,
        updatedAt: new Date().toISOString(),
        ...updates,
      };

      if (isFirstSave) {
        payload.createdAt = new Date().toISOString();
        payload.rating = 0;
        payload.reviews = 0;
        // New listing starts out hidden from customers until an admin
        // approves it (AdminProvidersScreen / AdminProviderDetailsScreen).
        // Without this, normalizeProviderDoc's `data.status || 'approved'`
        // fallback would treat a brand-new doc (no status field yet) as
        // already approved, and it would show up on Home/Categories
        // immediately — skipping moderation entirely.
        payload.status = 'pending';
      }

      await setDoc(doc(db, PROVIDERS_COLLECTION, uid), payload, { merge: true });

      setProviderProfile((prev) => ({ ...(prev || {}), ...payload }));
    },
    [uid, providerProfile]
  );

  // -------------------------------------------------------------------
  // Upload a picked photo straight to Cloudinary, then save the resulting
  // secure_url onto the provider's Firestore doc — same pattern as
  // UserContext.uploadProfilePhoto.
  // -------------------------------------------------------------------
  const uploadProviderPhoto = useCallback(
    async (localUri) => {
      if (!uid) {
        throw new Error('No logged-in user');
      }
      if (!localUri) {
        throw new Error('No photo was selected.');
      }

      try {
        const response = await FileSystem.uploadAsync(CLOUDINARY_UPLOAD_URL, localUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: 'image/jpeg',
          parameters: {
            upload_preset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'provider_photos',
          },
        });

        if (response.status < 200 || response.status >= 300) {
          let errorMessage = 'Photo upload failed.';
          try {
            const errorData = JSON.parse(response.body);
            errorMessage = errorData?.error?.message || errorMessage;
          } catch (parseError) {
            // Ignore — fall back to the generic message above.
          }
          throw new Error(errorMessage);
        }

        let cloudinaryData;
        try {
          cloudinaryData = JSON.parse(response.body);
        } catch (parseError) {
          throw new Error('Invalid response received from Cloudinary.');
        }

        const photoURL = cloudinaryData?.secure_url;
        if (!photoURL) {
          throw new Error('Cloudinary did not return a photo URL.');
        }

        await setDoc(
          doc(db, PROVIDERS_COLLECTION, uid),
          { image: photoURL },
          { merge: true }
        );

        setProviderProfile((prev) => ({ ...(prev || {}), image: photoURL }));

        return photoURL;
      } catch (err) {
        throw new Error(err?.message || 'Could not upload your business photo.');
      }
    },
    [uid]
  );

  // -------------------------------------------------------------------
  // ADMIN MODERATION ACTIONS — used by the Admin Panel
  // (src/screens/admin/AdminProvidersScreen.js) to approve a newly
  // registered provider, suspend one that's misbehaving/disputed, put
  // them back live, or remove a listing entirely. Kept here (rather than
  // in a separate admin context) since this file already owns the write
  // channel to the "providers" collection.
  // -------------------------------------------------------------------
  const setProviderStatus = useCallback(async (id, status, extra = {}) => {
    if (!id) throw new Error('Missing provider id');
    await setDoc(
      doc(db, PROVIDERS_COLLECTION, id),
      { status, statusUpdatedAt: new Date().toISOString(), ...extra },
      { merge: true }
    );
  }, []);

  const approveProvider = useCallback(
    (id) => setProviderStatus(id, 'approved', { suspendReason: '' }),
    [setProviderStatus]
  );

  const suspendProvider = useCallback(
    (id, reason) => setProviderStatus(id, 'suspended', { suspendReason: reason || '' }),
    [setProviderStatus]
  );

  const reactivateProvider = useCallback(
    (id) => setProviderStatus(id, 'approved', { suspendReason: '' }),
    [setProviderStatus]
  );

  const removeProviderListing = useCallback(
    (id) => setProviderStatus(id, 'removed', { available: false }),
    [setProviderStatus]
  );

  // -------------------------------------------------------------------
  // FLAGGING — a lighter-weight "keep an eye on this one" than suspend.
  // Doesn't touch `status`/visibility at all, just stamps a flagged+reason
  // onto the doc so AdminProvidersScreen's "Flagged" filter and the badge
  // on AdminProviderDetailsScreen can surface it. unflagProvider clears it
  // once an admin has looked into it and decided no further action (e.g.
  // suspend) is needed.
  // -------------------------------------------------------------------
  const flagProvider = useCallback(
    (id, reason) =>
      setDoc(
        doc(db, PROVIDERS_COLLECTION, id),
        { flagged: true, flagReason: reason || '', flaggedAt: new Date().toISOString() },
        { merge: true }
      ),
    []
  );

  const unflagProvider = useCallback(
    (id) =>
      setDoc(
        doc(db, PROVIDERS_COLLECTION, id),
        { flagged: false, flagReason: '' },
        { merge: true }
      ),
    []
  );

  const value = useMemo(
    () => ({
      providerProfile,
      loading,
      saveProviderProfile,
      uploadProviderPhoto,
      allProviders,
      allProvidersRaw,
      loadingAllProviders,
      liveStatsById,
      approveProvider,
      suspendProvider,
      reactivateProvider,
      removeProviderListing,
      flagProvider,
      unflagProvider,
    }),
    [
      providerProfile,
      loading,
      saveProviderProfile,
      uploadProviderPhoto,
      allProviders,
      allProvidersRaw,
      loadingAllProviders,
      liveStatsById,
      approveProvider,
      suspendProvider,
      reactivateProvider,
      removeProviderListing,
      flagProvider,
      unflagProvider,
    ]
  );

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}

export function useProvider() {
  const ctx = useContext(ProviderContext);
  if (!ctx) {
    throw new Error('useProvider must be used inside a <ProviderProvider>');
  }
  return ctx;
}