"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatusDot } from "@/components/ui/StatusDot";
import { AlertIcon, PatchIcon, TestIcon, SecurityIcon, ReleaseIcon, ActivityIcon } from "@/components/icons";

type EventKind = "patch" | "test" | "security" | "release";
type Status = "loading" | "live" | "offline" | "error";

interface ActivityEvent {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  repo: string | null;
  issueId: number | null;
  timestamp: string;
}

const KIND_ICON: Record<EventKind, React.FC<{ className?: string }>> = {
  patch: PatchIcon,
  test: TestIcon,
  security: SecurityIcon,
  release: ReleaseIcon,
};

const KIND_LABEL: Record<EventKind, string> = {
  patch: "Patches",
  test: "Tests",
  security: "Security",
  release: "Releases",
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"all" | EventKind>("all");

  const fetchActivity = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const [patches, tests, security, releases] = await Promise.all([
        api.getPatches(),
        api.getRegressionTests(),
        api.getSecurityFindings(),
        api.getReleases(),
      ]);

      const merged: ActivityEvent[] = [
        ...patches.map((p) => ({
          id: `patch-${p.id}`,
          kind: "patch" as const,
          title: "Patch proposed",
          description: p.summary || `Patch synthesized for issue #${p.issue_number ?? "?"}`,
          repo: p.repository_full_name ?? null,
          issueId: p.issue_id ?? null,
          timestamp: p.created_at,
        })),
        ...tests.map((t) => ({
          id: `test-${t.id}`,
          kind: "test" as const,
          title: "Regression test generated",
          description: t.purpose || `Test generated for issue #${t.issue_number ?? "?"} (${t.execution_status})`,
          repo: t.repository_full_name ?? null,
          issueId: t.issue_id ?? null,
          timestamp: t.created_at,
        })),
        ...security.map((s) => ({
          id: `security-${s.id}`,
          kind: "security" as const,
          title: `Security finding: ${s.severity}`,
          description: s.title,
          repo: s.repository_full_name ?? null,
          issueId: s.issue_id ?? null,
          timestamp: s.created_at,
        })),
        ...releases.map((r) => ({
          id: `release-${r.id}`,
          kind: "release" as const,
          title: r.release_ready ? "Release ready for human review" : "Release blocked",
          description: r.issue_title ? `Issue #${r.issue_number} — ${r.issue_title}` : `Evaluation #${r.id}`,
          repo: r.repository_full_name ?? null,
          issueId: r.issue_id ?? null,
          timestamp: r.created_at,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(merged);
      setStatus("live");
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load activity.");
      }
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const filtered = events.filter((e) => selectedKind === "all" || e.kind === selectedKind);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Engineering Activity
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Chronological feed of patches, tests, security findings, and release evaluations produced
            across all analysis runs.
          </p>
        </div>
        {status === "live" && (
          <span className="font-mono text-xs text-charcoal-700 dark:text-slate-400 bg-cream-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-cream-300 dark:border-slate-800 self-start sm:self-auto shadow-xs">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      {status === "live" && events.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 overflow-x-auto shadow-xs">
          <span className="text-xs font-mono text-charcoal-500 dark:text-slate-400 pl-1 pr-2 hidden sm:inline">Filter:</span>
          {(["all", "patch", "test", "security", "release"] as const).map((kind) => (
            <button
              key={kind}
              onClick={() => setSelectedKind(kind)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors duration-150 whitespace-nowrap ${
                selectedKind === kind
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold shadow-xs"
                  : "text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/70 dark:hover:bg-slate-800 border border-transparent"
              }`}
            >
              {kind === "all" ? "All Events" : KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      )}

      {/* Offline banner */}
      {status === "offline" && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-amber-200">Backend Offline</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
                Start the FastAPI backend on port 8000 to load the activity feed.
              </p>
            </div>
          </div>
          <button onClick={fetchActivity} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Error banner */}
      {status === "error" && (
        <div className="rounded-lg border border-rose-300 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/20 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Activity</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={fetchActivity} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-cream-300/80 dark:border-slate-800/80 bg-cream-100/50 dark:bg-slate-900/40 p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-cream-300/60 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-cream-200 dark:bg-slate-800/60 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {status === "live" && events.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-10 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <ActivityIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">No recent activity yet.</h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            Run <span className="font-mono text-indigo-600 dark:text-indigo-400">Analyze Issue</span> on a tracked issue to populate this feed.
          </p>
          <Link href="/issues" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150">
            Go to Issues
          </Link>
        </div>
      )}

      {/* Timeline */}
      {status === "live" && events.length > 0 && (
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 p-6 space-y-4 shadow-xs">
          <div className="space-y-3 font-mono text-xs">
            {filtered.map((event) => {
              const Icon = KIND_ICON[event.kind];
              return (
                <div key={event.id} className="flex items-start gap-4 p-4 rounded-lg bg-cream-200/50 dark:bg-slate-950/60 border border-cream-300/80 dark:border-slate-800/80 hover:border-cream-400 dark:hover:border-slate-700 transition-colors duration-150">
                  <div className="mt-1">
                    {event.kind === "security" && event.title.includes("critical") ? (
                      <StatusDot status="failed" size="md" />
                    ) : (
                      <StatusDot status="completed" size="md" />
                    )}
                  </div>
                  <Icon className="w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-charcoal-900 dark:text-slate-100 text-sm font-sans">{event.title}</span>
                      <span className="text-[11px] text-charcoal-500 dark:text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-charcoal-700 dark:text-slate-300 font-sans text-xs">{event.description}</p>
                    <div className="pt-2 flex items-center gap-3 text-[11px] text-charcoal-500 dark:text-slate-500">
                      {event.repo && <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{event.repo}</span>}
                      {event.issueId && (
                        <Link href={`/issues/${event.issueId}`} className="hover:underline">
                          View issue &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-charcoal-500 dark:text-slate-500 text-xs font-mono">
                No events matching category &ldquo;{selectedKind}&rdquo;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
