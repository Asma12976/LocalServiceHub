// src/screens/admin/AdminChatScreen.js
// One real-time chat thread, opened from AdminMessagesScreen (the Messages
// tab) — e.g. a customer or provider replying to a dispute resolution sent
// from AdminContext.resolveDispute/dismissDispute.
//
// ChatScreen (src/screens/customer/ChatScreen.js) is already fully generic
// — it only ever talks to whichever account is logged in (useUser()) and
// the shared ChatContext, both mounted globally in App.js — so it works
// here completely unmodified. This file only exists so the Admin Panel's
// navigator (AdminNavigator.js) can import an admin-scoped screen name, the
// same way it does for every other admin tab.
export { default } from '../customer/ChatScreen';