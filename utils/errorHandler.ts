/**
 * Error Handler Utility
 *
 * Provides user-friendly error messages and toast notifications
 */

import { Alert } from 'react-native';
import { AxiosError } from 'axios';
import { showErrorToast, showSuccessToast, showInfoToast } from './toast';

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

/**
 * Extract user-friendly error message from API error
 */
export const getErrorMessage = (error: unknown): string => {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Axios error
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiError>;

    // Network error (no response)
    if (!axiosError.response) {
      return 'Network error. Please check your internet connection.';
    }

    const { status, data } = axiosError.response;

    // Handle specific status codes
    switch (status) {
      case 400:
        // Validation errors
        if (data?.errors) {
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]) => {
              const fieldName = field.replace(/_/g, ' ');
              return `${fieldName}: ${messages.join(', ')}`;
            })
            .join('\n');
          return errorMessages || data?.message || 'Invalid request. Please check your input.';
        }
        return data?.message || 'Invalid request. Please check your input.';

      case 401:
        return data?.message || 'Authentication failed. Please try again.';

      case 403:
        return 'You don\'t have permission to perform this action.';

      case 404:
        return data?.message || 'The requested resource was not found.';

      case 409:
        return data?.message || 'This action conflicts with existing data.';

      case 422:
        // Validation errors
        if (data?.errors) {
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]) => {
              const fieldName = field.replace(/_/g, ' ');
              return `${fieldName}: ${messages.join(', ')}`;
            })
            .join('\n');
          return errorMessages || data?.message || 'Validation failed. Please check your input.';
        }
        return data?.message || 'Validation failed. Please check your input.';

      case 429:
        return 'Too many requests. Please try again later.';

      case 500:
        return 'Server error. Please try again later.';

      case 503:
        return 'Service temporarily unavailable. Please try again later.';

      default:
        return data?.message || `Error: ${status}`;
    }
  }

  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

/**
 * Show error alert to user (uses Alert)
 */
export const showError = (error: unknown, title = 'Error'): void => {
  const message = getErrorMessage(error);
  Alert.alert(title, message);
};

/**
 * Show error toast to user
 */
export const showErrorToastMessage = (error: unknown, title = 'Error'): void => {
  const message = getErrorMessage(error);
  showErrorToast({ title, message });
};

/**
 * Show success alert to user (uses Alert)
 */
export const showSuccess = (message: string, title = 'Success'): void => {
  Alert.alert(title, message);
};

/**
 * Show success toast to user
 */
export const showSuccessToastMessage = (message: string, title = 'Success'): void => {
  showSuccessToast({ title, message });
};

/**
 * Show info alert to user (uses Alert)
 */
export const showInfo = (message: string, title = 'Info'): void => {
  Alert.alert(title, message);
};

/**
 * Show info toast to user
 */
export const showInfoToastMessage = (message: string, title = 'Info'): void => {
  showInfoToast({ title, message });
};

/**
 * Show confirmation dialog
 */
export const showConfirm = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  title = 'Confirm',
): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'OK',
        onPress: onConfirm,
      },
    ],
  );
};

/**
 * Handle async operation with error handling
 */
export const handleAsync = async <T>(
  operation: () => Promise<T>,
  options?: {
    onSuccess?: (result: T) => void;
    onError?: (error: unknown) => void;
    successMessage?: string;
    errorTitle?: string;
    showSuccessAlert?: boolean;
  },
): Promise<T | null> => {
  try {
    const result = await operation();

    if (options?.onSuccess) {
      options.onSuccess(result);
    }

    if (options?.successMessage && options?.showSuccessAlert !== false) {
      showSuccess(options.successMessage);
    }

    return result;
  } catch (error) {
    console.error('Async operation failed:', error);

    if (options?.onError) {
      options.onError(error);
    } else {
      showError(error, options?.errorTitle);
    }

    return null;
  }
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: Record<string, string[]>): string => {
  return Object.entries(errors)
    .map(([field, messages]) => {
      const fieldName = field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return `• ${fieldName}: ${messages.join(', ')}`;
    })
    .join('\n');
};
