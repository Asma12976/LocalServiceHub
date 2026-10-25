// src/context/NotificationContext.js
// App-wide notifications store, backed by Firestore
// ("notifications/{uid}/items/{id}") the same way ChatContext backs
// messaging. Two things happen here:
//
//   1. A live list + unread count for the in-app Notifications screen and
//      the bell badge on Home. This ALWAYS works, on every platform,
//      because it's just Firestore.
//   2. A real OS notification pop-up (via expo-notifications) the moment
//      a NEW item is written for the logged-in user.
//
// IMPORTANT — Expo Go on Android (SDK 53+):
// Expo removed remote/push-notification support for Expo Go on Android, and
// simply importing "expo-notifications" there throws
// "expo-notifications: Android Push notifications ... functionality ...
// was removed from Expo Go" and crashes the app. We only ever use LOCAL
// notifications here (no push token, no server), but the crash happens at
// module-load time regardless, so the only reliable fix is to never load
// the native module at all on that specific platform/runtime combo. That's
// what `notificationsSupported` + the dynamic require below do — on
// Android inside Expo Go, this file quietly skips the OS pop-up and the
// app keeps working normally (in-app Notifications screen + badges still
// update live). Everywhere else (iOS Expo Go, or ANY platform once you're
// running a Development Build / EAS build / npx expo run:android) the OS
// pop-up + tap-to-open work as normal.
//
// To get real device pop-ups on Android while testing, build a dev client
// once: `npx expo install expo-dev-client` then `npx expo run:android`
// (or `eas build --profile development --platform android`). You only
// need to do this once per device — after that you install that one debug
// APK and keep using `npx expo start` normally, no more Expo Go for
// Android testing.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { useUser } from './UserContext';
import { navigate } from '../utils/navigationRef';
import { getActiveConversationId } from '../utils/notify';
import { Notifications, notificationsSupported } from '../utils/pushNotification';

if (!notificationsSupported) {
  console.log(
    'Running in Expo Go on Android — device notification pop-ups are skipped ' +
      '(build a Development Build to enable them). In-app notifications still work.'
  );
} else if (Notifications) {
  // Show the alert/sound even while the app is in the foreground - by
  // default expo-notifications suppresses foreground alerts, which would
  // make a message notification silently do nothing while the app is
  // open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Newer expo-notifications versions use these two instead of
      // shouldShowAlert - harmless to include both.
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const NotificationContext = createContext(undefined);

export function NotificationProvider({ children }) {
  const { user } = useUser();
  const uid = user?.uid;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guards against re-firing a device notification for every doc on the
  // very first snapshot (which would otherwise pop up one alert per
  // existing, already-read notification every time the app opens).
  const isInitialSnapshot = useRef(true);

  // -------------------------------------------------------------------
  // One-time OS setup: ask for permission, and on Android register the
  // channel every notification needs to be posted to.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!Notifications) return;

    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (err) {
        console.log('Notification permission request failed:', err?.message);
      }

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Local Service Hub',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 150, 200],
          });
        } catch (err) {
          console.log('Notification channel setup failed:', err?.message);
        }
      }
    })();
  }, []);

  // -------------------------------------------------------------------
  // Tapping a device notification (from the tray, or a foreground banner)
  // opens the right screen and marks that item read.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!Notifications) return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      handleNotificationOpen(data);
    });

    return () => subscription.remove();
  }, []);

  const handleNotificationOpen = useCallback((data) => {
    if (data.notifId) {
      markAsReadById(data.notifId).catch(() => {});
    }

    if (data.type === 'message' && data.conversationId) {
      navigate('Chat', {
        conversationId: data.conversationId,
        otherUser: {
          uid: data.otherUserId,
          name: data.otherUserName,
          photo: data.otherUserPhoto,
        },
      });
    } else if (data.type === 'booking' && data.target === 'provider') {
      // "New booking request" -> take the provider straight to their
      // booking requests list so they can confirm it.
      navigate('ProviderBookings');
    } else if (data.type === 'booking' && data.bookingId) {
      // "Booking confirmed" / "Service completed" -> take the customer to
      // that booking's details (Rate & Review lives there once completed).
      navigate('BookingDetails', { bookingId: data.bookingId });
    } else {
      navigate('Notifications');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Live sync the notifications list + pop a device notification for
  // anything that arrives after this listener attached.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    isInitialSnapshot.current = true;
    setLoading(true);

    const notificationsQuery = query(
      collection(db, 'notifications', uid, 'items'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(docs);
        setLoading(false);

        if (!isInitialSnapshot.current && Notifications) {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;

            const item = { id: change.doc.id, ...change.doc.data() };

            // Already looking at that exact chat - no need to alert on top
            // of the message that's already visible on screen.
            if (item.type === 'message' && item.data?.conversationId === getActiveConversationId()) {
              return;
            }

            Notifications.scheduleNotificationAsync({
              content: {
                title: item.title || 'Local Service Hub',
                body: item.body || '',
                data: { ...(item.data || {}), type: item.type, notifId: item.id },
                sound: true,
              },
              trigger: null,
            }).catch((err) => console.log('scheduleNotificationAsync failed:', err?.message));
          });
        }

        isInitialSnapshot.current = false;
      },
      (err) => {
        console.log('Notifications listener error:', err?.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsReadById = useCallback(
    async (notifId) => {
      if (!uid || !notifId) return;
      try {
        await updateDoc(doc(db, 'notifications', uid, 'items', notifId), { read: true });
      } catch (err) {
        console.log('markAsReadById failed:', err?.message);
      }
    },
    [uid]
  );

  const markAllAsRead = useCallback(async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', uid, 'items', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.log('markAllAsRead failed:', err?.message);
    }
  }, [uid, notifications]);

  const value = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount,
      markAsReadById,
      markAllAsRead,
      handleNotificationOpen,
    }),
    [notifications, loading, unreadCount, markAsReadById, markAllAsRead, handleNotificationOpen]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside a <NotificationProvider>');
  }
  return ctx;
}