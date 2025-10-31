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
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get API Base URL from environment
 * Falls back to platform-specific defaults if not set
 */
const getApiBaseUrl = (): string => {
  // Try to get from environment first
  const envUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl;
  }

  // Fallback to platform-specific defaults
  if (__DEV__) {
    // For physical devices, you need to use your computer's local IP address
    // Example: Get your IP with: ifconfig (Mac/Linux) or ipconfig (Windows)
    return Platform.select({
      ios: 'http://localhost:8000/api/v1',
      android: 'http://10.0.2.2:8000/api/v1', // Android emulator
      default: 'http://localhost:8000/api/v1',
    }) as string;
  }

  // Production fallback
  return 'https://api.bookloop.gh/api/v1';
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
 * Token Management
 * Using AsyncStorage instead of SecureStore for broader compatibility
 * Note: For production, consider using expo-secure-store for sensitive data
 */
export const TokenManager = {
  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token: string | null | undefined): Promise<void> {
    if (!token) {
      console.warn('[TokenManager] Attempted to set null/undefined access token');
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string | null | undefined): Promise<void> {
    if (!token) {
      console.warn('[TokenManager] Attempted to set null/undefined refresh token');
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async clearTokens(): Promise<void> {
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
    if (response.data?.result !== undefined) {
      return { ...response, data: response.data.result };
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
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
          return Promise.reject(new Error('Session expired. Please login again.'));
        }

        // Call refresh endpoint
        console.log('[API] Attempting token refresh');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

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
        console.error('[API] Token refresh failed:', refreshError);
        processQueue(refreshError, null);

        // Clear tokens and redirect to login
        await TokenManager.clearTokens();
        await TokenManager.clearUserData();

        // You can emit an event here to navigate to login
        // EventEmitter.emit('LOGOUT');

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log error in development
    if (__DEV__) {
      console.error('[API] Error:', error.response?.status, error.config?.url);
      console.error('[API] Error Data:', error.response?.data);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
