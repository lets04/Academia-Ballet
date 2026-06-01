import React, { createContext, useContext } from 'react';
import type { Notification } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  add: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => string;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export { NotificationContext };
