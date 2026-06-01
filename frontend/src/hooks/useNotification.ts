import { useState, useCallback } from 'react';
import type { Notification } from '@/types';

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const add = useCallback((
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = { id, type, message, duration };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    return add(message, 'success', duration);
  }, [add]);

  const error = useCallback((message: string, duration?: number) => {
    return add(message, 'error', duration);
  }, [add]);

  const warning = useCallback((message: string, duration?: number) => {
    return add(message, 'warning', duration);
  }, [add]);

  const info = useCallback((message: string, duration?: number) => {
    return add(message, 'info', duration);
  }, [add]);

  return { notifications, add, remove, success, error, warning, info };
};
