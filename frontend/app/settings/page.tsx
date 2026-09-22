"use client";

import React, { useState } from "react";
import { CheckIcon } from "@/components/icons";

export default function SettingsPage() {
  const [maxAgents, setMaxAgents] = useState("4");
  const [sandboxIsolation, setSandboxIsolation] = useState("ephemeral");
  const [notifyOnPatch, setNotifyOnPatch] = useState(true);
  const [notifyOnSecurity, setNotifyOnSecurity] = useState(true);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
          Platform & Agent Settings
        </h2>
        <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-1">
          Configure agent concurrency limits, verification sandbox preferences, and team notification thresholds.
        </p>
      </div>

      {savedFeedback && (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Preferences saved to local browser state.</span>
          </div>
          <span className="text-[11px] text-charcoal-500 dark:text-slate-500">Local Configuration</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Agent Concurrency & Execution Limits */}
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-charcoal-800 dark:text-slate-300 font-mono">
            Agent Execution & Concurrency
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-charcoal-700 dark:text-slate-300 mb-1 font-mono">
                Maximum Parallel Specialized Agents
              </label>
              <select
                value={maxAgents}
                onChange={(e) => setMaxAgents(e.target.value)}
                className="w-full rounded-lg border border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-950 px-3 py-2 text-xs text-charcoal-900 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none font-mono shadow-xs transition-colors duration-150"
              >
                <option value="2">2 Agents (Conservative)</option>
                <option value="4">4 Agents (Recommended)</option>
                <option value="8">8 Agents (High-throughput)</option>
              </select>
              <span className="text-[11px] text-charcoal-500 dark:text-slate-500 mt-1 block">
                Limits simultaneous parallel exploration across Explorer, Debug, and Test agents.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 dark:text-slate-300 mb-1 font-mono">
                Sandbox Execution Isolation Mode
              </label>
              <select
                value={sandboxIsolation}
                onChange={(e) => setSandboxIsolation(e.target.value)}
                className="w-full rounded-lg border border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-950 px-3 py-2 text-xs text-charcoal-900 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none font-mono shadow-xs transition-colors duration-150"
              >
                <option value="ephemeral">Ephemeral Docker Containers (Standard)</option>
                <option value="microvm">Isolated MicroVMs (High Security)</option>
                <option value="process">Project-Local Subprocess (Dev Mode)</option>
              </select>
              <span className="text-[11px] text-charcoal-500 dark:text-slate-500 mt-1 block">
                Determines how synthesized regression tests and patches are validated.
              </span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/90 dark:bg-slate-900/60 p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-charcoal-800 dark:text-slate-300 font-mono">
            Autonomous Alert Triggers
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-cream-200/50 dark:bg-slate-950/60 border border-cream-300/80 dark:border-slate-800/80 hover:border-cream-400 dark:hover:border-slate-700 cursor-pointer transition-colors duration-150">
              <input
                type="checkbox"
                checked={notifyOnPatch}
                onChange={(e) => setNotifyOnPatch(e.target.checked)}
                className="rounded border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div>
                <span className="font-semibold text-charcoal-900 dark:text-slate-200 block">
                  Notify when a high-confidence patch is synthesized
                </span>
                <span className="text-charcoal-500 dark:text-slate-500 text-[11px]">
                  Triggers workspace alerts when confidence score exceeds 90%.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-cream-200/50 dark:bg-slate-950/60 border border-cream-300/80 dark:border-slate-800/80 hover:border-cream-400 dark:hover:border-slate-700 cursor-pointer transition-colors duration-150">
              <input
                type="checkbox"
                checked={notifyOnSecurity}
                onChange={(e) => setNotifyOnSecurity(e.target.checked)}
                className="rounded border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div>
                <span className="font-semibold text-charcoal-900 dark:text-slate-200 block">
                  Alert immediately on Critical / High CWE security detections
                </span>
                <span className="text-charcoal-500 dark:text-slate-500 text-[11px]">
                  Flags hardcoded credentials or authorization bypasses.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Local Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-mono font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-xs transition-colors duration-150"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
