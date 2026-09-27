"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, AlertIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { BackendRepository } from "@/types/api";

export interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (repo: BackendRepository) => void;
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [owner, setOwner] = useState("octocat");
  const [name, setName] = useState("Hello-World");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRepo, setSuccessRepo] = useState<BackendRepository | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const cleanOwner = owner.trim();
      const cleanName = name.trim();

      if (!cleanOwner || !cleanName) {
        throw new Error("Both Owner and Repository name are required.");
      }

      const repo = await api.connectRepository(cleanOwner, cleanName);
      setSuccessRepo(repo);
      setIsSubmitting(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("patchpilot:refresh-stats"));
      }

      if (onSuccess) {
        onSuccess(repo);
      }

      setTimeout(() => {
        handleReset();
      }, 1500);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : "Failed to connect repository.";
      setErrorMessage(msg);
    }
  };

  const handleReset = () => {
    setSuccessRepo(null);
    setErrorMessage(null);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Connect Repository"
      description="Fetch GitHub repository metadata and register it in PatchPilot PostgreSQL storage."
    >
      {successRepo ? (
        <div className="py-5 text-center space-y-2.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckIcon className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-charcoal-900 dark:text-slate-100">
            Repository Connected Successfully
          </h4>
          <p className="text-xs font-mono text-charcoal-600 dark:text-slate-300">
            {successRepo.full_name} ({successRepo.default_branch})
          </p>
          <p className="text-[11px] text-charcoal-400 dark:text-slate-500">
            Synced with PostgreSQL backend and ready for agent analysis.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-md border border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold block">Connection Error:</span>
                <span className="text-[11px] leading-relaxed break-words">{errorMessage}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-medium text-charcoal-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Owner / Organization
              </label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. octocat"
                className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-100 dark:bg-slate-950 px-3 py-1.5 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-medium text-charcoal-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Repository Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hello-World"
                className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-100 dark:bg-slate-950 px-3 py-1.5 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
              />
            </div>
          </div>

          <div className="rounded-md border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-950/60 p-2.5 text-[11px] text-charcoal-500 dark:text-slate-400 font-mono">
            Calls <code className="text-indigo-600 dark:text-indigo-400">POST /api/v1/repositories</code> to fetch GitHub metadata and persist to PostgreSQL.
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
              className="px-3.5 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded-md shadow-xs transition-colors duration-150 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect Repository</span>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
