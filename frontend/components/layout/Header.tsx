"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SearchIcon,
  PlusIcon,
  RepoIcon,
  IssueIcon,
  AgentIcon,
  PatchIcon,
  CloseIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { BackendRepository, BackendIssue, AgentRegistryEntry } from "@/types/api";

export interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenConnectModal: () => void;
}

/** Fetches real repositories/issues/agents once on mount for the quick-search palette. Never mock data. */
function useSearchData() {
  const [repositories, setRepositories] = useState<BackendRepository[]>([]);
  const [issues, setIssues] = useState<BackendIssue[]>([]);
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [repoResult, issueResult, agentResult] = await Promise.allSettled([
        api.getRepositories(),
        api.getIssues(),
        api.getAgents(),
      ]);
      if (cancelled) return;
      if (repoResult.status === "fulfilled") setRepositories(repoResult.value);
      if (issueResult.status === "fulfilled") setIssues(issueResult.value);
      if (agentResult.status === "fulfilled") setAgents(agentResult.value);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { repositories, issues, agents };
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onOpenConnectModal,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "ok" | "offline">("idle");
  const { repositories, issues, agents } = useSearchData();

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        // Prevent Chrome / browser default address bar search
        e.preventDefault();
        e.stopPropagation();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen]);

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

  // Filter items based on query
  const q = searchQuery.toLowerCase().trim();

  const matchedRepos = q
    ? repositories.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.language ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
      ).slice(0, 3)
    : repositories.slice(0, 2);

  const matchedIssues = q
    ? issues.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          String(i.number).includes(q) ||
          i.state.toLowerCase().includes(q)
      ).slice(0, 3)
    : issues.slice(0, 2);

  const matchedAgents = q
    ? agents.filter(
        (a) =>
          a.display_name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      ).slice(0, 3)
    : agents.slice(0, 2);

  const navigationShortcuts = [
    { label: "Patch Review", path: "/patches", desc: "Inspect & approve unified diffs" },
    { label: "Regression Tests", path: "/tests", desc: "5-step verification sandbox" },
    { label: "Security Findings", path: "/security", desc: "AST audit & CWE detections" },
    { label: "Release Readiness", path: "/releases", desc: "Multi-gate quality checks" },
  ];

  const matchedNav = q
    ? navigationShortcuts.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.desc.toLowerCase().includes(q) ||
          n.path.toLowerCase().includes(q)
      ).slice(0, 2)
    : navigationShortcuts.slice(0, 2);

  const hasMatches =
    matchedIssues.length > 0 ||
    matchedRepos.length > 0 ||
    matchedAgents.length > 0 ||
    matchedNav.length > 0;

  const handleNavigate = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    searchInputRef.current?.blur();
    router.push(path);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (matchedIssues.length > 0) {
        handleNavigate(`/issues/${matchedIssues[0].id}`);
      } else if (matchedRepos.length > 0) {
        handleNavigate("/repositories");
      } else if (matchedAgents.length > 0) {
        handleNavigate("/agents");
      } else if (matchedNav.length > 0) {
        handleNavigate(matchedNav[0].path);
      }
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
        {/* Interactive Search Bar & Dropdown Palette */}
        <div ref={searchContainerRef} className="relative hidden md:block">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-2.5 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onClick={() => setIsSearchOpen(true)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search repos, issues..."
              className="w-56 lg:w-64 xl:w-72 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/80 py-1 pl-8 pr-16 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors duration-150"
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="p-0.5 text-charcoal-400 hover:text-charcoal-700 dark:text-slate-500 dark:hover:text-slate-300 rounded"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-cream-300 dark:border-slate-700 bg-cream-200 dark:bg-slate-800 text-charcoal-500 dark:text-slate-400 select-none pointer-events-none">
                  Ctrl K
                </kbd>
              )}
            </div>
          </div>

          {/* Quick Search Palette Dropdown */}
          {isSearchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-900 shadow-xl z-50 overflow-hidden font-mono text-xs">
              <div className="px-3 py-1.5 border-b border-cream-200 dark:border-slate-800/80 bg-cream-100/70 dark:bg-slate-950/60 text-[10px] text-charcoal-500 dark:text-slate-400 font-semibold flex items-center justify-between">
                <span>{q ? `Results for "${q}"` : "Suggested & Quick Navigation"}</span>
                <span className="text-[10px] text-charcoal-400 dark:text-slate-500">Esc to close</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-cream-200/60 dark:divide-slate-800/50">
                {!hasMatches && (
                  <div className="p-4 text-center text-charcoal-500 dark:text-slate-500 text-xs">
                    No results found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}

                {/* Issues */}
                {matchedIssues.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-charcoal-400 dark:text-slate-500 tracking-wider">
                      Issues
                    </div>
                    {matchedIssues.map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => handleNavigate(`/issues/${issue.id}`)}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-cream-200/70 dark:hover:bg-slate-800/70 cursor-pointer transition-colors duration-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <IssueIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="text-charcoal-800 dark:text-slate-200 truncate">
                            #{issue.number} {issue.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-200 dark:bg-slate-800 text-charcoal-600 dark:text-slate-400 shrink-0 ml-2 uppercase">
                          {issue.state}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Repositories */}
                {matchedRepos.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-charcoal-400 dark:text-slate-500 tracking-wider">
                      Repositories
                    </div>
                    {matchedRepos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => handleNavigate("/repositories")}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-cream-200/70 dark:hover:bg-slate-800/70 cursor-pointer transition-colors duration-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <RepoIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-charcoal-800 dark:text-slate-200 truncate">
                            {repo.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-charcoal-500 dark:text-slate-500 shrink-0 ml-2">
                          {repo.language || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Specialized Agents */}
                {matchedAgents.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-charcoal-400 dark:text-slate-500 tracking-wider">
                      Agents
                    </div>
                    {matchedAgents.map((agent) => (
                      <div
                        key={agent.name}
                        onClick={() => handleNavigate("/agents")}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-cream-200/70 dark:hover:bg-slate-800/70 cursor-pointer transition-colors duration-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AgentIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-charcoal-800 dark:text-slate-200 truncate">
                            {agent.display_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-charcoal-500 dark:text-slate-500 shrink-0 ml-2">
                          {agent.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation Shortcuts */}
                {matchedNav.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-charcoal-400 dark:text-slate-500 tracking-wider">
                      Workspaces & Views
                    </div>
                    {matchedNav.map((nav) => (
                      <div
                        key={nav.path}
                        onClick={() => handleNavigate(nav.path)}
                        className="px-3 py-1.5 flex items-center justify-between hover:bg-cream-200/70 dark:hover:bg-slate-800/70 cursor-pointer transition-colors duration-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ArrowRightIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-charcoal-800 dark:text-slate-200 truncate">
                            {nav.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-charcoal-500 dark:text-slate-500 shrink-0 ml-2">
                          {nav.path}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-3 py-1.5 border-t border-cream-200 dark:border-slate-800/80 bg-cream-100/50 dark:bg-slate-950/50 text-[10px] text-charcoal-400 dark:text-slate-500 flex items-center justify-between">
                <span>↵ to select</span>
                <span>Ctrl+K to focus</span>
              </div>
            </div>
          )}
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
