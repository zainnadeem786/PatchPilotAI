"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { SecurityFindingResponse } from "@/types/api";
import { SeverityLevel } from "@/types/domain";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Badge } from "@/components/ui/Badge";
import { SecurityIcon, AlertIcon, CodeIcon, ChevronIcon } from "@/components/icons";

type Status = "loading" | "live" | "offline" | "error";

function isSeverity(s: string): s is SeverityLevel {
  return ["critical", "high", "medium", "low", "info"].includes(s);
}

export default function SecurityPage() {
  const [findings, setFindings] = useState<SecurityFindingResponse[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | SeverityLevel>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchFindings = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getSecurityFindings();
      setFindings(data);
      setStatus("live");
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load security findings.");
      }
    }
  }, []);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const counts: Record<SeverityLevel, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (isSeverity(f.severity)) counts[f.severity]++;
  }
  const blockingCount = findings.filter((f) => f.blocking).length;

  const filtered = findings.filter((f) => severityFilter === "all" || f.severity === severityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Security & Static Analysis Findings
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Findings from the Security Audit Agent. Severity and blocking status are always derived from
            the deterministic CWE/OWASP regex screen, never from LLM narrative text alone.
          </p>
        </div>

        {status === "live" && findings.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <Badge variant={blockingCount > 0 ? "error" : "success"}>
              {blockingCount} Blocking
            </Badge>
            <Badge variant="warning">{counts.high} High</Badge>
          </div>
        )}
      </div>

      {/* Severity filter tabs */}
      {status === "live" && findings.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 overflow-x-auto shadow-xs">
          <span className="text-xs font-mono text-charcoal-500 dark:text-slate-400 pl-1 pr-2 hidden sm:inline">Severity Filter:</span>
          {([
            { id: "all", label: `All Findings (${findings.length})` },
            { id: "critical", label: `Critical (${counts.critical})` },
            { id: "high", label: `High (${counts.high})` },
            { id: "medium", label: `Medium (${counts.medium})` },
            { id: "low", label: `Low (${counts.low})` },
            { id: "info", label: `Info (${counts.info})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeverityFilter(tab.id as typeof severityFilter)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors duration-150 whitespace-nowrap ${
                severityFilter === tab.id
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold shadow-xs"
                  : "text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/70 dark:hover:bg-slate-800 border border-transparent"
              }`}
            >
              {tab.label}
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
                Start the FastAPI backend on port 8000 to load persisted security findings.
              </p>
            </div>
          </div>
          <button onClick={fetchFindings} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Security Findings</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={fetchFindings} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
      {status === "live" && findings.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-10 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <SecurityIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">No security findings.</h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            Run <span className="font-mono text-indigo-600 dark:text-indigo-400">Analyze Issue</span> on a tracked issue to run a security audit.
          </p>
          <Link href="/issues" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150">
            Go to Issues
          </Link>
        </div>
      )}

      {/* Findings list */}
      {status === "live" && findings.length > 0 && (
        <div className="space-y-4">
          {filtered.map((finding) => {
            const isExpanded = expandedId === finding.id;
            const severity = isSeverity(finding.severity) ? finding.severity : "info";
            return (
              <div key={finding.id} className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 overflow-hidden shadow-xs transition-colors duration-150">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-cream-200/40 dark:hover:bg-slate-800/40 transition-colors duration-150"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <SeverityBadge severity={severity} />
                    <div>
                      <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100">{finding.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono text-charcoal-600 dark:text-slate-400 flex-wrap">
                        {finding.repository_full_name && <span className="text-charcoal-800 dark:text-slate-300">{finding.repository_full_name}</span>}
                        {finding.issue_number && (<><span>&bull;</span><span>Issue #{finding.issue_number}</span></>)}
                        {finding.affected_area && (<><span>&bull;</span><span>{finding.affected_area}</span></>)}
                        <span>&bull;</span>
                        <span className="text-charcoal-500 dark:text-slate-500">{new Date(finding.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Badge variant={finding.blocking ? "error" : "neutral"} size="sm">
                      {finding.blocking ? "Blocking" : "Non-blocking"}
                    </Badge>
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 dark:text-slate-500">{finding.mode}</span>
                    <ChevronIcon direction={isExpanded ? "up" : "down"} className="w-4 h-4 text-charcoal-400 dark:text-slate-500 transition-transform duration-150" />
                  </div>
                </div>

                {isExpanded && finding.detail && (
                  <div className="p-5 border-t border-cream-300 dark:border-slate-800/80 bg-cream-200/30 dark:bg-slate-950/60 space-y-2 text-xs font-mono">
                    <span className="text-charcoal-500 dark:text-slate-500 block uppercase text-[11px] mb-1 font-bold flex items-center gap-1.5">
                      <CodeIcon className="w-3 h-3" /> Detail
                    </span>
                    <p className="text-charcoal-800 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">{finding.detail}</p>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-10 text-center border border-dashed border-cream-300 dark:border-slate-800 rounded-lg text-charcoal-500 dark:text-slate-500 text-xs font-mono bg-cream-100/40 dark:bg-transparent">
              No findings matching severity &ldquo;{severityFilter}&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
