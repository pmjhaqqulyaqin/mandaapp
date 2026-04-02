import React from 'react';
import { Trophy, Dribbble, Newspaper, CalendarDays } from 'lucide-react';

const links = [
  { id: 1, name: 'Kejuaraan', icon: <Trophy className="w-6 h-6 md:w-7 md:h-7 text-text-primary dark:text-text-darkPrimary mb-1.5 md:mb-2" /> },
  { id: 2, name: 'Ekstra', icon: <Dribbble className="w-6 h-6 md:w-7 md:h-7 text-text-primary dark:text-text-darkPrimary mb-1.5 md:mb-2" /> },
  { id: 3, name: 'Berita', icon: <Newspaper className="w-6 h-6 md:w-7 md:h-7 text-text-primary dark:text-text-darkPrimary mb-1.5 md:mb-2" /> },
  { id: 4, name: 'Agenda', icon: <CalendarDays className="w-6 h-6 md:w-7 md:h-7 text-text-primary dark:text-text-darkPrimary mb-1.5 md:mb-2" /> },
];

const stats = [
  { id: 1, name: 'Active Students', value: '10,000+' },
  { id: 2, name: 'Schools Powered', value: '500+' },
  { id: 3, name: 'Messages Sent Daily', value: '1M+' },
  { id: 4, name: 'System Uptime', value: '99.9%' },
];

export const QuickLinksSection = () => {
  return (
    <section className="relative bg-background-light dark:bg-background-dark pt-6 sm:pt-8 pb-10 sm:pb-14 overflow-hidden">
      {/* Horizontal Line spanning full width behind cards */}
      <div className="absolute top-[60px] sm:top-[72px] md:top-[88px] left-0 right-0 h-[2px] bg-black/10 dark:bg-white/10 -z-0"></div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-20">
          {links.map((link) => (
             <button
              key={link.id}
              className="flex flex-col items-center justify-center w-full aspect-[4/3] bg-white dark:bg-[#1a1a1a] rounded-lg md:rounded-xl shadow-md border border-border-light dark:border-border-dark transition-all duration-300 hover:-translate-y-1 md:hover:-translate-y-1.5 hover:shadow-lg group"
            >
              <div className="transition-transform duration-300 group-hover:scale-110">
                {link.icon}
              </div>
              <span className="text-xs md:text-sm font-semibold text-text-primary dark:text-text-darkPrimary transition-colors duration-300 group-hover:text-primary">
                {link.name}
              </span>
            </button>
          ))}
          </div>
        </div>

        {/* Stats Grid Below Links */}
        <dl className="mt-10 sm:mt-14 grid grid-cols-1 gap-x-6 gap-y-6 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="mx-auto flex max-w-xs flex-col gap-y-2">
              <dt className="text-xs leading-5 text-text-secondary">{stat.name}</dt>
              <dd className="order-first text-2xl font-heading font-semibold tracking-tight text-text-primary dark:text-text-darkPrimary sm:text-3xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
