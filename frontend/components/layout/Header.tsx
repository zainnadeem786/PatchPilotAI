"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SearchIcon, PlusIcon, CheckIcon, AlertIcon } from "@/components/icons";

export interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenConnectModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onOpenConnectModal,
}) => {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "ok" | "offline">("idle");

  const getPageTitle = (path: string) => {
    if (path === "/") return "Overview";
    if (path.startsWith("/repositories")) return "Repositories";
    if (path.startsWith("/issues/")) return "Issue Detail";
    if (path.startsWith("/issues")) return "Issues";
    if (path.startsWith("/agents")) return "Agents";
    if (path.startsWith("/patches")) return "Patch Review";
    if (path.startsWith("/tests")) return "Tests";
    if (path.startsWith("/security")) return "Security";
    if (path.startsWith("/releases")) return "Releases";
    if (path.startsWith("/activity")) return "Activity";
    if (path.startsWith("/settings")) return "Settings";
    return "PatchPilot AI";
  };

  const handleCheckApi = async () => {
    setHealthStatus("checking");
    try {
      await api.checkHealth();
      setHealthStatus("ok");
    } catch {
      setHealthStatus("offline");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-cream-300 dark:border-slate-800/90 bg-cream-50/90 dark:bg-[#090d16]/90 px-4 sm:px-6 backdrop-blur">
      {/* Left: Mobile Menu Trigger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          aria-label="Open sidebar navigation"
          className="lg:hidden rounded-md p-1.5 text-charcoal-500 dark:text-slate-400 hover:bg-cream-200 dark:hover:bg-slate-800 hover:text-charcoal-900 dark:hover:text-slate-200 transition-colors duration-150"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100 truncate">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      {/* Right: Actions, Search, Theme Toggle, Health */}
      <div className="flex items-center gap-2.5">
        {/* Search Bar — Fixed root cause: responsive width, concise placeholder, adequate right padding */}
        <div className="relative hidden md:block">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-2.5 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder="Search repos, issues..."
              className="w-56 lg:w-64 xl:w-72 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/80 py-1 pl-8 pr-14 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 cursor-default font-mono transition-colors duration-150"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-cream-300 dark:border-slate-700 bg-cream-200 dark:bg-slate-800 text-charcoal-500 dark:text-slate-400 select-none pointer-events-none">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Theme Switcher Toggle */}
        <ThemeToggle />

        {/* Backend API Health Status Check (Phase 1 verified) */}
        <button
          onClick={handleCheckApi}
          type="button"
          aria-label="Verify backend API status"
          title="Verify connection to local FastAPI backend (/api/health)"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-cream-300 dark:border-slate-800 bg-cream-100 dark:bg-slate-900/60 hover:bg-cream-200 dark:hover:bg-slate-800 text-charcoal-600 dark:text-slate-300 transition-colors duration-150"
        >
          {healthStatus === "idle" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-charcoal-400 dark:bg-slate-500" />
              <span>API: Ready</span>
            </>
          )}
          {healthStatus === "checking" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping" />
              <span>Checking...</span>
            </>
          )}
          {healthStatus === "ok" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">API: Online</span>
            </>
          )}
          {healthStatus === "offline" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="text-rose-600 dark:text-rose-400">API: Offline</span>
            </>
          )}
        </button>

        {/* Connect Repository CTA */}
        <button
          onClick={onOpenConnectModal}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 font-mono"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connect Repo</span>
          <span className="sm:hidden">Connect</span>
        </button>
      </div>
    </header>
  );
};
