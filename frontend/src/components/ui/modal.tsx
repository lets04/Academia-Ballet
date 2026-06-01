import { cn } from '@/lib/utils';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full max-w-2xl rounded-lg shadow-lg',
            'bg-white dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700',
            'animate-in fade-in zoom-in-95'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between p-6',
            'border-b border-slate-200 dark:border-slate-700'
          )}>
            <h2 className={cn(
              'text-lg font-bold',
              'text-slate-900 dark:text-slate-50'
            )}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                'p-1 rounded-lg',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'text-slate-600 dark:text-slate-400'
              )}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={cn(
              'flex items-center justify-end gap-3 p-6',
              'border-t border-slate-200 dark:border-slate-700'
            )}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
