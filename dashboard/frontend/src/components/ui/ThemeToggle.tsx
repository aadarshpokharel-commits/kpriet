import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'labeled' | 'pill';
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'icon',
  size = 'md',
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-full p-1 border transition-all duration-200 cursor-pointer shadow-xs',
          'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700',
          size === 'sm' ? 'text-xs h-7 px-2' : 'text-xs h-8 px-2.5',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <span
          className={cn(
            'flex items-center justify-center rounded-full transition-transform duration-200',
            size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
            isDark ? 'text-amber-400' : 'text-amber-500'
          )}
        >
          {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </span>
        <span className="font-semibold select-none capitalize">
          {theme}
        </span>
      </button>
    );
  }

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer',
          'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <>
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>Dark Theme</span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light Theme</span>
          </>
        )}
      </button>
    );
  }

  // Default 'icon' variant
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <span className="sr-only">Toggle theme</span>
      {isDark ? (
        <Moon className="w-4 h-4 text-emerald-400 transition-transform hover:rotate-12" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500 transition-transform hover:rotate-45" />
      )}
    </button>
  );
};
