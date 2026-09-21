"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon } from "@/components/icons";

export interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repoName: string) => void;
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [provider, setProvider] = useState("github");
  const [repoName, setRepoName] = useState("acme-corp/store-api");
  const [branch, setBranch] = useState("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate UI connection feedback
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      if (onSuccess) onSuccess(repoName);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1000);
    }, 600);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Connect Repository"
      description="Connect a code repository for automated AST indexing and issue investigation."
    >
      {isSuccess ? (
        <div className="py-5 text-center space-y-2.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckIcon className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100">
            Repository Connected
          </h4>
          <p className="text-xs font-mono text-charcoal-600 dark:text-slate-300">
            {repoName} ({branch})
          </p>
          <p className="text-[11px] text-charcoal-400 dark:text-slate-500">
            Repository indexed into simulated local workspace.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-medium text-charcoal-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Git Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-100 dark:bg-slate-950 px-3 py-1.5 text-xs text-charcoal-900 dark:text-slate-200 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
            >
              <option value="github">GitHub (Cloud / Enterprise)</option>
              <option value="gitlab">GitLab (Self-Hosted / SaaS)</option>
              <option value="local">Local Git Repository</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-medium text-charcoal-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Repository Identifier
            </label>
            <input
              type="text"
              required
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="organization/repository"
              className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-100 dark:bg-slate-950 px-3 py-1.5 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-medium text-charcoal-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Target Branch
            </label>
            <input
              type="text"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-100 dark:bg-slate-950 px-3 py-1.5 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
            />
          </div>

          <div className="rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-950/60 p-2.5 text-[11px] text-charcoal-500 dark:text-slate-400">
            <span className="font-semibold text-charcoal-700 dark:text-slate-300">Phase 2 Notice:</span> Demonstrates repository connection flow in local presentation mode.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cream-300 dark:border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium text-charcoal-600 dark:text-slate-400 hover:bg-cream-200 dark:hover:bg-slate-800 rounded-md transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded-md shadow-xs transition-colors duration-150"
            >
              {isSubmitting ? "Connecting..." : "Connect Repository"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
