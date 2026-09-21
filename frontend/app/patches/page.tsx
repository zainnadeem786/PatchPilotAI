"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_PATCH } from "@/data/mockData";
import { DiffViewer } from "@/components/diff/DiffViewer";
import { Badge } from "@/components/ui/Badge";
import {
  PatchIcon,
  CheckIcon,
  AlertIcon,
  BranchIcon,
  TestIcon,
  ArrowRightIcon,
} from "@/components/icons";

export default function PatchesPage() {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback(null);
    }, 3500);
  };

  const totalAdditions = MOCK_PATCH.filesChanged.reduce(
    (acc, f) => acc + f.additions,
    0
  );
  const totalDeletions = MOCK_PATCH.filesChanged.reduce(
    (acc, f) => acc + f.deletions,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-charcoal-500 dark:text-slate-400">
            <span>Patch Review</span>
            <span>/</span>
            <Link href="/issues/142" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Issue #{MOCK_PATCH.issueNumber}
            </Link>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100 mt-1">
            {MOCK_PATCH.title}
          </h2>
        </div>

        {/* Local Mock Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleAction("Tests queued in local sandbox container (Simulated)")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-charcoal-700 dark:text-slate-300 bg-cream-100 dark:bg-slate-800 hover:bg-cream-200 dark:hover:bg-slate-700 rounded-lg border border-cream-300 dark:border-slate-700 shadow-xs transition-colors duration-150"
          >
            <TestIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Run Tests</span>
          </button>
          <button
            onClick={() => handleAction("Changes requested. Issue flagged for agent re-prompting (Simulated)")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-800/60 shadow-xs transition-colors duration-150"
          >
            <AlertIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Request Changes</span>
          </button>
          <button
            onClick={() => handleAction("Patch accepted locally. Ready for release staging (Simulated)")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-xs transition-colors duration-150"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span>Accept Patch</span>
          </button>
        </div>
      </div>

      {/* Local Action Feedback Toast */}
      {actionFeedback && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/90 dark:bg-indigo-950/50 p-4 text-xs font-mono text-indigo-800 dark:text-indigo-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
            <span>{actionFeedback}</span>
          </div>
          <span className="text-[11px] text-charcoal-500 dark:text-slate-500">Local UI State</span>
        </div>
      )}

      {/* Patch Metadata Card */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 p-5 space-y-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-charcoal-500 dark:text-slate-500 block text-[11px] uppercase">Target Repository</span>
            <span className="text-charcoal-900 dark:text-slate-200 font-semibold mt-0.5 block">{MOCK_PATCH.repo}</span>
          </div>
          <div>
            <span className="text-charcoal-500 dark:text-slate-500 block text-[11px] uppercase">Source Branch</span>
            <span className="text-indigo-600 dark:text-indigo-300 font-semibold mt-0.5 block flex items-center gap-1 truncate">
              <BranchIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-500 shrink-0" />
              {MOCK_PATCH.branch}
            </span>
          </div>
          <div>
            <span className="text-charcoal-500 dark:text-slate-500 block text-[11px] uppercase">Risk Assessment</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 block uppercase">
              {MOCK_PATCH.riskLevel} Risk (Surgical)
            </span>
          </div>
          <div>
            <span className="text-charcoal-500 dark:text-slate-500 block text-[11px] uppercase">Validation Status</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 block flex items-center gap-1">
              <CheckIcon className="w-3.5 h-3.5" />
              Validated (28/28 tests)
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-cream-300/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <p className="text-charcoal-700 dark:text-slate-400 leading-relaxed max-w-2xl">
            {MOCK_PATCH.summary}
          </p>
          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <span className="text-charcoal-600 dark:text-slate-400">{MOCK_PATCH.filesChanged.length} files modified</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{totalAdditions}</span>
            <span className="text-rose-700 dark:text-rose-400 font-bold">-{totalDeletions}</span>
          </div>
        </div>
      </div>

      {/* Unified Diff Viewer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-charcoal-500 dark:text-slate-400 font-semibold">
            Unified Code Diff
          </h3>
          <Link
            href="/tests"
            className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors duration-150"
          >
            <span>View Synthesized Regression Tests</span>
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>

        <DiffViewer files={MOCK_PATCH.filesChanged} />
      </div>
    </div>
  );
}
