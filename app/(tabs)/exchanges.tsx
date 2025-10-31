/**
 * Exchanges Tab
 *
 * Navigate directly to the my-exchanges screen
 */

import { Redirect } from 'expo-router';

export default function ExchangesTab() {
  return <Redirect href="/exchange/my-exchanges" />;
}
