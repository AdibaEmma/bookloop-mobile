/**
 * Notifications Service
 *
 * API service for managing notifications and device registration
 */

import apiClient from './client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface RegisterDeviceRequest {
  fcm_token: string;
  device_type: 'ios' | 'android' | 'web';
  device_name?: string;
}

const notificationsService = {
  /**
   * Register device for push notifications
   */
  async registerDevice(data: RegisterDeviceRequest): Promise<{ message: string; device_id: string }> {
    const response = await apiClient.post('/notifications/register-device', data);
    return response.data;
  },

  /**
   * Unregister device from push notifications
   */
  async unregisterDevice(fcmToken: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/notifications/unregister-device/${fcmToken}`);
    return response.data;
  },

  /**
   * Get user notifications with pagination
   */
  async getNotifications(limit = 20, offset = 0): Promise<NotificationResponse> {
    const response = await apiClient.get('/notifications', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string }> {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Delete all read notifications
   */
  async deleteReadNotifications(): Promise<{ message: string; count: number }> {
    const response = await apiClient.delete('/notifications/read/all');
    return response.data;
  },
};

export default notificationsService;
