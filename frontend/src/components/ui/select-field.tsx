import { cn } from '@/lib/utils';
import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
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
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2 rounded-lg border',
            'bg-slate-50 dark:bg-slate-700',
            'border-slate-300 dark:border-slate-600',
            'text-slate-900 dark:text-slate-50',
            'focus:outline-none focus:ring-2 focus:ring-fuchsia-500',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className={cn(
            'text-sm',
            'text-red-600 dark:text-red-400'
          )}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
