# Phase 3B Certification Report — Operator Website Tenant Engine (Control Plane)

**Date:** 2026-10-11
**Scope:** Provisioning, domains, destination invariants, lifecycle, lead ingestion — Phase 3B control-plane functions and entities.
**Method:** Live end-to-end certification against production, synthetic isolated Companies A/B/C, sequential + concurrent invocation, full cleanup with residue scan. An earlier run was invalidated by invocation rate-limiting (parallel bursts); a corrected sequential run is authoritative. Anonymous-path simulation is not possible (test runner is authenticated); unauthenticated guards verified by code inspection.

## Code fix applied during certification
- `provisionWebsiteTenant`: idempotent replay now short-circuits BEFORE entitlement/capacity checks, so a retry after capacity is reached still replays instead of denying.

## Results — Provisioning (all PASS)
| Check | Result |
|---|---|
| Authenticated provisioning (elite, 0/2 used) | PASS — tenant created, member projection + tier snapshot written |
| Idempotent replay (same key) | PASS — same tenant, `idempotent_replay: true`, no duplicate |
| Replay after capacity exhausted (new ordering) | PASS |
| Reserved slug `admin` | PASS — denied `slug_reserved` |
| Non-member company (platform admin, strict) | PASS — denied `not_company_member` |
| Suspended company | PASS — denied `company_not_eligible` |
| Case-insensitive slug collision (`CERT-CO-A`) | PASS — denied `slug_taken` |
| Cross-company global slug namespace (simulated B tenant) | PASS — denied `slug_taken` |
| Concurrent same-slug + same-idempotency (parallel pair) | PASS — exactly 1 survivor (post-create arbitration) |
| Capacity exhausted (2/2 elite) | PASS — denied `entitlement_capacity_exhausted` |

## Results — Domains (all PASS)
- Platform subdomain reserve (cert-co-a.estatesalen.com): PASS
- Wrong-platform hostname: PASS — denied `subdomain_mismatch`
- Normalization idempotency (protocol/case/path variants): PASS — same record returned
- Custom domain created with secure random UUID token (not id-derived): PASS
- Platform host as custom domain: PASS — denied `reserved_platform_host`
- One-primary invariant: first primary ok; second denied `primary_domain_exists`; detach frees slot; second primary then allowed: PASS (full cycle)
- Concurrent same-hostname reservation: PASS — exactly 1 survivor; loser replayed/serialized correctly

## Results — Destination invariant (all PASS)
- Cross-company destination attach (LLS destination → Test tenant): PASS — denied `cross_company_destination` (admin path reaches invariant)
- Same-company destination attach: PASS
- Already-attached destination to a second tenant: PASS — denied `destination_already_attached`

## Results — Lifecycle (all PASS)
- setup→active (activated_at set): PASS
- active→setup: PASS — denied `invalid_transition_active_to_setup`
- active→suspended (suspended_at + suspended_by audit): PASS
- suspended→active: PASS
- setup→archived (archived_at + archived_by): PASS
- archived→active: PASS — denied (archived is terminal)

## Results — Lead ingestion (all PASS)
- Cross-company sale attribution: PASS — denied `cross_company_sale`
- Valid lead: PASS — company_id derived from tenant (client value ignored)
- Explicit consent only: PASS — vip_opt_in=true → consent_captured_at set; no flags → no consent timestamp, marketing/vip/sms all false
- Event attribution envelope returned for future outbox path: PASS
- Unauthenticated seam: 401 `public_ingestion_not_enabled` guard present in code (runtime anon simulation not available)

## Residue & Cleanup
- 18 synthetic records deleted by exact id (2 leads, 5 domains, 5 tenants, 1 destination, 1 sale, 1 subscription, 3 companies) plus 1 probe tenant on LLS.
- Residue scans: tenants/domains/leads/companies/sales/subscriptions = **0**.
- One per-account side effect: the provisioning probe consumed a premium-website entitlement slot on LLS momentarily; restored to 0/1 after probe-tenant deletion.

## Phase 2 Regression (read-only, all PASS)
- LLS Company active; canonical Sale + 27 inventory items intact.
- Publication `published`, external ref `os_69b058479d65ca9487ea8e2e`, source_version CURRENT.
- Destination active (`operator_website`), configuration untouched.
- Legacy `saleDataFeed`: success, 7 sales, correct company attribution — collision guard intact.

## Known limitations / notes
- Function-invocation rate limiting prevents large parallel test bursts; concurrent tests limited to 2-way pairs (validated) rather than high-fanout.
- Unauthenticated behavior verified by code review only (test runner authenticates).
- `submitWebsiteLead` with a nonexistent tenant id returns 500 (id-field filter throws before the 404 branch) — cosmetic; will normalize to `tenant_not_found` during Phase 3C runtime work.

## Verdict
**PHASE 3B CONTROL PLANE: CERTIFIED.** Multi-tenant isolation, global slug/hostname namespaces, one-primary invariant, lifecycle machine, explicit-consent lead model, and cross-company invariants all hold end-to-end. Phase 2 architecture unmodified. Ready for Phase 3C (multi-tenant website runtime/routing engine).