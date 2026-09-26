"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RegressionTestResponse } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import {
  TestIcon,
  AlertIcon,
  ClockIcon,
} from "@/components/icons";

type Status = "loading" | "live" | "offline" | "error";

export default function TestsPage() {
  const [tests, setTests] = useState<RegressionTestResponse[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchTests = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getRegressionTests();
      setTests(data);
      setStatus("live");
      if (data.length > 0) setExpandedId((prev) => prev ?? data[0].id);
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load tests.");
      }
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const generatedCount = tests.filter((t) => t.status === "Generated").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
              Regression Tests
            </h2>
            {status === "live" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live API
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            PatchPilot-generated regression test artifacts. These are the Regression Test Synthesis
            Agent&apos;s own outputs — not backend pytest suite results.
          </p>
        </div>
      </div>

      {/* Summary */}
      {status === "live" && tests.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
            <span className="text-xs text-charcoal-500 dark:text-slate-500 uppercase">Total Artifacts</span>
            <div className="text-2xl font-bold text-charcoal-900 dark:text-slate-100 mt-1">{tests.length}</div>
          </div>
          <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase">Generated</span>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{generatedCount}</div>
          </div>
          <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
            <span className="text-xs text-amber-600 dark:text-amber-400 uppercase">Executed</span>
            <div className="text-2xl font-bold text-charcoal-900 dark:text-slate-100 mt-1">0</div>
            <span className="text-[11px] text-charcoal-500 dark:text-slate-500">PatchPilot never runs generated tests</span>
          </div>
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
                Start the FastAPI backend on port 8000 to load persisted regression tests.
              </p>
            </div>
          </div>
          <button onClick={fetchTests} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Tests</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={fetchTests} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
      {status === "live" && tests.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-10 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <TestIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">No tests generated yet.</h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            Run <span className="font-mono text-indigo-600 dark:text-indigo-400">Analyze Issue</span> on a tracked issue to generate a regression test.
          </p>
          <Link href="/issues" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150">
            Go to Issues
          </Link>
        </div>
      )}

      {/* Test list */}
      {status === "live" && tests.length > 0 && (
        <div className="space-y-3">
          {tests.map((t) => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cream-200/40 dark:hover:bg-slate-800/40 transition-colors duration-150"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.issue_number && (
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">#{t.issue_number}</span>
                      )}
                      <span className="text-sm font-semibold text-charcoal-900 dark:text-slate-100 truncate">
                        {t.purpose || t.issue_title || `Test #${t.id}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-charcoal-500 dark:text-slate-400 flex-wrap">
                      {t.repository_full_name && <span>{t.repository_full_name}</span>}
                      {t.test_file && (<><span>&bull;</span><span>{t.test_file}</span></>)}
                      <span>&bull;</span>
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 dark:text-slate-500">{t.mode}</span>
                    <Badge variant={t.status === "Generated" ? "info" : "neutral"} size="sm">{t.status}</Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-cream-300 dark:border-slate-800/80 bg-cream-200/30 dark:bg-slate-950/60 space-y-3">
                    <div className="flex items-start gap-2 p-2.5 rounded border border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-950/20 text-[11px] font-mono text-sky-800 dark:text-sky-300">
                      <ClockIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                      <span><strong>{t.execution_status}.</strong> This test has not been run by PatchPilot.</span>
                    </div>

                    {t.reproduction_scenario && (
                      <div className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400">
                        <span className="uppercase text-[10px] font-bold text-charcoal-400 dark:text-slate-500 block mb-0.5">Reproduction Scenario</span>
                        {t.reproduction_scenario}
                      </div>
                    )}
                    {t.expected_behavior && (
                      <div className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400">
                        <span className="uppercase text-[10px] font-bold text-charcoal-400 dark:text-slate-500 block mb-0.5">Expected Behavior</span>
                        {t.expected_behavior}
                      </div>
                    )}

                    {t.test_code ? (
                      <pre className="p-3.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-[#0d1117] font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-96">
                        {t.test_code}
                      </pre>
                    ) : (
                      <p className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400">No test code was generated.</p>
                    )}

                    {t.issue_id && (
                      <Link href={`/issues/${t.issue_id}`} className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
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
