"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  BackendIssue,
  AgentRegistryEntry,
  PatchResponse,
  RegressionTestResponse,
  SecurityFindingResponse,
  ReleaseReadinessResponse,
} from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { HealthStatus } from "@/components/HealthStatus";
import {
  RepoIcon,
  IssueIcon,
  AgentIcon,
  PatchIcon,
  ArrowRightIcon,
  ShieldIcon,
  AlertIcon,
  CheckIcon,
  TestIcon,
  SecurityIcon,
} from "@/components/icons";

type Metric = number | null; // null = still loading or failed — never a fabricated number

interface DashboardData {
  repositoryCount: Metric;
  issueCount: Metric;
  agentCount: Metric;
  patchCount: Metric;
  testCount: Metric;
  securityCount: Metric;
  releaseCount: Metric;
  agents: AgentRegistryEntry[];
  recentIssues: BackendIssue[];
  recentPatches: PatchResponse[];
  recentTests: RegressionTestResponse[];
  recentSecurity: SecurityFindingResponse[];
  recentReleases: ReleaseReadinessResponse[];
  backendReachable: boolean | null;
}

function useDashboardData(): DashboardData {
  const [state, setState] = useState<DashboardData>({
    repositoryCount: null,
    issueCount: null,
    agentCount: null,
    patchCount: null,
    testCount: null,
    securityCount: null,
    releaseCount: null,
    agents: [],
    recentIssues: [],
    recentPatches: [],
    recentTests: [],
    recentSecurity: [],
    recentReleases: [],
    backendReachable: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [repos, issues, agents, patches, tests, security, releases, health] = await Promise.allSettled([
        api.getRepositories(),
        api.getIssues(),
        api.getAgents(),
        api.getPatches(),
        api.getRegressionTests(),
        api.getSecurityFindings(),
        api.getReleases(),
        api.isBackendAvailable(),
      ]);

      if (cancelled) return;

      setState({
        repositoryCount: repos.status === "fulfilled" ? repos.value.length : null,
        issueCount: issues.status === "fulfilled" ? issues.value.length : null,
        agentCount: agents.status === "fulfilled" ? agents.value.length : null,
        patchCount: patches.status === "fulfilled" ? patches.value.length : null,
        testCount: tests.status === "fulfilled" ? tests.value.length : null,
        securityCount: security.status === "fulfilled" ? security.value.length : null,
        releaseCount: releases.status === "fulfilled" ? releases.value.length : null,
        agents: agents.status === "fulfilled" ? agents.value : [],
        recentIssues: issues.status === "fulfilled" ? issues.value.slice(0, 3) : [],
        recentPatches: patches.status === "fulfilled" ? patches.value.slice(0, 4) : [],
        recentTests: tests.status === "fulfilled" ? tests.value.slice(0, 4) : [],
        recentSecurity: security.status === "fulfilled" ? security.value.slice(0, 4) : [],
        recentReleases: releases.status === "fulfilled" ? releases.value.slice(0, 1) : [],
        backendReachable: health.status === "fulfilled" ? health.value : false,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: Metric;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 p-3.5">
      <div className="flex items-center justify-between text-charcoal-500 dark:text-slate-400 text-xs">
        <span className="font-mono text-[11px] uppercase">{label}</span>
        {icon}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-charcoal-900 dark:text-slate-100">
          {value === null ? "—" : value}
        </span>
      </div>
    </div>
  );
}

interface ActivityRow {
  key: string;
  title: string;
  timestamp: string;
  repo: string | null;
  kind: "patch" | "test" | "security" | "release";
}

export default function OverviewPage() {
  const data = useDashboardData();

  const activity: ActivityRow[] = [
    ...data.recentPatches.map((p) => ({
      key: `patch-${p.id}`,
      title: p.summary || `Patch proposed for issue #${p.issue_number ?? "?"}`,
      timestamp: p.created_at,
      repo: p.repository_full_name ?? null,
      kind: "patch" as const,
    })),
    ...data.recentTests.map((t) => ({
      key: `test-${t.id}`,
      title: t.purpose || `Regression test generated for issue #${t.issue_number ?? "?"}`,
      timestamp: t.created_at,
      repo: t.repository_full_name ?? null,
      kind: "test" as const,
    })),
    ...data.recentSecurity.map((s) => ({
      key: `sec-${s.id}`,
      title: s.title,
      timestamp: s.created_at,
      repo: s.repository_full_name ?? null,
      kind: "security" as const,
    })),
    ...data.recentReleases.map((r) => ({
      key: `rel-${r.id}`,
      title: r.release_ready ? "Release marked ready for human review" : "Release blocked pending review",
      timestamp: r.created_at,
      repo: r.repository_full_name ?? null,
      kind: "release" as const,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const latestRelease = data.recentReleases[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Backend unavailable banner — metrics below show "—" rather than fake numbers */}
      {data.backendReachable === false && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start gap-2.5">
          <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-charcoal-900 dark:text-amber-200">Backend Offline</h4>
            <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
              Start the FastAPI backend on port 8000. Metrics show &ldquo;—&rdquo; instead of a number until the connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Top Engineering Summary Header */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/80 dark:bg-slate-900/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Engineering Operations Console
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
              Autonomous Code Intelligence & Patching
            </h2>
            <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Continuous repository diagnosis, surgical patch synthesis, regression testing, and security verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/issues"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 font-mono"
            >
              <span>View Issues</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/releases"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-700 dark:text-slate-300 bg-cream-200/80 dark:bg-slate-800 hover:bg-cream-300/80 dark:hover:bg-slate-700 rounded-md border border-cream-300 dark:border-slate-700 transition-colors duration-150 font-mono"
            >
              <span>Release Gates</span>
            </Link>
          </div>
        </div>

        {/* Pipeline stage strip — informational only, derived from the real agent registry */}
        {data.agents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-cream-300/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[11px] font-mono">
            {data.agents.map((agent, idx) => (
              <div
                key={agent.name}
                className="py-1 px-2 rounded border text-center border-cream-300 dark:border-slate-800/80 bg-cream-50 dark:bg-slate-950/60 text-charcoal-500 dark:text-slate-400"
              >
                {idx + 1}. {agent.display_name.replace(" Agent", "")}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metrics Row — every number sourced from a real API call */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Repositories" value={data.repositoryCount} icon={<RepoIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />} />
        <MetricCard label="Open Issues" value={data.issueCount} icon={<IssueIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />} />
        <MetricCard label="Agents" value={data.agentCount} icon={<AgentIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />} />
        <MetricCard label="Patches" value={data.patchCount} icon={<PatchIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />} />
        <MetricCard label="Tests" value={data.testCount} icon={<TestIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />} />
        <MetricCard label="Security Findings" value={data.securityCount} icon={<SecurityIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />} />
        <MetricCard label="Releases" value={data.releaseCount} icon={<ShieldIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />} />
      </div>

      {/* Recent Issues */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-charcoal-700 dark:text-slate-300">
            Recent Issues
          </h3>
          <Link href="/issues" className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors duration-150">
            <span>View All</span>
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>

        {data.recentIssues.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-charcoal-500 dark:text-slate-500 border border-dashed border-cream-300 dark:border-slate-800 rounded-lg">
            No issues tracked yet. Connect a repository to sync issues.
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentIssues.map((issue) => (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="block rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/70 p-3 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors duration-150"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">#{issue.number}</span>
                  <span className="text-sm font-medium text-charcoal-900 dark:text-slate-200 truncate">{issue.title}</span>
                </div>
                <Badge variant={issue.state === "open" ? "success" : "neutral"} size="sm">{issue.state.toUpperCase()}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Two Columns: Release Gates & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Latest Release Readiness */}
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-charcoal-700 dark:text-slate-300">
                Latest Release Evaluation
              </h3>
              {latestRelease && (
                <Badge variant={latestRelease.release_ready ? "success" : "error"} size="sm">
                  {latestRelease.release_ready ? "Ready for Review" : "Blocked"}
                </Badge>
              )}
            </div>

            {!latestRelease ? (
              <div className="p-5 text-center text-xs font-mono text-charcoal-500 dark:text-slate-500 border border-dashed border-cream-300 dark:border-slate-800 rounded-lg">
                No release evaluations yet.
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold text-charcoal-900 dark:text-slate-200 block truncate">
                  {latestRelease.issue_title ? `#${latestRelease.issue_number} — ${latestRelease.issue_title}` : `Evaluation #${latestRelease.id}`}
                </span>
                {latestRelease.repository_full_name && (
                  <span className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400 block">{latestRelease.repository_full_name}</span>
                )}
                <div className="p-2 rounded border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-950/20 text-[11px] font-mono text-violet-800 dark:text-violet-300 flex items-start gap-1.5">
                  <ShieldIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Human approval required — no automatic release action will occur.</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-cream-300/80 dark:border-slate-800">
            <Link href="/releases" className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md transition-colors duration-150">
              <span>Inspect Release Gates</span>
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Activity Stream Column */}
        <div className="lg:col-span-2 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-charcoal-700 dark:text-slate-300">
              Recent Engineering Activity
            </h3>
            <Link href="/activity" className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline transition-colors duration-150">
              Full Log &rarr;
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-charcoal-500 dark:text-slate-500 border border-dashed border-cream-300 dark:border-slate-800 rounded-lg">
              No activity yet. Analyze an issue to generate patches, tests, and security findings.
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((act) => (
                <div key={act.key} className="flex items-start gap-2.5 p-2.5 rounded border border-cream-300 dark:border-slate-800/80 bg-cream-50 dark:bg-slate-950/50 text-xs">
                  <div className="mt-1">
                    {act.kind === "security" ? (
                      <AlertIcon className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-charcoal-900 dark:text-slate-200 truncate">{act.title}</span>
                      <span className="font-mono text-[11px] text-charcoal-400 dark:text-slate-500 shrink-0">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {act.repo && <p className="text-charcoal-500 dark:text-slate-400 text-xs truncate mt-0.5">{act.repo}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phase 1 Backend Health Check widget */}
          <div className="pt-2">
            <HealthStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
