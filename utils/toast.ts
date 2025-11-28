/**
 * Toast Utility
 *
 * Wrapper around custom BookLoop Alert system for consistent notifications
 */

import {
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
  showInfoAlert,
} from '@/components/ui/AlertManager';

export interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

/**
 * Show success toast
 */
export const showSuccessToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  showSuccessAlert(
    config.message,
    config.title,
    {
      duration: config.duration || 3000,
      position: config.position || 'top',
    }
  );
};

/**
 * Show error toast
 */
export const showErrorToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  showErrorAlert(
    config.message,
    config.title,
    {
      duration: config.duration || 4000,
      position: config.position || 'top',
    }
  );
};

/**
 * Show info toast
 */
export const showInfoToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  showInfoAlert(
    config.message,
    config.title,
    {
      duration: config.duration || 3000,
      position: config.position || 'top',
    }
  );
};

/**
 * Show warning toast
 */
export const showWarningToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  showWarningAlert(
    config.message,
    config.title,
    {
      duration: config.duration || 3500,
      position: config.position || 'top',
    }
  );
};

/**
 * Hide all toasts (deprecated - alerts auto-hide)
 */
export const hideToast = (): void => {
  // Alerts auto-hide, this is kept for compatibility
};
