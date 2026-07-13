/**
 * API Client
 *
 * Axios instance configured for BookLoop backend.
 *
 * Features:
 * - Base URL configuration (env-based)
 * - Request interceptors (auth token injection)
 * - Response interceptors (error handling, token refresh)
 * - Automatic retry on network errors
 * - Request/response logging (dev mode)
 *
 * Setup:
 * 1. Copy .env.example to .env
 * 2. For physical device: Set API_BASE_URL to your local IP (e.g., http://192.168.1.100:3000/api/v1)
 * 3. For Android emulator: Use http://10.0.2.2:3000/api/v1
 * 4. For iOS simulator: Use http://localhost:3000/api/v1
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Convert snake_case keys to camelCase recursively
 */
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const transformKeys = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);

  const transformed: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = transformKeys(obj[key]);
    }
  }
  return transformed;
};

const API_PORT = 8000;
const API_PATH = '/api/v1';
// Live backend (Railway). Switch to https://api.bookloop.gh/api/v1 when
// the custom domain is attached to the api-server service.
const PROD_API_URL = 'https://api-server-production-786f.up.railway.app/api/v1';

/** True for a private-LAN http URL (the kind of value that goes stale). */
const isPrivateLanUrl = (url: string): boolean =>
  /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(url);

/**
 * The IPv4 of the machine that served the JS bundle (the Expo dev server). On a
 * physical device this is the dev machine's *current* LAN IP, so reusing it for
 * the API means a changing DHCP address never breaks anything. Returns null on
 * simulators/emulators (localhost) and tunnels (non-IP host).
 */
const getDevHost = (): string | null => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).manifest?.debuggerHost,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c) {
      // e.g. "192.168.1.44:8081", "exp://192.168.1.44:8081", "my-mac.local:8081"
      const host = c
        .replace(/^\w+:\/\//, '')
        .split('/')[0]
        .replace(/:\d+$/, ''); // strip trailing :port (keeps IPv6 as-is)
      if (!host || host === '127.0.0.1' || host === 'localhost' || host === '::1') {
        continue;
      }
      // Tunnels (exp.direct / ngrok) serve the JS bundle but NOT the API on
      // API_PORT — deriving from them yields an unreachable URL, so skip them
      // and let an explicit apiUrl take over.
      if (/\.(exp\.direct|ngrok\.io|ngrok-free\.app)$/i.test(host)) {
        continue;
      }
      // A LAN IPv4, an mDNS ".local" name, or an IPv6 host — all reachable from
      // a device on the same network, where the API also runs.
      return host;
    }
  }
  return null;
};

/**
 * Resolve the API base URL.
 *
 * Priority — an explicit *remote* override (staging/tunnel) always wins; in dev
 * we then auto-track the dev machine's live IP; a stale private-LAN value is
 * ignored so nobody has to edit .env when DHCP hands out a new address.
 */
const getApiBaseUrl = (): string => {
  const explicit = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  const remoteOverride = explicit && !isPrivateLanUrl(explicit) ? explicit : null;

  if (__DEV__) {
    if (remoteOverride) return remoteOverride;

    const devHost = getDevHost();
    if (devHost) return `http://${devHost}:${API_PORT}${API_PATH}`;

    // Simulator / emulator / tunnel: honour any explicit value, else platform default.
    if (explicit) return explicit;
    return Platform.select({
      ios: `http://localhost:${API_PORT}${API_PATH}`,
      android: `http://10.0.2.2:${API_PORT}${API_PATH}`, // Android emulator
      default: `http://localhost:${API_PORT}${API_PATH}`,
    }) as string;
  }

  // Production: never trust a private-LAN value left in .env.
  return remoteOverride || PROD_API_URL;
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL in development
if (__DEV__) {
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] Platform:', Platform.OS);
}

/**
 * Secure Storage Keys
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};

/**
 * Read a token from the encrypted keystore, migrating a legacy AsyncStorage
 * copy on first read so existing sessions survive the move to SecureStore.
 */
async function readTokenWithMigration(key: string): Promise<string | null> {
  const secure = await SecureStore.getItemAsync(key);
  if (secure !== null) return secure;

  const legacy = await AsyncStorage.getItem(key);
  if (legacy !== null) {
    await SecureStore.setItemAsync(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  }
  return null;
}

/**
 * Token Management
 * Access/refresh tokens are credentials, so they live in the OS keychain/keystore
 * via expo-secure-store (not plaintext AsyncStorage). Non-secret user_data stays
 * in AsyncStorage — SecureStore has a ~2KB/value limit the profile blob can exceed.
 */
export const TokenManager = {
  async getAccessToken(): Promise<string | null> {
    return await readTokenWithMigration(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token: string | null | undefined): Promise<void> {
    if (!token) {
      console.warn('[TokenManager] Attempted to set null/undefined access token');
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await readTokenWithMigration(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string | null | undefined): Promise<void> {
    if (!token) {
      console.warn('[TokenManager] Attempted to set null/undefined refresh token');
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
    // The backend invalidates the previous refresh token on every rotation.
    // Biometric login keeps its own copy, so update it in step (no-op when
    // biometric credentials don't exist).
    try {
      const { biometricService } = await import('../biometric.service');
      await biometricService.updateStoredToken(token);
    } catch {
      // Biometric sync is best-effort; the session tokens are already stored.
    }
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    // Also drop any legacy plaintext copies from before the SecureStore move.
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setUserData(data: any): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
  },

  async getUserData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  async clearUserData(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },
};

/**
 * Create Axios Instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Injects access token into every request
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await TokenManager.getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor
 * Handles errors and token refresh
 */
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (__DEV__) {
      console.log(`[API] Response:`, response.status, response.config.url);
    }

    // Extract result from BookLoop API response format
    // { status: true, path: "...", statusCode: 200, result: {...} }
    let data = response.data?.result !== undefined ? response.data.result : response.data;

    // Transform snake_case to camelCase
    data = transformKeys(data);

    return { ...response, data };
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Skip token refresh for public auth endpoints (login, register, verify-otp, etc.)
    // But allow refresh for protected auth endpoints like /auth/me
    const publicAuthEndpoints = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];
    const isPublicAuthEndpoint = publicAuthEndpoints.some(endpoint => originalRequest?.url?.includes(endpoint));

    // Handle 401 Unauthorized (token expired) - but not for public auth endpoints
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicAuthEndpoint) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await TokenManager.getRefreshToken();

        if (!refreshToken) {
          console.warn('[API] No refresh token available, clearing session');
          await TokenManager.clearTokens();
          await TokenManager.clearUserData();
          processQueue(new Error('No refresh token available'), null);
          const expired = new Error(
            'Session expired. Please login again.',
          ) as Error & { sessionExpired?: boolean };
          expired.sessionExpired = true;
          return Promise.reject(expired);
        }

        // Call refresh endpoint
        console.log('[API] Attempting token refresh');
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          // Bound the refresh so a half-open connection can't wedge isRefreshing
          // and park every queued 401 indefinitely.
          { timeout: 15000 },
        );

        // Handle response - backend wraps data in 'result' and tokens are in 'tokens' object
        const data = response.data.result || response.data;
        const tokens = data.tokens || data;
        const { access_token, refresh_token: newRefreshToken } = tokens;

        if (!access_token) {
          throw new Error('No access token in refresh response');
        }

        console.log('[API] Token refresh successful');

        // Store new tokens
        await TokenManager.setAccessToken(access_token);
        if (newRefreshToken) {
          await TokenManager.setRefreshToken(newRefreshToken);
        }

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Only end the session when the refresh is genuinely REJECTED (the
        // refresh token is bad/expired → 401/403). A network blip, timeout, or
        // server restart must NOT log the user out — their token is still valid,
        // so keep it and let the next request retry.
        const refreshStatus = axios.isAxiosError(refreshError)
          ? refreshError.response?.status
          : undefined;

        if (refreshStatus === 401 || refreshStatus === 403) {
          console.warn('[API] Refresh token rejected — ending session');
          await TokenManager.clearTokens();
          await TokenManager.clearUserData();
          // Tag the error so callers (e.g. session restore) can distinguish a
          // genuine expiry from a transient failure — the thrown Error has no
          // `.response`, so a status check alone would miss it.
          const expired = new Error(
            'Session expired. Please login again.',
          ) as Error & { sessionExpired?: boolean };
          expired.sessionExpired = true;
          return Promise.reject(expired);
        }

        console.warn(
          '[API] Token refresh failed transiently (session kept):',
          axios.isAxiosError(refreshError) ? refreshError.message : refreshError,
        );
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log error in development
    if (__DEV__) {
      if (error.response) {
        // Server responded with error status
        console.error('[API] Error:', error.response.status, error.config?.url);
        console.error('[API] Error Data:', error.response.data);
      } else if (error.request) {
        // Request was made but no response received
        console.error('[API] Network Error - No response received');
        console.error('[API] Request URL:', error.config?.url);
        console.error('[API] Request Details:', {
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          url: error.config?.url,
        });
        console.error('[API] Error Message:', error.message);
      } else {
        // Something else happened
        console.error('[API] Error:', error.message);
      }
    }

    // Enhance error message for network errors
    if (!error.response && error.request) {
      return Promise.reject(
        new Error(
          `Network error: Cannot reach server at ${API_BASE_URL}. ` +
            `Please check:\n` +
            `1. API server is running\n` +
            `2. API_BASE_URL is correct in .env\n` +
            `3. Device is on same network (if using local IP)`,
        ),
      );
    }

    return Promise.reject(error);
  },
);

export default apiClient;
