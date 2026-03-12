import React, { useState, useEffect } from 'react';
import { AnnouncementsWidget, ClassesWidget, type Announcement, type ScheduleItem, MetricCard, Breadcrumbs, Skeleton } from '@mandaapp/ui';
import { useAuth } from '../contexts/AuthContext';

export const DashboardOverview = () => {
  const dummyAnnouncements: Announcement[] = [
    { id: '1', title: 'Midterm Schedule Released', category: 'Academic', time: '2 hours ago', type: 'academic' },
    { id: '2', title: 'School Sports Day Next Week', category: 'Event', time: 'Yesterday', type: 'event' },
    { id: '3', title: 'Library Closed for Renovation', category: 'Alert', time: '2 days ago', type: 'alert' }
  ];

  const dummyClasses: ScheduleItem[] = [
    { id: '1', time: '08:00', ampm: 'AM', subject: 'Mathematics', location: 'Room 302', instructor: 'Mr. Andi', isActive: true },
    { id: '2', time: '10:30', ampm: 'AM', subject: 'Physics', location: 'Lab 1', instructor: 'Mrs. Rina' },
    { id: '3', time: '01:00', ampm: 'PM', subject: 'English', location: 'Room 105', instructor: 'Mr. John' }
  ];

  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate API data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Overview' }
        ]}
      />

      <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-heading font-semibold mb-2 text-text-primary dark:text-text-darkPrimary">
              Welcome back, {user?.name || 'Budi'}!
            </h2>
            <p className="text-text-secondary">Your schedule for today is looking great. Have a wonderful day of learning.</p>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        ) : (
          <>
            <MetricCard 
              title="Attendance Rate"
              value="98%"
              trend={{ value: '2.5%', isPositive: true }}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>}
            />
            <MetricCard 
              title="Active Assignments"
              value="4"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>}
            />
            <MetricCard 
              title="Average Score"
              value="85.5"
              trend={{ value: '1.2 pt', isPositive: false }}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {isLoading ? (
           <>
             <Skeleton className="h-96 w-full rounded-2xl" />
             <Skeleton className="h-96 w-full rounded-2xl" />
           </>
        ) : (
          <>
            <AnnouncementsWidget announcements={dummyAnnouncements} />
            <ClassesWidget classes={dummyClasses} date="March 6, 2026" />
          </>
        )}
      </div>
    </div>
  );
};
