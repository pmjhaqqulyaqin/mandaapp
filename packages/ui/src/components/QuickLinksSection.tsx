import React from 'react';
import { Trophy, Dribbble, Newspaper, CalendarDays } from 'lucide-react';

const links = [
  { id: 1, name: 'Kejuaraan', icon: <Trophy className="w-8 h-8 md:w-10 md:h-10 text-text-primary dark:text-text-darkPrimary mb-2 md:mb-3" /> },
  { id: 2, name: 'Ekstra', icon: <Dribbble className="w-8 h-8 md:w-10 md:h-10 text-text-primary dark:text-text-darkPrimary mb-2 md:mb-3" /> },
  { id: 3, name: 'Berita', icon: <Newspaper className="w-8 h-8 md:w-10 md:h-10 text-text-primary dark:text-text-darkPrimary mb-2 md:mb-3" /> },
  { id: 4, name: 'Agenda', icon: <CalendarDays className="w-8 h-8 md:w-10 md:h-10 text-text-primary dark:text-text-darkPrimary mb-2 md:mb-3" /> },
];

const stats = [
  { id: 1, name: 'Active Students', value: '10,000+' },
  { id: 2, name: 'Schools Powered', value: '500+' },
  { id: 3, name: 'Messages Sent Daily', value: '1M+' },
  { id: 4, name: 'System Uptime', value: '99.9%' },
];

export const QuickLinksSection = () => {
  return (
    <section className="relative bg-background-light dark:bg-background-dark pt-8 sm:pt-12 pb-16 sm:pb-24 overflow-hidden">
      {/* Horizontal Line spanning full width behind cards */}
      <div className="absolute top-[76px] sm:top-[92px] md:top-[114px] left-0 right-0 h-[2px] bg-black/10 dark:bg-white/10 -z-0"></div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-20">
          {links.map((link) => (
             <button
              key={link.id}
              className="flex flex-col items-center justify-center w-full aspect-[4/3] bg-white dark:bg-[#1a1a1a] rounded-xl md:rounded-2xl shadow-md border border-border-light dark:border-border-dark transition-all duration-300 hover:-translate-y-1 md:hover:-translate-y-2 hover:shadow-xl group"
            >
              <div className="transition-transform duration-300 group-hover:scale-110">
                {link.icon}
              </div>
              <span className="text-sm md:text-base font-semibold text-text-primary dark:text-text-darkPrimary transition-colors duration-300 group-hover:text-primary">
                {link.name}
              </span>
            </button>
          ))}
          </div>
        </div>

        {/* Stats Grid Below Links */}
        <dl className="mt-16 sm:mt-24 grid grid-cols-1 gap-x-8 gap-y-10 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-sm leading-6 text-text-secondary">{stat.name}</dt>
              <dd className="order-first text-3xl font-heading font-semibold tracking-tight text-text-primary dark:text-text-darkPrimary sm:text-4xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
