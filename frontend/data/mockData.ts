/** Sample/demo data layer for PatchPilot AI.
 *
 * Only Repository and Issue sample data remain here. They back the explicit,
 * clearly-labeled "View sample demo data" opt-in toggle on the Repositories
 * and Issues pages when the backend is offline — never a silent fallback.
 * Every other page (Patches, Tests, Security, Releases, Dashboard, Sidebar,
 * Activity, Agents) is sourced entirely from real backend API calls.
 */

import { Repository, Issue } from "@/types/domain";

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
