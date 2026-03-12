import React from 'react';

export type ScheduleItem = {
  id: string;
  time: string;
  ampm: string;
  subject: string;
  location: string;
  instructor: string;
  isActive?: boolean;
};

export const ClassesWidget = ({ classes, date }: { classes: ScheduleItem[], date: string }) => {
  return (
    <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm h-full flex flex-col">
      <h3 className="font-semibold mb-4 border-b pb-4 dark:border-border-dark text-text-primary dark:text-text-darkPrimary flex items-center justify-between">
        Today's Classes
        <span className="text-xs font-normal text-text-secondary">{date}</span>
      </h3>
      
      {classes.length > 0 ? (
        <ul className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border-light dark:before:via-border-dark before:to-transparent">
          {classes.map((item, idx) => (
            <li key={item.id} className={`relative flex items-center justify-between group ${idx !== classes.length - 1 ? 'mb-4' : ''}`}>
              <div className={`flex items-center gap-4 w-full p-3 rounded-lg border z-10 transition-colors ${item.isActive ? 'bg-primary/5 border-primary/20 dark:bg-primary/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#1a1a1a] cursor-pointer'}`}>
                <div className="w-12 text-center shrink-0">
                  <p className={`text-xs font-bold ${item.isActive ? 'text-primary' : 'text-text-primary dark:text-text-darkPrimary'}`}>{item.time}</p>
                  <p className="text-[10px] text-text-secondary">{item.ampm}</p>
                </div>
                <div className={`h-8 w-px ${item.isActive ? 'bg-primary/20' : 'bg-border-light dark:bg-border-dark'}`}></div>
                <div>
                  <p className={`text-sm font-medium ${item.isActive ? 'text-primary dark:text-primary' : 'text-text-primary dark:text-text-darkPrimary'}`}>{item.subject}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{item.location} • {item.instructor}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">No classes scheduled for today.</div>
      )}
    </div>
  );
};
