// src/screens/admin/AdminMessagesScreen.js
// "Messages" tab of the Admin Panel. This is the admin's half of the
// reply-to-a-dispute-resolution flow: when AdminContext.resolveDispute /
// dismissDispute sends the resolution note as a real chat message (see the
// big comment on notifyPartyViaChat there), the customer/provider's reply
// lands right back in this exact same conversation list — no separate
// "admin inbox" data model needed.
//
// MessagesScreen (src/screens/customer/MessagesScreen.js) is already fully
// generic — it reads whichever account is logged in via useUser()/useChat(),
// both of which are mounted globally in App.js, so it works here completely
// unmodified. This file only exists so the Admin Panel's navigator
// (AdminNavigator.js) can import an admin-scoped screen name, the same way
// it does for every other admin tab.
export { default } from '../customer/MessagesScreen';