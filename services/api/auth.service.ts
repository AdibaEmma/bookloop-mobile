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
  lastName: string;
  password: string;
}

interface VerifyOtpDto {
  phone: string;
  otp: string;
}

interface LoginDto {
  phone: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
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
   */
  async register(data: RegisterDto): Promise<{ message: string }> {
    const response: AxiosResponse = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Verify OTP code
   * Returns access + refresh tokens
   */
  async verifyOtp(data: VerifyOtpDto): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/verify-otp', data);

    // Store tokens
    await TokenManager.setAccessToken(response.data.access_token);
    await TokenManager.setRefreshToken(response.data.refresh_token);
    await TokenManager.setUserData(response.data.user);

    return response.data;
  },

  /**
   * Login with phone + password
   */
  async login(data: LoginDto): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/login', data);

    // Store tokens
    await TokenManager.setAccessToken(response.data.access_token);
    await TokenManager.setRefreshToken(response.data.refresh_token);
    await TokenManager.setUserData(response.data.user);

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
    const response: AxiosResponse<User> = await apiClient.get('/auth/me');

    // Update stored user data
    await TokenManager.setUserData(response.data);

    return response.data;
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
