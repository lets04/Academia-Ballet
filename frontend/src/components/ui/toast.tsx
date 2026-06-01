import { cn } from '@/lib/utils';
import type { Notification } from '@/types';
import React from 'react';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  React.useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const typeStyles = {
    success: 'bg-green-500 dark:bg-green-600',
    error: 'bg-red-500 dark:bg-red-600',
    warning: 'bg-yellow-500 dark:bg-yellow-600',
    info: 'bg-blue-500 dark:bg-blue-600',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white',
      'animate-in fade-in slide-in-from-top-5',
      typeStyles[notification.type]
    )}>
      <span className="flex-shrink-0 font-bold">
        {typeIcons[notification.type]}
      </span>
      <p className="flex-1">
        {notification.message}
      </p>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 hover:opacity-70"
      >
        ✕
      </button>
    </div>
  );
};

interface ToastContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onClose,
}) => {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none">
      {notifications.map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast notification={notification} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};
