# ESTATESALEN — REFERRAL SYSTEM AUDIT (READ-ONLY)

**Date:** 2026-10-22
**Method:** Code inspection + read-only database aggregates. No code, settings, permissions, records, payouts, or integrations were touched. This is a technical/operational audit, not a certification of legal compliance.

---

## A. EXECUTIVE FINDINGS

**Three separate referral systems coexist in the codebase:**

1. **Affiliate / subscription referral program ($25)** — ACTIVE. Users share links/QR codes; when a referred company signs up and (manually, by admin) is marked paid, the referrer earns a $25 gift-card reward. 2 live records, $0 paid to date.
2. **Houszu / Legacy Lane real-estate referral exchange** — ACTIVE CODE, DORMANT DATA (0 records). A complete compensation pipeline exists: self-signed master agreement → lead acceptance with **Brent Cramp hard-coded as designated referral agent (KW Central Monmouth)** → platform-authored deal agreement → closing sync from Houszu → **wallet credit = 30% of `referral_amount_due_to_brent`, 10-day hold** → admin release → operator withdrawal (min $100) → admin approval. Emails disclaim the credits as "not real estate commissions … may be subject to 1099 reporting."
3. **Chapter 11 partner referral (professional→operator attribution)** — ACTIVE, COMPENSATION-FREE. Opaque server-resolved tokens; the seller submits a request; attribution is resolved server-side; no compensation exists on this path. This is the closest existing implementation to Proposed Model A.

**Most consequential gaps (details in B):**

- **No licensing or brokerage verification exists anywhere.** The only license data is a free-text, self-edited "License #" input on profile pages. No status, state, verifier, expiration, or brokerage-affiliation structure. Nothing gates any money path on licensure.
- **The legacy compensation model is fully active**: 30% of Brent's referral amount, 10-day hold, $25-per-lead affiliate rewards, 1099 language — and the **AI operator coach states the 20%-commission / 30%-operator / 10-day / 1099 model as fact** (adminAiOperator prompt).
- **Active marketing promises operators real-estate referral income** (ReferralIncomeSection: "get paid for the introductions you're already making", "$1,000's more in your pocket", calculator at 2.5% × 25% × **30%** operator share) with no license eligibility, brokerage routing, or entitlement disclaimer.
- **Payment-path authorization holes**: an operator can directly edit their own wallet balance (RLS permits owner update of `OperatorWallet`); `processResellerReferralReward` lets any user self-award $25 with no payment verification; `notifyHouszu_CloseDeal` is callable by any authenticated user with an arbitrary deal/commission amount.
- **Financial exposure today is negligible** (1 wallet at $0, 0 wallet transactions, 2 pending $25 affiliate referrals, 0 real-estate referral records) — the legacy machinery can be rebuilt before real money flows through it.

---

## B. EVIDENCE TABLE

| Area | Implementation reference | Observed behavior | Proposed-model mismatch | Severity | Verification limit |
|---|---|---|---|---|---|
| Wallet credit from closed Houszu deal | `base44/functions/syncClosedDealFromHouszu/entry.ts` L47–66 | `operatorCredit = round(referral_amount_due_to_brent * 0.30)`; status `pending`; `available_after = closing + 10 days`; wallet pending/total incremented; email says "platform credits — not real estate commissions … 1099" | Pays operators real-estate-referral-derived money as platform credits; **no license check**; 30% share, not the proposed 70%; EstateSalen (not the brokerage) is the payer of record | **P0** (active legacy payment path) | Whether Houszu validates callbacks is outside this app (UNVERIFIED) |
| Auth on closing sync | Same file L8–12 | Guarded by `LEGACY_SHARED_API_KEY` header only | Server-to-server trust; amount taken as asserted truth | P1 | — |
| Closing notification to Houszu | `base44/functions/notifyHouszu_CloseDeal/entry.ts` L11–28 | **Any authenticated user** can POST `{deal_id, actual_commission}` → invokes Houszu `closeDeal`, returns `referral_amount_due_to_brent` | No caller-to-deal ownership check; upstream of the wallet-credit path | **P0** | Houszu-side validation unknown |
| Wallet RLS | `base44/entities/OperatorWallet.jsonc` (update: `data.operator_id === {{user.id}}`) | **Operators can update their own wallet balances directly** via the entity API; `requestOperatorWithdrawal` validates against that self-editable balance | Self-service balance manipulation → withdrawal request → admin approval | **P0** | Admin approval still gates actual payment |
| WalletTransaction RLS | `base44/entities/WalletTransaction.jsonc` (create: owner-allowed) | Operators can create wallet transactions for themselves; updates admin-only | Inconsistent write boundary; unused by current credit flow (service-role writes) | P1 | — |
| Self-award $25 (reseller) | `base44/functions/processResellerReferralReward/entry.ts` (whole file, no auth beyond caller===referrer) | Caller fetches a `Referral` by id, checks `account_type==='reseller' && first_payment_date` **on a record the caller can create/edit** (Referral entity has no explicit RLS), then adds $25 to their own `User.account_balance` | Self-minted, unverified compensation; `account_balance` has **no consumption path anywhere** (dangling field) | **P0** | — |
| Referral entities RLS | `Referral`, `ReferralLead`, `ReferralDealPipeline`, `ReferralCommission`, `ReferralDealAgreement`, `MasterReferralAgreement`, `RewardAction`, `UserReward` — no `rls` key | Platform-default access applies; referral records contain referrer/referred emails, client names, property addresses | Cross-operator data exposure; contra Ch19 least-privilege doctrine used elsewhere | P1 | Exact platform-default semantics assumed, not re-tested with a second account |
| $25 affiliate reward | `Referral.reward_amount` (default 25); `processReferralRewards` (admin); `updateReferralStatus` (admin) | On Referral status `paid`, a `UserReward` of `reward_amount || 25` is created (idempotent by `action_id: referral_<id>`) | Per-signup affiliate reward — genuine software affiliate income, but shares the `Referral` entity with the (abusable) reseller path | P1 (path hardening) | Verified: `wix-payments-webhook/entry.ts` contains **no Referral handling** — the `paid` transition is manual admin action only (`updateReferralStatus`, admin-gated) |
| Referral code resolution | `resolveReferralCode`, `createReferral`, `generateReferralQR`, `ReferralLanding.processPostSignup` | Opaque first-8/last-8 of user id; server-side exact-match resolution; safe failure; referral created **only when the referred user signs up**; dedup by (referred_user_id, referrer_id); a click creates no lead | Largely matches proposed attribution doctrine | OK | — |
| Master agreement | `JoinReferralExchange` (4-step wizard) → client-side `MasterReferralAgreement.create` | **Self-signed by any authenticated user**; stores name/email/IP/timestamp; no license or brokerage fields | Self-attestation activates the exchange | P1 | — |
| Deal acceptance | `acceptLeadAndGenerateAgreement/entry.ts` L20–60 | Only gate = active master agreement; accepter self-assigns as agent/operator by account type; **hardcodes `referral_agent_name: 'Brent Cramp'`, `referral_agent_brokerage: 'Keller Williams Realty Central Monmouth'`**; `contract_url` = **mock** `https://legacy-lane.s3.amazonaws.com/contracts/…pdf` | No eligibility/assignment check on the lead; fake contract URL shown as real; Brent's licensed role asserted by hardcode | **P0** (mock contract) / P1 (eligibility) | — |
| Platform-authored agreement terms | `Step2Acknowledgements.jsx`, `Step3Terms.jsx`, `generateReferralAgreement/entry.ts` | Terms state payments are "platform incentives, marketing credits, or service-based compensation — not direct real estate commissions"; routing must go through Brent Cramp or "another approved licensed referral entity"; non-circumvention 12 months; **liquidated damages = greater of 25% of gross commission or $5,000** | A structural disclaimer that real-estate-referral-derived money to (potentially unlicensed) participants is "not a commission" — characterization requires broker/legal review | Legal review | — |
| Marketing income claims | `src/components/landing/ReferralIncomeSection.jsx` (used by `LandingPageOneDay`) | "💰 BONUS INCOME OPPORTUNITY — Put $1,000's more in your pocket per year"; "EstateSalen helps make sure you **get paid for the introductions you're already making**"; "you participate in the income"; calculator: `price × 2.5% × 25% × 30%`; unverified "90% of probate leads to a home sale" stats; only footnote is "Estimates only… ~2.5% agent commission side" | Implies unlicensed operators are paid for real-estate introductions; 30% share contradicts proposed 70%; no brokerage-deduction/tax clarity; no license eligibility mention | **P0** (active misleading promise) | — |
| Landing-page referral engine claims | `LandingPageReferralEngine.jsx` L27–29, L98–110, L141–187 | Active copy: "**You receive a referral fee when deals close**", "Referral Opportunity Assessment" promising operators "consistent referral income through a structured agent partnership" | Implies closing-based referral-fee income to estate-sale operators with no license/eligibility qualification | **P0** (active misleading promise) | — |
| AI coach compensation copy | `adminAiOperator/entry.ts` L50–54 | Prompt asserts: agent pays 20% of total commission; Brent receives 100% of the 20%; "Legacy Lane operators may receive 30% of Brent's referral amount"; credited within 10 days; "withdrawable as 1099 income by check or direct deposit" | The legacy model is coached to operators as fact | **P0** (misleading active claim) | — |
| Withdrawal flow | `requestOperatorWithdrawal` (min $100, balance check, deduct at request), `adminApproveWithdrawal` (admin), `releasePendingWalletCredits` (admin) | Withdrawal requests deduct available balance at request time; approval marks completed and increments `withdrawn_total`; no idempotency guard on approval (double-approve double-counts); no rejection/refund handler found | Weak duplicate prevention; no actual payment rail in-app (payment happens off-platform) | P1 | Actual payout mechanics (check/direct deposit) are off-platform — UNVERIFIED |
| Estimate vs earnings separation | `ReferralCommission` / `ReferralDealPipeline` schemas | Fields exist for estimated vs actual price/commission/fee — but **0 records and no writer code found** (dormant tables); no wallet integration | Proposed separation is schema-only; nothing enforces it | P1 | — |
| Configurable rates | Secret `OPERATOR_CREDIT_PERCENTAGE` | **Declared but referenced nowhere**; 30% is hardcoded | Dormant config; fallback/default rate governance absent | P2 | — |
| 70% partner share | — | **Not implemented anywhere** (no 70/0.70 referral-share constant exists) | Proposed model's 70% is missing entirely | P1 (rebuild) | — |
| Partner referral (Ch11) | `resolvePartnerReferral`, `submitPartnerReferredInquiry`, `PartnerReferral.jsx` | Seller submits own request; referrer identity resolved server-side from opaque token; flows into canonical pipeline with source provenance; **no marketing consent granted** | Matches proposed attribution/consent doctrine; carries no compensation (compatible with Model A) | OK | Whether stored inquiry consent keeps text/version + timestamp: UNVERIFIED (EstateTransitionLead schema not re-read this run) |
| Houszu seller-permission record | `ReferralLead` schema (no consent fields) | Stores client name + property address; **no seller permission/consent fields at all** | Proposed model requires recorded seller permission; missing | P1 | — |
| License fields | `MyProfile.jsx` L865/897/923, `OperatorProfile.jsx` L77–390 | Free-text self-edited "License #" only; no status/state/verifier/expiry/brokerage structure anywhere | Licensing verification: missing | **P1 (eligibility core)** | — |
| Customer.io | `customerioService`, webhook ingest | No referral-specific events found; wallet/withdrawal flows do not emit Customer.io events | No cross-system estimate→earnings leakage found | OK | Full payload review not performed (queues not inspected) |
| Scheduled jobs | `base44/workflows/` (94 files) | **No workflow references referral, wallet, reward, or commission** — no scheduled job accrues, releases, or reports referral money (all admin-triggered functions) | No hidden automation; also no lapse/expiry automation | OK | — |
| Routes/status | `App.jsx` + `pages.config.js` | All referral pages are routed/active: ReferralLanding, ReferralDashboard, MyReferrals, ReferCompany, ReferralBatchInvite, ReferralOutreach, JoinReferralExchange, ReferralDealPipeline, OperatorWalletDashboard, OperatorPayoutWallet, OperatorCommissions, LandingPageReferralEngine, PartnerReferral, AgentOperatorPortal (agentportal tabs), AgentPartnerships | — | — | — |

---

## C. CURRENT LIFECYCLE AND MONEY-FLOW MAP (as implemented)

**Affiliate path ($25):** share link (`/?ref=CODE` or `/OperatorPackages?ref=CODE`, ReferralLinkCard; QR = last-8 of user id) → public ReferralLanding → `resolveReferralCode` (server, exact-match, safe failure — no lead created on click) → visitor signs up → `createReferral` (server; dedup per user+referrer; also creates a Connection) → **status transition to `paid` is manual admin action** (`updateReferralStatus`); any automatic subscription-driven transition UNVERIFIED → `processReferralRewards` / `updateReferralStatus` creates a $25 `UserReward` (idempotent) → shown in MyReferrals/ReferralDashboard as "$25 Visa Gift Card". Bypass: `processResellerReferralReward` self-award path (P0 above).

**Houszu exchange path (legacy compensation):** JoinReferralExchange wizard → self-signed `MasterReferralAgreement` (client-side create, IP recorded) → leads (source of lead creation not found in code — externally supplied; UNVERIFIED) → AcceptLeadModal → `acceptLeadAndGenerateAgreement` (gate: active master agreement only; hardcodes Brent Cramp / KW Central Monmouth; mock S3 contract URL) → `generateReferralAgreement` HTML agreement → deal tracked in ReferralDealPipeline page / agent portal tabs (no writer found for ReferralCommission/ReferralDealPipeline stage math) → closing: `notifyHouszu_CloseDeal` (any authenticated user; amount client-supplied) → Houszu computes `referral_amount_due_to_brent` → Houszu calls back `syncClosedDealFromHouszu` (LEGACY_SHARED_API_KEY) → **wallet credit 30%, 10-day hold** (dedup by deal_id) → `releasePendingWalletCredits` (admin) moves pending→available → `requestOperatorWithdrawal` (operator; min $100; deducts balance) → `adminApproveWithdrawal` (admin) → withdrawn_total. Actual money movement is off-platform (check/direct deposit per copy) — UNVERIFIED.

**Consent/authority notes:** no stage verifies licensure; no stage records seller permission on the exchange path; the affiliate path has no seller (it's a company-signup referral). The Ch11 partner path records seller-submitted requests with server-side attribution and grants no marketing consent.

**Where a user can bypass the intended sequence:** (1) direct `OperatorWallet.update` on own wallet; (2) `processResellerReferralReward` self-call; (3) `notifyHouszu_CloseDeal` with arbitrary deal/amount; (4) default-access `Referral` records (read/create) feeding the reseller reward check; (5) `acceptLeadAndGenerateAgreement` accepts any lead_id with only a self-signed master agreement.

---

## D. FINANCIAL EXPOSURE (read-only aggregates, 2026-10-22)

| Measure | Value |
|---|---|
| Operator wallets | 1 (all balances **$0**: credits/available/pending/withdrawn/frozen = 0) |
| Wallet transactions | **0** |
| Referral (affiliate) records | 2 (1 `pending`, 1 `converted`; both `reward_status: pending`) → **potential $50 in gift-card rewards, none paid** |
| UserRewards | 5 total, **0** referral-derived |
| ReferralLead / ReferralDealPipeline / ReferralCommission / ReferralDealAgreement / MasterReferralAgreement | **0 / 0 / 0 / 0 / 0** |
| Pending withdrawal requests | 0 |
| Balances tied to unlicensed/unknown-status users | Not computable — **no license-status data exists at all** (not inferred) |

**Interpretation:** the legacy compensation machinery is fully built but financially untouched; existing balances are $0, so there are **no historical earnings to preserve or unwind** — only 2 pending $25 affiliate rewards. Any rebuild can proceed without financial-record migration burden. Subscription credits from referrals: none found.

---

## E. PROPOSED-MODEL COMPARISON

| Proposed-model element | Status |
|---|---|
| A. Attribution-only introduction links (no lead, no entitlement on share/click) | **Implemented** (affiliate link + Ch11 partner path) — with exceptions: signup auto-creates the Referral record (attribution, acceptable), but the reseller self-award and wallet paths create entitlements |
| A. Seller voluntarily submits own request with permission, timestamps, routing | **Partial** — Ch11 partner path yes; Houszu exchange path has **no seller permission record** |
| A. No unlicensed-operator per-lead/closing/wallet/subscription rewards | **Conflicting** — $25 affiliate rewards are live (software-affiliate, distinct); the 30% wallet credit path pays referral-derived money with no license gate |
| B. Illustrative assumptions configurable | **Missing/dormant** — calculator rates hardcoded (2.5%/25%/30%); `OPERATOR_CREDIT_PERCENTAGE` secret unused |
| B. 25% fee × **70%** partner share | **Missing** — 70% appears nowhere; 30% is implemented |
| B. No liability/accumulation/withdrawable/unlockable estimates | **Partial** — the calculator writes nothing; but wallet credits (real, transaction-derived) are withdrawable and labeled referral commissions in admin copy; transaction-specific estimate linked to a seller request is NOT implemented (proposed design = REQUIRES BROKER/LEGAL REVIEW) |
| C. Verified license, brokerage, jurisdiction, agreements required | **Missing entirely** — no fields, no checks, no history |
| C. Individual (not company) eligibility | **Missing** — eligibility concept does not exist |
| C. New referrals distinguishable from pre-eligibility introductions; no retroactive conversion | **Missing** (moot while 0 records, but needed in rebuild) |
| C. Payment via brokerage route | **Conflicting** — EstateSalen credits/pay operators directly as platform income ("not real estate commissions" disclaimer) |
| C. Lapse handling / no forfeit of prior eligible amounts | **Missing/UNVERIFIED** (no status history; frozen_balance exists but no lapse logic) |
| C. NJ rules not applied nationally | **Conflicting** — Brent/KW-NJ routing hard-coded into every deal agreement nationally |

---

## F. SEPARATE BROKER/LEGAL DECISION LIST

1. **Transaction-specific opportunity estimates tied to actual seller requests** — not built; per the audit brief, this design is REQUIRES BROKER/LEGAL REVIEW.
2. **Recruiting language and percentage assumptions** — the 30%-of-Brent's-fee model (calculator, AI coach, wallet) vs the proposed 25% × 70% model; whether "platform credits, not commissions" is a permissible characterization for referral-derived money paid to unlicensed participants.
3. **State-by-state eligibility and brokerage routing** — hard-coded Brent Cramp / KW Central Monmouth routing on all deals; NJ treatment applied nationally.
4. **The 20%-of-total-commission-to-Brent arrangement** asserted in the AI coach and master-agreement routing terms — needs confirmation of actual brokerage authority and payment terms.
5. **Liquidated damages clause** (greater of 25% of gross commission or $5,000) — enforceability/review.
6. **Existing agreements and pending compensation after any status change** — currently moot ($0), but the rebuild must define lapse treatment before money flows.
7. **Treatment of the 2 pending $25 affiliate rewards** and whether the gift-card program continues as pure software-affiliate (clearly labeled) or is absorbed into the new model.
8. **1099 reporting obligations** for platform credits — copy asserts it; no reporting mechanism exists.

---

## G. PRIORITIZED REBUILD PLAN (proposed — NOT executed)

**P0 — stop unauthorized/misleading paths (dependencies: none; migrations: none)**
1. Fix wallet RLS: owner updates on `OperatorWallet` and owner creates on `WalletTransaction` must be removed (admin/service-role only); wallet balances become server-computed or admin-written only.
2. Remove or admin-gate `processResellerReferralReward`; retire the dangling `User.account_balance` field; add RLS to `Referral` (and the other default-access referral entities) restricting reads to owner/admin.
3. Add caller-ownership + deal-existence verification to `notifyHouszu_CloseDeal` (or make it service-key-only like the inbound sync).
4. Replace the mock `contract_url` in `acceptLeadAndGenerateAgreement` (currently a non-existent S3 URL presented as a generated contract).
5. Copy triage: neutralize ReferralIncomeSection income promises and the adminAiOperator compensation claims pending broker/legal decision (Task 4 in F).

**P1 — eligibility, consent, attribution, data separation (dependencies: broker/legal decisions in F; migrations: new license/eligibility records; no historical money to migrate)**
6. Licensee verification record (individual legal name, license #, state, status, brokerage, verifier, effective dates, history) + eligibility gate on every compensated path; no self-attestation activation; preserve eligibility-at-referral-time.
7. Seller permission/consent record on the exchange path (permission to contact an agent ≠ marketing consent; store text/version/timestamp); separate operator-submitted-on-behalf-of flow with recorded authorization.
8. Separate stores: illustrative assumptions (config entity) / per-request illustrative output (non-ledger) / brokerage-approved payable / payment status — the dormant ReferralCommission/ReferralDealPipeline tables should not receive the new model without redesign.
9. Attribution hardening: link lifecycle for deleted/inactive operators; retry/duplicate behavior beyond the existing signup dedup.
10. Re-label wallet/admin copy that calls credits "referral commissions."

**P2 — presentation and usability (dependencies: P1 model decisions)**
11. Rebuild the recruiting illustration as a clearly hypothetical calculator (configurable assumptions, before-deductions labeling, no per-transaction linkage unless F.1 approves).
12. Withdrawal workflow: idempotent approval, rejection handler, audit log.
13. Retire or repurpose dormant entities (ReferralCommission/ReferralDealPipeline as currently shaped) and the unused `OPERATOR_CREDIT_PERCENTAGE` secret.

---

## H. INFORMATION / ACCESS REQUIRED TO FINISH UNVERIFIED PORTIONS

1. Houszu-side: deal validation and the authenticity/rules of the `syncClosedDealFromHouszu` callback (does Houszu verify the operator actually introduced the deal? who computes `referral_amount_due_to_brent`?).
2. Whether any subscription-payment automation (Wix/Base44 Payments webhook or manual admin only) transitions `Referral` status to `subscribed`/`paid`.
3. Actual payout mechanics for approved withdrawals (check/direct deposit) and any 1099 process.
4. Licensing statuses of any participants (none recorded in-app) and Brent Cramp's actual licensed role/authority at KW Central Monmouth.
5. `EstateTransitionLead` consent text/version storage detail (schema re-read needed for the Ch11 consent audit item).
6. Customer.io workspace contents (queues not inspected; only code paths were reviewed).
7. Platform-default RLS semantics for entities without an `rls` block, confirmed with a second (non-admin) test account — not performed in this read-only run.

---

AUDIT COMPLETE — NO CHANGES MADE