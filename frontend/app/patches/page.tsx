"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PatchResponse } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import {
  PatchIcon,
  AlertIcon,
  CopyIcon,
  CheckIcon,
  ClockIcon,
} from "@/components/icons";

type Status = "loading" | "live" | "offline" | "error";

const STATUS_BADGE: Record<string, "success" | "warning" | "info" | "neutral" | "error"> = {
  Draft: "neutral",
  Generated: "info",
  "Needs Review": "warning",
  Approved: "success",
  Rejected: "error",
};

function InlineDiff({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <div className="overflow-x-auto max-h-96 font-mono text-xs leading-relaxed bg-[#0d1117] rounded-md border border-slate-800">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            const isAdd = line.startsWith("+") && !line.startsWith("+++");
            const isDel = line.startsWith("-") && !line.startsWith("---");
            const isHdr = line.startsWith("@@");
            let rowCls = "text-slate-300";
            let prefCls = "text-slate-600 select-none";
            if (isAdd) { rowCls = "bg-emerald-950/40 text-emerald-300"; prefCls = "text-emerald-500 font-bold select-none"; }
            else if (isDel) { rowCls = "bg-rose-950/40 text-rose-300"; prefCls = "text-rose-500 font-bold select-none"; }
            else if (isHdr) { rowCls = "bg-indigo-950/30 text-indigo-300/80 italic"; prefCls = "text-indigo-400 select-none"; }
            return (
              <tr key={idx} className={rowCls}>
                <td className="w-10 px-2 py-0.5 text-right text-[11px] text-slate-600 select-none border-r border-slate-800/60">{idx + 1}</td>
                <td className="w-5 px-1 py-0.5 text-center"><span className={prefCls}>{isAdd ? "+" : isDel ? "-" : " "}</span></td>
                <td className="px-2.5 py-0.5 whitespace-pre">{line.slice(isAdd || isDel ? 1 : 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      type="button"
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 border border-cream-300 dark:border-slate-700 rounded bg-cream-50 dark:bg-slate-900 transition-colors duration-150"
    >
      {copied ? <CheckIcon className="w-3 h-3 text-emerald-500" /> : <CopyIcon className="w-3 h-3" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function PatchesPage() {
  const [patches, setPatches] = useState<PatchResponse[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchPatches = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getPatches();
      setPatches(data);
      setStatus("live");
      if (data.length > 0) setExpandedId((prev) => prev ?? data[0].id);
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load patches.");
      }
    }
  }, []);

  useEffect(() => {
    fetchPatches();
  }, [fetchPatches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
              Patch Review
            </h2>
            {status === "live" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live API
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Patch proposals produced by the Patch Synthesis Agent across all analysis runs. Proposals only —
            nothing is applied, committed, or pushed automatically.
          </p>
        </div>
      </div>

      {/* Offline banner */}
      {status === "offline" && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-amber-200">Backend Offline</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
                Start the FastAPI backend on port 8000 to load persisted patches.
              </p>
            </div>
          </div>
          <button onClick={fetchPatches} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Patches</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={fetchPatches} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
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
      {status === "live" && patches.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-10 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <PatchIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">No patches generated yet.</h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            Run <span className="font-mono text-indigo-600 dark:text-indigo-400">Analyze Issue</span> on a tracked issue to generate a patch proposal.
          </p>
          <Link href="/issues" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150">
            Go to Issues
          </Link>
        </div>
      )}

      {/* Patch list */}
      {status === "live" && patches.length > 0 && (
        <div className="space-y-3">
          {patches.map((patch) => {
            const isExpanded = expandedId === patch.id;
            return (
              <div key={patch.id} className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : patch.id)}
                  className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cream-200/40 dark:hover:bg-slate-800/40 transition-colors duration-150"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {patch.issue_number && (
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">#{patch.issue_number}</span>
                      )}
                      <span className="text-sm font-semibold text-charcoal-900 dark:text-slate-100 truncate">
                        {patch.issue_title || patch.summary || `Patch #${patch.id}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-charcoal-500 dark:text-slate-400 flex-wrap">
                      {patch.repository_full_name && <span>{patch.repository_full_name}</span>}
                      <span>&bull;</span>
                      <span>{patch.files_changed.length} file(s)</span>
                      <span>&bull;</span>
                      <span>{new Date(patch.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 dark:text-slate-500">{patch.mode}</span>
                    <Badge variant={STATUS_BADGE[patch.status] ?? "neutral"} size="sm">{patch.status}</Badge>
                    <Badge variant="neutral" size="sm">{patch.review_status}</Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-cream-300 dark:border-slate-800/80 bg-cream-200/30 dark:bg-slate-950/60 space-y-3">
                    {patch.summary && (
                      <p className="text-xs text-charcoal-700 dark:text-slate-300 font-sans leading-relaxed">{patch.summary}</p>
                    )}
                    {patch.reasoning && (
                      <div className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400">
                        <span className="uppercase text-[10px] font-bold text-charcoal-400 dark:text-slate-500 block mb-0.5">Reasoning</span>
                        {patch.reasoning}
                      </div>
                    )}
                    {patch.files_changed.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-charcoal-400 dark:text-slate-500">Files changed</span>
                        {patch.files_changed.map((f) => (
                          <div key={f} className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300">{f}</div>
                        ))}
                      </div>
                    )}
                    {patch.risks.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400">Risks</span>
                        {patch.risks.map((r, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] font-mono text-amber-700 dark:text-amber-300">
                            <AlertIcon className="w-3 h-3 shrink-0 mt-0.5" /><span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-2.5 rounded border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                      <ClockIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span><strong>AI-generated proposal.</strong> Not applied, committed, or pushed. Human review required.</span>
                    </div>

                    {patch.unified_diff ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">Unified Diff</span>
                          <CopyButton text={patch.unified_diff} />
                        </div>
                        <InlineDiff diff={patch.unified_diff} />
                      </div>
                    ) : (
                      <p className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
                        No diff was generated for this patch (static mode, or the model returned an unstructured response).
                      </p>
                    )}

                    {patch.issue_id && (
                      <Link href={`/issues/${patch.issue_id}`} className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
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
