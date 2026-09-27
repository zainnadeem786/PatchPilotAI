"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import {
  BackendRepository,
  BackendIssue,
  AgentRegistryEntry,
  PatchResponse,
  RegressionTestResponse,
  SecurityFindingResponse,
  ReleaseReadinessResponse,
} from "@/types/api";

export type Metric = number | null; // null = still loading or request failed

export interface PlatformStats {
  repositoryCount: Metric;
  totalIssueCount: Metric;
  openIssueCount: Metric;
  agentCount: Metric;
  patchCount: Metric;
  testCount: Metric;
  securityCount: Metric;
  releaseCount: Metric;
}

export interface PlatformStatsContextValue {
  stats: PlatformStats;
  loading: boolean;
  refreshStats: () => Promise<void>;
  agents: AgentRegistryEntry[];
  recentIssues: BackendIssue[];
  recentPatches: PatchResponse[];
  recentTests: RegressionTestResponse[];
  recentSecurity: SecurityFindingResponse[];
  recentReleases: ReleaseReadinessResponse[];
  backendReachable: boolean | null;
}

const defaultStats: PlatformStats = {
  repositoryCount: null,
  totalIssueCount: null,
  openIssueCount: null,
  agentCount: null,
  patchCount: null,
  testCount: null,
  securityCount: null,
  releaseCount: null,
};

const PlatformStatsContext = createContext<PlatformStatsContextValue>({
  stats: defaultStats,
  loading: true,
  refreshStats: async () => {},
  agents: [],
  recentIssues: [],
  recentPatches: [],
  recentTests: [],
  recentSecurity: [],
  recentReleases: [],
  backendReachable: null,
});

export const PlatformStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [stats, setStats] = useState<PlatformStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([]);
  const [recentIssues, setRecentIssues] = useState<BackendIssue[]>([]);
  const [recentPatches, setRecentPatches] = useState<PatchResponse[]>([]);
  const [recentTests, setRecentTests] = useState<RegressionTestResponse[]>([]);
  const [recentSecurity, setRecentSecurity] = useState<SecurityFindingResponse[]>([]);
  const [recentReleases, setRecentReleases] = useState<ReleaseReadinessResponse[]>([]);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);

  const isFetchingRef = useRef(false);

  const fetchAllStats = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const [
        repoResult,
        issueResult,
        agentResult,
        patchResult,
        testResult,
        securityResult,
        releaseResult,
        healthResult,
      ] = await Promise.allSettled([
        api.getRepositories(),
        api.getIssues(),
        api.getAgents(),
        api.getPatches(),
        api.getRegressionTests(),
        api.getSecurityFindings(),
        api.getReleases(),
        api.isBackendAvailable(),
      ]);

      const repos = repoResult.status === "fulfilled" ? repoResult.value : null;
      const issues = issueResult.status === "fulfilled" ? issueResult.value : null;
      const agentList = agentResult.status === "fulfilled" ? agentResult.value : null;
      const patches = patchResult.status === "fulfilled" ? patchResult.value : null;
      const tests = testResult.status === "fulfilled" ? testResult.value : null;
      const security = securityResult.status === "fulfilled" ? securityResult.value : null;
      const releases = releaseResult.status === "fulfilled" ? releaseResult.value : null;
      const isOnline = healthResult.status === "fulfilled" ? healthResult.value : false;

      const repoTotalOpenIssues = repos !== null
        ? repos.reduce((acc, r) => acc + (r.open_issues_count ?? 0), 0)
        : null;

      const issueItems: BackendIssue[] = issues !== null
        ? (Array.isArray(issues) ? issues : (issues as any).items || [])
        : [];

      setStats({
        repositoryCount: repos !== null ? repos.length : null,
        totalIssueCount: repoTotalOpenIssues,
        openIssueCount: repoTotalOpenIssues,
        agentCount: agentList !== null ? agentList.length : null,
        patchCount: patches !== null ? patches.length : null,
        testCount: tests !== null ? tests.length : null,
        securityCount: security !== null ? security.length : null,
        releaseCount: releases !== null ? releases.length : null,
      });

      if (agentList) setAgents(agentList);
      if (issueItems.length > 0) setRecentIssues(issueItems.slice(0, 3));
      if (patches) setRecentPatches(patches.slice(0, 4));
      if (tests) setRecentTests(tests.slice(0, 4));
      if (security) setRecentSecurity(security.slice(0, 4));
      if (releases) setRecentReleases(releases.slice(0, 1));
      setBackendReachable(isOnline);

    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch on mount and on route changes
  useEffect(() => {
    fetchAllStats();
  }, [fetchAllStats, pathname]);

  // Listen to custom global refresh events
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchAllStats();
    };

    window.addEventListener("patchpilot:refresh-stats", handleGlobalRefresh);
    return () => {
      window.removeEventListener("patchpilot:refresh-stats", handleGlobalRefresh);
    };
  }, [fetchAllStats]);

  return (
    <PlatformStatsContext.Provider
      value={{
        stats,
        loading,
        refreshStats: fetchAllStats,
        agents,
        recentIssues,
        recentPatches,
        recentTests,
        recentSecurity,
        recentReleases,
        backendReachable,
      }}
    >
      {children}
    </PlatformStatsContext.Provider>
  );
};

export const usePlatformStats = () => useContext(PlatformStatsContext);
