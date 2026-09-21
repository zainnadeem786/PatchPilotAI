"use client";

import React, { useState } from "react";
import { MOCK_ACTIVITY } from "@/data/mockData";
import { StatusDot } from "@/components/ui/StatusDot";
import {
  ActivityIcon,
  FilterIcon,
  RepoIcon,
  IssueIcon,
  PatchIcon,
  TestIcon,
  SecurityIcon,
} from "@/components/icons";

export default function ActivityPage() {
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredActivity = MOCK_ACTIVITY.filter(
    (a) => selectedType === "all" || a.type === selectedType
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Autonomous Engineering Audit Stream
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Chronological audit trail of all actions, analyses, and validations executed across repositories.
          </p>
        </div>

        <span className="font-mono text-xs text-charcoal-700 dark:text-slate-400 bg-cream-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-cream-300 dark:border-slate-800 self-start sm:self-auto shadow-xs">
          Audit Trail Active
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 overflow-x-auto shadow-xs">
        <span className="text-xs font-mono text-charcoal-500 dark:text-slate-400 pl-1 pr-2 hidden sm:inline">
          Filter Event:
        </span>
        {[
          { id: "all", label: "All Events" },
          { id: "validation", label: "Validation" },
          { id: "security", label: "Security" },
          { id: "test", label: "Tests" },
          { id: "patch", label: "Patches" },
          { id: "diagnosis", label: "Diagnosis" },
          { id: "analysis", label: "Analysis" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-colors duration-150 whitespace-nowrap ${
              selectedType === tab.id
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold shadow-xs"
                : "text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/70 dark:hover:bg-slate-800 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 p-6 space-y-4 shadow-xs">
        <div className="space-y-4 font-mono text-xs">
          {filteredActivity.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-4 p-4 rounded-lg bg-cream-200/50 dark:bg-slate-950/60 border border-cream-300/80 dark:border-slate-800/80 hover:border-cream-400 dark:hover:border-slate-700 transition-colors duration-150"
            >
              <div className="mt-1">
                <StatusDot status="completed" size="md" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-charcoal-900 dark:text-slate-100 text-sm font-sans">
                    {act.title}
                  </span>
                  <span className="text-[11px] text-charcoal-500 dark:text-slate-500">
                    {act.timestamp}
                  </span>
                </div>

                <p className="text-charcoal-700 dark:text-slate-300 font-sans text-xs">
                  {act.description}
                </p>

                <div className="pt-2 flex items-center gap-3 text-[11px] text-charcoal-500 dark:text-slate-500">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{act.repo}</span>
                  <span>&bull;</span>
                  <span className="px-2 py-0.5 rounded bg-cream-100 dark:bg-slate-800 text-charcoal-700 dark:text-slate-400 border border-cream-300 dark:border-slate-700">
                    {act.agentName}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredActivity.length === 0 && (
            <div className="p-8 text-center text-charcoal-500 dark:text-slate-500 text-xs font-mono">
              No events matching category &ldquo;{selectedType}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
