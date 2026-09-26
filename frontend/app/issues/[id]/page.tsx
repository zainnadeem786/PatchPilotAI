"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { BackendIssue, AgentResultResponse, AgentFindingResponse, EngineResultResponse } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import {
  SparklesIcon,
  CodeIcon,
  CheckIcon,
  AlertIcon,
  ShieldIcon,
  TestIcon,
  PatchIcon,
  ChevronIcon,
  ClockIcon,
  CopyIcon,
  ReleaseIcon,
} from "@/components/icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Analysis state ────────────────────────────────────────────────────────────

type AnalysisState = "idle" | "running" | "completed" | "failed" | "timeout";

// ── Severity helpers ──────────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, "error" | "warning" | "info" | "neutral" | "success"> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "info",
  info: "neutral",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500",
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-sky-400",
  info: "bg-slate-400",
};

function severityBadgeVariant(s: string): "error" | "warning" | "info" | "neutral" | "success" {
  return SEVERITY_BADGE[s.toLowerCase()] ?? "neutral";
}

function severityDot(s: string): string {
  return SEVERITY_DOT[s.toLowerCase()] ?? "bg-slate-400";
}

// ── Agent display name map ────────────────────────────────────────────────────

const AGENT_DISPLAY: Record<string, string> = {
  orchestrator: "Orchestrator",
  repository_intelligence: "Repository Intelligence",
  patch_synthesis: "Patch Synthesis",
  regression_test_synthesis: "Regression Test Synthesis",
  security_audit: "Security Audit",
};

function agentDisplayName(name: string): string {
  return AGENT_DISPLAY[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/50 dark:bg-slate-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-cream-100 dark:bg-slate-950/80 hover:bg-cream-200/60 dark:hover:bg-slate-900 transition-colors duration-150"
      >
        <span className="flex items-center gap-2 text-xs font-mono font-semibold text-charcoal-700 dark:text-slate-200 uppercase tracking-wider">
          {icon}
          {title}
          {badge && <span className="ml-1">{badge}</span>}
        </span>
        <ChevronIcon
          className="w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 transition-transform"
          direction={open ? "up" : "down"}
        />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 border border-cream-300 dark:border-slate-700 rounded bg-cream-50 dark:bg-slate-900 transition-colors duration-150"
    >
      {copied ? <CheckIcon className="w-3 h-3 text-emerald-500" /> : <CopyIcon className="w-3 h-3" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ── Diff viewer (inline, no file tabs needed — raw content only) ──────────────

function InlineDiffViewer({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <div className="overflow-x-auto max-h-96 font-mono text-xs leading-relaxed bg-[#0d1117] rounded-md border border-slate-800">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            const isAdd = line.startsWith("+") && !line.startsWith("+++");
            const isDel = line.startsWith("-") && !line.startsWith("---");
            const isHdr = line.startsWith("@@");
            let rowCls = "text-slate-300";
            let prefCls = "text-slate-600 select-none";
            if (isAdd) { rowCls = "bg-emerald-950/40 text-emerald-300"; prefCls = "text-emerald-500 font-bold select-none"; }
            else if (isDel) { rowCls = "bg-rose-950/40 text-rose-300"; prefCls = "text-rose-500 font-bold select-none"; }
            else if (isHdr) { rowCls = "bg-indigo-950/30 text-indigo-300/80 italic"; prefCls = "text-indigo-400 select-none"; }
            return (
              <tr key={idx} className={rowCls}>
                <td className="w-10 px-2 py-0.5 text-right text-[11px] text-slate-600 select-none border-r border-slate-800/60">
                  {idx + 1}
                </td>
                <td className="w-5 px-1 py-0.5 text-center">
                  <span className={prefCls}>{isAdd ? "+" : isDel ? "-" : " "}</span>
                </td>
                <td className="px-2.5 py-0.5 whitespace-pre">
                  {line.slice(isAdd || isDel ? 1 : 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Agent status icon ─────────────────────────────────────────────────────────

function AgentStatusIcon({ status }: { status: string }) {
  if (status === "success") {
    return <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
  }
  return <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
}

// ── Agent result card ─────────────────────────────────────────────────────────

function AgentResultCard({ result }: { result: AgentResultResponse }) {
  const [expanded, setExpanded] = useState(result.status !== "success" || result.findings.length > 0);
  const isError = result.status !== "success";
  const displayName = agentDisplayName(result.agent_name);

  return (
    <div className={`rounded-md border ${isError ? "border-rose-300 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20" : "border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 p-3 text-left"
      >
        <AgentStatusIcon status={result.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-charcoal-900 dark:text-slate-100">{displayName}</span>
            <Badge variant={isError ? "error" : "success"} size="sm">
              {isError ? "Failed" : "Completed"}
            </Badge>
            <span className="text-[11px] font-mono text-charcoal-400 dark:text-slate-500 uppercase">{result.mode}</span>
          </div>
          <p className="text-[11px] text-charcoal-600 dark:text-slate-400 mt-0.5 font-mono leading-relaxed">
            {result.summary}
          </p>
        </div>
        <ChevronIcon
          className="w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 shrink-0 mt-0.5"
          direction={expanded ? "up" : "down"}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-cream-200 dark:border-slate-800/60">
          {/* Agent error */}
          {isError && result.error && (
            <div className="mt-2 p-2.5 rounded bg-rose-100/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
              <span className="text-[11px] font-mono font-semibold text-rose-700 dark:text-rose-400 block mb-0.5">
                Error
              </span>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 font-mono">{result.error}</p>
            </div>
          )}

          {/* Findings */}
          {result.findings.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {result.findings.map((finding: AgentFindingResponse, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded border border-cream-200 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/60">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot(finding.severity)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-charcoal-800 dark:text-slate-200">{finding.title}</span>
                      <Badge variant={severityBadgeVariant(finding.severity)} size="sm">
                        {finding.severity}
                      </Badge>
                      {finding.category && (
                        <span className="text-[10px] font-mono text-charcoal-400 dark:text-slate-500 uppercase">{finding.category}</span>
                      )}
                    </div>
                    {finding.file_path && (
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        <CodeIcon className="w-3 h-3 inline mr-0.5" />
                        {finding.file_path}
                      </span>
                    )}
                    <p className="text-[11px] text-charcoal-600 dark:text-slate-400 mt-0.5 leading-relaxed font-mono whitespace-pre-wrap">
                      {finding.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IssueDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const issueId = resolvedParams.id;

  // Issue fetch state
  const [issue, setIssue] = useState<BackendIssue | null>(null);
  const [issueStatus, setIssueStatus] = useState<"loading" | "loaded" | "not_found" | "error">("loading");
  const [issueError, setIssueError] = useState<string | null>(null);

  // Analysis state
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisResult, setAnalysisResult] = useState<EngineResultResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Active tab for the issue body area
  const [activeTab, setActiveTab] = useState<"overview" | "analysis">("overview");

  // ── Load issue from real API ────────────────────────────────────────────────

  const loadIssue = useCallback(async () => {
    setIssueStatus("loading");
    setIssueError(null);
    try {
      const data = await api.getIssue(issueId);
      setIssue(data);
      setIssueStatus("loaded");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load issue.";
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        setIssueStatus("not_found");
      } else {
        setIssueStatus("error");
        setIssueError(msg);
      }
    }
  }, [issueId]);

  useEffect(() => {
    loadIssue();
  }, [loadIssue]);

  // ── Run Phase 4 analysis ────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    if (analysisState === "running") return; // prevent duplicate submissions
    setAnalysisState("running");
    setAnalysisError(null);

    // 90-second client-side timeout guard
    const timeoutId = setTimeout(() => {
      setAnalysisState("timeout");
      setAnalysisError("Analysis request timed out after 90 seconds. The backend may be busy — please retry.");
    }, 90_000);

    try {
      const result = await api.analyzeIssue(issueId);
      clearTimeout(timeoutId);
      setAnalysisResult(result);
      setAnalysisState("completed");
      setActiveTab("analysis");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      setAnalysisError(msg);
      setAnalysisState("failed");
    }
  }, [issueId, analysisState]);

  // ── Derived helpers ─────────────────────────────────────────────────────────

  const getAgentResult = (name: string) =>
    analysisResult?.results.find((r) => r.agent_name === name) ?? null;

  const orchestrator = getAgentResult("orchestrator");
  const repoIntel = getAgentResult("repository_intelligence");
  const patchAgent = getAgentResult("patch_synthesis");
  const regressionAgent = getAgentResult("regression_test_synthesis");
  const securityAgent = getAgentResult("security_audit");
  const releaseAgent = getAgentResult("release");

  const orchData = orchestrator?.data ?? {};
  const category = typeof orchData.category === "string" ? orchData.category : null;
  const priority = typeof orchData.priority === "string" ? orchData.priority : null;

  const patchData = patchAgent?.data ?? {};
  const diffContent = typeof patchData.diff === "string" ? patchData.diff : null;
  const suspectFiles: string[] = Array.isArray(patchData.suspect_files)
    ? (patchData.suspect_files as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const regressionData = regressionAgent?.data ?? {};
  const testCode = typeof regressionData.test_code === "string" ? regressionData.test_code : null;

  const securityFindings = (securityAgent?.findings ?? []).filter(
    (f) => f.severity !== "info" || f.title !== "No known-risky patterns detected"
  );
  const noSecurityRisks =
    securityAgent?.status === "success" &&
    securityAgent.findings.some((f) => f.title === "No known-risky patterns detected");

  const agentFailureCount =
    analysisResult?.results.filter((r) => r.status !== "success").length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  // Loading state
  if (issueStatus === "loading") {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-cream-300/60 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-32 bg-cream-200/60 dark:bg-slate-900/60 rounded-lg border border-cream-300 dark:border-slate-800" />
        <div className="h-24 bg-cream-200/60 dark:bg-slate-900/60 rounded-lg border border-cream-300 dark:border-slate-800" />
      </div>
    );
  }

  // Not found
  if (issueStatus === "not_found") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-charcoal-500 dark:text-slate-400">
          <Link href="/issues" className="hover:text-charcoal-900 dark:hover:text-slate-200 transition-colors">Issues</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-slate-200">#{issueId}</span>
        </div>
        <div className="rounded-lg border border-rose-300 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 p-6 text-center space-y-3">
          <AlertIcon className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100">Issue Not Found</h3>
          <p className="text-xs text-charcoal-600 dark:text-slate-400">
            Issue #{issueId} does not exist in PatchPilot&apos;s database. It may not have been synchronized from GitHub yet.
          </p>
          <Link
            href="/issues"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors"
          >
            ← Back to Issues
          </Link>
        </div>
      </div>
    );
  }

  // Backend error
  if (issueStatus === "error") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-charcoal-500 dark:text-slate-400">
          <Link href="/issues" className="hover:text-charcoal-900 dark:hover:text-slate-200 transition-colors">Issues</Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-slate-200">#{issueId}</span>
        </div>
        <div className="rounded-lg border border-rose-300 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 p-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Issue</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{issueError}</p>
            </div>
          </div>
          <button
            onClick={loadIssue}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Issue loaded
  return (
    <div className="space-y-5">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-charcoal-500 dark:text-slate-400">
          <Link href="/issues" className="hover:text-charcoal-900 dark:hover:text-slate-200 transition-colors duration-150">
            Issues
          </Link>
          <span>/</span>
          <span className="text-charcoal-900 dark:text-slate-200 font-semibold">#{issue!.number}</span>
          <span>&bull;</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">ID {issue!.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Analyze Issue button — core Phase 5 CTA */}
          <button
            onClick={runAnalysis}
            disabled={analysisState === "running"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md shadow-xs transition-colors duration-150
              ${analysisState === "running"
                ? "cursor-not-allowed opacity-60 bg-indigo-500 text-white"
                : analysisState === "completed"
                ? "text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700"
                : (analysisState === "failed" || analysisState === "timeout")
                ? "text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700"
                : "text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700"
              }`}
          >
            {analysisState === "running" ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Analyzing…</span>
              </>
            ) : analysisState === "completed" ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Re-Analyze</span>
              </>
            ) : (analysisState === "failed" || analysisState === "timeout") ? (
              <>
                <AlertIcon className="w-3.5 h-3.5" />
                <span>Retry Analysis</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Analyze Issue</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Issue Header Card */}
      <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/60 p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                #{issue!.number}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-charcoal-900 dark:text-slate-100">
                {issue!.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
              <span>By {issue!.author || "unknown"}</span>
              <span>&bull;</span>
              <span>{new Date(issue!.created_at).toLocaleDateString()}</span>
              {issue!.html_url && (
                <>
                  <span>&bull;</span>
                  <a
                    href={issue!.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View on GitHub ↗
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start flex-wrap">
            <Badge variant={issue!.state === "open" ? "success" : "neutral"} size="sm">
              {issue!.state.toUpperCase()}
            </Badge>
            {category && (
              <Badge variant="info" size="sm">{category}</Badge>
            )}
            {priority && (
              <Badge variant={priority === "critical" || priority === "high" ? "error" : priority === "medium" ? "warning" : "neutral"} size="sm">
                {priority}
              </Badge>
            )}
          </div>
        </div>

        {issue!.body && (
          <div className="pt-2.5 border-t border-cream-300/80 dark:border-slate-800/80">
            <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-charcoal-400 dark:text-slate-500 mb-1">
              Description
            </h4>
            <p className="text-xs text-charcoal-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {issue!.body}
            </p>
          </div>
        )}
      </div>

      {/* Analysis state banners */}
      {analysisState === "running" && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 font-mono">
              Phase 4 Agent Pipeline Running…
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
              Orchestrator → Repository Intelligence → Patch Synthesis → Regression Test → Security Audit → Release
            </p>
          </div>
        </div>
      )}

      {(analysisState === "failed" || analysisState === "timeout") && (
        <div className="rounded-lg border border-rose-300 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/20 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 font-mono">
                {analysisState === "timeout" ? "Analysis Timed Out" : "Analysis Failed"}
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                {analysisError || "An unexpected error occurred. Check the backend is running and retry."}
              </p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Partial failure warning */}
      {analysisState === "completed" && agentFailureCount > 0 && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-3 flex items-start gap-2.5">
          <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
            {agentFailureCount} agent{agentFailureCount > 1 ? "s" : ""} failed during this run.
            Successful results are still shown. Review failed agents below for details.
          </p>
        </div>
      )}

      {/* Tabs */}
      {analysisState === "completed" && analysisResult && (
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/50 dark:bg-slate-900/50 overflow-hidden">
          <div className="flex items-center border-b border-cream-300 dark:border-slate-800 bg-cream-100 dark:bg-slate-950/80 px-3 text-xs font-mono">
            {(["overview", "analysis"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2.5 border-b-2 font-medium transition-colors duration-150 ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300 font-semibold"
                    : "border-transparent text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200"
                }`}
              >
                {tab === "overview" ? "Issue Overview" : "Analysis Results"}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {activeTab === "overview" && (
              <div className="text-xs text-charcoal-500 dark:text-slate-400 font-mono text-center py-4">
                Switch to <button onClick={() => setActiveTab("analysis")} className="text-indigo-600 dark:text-indigo-400 underline">Analysis Results</button> to view the Phase 4 pipeline output.
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-5">

                {/* ── Analysis Summary ──────────────────────────────────────── */}
                <Section
                  title="Analysis Summary"
                  icon={<SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />}
                  defaultOpen
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Category / Priority */}
                    {(category || priority) && (
                      <div className="rounded-md border border-cream-200 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 p-3 space-y-2">
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">Classification</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {category && <Badge variant="info" size="sm">Category: {category}</Badge>}
                          {priority && (
                            <Badge
                              variant={priority === "critical" || priority === "high" ? "error" : priority === "medium" ? "warning" : "neutral"}
                              size="sm"
                            >
                              Priority: {priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Orchestrator summary */}
                    {orchestrator?.status === "success" && (
                      <div className="rounded-md border border-cream-200 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 p-3 space-y-1.5">
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">Triage Summary</h5>
                        <p className="text-[11px] font-mono text-charcoal-700 dark:text-slate-300 leading-relaxed">{orchestrator.summary}</p>
                      </div>
                    )}

                    {/* Root cause / Repository Intelligence */}
                    {repoIntel && (
                      <div className={`rounded-md border p-3 space-y-1.5 col-span-full ${repoIntel.status === "success" ? "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20"}`}>
                        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Root Cause Localization
                        </h5>
                        <p className="text-[11px] font-mono text-charcoal-700 dark:text-slate-300 leading-relaxed">
                          {repoIntel.summary}
                        </p>
                        {suspectFiles.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-[10px] font-mono font-semibold uppercase text-charcoal-400 dark:text-slate-500">Suspect Files</span>
                            {suspectFiles.map((f) => (
                              <div key={f} className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
                                <CodeIcon className="w-3 h-3 shrink-0" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Section>

                {/* ── Remediation / Patch ───────────────────────────────────── */}
                <Section
                  title="Remediation / Patch"
                  icon={<PatchIcon className="w-3.5 h-3.5 text-amber-500" />}
                  badge={
                    patchAgent && (
                      <Badge variant={patchAgent.status === "success" ? "warning" : "error"} size="sm">
                        {patchAgent.status === "success" ? (diffContent ? "Diff Available" : "Manual Outline") : "Failed"}
                      </Badge>
                    )
                  }
                  defaultOpen={!!patchAgent}
                >
                  <div className="space-y-3">
                    {/* AI disclaimer */}
                    <div className="flex items-start gap-2 p-2.5 rounded border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                      <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        <strong>AI-generated proposal.</strong> This remediation has not been applied. Human review is required before any repository change is made. Do not commit, push, or merge without thorough review.
                      </span>
                    </div>

                    {!patchAgent && (
                      <p className="text-xs text-charcoal-500 dark:text-slate-400 font-mono">Patch Synthesis agent result unavailable.</p>
                    )}

                    {patchAgent?.status !== "success" && patchAgent?.error && (
                      <div className="p-3 rounded border border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20">
                        <p className="text-[11px] font-mono text-rose-700 dark:text-rose-300">{patchAgent.error}</p>
                      </div>
                    )}

                    {patchAgent?.status === "success" && (
                      <>
                        <p className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400">{patchAgent.summary}</p>

                        {diffContent ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">Unified Diff</span>
                              <CopyButton text={diffContent} />
                            </div>
                            <InlineDiffViewer diff={diffContent} />
                          </div>
                        ) : (
                          patchAgent.findings.filter((f) => f.category === "patch").map((f, i) => (
                            <div key={i} className="rounded-md border border-cream-200 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60 p-3 space-y-1.5">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                                Manual Remediation Outline
                              </span>
                              <p className="text-[11px] font-mono text-charcoal-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {f.detail}
                              </p>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </Section>

                {/* ── Regression Testing ────────────────────────────────────── */}
                <Section
                  title="Regression Testing"
                  icon={<TestIcon className="w-3.5 h-3.5 text-sky-500" />}
                  badge={
                    regressionAgent && (
                      <Badge
                        variant={regressionAgent.status === "success" ? "info" : "error"}
                        size="sm"
                      >
                        {regressionAgent.status === "success" ? "Recommended Test" : "Failed"}
                      </Badge>
                    )
                  }
                  defaultOpen={!!regressionAgent}
                >
                  <div className="space-y-3">
                    {/* Test execution disclaimer */}
                    <div className="flex items-start gap-2 p-2.5 rounded border border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-950/20 text-[11px] font-mono text-sky-800 dark:text-sky-300">
                      <ClockIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                      <span>
                        <strong>Recommended test — not executed.</strong> This test was generated by the Regression Test Synthesis agent and has not been run. Execution status will not be shown until the test is actually run in your CI pipeline.
                      </span>
                    </div>

                    {!regressionAgent && (
                      <p className="text-xs text-charcoal-500 dark:text-slate-400 font-mono">Regression Test agent result unavailable.</p>
                    )}

                    {regressionAgent?.status !== "success" && regressionAgent?.error && (
                      <div className="p-3 rounded border border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20">
                        <p className="text-[11px] font-mono text-rose-700 dark:text-rose-300">{regressionAgent.error}</p>
                      </div>
                    )}

                    {regressionAgent?.status === "success" && (
                      <>
                        <p className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400">{regressionAgent.summary}</p>

                        {testCode ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                                Generated Test Code
                              </span>
                              <CopyButton text={testCode} />
                            </div>
                            <pre className="p-3.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-[#0d1117] font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-72">
                              {testCode}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
                            No test code was generated in this mode.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </Section>

                {/* ── Security ─────────────────────────────────────────────── */}
                <Section
                  title="Security"
                  icon={<ShieldIcon className="w-3.5 h-3.5 text-rose-500" />}
                  badge={
                    securityAgent && (
                      <Badge
                        variant={securityFindings.length > 0 ? "error" : securityAgent.status === "success" ? "success" : "error"}
                        size="sm"
                      >
                        {securityAgent.status !== "success"
                          ? "Agent Failed"
                          : securityFindings.length > 0
                          ? `${securityFindings.length} Finding${securityFindings.length !== 1 ? "s" : ""}`
                          : "Clean"}
                      </Badge>
                    )
                  }
                  defaultOpen={!!securityAgent}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-2.5 rounded border border-slate-200 dark:border-slate-700 bg-cream-50/60 dark:bg-slate-900/60 text-[11px] font-mono text-charcoal-600 dark:text-slate-400">
                      <ShieldIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-charcoal-400 dark:text-slate-500" />
                      <span>
                        <strong>AI-generated security findings.</strong> These are pattern-matched or LLM-generated observations and require human review. They do not constitute a complete security audit.
                      </span>
                    </div>

                    {!securityAgent && (
                      <p className="text-xs text-charcoal-500 dark:text-slate-400 font-mono">Security Audit agent result unavailable.</p>
                    )}

                    {securityAgent?.status !== "success" && securityAgent?.error && (
                      <div className="p-3 rounded border border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20">
                        <p className="text-[11px] font-mono text-rose-700 dark:text-rose-300">{securityAgent.error}</p>
                      </div>
                    )}

                    {securityAgent?.status === "success" && noSecurityRisks && securityFindings.length === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                        <CheckIcon className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>No known-risky patterns detected in the issue text or proposed patch.</span>
                      </div>
                    )}

                    {securityFindings.length > 0 && (
                      <div className="space-y-2">
                        {securityFindings.map((finding, idx) => (
                          <div key={idx} className={`rounded-md border p-3 space-y-1.5 ${finding.severity === "critical" || finding.severity === "high" ? "border-rose-300 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20" : finding.severity === "medium" ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20" : "border-cream-200 dark:border-slate-800 bg-cream-50 dark:bg-slate-950/60"}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot(finding.severity)}`} />
                              <span className="text-xs font-semibold text-charcoal-900 dark:text-slate-100">{finding.title}</span>
                              <Badge variant={severityBadgeVariant(finding.severity)} size="sm">{finding.severity}</Badge>
                              {finding.category && (
                                <span className="text-[10px] font-mono text-charcoal-400 dark:text-slate-500 uppercase">{finding.category}</span>
                              )}
                            </div>
                            {finding.file_path && (
                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block">
                                <CodeIcon className="w-3 h-3 inline mr-0.5" />{finding.file_path}
                              </span>
                            )}
                            <p className="text-[11px] font-mono text-charcoal-700 dark:text-slate-300 leading-relaxed">
                              {finding.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>

                {/* ── Release Readiness ────────────────────────────────────── */}
                <Section
                  title="Release Readiness"
                  icon={<ReleaseIcon className="w-3.5 h-3.5 text-violet-500" />}
                  badge={
                    releaseAgent && (
                      <Badge
                        variant={
                          releaseAgent.status !== "success"
                            ? "error"
                            : releaseAgent.data.release_ready === true
                            ? "success"
                            : "error"
                        }
                        size="sm"
                      >
                        {releaseAgent.status !== "success"
                          ? "Agent Failed"
                          : releaseAgent.data.release_ready === true
                          ? "Ready for Human Review"
                          : "Blocked"}
                      </Badge>
                    )
                  }
                  defaultOpen={!!releaseAgent}
                >
                  <div className="space-y-3">
                    {/* Always-present human approval disclaimer */}
                    <div className="flex items-start gap-2 p-2.5 rounded border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-950/20 text-[11px] font-mono text-violet-800 dark:text-violet-300">
                      <ShieldIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
                      <span>
                        <strong>Human engineering approval required.</strong> No automatic commit, push, merge, or deployment will occur. The Release Agent evaluates readiness only.
                      </span>
                    </div>

                    {!releaseAgent && (
                      <p className="text-xs text-charcoal-500 dark:text-slate-400 font-mono">Release Agent result unavailable.</p>
                    )}

                    {releaseAgent?.status !== "success" && releaseAgent?.error && (
                      <div className="p-3 rounded border border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20">
                        <p className="text-[11px] font-mono text-rose-700 dark:text-rose-300">{releaseAgent.error}</p>
                      </div>
                    )}

                    {releaseAgent?.status === "success" && (() => {
                      const releaseData = releaseAgent.data;
                      const releaseReady = releaseData.release_ready === true;
                      const blocking: string[] = Array.isArray(releaseData.blocking_reasons)
                        ? (releaseData.blocking_reasons as unknown[]).filter((x): x is string => typeof x === "string")
                        : [];
                      const warnings: string[] = Array.isArray(releaseData.warnings)
                        ? (releaseData.warnings as unknown[]).filter((x): x is string => typeof x === "string")
                        : [];

                      return (
                        <>
                          {/* Status banner */}
                          <div className={`flex items-center gap-2 p-3 rounded border font-mono text-xs ${
                            releaseReady
                              ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                              : "border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300"
                          }`}>
                            {releaseReady
                              ? <CheckIcon className="w-4 h-4 shrink-0 text-emerald-500" />
                              : <AlertIcon className="w-4 h-4 shrink-0 text-rose-500" />
                            }
                            <span className="font-semibold">
                              {releaseReady ? "Ready for Human Review" : "Blocked — Review Required"}
                            </span>
                          </div>

                          {/* Summary */}
                          <p className="text-[11px] font-mono text-charcoal-600 dark:text-slate-400">{releaseAgent.summary}</p>

                          {/* Blocking reasons */}
                          {blocking.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                Blocking Issues ({blocking.length})
                              </span>
                              {blocking.map((reason, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-[11px] font-mono text-rose-700 dark:text-rose-300 p-2 rounded bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                                  <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Warnings */}
                          {warnings.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Warnings ({warnings.length})
                              </span>
                              {warnings.map((w, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-[11px] font-mono text-amber-700 dark:text-amber-300 p-2 rounded bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/30">
                                  <ClockIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Gate checks from findings */}
                          {releaseAgent.findings.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 dark:text-slate-500">
                                Gate Checks
                              </span>
                              {releaseAgent.findings
                                .filter((f) => f.category !== "release" || !f.title.toLowerCase().includes("human approval"))
                                .map((f, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2 rounded border border-cream-200 dark:border-slate-800 bg-cream-50/60 dark:bg-slate-950/40">
                                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot(f.severity)}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[11px] font-semibold text-charcoal-800 dark:text-slate-200">{f.title}</span>
                                      {f.category && (
                                        <span className="text-[10px] font-mono text-charcoal-400 dark:text-slate-500 uppercase">{f.category}</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-charcoal-600 dark:text-slate-400 mt-0.5 font-mono leading-relaxed">
                                      {f.detail}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </Section>

                {/* ── Roadmap ───────────────────────────────────────────────── */}
                {analysisResult.roadmap.length > 0 && (
                  <Section
                    title="Planned Roadmap"
                    icon={<ClockIcon className="w-3.5 h-3.5 text-slate-500" />}
                    defaultOpen
                  >
                    <ol className="space-y-1.5">
                      {analysisResult.roadmap.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] font-mono">
                          <span className="w-5 h-5 rounded-full border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-charcoal-700 dark:text-slate-300 leading-relaxed pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}

                {/* ── All Agent Results ─────────────────────────────────────── */}
                <Section
                  title="Agent Pipeline Results"
                  icon={<SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />}
                  badge={
                    <Badge variant={agentFailureCount > 0 ? "warning" : "success"} size="sm">
                      {analysisResult.results.length} agents · {agentFailureCount} failed
                    </Badge>
                  }
                  defaultOpen={agentFailureCount > 0}
                >
                  <div className="space-y-2">
                    {analysisResult.results.map((result) => (
                      <AgentResultCard key={result.agent_name} result={result} />
                    ))}
                  </div>
                </Section>

                {/* ── Human Review Banner ───────────────────────────────────── */}
                <div className="rounded-lg border-2 border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-200 font-mono">
                      Ready for Human Review
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    AI-generated analysis, remediation, tests, and security findings require <strong>human review</strong> before any repository change is applied. No code has been committed, pushed, or merged.
                  </p>
                  <ul className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 space-y-1 pl-2">
                    <li>✓ Analysis complete — review agent findings above</li>
                    <li>✓ Patch is a proposal — do not apply without review</li>
                    <li>✓ Regression test is recommended — run it before merging</li>
                    <li>✓ Security findings are AI-generated — verify each one manually</li>
                    <li className="text-amber-600 dark:text-amber-400">⚠ No automatic commit, push, or merge has occurred</li>
                  </ul>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Idle state — show issue body tab area before analysis */}
      {(analysisState === "idle" || analysisState === "running") && (
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/50 dark:bg-slate-900/50 overflow-hidden">
          <div className="px-4 py-3 bg-cream-100 dark:bg-slate-950/80 border-b border-cream-300 dark:border-slate-800">
            <span className="text-xs font-mono font-semibold text-charcoal-500 dark:text-slate-400 uppercase tracking-wider">
              Analysis
            </span>
          </div>
          <div className="p-5 text-center space-y-3">
            {analysisState === "running" ? (
              <>
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto block" />
                <p className="text-xs font-mono text-charcoal-600 dark:text-slate-400">
                  Running Phase 4 agent pipeline…
                </p>
              </>
            ) : (
              <>
                <SparklesIcon className="w-8 h-8 text-charcoal-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-charcoal-700 dark:text-slate-300">
                  No analysis yet
                </p>
                <p className="text-xs text-charcoal-500 dark:text-slate-400 max-w-sm mx-auto">
                  Click <strong>Analyze Issue</strong> to run the six-agent pipeline: Orchestrator, Repository Intelligence, Patch Synthesis, Regression Test Synthesis, Security Audit, and Release.
                </p>
                <button
                  onClick={runAnalysis}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-xs transition-colors duration-150"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Analyze Issue
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
