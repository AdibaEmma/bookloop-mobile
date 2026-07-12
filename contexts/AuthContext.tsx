/**
 * AuthContext
 *
 * Global authentication state management using React Context.
 *
 * Features:
 * - User authentication state
 * - Email + Password OR Email + OTP login
 * - Token management
 * - Loading states
 * - Auto-restore session on app launch
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, TokenManager, User } from '@/services/api';
import biometricService from '@/services/biometric.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password?: string) => Promise<{ message?: string; reference?: string; expires_at?: string }>;
  biometricLogin: (token: string) => Promise<void>;
  register: (phone: string, firstName: string, lastName: string, email?: string, password?: string) => Promise<void>;
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
        // Validate the token. The API client already handles 401 → refresh
        // transparently, so we just need to react to the outcome here.
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (err: any) {
          const status = err?.response?.status;
          // A rejected refresh surfaces as a tagged Error (no `.response`), so
          // check the marker as well as the status.
          if (err?.sessionExpired || status === 401 || status === 403) {
            // Genuine auth failure (refresh token rejected) → sign out.
            await TokenManager.clearTokens();
            await TokenManager.clearUserData();
            setUser(null);
          } else {
            // Transient (network/server restart) — DON'T log out. Trust the
            // stored session and let later requests recover.
            console.warn('[AuthContext] Could not reach API on launch; keeping stored session');
            setUser(storedUser);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to restore session:', err);
      // Don't nuke a stored session on an unexpected local error.
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   * Sends OTP to email for verification
   * Optionally accepts password for dual auth
   */
  const register = async (
    phone: string,
    firstName: string,
    lastName: string,
    email?: string,
    password?: string,
  ) => {
    try {
      setError(null);
      setIsLoading(true);

      await authService.register({
        phone,
        email,
        password,
        firstName,
        lastName,
      });

      // OTP sent by SMS to the phone, user needs to verify
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
  const verifyOtp = async (identifier: string, code: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const payload = identifier.includes('@')
        ? { email: identifier, code }
        : { phone: identifier, code };
      await authService.verifyOtp(payload);

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
   * Login with email
   * If password provided: direct login
   * If no password: sends OTP to email
   */
  const login = async (identifier: string, password?: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const creds = identifier.includes('@')
        ? { email: identifier, password }
        : { phone: identifier, password };
      const response = await authService.login(creds);

      // If password was provided and login successful, user data is already set
      if ('tokens' in response) {
        const userData = await TokenManager.getUserData();
        setUser(userData);
        return {};
      }
      // Otherwise, OTP was sent and user needs to verify
      return {
        message: response.message,
        reference: response.reference,
        expires_at: response.expires_at,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Biometric login using stored token
   */
  const biometricLogin = async (storedRefreshToken: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // The stored credential is a REFRESH token — exchange it for a fresh
      // session (access tokens expire within minutes of being stored).
      // TokenManager.setRefreshToken syncs each rotation back into the
      // biometric credential, so the next scan always has a live token.
      await TokenManager.setRefreshToken(storedRefreshToken);
      await authService.refreshToken();

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      await TokenManager.clearTokens();
      // A rejected refresh means the saved session is gone (revoked or >7d
      // old) — drop the stale credential so the user re-enrolls cleanly.
      if (err.response?.status === 401) {
        await biometricService.disableBiometric();
        const msg = 'Your saved session has expired. Log in once, then re-enable biometric login.';
        setError(msg);
        throw new Error(msg);
      }
      const errorMessage = err.response?.data?.message || 'Biometric login failed';
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

      // Server logout revokes the refresh token — the same token biometric
      // re-login depends on. With biometric enabled, sign out locally only;
      // turning biometric off (or logging out without it) fully revokes.
      if (await biometricService.isBiometricEnabled()) {
        await TokenManager.clearTokens();
        await TokenManager.clearUserData();
      } else {
        await authService.logout();
      }
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
    biometricLogin,
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
