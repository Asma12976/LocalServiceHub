// src/utils/bookingStatus.js
// Single source of truth for how a booking status is labeled and colored,
// so BookingsScreen and BookingDetailsScreen never fall out of sync.
import { colors } from '../theme/colors';

export const BOOKING_STATUS_META = {
  pending: { label: 'Pending', color: '#B58900', bg: 'rgba(181, 137, 0, 0.12)', dot: '#F59E0B' },
  // "accepted" is the internal status key written the moment a provider
  // confirms a pending request — surfaced to everyone as "Confirmed".
  accepted: { label: 'Confirmed', color: '#1D4ED8', bg: 'rgba(29, 78, 216, 0.10)', dot: '#3B82F6' },
  on_the_way: { label: 'On the Way', color: '#7E22CE', bg: 'rgba(126, 34, 206, 0.10)', dot: '#A855F7' },
  in_progress: { label: 'In Progress', color: colors.success, bg: 'rgba(62, 118, 88, 0.10)', dot: colors.success },
  completed: { label: 'Completed', color: colors.success, bg: 'rgba(62, 118, 88, 0.10)', dot: colors.success },
  cancelled: { label: 'Cancelled', color: colors.error, bg: colors.errorBg, dot: colors.error },
};

export function getBookingStatusMeta(status) {
  return BOOKING_STATUS_META[status] || BOOKING_STATUS_META.pending;
}
