/**
 * Meetup Spots Service
 *
 * API service for searching and managing meetup spots
 */

import apiClient from './client';

export interface MeetupSpot {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  region?: string;
  location: string; // PostGIS POINT
  category: 'mall' | 'library' | 'cafe' | 'park' | 'university' | 'metro_station' | 'community_center' | 'bookstore' | 'other';
  opening_time?: string;
  closing_time?: string;
  operating_hours?: string;
  is_active: boolean;
  is_featured: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface MeetupSpotsResponse {
  data: MeetupSpot[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface SearchMeetupSpotsParams {
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  city?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

const meetupSpotsService = {
  /**
   * Search meetup spots with location-based filtering
   */
  async search(params: SearchMeetupSpotsParams): Promise<MeetupSpotsResponse> {
    const response = await apiClient.get('/meetup-spots/search', { params });
    return response.data;
  },

  /**
   * Get featured meetup spots
   */
  async getFeatured(limit = 10): Promise<{ data: MeetupSpot[] }> {
    const response = await apiClient.get('/meetup-spots/featured', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get popular meetup spots by usage count
   */
  async getPopular(city?: string, limit = 10): Promise<{ data: MeetupSpot[] }> {
    const response = await apiClient.get('/meetup-spots/popular', {
      params: { city, limit },
    });
    return response.data;
  },

  /**
   * Get meetup spots by city
   */
  async getByCity(city: string, limit = 20): Promise<{ data: MeetupSpot[] }> {
    const response = await apiClient.get(`/meetup-spots/city/${city}`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get a single meetup spot by ID
   */
  async getById(id: string): Promise<MeetupSpot> {
    const response = await apiClient.get(`/meetup-spots/${id}`);
    return response.data;
  },

  /**
   * Increment usage count when a meetup spot is selected
   */
  async incrementUsage(id: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/meetup-spots/${id}/increment-usage`);
    return response.data;
  },
};

export default meetupSpotsService;
