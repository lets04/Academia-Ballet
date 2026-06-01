import { cn } from '@/lib/utils';
import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className={cn(
            'block text-sm font-medium',
            'text-slate-900 dark:text-slate-100'
          )}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 rounded-lg border',
            'bg-slate-50 dark:bg-slate-700',
            'border-slate-300 dark:border-slate-600',
            'text-slate-900 dark:text-slate-50',
            'placeholder-slate-400 dark:placeholder-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-fuchsia-500',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className={cn(
            'text-sm',
            'text-red-600 dark:text-red-400'
          )}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className={cn(
            'text-sm',
            'text-slate-500 dark:text-slate-400'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
