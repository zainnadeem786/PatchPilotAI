"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ReleaseReadinessResponse } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { ReleaseIcon, CheckIcon, AlertIcon, ShieldIcon, ClockIcon } from "@/components/icons";

type Status = "loading" | "live" | "offline" | "error";

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleaseReadinessResponse[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchReleases = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getReleases();
      setReleases(data);
      setStatus("live");
      if (data.length > 0) setExpandedId((prev) => prev ?? data[0].id);
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load release readiness.");
      }
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const readyCount = releases.filter((r) => r.release_ready).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Release Readiness
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Evaluations produced by the Release Agent for each analysis run. PatchPilot never commits,
            pushes, merges, or deploys automatically — human engineering approval is always required.
          </p>
        </div>
        {status === "live" && releases.length > 0 && (
          <div className="p-3 rounded-lg bg-cream-100 dark:bg-slate-900/80 border border-cream-300 dark:border-slate-800 text-right font-mono self-start sm:self-auto shadow-xs">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{readyCount} / {releases.length}</span>
            <span className="block text-[10px] text-charcoal-500 dark:text-slate-400 uppercase">Ready for Review</span>
          </div>
        )}
      </div>

      {/* Offline banner */}
      {status === "offline" && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-amber-200">Backend Offline</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
                Start the FastAPI backend on port 8000 to load release-readiness evaluations.
              </p>
            </div>
          </div>
          <button onClick={fetchReleases} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Releases</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={fetchReleases} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
      {status === "live" && releases.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-10 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <ReleaseIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">No release evaluations yet.</h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            Run <span className="font-mono text-indigo-600 dark:text-indigo-400">Analyze Issue</span> on a tracked issue to produce a release-readiness evaluation.
          </p>
          <Link href="/issues" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150">
            Go to Issues
          </Link>
        </div>
      )}

      {/* Release list */}
      {status === "live" && releases.length > 0 && (
        <div className="space-y-3">
          {releases.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} className={`rounded-lg border overflow-hidden shadow-xs ${
                r.release_ready
                  ? "border-emerald-300/80 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10"
                  : "border-rose-300/80 dark:border-rose-800/40 bg-rose-50/30 dark:bg-rose-950/10"
              }`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.issue_number && <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">#{r.issue_number}</span>}
                      <span className="text-sm font-semibold text-charcoal-900 dark:text-slate-100 truncate">
                        {r.issue_title || `Release evaluation #${r.id}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-charcoal-500 dark:text-slate-400 flex-wrap">
                      {r.repository_full_name && <span>{r.repository_full_name}</span>}
                      <span>&bull;</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 dark:text-slate-500">{r.mode}</span>
                    <Badge variant={r.release_ready ? "success" : "error"} size="sm">
                      {r.release_ready ? "Ready for Human Review" : "Blocked"}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-cream-300/60 dark:border-slate-800/60 space-y-3">
                    <div className="flex items-start gap-2 p-2.5 rounded border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-950/20 text-[11px] font-mono text-violet-800 dark:text-violet-300">
                      <ShieldIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
                      <span><strong>Human engineering approval required.</strong> No automatic commit, push, merge, or deployment will occur.</span>
                    </div>

                    {r.blocking_reasons.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Blocking Reasons ({r.blocking_reasons.length})
                        </span>
                        {r.blocking_reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] font-mono text-rose-700 dark:text-rose-300 p-2 rounded bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                            <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" /><span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.warnings.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Warnings ({r.warnings.length})
                        </span>
                        {r.warnings.map((w, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] font-mono text-amber-700 dark:text-amber-300 p-2 rounded bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/30">
                            <ClockIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" /><span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.gate_checks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                          Gate Checks
                        </span>
                        {r.gate_checks.map((g, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded border border-cream-200 dark:border-slate-800 bg-cream-50/60 dark:bg-slate-950/40">
                            {g.severity === "info" ? (
                              <CheckIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                            ) : (
                              <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-semibold text-charcoal-800 dark:text-slate-200 block">{g.title}</span>
                              <p className="text-[11px] text-charcoal-600 dark:text-slate-400 mt-0.5 font-mono leading-relaxed">{g.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.issue_id && (
                      <Link href={`/issues/${r.issue_id}`} className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                        View full issue analysis &rarr;
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
