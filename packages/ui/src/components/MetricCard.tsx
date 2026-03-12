import React from 'react';
import { cn } from '../utils/cn';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function MetricCard({ title, value, icon, trend, className, ...props }: MetricCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white dark:bg-background-dark p-6 shadow-sm border border-border-light dark:border-border-dark flex flex-col',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        {icon && (
          <div className="h-10 w-10 text-primary bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-auto flex items-baseline gap-2">
        <div className="text-3xl font-heading font-bold text-text-primary dark:text-text-darkPrimary">
          {value}
        </div>
        {trend && (
          <div
            className={cn(
              'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-xs font-semibold md:mt-2 lg:mt-0',
              trend.isPositive 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {trend.isPositive ? (
               <svg className="-ml-1 mr-0.5 h-3 w-3 shrink-0 self-center" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" /></svg>
            ) : (
               <svg className="-ml-1 mr-0.5 h-3 w-3 shrink-0 self-center" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg>
            )}
            <span className="sr-only"> {trend.isPositive ? 'Increased' : 'Decreased'} by </span>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
