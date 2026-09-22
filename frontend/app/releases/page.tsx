"use client";

import React, { useState } from "react";
import { MOCK_RELEASE_CANDIDATE } from "@/data/mockData";
import { Badge } from "@/components/ui/Badge";
import {
  ReleaseIcon,
  CheckIcon,
  AlertIcon,
  BranchIcon,
  ShieldIcon,
  ArrowRightIcon,
  ClockIcon,
} from "@/components/icons";

export default function ReleasesPage() {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const rc = MOCK_RELEASE_CANDIDATE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cream-200 dark:bg-slate-800 text-charcoal-700 dark:text-slate-400 font-mono text-[11px] mb-1 border border-cream-300 dark:border-slate-700">
            <span>Sample Release Gatekeeper Workspace</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Autonomous Release Readiness Evaluation
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Evaluating multi-gate engineering verification before promoting synthesized patches to production branches.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleAction("Changes requested on release candidate. Flagged for agent review (Simulated)")}
            className="px-3.5 py-2 text-xs font-mono font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-800/60 shadow-xs transition-colors duration-150"
          >
            Request Changes
          </button>
          <button
            onClick={() => handleAction("Release candidate approved. Ready for CI/CD staging pipeline (Simulated)")}
            className="px-4 py-2 text-xs font-mono font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-xs transition-colors duration-150 flex items-center gap-1.5"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Approve Release</span>
          </button>
        </div>
      </div>

      {/* Local Feedback Banner */}
      {feedback && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/90 dark:bg-indigo-950/60 p-4 text-xs font-mono text-indigo-800 dark:text-indigo-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
            <span>{feedback}</span>
          </div>
          <span className="text-[11px] text-charcoal-500 dark:text-slate-500">Local Presentation Action</span>
        </div>
      )}

      {/* Main Release Banner */}
      <div className="rounded-lg border border-emerald-300/80 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gatekeeper Status: Ready For Review</span>
            </div>
            <h3 className="text-xl font-extrabold text-charcoal-900 dark:text-slate-100 font-mono">
              {rc.version}
            </h3>
            <p className="text-xs text-charcoal-600 dark:text-slate-400 font-mono">
              Repository: <span className="text-charcoal-900 dark:text-slate-200 font-semibold">{rc.repo}</span> &bull; Base Branch: <span className="text-charcoal-900 dark:text-slate-200 font-semibold">{rc.branch}</span>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-cream-100 dark:bg-slate-900/80 border border-cream-300 dark:border-slate-800 text-right font-mono self-start sm:self-auto shadow-xs">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">4 / 5</span>
            <span className="block text-[10px] text-charcoal-500 dark:text-slate-400 uppercase">Gates Cleared</span>
          </div>
        </div>

        <p className="text-xs text-charcoal-700 dark:text-slate-300 font-mono leading-relaxed pt-2 border-t border-emerald-200/80 dark:border-slate-800/80">
          {rc.summary}
        </p>
      </div>

      {/* Quality Verification Gates */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-charcoal-500 dark:text-slate-400 font-semibold">
          Verification Quality Gates
        </h3>

        <div className="space-y-2.5">
          {rc.gates.map((gate) => {
            const isPassed = gate.status === "passed";
            return (
              <div
                key={gate.id}
                className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs hover:border-cream-400 dark:hover:border-slate-700 shadow-xs transition-colors duration-150"
              >
                <div className="flex items-start sm:items-center gap-3">
                  {isPassed ? (
                    <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      <CheckIcon className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      <AlertIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <span className="text-charcoal-900 dark:text-slate-100 font-bold">{gate.name}</span>
                    <p className="text-charcoal-600 dark:text-slate-400 text-xs font-sans mt-0.5">{gate.detail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-[11px] text-charcoal-500 dark:text-slate-500">
                    Evaluated by {gate.evaluator}
                  </span>
                  <Badge variant={isPassed ? "success" : "warning"} size="sm">
                    {gate.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Release Changelog */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-5 space-y-3 font-mono text-xs shadow-xs">
        <h4 className="text-xs uppercase font-bold text-charcoal-500 dark:text-slate-400 tracking-wider">
          Synthesized Release Changelog
        </h4>
        <ul className="space-y-2">
          {rc.changelog.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-charcoal-700 dark:text-slate-300">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">&bull;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
