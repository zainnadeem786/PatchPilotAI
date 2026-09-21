import React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * PatchPilot AI Brand Mark
 * Represents precision code patch synthesis and autonomous engineering direction.
 */
export const PatchPilotMark: React.FC<LogoProps> = ({
  size = 28,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    {/* Base geometric precision container */}
    <rect
      x="2"
      y="2"
      width="28"
      height="28"
      rx="6"
      className="fill-indigo-600 dark:fill-indigo-600"
    />
    {/* Top left angled patch facet */}
    <path
      d="M7 10L14 7V16L7 19V10Z"
      fill="white"
      fillOpacity="0.9"
    />
    {/* Top right forward pilot delta */}
    <path
      d="M18 7L25 10V19L18 16V7Z"
      fill="white"
      fillOpacity="0.75"
    />
    {/* Central surgical anchor / precision crosshair */}
    <path
      d="M14 17.5L16 16L18 17.5L16 25L14 17.5Z"
      fill="white"
      fillOpacity="0.95"
    />
    {/* Central navigation node */}
    <circle cx="16" cy="12" r="1.5" fill="white" />
  </svg>
);

export const PatchPilotLogo: React.FC<{
  markSize?: number;
  className?: string;
  showWordmark?: boolean;
}> = ({ markSize = 28, className = "", showWordmark = true }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PatchPilotMark size={markSize} />
      {showWordmark && (
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="font-bold text-base tracking-tight text-charcoal-900 dark:text-slate-100">
            PatchPilot
          </span>
          <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
            AI
          </span>
        </div>
      )}
    </div>
  );
};
