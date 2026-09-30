# EstateSalen Launch Audit Register — target 2026-10-05
Evidence-based audit. Findings are added per batch; every item carries status PASS / FAIL / BLOCKED / NOT APPLICABLE (pending). No item is counted as passing from code alone unless a live test executed.

## System inventory (Batch 1 — measured 2026-09-30)
| Layer | Count | Notes |
|---|---|---|
| Entities | 210 | 0 entities declare `rls` config — all rely on platform defaults (see B1-01) |
| Backend functions | 359 | incl. create-checkout, wix-payments-webhook, resolveUserIdentity, backfillUserIdentities |
| Scheduled workflows | 87 | incl. 9 CustomerIO sync workflows, daily scrapers, sitemap/GSC refresh |
| AI agents | 25 | 12 are lowercase duplicates of the same agents (dead config dupes) — cleanup item |
| Pages | 243 | 196 explicit routes in App.jsx + legacy pagesConfig loop |
| Components | 335 | |
| Production data | 8 users, 7 sales, 44 items, 11 marketplace items, 200+ leads, 200+ SEO pages, 200+ directory records, 22 subscription packages | Small live dataset — launch-volume assumptions must be stated (Batch 11) |

### Secrets configuration (Batch 1)
- 33 secrets declared; 39 referenced by functions.
- **13 referenced secrets are NOT declared**: `EMAIL_VERIFY_API_KEY`, `EMAIL_VERIFY_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `META_LEADGEN_VERIFY_TOKEN`, `META_LEADGEN_WEBHOOK_SECRET`, `OPENAI_DEFAULT_MODEL`, `OPENAI_IMAGE_MODEL`, `OPENAI_EMBEDDING_MODEL`, `MAKE_SOCIAL_SCHEDULER_WEBHOOK_URL`, `BASE44_APP_URL`, `LEGACY_LANE_ADMIN_ALERT_EMAIL` (see B1-02).
- Declared but unreferenced (audit candidates, not defects): `HOUSZU_IDENTITY_API_KEY`, `HOUSZU_IDENTITY_WEBHOOK_SECRET`, `CUSTOMERIO_WEBHOOK_SIGNING_SECRET`, `CUSTOMERIO_API_MODE`, `OPERATOR_CREDIT_PERCENTAGE`, `MASTER_APP_SECRET`.

### Route sweep (live preview, 2026-09-30) — PASS
25 public routes render; 0 404s. Hub detail pages render via `?slug=` (verified Old Bridge NJ). `/NotificationSettings` (25 recurring crash issues in register) currently renders — needs regression retest, duplicates to be deduped.

## Findings register
| ID | Severity | Workflow | Finding | Evidence | Status |
|---|---|---|---|---|---|
| B1-01 | **P0 (pending live negative test)** | Data isolation | No entity declares RLS. Any authenticated app user can read/write all entity records via the SDK (cross-company sales, leads, directories, wallet data) unless platform defaults mitigate. | `grep '"rls"' base44/entities → 0 of 210` | PENDING TEST (needs non-admin test account) |
| B1-02 | P1 | Affected features using undeclared secrets | Functions reference 13 undeclared secrets (Twilio SMS, Meta lead-gen webhook verification, email verification, OpenAI model names, Make.com scheduler, admin alert email). Any feature depending on them fails or silently falls back at runtime. | secret-usage scan vs declared secrets | FAIL (identify affected features in Batch 3) |
| B1-03 | P2 | SEO | Sitemap submits bare `/price-guide` (priority 0.7), which renders "Location not found." without a slug param. Similar bare index routes (`/estate-sales`, `/categories`, `/brands`, `/companies`, `/sale-recap`) are detail-only pages with no index view. | sitemap/entry.ts line 62; live render check | FAIL |
| B1-04 | P3 | Frontend | React "Invalid prop on Fragment" warnings in SEOBreadcrumb.jsx:20 and SEBreadcrumb.jsx:20 (on /wanted, /items, /learn). | console errors during route sweep | FAIL |
| B1-05 | P3 | Agents | 12 duplicate lowercase agent configs (e.g. AdminOpsAgent + admin_ops_agent) — dead duplicates, risk of editing the wrong one. | file listing | FAIL |
| B1-06 | P2 | Identity | 2 of 8 production users (team_member, vendor accounts) still missing `masterUserID`; backfill needs another run to completion. | service-role user scan 2026-09-30 | FAIL (fix: run backfillUserIdentities again) |
| B1-07 | P2 | Issue hygiene | 25 duplicate LaunchIssue records for the same /NotificationSettings crash — register is noisy; dedupe and set retest status. | LaunchIssue read | FAIL |

## Test register (Batch 1)
| Test | Result | Notes |
|---|---|---|
| Public route sweep (25 routes) | PASS | 0 404, 0 blank crashes; hub slug pages render content |
| Sitemap function invocation | PASS (emits 297 URLs) | 1 SEO defect found (B1-03) |
| Service-role data counts (24 entities) | PASS | Real production data confirmed |
| Cross-tenant data access (negative test) | BLOCKED | Requires non-admin test account (Batch 2) |

## Cleanup of test artifacts
None created yet in Batch 1 (read-only audit).

## Next batches
- Batch 2: identity/roles/data isolation — create isolated test account, negative tests on RLS gaps, self-role-escalation, cross-company reads.
- Batch 3: database write audit on operator workflow (sale → inventory → publish).
- Batch 4: shopper/discovery + subscriptions & money flows.
- Batch 5: cross-app contracts (Houszu, Customer.io, Meta) + referral exchange.
- Batch 6: admin, comms/consent, security, mobile/print, consolidated verdict.