/**
 * Alert Manager Component
 *
 * Global alert manager that displays custom themed alerts.
 * Manages a queue of alerts and shows them one at a time.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, AlertConfig } from './Alert';

interface AlertItem extends AlertConfig {
  id: string;
}

let alertQueue: AlertItem[] = [];
let showAlertCallback: ((alert: AlertItem) => void) | null = null;

export const AlertManager: React.FC = () => {
  const [currentAlert, setCurrentAlert] = useState<AlertItem | null>(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef<AlertItem[]>([]);

  useEffect(() => {
    // Register callback for external access
    showAlertCallback = (alert: AlertItem) => {
      queueRef.current.push(alert);
      if (!currentAlert) {
        processQueue();
      }
    };

    return () => {
      showAlertCallback = null;
    };
  }, [currentAlert]);

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      return;
    }

    const nextAlert = queueRef.current.shift();
    if (nextAlert) {
      setCurrentAlert(nextAlert);
      setVisible(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Wait a bit before processing next alert for smooth transition
    setTimeout(() => {
      setCurrentAlert(null);
      processQueue();
    }, 100);
  }, [processQueue]);

  if (!currentAlert) {
    return null;
  }

  return (
    <Alert
      {...currentAlert}
      visible={visible}
      onDismiss={handleDismiss}
    />
  );
};

// Global functions to show alerts
let alertIdCounter = 0;

export const showAlert = (config: AlertConfig): void => {
  const alert: AlertItem = {
    ...config,
    id: `alert-${Date.now()}-${alertIdCounter++}`,
  };

  if (showAlertCallback) {
    showAlertCallback(alert);
  } else {
    // If manager not ready, queue it
    alertQueue.push(alert);
  }
};

export const showSuccessAlert = (
  message: string,
  title?: string,
  options?: Partial<AlertConfig>
): void => {
  showAlert({
    type: 'success',
    title: title || 'Success',
    message,
    ...options,
  });
};

export const showErrorAlert = (
  message: string,
  title?: string,
  options?: Partial<AlertConfig>
): void => {
  showAlert({
    type: 'error',
    title: title || 'Error',
    message,
    duration: options?.duration || 5000, // Errors show longer
    ...options,
  });
};

export const showWarningAlert = (
  message: string,
  title?: string,
  options?: Partial<AlertConfig>
): void => {
  showAlert({
    type: 'warning',
    title: title || 'Warning',
    message,
    ...options,
  });
};

export const showInfoAlert = (
  message: string,
  title?: string,
  options?: Partial<AlertConfig>
): void => {
  showAlert({
    type: 'info',
    title: title || 'Info',
    message,
    ...options,
  });
};
