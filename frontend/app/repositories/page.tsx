"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MOCK_REPOSITORIES } from "@/data/mockData";
import { Repository } from "@/types/domain";
import { ConnectRepoModal } from "@/components/repository/ConnectRepoModal";
import { Badge } from "@/components/ui/Badge";
import {
  RepoIcon,
  SearchIcon,
  PlusIcon,
  BranchIcon,
  ClockIcon,
  IssueIcon,
} from "@/components/icons";

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>(MOCK_REPOSITORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang =
      selectedLanguage === "all" ||
      repo.language.toLowerCase() === selectedLanguage.toLowerCase();
    return matchesSearch && matchesLang;
  });

  const handleRepoConnected = (repoName: string) => {
    const newRepo: Repository = {
      id: `repo-${Date.now()}`,
      name: repoName.split("/")[1] || repoName,
      org: repoName.split("/")[0] || "acme-corp",
      description: "Newly connected repository queued for initial AST and security indexing.",
      language: "Python",
      languageColor: "#3572A5",
      defaultBranch: "main",
      lastAnalysis: "Just now",
      healthScore: 98,
      openIssuesCount: 0,
      securityStatus: "clean",
    };
    setRepositories([newRepo, ...repositories]);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-charcoal-900 dark:text-slate-100">
            Connected Repositories
          </h2>
          <p className="text-xs text-charcoal-500 dark:text-slate-400 mt-0.5">
            Repositories actively indexed for call graphs, AST symbol resolution, and patch synthesis.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-md shadow-xs transition-colors duration-150 self-start sm:self-auto"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/70 dark:bg-slate-900/50">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-charcoal-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter repositories by name or description..."
            className="w-full rounded-md border border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-950 py-1 pl-8 pr-3 text-xs text-charcoal-900 dark:text-slate-200 placeholder-charcoal-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal-500 dark:text-slate-400 font-mono hidden sm:inline">Language:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="rounded-md border border-cream-300 dark:border-slate-700 bg-cream-50 dark:bg-slate-950 px-2.5 py-1 text-xs text-charcoal-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none font-mono transition-colors duration-150"
          >
            <option value="all">All Languages</option>
            <option value="python">Python</option>
            <option value="go">Go</option>
            <option value="typescript">TypeScript</option>
            <option value="rust">Rust</option>
          </select>
        </div>
      </div>

      {/* Repository Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredRepos.map((repo) => (
          <div
            key={repo.id}
            className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-100/60 dark:bg-slate-900/50 p-4 hover:border-cream-400 dark:hover:border-slate-700 transition-colors duration-150 space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-cream-200 dark:bg-slate-800 border border-cream-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <RepoIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-charcoal-900 dark:text-slate-100 font-mono truncate">
                        {repo.name}
                      </h3>
                      <span className="text-[11px] text-charcoal-400 dark:text-slate-500 font-mono">
                        {repo.org}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-charcoal-500 dark:text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <BranchIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-500" />
                        {repo.defaultBranch}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 text-charcoal-400 dark:text-slate-500" />
                        {repo.lastAnalysis}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {repo.healthScore}%
                  </span>
                  <span className="block text-[10px] uppercase font-mono text-charcoal-400 dark:text-slate-500">
                    Health
                  </span>
                </div>
              </div>

              <p className="text-xs text-charcoal-600 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                {repo.description}
              </p>
            </div>

            <div className="pt-2.5 border-t border-cream-300/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-charcoal-700 dark:text-slate-300">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: repo.languageColor }}
                  />
                  {repo.language}
                </span>

                <span className="flex items-center gap-1 text-charcoal-500 dark:text-slate-400">
                  <IssueIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {repo.openIssuesCount} issues
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {repo.securityStatus === "clean" && (
                  <Badge variant="success" size="sm">Clean</Badge>
                )}
                {repo.securityStatus === "warnings" && (
                  <Badge variant="warning" size="sm">1 Warning</Badge>
                )}
                {repo.securityStatus === "vulnerable" && (
                  <Badge variant="error" size="sm">Action Req</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRepos.length === 0 && (
        <div className="p-8 text-center border border-dashed border-cream-300 dark:border-slate-800 rounded-lg bg-cream-100/40 dark:bg-slate-900/20">
          <RepoIcon className="w-6 h-6 text-charcoal-400 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">No repositories found</h4>
          <p className="text-[11px] text-charcoal-400 dark:text-slate-500 mt-0.5">
            No repositories matched your search query or language filter.
          </p>
        </div>
      )}

      {/* Connect Repo Modal */}
      <ConnectRepoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRepoConnected}
      />
    </div>
  );
}
