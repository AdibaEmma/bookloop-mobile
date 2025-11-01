/**
 * Toast Utility
 *
 * Wrapper around react-native-toast-message for consistent toast notifications
 */

import Toast from 'react-native-toast-message';

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

  Toast.show({
    type: 'success',
    text1: config.title || 'Success',
    text2: config.message,
    visibilityTime: config.duration || 3000,
    position: config.position || 'top',
  });
};

/**
 * Show error toast
 */
export const showErrorToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  Toast.show({
    type: 'error',
    text1: config.title || 'Error',
    text2: config.message,
    visibilityTime: config.duration || 4000,
    position: config.position || 'top',
  });
};

/**
 * Show info toast
 */
export const showInfoToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  Toast.show({
    type: 'info',
    text1: config.title || 'Info',
    text2: config.message,
    visibilityTime: config.duration || 3000,
    position: config.position || 'top',
  });
};

/**
 * Show warning toast
 */
export const showWarningToast = (options: ToastOptions | string): void => {
  const config = typeof options === 'string'
    ? { message: options }
    : options;

  Toast.show({
    type: 'error',
    text1: config.title || 'Warning',
    text2: config.message,
    visibilityTime: config.duration || 3500,
    position: config.position || 'top',
  });
};

/**
 * Hide all toasts
 */
export const hideToast = (): void => {
  Toast.hide();
};
