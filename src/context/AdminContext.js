// src/context/AdminContext.js
// Data + moderation actions for the Admin Panel (src/navigation/AdminNavigator.js).
// Mounted only inside AdminNavigator, so this listener ("read every booking
// in the whole app") only ever runs for an actual admin session.
//
// Disputes and reviews both already live as fields on top-level "bookings"
// documents (BookingsContext.fileDispute / flagReview), so instead of a
// separate "disputes"/"reviews" collection, this just listens to the whole
// "bookings" collection and derives both lists from it — that way a
// dispute/review an admin resolves here is instantly reflected back on the
// exact same booking the customer/provider already see in
// BookingDetailsScreen, with no extra syncing needed.
//
// Provider moderation itself (approve/suspend/reactivate/remove) is NOT
// duplicated here — src/context/ProviderContext.js already owns the write
// channel to the "providers" collection and exposes those actions, so
// AdminProvidersScreen/AdminProviderDetailsScreen call useProvider() for
// that part and useAdmin() (this file) only for disputes/reviews.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { collection, deleteField, onSnapshot, updateDoc, doc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { useUser } from './UserContext';
import { useChat } from './ChatContext';

const BOOKINGS_COLLECTION = 'bookings';

// Shown as the sender's name/photo on the customer/provider side of the
// conversation, instead of whatever the logged-in admin account happens to
// be named — so it reads as "the platform got back to me", not "some
// random person messaged me", no matter which admin account resolved it.
const SUPPORT_NAME = 'Local Service Hub Support';
const SUPPORT_PHOTO = 'https://ui-avatars.com/api/?name=LSH&background=071A2B&color=fff';

const AdminContext = createContext(undefined);

export function AdminProvider({ children }) {
  // Used to actually deliver the resolution note as a real chat message
  // (not just a one-way push notification) so the customer/provider can
  // reply to it straight from their Notifications/Messages screen and the
  // admin sees the reply in the Admin Panel's own Messages tab — see
  // resolveDispute/dismissDispute below.
  const { user: adminUser } = useUser();
  const { getOrCreateConversation, sendMessage } = useChat();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, BOOKINGS_COLLECTION),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBookings(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.log('AdminContext bookings listener error:', err?.message);
        // Most likely cause: Firestore Security Rules don't yet grant the
        // logged-in admin account read access to every booking (only to
        // their own, like a normal customer/provider). The Admin Panel
        // needs a rule such as:
        //   match /bookings/{bookingId} {
        //     allow read: if request.auth != null &&
        //       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
        //   }
        setError('Could not load platform data. Check Firestore access rules for the admin role.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // -------------------------------------------------------------------
  // DISPUTES — every booking with a `dispute` field, newest first.
  // -------------------------------------------------------------------
  const disputes = useMemo(
    () =>
      bookings
        .filter((b) => b.dispute)
        .sort((a, b) => new Date(b.dispute.createdAt) - new Date(a.dispute.createdAt)),
    [bookings]
  );

  const openDisputes = useMemo(
    () => disputes.filter((b) => b.dispute.status === 'open'),
    [disputes]
  );

  // -------------------------------------------------------------------
  // Delivers a resolution/dismissal note as a REAL chat message (using the
  // same conversations/messages the customer-provider chat already runs
  // on — see ChatContext.js) instead of a one-way push notification.
  // Because it's a genuine message in a genuine conversation, the
  // recipient can just open it from Messages/Notifications and type a
  // reply straight back — no separate "reply to admin" mechanism needed,
  // and that reply shows up for every admin in the Admin Panel's own
  // Messages tab (AdminNavigator.js), since conversations aren't tied to
  // one specific admin account.
  //
  // Best-effort: if this fails (e.g. the recipient uid is missing, or a
  // one-off network error), the dispute status update itself has already
  // gone through by the time this runs, so a chat-send failure here is
  // logged and swallowed rather than surfaced as if the whole resolve
  // action failed.
  const notifyPartyViaChat = useCallback(
    async (recipientUid, recipientName, recipientPhoto, text) => {
      if (!recipientUid || !adminUser?.uid || recipientUid === adminUser.uid) return;
      try {
        // otherUser here is the customer/provider being messaged — this is
        // what makes THEIR name/photo show correctly at the top of the
        // conversation. getOrCreateConversation also stamps the current
        // logged-in account's (the admin's) own name/photo onto
        // participantsInfo automatically, which we then override just
        // below — see the comment there for why.
        const conversationId = await getOrCreateConversation({
          uid: recipientUid,
          name: recipientName,
          photo: recipientPhoto,
        });

        // Show "Local Service Hub Support" (not this particular admin
        // account's own name) on the customer/provider's side of the
        // thread, so it reads as an official platform reply no matter
        // which admin account resolved the dispute.
        await updateDoc(doc(db, 'conversations', conversationId), {
          [`participantsInfo.${adminUser.uid}`]: { name: SUPPORT_NAME, photo: SUPPORT_PHOTO },
        });

        await sendMessage(conversationId, recipientUid, text);
      } catch (err) {
        console.log('notifyPartyViaChat failed:', err?.message);
      }
    },
    [adminUser?.uid, getOrCreateConversation, sendMessage]
  );

  const resolveDispute = useCallback(
    async (booking, resolutionNote) => {
      if (!booking?.id) throw new Error('Missing booking');

      await updateDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
        'dispute.status': 'resolved',
        'dispute.resolutionNote': resolutionNote || '',
        'dispute.resolvedAt': new Date().toISOString(),
      });

      const note = resolutionNote?.trim();
      const bookingRef = `booking #${booking.id.slice(0, 8)}`;
      const messageText = note
        ? `Your dispute on ${bookingRef} ("${booking.dispute?.reason}") has been resolved: ${note}\n\nReply here if you still need help.`
        : `Your dispute on ${bookingRef} ("${booking.dispute?.reason}") has been resolved.\n\nReply here if you still need help.`;

      // Let the customer who raised it know it's been looked at — this is
      // what makes BookingDetailsScreen's dispute banner flip from "Under
      // review" to "Resolved" feel like it actually went somewhere, and
      // now they can reply straight from the chat it opens.
      await notifyPartyViaChat(
        booking.dispute?.raisedBy,
        booking.customer?.name || booking.dispute?.raisedByName || 'Customer',
        booking.customer?.photo || '',
        messageText
      );

      await notifyPartyViaChat(
        booking.provider?.id,
        booking.provider?.name || 'Provider',
        booking.provider?.image || '',
        `A dispute on ${bookingRef} involving your listing has been resolved by ${SUPPORT_NAME}${
          note ? `: ${note}` : '.'
        }\n\nReply here if you have questions.`
      );
    },
    [notifyPartyViaChat]
  );

  const dismissDispute = useCallback(
    async (booking, resolutionNote) => {
      if (!booking?.id) throw new Error('Missing booking');

      await updateDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
        'dispute.status': 'dismissed',
        'dispute.resolutionNote': resolutionNote || '',
        'dispute.resolvedAt': new Date().toISOString(),
      });

      const note = resolutionNote?.trim();
      const bookingRef = `booking #${booking.id.slice(0, 8)}`;
      const messageText = note
        ? `Your dispute on ${bookingRef} ("${booking.dispute?.reason}") was reviewed and dismissed: ${note}\n\nReply here if you'd like to discuss it further.`
        : `Your dispute on ${bookingRef} ("${booking.dispute?.reason}") was reviewed and dismissed.\n\nReply here if you'd like to discuss it further.`;

      await notifyPartyViaChat(
        booking.dispute?.raisedBy,
        booking.customer?.name || booking.dispute?.raisedByName || 'Customer',
        booking.customer?.photo || '',
        messageText
      );
    },
    [notifyPartyViaChat]
  );

  // -------------------------------------------------------------------
  // REVIEWS — every booking with a visible `review` field, newest first.
  // "Hiding" a review moves it to `hiddenReview` and deletes the live
  // `review` field entirely (rather than just setting a hidden:true flag)
  // so it disappears everywhere a review is already read straight from
  // this same field — ProviderReviewsScreen, ReviewsScreen ("My
  // Reviews"), ProviderMyReviewsScreen, and the rating/review-count
  // aggregate in ProviderContext.liveStatsById — with NO changes needed
  // to any of those screens. restoreReview() reverses this exactly.
  // -------------------------------------------------------------------
  const reviews = useMemo(
    () =>
      bookings
        .filter((b) => b.review)
        .sort((a, b) => new Date(b.review.createdAt) - new Date(a.review.createdAt)),
    [bookings]
  );

  const flaggedReviews = useMemo(
    () => reviews.filter((b) => b.review?.flagged),
    [reviews]
  );

  const hiddenReviews = useMemo(
    () =>
      bookings
        .filter((b) => b.hiddenReview)
        .sort((a, b) => new Date(b.hiddenReview.createdAt) - new Date(a.hiddenReview.createdAt)),
    [bookings]
  );

  const hideReview = useCallback(async (booking) => {
    if (!booking?.id || !booking?.review) throw new Error('Missing review');

    await updateDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
      hiddenReview: { ...booking.review, hiddenAt: new Date().toISOString() },
      review: deleteField(),
    });
  }, []);

  const restoreReview = useCallback(async (booking) => {
    if (!booking?.id || !booking?.hiddenReview) throw new Error('Missing hidden review');

    const { hiddenAt, ...restored } = booking.hiddenReview;

    await updateDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
      review: restored,
      hiddenReview: deleteField(),
    });
  }, []);

  // A customer's flag was a false alarm — keep the review live, just
  // clear the flag so it drops out of the "Flagged" tab.
  const unflagReview = useCallback(async (booking) => {
    if (!booking?.id) throw new Error('Missing booking');

    await updateDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
      'review.flagged': false,
    });
  }, []);

  // The reverse of unflagReview: lets an admin proactively mark a review
  // as suspicious from the "All" tab (not just wait for a customer/
  // provider report via BookingsContext.flagReview) — this is what
  // actually makes the "Flagged" tab usable, since nothing else calls it
  // from any screen yet.
  const flagReview = useCallback(async (booking, reason) => {
    if (!booking?.id) throw new Error('Missing booking');

    await updateDoc(doc(db, BOOKINGS_COLLECTION, booking.id), {
      'review.flagged': true,
      'review.flagReason': reason || 'Flagged by admin',
      'review.flaggedAt': new Date().toISOString(),
    });
  }, []);

  const value = useMemo(
    () => ({
      loading,
      error,
      disputes,
      openDisputes,
      resolveDispute,
      dismissDispute,
      reviews,
      flaggedReviews,
      hiddenReviews,
      hideReview,
      restoreReview,
      unflagReview,
      flagReview,
      // Exposed so AdminProvidersScreen/AdminProviderDetailsScreen can send
      // a suspend/flag notice as a real, reply-able chat message the same
      // way resolveDispute/dismissDispute already do above — instead of
      // duplicating this logic for provider moderation.
      notifyPartyViaChat,
    }),
    [
      loading,
      error,
      disputes,
      openDisputes,
      resolveDispute,
      dismissDispute,
      reviews,
      flaggedReviews,
      hiddenReviews,
      hideReview,
      restoreReview,
      unflagReview,
      flagReview,
      notifyPartyViaChat,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used inside an <AdminProvider>');
  }
  return ctx;
}