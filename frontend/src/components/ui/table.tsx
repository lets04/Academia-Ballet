import { cn } from '@/lib/utils';
import React from 'react';

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      'bg-white dark:bg-slate-800',
      'border-slate-200 dark:border-slate-700'
    )}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className={cn(
              'border-b',
              'bg-slate-50 dark:bg-slate-700',
              'border-slate-200 dark:border-slate-600'
            )}>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-6 py-3 text-left',
                    'font-semibold text-sm',
                    'text-slate-900 dark:text-slate-50',
                    column.width
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <div className={cn(
                    'text-slate-500 dark:text-slate-400'
                  )}>
                    Cargando...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <div className={cn(
                    'text-slate-500 dark:text-slate-400'
                  )}>
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b',
                    'border-slate-200 dark:border-slate-700',
                    'text-slate-900 dark:text-slate-50',
                    onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={`${row.id}-${String(column.key)}`}
                      className={cn(
                        'px-6 py-4 text-sm',
                        column.width
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
