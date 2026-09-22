"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MOCK_REPOSITORIES } from "@/data/mockData";
import { Repository } from "@/types/domain";
import { BackendRepository } from "@/types/api";
import { ConnectRepoModal } from "@/components/repository/ConnectRepoModal";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import {
  RepoIcon,
  SearchIcon,
  PlusIcon,
  BranchIcon,
  ClockIcon,
  IssueIcon,
  AlertIcon,
  CheckIcon,
} from "@/components/icons";

export default function RepositoriesPage() {
  const [liveRepos, setLiveRepos] = useState<BackendRepository[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "offline" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useSampleData, setUseSampleData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRepositories = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getRepositories();
      setLiveRepos(data);
      setStatus("live");
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load repositories.");
      }
    }
  }, []);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  // Handle display data depending on mode
  const activeDataset: Array<{
    id: string | number;
    name: string;
    org: string;
    description: string;
    language: string;
    defaultBranch: string;
    openIssuesCount: number;
    openPullRequestsCount: number;
    isLive: boolean;
    htmlUrl?: string;
  }> = (status === "live" && !useSampleData)
    ? liveRepos.map((r) => ({
        id: r.id,
        name: r.name,
        org: r.owner,
        description: r.description || "No description provided on GitHub.",
        language: r.language || "Plain Text",
        defaultBranch: r.default_branch,
        openIssuesCount: r.open_issues_count,
        openPullRequestsCount: r.open_pull_requests_count ?? 0,
        isLive: true,
        htmlUrl: r.html_url,
      }))
    : (status === "offline" && useSampleData)
    ? MOCK_REPOSITORIES.map((r) => ({
        id: r.id,
        name: r.name,
        org: r.org,
        description: r.description,
        language: r.language,
        defaultBranch: r.defaultBranch,
        openIssuesCount: r.openIssuesCount,
        openPullRequestsCount: 0,
        isLive: false,
      }))
    : [];

  const filteredRepos = activeDataset.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.org.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang =
      selectedLanguage === "all" ||
      repo.language.toLowerCase() === selectedLanguage.toLowerCase();
    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
              Connected Repositories
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
            Repositories actively tracked in PostgreSQL backend for AST indexing and issue analysis.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Connect Repo</span>
        </button>
      </div>

      {/* Backend Unavailable Banner */}
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
                  Start the PatchPilot FastAPI backend on port 8000 (<code className="font-mono text-[11px] bg-amber-100 dark:bg-slate-900 px-1 py-0.5 rounded">uvicorn app.main:app --port 8000</code>) to load live repositories from PostgreSQL.
                </p>
              </div>
            </div>
            <button
              onClick={fetchRepositories}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0 shadow-xs"
            >
              Retry
            </button>
          </div>

          <div className="pt-2 border-t border-amber-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-charcoal-500 dark:text-slate-400">
              {useSampleData ? "Currently viewing sample dataset." : "Live data is unavailable."}
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

      {/* API Error Banner */}
      {status === "error" && (
        <div className="rounded-lg border border-rose-300 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/30 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">
                Unable to Load Repositories
              </h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
                {errorMessage || "Check the backend connection and try again."}
              </p>
            </div>
          </div>
          <button
            onClick={fetchRepositories}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter repositories..."
            className="w-full rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 py-1.5 pl-9 pr-3 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors duration-150 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono">
          <span className="text-charcoal-500 dark:text-slate-400 text-[11px] hidden sm:inline">Language:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 px-2.5 py-1.5 text-xs text-charcoal-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono transition-colors duration-150 shadow-xs"
          >
            <option value="all">All Languages</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {status === "loading" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-cream-300/80 dark:border-slate-800/80 bg-cream-100/50 dark:bg-slate-900/40 p-4 space-y-3 animate-pulse"
            >
              <div className="h-4 bg-cream-300/60 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-cream-200 dark:bg-slate-800/60 rounded w-3/4" />
              <div className="h-3 bg-cream-200 dark:bg-slate-800/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State (Live Backend Connected but no repos) */}
      {status === "live" && filteredRepos.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-8 text-center space-y-3 bg-cream-100/30 dark:bg-transparent">
          <RepoIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">
            {searchQuery ? "No matching repositories" : "No repositories connected yet"}
          </h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No repositories matched filter "${searchQuery}".`
              : "Connect your first GitHub repository to start tracking code issues and analyzing call graphs."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Connect Repository</span>
            </button>
          )}
        </div>
      )}

      {/* Repositories Grid */}
      {status !== "loading" && filteredRepos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-4 space-y-3 hover:border-cream-400 dark:hover:border-slate-700 transition-colors duration-150 shadow-xs"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <RepoIcon className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-charcoal-500 dark:text-slate-500 block truncate">
                      {repo.org} /
                    </span>
                    <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100 truncate">
                      {repo.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {repo.isLive ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                      Live
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                      Sample
                    </span>
                  )}
                  <Badge variant="default" size="sm">
                    {repo.language}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-charcoal-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                {repo.description}
              </p>

              {/* GitHub Issues & PRs Statistics */}
              <div className="pt-2.5 border-t border-cream-200 dark:border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-cream-200/50 dark:bg-slate-800/40 border border-cream-200/80 dark:border-slate-800 text-[11px] font-mono">
                  <div>
                    <span className="text-charcoal-500 dark:text-slate-400 block text-[10px]">Open Issues</span>
                    <span className="font-semibold text-charcoal-900 dark:text-slate-100 text-xs">{repo.openIssuesCount}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-500 dark:text-slate-400 block text-[10px]">Open Pull Requests</span>
                    <span className="font-semibold text-charcoal-900 dark:text-slate-100 text-xs">{repo.openPullRequestsCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-500 dark:text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <BranchIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-600 shrink-0" />
                    <span>{repo.defaultBranch}</span>
                  </span>

                  <span className="text-[10px] text-charcoal-400 dark:text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Synced from GitHub
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Repository Modal */}
      <ConnectRepoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchRepositories();
        }}
      />
    </div>
  );
}
