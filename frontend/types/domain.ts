/** Domain types for PatchPilot AI (Phase 2 UI/UX) */

export type AgentStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "waiting_approval";

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

export type IssueStatus =
  | "open"
  | "investigating"
  | "patch_ready"
  | "validated"
  | "closed";

export type GateStatus = "passed" | "warning" | "failed" | "pending";

export interface Repository {
  id: string;
  name: string;
  org: string;
  description: string;
  language: string;
  languageColor: string;
  defaultBranch: string;
  lastAnalysis: string;
  healthScore: number;
  openIssuesCount: number;
  securityStatus: "clean" | "warnings" | "vulnerable";
  starred?: boolean;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  repo: string;
  branch: string;
  severity: SeverityLevel;
  status: IssueStatus;
  createdAt: string;
  author: string;
  description: string;
  stackTrace?: string;
  investigation?: {
    rootCause: string;
    confidence: number;
    evidence: string[];
    affectedFiles: string[];
    suggestedFix: string;
    diagnosedBy: string;
    diagnosisTime: string;
  };
}

export interface AgentLogEntry {
  timestamp: string;
  agent: string;
  level: "info" | "debug" | "warn" | "success";
  message: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  currentTask: string;
  duration: string;
  progressPercent: number;
  outputSummary: string;
  sampleLogs: AgentLogEntry[];
}

export interface PatchFile {
  filename: string;
  oldPath: string;
  newPath: string;
  additions: number;
  deletions: number;
  unifiedDiff: string;
}

export interface Patch {
  id: string;
  issueId: string;
  issueNumber: number;
  title: string;
  repo: string;
  branch: string;
  targetBranch: string;
  riskLevel: "low" | "medium" | "high";
  validationStatus: "passed" | "pending" | "failed";
  createdAt: string;
  authorAgent: string;
  filesChanged: PatchFile[];
  summary: string;
}

export interface TestCase {
  id: string;
  name: string;
  file: string;
  duration: string;
  status: "passed" | "failed" | "skipped";
  assertions: number;
  isRegressionTest?: boolean;
}

export interface TestValidationSuite {
  id: string;
  suiteName: string;
  repo: string;
  targetPatchId: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
  coverageDelta: string;
  steps: {
    id: number;
    name: string;
    status: "completed" | "in_progress" | "pending" | "failed";
    detail: string;
  }[];
  testCases: TestCase[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: SeverityLevel;
  cwe: string;
  file: string;
  line: number;
  status: "open" | "remediated" | "ignored";
  description: string;
  remediationSnippet?: string;
  detectedAt: string;
}

export interface ReleaseGate {
  id: string;
  name: string;
  category: "code" | "tests" | "security" | "dependencies" | "risk";
  status: GateStatus;
  detail: string;
  evaluator: string;
}

export interface ReleaseCandidate {
  version: string;
  repo: string;
  branch: string;
  status: "ready" | "conditional" | "blocked";
  summary: string;
  gates: ReleaseGate[];
  changelog: string[];
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "analysis" | "diagnosis" | "patch" | "test" | "security" | "validation";
  title: string;
  description: string;
  repo: string;
  agentName: string;
}
