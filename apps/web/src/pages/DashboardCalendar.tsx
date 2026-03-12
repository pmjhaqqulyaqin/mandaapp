import React from 'react';

export const DashboardCalendar = () => {
  return (
    <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-xl font-heading font-semibold text-text-primary dark:text-text-darkPrimary">School Calendar</h2>
        <p className="text-text-secondary mt-2">Upcoming events and schedules will appear here.</p>
      </div>
    </div>
  );
};
