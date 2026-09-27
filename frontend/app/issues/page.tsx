"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MOCK_ISSUES } from "@/data/mockData";
import { BackendIssue, BackendRepository, PaginatedIssueResponse } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import {
  SearchIcon,
  SparklesIcon,
  AlertIcon,
  IssueIcon,
  RepoIcon,
} from "@/components/icons";

const PAGE_SIZE = 50;

function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

function IssuesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const rawPage = searchParams.get("page");
  const currentPage = rawPage && !isNaN(Number(rawPage)) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  const rawRepo = searchParams.get("repository") || "all";
  const rawState = searchParams.get("state") || "open";

  const [repositories, setRepositories] = useState<BackendRepository[]>([]);
  const [liveIssues, setLiveIssues] = useState<BackendIssue[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: PAGE_SIZE,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });

  const [status, setStatus] = useState<"loading" | "live" | "offline" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useSampleData, setUseSampleData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const updateUrl = useCallback(
    (newPage: number, newRepo: string, newState: string) => {
      const params = new URLSearchParams();
      if (newRepo && newRepo !== "all") {
        params.set("repository", newRepo);
      }
      if (newPage > 1) {
        params.set("page", String(newPage));
      }
      if (newState && newState !== "open") {
        params.set("state", newState);
      }
      const q = params.toString() ? `?${params.toString()}` : "";
      router.push(`/issues${q}`);
    },
    [router]
  );

  const fetchIssues = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      // 1. Fetch repositories if needed
      const repos = await api.getRepositories();
      setRepositories(repos);

      // Determine repository_id if filtered
      let repoId: number | undefined = undefined;
      if (rawRepo !== "all") {
        const found = repos.find(
          (r) =>
            String(r.id) === rawRepo ||
            r.name.toLowerCase() === rawRepo.toLowerCase() ||
            r.full_name.toLowerCase() === rawRepo.toLowerCase()
        );
        if (found) {
          repoId = found.id;
        }
      }

      // 2. Fetch paginated issues
      const res: PaginatedIssueResponse = await api.getIssues({
        page: currentPage,
        per_page: PAGE_SIZE,
        repositoryId: repoId,
        state: rawState === "all" ? undefined : rawState,
      });

      setLiveIssues(res.items);
      setPagination({
        page: res.page,
        per_page: res.per_page,
        total: res.total,
        total_pages: res.total_pages,
        has_next: res.has_next,
        has_previous: res.has_previous,
      });
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
  }, [currentPage, rawRepo, rawState]);

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
  }> =
    status === "live" && !useSampleData
      ? liveIssues.map((i) => {
          const repo = repositories.find((r) => r.id === i.repository_id);
          return {
            id: i.id,
            number: i.number,
            title: i.title,
            state: i.state,
            author: i.author || "unknown",
            createdAt: new Date(i.created_at).toLocaleDateString(),
            isLive: true,
            repoName: repo ? repo.name : undefined,
          };
        })
      : status === "offline" && useSampleData
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
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(q) ||
      issue.number.toString().includes(q) ||
      (issue.repoName && issue.repoName.toLowerCase().includes(q))
    );
  });

  // Calculate range text
  const currentTotal = pagination.total;
  const startItem = currentTotal === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1;
  const endItem = Math.min(pagination.page * pagination.per_page, currentTotal);
  const rangeText =
    currentTotal > 0
      ? `Showing ${startItem}–${endItem} of ${currentTotal.toLocaleString()} issues`
      : `Showing 0 issues`;

  const totalRepoOpenIssues = repositories.reduce(
    (sum, r) => sum + (r.open_issues_count || 0),
    0
  );

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

      {/* Backend Error Banner */}
      {status === "error" && (
        <div className="rounded-lg border border-rose-300/80 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {errorMessage || "Failed to load issues from server."}
            </p>
          </div>
          <button
            onClick={fetchIssues}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0 shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Repository Filter Strip */}
      {repositories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-charcoal-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-semibold mr-1 flex items-center gap-1">
            <RepoIcon className="w-3.5 h-3.5" />
            Repo:
          </span>
          <button
            onClick={() => updateUrl(1, "all", rawState)}
            className={`px-2.5 py-1 rounded-md transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap text-xs ${
              rawRepo === "all"
                ? "bg-indigo-600 text-white font-medium shadow-xs"
                : "bg-cream-100/90 dark:bg-slate-900/60 text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 border border-cream-300 dark:border-slate-800"
            }`}
          >
            <span>All Repositories</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                rawRepo === "all"
                  ? "bg-indigo-700 text-white"
                  : "bg-cream-200 dark:bg-slate-800 text-charcoal-600 dark:text-slate-400"
              }`}
            >
              {totalRepoOpenIssues.toLocaleString()}
            </span>
          </button>

          {repositories.map((repo) => {
            const isSelected =
              rawRepo === String(repo.id) ||
              rawRepo.toLowerCase() === repo.name.toLowerCase() ||
              rawRepo.toLowerCase() === repo.full_name.toLowerCase();
            return (
              <button
                key={repo.id}
                onClick={() => updateUrl(1, repo.name, rawState)}
                className={`px-2.5 py-1 rounded-md transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap text-xs ${
                  isSelected
                    ? "bg-indigo-600 text-white font-medium shadow-xs"
                    : "bg-cream-100/90 dark:bg-slate-900/60 text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 border border-cream-300 dark:border-slate-800"
                }`}
              >
                <span>{repo.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-indigo-700 text-white"
                      : "bg-cream-200 dark:bg-slate-800 text-charcoal-600 dark:text-slate-400"
                  }`}
                >
                  {(repo.open_issues_count || 0).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs, Search Filter & Range Info */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          {[
            { id: "open", label: "Open" },
            { id: "closed", label: "Closed" },
            { id: "all", label: "All States" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => updateUrl(1, rawRepo, tab.id)}
              className={`px-2.5 py-1 rounded-md transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                rawState === tab.id
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold"
                  : "text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/60 dark:hover:bg-slate-800 border border-transparent"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {status === "live" && (
            <span className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400 whitespace-nowrap">
              {rangeText}
            </span>
          )}
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search current page..."
              className="w-full sm:w-52 rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 py-1 pl-8 pr-3 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors duration-150 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {status === "loading" && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
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

      {/* Out of Range Page Notice */}
      {status === "live" && pagination.total > 0 && liveIssues.length === 0 && (
        <div className="rounded-lg border border-amber-300 dark:border-slate-800 p-8 text-center space-y-2.5 bg-amber-50/40 dark:bg-slate-900/40">
          <AlertIcon className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">
            Page Out of Range
          </h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            Page {currentPage} exceeds available pages ({pagination.total_pages}).
          </p>
          <button
            onClick={() => updateUrl(1, rawRepo, rawState)}
            className="px-3 py-1.5 text-xs font-mono font-medium rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs"
          >
            Go to Page 1
          </button>
        </div>
      )}

      {/* Genuinely Empty State */}
      {status === "live" && pagination.total === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-8 text-center space-y-2.5 bg-cream-100/30 dark:bg-transparent">
          <IssueIcon className="w-8 h-8 text-charcoal-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">
            No issues found
          </h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No issues matched query "${searchQuery}".`
              : "No issues match the selected repository or filter criteria."}
          </p>
        </div>
      )}

      {/* Issue List */}
      {status !== "loading" && filteredIssues.length > 0 && (
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <Link
              key={issue.id}
              href={issue.isLive ? `/issues/${issue.id}` : "#"}
              className="p-3.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs group block"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    #{issue.number}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
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
                      <span className="text-charcoal-700 dark:text-slate-300 font-semibold">{issue.repoName}</span>
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
                {issue.isLive && (
                  <span className="text-[11px] font-mono text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    Analyze →
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Professional Compact Server-Side Pagination Bar */}
      {status === "live" && pagination.total_pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-cream-300 dark:border-slate-800">
          <div className="text-xs font-mono text-charcoal-500 dark:text-slate-400">
            {rangeText}
          </div>

          <div className="flex items-center gap-1 font-mono text-xs">
            {/* First Page */}
            <button
              onClick={() => updateUrl(1, rawRepo, rawState)}
              disabled={currentPage === 1}
              className={`px-2 py-1 rounded border transition-colors ${
                currentPage === 1
                  ? "border-cream-200 dark:border-slate-800 text-charcoal-300 dark:text-slate-600 cursor-not-allowed"
                  : "border-cream-300 dark:border-slate-700 text-charcoal-700 dark:text-slate-300 hover:bg-cream-200/60 dark:hover:bg-slate-800"
              }`}
              title="First Page"
            >
              « First
            </button>

            {/* Previous Page */}
            <button
              onClick={() => updateUrl(currentPage - 1, rawRepo, rawState)}
              disabled={!pagination.has_previous}
              className={`px-2.5 py-1 rounded border transition-colors ${
                !pagination.has_previous
                  ? "border-cream-200 dark:border-slate-800 text-charcoal-300 dark:text-slate-600 cursor-not-allowed"
                  : "border-cream-300 dark:border-slate-700 text-charcoal-700 dark:text-slate-300 hover:bg-cream-200/60 dark:hover:bg-slate-800"
              }`}
              title="Previous Page"
            >
              ‹ Prev
            </button>

            {/* Compact Page Numbers */}
            <div className="flex items-center gap-1">
              {generatePageNumbers(currentPage, pagination.total_pages).map((p, idx) => {
                if (p === "...") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 py-1 text-charcoal-400 dark:text-slate-500"
                    >
                      …
                    </span>
                  );
                }
                const pageNum = p as number;
                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => updateUrl(pageNum, rawRepo, rawState)}
                    className={`min-w-8 px-2.5 py-1 rounded text-xs transition-colors ${
                      isCurrent
                        ? "bg-indigo-600 text-white font-bold shadow-xs border border-indigo-600"
                        : "border border-cream-300 dark:border-slate-700 text-charcoal-700 dark:text-slate-300 hover:bg-cream-200/60 dark:hover:bg-slate-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() => updateUrl(currentPage + 1, rawRepo, rawState)}
              disabled={!pagination.has_next}
              className={`px-2.5 py-1 rounded border transition-colors ${
                !pagination.has_next
                  ? "border-cream-200 dark:border-slate-800 text-charcoal-300 dark:text-slate-600 cursor-not-allowed"
                  : "border-cream-300 dark:border-slate-700 text-charcoal-700 dark:text-slate-300 hover:bg-cream-200/60 dark:hover:bg-slate-800"
              }`}
              title="Next Page"
            >
              Next ›
            </button>

            {/* Last Page */}
            <button
              onClick={() => updateUrl(pagination.total_pages, rawRepo, rawState)}
              disabled={currentPage === pagination.total_pages || pagination.total_pages === 0}
              className={`px-2 py-1 rounded border transition-colors ${
                currentPage === pagination.total_pages || pagination.total_pages === 0
                  ? "border-cream-200 dark:border-slate-800 text-charcoal-300 dark:text-slate-600 cursor-not-allowed"
                  : "border-cream-300 dark:border-slate-700 text-charcoal-700 dark:text-slate-300 hover:bg-cream-200/60 dark:hover:bg-slate-800"
              }`}
              title="Last Page"
            >
              Last »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IssuesLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-cream-300/60 dark:bg-slate-800 rounded w-1/4" />
      <div className="h-4 bg-cream-200 dark:bg-slate-800/60 rounded w-1/3" />
      <div className="space-y-2 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-cream-200/50 dark:bg-slate-900/50 rounded-lg border border-cream-300/60 dark:border-slate-800" />
        ))}
      </div>
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<IssuesLoadingSkeleton />}>
      <IssuesContent />
    </Suspense>
  );
}
