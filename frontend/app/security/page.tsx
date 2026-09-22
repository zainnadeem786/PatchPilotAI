"use client";

import React, { useState } from "react";
import { MOCK_SECURITY_FINDINGS } from "@/data/mockData";
import { SeverityLevel, SecurityFinding } from "@/types/domain";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Badge } from "@/components/ui/Badge";
import {
  SecurityIcon,
  ShieldIcon,
  FilterIcon,
  CodeIcon,
  ChevronIcon,
} from "@/components/icons";

export default function SecurityPage() {
  const [severityFilter, setSeverityFilter] = useState<"all" | SeverityLevel>("all");
  const [expandedId, setExpandedId] = useState<string | null>("sec-1");

  const findings = MOCK_SECURITY_FINDINGS.filter(
    (f) => severityFilter === "all" || f.severity === severityFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cream-200 dark:bg-slate-800 text-charcoal-700 dark:text-slate-400 font-mono text-[11px] mb-1 border border-cream-300 dark:border-slate-700">
            <span>Sample Security Audit Dataset</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Security & Static Analysis Findings
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            AST security audits scanning repository modules and proposed patches for CWE vulnerabilities, key leakage, and authorization holes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <Badge variant="success">0 Critical Blockers</Badge>
          <Badge variant="warning">2 High Priority</Badge>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 overflow-x-auto shadow-xs">
        <span className="text-xs font-mono text-charcoal-500 dark:text-slate-400 pl-1 pr-2 hidden sm:inline">
          Severity Filter:
        </span>
        {[
          { id: "all", label: "All Findings" },
          { id: "critical", label: "Critical (0)" },
          { id: "high", label: "High (2)" },
          { id: "medium", label: "Medium (1)" },
          { id: "low", label: "Low (1)" },
        ].map((tab) => (
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

      {/* Findings List */}
      <div className="space-y-4">
        {findings.map((finding) => {
          const isExpanded = expandedId === finding.id;

          return (
            <div
              key={finding.id}
              className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/70 overflow-hidden shadow-xs transition-colors duration-150"
            >
              {/* Finding Summary Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-cream-200/40 dark:hover:bg-slate-800/40 transition-colors duration-150"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <SeverityBadge severity={finding.severity} />
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{finding.title}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-charcoal-600 dark:text-slate-400">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{finding.cwe}</span>
                      <span>&bull;</span>
                      <span className="text-charcoal-800 dark:text-slate-300">{finding.file}:{finding.line}</span>
                      <span>&bull;</span>
                      <span className="text-charcoal-500 dark:text-slate-500">Detected {finding.detectedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <Badge
                    variant={finding.status === "remediated" ? "success" : "neutral"}
                    size="sm"
                  >
                    {finding.status === "remediated" ? "Remediated" : "Open Finding"}
                  </Badge>
                  <ChevronIcon
                    direction={isExpanded ? "up" : "down"}
                    className="w-4 h-4 text-charcoal-400 dark:text-slate-500 transition-transform duration-150"
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="p-5 border-t border-cream-300 dark:border-slate-800/80 bg-cream-200/30 dark:bg-slate-950/60 space-y-4 text-xs font-mono">
                  <div>
                    <span className="text-charcoal-500 dark:text-slate-500 block uppercase text-[11px] mb-1 font-bold">
                      Risk Impact & Technical Context
                    </span>
                    <p className="text-charcoal-800 dark:text-slate-300 leading-relaxed font-sans text-xs">
                      {finding.description}
                    </p>
                  </div>

                  {finding.remediationSnippet && (
                    <div>
                      <span className="text-charcoal-500 dark:text-slate-500 block uppercase text-[11px] mb-1.5 font-bold">
                        Synthesized Remediation Diff
                      </span>
                      <pre className="p-3.5 rounded-md border border-cream-300 dark:border-slate-800 bg-[#090d16] font-mono text-xs overflow-x-auto text-emerald-300 leading-relaxed">
                        {finding.remediationSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {findings.length === 0 && (
          <div className="p-10 text-center border border-dashed border-cream-300 dark:border-slate-800 rounded-lg text-charcoal-500 dark:text-slate-500 text-xs font-mono bg-cream-100/40 dark:bg-transparent">
            No security findings matching severity &ldquo;{severityFilter}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
