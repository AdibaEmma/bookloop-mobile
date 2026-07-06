/**
 * Auth Service
 *
 * Handles authentication API calls.
 *
 * Features:
 * - Email-based registration with OTP
 * - OTP verification
 * - Login with email + password OR email + OTP
 * - Token refresh
 * - User profile retrieval
 * - Logout
 */

import apiClient, { TokenManager } from './client';
import { AxiosResponse } from 'axios';

interface RegisterDto {
  phone: string;
  email?: string; // Optional — phone is the primary identifier
  password?: string; // Optional password for dual auth
  firstName: string;
  middleName?: string;
  lastName: string;
}

interface VerifyOtpDto {
  phone?: string; // when the OTP was sent by SMS
  email?: string; // when the OTP was sent by email
  code: string; // Backend expects 'code' not 'otp'
}

interface LoginDto {
  phone?: string; // log in with phone
  email?: string; // ...or email
  password?: string; // Optional - if not provided, an OTP is sent to the matching channel
}

// The client response interceptor converts snake_case -> camelCase, so the
// runtime shape here is camelCase.
interface AuthResponse {
  userId: string;
  phone: string;
  email: string;
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  profilePicture?: string;
  role: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  };
}

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  karma: number;
  subscriptionTier: 'free' | 'basic' | 'premium';
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth Service
 */
export const authService = {
  /**
   * Register new user
   * Sends OTP to email
   * Optionally accepts password for dual auth
   */
  async register(data: RegisterDto): Promise<{ message: string; reference: string; expires_at: string }> {
    // Transform camelCase to snake_case for backend (email optional)
    const payload = {
      phone: data.phone,
      email: data.email || undefined,
      password: data.password,
      first_name: data.firstName,
      middle_name: data.middleName,
      last_name: data.lastName,
    };
    const response: AxiosResponse = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  /**
   * Verify OTP code
   * Returns access + refresh tokens
   */
  async verifyOtp(data: VerifyOtpDto): Promise<AuthResponse> {
    const payload = {
      phone: data.phone,
      email: data.email,
      code: data.code, // Backend expects 'code' field
    };
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/verify-otp', payload);

    console.log('[AuthService] OTP verification response:', {
      hasTokens: !!response.data.tokens,
      hasAccessToken: !!response.data.tokens?.accessToken,
      hasRefreshToken: !!response.data.tokens?.refreshToken,
    });

    // Store tokens (backend returns tokens nested in 'tokens' object)
    // Note: response.data is already transformed to camelCase by client interceptor
    await TokenManager.setAccessToken(response.data.tokens.accessToken);
    await TokenManager.setRefreshToken(response.data.tokens.refreshToken);

    // Verify tokens were saved
    const savedAccessToken = await TokenManager.getAccessToken();
    const savedRefreshToken = await TokenManager.getRefreshToken();
    console.log('[AuthService] Tokens saved:', {
      hasAccessToken: !!savedAccessToken,
      hasRefreshToken: !!savedRefreshToken,
    });

    // Store a basic user immediately so there's always a session, then upgrade
    // it with the REAL profile (subscription tier etc.) — don't assume 'free',
    // which would throttle a premium user until the next fetch.
    const user: User = {
      id: response.data.userId,
      email: response.data.email,
      phone: response.data.phone,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      avatarUrl: response.data.profilePicture,
      karma: 0,
      subscriptionTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await TokenManager.setUserData(user);

    try {
      await authService.getCurrentUser();
    } catch {
      // Non-fatal — a later getCurrentUser / restoreSession will hydrate it.
    }

    return response.data;
  },

  /**
   * Login with email
   * If password provided: direct login
   * If no password: sends OTP to email
   */
  async login(data: LoginDto): Promise<AuthResponse | { message: string; reference: string; expires_at: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/login', data);

    // If password was provided and login successful, response includes tokens
    if (response.data.tokens) {
      // Store tokens (already transformed to camelCase by client interceptor)
      await TokenManager.setAccessToken(response.data.tokens.accessToken);
      await TokenManager.setRefreshToken(response.data.tokens.refreshToken);

      // Transform and store user data
      // Note: response.data is already transformed to camelCase by client interceptor
      const user: User = {
        id: response.data.userId,
        email: response.data.email,
        phone: response.data.phone,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        avatarUrl: response.data.profilePicture,
        karma: 0,
        subscriptionTier: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await TokenManager.setUserData(user);

      // Upgrade to the real profile (tier etc.) instead of assuming 'free'.
      try {
        await authService.getCurrentUser();
      } catch {
        // Non-fatal — a later getCurrentUser / restoreSession will hydrate it.
      }
    }

    return response.data;
  },

  /**
   * Logout
   * Clears tokens and user data
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint (if available on backend)
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with local cleanup even if API call fails
      console.log('[Auth] Logout API call failed, continuing with local cleanup');
    } finally {
      // Clear tokens and user data
      await TokenManager.clearTokens();
      await TokenManager.clearUserData();
    }
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<any> = await apiClient.get('/auth/me');

    // Transform backend response to mobile User interface
    // Note: response.data is already transformed to camelCase by client interceptor
    const user: User = {
      id: response.data.id,
      email: response.data.email,
      phone: response.data.phone,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      avatarUrl: response.data.profilePicture,
      bio: response.data.bio,
      karma: 0, // TODO: Add karma field to backend
      subscriptionTier: response.data.subscriptionTier || 'free',
      location: response.data.location,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
    };

    // Update stored user data
    await TokenManager.setUserData(user);

    return user;
  },

  /**
   * Refresh access token
   * Note: This is automatically called by the axios interceptor
   */
  async refreshToken(): Promise<{ access_token: string; refresh_token?: string }> {
    const refreshToken = await TokenManager.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response: AxiosResponse = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    // Store new tokens (already transformed to camelCase by client interceptor)
    await TokenManager.setAccessToken(response.data.accessToken);
    if (response.data.refreshToken) {
      await TokenManager.setRefreshToken(response.data.refreshToken);
    }

    return response.data;
  },

  /**
   * Resend OTP
   */
  async resendOtp(identifier: string): Promise<{ message: string; reference: string; expires_at: string }> {
    const body = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    const response: AxiosResponse = await apiClient.post('/auth/resend-otp', body);
    return response.data;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string; reference: string; expires_at: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  async resetPassword(data: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },
};

export type { RegisterDto, VerifyOtpDto, LoginDto, AuthResponse, User };
