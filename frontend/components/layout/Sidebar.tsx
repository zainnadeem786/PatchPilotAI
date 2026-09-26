"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PatchPilotLogo } from "@/components/brand/PatchPilotLogo";
import {
  RepoIcon,
  IssueIcon,
  AgentIcon,
  PatchIcon,
  TestIcon,
  SecurityIcon,
  ReleaseIcon,
  ActivityIcon,
  SettingsIcon,
  CloseIcon,
  ShieldIcon,
} from "@/components/icons";
import { api } from "@/lib/api";

// ── Sidebar statistics ────────────────────────────────────────────────────────
//
// Real data sources:
//   repositoryCount  — GET /api/v1/repositories  (live backend count)
//   issueCount       — GET /api/v1/issues          (live backend count)
//   agentCount       — architectural constant: exactly 5 agents in the Phase 4
//                      pipeline (Orchestrator, RepositoryIntelligence,
//                      PatchSynthesis, RegressionTestSynthesis, SecurityAudit)
//
// Unimplemented / no persistent data source yet:
//   patchCount       — patches are transient per-analysis; no Patch model/table
//   testCount        — test code is transient per-analysis; no Test model/table
//   securityCount    — security findings are transient per-analysis; not persisted
//   releaseStatus    — no release model or release-readiness state exists yet
//
// For unimplemented items we display "—" instead of a fake number so the UI
// is always truthful about the current application state.

/** Sentinel value rendered when no real data source exists yet. */
const UNAVAILABLE = "—";

interface SidebarStats {
  repositoryCount: number | null; // null = still loading or failed
  issueCount: number | null;
  agentCount: number | null;      // derived from canonical /api/v1/agents registry
}

/**
 * Fetches repository count, issue count, and agent count from the real backend
 * API once on mount.  Returns null for a stat if the request is still in
 * flight or failed.  Never falls back to mock values.
 */
function useSidebarStats(): SidebarStats {
  const [repositoryCount, setRepositoryCount] = useState<number | null>(null);
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      // Fetch all three in parallel; each failure is isolated.
      const [repoResult, issueResult, agentResult] = await Promise.allSettled([
        api.getRepositories(),
        api.getIssues(),
        api.getAgents(),
      ]);

      if (cancelled) return;

      if (repoResult.status === "fulfilled") {
        setRepositoryCount(repoResult.value.length);
      }

      if (issueResult.status === "fulfilled") {
        setIssueCount(issueResult.value.length);
      }

      if (agentResult.status === "fulfilled") {
        setAgentCount(agentResult.value.length);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return { repositoryCount, issueCount, agentCount };
}

// ── Navigation item type ──────────────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  /** Rendered badge string. null = omit badge entirely. */
  badge: string | null;
}

/** Builds the main nav list with live badge values injected. */
function buildMainNav(stats: SidebarStats): NavItem[] {
  const { repositoryCount, issueCount, agentCount } = stats;

  return [
    {
      name: "Overview",
      href: "/",
      icon: ShieldIcon,
      badge: null,
    },
    {
      name: "Repositories",
      href: "/repositories",
      icon: RepoIcon,
      // Show count once loaded; show "…" while loading (null); never fake a number.
      badge: repositoryCount === null ? "…" : String(repositoryCount),
    },
    {
      name: "Issues",
      href: "/issues",
      icon: IssueIcon,
      badge: issueCount === null ? "…" : String(issueCount),
    },
    {
      name: "Agents",
      href: "/agents",
      icon: AgentIcon,
      // Derived from GET /api/v1/agents — canonical backend registry.
      badge: agentCount === null ? "…" : String(agentCount),
    },
    {
      name: "Patches",
      href: "/patches",
      icon: PatchIcon,
      // No persisted patch model; patches are transient per-analysis results.
      badge: UNAVAILABLE,
    },
    {
      name: "Tests",
      href: "/tests",
      icon: TestIcon,
      // No persisted test model; test code is transient per-analysis results.
      badge: UNAVAILABLE,
    },
    {
      name: "Security",
      href: "/security",
      icon: SecurityIcon,
      // No global security findings persistence; findings are per-analysis only.
      badge: UNAVAILABLE,
    },
    {
      name: "Releases",
      href: "/releases",
      icon: ReleaseIcon,
      // No release model or release-readiness state implemented yet.
      badge: UNAVAILABLE,
    },
  ];
}

const SUPPORTING_NAV: NavItem[] = [
  { name: "Activity", href: "/activity", icon: ActivityIcon, badge: null },
  { name: "Settings", href: "/settings", icon: SettingsIcon, badge: null },
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const stats = useSidebarStats();
  const mainNav = buildMainNav(stats);

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 border-r border-cream-300 dark:border-slate-800/90 bg-cream-100 dark:bg-[#090d16] flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding Header with bespoke PatchPilot brand mark */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-cream-300 dark:border-slate-800/80">
          <Link href="/" className="flex items-center">
            <PatchPilotLogo markSize={24} />
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1.5 text-charcoal-400 dark:text-slate-400 hover:bg-cream-200 dark:hover:bg-slate-800"
            aria-label="Close navigation sidebar"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {/* Main Workflows */}
          <div>
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
              Platform Workflows
            </div>
            <nav className="space-y-0.5">
              {mainNav.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 font-medium"
                        : "text-charcoal-600 dark:text-slate-400 hover:bg-cream-200/80 dark:hover:bg-slate-900 hover:text-charcoal-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          active
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-charcoal-400 dark:text-slate-500"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== null && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          active
                            ? "bg-indigo-100 dark:bg-indigo-500/25 text-indigo-800 dark:text-indigo-200 font-semibold"
                            : item.badge === UNAVAILABLE
                            ? "bg-cream-200 dark:bg-slate-800 text-charcoal-400 dark:text-slate-600"
                            : "bg-cream-200 dark:bg-slate-800 text-charcoal-500 dark:text-slate-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Supporting Navigation */}
          <div>
            <div className="px-2.5 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
              System
            </div>
            <nav className="space-y-0.5">
              {SUPPORTING_NAV.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 font-medium"
                        : "text-charcoal-600 dark:text-slate-400 hover:bg-cream-200/80 dark:hover:bg-slate-900 hover:text-charcoal-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          active
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-charcoal-400 dark:text-slate-500"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User / Workspace Footer */}
        <div className="p-2.5 border-t border-cream-300 dark:border-slate-800/80 bg-cream-50/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-md">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-cream-200 dark:bg-slate-800 border border-cream-300 dark:border-slate-700 flex items-center justify-center font-mono text-[10px] font-bold text-charcoal-700 dark:text-slate-300">
                DV
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-charcoal-900 dark:text-slate-200">Developer</div>
                <div className="text-[10px] font-mono text-charcoal-400 dark:text-slate-500">acme-corp</div>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Workspace Active" />
          </div>
        </div>
      </aside>
    </>
  );
};
