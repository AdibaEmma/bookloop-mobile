/**
 * AuthContext
 *
 * Global authentication state management using React Context.
 *
 * Features:
 * - User authentication state
 * - OTP-based login/register
 * - Token management
 * - Loading states
 * - Auto-restore session on app launch
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, TokenManager, User } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string) => Promise<void>;
  register: (phone: string, firstName: string, lastName: string, email?: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  /**
   * Restore session on app launch
   */
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);

      // Check if tokens exist
      const accessToken = await TokenManager.getAccessToken();
      const storedUser = await TokenManager.getUserData();

      if (accessToken && storedUser) {
        // Try to fetch current user to validate token
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          // Token might be expired, try to refresh
          try {
            await authService.refreshToken();
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
          } catch (refreshErr) {
            // Refresh failed, clear session
            await TokenManager.clearTokens();
            await TokenManager.clearUserData();
            setUser(null);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to restore session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user (OTP-based, no password)
   * Sends OTP to phone number
   */
  const register = async (
    phone: string,
    firstName: string,
    lastName: string,
    email?: string,
  ) => {
    try {
      setError(null);
      setIsLoading(true);

      await authService.register({
        phone,
        firstName,
        lastName,
        email,
      });

      // OTP sent, user needs to verify
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify OTP code
   * Completes registration or login
   */
  const verifyOtp = async (phone: string, code: string) => {
    try {
      setError(null);
      setIsLoading(true);

      await authService.verifyOtp({ phone, code });

      // Get the user data from storage (auth service already stored it)
      const userData = await TokenManager.getUserData();
      setUser(userData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'OTP verification failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with phone (OTP-based, no password)
   * Sends OTP to phone number
   */
  const login = async (phone: string) => {
    try {
      setError(null);
      setIsLoading(true);

      await authService.login({ phone });
      // OTP sent, user needs to verify
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setError(null);
      setIsLoading(true);

      await authService.logout();
      setUser(null);
    } catch (err: any) {
      console.error('[AuthContext] Logout error:', err);
      // Clear user even if API call fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh current user data
   */
  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('[AuthContext] Failed to refresh user:', err);
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    verifyOtp,
    logout,
    refreshUser,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * Access authentication context in components.
 *
 * Usage:
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAuth();
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
