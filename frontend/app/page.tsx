"use client";

import React from "react";
import Link from "next/link";
import {
  MOCK_REPOSITORIES,
  MOCK_ISSUES,
  MOCK_RELEASE_CANDIDATE,
  MOCK_ACTIVITY,
} from "@/data/mockData";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { HealthStatus } from "@/components/HealthStatus";
import {
  RepoIcon,
  IssueIcon,
  AgentIcon,
  PatchIcon,
  CheckIcon,
  ArrowRightIcon,
  ShieldIcon,
  BranchIcon,
  AlertIcon,
} from "@/components/icons";

export default function OverviewPage() {
  const primaryIssue = MOCK_ISSUES[0]; // Issue #142

  return (
    <div className="space-y-6">
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
              href="/issues/142"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 font-mono"
            >
              <span>Investigate #142</span>
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

        {/* Workflow Lifecycle Sequence */}
        <div className="mt-4 pt-4 border-t border-cream-300/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-[11px] font-mono">
          {[
            { step: "1. Issue", state: "done" },
            { step: "2. AST Mapping", state: "done" },
            { step: "3. Root Cause", state: "done" },
            { step: "4. Coordination", state: "done" },
            { step: "5. Patch", state: "done" },
            { step: "6. Tests", state: "done" },
            { step: "7. Security", state: "done" },
            { step: "8. Sign-off", state: "active" },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`py-1 px-2 rounded border text-center transition-colors duration-150 ${
                item.state === "active"
                  ? "border-indigo-500/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "border-cream-300 dark:border-slate-800/80 bg-cream-50 dark:bg-slate-950/60 text-charcoal-500 dark:text-slate-400"
              }`}
            >
              {item.step}
            </div>
          ))}
        </div>
      </div>

      {/* Compact Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-slate-400 text-xs">
            <span className="font-mono text-[11px] uppercase">Repositories</span>
            <RepoIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-charcoal-900 dark:text-slate-100">4</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">100% Indexed</span>
          </div>
        </div>

        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-slate-400 text-xs">
            <span className="font-mono text-[11px] uppercase">Open Issues</span>
            <IssueIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-charcoal-900 dark:text-slate-100">12</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium font-mono">1 Patch Ready</span>
          </div>
        </div>

        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-slate-400 text-xs">
            <span className="font-mono text-[11px] uppercase">Agent Fleet</span>
            <AgentIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-charcoal-900 dark:text-slate-100">7</span>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium font-mono">Specialized</span>
          </div>
        </div>

        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between text-charcoal-500 dark:text-slate-400 text-xs">
            <span className="font-mono text-[11px] uppercase">Release Gates</span>
            <ShieldIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-charcoal-900 dark:text-slate-100">4 / 5</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">Cleared</span>
          </div>
        </div>
      </div>

      {/* Active Workflows Section */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-charcoal-700 dark:text-slate-300">
            Active Engineering Workflows
          </h3>
          <Link
            href="/issues"
            className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors duration-150"
          >
            <span>View All</span>
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>

        {/* Primary Workflow Row */}
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/70 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">#142</span>
              <Link
                href="/issues/142"
                className="text-sm font-semibold text-charcoal-900 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150"
              >
                Checkout returns 500 when coupon is expired
              </Link>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono text-charcoal-500 dark:text-slate-400">acme-store-api</span>
              <SeverityBadge severity="high" />
              <Badge variant="success" size="sm">
                Patch Synthesized
              </Badge>
            </div>
          </div>

          {/* Compact Agent Progress Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="text-charcoal-700 dark:text-slate-300">Explorer</span>
              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="p-2 rounded border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="text-charcoal-700 dark:text-slate-300">Debug (92%)</span>
              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="p-2 rounded border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="text-charcoal-700 dark:text-slate-300">Security</span>
              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
              <span className="text-amber-800 dark:text-amber-300">Validation (28/28)</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-cream-300/80 dark:border-slate-900 text-xs text-charcoal-500 dark:text-slate-400">
            <span className="truncate max-w-xl font-mono text-[11px]">
              Root Cause: Expired coupon object passed directly into discount calculation without datetime validation.
            </span>
            <Link
              href="/patches"
              className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium shrink-0 transition-colors duration-150"
            >
              Inspect Diff &rarr;
            </Link>
          </div>
        </div>

        {/* Secondary Workflow Row */}
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-50/70 dark:bg-slate-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">#89</span>
            <div>
              <span className="text-charcoal-900 dark:text-slate-200 font-medium">
                Stripe webhook replay causes duplicate ledger entries
              </span>
              <span className="text-charcoal-400 dark:text-slate-500 block font-mono text-[11px]">
                payment-service &bull; branch: main
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <SeverityBadge severity="critical" />
            <Badge variant="warning" size="sm">
              Debug Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Two Columns: Release Gates & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Release Readiness Column */}
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-charcoal-700 dark:text-slate-300">
                Release Candidate
              </h3>
              <Badge variant="success" size="sm">Ready for Review</Badge>
            </div>

            <div className="space-y-0.5 mb-3">
              <span className="text-xs font-mono font-semibold text-charcoal-900 dark:text-slate-200 block truncate">
                {MOCK_RELEASE_CANDIDATE.version}
              </span>
              <span className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400 block">
                {MOCK_RELEASE_CANDIDATE.repo} &bull; {MOCK_RELEASE_CANDIDATE.branch}
              </span>
            </div>

            {/* Quality Gates Checklist */}
            <div className="space-y-1.5 pt-1">
              {MOCK_RELEASE_CANDIDATE.gates.map((gate) => (
                <div
                  key={gate.id}
                  className="flex items-center justify-between p-2 rounded border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/50 text-xs font-mono"
                >
                  <span className="text-charcoal-700 dark:text-slate-300">{gate.name}</span>
                  {gate.status === "passed" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckIcon className="w-3 h-3" />
                      Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <AlertIcon className="w-3 h-3" />
                      Warning
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-cream-300/80 dark:border-slate-800">
            <Link
              href="/releases"
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md transition-colors duration-150"
            >
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
            <Link
              href="/activity"
              className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline transition-colors duration-150"
            >
              Full Log &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {MOCK_ACTIVITY.slice(0, 4).map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-2.5 p-2.5 rounded border border-cream-300 dark:border-slate-800/80 bg-cream-50 dark:bg-slate-950/50 text-xs"
              >
                <div className="mt-1">
                  <StatusDot status="completed" size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-charcoal-900 dark:text-slate-200 truncate">
                      {act.title}
                    </span>
                    <span className="font-mono text-[11px] text-charcoal-400 dark:text-slate-500 shrink-0">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="text-charcoal-500 dark:text-slate-400 text-xs truncate mt-0.5">
                    {act.description}
                  </p>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border border-cream-300 dark:border-slate-800 bg-cream-100 dark:bg-slate-900 text-charcoal-600 dark:text-slate-400 hidden sm:inline-block shrink-0">
                  {act.agentName}
                </span>
              </div>
            ))}
          </div>

          {/* Phase 1 Backend Health Check widget */}
          <div className="pt-2">
            <HealthStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
