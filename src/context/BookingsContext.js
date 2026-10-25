// src/context/BookingsContext.js
// App-wide bookings store. Wrapped around the app in App.js so any screen
// can create a booking, cancel it, look one up, or read the full list —
// no prop drilling needed.
//
// Backed by Firestore now: every booking is a document in the top-level
// "bookings" collection, tagged with the logged-in customer's uid so each
// customer only ever sees their own bookings. Writes are applied to local
// state immediately (optimistic update) so screens that read the result of
// addBooking/cancelBooking synchronously (e.g. BookingScreen navigating to
// BookingConfirmation right after creating a booking) keep working exactly
// as before, while a live Firestore listener keeps everything in sync in
// the background (including changes made from elsewhere, like a provider
// updating booking status).
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { useUser } from './UserContext';
import { pushNotification } from '../utils/notify';

const BookingsContext = createContext(undefined);

const BOOKINGS_COLLECTION = 'bookings';
const PROVIDERS_COLLECTION = 'providers';
const USERS_COLLECTION = 'users';

export function BookingsProvider({ children }) {
  const { user } = useUser();
  const uid = user?.uid;

  const [bookings, setBookings] = useState([]);

  // -------------------------------------------------------------------
  // Live sync: whenever the logged-in customer changes (login/logout),
  // subscribe to that customer's bookings and keep local state mirrored.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!uid) {
      setBookings([]);
      return;
    }

    const bookingsQuery = query(
      collection(db, BOOKINGS_COLLECTION),
      where('customerId', '==', uid)
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(docs);
      },
      (err) => {
        console.log('Bookings listener error:', err?.message);
      }
    );

    return unsubscribe;
  }, [uid]);

  // -------------------------------------------------------------------
  // Live sync: the flip side of the listener above — every booking made
  // *with* the logged-in account, when they're acting as a provider (same
  // "just two accounts, one on each side" pattern ChatContext uses for
  // messaging). This is what powers ProviderBookingsScreen.
  // -------------------------------------------------------------------
  const [incomingBookingsRaw, setIncomingBookingsRaw] = useState([]);

  useEffect(() => {
    if (!uid) {
      setIncomingBookingsRaw([]);
      return;
    }

    const incomingQuery = query(
      collection(db, BOOKINGS_COLLECTION),
      where('provider.id', '==', uid)
    );

    const unsubscribe = onSnapshot(
      incomingQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setIncomingBookingsRaw(docs);
      },
      (err) => {
        console.log('Incoming bookings listener error:', err?.message);
      }
    );

    return unsubscribe;
  }, [uid]);

  // -------------------------------------------------------------------
  // Enrich incoming bookings with each customer's *current* profile
  // (name, Cloudinary photo, phone) straight from the "users" collection.
  // A booking only ever stores a snapshot of the customer taken at the
  // moment it was created — if that snapshot was blank (profile photo not
  // uploaded yet) or the customer has since changed their photo, the
  // provider would otherwise be stuck looking at stale/missing data.
  // Fetched once per customerId per session and cached, so this doesn't
  // re-fetch on every snapshot update.
  // -------------------------------------------------------------------
  const [customerProfiles, setCustomerProfiles] = useState({});
  const fetchedCustomerIdsRef = useRef(new Set());

  useEffect(() => {
    const idsToFetch = Array.from(
      new Set(
        incomingBookingsRaw
          .map((b) => b.customerId || b.customer?.id)
          .filter((id) => id && !fetchedCustomerIdsRef.current.has(id))
      )
    );

    if (idsToFetch.length === 0) return;

    idsToFetch.forEach((id) => fetchedCustomerIdsRef.current.add(id));

    idsToFetch.forEach(async (customerId) => {
      try {
        const snap = await getDoc(doc(db, USERS_COLLECTION, customerId));
        if (!snap.exists()) return;

        const data = snap.data();
        setCustomerProfiles((prev) => ({
          ...prev,
          [customerId]: {
            name: data.name || '',
            photo: data.photoURL || '',
            phone: data.phone || '',
          },
        }));
      } catch (err) {
        // Not fatal — the booking's own snapshot (or the placeholder icon)
        // is still shown, this just means it may be stale.
        console.log('Could not load customer profile for booking:', err?.message);
      }
    });
  }, [incomingBookingsRaw]);

  const incomingBookings = useMemo(
    () =>
      incomingBookingsRaw.map((booking) => {
        const liveProfile = customerProfiles[booking.customerId || booking.customer?.id];
        if (!liveProfile) return booking;

        return {
          ...booking,
          customer: {
            ...booking.customer,
            name: liveProfile.name || booking.customer?.name,
            photo: liveProfile.photo || booking.customer?.photo,
            phone: liveProfile.phone || booking.customer?.phone,
          },
        };
      }),
    [incomingBookingsRaw, customerProfiles]
  );

  const addBooking = useCallback(
    (bookingData) => {
      if (!uid) {
        throw new Error('No logged-in user');
      }

      // Generate the Firestore doc ref (and its id) up front so we can
      // return the full booking object synchronously, the same way the
      // old in-memory version did.
      const ref = doc(collection(db, BOOKINGS_COLLECTION));
      const newBooking = {
        id: ref.id,
        customerId: uid,
        customer: {
          id: uid,
          name: user?.name || 'Customer',
          photo: user?.photoURL || '',
          phone: user?.phone || '',
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...bookingData,
      };

      setBookings((prev) => [newBooking, ...prev]);

      setDoc(ref, newBooking).catch((err) => {
        console.log('addBooking failed to save to Firestore:', err?.message);
      });

      // Let the provider know a new job just landed on their side.
      pushNotification({
        toUid: newBooking.provider?.id,
        type: 'booking',
        title: 'New Booking Request',
        body: `${newBooking.customer.name} booked ${newBooking.service?.name || 'a service'} for ${
          newBooking.dateLabel
        } · ${newBooking.timeSlot}.`,
        data: { bookingId: newBooking.id, target: 'provider' },
      });

      return newBooking;
    },
    [uid, user?.name, user?.photoURL, user?.phone]
  );

  // -------------------------------------------------------------------
  // Provider confirms a pending request: booking -> "accepted" (shown to
  // the customer as "Confirmed"), the provider's own profile flips to
  // busy (available: false), and the customer gets notified. Simple
  // one-job-at-a-time model — a provider juggling several confirmed jobs
  // at once would need a real "active job count" instead of a boolean.
  // -------------------------------------------------------------------
  const confirmBooking = useCallback(
    (bookingId) => {
      const booking =
        incomingBookings.find((b) => b.id === bookingId) ||
        bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      setIncomingBookingsRaw((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'accepted' } : b))
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'accepted' } : b))
      );

      updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), { status: 'accepted' }).catch((err) =>
        console.log('confirmBooking failed to save to Firestore:', err?.message)
      );

      if (booking.provider?.id) {
        setDoc(
          doc(db, PROVIDERS_COLLECTION, booking.provider.id),
          { available: false },
          { merge: true }
        ).catch((err) => console.log('confirmBooking failed to update provider status:', err?.message));
      }

      if (booking.customerId) {
        pushNotification({
          toUid: booking.customerId,
          type: 'booking',
          title: 'Booking Confirmed',
          body: `${booking.provider?.name || 'Your provider'} confirmed your ${
            booking.service?.name || 'service'
          } booking for ${booking.dateLabel}.`,
          data: { bookingId, target: 'customer' },
        });
      }
    },
    [incomingBookings, bookings]
  );

  // -------------------------------------------------------------------
  // Provider marks a confirmed job done: booking -> "completed", provider
  // goes available again, and the customer is notified (and can now leave
  // a review from ReviewsScreen / BookingDetailsScreen).
  // -------------------------------------------------------------------
  const completeBooking = useCallback(
    (bookingId) => {
      const booking =
        incomingBookings.find((b) => b.id === bookingId) ||
        bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      setIncomingBookingsRaw((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
      );

      updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), { status: 'completed' }).catch((err) =>
        console.log('completeBooking failed to save to Firestore:', err?.message)
      );

      if (booking.provider?.id) {
        setDoc(
          doc(db, PROVIDERS_COLLECTION, booking.provider.id),
          { available: true },
          { merge: true }
        ).catch((err) => console.log('completeBooking failed to update provider status:', err?.message));
      }

      if (booking.customerId) {
        pushNotification({
          toUid: booking.customerId,
          type: 'booking',
          title: 'Service Completed',
          body: `Your ${booking.service?.name || 'service'} with ${
            booking.provider?.name || 'your provider'
          } is complete. Tap to leave a review.`,
          data: { bookingId, target: 'customer' },
        });
      }
    },
    [incomingBookings, bookings]
  );

  const cancelBooking = useCallback((bookingId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );

    updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), { status: 'cancelled' }).catch(
      (err) => console.log('cancelBooking failed to save to Firestore:', err?.message)
    );
  }, []);

  const updateBookingStatus = useCallback((bookingId, status) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));

    updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), { status }).catch((err) =>
      console.log('updateBookingStatus failed to save to Firestore:', err?.message)
    );
  }, []);

  // Attaches a rating (+ optional comment) to a completed booking. This is
  // what ReviewsScreen calls when the customer submits a "Rate & Review".
  // Besides saving the review on the booking itself, it also rolls the new
  // rating into that provider's aggregate rating/reviews count on their
  // providers/{id} doc — this is what ProviderCard, ProviderDetailsScreen
  // and ProviderReviewsScreen actually read, so without this step a
  // provider's star rating would never move even though the review was
  // saved successfully.
  const submitReview = useCallback(
    (bookingId, rating, comment) => {
      // Capture the reviewer's name/photo straight from their own profile
      // at the moment they submit — this is the customer writing to their
      // OWN account data, so there's no cross-account permission involved.
      // Screens that show these reviews (ProviderReviewsScreen,
      // ProviderMyReviewsScreen) can then use this field directly instead
      // of having to read another user's "users/{uid}" doc live, which
      // Firestore Security Rules may allow for a provider looking up their
      // own customers but block for one customer looking up another
      // (privacy) — that mismatch is why a reviewer's name could show up
      // correctly in "My Reviews" but as a generic "Customer" in "See All".
      const review = {
        rating,
        comment,
        createdAt: new Date().toISOString(),
        reviewerName: user?.name || 'Customer',
        reviewerPhoto: user?.photoURL || '',
      };

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, review } : b))
      );

      updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), { review }).catch((err) =>
        console.log('submitReview failed to save to Firestore:', err?.message)
      );

      const booking = bookings.find((b) => b.id === bookingId);
      const providerId = booking?.provider?.id;

      if (providerId) {
        const providerRef = doc(db, PROVIDERS_COLLECTION, providerId);

        runTransaction(db, async (tx) => {
          const providerSnap = await tx.get(providerRef);
          const data = providerSnap.exists() ? providerSnap.data() : {};

          const oldRating = typeof data.rating === 'number' ? data.rating : 0;
          const oldReviews = typeof data.reviews === 'number' ? data.reviews : 0;
          const newReviews = oldReviews + 1;
          const newRating = (oldRating * oldReviews + rating) / newReviews;

          tx.set(
            providerRef,
            { rating: Math.round(newRating * 10) / 10, reviews: newReviews },
            { merge: true }
          );
        }).catch((err) => {
          // If this logs "permission-denied", your Firestore Security Rules
          // are blocking a customer from writing to another user's
          // providers/{providerId} doc — which is the #1 reason a real
          // provider's rating/reviews count stays stuck at 0 even though
          // the review itself saved fine on the booking. Fix: allow an
          // authenticated user to update ONLY the rating/reviews fields on
          // a providers/{providerId} doc they don't own, e.g.:
          //
          //   match /providers/{providerId} {
          //     allow read: if true;
          //     allow update: if request.auth != null &&
          //       request.resource.data.diff(resource.data).affectedKeys()
          //         .hasOnly(['rating', 'reviews']);
          //     allow write: if request.auth.uid == providerId;
          //   }
          //
          // This aggregate write is now just a nice-to-have: every screen
          // that shows a provider's rating/review count computes it live
          // from the "bookings" collection instead (see
          // ProviderContext.liveStatsById), so it stays correct even while
          // this write keeps failing.
          console.error(
            '[submitReview] Failed to update provider rating/reviews aggregate for',
            providerId,
            '\u2014 the review itself was still saved on the booking. Error:',
            err?.code || err?.message
          );
        });
      }
    },
    [bookings, user]
  );

  // -------------------------------------------------------------------
  // Raise a dispute on a booking (e.g. "provider didn't show up", "wrong
  // amount charged", "work not as described"). This is what feeds the
  // Admin Panel's Disputes screen (src/screens/admin/AdminDisputesScreen.js)
  // — without a dispute field on the booking, admins have nothing to
  // review or resolve.
  // -------------------------------------------------------------------
  const fileDispute = useCallback(
    (bookingId, reason) => {
      const dispute = {
        status: 'open',
        reason: reason || '',
        raisedBy: user?.uid || null,
        raisedByName: user?.name || 'Customer',
        createdAt: new Date().toISOString(),
      };

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, dispute } : b))
      );

      return updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), { dispute }).catch((err) => {
        console.log('fileDispute failed to save to Firestore:', err?.message);
        throw err;
      });
    },
    [user]
  );

  // -------------------------------------------------------------------
  // Report a review as fake/inappropriate. Marks it for the Admin Panel's
  // Reviews screen (src/screens/admin/AdminReviewsScreen.js) to look at —
  // it does NOT hide the review by itself, only an admin action does that,
  // so one report can't be used to silently take down a genuine review.
  // -------------------------------------------------------------------
  const flagReview = useCallback((bookingId, reason) => {
    const flagPayload = {
      'review.flagged': true,
      'review.flagReason': reason || '',
      'review.flaggedAt': new Date().toISOString(),
    };

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId && b.review
          ? { ...b, review: { ...b.review, flagged: true, flagReason: reason || '' } }
          : b
      )
    );

    return updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), flagPayload).catch((err) => {
      console.log('flagReview failed to save to Firestore:', err?.message);
      throw err;
    });
  }, []);

  const getBookingById = useCallback(
    (bookingId) => bookings.find((b) => b.id === bookingId),
    [bookings]
  );

  const getIncomingBookingById = useCallback(
    (bookingId) => incomingBookings.find((b) => b.id === bookingId),
    [incomingBookings]
  );

  const upcomingBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
      ),
    [bookings]
  );

  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'completed'),
    [bookings]
  );

  const cancelledBookings = useMemo(
    () => bookings.filter((b) => b.status === 'cancelled'),
    [bookings]
  );

  const value = useMemo(
    () => ({
      bookings,
      addBooking,
      cancelBooking,
      updateBookingStatus,
      submitReview,
      fileDispute,
      flagReview,
      getBookingById,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      // Provider-side incoming bookings (see comment above incomingBookings).
      incomingBookings,
      getIncomingBookingById,
      confirmBooking,
      completeBooking,
    }),
    [
      bookings,
      addBooking,
      cancelBooking,
      updateBookingStatus,
      submitReview,
      fileDispute,
      flagReview,
      getBookingById,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      incomingBookings,
      getIncomingBookingById,
      confirmBooking,
      completeBooking,
    ]
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) {
    throw new Error('useBookings must be used inside a <BookingsProvider>');
  }
  return ctx;
}