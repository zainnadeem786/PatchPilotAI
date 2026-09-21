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
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
            Backend Connectivity
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-sm text-slate-300">Endpoint:</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {api.getBaseUrl()}/api/health
            </span>
          </div>
        </div>

        <button
          onClick={handleCheckBackend}
          disabled={state === "loading"}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
        >
          {state === "loading" ? "Checking..." : "Check Backend"}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-sm text-slate-400">Status:</span>

        {state === "idle" && (
          <span className="text-sm text-slate-500 italic">
            Click &ldquo;Check Backend&rdquo; to test connection
          </span>
        )}

        {state === "loading" && (
          <span className="inline-flex items-center gap-2 text-sm text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            Connecting to FastAPI...
          </span>
        )}

        {state === "connected" && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Backend Connected ✓
            </span>
            {data && (
              <span className="block text-xs font-mono text-slate-400 mt-0.5">
                {data.service} [{data.status}]
              </span>
            )}
          </div>
        )}

        {state === "unavailable" && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Backend Unavailable
            </span>
            {errorMessage && (
              <span className="block text-xs text-rose-300/80 mt-0.5 max-w-xs truncate">
                {errorMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
