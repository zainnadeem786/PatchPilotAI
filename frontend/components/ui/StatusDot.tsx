import React from "react";

export interface StatusDotProps {
  status: "completed" | "running" | "queued" | "failed" | "waiting_approval" | "clean" | "warnings" | "vulnerable";
  size?: "sm" | "md";
  pulse?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = "md", pulse = false }) => {
  const colorMap = {
    completed: "bg-emerald-500",
    clean: "bg-emerald-500",
    running: "bg-amber-500",
    warnings: "bg-amber-500",
    waiting_approval: "bg-sky-500",
    queued: "bg-charcoal-400 dark:bg-slate-500",
    failed: "bg-rose-500",
    vulnerable: "bg-rose-500",
  }[status];

  const sizeClass = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className="relative inline-flex items-center justify-center shrink-0">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${colorMap}`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${colorMap} ${sizeClass}`} />
    </span>
  );
};
