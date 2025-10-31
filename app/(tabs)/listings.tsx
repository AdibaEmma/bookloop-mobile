/**
 * Listings Tab
 *
 * Navigate directly to the my-listings screen
 */

import { Redirect } from 'expo-router';

export default function ListingsTab() {
  return <Redirect href="/listings/my-listings" />;
}
