"use client";

import React from "react";
import Link from "next/link";
import { MOCK_TEST_SUITE } from "@/data/mockData";
import { Badge } from "@/components/ui/Badge";
import {
  TestIcon,
  CheckIcon,
  ClockIcon,
  CodeIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@/components/icons";

export default function TestsPage() {
  const suite = MOCK_TEST_SUITE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-charcoal-500 dark:text-slate-400">
            <span>Regression Verification</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400">{suite.repo}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100 mt-1">
            {suite.suiteName}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/patches"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-charcoal-700 dark:text-slate-300 bg-cream-100 dark:bg-slate-800 hover:bg-cream-200 dark:hover:bg-slate-700 rounded-lg border border-cream-300 dark:border-slate-700 shadow-xs transition-colors duration-150"
          >
            <span>Inspect Patch Diff</span>
          </Link>
          <Link
            href="/releases"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-xs transition-colors duration-150"
          >
            <span>Proceed to Release Gate &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
          <span className="text-xs text-charcoal-500 dark:text-slate-500 uppercase">Total Tests</span>
          <div className="text-2xl font-bold text-charcoal-900 dark:text-slate-100 mt-1">{suite.total}</div>
          <span className="text-[11px] text-charcoal-500 dark:text-slate-400">Automated suite</span>
        </div>

        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
          <span className="text-xs text-emerald-700 dark:text-emerald-500 uppercase">Passed</span>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{suite.passed}</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-500/80">100% Passing</span>
        </div>

        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
          <span className="text-xs text-charcoal-500 dark:text-slate-500 uppercase">Execution Time</span>
          <div className="text-2xl font-bold text-charcoal-900 dark:text-slate-100 mt-1">{suite.duration}</div>
          <span className="text-[11px] text-charcoal-500 dark:text-slate-500">Sandbox runtime</span>
        </div>

        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 font-mono shadow-xs">
          <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase">Coverage Delta</span>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{suite.coverageDelta}</div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400/80">Repro test boost</span>
        </div>
      </div>

      {/* 5-Step Validation Progression */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-500 dark:text-slate-400">
          Autonomous 5-Step Sandbox Validation Pipeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {suite.steps.map((step) => (
            <div
              key={step.id}
              className="p-3.5 rounded-lg border border-emerald-300/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/10 space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  Step {step.id}
                </span>
                <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-slate-200 leading-snug">
                {step.name}
              </h4>
              <p className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400 leading-tight">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/80 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-cream-300 dark:border-slate-800 bg-cream-200/50 dark:bg-slate-950/80 px-5 py-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-800 dark:text-slate-300">
            Validated Test Cases
          </h3>
          <span className="text-xs font-mono text-charcoal-500 dark:text-slate-500">
            Sample Suite Execution Data
          </span>
        </div>

        <div className="divide-y divide-cream-300/80 dark:divide-slate-800/80 text-xs font-mono">
          {suite.testCases.map((tc) => (
            <div
              key={tc.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cream-200/40 dark:hover:bg-slate-800/30 transition-colors duration-100"
            >
              <div className="flex items-start sm:items-center gap-3">
                <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal-900 dark:text-slate-100">{tc.name}</span>
                    {tc.isRegressionTest && (
                      <span className="px-2 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-bold">
                        Synthesized Repro Test
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-charcoal-500 dark:text-slate-500">{tc.file}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-charcoal-600 dark:text-slate-400 self-end sm:self-auto">
                <span>{tc.assertions} assertions</span>
                <span className="flex items-center gap-1 text-charcoal-500 dark:text-slate-500">
                  <ClockIcon className="w-3 h-3" />
                  {tc.duration}
                </span>
                <Badge variant="success" size="sm">
                  PASSED
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
