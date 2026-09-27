"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { ConnectionState, HealthResponse } from "@/types/api";

export function HealthStatus() {
  const [state, setState] = useState<ConnectionState>("idle");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckBackend = async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      const res = await api.checkHealth();
      setData(res);
      setState("connected");
    } catch (err: unknown) {
      setData(null);
      setState("unavailable");
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to connect to backend");
      }
    }
  };

  return (
    <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
            Backend Connectivity (Phase 1 API Verification)
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-charcoal-500 dark:text-slate-400">Endpoint:</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-cream-300 dark:border-slate-800 bg-cream-200/60 dark:bg-slate-950 text-charcoal-700 dark:text-slate-300">
              {api.getBaseUrl()}/api/health
            </span>
          </div>
        </div>

        <button
          onClick={handleCheckBackend}
          disabled={state === "loading"}
          type="button"
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          {state === "loading" ? "Checking..." : "Check Backend"}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-cream-300/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-charcoal-500 dark:text-slate-400">Status:</span>

        {state === "idle" && (
          <span className="text-charcoal-400 dark:text-slate-500 text-[11px] italic">
            Click &ldquo;Check Backend&rdquo; to test live FastAPI link
          </span>
        )}

        {state === "loading" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            Connecting to FastAPI...
          </span>
        )}

        {state === "connected" && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Backend Connected ✓
            </span>
            {data && (
              <span className="block text-[10px] font-mono text-charcoal-500 dark:text-slate-400 mt-0.5">
                {data.service} [{data.status}]
              </span>
            )}
          </div>
        )}

        {state === "unavailable" && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-rose-600 dark:text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Backend Unavailable
            </span>
            {errorMessage && (
              <span className="block text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 max-w-xs truncate font-mono">
                {errorMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
