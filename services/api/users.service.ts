/**
 * Users Service
 *
 * Handles user profile and settings API calls.
 *
 * Features:
 * - Get/update user profile
 * - Update location
 * - Upload avatar
 * - Find nearby users
 * - View user ratings
 * - Update subscription
 */

import apiClient from './client';
import { AxiosResponse } from 'axios';
import { Rating } from './exchanges.service';

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
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
}

interface UpdateLocationDto {
  latitude: number;
  longitude: number;
}

interface NearbyUser extends User {
  distance: number; // in meters
}

/**
 * Users Service
 */
export const usersService = {
  /**
   * Get current user profile
   */
  async getMyProfile(): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileDto): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.patch('/users/me', data);
    return response.data;
  },

  /**
   * Update user location
   */
  async updateLocation(data: UpdateLocationDto): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.patch('/users/me/location', data);
    return response.data;
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(file: {
    uri: string;
    type: string;
    name: string;
  }): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file as any);

    const response: AxiosResponse<{ url: string }> = await apiClient.post(
      '/users/me/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  /**
   * Delete current user account
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  },

  /**
   * Find nearby users
   */
  async findNearbyUsers(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000, // 5km default
    limit: number = 50,
  ): Promise<NearbyUser[]> {
    const response: AxiosResponse<NearbyUser[]> = await apiClient.get('/users/nearby', {
      params: {
        latitude,
        longitude,
        radiusMeters,
        limit,
      },
    });
    return response.data;
  },

  /**
   * Get user's ratings (received)
   */
  async getUserRatings(userId: string): Promise<Rating[]> {
    const response: AxiosResponse<Rating[]> = await apiClient.get(`/users/${userId}/ratings`);
    return response.data;
  },

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalListings: number;
    activeListings: number;
    completedExchanges: number;
    averageRating: number;
    totalRatings: number;
    karma: number;
  }> {
    const response: AxiosResponse = await apiClient.get(`/users/${userId}/stats`);
    return response.data;
  },

  /**
   * Update subscription tier
   */
  async updateSubscription(tier: 'free' | 'basic' | 'premium'): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.patch('/users/me/subscription', {
      tier,
    });
    return response.data;
  },

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(): Promise<{
    tier: 'free' | 'basic' | 'premium';
    maxListings: number;
    currentListings: number;
    expiresAt?: string;
  }> {
    const response: AxiosResponse = await apiClient.get('/users/me/subscription');
    return response.data;
  },
};

export type { User, UpdateProfileDto, UpdateLocationDto, NearbyUser };
