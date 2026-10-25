// src/utils/dateFormat.js
// Small, dependency-free time formatters shared by the chat + notifications
// screens. Firestore serverTimestamp() fields arrive as a Firestore
// Timestamp object (has .toDate()) on confirmed docs, but read back as
// `null` for the brief moment before the server confirms the write — every
// helper here accepts that and falls back gracefully instead of throwing.

function toJsDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "3:45 PM" — used inside chat bubbles.
export function formatMessageTime(value) {
  const date = toJsDate(value);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// "3:45 PM" for today, "Tue" for this week, "12/09/26" otherwise — used in
// the conversation list / notifications list.
export function formatListTime(value) {
  const date = toJsDate(value);
  if (!date) return '';

  const now = new Date();

  if (isSameDay(date, now)) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString();
}

// "2 minutes ago", "5 hours ago" — used for notification rows.
export function formatRelativeTime(value) {
  const date = toJsDate(value);
  if (!date) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'Just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString();
}

// Used to decide whether to insert a "Today" / date divider between
// messages in ChatScreen.
export function isDifferentDay(valueA, valueB) {
  const a = toJsDate(valueA);
  const b = toJsDate(valueB);
  if (!a || !b) return false;
  return !isSameDay(a, b);
}

export function formatDayDivider(value) {
  const date = toJsDate(value);
  if (!date) return '';

  const now = new Date();
  if (isSameDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
