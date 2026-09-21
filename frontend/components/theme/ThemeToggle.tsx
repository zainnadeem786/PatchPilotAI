"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-8 h-8 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100 dark:bg-slate-900/60 ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to warm light theme" : "Switch to dark theme"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border text-xs transition-colors duration-150 ${
        isDark
          ? "border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          : "border-cream-300 bg-cream-100 text-charcoal-700 hover:bg-cream-200 hover:text-charcoal-900"
      } ${className}`}
    >
      {isDark ? (
        // Sun icon for dark mode (click to go light)
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        // Moon icon for light mode (click to go dark)
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};
