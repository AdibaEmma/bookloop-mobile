/**
 * Auth Service
 *
 * Handles authentication API calls.
 *
 * Features:
 * - Phone-based registration with OTP
 * - OTP verification
 * - Login with phone + password
 * - Token refresh
 * - User profile retrieval
 * - Logout
 */

import apiClient, { TokenManager } from './client';
import { AxiosResponse } from 'axios';

interface RegisterDto {
  phone: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
}

interface VerifyOtpDto {
  phone: string;
  code: string; // Backend expects 'code' not 'otp'
}

interface LoginDto {
  phone: string; // Login is OTP-based, no password
}

interface AuthResponse {
  user_id: string;
  phone: string;
  full_name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  profile_picture?: string;
  role: string;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  email?: string;
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
   * Sends OTP to phone number
   * Note: Registration is OTP-based, no password required
   */
  async register(data: RegisterDto): Promise<{ message: string; reference: string; expires_at: string }> {
    // Transform camelCase to snake_case for backend
    const payload = {
      phone: data.phone,
      first_name: data.firstName,
      middle_name: data.middleName,
      last_name: data.lastName,
      email: data.email,
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
      code: data.code, // Backend expects 'code' field
    };
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/verify-otp', payload);

    console.log('[AuthService] OTP verification response:', {
      hasTokens: !!response.data.tokens,
      hasAccessToken: !!response.data.tokens?.access_token,
      hasRefreshToken: !!response.data.tokens?.refresh_token,
    });

    // Store tokens (backend returns tokens nested in 'tokens' object)
    await TokenManager.setAccessToken(response.data.tokens.access_token);
    await TokenManager.setRefreshToken(response.data.tokens.refresh_token);

    // Verify tokens were saved
    const savedAccessToken = await TokenManager.getAccessToken();
    const savedRefreshToken = await TokenManager.getRefreshToken();
    console.log('[AuthService] Tokens saved:', {
      hasAccessToken: !!savedAccessToken,
      hasRefreshToken: !!savedRefreshToken,
    });

    // Transform backend user data to match mobile User interface
    const user: User = {
      id: response.data.user_id,
      phone: response.data.phone,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      email: response.data.email,
      avatarUrl: response.data.profile_picture,
      karma: 0,
      subscriptionTier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await TokenManager.setUserData(user);

    return response.data;
  },

  /**
   * Login with phone (sends OTP)
   * Returns OTP reference
   */
  async login(data: LoginDto): Promise<{ message: string; reference: string; expires_at: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/login', data);
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
    const user: User = {
      id: response.data.id,
      phone: response.data.phone,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      email: response.data.email,
      avatarUrl: response.data.profile_picture,
      bio: response.data.bio,
      karma: 0, // TODO: Add karma field to backend
      subscriptionTier: response.data.subscription_tier || 'free',
      location: response.data.location,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
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

    // Store new tokens
    await TokenManager.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      await TokenManager.setRefreshToken(response.data.refresh_token);
    }

    return response.data;
  },

  /**
   * Resend OTP
   */
  async resendOtp(phone: string): Promise<{ message: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/resend-otp', { phone });
    return response.data;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(phone: string): Promise<{ message: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/forgot-password', { phone });
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  async resetPassword(data: {
    phone: string;
    otp: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },
};

export type { RegisterDto, VerifyOtpDto, LoginDto, AuthResponse, User };
