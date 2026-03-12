import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  items: NavItem[];
}

export function Sidebar({ items, className, ...props }: SidebarProps) {
  return (
    <nav className={cn('flex-1 px-4 py-4 flex flex-col gap-1.5 overflow-y-auto', className)} {...props}>
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3">
        Navigation
      </div>
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/dashboard'} // exact match for dashboard root
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
              isActive
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary dark:hover:bg-[#1a1a1a] dark:hover:text-text-darkPrimary'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  'shrink-0',
                  isActive ? 'text-primary' : 'text-gray-400 group-hover:text-text-primary dark:group-hover:text-text-darkPrimary'
                )}
              >
                {item.icon}
              </div>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    'ml-auto inline-block py-0.5 px-2 text-[10px] font-bold rounded-full',
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 group-hover:bg-primary group-hover:text-white transition-colors'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
