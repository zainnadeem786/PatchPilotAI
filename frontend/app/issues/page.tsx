"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MOCK_ISSUES } from "@/data/mockData";
import { BackendIssue } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import {
  SearchIcon,
  SparklesIcon,
  AlertIcon,
  IssueIcon,
} from "@/components/icons";

export default function IssuesPage() {
  const [liveIssues, setLiveIssues] = useState<BackendIssue[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "offline" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useSampleData, setUseSampleData] = useState(false);
  const [activeStateFilter, setActiveStateFilter] = useState<"all" | "open" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchIssues = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getIssues();
      setLiveIssues(data);
      setStatus("live");
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load issues.");
      }
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Unified issue representation for rendering
  const activeDataset: Array<{
    id: string | number;
    number: number;
    title: string;
    state: string;
    author: string;
    createdAt: string;
    isLive: boolean;
    repoName?: string;
  }> = (status === "live" && !useSampleData)
    ? liveIssues.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        state: i.state,
        author: i.author || "unknown",
        createdAt: new Date(i.created_at).toLocaleDateString(),
        isLive: true,
      }))
    : (status === "offline" && useSampleData)
    ? MOCK_ISSUES.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        state: i.status === "closed" ? "closed" : "open",
        author: i.author,
        createdAt: i.createdAt,
        isLive: false,
        repoName: i.repo,
      }))
    : [];

  const filteredIssues = activeDataset.filter((issue) => {
    const matchesTab =
      activeStateFilter === "all" ||
      (activeStateFilter === "open" && issue.state === "open") ||
      (activeStateFilter === "closed" && issue.state === "closed");
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.number.toString().includes(searchQuery) ||
      (issue.repoName && issue.repoName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
              Issue Triage & Ingestion
            </h2>
            {status === "live" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live API (PostgreSQL)
              </span>
            )}
            {status === "offline" && useSampleData && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                Sample Demo Data (Offline)
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 mt-0.5">
            Repository tickets synchronized from GitHub into PostgreSQL, prepared for agent root-cause analysis.
          </p>
        </div>

        <Link
          href="/issues/142"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Demo #142 Workspace</span>
        </Link>
      </div>

      {/* Backend Offline Banner */}
      {status === "offline" && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-charcoal-900 dark:text-amber-200">
                  Backend Service Offline
                </h4>
                <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
                  Start the FastAPI backend on port 8000 (<code className="font-mono text-[11px] bg-amber-100 dark:bg-slate-900 px-1 py-0.5 rounded">uvicorn app.main:app --port 8000</code>) to load live repository issues from PostgreSQL.
                </p>
              </div>
            </div>
            <button
              onClick={fetchIssues}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0 shadow-xs"
            >
              Retry
            </button>
          </div>

          <div className="pt-2 border-t border-amber-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-charcoal-500 dark:text-slate-400">
              {useSampleData ? "Currently viewing sample issue dataset." : "Live data is unavailable."}
            </span>
            <button
              onClick={() => setUseSampleData(!useSampleData)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              {useSampleData ? "Hide sample data" : "View sample demo data →"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          {[
            { id: "all", label: "All Issues", count: activeDataset.length },
            { id: "open", label: "Open", count: activeDataset.filter((i) => i.state === "open").length },
            { id: "closed", label: "Closed", count: activeDataset.filter((i) => i.state === "closed").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStateFilter(tab.id as typeof activeStateFilter)}
              className={`px-2.5 py-1 rounded-md transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                activeStateFilter === tab.id
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold"
                  : "text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/60 dark:hover:bg-slate-800 border border-transparent"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cream-200 dark:bg-slate-800 text-charcoal-600 dark:text-slate-400">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="w-full sm:w-56 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 py-1 pl-8 pr-3 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors duration-150 shadow-xs"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {status === "loading" && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-cream-300/80 dark:border-slate-800/80 bg-cream-100/50 dark:bg-slate-900/40 p-4 space-y-2 animate-pulse"
            >
              <div className="h-4 bg-cream-300/60 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-cream-200 dark:bg-slate-800/60 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {status === "live" && filteredIssues.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-8 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <IssueIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">
            {searchQuery ? "No matching issues" : "No issues synchronized yet"}
          </h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No issues matched query "${searchQuery}".`
              : "Connect a repository with open issues to synchronize them into PostgreSQL for automated investigation."}
          </p>
        </div>
      )}

      {/* Issue List */}
      {status !== "loading" && filteredIssues.length > 0 && (
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-3.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 hover:border-cream-400 dark:hover:border-slate-700 transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    #{issue.number}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-900 dark:text-slate-100">
                    {issue.title}
                  </span>
                  {issue.isLive ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                      Live
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                      Sample
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
                  {issue.repoName && (
                    <>
                      <span className="text-charcoal-700 dark:text-slate-300">{issue.repoName}</span>
                      <span>&bull;</span>
                    </>
                  )}
                  <span>Reported by {issue.author}</span>
                  <span>&bull;</span>
                  <span>{issue.createdAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Badge
                  variant={issue.state === "open" ? "success" : "neutral"}
                  size="sm"
                >
                  {issue.state.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
