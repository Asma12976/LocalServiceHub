// src/context/ChatContext.js
// App-wide messaging store. Wrapped around the app in App.js (same pattern
// as BookingsContext/ProviderContext) so both a customer screen
// (ProviderDetailsScreen -> "Message") and a provider replying from
// MessagesScreen can use the exact same conversations/messages underneath —
// there is only one "role" as far as chat is concerned, just two accounts
// talking to each other.
//
// Firestore shape:
//   conversations/{conversationId}
//     participants: [uidA, uidB]              (used for the security rule)
//     participantsInfo: { [uid]: { name, photo } }
//     lastMessage, lastMessageAt, lastSenderId
//     unreadCount: { [uid]: number }
//   conversations/{conversationId}/messages/{messageId}
//     senderId, text, createdAt
//
// conversationId is deterministic ([uidA, uidB] sorted + joined) so
// "message this provider" never creates duplicate threads and doesn't need
// an extra query to check "does a conversation already exist" first.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { useUser } from './UserContext';
import { pushNotification } from '../utils/notify';

const ChatContext = createContext(undefined);

const CONVERSATIONS_COLLECTION = 'conversations';

export function getConversationId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export function ChatProvider({ children }) {
  const { user } = useUser();
  const uid = user?.uid;

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // -------------------------------------------------------------------
  // Live sync every conversation the logged-in account is part of —
  // whichever "side" they're on (customer who started the chat, or
  // provider replying to it).
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!uid) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);

    const conversationsQuery = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', uid)
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Sort newest-first on the client — avoids needing a composite
        // Firestore index for (array-contains + orderBy) just to show a
        // chat list.
        docs.sort((a, b) => {
          const aTime = a.lastMessageAt?.toMillis?.() || 0;
          const bTime = b.lastMessageAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setConversations(docs);
        setLoadingConversations(false);
      },
      (err) => {
        console.log('Conversations listener error:', err?.message);
        setLoadingConversations(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  // -------------------------------------------------------------------
  // Total unread message count across every conversation — powers the
  // badge dot on the Home header's chat icon.
  // -------------------------------------------------------------------
  const totalUnreadMessages = useMemo(() => {
    if (!uid) return 0;
    return conversations.reduce((sum, c) => sum + (c.unreadCount?.[uid] || 0), 0);
  }, [conversations, uid]);

  // -------------------------------------------------------------------
  // Ensures a conversation document exists between the logged-in user and
  // `otherUser` ({ uid, name, photo }), then returns its id. Safe to call
  // every time "Message" is tapped — it never creates a duplicate thread.
  // -------------------------------------------------------------------
  const getOrCreateConversation = useCallback(
    async (otherUser) => {
      if (!uid) throw new Error('No logged-in user');
      if (!otherUser?.uid) throw new Error('Missing recipient.');
      if (otherUser.uid === uid) throw new Error("You can't message yourself.");

      const conversationId = getConversationId(uid, otherUser.uid);
      const ref = doc(db, CONVERSATIONS_COLLECTION, conversationId);

      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          participants: [uid, otherUser.uid],
          participantsInfo: {
            [uid]: { name: user?.name || 'User', photo: user?.photoURL || '' },
            [otherUser.uid]: { name: otherUser.name || 'User', photo: otherUser.photo || '' },
          },
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          lastSenderId: '',
          unreadCount: { [uid]: 0, [otherUser.uid]: 0 },
          createdAt: serverTimestamp(),
        });
      } else {
        // Keep both sides' displayed name/photo fresh (e.g. provider
        // updated their business photo since the thread was first
        // created) without touching unread counts or message history.
        const data = snap.data();
        await setDoc(
          ref,
          {
            participantsInfo: {
              ...data.participantsInfo,
              [uid]: { name: user?.name || 'User', photo: user?.photoURL || '' },
              [otherUser.uid]: {
                name: otherUser.name || data.participantsInfo?.[otherUser.uid]?.name || 'User',
                photo: otherUser.photo || data.participantsInfo?.[otherUser.uid]?.photo || '',
              },
            },
          },
          { merge: true }
        );
      }

      return conversationId;
    },
    [uid, user?.name, user?.photoURL]
  );

  // -------------------------------------------------------------------
  // Live-subscribe to one conversation's messages, oldest first. Returns
  // an unsubscribe function — call it from a useEffect cleanup in
  // ChatScreen.
  // -------------------------------------------------------------------
  const subscribeToMessages = useCallback((conversationId, callback) => {
    if (!conversationId) return () => {};

    const messagesQuery = query(
      collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.log('Messages listener error:', err?.message)
    );
  }, []);

  // -------------------------------------------------------------------
  // Send a message, bump the conversation's preview + unread count for the
  // recipient, and drop a notification for them.
  // -------------------------------------------------------------------
  const sendMessage = useCallback(
    async (conversationId, otherUserId, text) => {
      const trimmed = text?.trim();
      if (!uid || !conversationId || !otherUserId || !trimmed) return;

      const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
      const messageRef = doc(collection(conversationRef, 'messages'));

      await setDoc(messageRef, {
        senderId: uid,
        text: trimmed,
        createdAt: serverTimestamp(),
      });

      const existing = conversations.find((c) => c.id === conversationId);
      const previousUnread = existing?.unreadCount?.[otherUserId] || 0;

      await setDoc(
        conversationRef,
        {
          lastMessage: trimmed,
          lastMessageAt: serverTimestamp(),
          lastSenderId: uid,
          unreadCount: {
            ...(existing?.unreadCount || {}),
            [otherUserId]: previousUnread + 1,
            [uid]: 0,
          },
        },
        { merge: true }
      );

      await pushNotification({
        toUid: otherUserId,
        type: 'message',
        title: user?.name || 'New message',
        body: trimmed,
        data: {
          conversationId,
          otherUserId: uid,
          otherUserName: user?.name || 'User',
          otherUserPhoto: user?.photoURL || '',
        },
      });
    },
    [uid, user?.name, user?.photoURL, conversations]
  );

  // -------------------------------------------------------------------
  // Reset my own unread count for a conversation — called when ChatScreen
  // opens it.
  // -------------------------------------------------------------------
  const markConversationRead = useCallback(
    async (conversationId) => {
      if (!uid || !conversationId) return;

      try {
        await setDoc(
          doc(db, CONVERSATIONS_COLLECTION, conversationId),
          { unreadCount: { [uid]: 0 } },
          { merge: true }
        );
      } catch (err) {
        console.log('markConversationRead failed:', err?.message);
      }
    },
    [uid]
  );

  const getOtherParticipant = useCallback(
    (conversation) => {
      if (!conversation || !uid) return null;
      const otherUid = conversation.participants?.find((p) => p !== uid);
      if (!otherUid) return null;
      return { uid: otherUid, ...(conversation.participantsInfo?.[otherUid] || {}) };
    },
    [uid]
  );

  const value = useMemo(
    () => ({
      conversations,
      loadingConversations,
      totalUnreadMessages,
      getOrCreateConversation,
      subscribeToMessages,
      sendMessage,
      markConversationRead,
      getOtherParticipant,
    }),
    [
      conversations,
      loadingConversations,
      totalUnreadMessages,
      getOrCreateConversation,
      subscribeToMessages,
      sendMessage,
      markConversationRead,
      getOtherParticipant,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used inside a <ChatProvider>');
  }
  return ctx;
}