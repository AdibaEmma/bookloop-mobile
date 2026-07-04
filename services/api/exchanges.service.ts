/**
 * Exchanges Service
 *
 * Handles book exchange API calls.
 *
 * Features:
 * - Create exchange requests
 * - Accept/decline exchanges
 * - Set meetup details
 * - Mark as completed
 * - Cancel exchanges
 * - Rate exchanges
 * - View exchange history
 */

import apiClient from './client';
import { AxiosResponse } from 'axios';
import { Listing } from './listings.service';

interface ExchangeUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  rating?: number;
}

interface Exchange {
  id: string;
  listing_id: string;
  listing?: Listing;
  offered_listing_id?: string;
  offered_listing?: Listing;
  requester_id: string;
  requester?: ExchangeUser;
  owner_id: string;
  owner?: ExchangeUser;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  requester_message?: string;
  owner_response?: string;
  // Meetup details
  meetup_spot_id?: string;
  meetup_spot_name?: string;
  meetup_location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  } | string; // Can be WKT string or GeoJSON object
  meetup_address?: string;
  meetup_time?: string;
  // Confirmation flags
  requester_confirmed_meetup: boolean;
  owner_confirmed_meetup: boolean;
  requester_confirmed_completion: boolean;
  owner_confirmed_completion: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface Rating {
  id: string;
  exchange_id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number; // 1-5
  review?: string;
  is_visible: boolean;
  created_at: string;
}

interface ProposedMeetup {
  meetup_spot_id?: string;
  latitude: number;
  longitude: number;
  address: string;
  location_name?: string;
}

interface CreateExchangeDto {
  listing_id: string;
  offered_listing_id?: string;
  message?: string;
  proposed_meetup?: ProposedMeetup;
  proposed_meetup_time?: string; // ISO date string
}

interface RespondExchangeDto {
  accept: boolean;
  message?: string;
}

interface SetMeetupDto {
  meetup_spot_id?: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  address: string;
  meetup_time: string; // ISO date string
}

interface CreateRatingDto {
  rating: number; // 1-5
  review?: string;
}

/**
 * Exchanges Service
 */
export const exchangesService = {
  /**
   * Create exchange request
   */
  async createExchange(data: CreateExchangeDto): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post('/exchanges', data);
    return response.data;
  },

  /**
   * Get exchange by ID
   */
  async getExchangeById(id: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.get(`/exchanges/${id}`);
    return response.data;
  },

  /**
   * Get current user's exchange requests (as requester)
   */
  async getMyRequests(status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'): Promise<Exchange[]> {
    const response: AxiosResponse<Exchange[]> = await apiClient.get('/exchanges/my-requests', {
      params: { status },
    });
    return response.data;
  },

  /**
   * Get incoming exchange requests (as owner)
   */
  async getIncomingRequests(status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'): Promise<Exchange[]> {
    const response: AxiosResponse<Exchange[]> = await apiClient.get('/exchanges/incoming', {
      params: { status },
    });
    return response.data;
  },

  /**
   * Get all user's exchanges (both as requester and owner)
   */
  async getAllExchanges(status?: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'): Promise<Exchange[]> {
    const response: AxiosResponse<Exchange[]> = await apiClient.get('/exchanges', {
      params: { status },
    });
    return response.data;
  },

  /**
   * Accept exchange request
   */
  async acceptExchange(id: string, message?: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/accept`, {
      message,
    });
    return response.data;
  },

  /**
   * Decline exchange request
   */
  async declineExchange(id: string, message?: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/decline`, {
      message,
    });
    return response.data;
  },

  /**
   * Set meetup details
   */
  async setMeetup(id: string, data: SetMeetupDto): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/meetup`, data);
    return response.data;
  },

  /**
   * Confirm meetup details (both parties must confirm)
   */
  async confirmMeetup(id: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/confirm-meetup`);
    return response.data;
  },

  /**
   * Confirm completion (both parties must confirm to complete)
   */
  async confirmCompletion(id: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/confirm-completion`);
    return response.data;
  },

  /**
   * Mark exchange as completed (legacy - use confirmCompletion instead)
   */
  async completeExchange(id: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/confirm-completion`);
    return response.data;
  },

  /**
   * Cancel exchange
   */
  async cancelExchange(id: string, message?: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(`/exchanges/${id}/cancel`, {
      message,
    });
    return response.data;
  },

  /**
   * Rate exchange partner
   */
  async rateExchange(exchangeId: string, data: CreateRatingDto): Promise<Rating> {
    const response: AxiosResponse<Rating> = await apiClient.post(
      `/exchanges/${exchangeId}/rate`,
      data,
    );
    return response.data;
  },

  /**
   * Get rating for an exchange
   */
  async getExchangeRating(exchangeId: string): Promise<Rating | null> {
    try {
      const response: AxiosResponse<Rating> = await apiClient.get(
        `/exchanges/${exchangeId}/rating`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get user's ratings (received)
   */
  async getUserRatings(userId: string): Promise<Rating[]> {
    const response: AxiosResponse<Rating[]> = await apiClient.get(`/users/${userId}/ratings`);
    return response.data;
  },

  /**
   * Get exchange statistics for current user
   */
  async getExchangeStats(): Promise<{
    totalExchanges: number;
    completedExchanges: number;
    pendingRequests: number;
    incomingRequests: number;
    averageRating: number;
  }> {
    const response: AxiosResponse = await apiClient.get('/exchanges/stats');
    return response.data;
  },

  /**
   * Generate QR code for handover confirmation
   */
  async generateHandoverQR(exchangeId: string): Promise<{ code: string; expiresAt: string }> {
    const response: AxiosResponse<{ code: string; expiresAt: string }> = await apiClient.post(
      `/exchanges/${exchangeId}/generate-qr`
    );
    return response.data;
  },

  /**
   * Confirm handover by scanning QR code
   */
  async confirmHandover(exchangeId: string, qrCode: string): Promise<Exchange> {
    const response: AxiosResponse<Exchange> = await apiClient.post(
      `/exchanges/${exchangeId}/confirm-handover`,
      { qrCode }
    );
    return response.data;
  },
};

export type {
  Exchange,
  ExchangeUser,
  Rating,
  CreateExchangeDto,
  RespondExchangeDto,
  SetMeetupDto,
  CreateRatingDto,
};
