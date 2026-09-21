"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_ISSUES } from "@/data/mockData";
import { IssueStatus } from "@/types/domain";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Badge } from "@/components/ui/Badge";
import {
  SearchIcon,
  BranchIcon,
  SparklesIcon,
} from "@/components/icons";

export default function IssuesPage() {
  const [activeTab, setActiveTab] = useState<"all" | IssueStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIssues = MOCK_ISSUES.filter((issue) => {
    const matchesTab = activeTab === "all" || issue.status === activeTab;
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.number.toString().includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Issue Triage & Diagnosis
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 mt-0.5">
            Ingested issue telemetry and bugs analyzed by autonomous diagnosis agents.
          </p>
        </div>

        <Link
          href="/issues/142"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Inspect Active #142</span>
        </Link>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Issues", count: MOCK_ISSUES.length },
            { id: "patch_ready", label: "Patch Ready", count: 1 },
            { id: "investigating", label: "Investigating", count: 2 },
            { id: "closed", label: "Closed", count: 1 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors duration-150 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold"
                  : "text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/80 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cream-200 dark:bg-slate-800 text-charcoal-600 dark:text-slate-400">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-950 py-1 pl-8 pr-3 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
          />
        </div>
      </div>

      {/* Issue Items List */}
      <div className="space-y-2.5">
        {filteredIssues.map((issue) => (
          <Link
            key={issue.id}
            href={`/issues/${issue.number}`}
            className="block rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 hover:border-cream-400 dark:hover:border-slate-700 hover:bg-cream-200/50 dark:hover:bg-slate-900 transition-colors duration-150 space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                  #{issue.number}
                </span>
                <h3 className="text-xs font-semibold text-charcoal-900 dark:text-slate-100 truncate">
                  {issue.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                <SeverityBadge severity={issue.severity} />
                {issue.status === "patch_ready" && (
                  <Badge variant="success" size="sm">Patch Ready</Badge>
                )}
                {issue.status === "investigating" && (
                  <Badge variant="warning" size="sm">Investigating</Badge>
                )}
                {issue.status === "closed" && (
                  <Badge variant="neutral" size="sm">Resolved</Badge>
                )}
              </div>
            </div>

            <p className="text-xs text-charcoal-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {issue.description}
            </p>

            <div className="pt-2 border-t border-cream-300/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-charcoal-400 dark:text-slate-500">
              <div className="flex items-center gap-2.5">
                <span className="text-charcoal-700 dark:text-slate-300 font-medium">{issue.repo}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <BranchIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-500" />
                  {issue.branch}
                </span>
                <span>&bull;</span>
                <span>{issue.createdAt}</span>
              </div>

              {issue.investigation && (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <SparklesIcon className="w-3 h-3" />
                  Diagnosed ({issue.investigation.confidence}% confidence)
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
