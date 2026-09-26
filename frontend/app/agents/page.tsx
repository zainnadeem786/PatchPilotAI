"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { AgentRegistryEntry } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { AgentIcon, AlertIcon, SparklesIcon } from "@/components/icons";

// ── Agent icon mapping (display only) ────────────────────────────────────────
// Maps each canonical agent name to a short colour class for its badge.
const AGENT_COLORS: Record<string, string> = {
  orchestrator: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40",
  repository_intelligence: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40",
  patch_synthesis: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40",
  regression_test_synthesis: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40",
  security_audit: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40",
  release: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-500/40",
};

// ── Pipeline order label ───────────────────────────────────────────────────────
const PIPELINE_LABELS: Record<string, string> = {
  orchestrator: "Stage 1",
  repository_intelligence: "Stage 2",
  patch_synthesis: "Stage 3",
  regression_test_synthesis: "Stage 4",
  security_audit: "Stage 5",
  release: "Stage 6",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "offline" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const data = await api.getAgents();
      setAgents(data);
      setStatus("live");
      if (data.length > 0 && selectedName === null) {
        setSelectedName(data[0].name);
      }
    } catch (err: unknown) {
      const isOnline = await api.isBackendAvailable();
      if (!isOnline) {
        setStatus("offline");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load agent registry.");
      }
    }
  }, [selectedName]);

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAgent = agents.find((a) => a.name === selectedName) ?? agents[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            AI Agent Pipeline
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Canonical six-agent pipeline registered in the PatchPilot AI Agent Engine.
            Execute via <span className="font-mono text-indigo-600 dark:text-indigo-400">POST /api/v1/issues/&#123;id&#125;/analyze</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === "live" && (
            <div className="flex items-center gap-2 font-mono text-xs text-charcoal-700 dark:text-slate-400 bg-cream-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-cream-300 dark:border-slate-800 self-start sm:self-auto shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{agents.length} Agent{agents.length !== 1 ? "s" : ""} Registered</span>
            </div>
          )}
          {status === "loading" && (
            <div className="flex items-center gap-2 font-mono text-xs text-charcoal-500 dark:text-slate-400 bg-cream-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-cream-300 dark:border-slate-800 shadow-xs">
              <span className="w-2 h-2 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading…</span>
            </div>
          )}
        </div>
      </div>

      {/* Offline Banner */}
      {status === "offline" && (
        <div className="rounded-lg border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-amber-200">Backend Offline</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">
                Start the FastAPI backend on port 8000 to load the live agent registry.
              </p>
            </div>
          </div>
          <button onClick={fetchAgents} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-amber-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Error Banner */}
      {status === "error" && (
        <div className="rounded-lg border border-rose-300 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/20 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-charcoal-900 dark:text-rose-200">Failed to Load Agent Registry</h4>
              <p className="text-xs text-charcoal-600 dark:text-slate-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button onClick={fetchAgents} className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-charcoal-700 dark:text-slate-200 hover:bg-cream-100 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border border-cream-300/80 dark:border-slate-800/80 bg-cream-100/50 dark:bg-slate-900/40 p-4 space-y-2 animate-pulse">
                <div className="h-4 bg-cream-300/60 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-cream-200 dark:bg-slate-800/60 rounded w-2/3" />
                <div className="h-3 bg-cream-200 dark:bg-slate-800/60 rounded w-1/2" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-cream-300/80 dark:border-slate-800/80 bg-cream-100/50 dark:bg-slate-900/40 p-5 h-48 animate-pulse" />
          </div>
        </div>
      )}

      {/* Main Grid: Agent List + Detail Panel */}
      {status === "live" && agents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Agent list */}
          <div className="lg:col-span-7 space-y-2.5">
            {agents.map((agent, idx) => {
              const isSelected = agent.name === selectedName;
              const colorCls = AGENT_COLORS[agent.name] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/40";
              const stageLbl = PIPELINE_LABELS[agent.name] ?? `Stage ${idx + 1}`;

              return (
                <button
                  key={agent.name}
                  onClick={() => setSelectedName(agent.name)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors duration-150 ${
                    isSelected
                      ? "border-indigo-500/80 bg-cream-200/80 dark:bg-slate-900 shadow-xs ring-1 ring-indigo-500/40"
                      : "border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 hover:bg-cream-200/60 dark:hover:bg-slate-900 hover:border-cream-400 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${colorCls}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-charcoal-900 dark:text-slate-100 truncate">
                          {agent.display_name}
                        </h4>
                        <p className="text-[11px] text-charcoal-500 dark:text-slate-400 truncate mt-0.5">
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <Badge variant="neutral" size="sm">
                      {stageLbl}
                    </Badge>
                  </div>

                  <p className="mt-2.5 text-[11px] text-charcoal-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: Detail panel */}
          <div className="lg:col-span-5">
            {selectedAgent && (
              <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/80 p-5 space-y-4 sticky top-20 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
                      Agent Details
                    </span>
                    <Badge variant="info" size="sm">
                      {PIPELINE_LABELS[selectedAgent.name] ?? "Pipeline Agent"}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-charcoal-900 dark:text-slate-100 mt-1">
                    {selectedAgent.display_name}
                  </h3>
                  <p className="text-[11px] font-mono text-charcoal-500 dark:text-slate-400 mt-0.5">
                    {selectedAgent.role}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-cream-200/50 dark:bg-slate-950/70 border border-cream-300 dark:border-slate-800 text-xs font-mono">
                  <div className="text-charcoal-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                    Description
                  </div>
                  <p className="text-charcoal-800 dark:text-slate-200 leading-relaxed text-[11px]">
                    {selectedAgent.description}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-cream-200/50 dark:bg-slate-950/70 border border-cream-300 dark:border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="text-charcoal-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                    Identifier
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-charcoal-500 dark:text-slate-500">Agent name</span>
                    <code className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded text-[10px]">
                      {selectedAgent.name}
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-charcoal-500 dark:text-slate-500">Pipeline position</span>
                    <span className="text-charcoal-700 dark:text-slate-300">
                      {PIPELINE_LABELS[selectedAgent.name] ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Disclaimer — no fake execution metrics */}
                <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-cream-50/60 dark:bg-slate-900/60 p-3 text-[11px] font-mono text-charcoal-500 dark:text-slate-400">
                  <SparklesIcon className="w-3.5 h-3.5 inline mr-1.5 text-indigo-400" />
                  Agent execution metrics (duration, progress, logs) are only available
                  during a live analysis run. Open an issue and click{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">Analyze Issue</span>{" "}
                  to trigger the pipeline.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state if backend is live but returns no agents (should not happen) */}
      {status === "live" && agents.length === 0 && (
        <div className="rounded-lg border border-dashed border-cream-300 dark:border-slate-800 p-8 text-center space-y-2.5">
          <AgentIcon className="w-8 h-8 text-charcoal-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-charcoal-900 dark:text-slate-200">
            No agents returned by registry
          </h3>
          <p className="text-xs text-charcoal-500 dark:text-slate-400">
            The backend agent registry returned an empty list. Check the backend configuration.
          </p>
        </div>
      )}
    </div>
  );
}
