import React from "react";
import { SeverityLevel } from "@/types/domain";

export interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = "" }) => {
  const styles = {
    critical:
      "bg-rose-500/15 text-rose-800 border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
    high:
      "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
    medium:
      "bg-orange-500/10 text-orange-800 border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30",
    low:
      "bg-sky-500/15 text-sky-800 border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
    info:
      "bg-cream-200 text-charcoal-600 border-cream-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  }[severity];

  const labels = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    info: "INFO",
  }[severity];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${styles} ${className}`}
    >
      {labels}
    </span>
  );
};
