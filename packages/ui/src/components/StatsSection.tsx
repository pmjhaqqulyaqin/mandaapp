import React from 'react';

const stats = [
  { id: 1, name: 'Active Students', value: '10,000+' },
  { id: 2, name: 'Schools Powered', value: '500+' },
  { id: 3, name: 'Messages Sent Daily', value: '1M+' },
  { id: 4, name: 'System Uptime', value: '99.9%' },
];

export const StatsSection = () => {
  return (
    <section className="bg-white dark:bg-[#0A0A0A] py-8 sm:py-12 border-y border-border-light dark:border-border-dark relative overflow-hidden">
      <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-10 text-center lg:grid-cols-4">
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
