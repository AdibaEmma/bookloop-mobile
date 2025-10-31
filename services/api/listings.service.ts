/**
 * Listings Service
 *
 * Handles book listings API calls.
 *
 * Features:
 * - Search listings (location-based, text, hybrid)
 * - Create/update/delete listings
 * - Get user's listings
 * - Mark as exchanged/unavailable
 * - Photo upload
 */

import apiClient from './client';
import { AxiosResponse } from 'axios';
import { Book } from './books.service';

interface Listing {
  id: string;
  bookId: string;
  book: Book;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    karma: number;
  };
  listingType: 'exchange' | 'donate' | 'borrow';
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  description?: string;
  photos?: string[];
  status: 'available' | 'pending' | 'exchanged' | 'unavailable';
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  distance?: number; // in meters (only in search results)
  createdAt: string;
  updatedAt: string;
}

interface SearchListingDto {
  // Text search
  query?: string;

  // Location search
  latitude?: number;
  longitude?: number;
  radiusMeters?: number; // radius in meters (backend expects this name)

  // Filters
  listingType?: 'exchange' | 'donate' | 'borrow';
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  genre?: string;

  // Pagination
  limit?: number;
  offset?: number;
}

interface CreateListingDto {
  bookId: string;
  listingType: 'exchange' | 'donate' | 'borrow';
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  description?: string;
  photos?: string[];
}

interface UpdateListingDto {
  listingType?: 'exchange' | 'donate' | 'borrow';
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  description?: string;
  photos?: string[];
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Listings Service
 */
export const listingsService = {
  /**
   * Search listings
   * Supports location-based, text-based, and hybrid search
   */
  async searchListings(params: SearchListingDto): Promise<PaginatedResponse<Listing>> {
    const response: AxiosResponse<PaginatedResponse<Listing>> = await apiClient.get(
      '/listings/search',
      { params },
    );
    return response.data;
  },

  /**
   * Get nearby listings (location-based)
   */
  async getNearbyListings(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000, // 5km default
    limit: number = 20,
  ): Promise<PaginatedResponse<Listing>> {
    return this.searchListings({
      latitude,
      longitude,
      radiusMeters,
      limit,
    });
  },

  /**
   * Get listing by ID
   */
  async getListingById(id: string): Promise<Listing> {
    const response: AxiosResponse<Listing> = await apiClient.get(`/listings/${id}`);
    return response.data;
  },

  /**
   * Get current user's listings
   */
  async getMyListings(status?: 'available' | 'pending' | 'exchanged' | 'unavailable'): Promise<Listing[]> {
    const response: AxiosResponse<Listing[]> = await apiClient.get('/listings/user/me', {
      params: { status },
    });
    return response.data;
  },

  /**
   * Get listings by user ID
   */
  async getUserListings(userId: string): Promise<Listing[]> {
    const response: AxiosResponse<Listing[]> = await apiClient.get(`/listings/user/${userId}`);
    return response.data;
  },

  /**
   * Create new listing
   */
  async createListing(data: CreateListingDto): Promise<Listing> {
    const response: AxiosResponse<Listing> = await apiClient.post('/listings', data);
    return response.data;
  },

  /**
   * Update listing
   */
  async updateListing(id: string, data: UpdateListingDto): Promise<Listing> {
    const response: AxiosResponse<Listing> = await apiClient.patch(`/listings/${id}`, data);
    return response.data;
  },

  /**
   * Delete listing
   */
  async deleteListing(id: string): Promise<void> {
    await apiClient.delete(`/listings/${id}`);
  },

  /**
   * Mark listing as exchanged
   */
  async markAsExchanged(id: string): Promise<Listing> {
    const response: AxiosResponse<Listing> = await apiClient.patch(`/listings/${id}/mark-exchanged`);
    return response.data;
  },

  /**
   * Mark listing as unavailable
   */
  async markAsUnavailable(id: string): Promise<Listing> {
    const response: AxiosResponse<Listing> = await apiClient.patch(`/listings/${id}/mark-unavailable`);
    return response.data;
  },

  /**
   * Reactivate listing
   */
  async reactivateListing(id: string): Promise<Listing> {
    const response: AxiosResponse<Listing> = await apiClient.patch(`/listings/${id}/reactivate`);
    return response.data;
  },

  /**
   * Upload listing photo
   */
  async uploadPhoto(file: {
    uri: string;
    type: string;
    name: string;
  }): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file as any);

    const response: AxiosResponse<{ url: string }> = await apiClient.post(
      '/listings/upload-photo',
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
   * Get user's listing count by subscription tier
   */
  async getListingStats(): Promise<{
    activeListings: number;
    maxListings: number;
    subscriptionTier: 'free' | 'basic' | 'premium';
  }> {
    const response: AxiosResponse = await apiClient.get('/listings/stats');
    return response.data;
  },
};

export type {
  Listing,
  SearchListingDto,
  CreateListingDto,
  UpdateListingDto,
  PaginatedResponse,
};
