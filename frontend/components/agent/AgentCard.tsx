import React from "react";
import { Agent } from "@/types/domain";
import { StatusDot } from "@/components/ui/StatusDot";
import { Badge } from "@/components/ui/Badge";
import { ClockIcon } from "@/components/icons";

export interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isSelected = false,
  onSelect,
}) => {
  const statusConfig = {
    completed: { label: "Completed", variant: "success" as const },
    running: { label: "Running", variant: "warning" as const },
    waiting_approval: { label: "Sign-off", variant: "info" as const },
    queued: { label: "Queued", variant: "neutral" as const },
    failed: { label: "Failed", variant: "error" as const },
  }[agent.status];

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border p-4 transition-colors duration-150 cursor-pointer ${
        isSelected
          ? "border-indigo-500/80 bg-cream-200/80 dark:bg-slate-900 shadow-xs ring-1 ring-indigo-500/40"
          : "border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50 hover:bg-cream-200/60 dark:hover:bg-slate-900 hover:border-cream-400 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusDot status={agent.status} pulse={agent.status === "running"} size="sm" />
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-charcoal-900 dark:text-slate-100 truncate">
              {agent.name}
            </h4>
            <p className="text-[11px] text-charcoal-500 dark:text-slate-400 truncate mt-0.5">
              {agent.role}
            </p>
          </div>
        </div>

        <Badge variant={statusConfig.variant} size="sm">
          {statusConfig.label}
        </Badge>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-600 dark:text-slate-400">
          <span className="truncate max-w-[200px] text-charcoal-800 dark:text-slate-300">
            {agent.currentTask}
          </span>
          <span className="flex items-center gap-1 text-charcoal-400 dark:text-slate-500 shrink-0">
            <ClockIcon className="w-3 h-3" />
            {agent.duration}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-cream-300/80 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-out ${
              agent.status === "completed"
                ? "bg-emerald-500"
                : agent.status === "running"
                ? "bg-amber-500"
                : agent.status === "waiting_approval"
                ? "bg-sky-500"
                : "bg-charcoal-400 dark:bg-slate-600"
            }`}
            style={{ width: `${agent.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-cream-300/80 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
        <p className="text-charcoal-500 dark:text-slate-400 truncate max-w-[260px]">
          {agent.outputSummary}
        </p>
        <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium shrink-0 ml-2">
          Logs &rarr;
        </span>
      </div>
    </div>
  );
};
