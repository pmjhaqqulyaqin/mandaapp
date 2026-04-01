import { ReactNode } from 'react';
import { useSiteSettings } from '../hooks/api/useSettings';
import { MaintenancePage } from '../pages/MaintenancePage';

export const MaintenanceGuard = ({ children }: { children: ReactNode }) => {
  const { get, isLoading } = useSiteSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (get('maintenance_mode') === 'true') {
    return <MaintenancePage />;
  }

  return <>{children}</>;
};
