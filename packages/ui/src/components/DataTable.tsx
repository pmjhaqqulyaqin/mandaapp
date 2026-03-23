import React from 'react';
import { cn } from '../utils/cn';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  compact?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  compact,
  className,
  ...props
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-auto rounded-xl border border-border-light dark:border-border-dark', className)} {...props}>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-text-secondary border-b border-border-light dark:border-border-dark">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className={cn(compact ? 'px-3 py-2 text-[11px] font-bold uppercase tracking-wider' : 'px-6 py-3 font-semibold uppercase tracking-wider', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark bg-white dark:bg-background-dark">
          {data.length > 0 ? (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="group hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={cn(compact ? 'px-3 py-2 text-xs truncate max-w-[200px]' : 'px-6 py-4 whitespace-nowrap', 'text-text-primary dark:text-text-darkPrimary', col.className)}>
                    {typeof col.accessorKey === 'function'
                      ? col.accessorKey(row)
                      : (row[col.accessorKey] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-text-secondary"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
