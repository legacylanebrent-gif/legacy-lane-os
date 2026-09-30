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

## Batch 2 — identity, roles, data isolation (2026-09-30)
| ID | Severity | Workflow | Finding | Evidence | Status |
|---|---|---|---|---|---|
| B1-01 | **P0 CONFIRMED** | Data isolation | Platform RLS semantics (authoritative): an operation with no rule stays open to EVERYONE — including anonymous visitors. 0/210 entities declare RLS → all sales, leads, wallet, CRM and directory data are readable AND writable by any authenticated user (and anonymous on public flows). | rls capability guide + 0-entity grep | FAIL |
| B2-01 | P1 | Admin tooling | Destructive maintenance endpoints lack admin guards: `removeDuplicateOperators` and `removeDuplicateConnections` have NO auth check at all; `deleteNJDuplicates` checks login only (no role); `releasePendingWalletCredits` has NO auth. Any authenticated user can mass-delete production operator/connection records or force early wallet-credit release. | code inspection of 5 functions | FAIL |
| B2-02 | P1 | Notifications & referral engine | 20 functions have syntax-corrupted source from the earlier mass-rename (`const Estate Sale Company Owner = …` — invalid identifier): 15 currently unbootable at source, and 5 ACTIVE paths (notifyContractSigned, notifyItemSold, notifyPaymentReceived, notifySaleStatusChange, generateReferralAgreement) still run only on stale pre-corruption deployments — any redeploy breaks payment/sale-status notifications and referral agreements. Live-tested: deployed versions still respond. | grep of 20 files; test_backend_function × 2 | FAIL (redeploy time bomb) |
| B2-03 | **P1 cross-app** | Identity resolution | Houszu Central Identity endpoint unreachable: domain URL → 404 "App not found for this domain" (stale domain); app-ID URL (69d11abfe3a01036002a99a2) → 404 "Backend function 'identityResolve' not found or not deployed". Identity resolution fails for ALL users; backfillUserIdentities live run returned failed=4, users parked in `retrying`. Requires fix on the HOUSZU app (function missing/renamed) or the correct new endpoint URL. | live fetch probes + live backfill run | FAIL — external dependency |
| B1-06 | P2 | Identity | Backfill re-run executed: 4 users processed, 0 resolved — BLOCKED by B2-03. | live backfill run | BLOCKED |

### Batch 2 test register
| Test | Result |
|---|---|
| RLS semantics confirmation (platform docs) | PASS — B1-01 confirmed FAIL |
| Admin-guard audit of destructive functions (8 sampled) | PASS — 4 unguarded (B2-01) |
| Corrupted-source sweep across 359 functions | PASS — 20 files (B2-02) |
| notifyItemSold / notifySaleStatusChange live calls | PASS — deployed versions still boot and respond |
| backfillUserIdentities live run | PASS — executed; 0 resolved due to B2-03 |
| Houszu endpoint probes (domain + app-ID URL) | PASS — probes executed; both 404 |
| Cross-tenant negative test with real non-admin account | NOT RUN — requires inviting a test user (needs a reachable inbox); superseded by authoritative RLS semantics for B1-01 |

### Remediation queued from Batch 2 (fix phase)
1. Add admin guards to removeDuplicateOperators, removeDuplicateConnections, releasePendingWalletCredits, deleteNJDuplicates.
2. Repair the 5 corrupted active functions (rename invalid identifiers) so redeploys are safe; repair or archive the 15 dormant ones.
3. Await Houszu-side fix for identityResolve; then re-run backfillUserIdentities.
4. Introduce RLS on sensitive entities (Lead, WalletTransaction, OperatorWallet, Purchase, Cart, Order, Subscription, ConsumerMarketingProfile, CRM entities, directories) — owner-or-admin pattern; public reads only where intended.

## Next batches
- Batch 3: database write audit on operator workflow (sale → inventory → publish).
- Batch 3: database write audit on operator workflow (sale → inventory → publish).
- Batch 4: shopper/discovery + subscriptions & money flows.
- Batch 5: cross-app contracts (Houszu, Customer.io, Meta) + referral exchange.
- Batch 6: admin, comms/consent, security, mobile/print, consolidated verdict.