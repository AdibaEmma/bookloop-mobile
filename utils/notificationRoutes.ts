/**
 * Deep-link resolution for notifications.
 *
 * One source of truth used by the notifications list, the detail screen's
 * action button, and system push taps — a notification about an exchange
 * always lands on that exchange, wherever it was tapped from.
 *
 * Types are matched case-insensitively: the backend sends lowercase values
 * ("exchange_request"), older payloads were uppercase.
 */
export function notificationRoute(
  type?: string,
  data?: Record<string, any> | null,
): string | null {
  switch ((type ?? '').toLowerCase()) {
    case 'exchange_request':
    case 'exchange_accepted':
    case 'exchange_reminder':
      return data?.exchangeId ? `/exchange/${data.exchangeId}` : '/(tabs)/exchanges';
    case 'exchange_declined':
    case 'exchange_cancelled':
      return '/(tabs)/exchanges';
    case 'exchange_completed':
      return data?.exchangeId ? `/exchange/rate/${data.exchangeId}` : '/(tabs)/exchanges';
    case 'rating_received':
      return '/(tabs)/profile';
    case 'listing_approved':
    case 'listing_rejected':
      return data?.listingId ? `/listing/${data.listingId}` : null;
    default:
      return null;
  }
}
