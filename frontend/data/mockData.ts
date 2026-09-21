/** Centralized mock data layer for PatchPilot AI (Phase 2 UI/UX)
 *
 * NOTE: All data below represents sample demonstration data to illustrate
 * the PatchPilot autonomous engineering workflow in local presentation mode.
 */

import {
  Repository,
  Issue,
  Agent,
  Patch,
  TestValidationSuite,
  SecurityFinding,
  ReleaseCandidate,
  ActivityEvent,
} from "@/types/domain";

export const MOCK_REPOSITORIES: Repository[] = [
  {
    id: "repo-1",
    name: "acme-store-api",
    org: "acme-corp",
    description: "Core REST and GraphQL eCommerce checkout and catalog backend service.",
    language: "Python",
    languageColor: "#3572A5",
    defaultBranch: "main",
    lastAnalysis: "12 minutes ago",
    healthScore: 94,
    openIssuesCount: 3,
    securityStatus: "warnings",
    starred: true,
  },
  {
    id: "repo-2",
    name: "payment-service",
    org: "acme-corp",
    description: "High-throughput asynchronous payment processing gateway and webhook consumer.",
    language: "Go",
    languageColor: "#00ADD8",
    defaultBranch: "main",
    lastAnalysis: "1 hour ago",
    healthScore: 88,
    openIssuesCount: 2,
    securityStatus: "vulnerable",
    starred: true,
  },
  {
    id: "repo-3",
    name: "inventory-platform",
    org: "acme-corp",
    description: "Distributed warehouse fulfillment, inventory reconciliation, and stock tracking.",
    language: "TypeScript",
    languageColor: "#3178C6",
    defaultBranch: "main",
    lastAnalysis: "3 hours ago",
    healthScore: 91,
    openIssuesCount: 5,
    securityStatus: "clean",
    starred: false,
  },
  {
    id: "repo-4",
    name: "auth-gateway",
    org: "acme-corp",
    description: "Edge identity verification, JWT validation, and RBAC policy enforcement proxy.",
    language: "Rust",
    languageColor: "#DEA584",
    defaultBranch: "main",
    lastAnalysis: "1 day ago",
    healthScore: 99,
    openIssuesCount: 0,
    securityStatus: "clean",
    starred: false,
  },
];

export const MOCK_ISSUES: Issue[] = [
  {
    id: "issue-142",
    number: 142,
    title: "Checkout returns 500 when coupon is expired",
    repo: "acme-store-api",
    branch: "main",
    severity: "high",
    status: "patch_ready",
    createdAt: "2 hours ago",
    author: "sre-monitoring",
    description: `Customers attempting to complete purchases with expired promotional discount codes encounter an unhandled HTTP 500 Internal Server Error instead of receiving a graceful 'coupon_expired' validation message. The checkout transaction aborts, resulting in cart abandonment.`,
    stackTrace: `Traceback (most recent call last):
  File "app/api/v1/endpoints/checkout.py", line 87, in process_checkout
    order = checkout_service.calculate_and_charge(cart, coupon_code)
  File "app/services/checkout.py", line 142, in calculate_and_charge
    discount_amount = coupon.calculate_discount(cart.subtotal)
  File "app/services/coupons.py", line 56, in calculate_discount
    raise CouponExpiredException(f"Coupon {self.code} expired on {self.expires_at}")
app.core.exceptions.CouponExpiredException: Coupon SPRING24 expired on 2026-03-31 23:59:59`,
    investigation: {
      rootCause:
        "Expired coupon objects are passed directly into the discount calculation engine without upfront expiration date validation, triggering an unhandled CouponExpiredException inside the order processing transaction.",
      confidence: 92,
      evidence: [
        "Uncaught CouponExpiredException in app/services/checkout.py:142",
        "AST inspection confirms checkout_service.calculate_and_charge lacks exception guard for expired coupons",
        "Order transaction database rollback occurred across 37 checkout sessions in the last 24h",
      ],
      affectedFiles: ["app/services/checkout.py", "app/services/coupons.py"],
      suggestedFix:
        "Inject an explicit expiration validation guard before calculating discount deductions. If expired, ignore discount, append a validation warning to the checkout context, and continue order processing normally.",
      diagnosedBy: "Debug Agent",
      diagnosisTime: "1m 14s",
    },
  },
  {
    id: "issue-89",
    number: 89,
    title: "Stripe webhook replay causes duplicate ledger entries",
    repo: "payment-service",
    branch: "main",
    severity: "critical",
    status: "investigating",
    createdAt: "4 hours ago",
    author: "finops-bot",
    description: `When Stripe retries delivery for 'charge.succeeded' events, our webhook handler does not verify idempotency keys against the Redis lock table, occasionally logging two ledger credits.`,
  },
  {
    id: "issue-204",
    number: 204,
    title: "Race condition in stock decrement during flash sales",
    repo: "inventory-platform",
    branch: "main",
    severity: "high",
    status: "investigating",
    createdAt: "1 day ago",
    author: "warehouse-lead",
    description: `Concurrent checkout requests for items with single-digit stock count pass validation simultaneously before decrementing, permitting overselling.`,
  },
  {
    id: "issue-177",
    number: 177,
    title: "Refresh token rotation race in Safari mobile",
    repo: "auth-gateway",
    branch: "main",
    severity: "medium",
    status: "closed",
    createdAt: "3 days ago",
    author: "frontend-team",
    description: `Parallel API requests dispatched on page load cause simultaneous token rotation calls, invalidating the refresh token family.`,
  },
];

export const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-explorer",
    name: "Explorer Agent",
    role: "Repository Intelligence & AST Topology",
    description: "Indexes repository syntax trees, builds symbol dependencies, and maps caller hierarchies.",
    status: "completed",
    currentTask: "Indexing symbol graph for acme-store-api",
    duration: "14s",
    progressPercent: 100,
    outputSummary: "Parsed 142 Python modules, identified 8 services, mapped 32 route dependencies.",
    sampleLogs: [
      { timestamp: "10:41:02", agent: "Explorer", level: "info", message: "Cloning AST representation for acme-store-api:main" },
      { timestamp: "10:41:08", agent: "Explorer", level: "info", message: "Extracted 2,840 symbol references across 142 files" },
      { timestamp: "10:41:14", agent: "Explorer", level: "success", message: "Call graph indexed. Identified checkout entrypoints at app/api/v1/checkout.py" },
    ],
  },
  {
    id: "agent-debug",
    name: "Debug Agent",
    role: "Root Cause Diagnosis & Exception Trace Correlation",
    description: "Analyzes stack traces, correlates execution paths, and calculates root-cause confidence scores.",
    status: "completed",
    currentTask: "Diagnosing CouponExpiredException in checkout pipeline",
    duration: "28s",
    progressPercent: 100,
    outputSummary: "Root cause identified with 92% confidence in app/services/checkout.py:142.",
    sampleLogs: [
      { timestamp: "10:41:16", agent: "Debug", level: "info", message: "Ingesting error telemetry from Sentry issue #142" },
      { timestamp: "10:41:24", agent: "Debug", level: "debug", message: "Correlating stack trace frames with AST symbol graph" },
      { timestamp: "10:41:38", agent: "Debug", level: "warn", message: "Missing try/except block around coupon.calculate_discount()" },
      { timestamp: "10:41:44", agent: "Debug", level: "success", message: "Diagnosis complete: Root cause isolated to unhandled expiration state (Confidence: 92%)" },
    ],
  },
  {
    id: "agent-fix",
    name: "Fix Agent",
    role: "Surgical Patch Synthesis & Code Generation",
    description: "Produces minimal diffs resolving root cause without altering public contracts or side effects.",
    status: "completed",
    currentTask: "Synthesizing guard logic in calculate_and_charge()",
    duration: "35s",
    progressPercent: 100,
    outputSummary: "Synthesized 14 additions, 3 deletions across 2 files. Zero contract breaking changes.",
    sampleLogs: [
      { timestamp: "10:41:46", agent: "Fix", level: "info", message: "Evaluating minimal edit distance candidates for checkout.py" },
      { timestamp: "10:42:01", agent: "Fix", level: "debug", message: "Synthesizing is_expired guard condition with graceful fallback" },
      { timestamp: "10:42:21", agent: "Fix", level: "success", message: "Patch candidate generated. Diff size: +14 / -3 lines" },
    ],
  },
  {
    id: "agent-test",
    name: "Test Agent",
    role: "Regression & Reproduction Test Synthesis",
    description: "Generates deterministic reproduction tests to prove bugs and prevent future regressions.",
    status: "completed",
    currentTask: "Synthesized test_expired_coupon_does_not_crash_checkout",
    duration: "42s",
    progressPercent: 100,
    outputSummary: "Synthesized 2 unit tests and 1 integration reproduction test. All assertions passing.",
    sampleLogs: [
      { timestamp: "10:42:23", agent: "Test", level: "info", message: "Generating synthetic expired coupon fixture with mock timestamp" },
      { timestamp: "10:42:45", agent: "Test", level: "info", message: "Running baseline test against pre-patch code -> Failed (expected 500)" },
      { timestamp: "10:43:05", agent: "Test", level: "success", message: "Running test against patched code -> Passed (HTTP 200 with coupon warning)" },
    ],
  },
  {
    id: "agent-security",
    name: "Security Agent",
    role: "Static Analysis & Vulnerability Audit",
    description: "Scans proposed patches for OWASP flaws, hardcoded credentials, and unintended authorization bypasses.",
    status: "completed",
    currentTask: "Static audit on synthesized patch diff",
    duration: "19s",
    progressPercent: 100,
    outputSummary: "0 critical or high security issues introduced in patch. Validated coupon bypass safety.",
    sampleLogs: [
      { timestamp: "10:43:07", agent: "Security", level: "info", message: "Scanning patch AST for CWE-20 (Improper Input Validation)" },
      { timestamp: "10:43:18", agent: "Security", level: "info", message: "Checking for privilege escalation or discount manipulation vectors" },
      { timestamp: "10:43:26", agent: "Security", level: "success", message: "Security scan cleared. No sensitive data leaks or injection surfaces." },
    ],
  },
  {
    id: "agent-validation",
    name: "Validation Agent",
    role: "Dual-Run Sandbox Verification",
    description: "Executes test suites in isolated sandbox environments to confirm patch efficacy and stability.",
    status: "running",
    currentTask: "Running full regression test suite (28/28 passed)",
    duration: "1m 10s",
    progressPercent: 88,
    outputSummary: "28/28 tests passed. Code coverage +4.2%. Sandbox execution stable.",
    sampleLogs: [
      { timestamp: "10:43:28", agent: "Validation", level: "info", message: "Spinning up clean ephemeral test runner container" },
      { timestamp: "10:43:55", agent: "Validation", level: "info", message: "Applied patch; executed 28 suite tests" },
      { timestamp: "10:44:38", agent: "Validation", level: "info", message: "Comparing performance benchmarks: Latency delta 0.2ms (negligible)" },
    ],
  },
  {
    id: "agent-release",
    name: "Release Agent",
    role: "Gatekeeper & Release Readiness Evaluation",
    description: "Evaluates quality gates, prepares changelog entries, and determines deployment readiness.",
    status: "waiting_approval",
    currentTask: "Awaiting human engineering approval for release candidate v2.4.1-patch1",
    duration: "6s",
    progressPercent: 95,
    outputSummary: "All quality gates evaluated. Ready for human review and approval.",
    sampleLogs: [
      { timestamp: "10:44:40", agent: "Release", level: "info", message: "Aggregating gate signals: Code (Pass), Tests (Pass), Security (Pass)" },
      { timestamp: "10:44:46", agent: "Release", level: "success", message: "Evaluation complete. Staged candidate for human sign-off." },
    ],
  },
];

export const MOCK_PATCH: Patch = {
  id: "patch-142",
  issueId: "issue-142",
  issueNumber: 142,
  title: "Fix unhandled coupon expiration in checkout workflow",
  repo: "acme-store-api",
  branch: "patchpilot/fix-142-coupon-expiration",
  targetBranch: "main",
  riskLevel: "low",
  validationStatus: "passed",
  createdAt: "35 minutes ago",
  authorAgent: "Fix Agent",
  summary:
    "Adds an expiration guard before discount calculations, preventing uncaught CouponExpiredException and ensuring checkout completes with an informative user warning.",
  filesChanged: [
    {
      filename: "app/services/checkout.py",
      oldPath: "app/services/checkout.py",
      newPath: "app/services/checkout.py",
      additions: 9,
      deletions: 2,
      unifiedDiff: `@@ -138,8 +138,15 @@ class CheckoutService:
         if coupon_code:
             coupon = self.coupon_repo.get_by_code(coupon_code)
             if coupon:
-                discount_amount = coupon.calculate_discount(cart.subtotal)
-                total = max(0, cart.subtotal - discount_amount)
+                if coupon.is_expired():
+                    logger.warning(f"Expired coupon {coupon_code} bypassed for cart {cart.id}")
+                    cart.add_warning("Coupon code has expired and was not applied.")
+                    total = cart.subtotal
+                else:
+                    discount_amount = coupon.calculate_discount(cart.subtotal)
+                    total = max(0, cart.subtotal - discount_amount)
             else:
                 cart.add_warning("Invalid coupon code.")
                 total = cart.subtotal`,
    },
    {
      filename: "tests/test_checkout.py",
      oldPath: "tests/test_checkout.py",
      newPath: "tests/test_checkout.py",
      additions: 5,
      deletions: 1,
      unifiedDiff: `@@ -88,4 +88,8 @@ def test_checkout_with_valid_coupon(client, sample_cart):
     assert response.status_code == 200
     assert response.json()["discount"] > 0
 
+def test_expired_coupon_does_not_crash_checkout(client, sample_cart, expired_coupon):
+    response = client.post("/api/v1/checkout", json={"cart_id": sample_cart.id, "coupon": expired_coupon.code})
+    assert response.status_code == 200
+    assert "expired" in response.json()["warnings"][0].lower()`,
    },
  ],
};

export const MOCK_TEST_SUITE: TestValidationSuite = {
  id: "suite-142",
  suiteName: "Checkout & Promotions Regression Suite",
  repo: "acme-store-api",
  targetPatchId: "patch-142",
  total: 28,
  passed: 28,
  failed: 0,
  skipped: 0,
  duration: "8.4s",
  coverageDelta: "+4.2%",
  steps: [
    { id: 1, name: "Ephemeral Sandbox Environment Provisioned", status: "completed", detail: "Docker Alpine sandbox booted in 1.2s" },
    { id: 2, name: "Patch Applied Cleanly to Working Tree", status: "completed", detail: "git apply --check passed with 0 conflicts" },
    { id: 3, name: "Reproduction Test Synthesis & Execution", status: "completed", detail: "test_expired_coupon_does_not_crash_checkout passed" },
    { id: 4, name: "Full Service Regression Suite Run", status: "completed", detail: "28/28 assertions verified with zero regressions" },
    { id: 5, name: "Static Security & Boundary Verification", status: "completed", detail: "No boundary violations detected" },
  ],
  testCases: [
    { id: "tc-1", name: "test_expired_coupon_does_not_crash_checkout", file: "tests/test_checkout.py", duration: "12ms", status: "passed", assertions: 3, isRegressionTest: true },
    { id: "tc-2", name: "test_checkout_with_valid_percent_coupon", file: "tests/test_checkout.py", duration: "15ms", status: "passed", assertions: 2 },
    { id: "tc-3", name: "test_checkout_with_valid_fixed_coupon", file: "tests/test_checkout.py", duration: "14ms", status: "passed", assertions: 2 },
    { id: "tc-4", name: "test_checkout_subtotal_calculation", file: "tests/test_checkout.py", duration: "9ms", status: "passed", assertions: 4 },
    { id: "tc-5", name: "test_tax_calculation_by_jurisdiction", file: "tests/test_tax.py", duration: "24ms", status: "passed", assertions: 6 },
    { id: "tc-6", name: "test_cart_item_quantity_updates", file: "tests/test_cart.py", duration: "11ms", status: "passed", assertions: 3 },
    { id: "tc-7", name: "test_order_persistence_in_transaction", file: "tests/test_orders.py", duration: "38ms", status: "passed", assertions: 5 },
  ],
};

export const MOCK_SECURITY_FINDINGS: SecurityFinding[] = [
  {
    id: "sec-1",
    title: "Missing authorization check on administrative refund trigger",
    severity: "high",
    cwe: "CWE-862",
    file: "app/api/v1/refunds.py",
    line: 44,
    status: "open",
    description: "Endpoint permits callers with standard authenticated tokens to initiate refund adjustments without verifying require_admin scope.",
    remediationSnippet: `@router.post("/refunds")
-def issue_refund(payload: RefundRequest, user = Depends(get_current_user)):
+def issue_refund(payload: RefundRequest, user = Depends(require_role(["admin", "support"]))):`,
    detectedAt: "2 hours ago",
  },
  {
    id: "sec-2",
    title: "Hardcoded secret credential found in integration test fixture",
    severity: "high",
    cwe: "CWE-798",
    file: "tests/fixtures/auth.py",
    line: 12,
    status: "open",
    description: "A private signing key was detected committed inside static test mock data. This poses key leakage risks if reused across environments.",
    remediationSnippet: `-TEST_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEA..."
+TEST_PRIVATE_KEY = os.environ.get("TEST_SIGNING_KEY", generate_ephemeral_rsa_key())`,
    detectedAt: "5 hours ago",
  },
  {
    id: "sec-3",
    title: "Outdated HTTP client library vulnerable to session leak",
    severity: "medium",
    cwe: "CWE-1104",
    file: "requirements.txt",
    line: 14,
    status: "open",
    description: "Package 'requests<2.31.0' does not strip Proxy-Authorization headers during HTTP 302 redirects to different destinations (CVE-2023-32681).",
    remediationSnippet: `-requests>=2.28.0,<2.31.0
+requests>=2.31.0,<3.0.0`,
    detectedAt: "1 day ago",
  },
  {
    id: "sec-4",
    title: "Bearer authentication token written to stdout in debug mode",
    severity: "low",
    cwe: "CWE-532",
    file: "app/core/logging.py",
    line: 82,
    status: "remediated",
    description: "Verbose request interceptor logs raw Authorization header values in dev environments.",
    detectedAt: "2 days ago",
  },
];

export const MOCK_RELEASE_CANDIDATE: ReleaseCandidate = {
  version: "v2.4.1-patch1 (Sample Release Candidate)",
  repo: "acme-store-api",
  branch: "main",
  status: "ready",
  summary:
    "Surgical stability release resolving checkout coupon expiration crashes (#142). Passes all 5 quality and regression verification gates.",
  gates: [
    {
      id: "gate-1",
      name: "Code Validation",
      category: "code",
      status: "passed",
      detail: "Syntax verified, AST parse clean, 0 lint or formatting errors introduced.",
      evaluator: "Explorer Agent",
    },
    {
      id: "gate-2",
      name: "Regression Tests",
      category: "tests",
      status: "passed",
      detail: "28/28 tests passed. Reproduction test synthesized and validated.",
      evaluator: "Validation Agent",
    },
    {
      id: "gate-3",
      name: "Security Review",
      category: "security",
      status: "passed",
      detail: "0 new CWE issues or credential leaks in patch scope. Input sanitization intact.",
      evaluator: "Security Agent",
    },
    {
      id: "gate-4",
      name: "Dependency Health",
      category: "dependencies",
      status: "warning",
      detail: "1 minor non-blocking dependency warning detected in repository background scan.",
      evaluator: "Security Agent",
    },
    {
      id: "gate-5",
      name: "Patch Risk",
      category: "risk",
      status: "passed",
      detail: "Low risk classification (+14/-3 lines). Strictly scoped to coupon calculation.",
      evaluator: "Fix Agent",
    },
  ],
  changelog: [
    "Fix(checkout): Prevent unhandled CouponExpiredException when applying promotional discount (#142)",
    "Test(checkout): Add deterministic unit test asserting graceful checkout continuation on expired codes",
    "Chore: Update order context to surface coupon warning messages without aborting transaction",
  ],
};

export const MOCK_ACTIVITY: ActivityEvent[] = [
  {
    id: "act-1",
    timestamp: "3 minutes ago",
    type: "validation",
    title: "Sandbox validation passed",
    description: "Validation Agent verified 28 tests for acme-store-api (patch-142)",
    repo: "acme-store-api",
    agentName: "Validation Agent",
  },
  {
    id: "act-2",
    timestamp: "12 minutes ago",
    type: "security",
    title: "Security audit cleared",
    description: "Security Agent confirmed 0 vulnerabilities introduced in patch diff",
    repo: "acme-store-api",
    agentName: "Security Agent",
  },
  {
    id: "act-3",
    timestamp: "18 minutes ago",
    type: "test",
    title: "Regression test synthesized",
    description: "Test Agent synthesized test_expired_coupon_does_not_crash_checkout",
    repo: "acme-store-api",
    agentName: "Test Agent",
  },
  {
    id: "act-4",
    timestamp: "24 minutes ago",
    type: "patch",
    title: "Surgical patch proposed",
    description: "Fix Agent generated diff for #142 (+14/-3 lines across 2 files)",
    repo: "acme-store-api",
    agentName: "Fix Agent",
  },
  {
    id: "act-5",
    timestamp: "31 minutes ago",
    type: "diagnosis",
    title: "Root cause isolated",
    description: "Debug Agent diagnosed CouponExpiredException in checkout pipeline (92% confidence)",
    repo: "acme-store-api",
    agentName: "Debug Agent",
  },
  {
    id: "act-6",
    timestamp: "45 minutes ago",
    type: "analysis",
    title: "Repository AST indexed",
    description: "Explorer Agent parsed 142 modules and built symbol call graph",
    repo: "acme-store-api",
    agentName: "Explorer Agent",
  },
];
