import React from 'react';
import { useTheme } from '../ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] text-text-secondary hover:text-primary transition-colors border border-border-light dark:border-border-dark flex items-center justify-center shrink-0"
      aria-label="Toggle Dark Mode"
    >
      {/* Sun icon for Dark Mode (indicating switch to light) */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`transition-all ${theme === 'dark' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 hidden'}`}
      >
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>
      
      {/* Moon icon for Light Mode (indicating switch to dark) */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`transition-all ${theme !== 'dark' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 hidden'}`}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </svg>
    </button>
  );
}
