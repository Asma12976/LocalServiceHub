// src/utils/notify.js
// Tiny helper for writing an in-app notification for ANOTHER user into
// Firestore ("notifications/{theirUid}/items/{id}"). Used today by
// ChatContext (new message -> notify the other participant) and written
// generically so future features (booking accepted, review received, etc.)
// can reuse the exact same call instead of duplicating this logic.
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// -------------------------------------------------------------------
// Tracks which conversation (if any) is currently open on screen, so the
// local "new message" alert in NotificationContext can skip popping up a
// device notification for a chat the user is already looking at. Plain
// module-level state (not React state) on purpose — ChatScreen sets it on
// focus/blur and NotificationContext just reads it, no provider-order
// dependency between the two contexts needed.
// -------------------------------------------------------------------
let activeConversationId = null;

export function setActiveConversationId(conversationId) {
  activeConversationId = conversationId;
}

export function getActiveConversationId() {
  return activeConversationId;
}

export async function pushNotification({ toUid, type, title, body, data }) {
  if (!toUid) return;

  try {
    const ref = doc(collection(db, 'notifications', toUid, 'items'));

    await setDoc(ref, {
      id: ref.id,
      type,
      title,
      body,
      data: data || {},
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.log('pushNotification failed:', err?.message);
  }
}