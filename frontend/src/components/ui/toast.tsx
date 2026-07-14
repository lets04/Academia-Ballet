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
    success: 'bg-fuchsia-500/50 dark:bg-fuchsia-600/50',
    error: 'bg-red-500/50 dark:bg-red-600/50',
    warning: 'bg-amber-500/50 dark:bg-amber-600/50',
    info: 'bg-slate-500/50 dark:bg-slate-600/50',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white backdrop-blur-sm',
      'animate-in fade-in slide-in-from-right',
      typeStyles[notification.type]
    )}>
      <span className="flex-shrink-0 font-bold">
        {typeIcons[notification.type]}
      </span>
      <p className="flex-1 text-sm font-medium">
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
    <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none max-w-sm">
      {notifications.map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast notification={notification} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};
