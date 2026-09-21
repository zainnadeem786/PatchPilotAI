"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { MOCK_ISSUES } from "@/data/mockData";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Badge } from "@/components/ui/Badge";
import {
  PatchIcon,
  TestIcon,
  CheckIcon,
  BranchIcon,
  SparklesIcon,
  CodeIcon,
} from "@/components/icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function IssueDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const issue =
    MOCK_ISSUES.find((i) => i.number.toString() === resolvedParams.id) ||
    MOCK_ISSUES[0];

  const [activeTab, setActiveTab] = useState<"summary" | "stacktrace" | "agents">("summary");

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-charcoal-500 dark:text-slate-400">
          <Link href="/issues" className="hover:text-charcoal-900 dark:hover:text-slate-200 transition-colors duration-150">
            Issues
          </Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-slate-200 font-semibold">#{issue.number}</span>
          <span>&bull;</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{issue.repo}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/patches"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150"
          >
            <PatchIcon className="w-3.5 h-3.5" />
            <span>Review Patch</span>
          </Link>
          <Link
            href="/tests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-charcoal-700 dark:text-slate-300 bg-cream-100 dark:bg-slate-800 hover:bg-cream-200 dark:hover:bg-slate-700 rounded-md border border-cream-300 dark:border-slate-700 transition-colors duration-150"
          >
            <TestIcon className="w-3.5 h-3.5" />
            <span>Tests</span>
          </Link>
        </div>
      </div>

      {/* Main Issue Header Card */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/60 p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                #{issue.number}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-charcoal-900 dark:text-slate-100">
                {issue.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-charcoal-700 dark:text-slate-300">
                <BranchIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-500" />
                {issue.branch}
              </span>
              <span>&bull;</span>
              <span>By {issue.author}</span>
              <span>&bull;</span>
              <span>{issue.createdAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start">
            <SeverityBadge severity={issue.severity} />
            <Badge variant="success" size="sm">Patch Ready</Badge>
          </div>
        </div>

        <div className="pt-2.5 border-t border-cream-300/80 dark:border-slate-800/80">
          <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-charcoal-400 dark:text-slate-500 mb-1">
            Problem Description
          </h4>
          <p className="text-xs text-charcoal-700 dark:text-slate-300 leading-relaxed font-sans">
            {issue.description}
          </p>
        </div>
      </div>

      {/* Investigation Details Tabs */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/50 dark:bg-slate-900/50 overflow-hidden">
        <div className="flex items-center border-b border-cream-300 dark:border-slate-800 bg-cream-100 dark:bg-slate-950/80 px-3 text-xs font-mono">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-2.5 border-b-2 font-medium transition-colors duration-150 ${
              activeTab === "summary"
                ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300 font-semibold"
                : "border-transparent text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200"
            }`}
          >
            Root Cause Analysis
          </button>
          <button
            onClick={() => setActiveTab("stacktrace")}
            className={`px-3 py-2.5 border-b-2 font-medium transition-colors duration-150 ${
              activeTab === "stacktrace"
                ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300 font-semibold"
                : "border-transparent text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200"
            }`}
          >
            Stack Trace
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-3 py-2.5 border-b-2 font-medium transition-colors duration-150 ${
              activeTab === "agents"
                ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300 font-semibold"
                : "border-transparent text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200"
            }`}
          >
            Agent Diagnostics Trail
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "summary" && issue.investigation && (
            <div className="space-y-4">
              {/* Root Cause Banner */}
              <div className="rounded-md border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Isolated Root Cause
                  </span>
                  <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-semibold">
                    Confidence: {issue.investigation.confidence}%
                  </div>
                </div>
                <p className="text-xs text-charcoal-800 dark:text-slate-200 leading-relaxed font-mono">
                  {issue.investigation.rootCause}
                </p>
              </div>

              {/* Evidence & Affected Files Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Evidence Panel */}
                <div className="rounded-md border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 p-3.5 space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                    Telemetry Evidence
                  </h4>
                  <ul className="space-y-1.5 text-xs text-charcoal-700 dark:text-slate-300 font-mono text-[11px]">
                    {issue.investigation.evidence.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">&bull;</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Affected Code Files */}
                <div className="rounded-md border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 p-3.5 space-y-2">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                    Affected Repository Files
                  </h4>
                  <div className="space-y-1.5">
                    {issue.investigation.affectedFiles.map((file) => (
                      <div
                        key={file}
                        className="flex items-center justify-between p-1.5 rounded border border-cream-300 dark:border-slate-800 bg-cream-100 dark:bg-slate-900 text-xs font-mono"
                      >
                        <span className="text-charcoal-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
                          <CodeIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-500" />
                          {file}
                        </span>
                        <Link
                          href="/patches"
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline transition-colors duration-150"
                        >
                          Diff &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Suggested Fix */}
              <div className="rounded-md border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 p-3.5 space-y-1.5">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                  Synthesized Resolution Strategy
                </h4>
                <p className="text-xs text-charcoal-700 dark:text-slate-300 font-mono leading-relaxed">
                  {issue.investigation.suggestedFix}
                </p>
              </div>
            </div>
          )}

          {activeTab === "stacktrace" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
                <span>Ingested Error Telemetry</span>
                <span>Python 3.13 / FastAPI</span>
              </div>
              <pre className="p-3.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-[#0d1117] font-mono text-xs text-rose-300 overflow-x-auto leading-relaxed">
                {issue.stackTrace}
              </pre>
            </div>
          )}

          {activeTab === "agents" && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 flex items-start gap-2.5">
                <CheckIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-charcoal-900 dark:text-slate-200">Explorer Agent (14s):</span>
                  <p className="text-charcoal-600 dark:text-slate-400 mt-0.5 font-sans">
                    Traced symbol dependencies from checkout endpoint down to CouponService. Isolated unhandled exception branch.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 flex items-start gap-2.5">
                <CheckIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-charcoal-900 dark:text-slate-200">Debug Agent (28s):</span>
                  <p className="text-charcoal-600 dark:text-slate-400 mt-0.5 font-sans">
                    Correlated Sentry error stack with checkout transaction rollback. Confidence score calculated at 92%.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 flex items-start gap-2.5">
                <CheckIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-charcoal-900 dark:text-slate-200">Fix Agent (35s):</span>
                  <p className="text-charcoal-600 dark:text-slate-400 mt-0.5 font-sans">
                    Generated surgical diff adding coupon.is_expired() guard condition with graceful fallback.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
