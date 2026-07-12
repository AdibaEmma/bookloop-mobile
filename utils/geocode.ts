/**
 * Reverse-geocoding helper with caching.
 *
 * Apple/Google geocoders rate-limit aggressively ("Geocoding rate limit
 * exceeded"), so every screen must go through this wrapper instead of calling
 * `Location.reverseGeocodeAsync` directly:
 *
 * - Results are cached by coordinates rounded to ~11 m, so re-renders,
 *   tab refocuses, and repeat visits never re-hit the native geocoder.
 * - Concurrent requests for the same spot share one in-flight promise.
 * - Failures resolve to `null` (callers render a fallback label); errors are
 *   not cached so a later attempt can succeed.
 */

import * as Location from 'expo-location';

const cache = new Map<string, Location.LocationGeocodedAddress | null>();
const inFlight = new Map<string, Promise<Location.LocationGeocodedAddress | null>>();

// 4 decimal places ≈ 11 m — close enough that the address won't change.
const keyFor = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<Location.LocationGeocodedAddress | null> {
  const key = keyFor(latitude, longitude);

  if (cache.has(key)) return cache.get(key) ?? null;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      cache.set(key, place ?? null);
      return place ?? null;
    } catch (error) {
      console.warn('[geocode] reverse geocoding failed:', error);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
