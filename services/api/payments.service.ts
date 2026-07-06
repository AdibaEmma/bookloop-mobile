/**
 * Payments Service
 *
 * API service for payments and subscriptions
 */

import apiClient from './client';

// NOTE: response shapes are camelCase because the API client interceptor
// camelCases every response key. Request bodies below stay snake_case (there is
// no request transform; the backend DTOs expect snake_case).
export interface Payment {
  id: string;
  userId: string;
  exchangeId?: string;
  subscriptionId?: string;
  purpose: 'subscription' | 'exchange' | 'other';
  amount: number;
  method: 'card' | 'momo' | 'both';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
  reference: string;
  provider: 'paystack' | 'hubtel';
  providerReference?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'basic' | 'premium';
  startsAt: string;
  expiresAt: string;
  autoRenew: boolean;
  activeListingsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  tier: 'free' | 'basic' | 'premium';
  name: string;
  price: number;
  limits: {
    listings: number; // -1 = unlimited
    radius: number;
  };
  features: string[];
}

export interface PaymentsResponse {
  data: Payment[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface InitializePaymentRequest {
  amount: number;
  method: 'card' | 'momo' | 'both';
  purpose: 'subscription' | 'exchange' | 'other';
  exchange_id?: string;
  subscription_id?: string;
}

export interface InitializePaymentResponse {
  paymentId: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyPaymentRequest {
  reference: string;
}

export interface VerifyPaymentResponse {
  status: string;
  message: string;
  payment: Payment;
}

export interface UpgradeSubscriptionRequest {
  tier: 'basic' | 'premium';
  payment_reference: string;
}

const paymentsService = {
  /**
   * Initialize payment with Paystack
   */
  async initializePayment(data: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    const response = await apiClient.post('/payments/initialize', data);
    return response.data;
  },

  /**
   * Verify payment status
   */
  async verifyPayment(data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const response = await apiClient.post('/payments/verify', data);
    return response.data;
  },

  /**
   * Get user payment history
   */
  async getPayments(limit = 20, offset = 0): Promise<PaymentsResponse> {
    const response = await apiClient.get('/payments', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string): Promise<Payment> {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  /**
   * Get current subscription
   */
  async getCurrentSubscription(): Promise<Subscription> {
    const response = await apiClient.get('/payments/subscriptions/me');
    return response.data;
  },

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiClient.get('/payments/subscriptions/plans');
    return response.data;
  },

  /**
   * Upgrade subscription tier
   */
  async upgradeSubscription(data: UpgradeSubscriptionRequest): Promise<Subscription> {
    const response = await apiClient.post('/payments/subscriptions/upgrade', data);
    return response.data;
  },

  /**
   * Cancel subscription (downgrade to free)
   */
  async cancelSubscription(): Promise<{ message: string; subscription: Subscription }> {
    const response = await apiClient.post('/payments/subscriptions/cancel');
    return response.data;
  },
};

export default paymentsService;
