"use client";

import React, { useState } from "react";
import { MOCK_AGENTS } from "@/data/mockData";
import { Agent, AgentStatus } from "@/types/domain";
import { AgentCard } from "@/components/agent/AgentCard";
import { AgentConsole } from "@/components/agent/AgentConsole";
import { Badge } from "@/components/ui/Badge";
import { AgentIcon, FilterIcon, ClockIcon, TerminalIcon } from "@/components/icons";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent-debug");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentStatus>("all");

  const filteredAgents = agents.filter(
    (a) => statusFilter === "all" || a.status === statusFilter
  );

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Specialized Agent Activity
          </h2>
          <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
            Simulated execution status of coordinated engineering agents analyzing, patching, and testing repository code.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-charcoal-700 dark:text-slate-400 bg-cream-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-cream-300 dark:border-slate-800 self-start sm:self-auto shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>7 Agents Configured</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 overflow-x-auto shadow-xs">
        <span className="text-xs font-mono text-charcoal-500 dark:text-slate-400 pl-1 pr-2 hidden sm:inline">
          Filter by Status:
        </span>
        {[
          { id: "all", label: "All Agents" },
          { id: "running", label: "Running" },
          { id: "completed", label: "Completed" },
          { id: "waiting_approval", label: "Awaiting Sign-off" },
          { id: "queued", label: "Queued" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-colors duration-150 whitespace-nowrap ${
              statusFilter === tab.id
                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 font-semibold shadow-xs"
                : "text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200/70 dark:hover:bg-slate-800 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Agent Cards & Selected Console Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Agents */}
        <div className="lg:col-span-7 space-y-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onSelect={() => setSelectedAgentId(agent.id)}
            />
          ))}

          {filteredAgents.length === 0 && (
            <div className="p-8 text-center border border-dashed border-cream-300 dark:border-slate-800 rounded-lg text-charcoal-500 dark:text-slate-500 text-xs font-mono bg-cream-100/40 dark:bg-transparent">
              No agents matching filter &ldquo;{statusFilter}&rdquo;.
            </div>
          )}
        </div>

        {/* Right Detail / Console Log Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/80 p-5 space-y-4 sticky top-20 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
                  Selected Agent Details
                </span>
                <Badge
                  variant={
                    selectedAgent.status === "completed"
                      ? "success"
                      : selectedAgent.status === "running"
                      ? "warning"
                      : "default"
                  }
                  size="sm"
                >
                  {selectedAgent.status}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-charcoal-900 dark:text-slate-100 mt-1">
                {selectedAgent.name}
              </h3>
              <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-0.5">
                {selectedAgent.description}
              </p>
            </div>

            <div className="p-3 rounded-md bg-cream-200/50 dark:bg-slate-950/70 border border-cream-300 dark:border-slate-800 text-xs font-mono space-y-1.5">
              <div className="text-charcoal-600 dark:text-slate-400">Current Task:</div>
              <div className="text-charcoal-800 dark:text-slate-200">{selectedAgent.currentTask}</div>
              <div className="pt-2 flex items-center justify-between text-[11px] text-charcoal-500 dark:text-slate-500 border-t border-cream-300/60 dark:border-slate-800/80">
                <span>Duration: {selectedAgent.duration}</span>
                <span>Progress: {selectedAgent.progressPercent}%</span>
              </div>
            </div>

            {/* Simulated Activity Console */}
            <AgentConsole
              logs={selectedAgent.sampleLogs}
              agentName={selectedAgent.name}
              title="Execution Log"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
