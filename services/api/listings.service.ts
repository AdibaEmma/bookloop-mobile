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
  status: 'draft' | 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled';
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  distance?: number; // in meters (only in search results)
  exchangePreferences?: ExchangePreference[]; // Books wanted in exchange
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
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  region: string;
  searchRadiusKm?: number;
  preferredGenres?: string[];
}

interface UpdateListingDto {
  listingType?: 'exchange' | 'donate' | 'borrow';
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  description?: string;
  photos?: string[];
  status?: 'draft' | 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled';
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

interface ExchangePreference {
  id: string;
  listingId: string;
  bookId: string;
  book: Book;
  priority: number;
  createdAt: string;
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
  async getMyListings(status?: 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled'): Promise<Listing[]> {
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
    // Transform camelCase to snake_case for backend
    const payload = {
      book_id: data.bookId,
      listing_type: data.listingType,
      book_condition: data.condition,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      city: data.city,
      region: data.region,
      search_radius_km: data.searchRadiusKm || 10,
      preferred_genres: data.preferredGenres || [],
    };

    const response: AxiosResponse<Listing> = await apiClient.post('/listings', payload);
    return response.data;
  },

  /**
   * Update listing
   */
  async updateListing(id: string, data: UpdateListingDto): Promise<Listing> {
    // Transform camelCase to snake_case for backend
    const payload: any = {};
    if (data.listingType) payload.listing_type = data.listingType;
    if (data.condition) payload.book_condition = data.condition;
    if (data.description !== undefined) payload.description = data.description;
    if (data.photos) payload.photos = data.photos;
    if (data.status) payload.status = data.status;

    const response: AxiosResponse<Listing> = await apiClient.patch(`/listings/${id}`, payload);
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
    return this.updateListing(id, { status: 'exchanged' });
  },

  /**
   * Mark listing as unavailable (set to draft)
   */
  async markAsUnavailable(id: string): Promise<Listing> {
    return this.updateListing(id, { status: 'draft' });
  },

  /**
   * Permanently cancel listing (cannot be changed again)
   */
  async cancelPermanently(id: string): Promise<Listing> {
    return this.updateListing(id, { status: 'cancelled' });
  },

  /**
   * Reactivate listing (mark as available)
   */
  async reactivateListing(id: string): Promise<Listing> {
    return this.updateListing(id, { status: 'available' });
  },

  /**
   * Upload listing images (after creating listing)
   */
  async uploadImages(
    listingId: string,
    files: Array<{ uri: string; type: string; name: string }>
  ): Promise<{ photos: string[] }> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file as any);
    });

    const response: AxiosResponse<{ photos: string[] }> = await apiClient.post(
      `/listings/${listingId}/images`,
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

  // ===== Exchange Preferences =====

  /**
   * Add exchange preference to listing
   */
  async addPreference(
    listingId: string,
    bookId: string,
    priority?: number,
  ): Promise<ExchangePreference> {
    const payload = {
      book_id: bookId,
      priority: priority || 1,
    };
    const response: AxiosResponse<ExchangePreference> = await apiClient.post(
      `/listings/${listingId}/preferences`,
      payload,
    );
    return response.data;
  },

  /**
   * Get all preferences for a listing
   */
  async getListingPreferences(listingId: string): Promise<ExchangePreference[]> {
    const response: AxiosResponse<ExchangePreference[]> = await apiClient.get(
      `/listings/${listingId}/preferences`,
    );
    return response.data;
  },

  /**
   * Remove preference
   */
  async removePreference(preferenceId: string): Promise<void> {
    await apiClient.delete(`/preferences/${preferenceId}`);
  },

  /**
   * Update preference priority
   */
  async updatePreferencePriority(
    preferenceId: string,
    priority: number,
  ): Promise<ExchangePreference> {
    const response: AxiosResponse<ExchangePreference> = await apiClient.patch(
      `/preferences/${preferenceId}/priority`,
      { priority },
    );
    return response.data;
  },

  /**
   * Clear all preferences for a listing
   */
  async clearPreferences(listingId: string): Promise<void> {
    await apiClient.delete(`/listings/${listingId}/preferences`);
  },
};

export type {
  Listing,
  SearchListingDto,
  CreateListingDto,
  UpdateListingDto,
  PaginatedResponse,
  ExchangePreference,
};
