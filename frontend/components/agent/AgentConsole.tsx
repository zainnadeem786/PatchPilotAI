import React from "react";
import { AgentLogEntry } from "@/types/domain";
import { TerminalIcon } from "@/components/icons";

export interface AgentConsoleProps {
  logs: AgentLogEntry[];
  agentName?: string;
  title?: string;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  logs,
  agentName,
  title = "Activity Console",
}) => {
  return (
    <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-xs">
      {/* Console Header — Fixed overlap root cause: clean flex layout, truncated title, shrink-0 badge, zero redundant text */}
      <div className="flex items-center justify-between gap-2 border-b border-cream-300 dark:border-slate-800/80 bg-cream-100 dark:bg-slate-900/90 px-3.5 py-2 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <TerminalIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold text-charcoal-900 dark:text-slate-200 truncate">
            {title}
          </span>
        </div>

        {agentName && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded border border-cream-300 dark:border-slate-700/80 bg-cream-200/80 dark:bg-slate-800 text-[11px] font-medium text-charcoal-700 dark:text-slate-300 whitespace-nowrap">
              {agentName}
            </span>
          </div>
        )}
      </div>

      {/* Log Output Stream */}
      <div className="p-3.5 font-mono text-xs space-y-1.5 max-h-64 overflow-y-auto bg-[#090d16] text-slate-300">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic py-2">No activity recorded for this agent.</div>
        ) : (
          logs.map((log, idx) => {
            const levelColor = {
              info: "text-slate-400",
              debug: "text-sky-400/90",
              warn: "text-amber-400",
              success: "text-emerald-400",
            }[log.level];

            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/60 px-1 py-0.5 rounded transition-colors duration-100"
              >
                <span className="text-slate-600 select-none text-[11px] shrink-0 font-mono">
                  {log.timestamp}
                </span>
                <span className="px-1 py-0.2 rounded bg-slate-800/80 text-[10px] text-slate-300 font-bold uppercase select-none shrink-0 font-mono">
                  {log.agent}
                </span>
                <span className={`flex-1 break-words ${levelColor}`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
