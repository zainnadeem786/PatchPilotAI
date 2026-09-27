import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "neutral" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  const variantStyles = {
    default:
      "bg-cream-200/90 text-charcoal-700 border-cream-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    success:
      "bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-800 border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    error:
      "bg-rose-500/10 text-rose-800 border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    info:
      "bg-sky-500/10 text-sky-800 border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
    neutral:
      "bg-cream-100 text-charcoal-500 border-cream-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    outline:
      "bg-transparent text-charcoal-600 border-cream-300 dark:text-slate-400 dark:border-slate-700",
  }[variant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-0.5 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded border font-mono tracking-tight ${variantStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
