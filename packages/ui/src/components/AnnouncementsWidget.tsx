import React from 'react';

export type Announcement = {
  id: string;
  title: string;
  category: string;
  time: string;
  type: 'academic' | 'event' | 'alert' | 'general';
};

const iconMap = {
  academic: (
    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><polyline points="15,9 18,9 18,11"/><path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2v0"/></svg>
    </div>
  ),
  event: (
    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
    </div>
  ),
  alert: (
    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
  ),
  general: (
    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 text-text-secondary">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/></svg>
    </div>
  )
};

export const AnnouncementsWidget = ({ announcements }: { announcements: Announcement[] }) => {
  return (
    <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm h-full flex flex-col">
      <h3 className="font-semibold mb-4 border-b pb-4 dark:border-border-dark text-text-primary dark:text-text-darkPrimary flex items-center justify-between">
        Recent Announcements
        {announcements.length > 0 && <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-1 rounded-full">{announcements.length} New</span>}
      </h3>
      
      {announcements.length > 0 ? (
        <ul className="space-y-4 flex-1">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="flex gap-4">
              {iconMap[announcement.type] || iconMap.general}
              <div>
                <p className="text-sm font-medium text-text-primary dark:text-text-darkPrimary leading-snug">{announcement.title}</p>
                <p className="text-xs text-text-secondary mt-1">{announcement.category} • {announcement.time}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">No recent announcements</div>
      )}
      <button className="w-full mt-4 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors">View all news</button>
    </div>
  );
};
