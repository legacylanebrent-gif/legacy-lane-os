# ESTATESALEN REFERRAL REBUILD — PHASE 1B REPORT & PHASE 2 IMPLEMENTATION DESIGN

Status: Phase 1B security corrections IMPLEMENTED. Phase 2 is DESIGN ONLY — nothing in
Part 2 is implemented. `LEGACY_REFERRAL_COMPENSATION_ENABLED` remains `false`.

---

## PART 1 — PHASE 1B CHANGES AND EVIDENCE

### A. UserReward creation — CLOSED to direct client creation

Findings (before Phase 1B): any signed-in user could create a UserReward for themselves
with an arbitrary `action_id` and `points_earned` (RLS allowed self-creation), and seven
client call sites did exactly that, including self-computed point values. Points feed the
monthly prize draw (MyRewards → MonthlyDraw), so forged points were fulfillment-relevant.
The three admin reward writers also honored a client-supplied `Referral.reward_amount`.

Corrections:
1. `UserReward` RLS: `create` is now **admin-only**. Read stays own-only; update/delete admin-only.
2. `completeRewardAction` extended with **server-verified actions** (`purchase_reward`,
   `purchase`, `qr_check_in`, `check_in`, `operator_referral_sent`): the server requires a
   qualifying record reference, verifies the record exists and belongs to the caller
   (`created_by_id` / `referrer_id`), DERIVES points from a server-side definition only,
   and dedups per (user, action, reference) — ever. Client point values are never trusted.
3. All seven client sites (ReferOperatorModal, RecordPurchaseModal, RecordPurchase,
   RewardsCheckins ×4, Home) now invoke `completeRewardAction` with the qualifying record id.
4. The three admin reward writers (`processReferralRewards`, `updateReferralStatus`,
   `processResellerReferralReward`) now pay a **server-controlled constant** ($25);
   client-set `Referral.reward_amount` is informational only.
5. All existing rewards preserved (5 records unchanged).

Runtime evidence (isolated fixtures, created and deleted in the same run):
- `purchase_reward` without a reference → 400 "qualifying record reference required".
- With a $250 Income fixture → +25 points (server-derived floor(250/10), not client value).
- Repeat call → "Already rewarded for this event" (duplicate blocked).
- `operator_referral_sent` with own pending Referral → +100; repeat → blocked.
- All fixtures deleted; ledger counts identical before/after.

### B. MasterReferralAgreement — server-signed submission

Findings: the join page created the agreement record client-side, choosing its own
`signed_timestamp` and `status: 'active'`, with no terms version anywhere. A user could
assert any timestamp or backdate a record; nothing pinned which terms were acknowledged.

Corrections:
1. New function `signMasterReferralAgreement`: binds the authenticated user (identity and
   email derived server-side), a SERVER-generated timestamp, best-effort IP from headers,
   and a SERVER-PINNED `terms_version` constant (`MRA-V1`). Idempotent — an active
   agreement is returned, never duplicated.
2. Entity: `create` RLS now **admin-only**; new additive `terms_version` field. Null on
   historical records = "version not recorded" — never backfilled or upgraded.
3. `JoinReferralExchange` now invokes the function; the client no longer supplies any
   identity, timestamp, or status.
4. A signed acknowledgement remains what it always was: NOT verified licensing, NOT
   broker approval, NOT an executed brokerage referral agreement.

Runtime evidence: sign → `terms_version: MRA-V1`, server timestamp, service-role creation;
second sign → `already_signed: true`, no duplicate. Fixture deleted.

### C. Referral creation and access — verified acceptable, one inert field neutralized

- Direct creation is constrained to `referrer_id = self` AND `status = pending`; qualifying
  state (subscribed/paid, first_payment_date, reward_status) is written only by admin
  functions. A pending record confers no entitlement. A client cannot impersonate another
  referrer (codes resolve server-side in `createReferral`/`resolveReferralCode` against
  the User table; no user data leaves the resolver).
- Client-set `reward_amount` is now inert everywhere (server constant pays).
- A pending record may name any `referred_email`/company — that is a claim, not an
  attribution; qualification still requires admin-verified payment. Acceptable for now;
  the Phase 2 referral-time event snapshot (Part 2C) hardens this further.
- `RewardAction` read is open: catalog name/description/points/category/frequency/is_active
  only — intended public program marketing, no internal instructions or sensitive data. Kept open.

### D. Central compensation control — verified

- All six legacy entry points import and check
  `LEGACY_REFERRAL_COMPENSATION_ENABLED` BEFORE any write (Phase 1 tests: 409/403/401).
- Complete wallet-write inventory: `requestOperatorWithdrawal`, `releasePendingWalletCredits`,
  `adminApproveWithdrawal`, `syncClosedDealFromHouszu` — all behind the guard;
  `adminFreezeOperatorWallet` — admin-only freeze, no credit creation;
  `purchaseGoogleLensCredits` — creates an all-zero wallet shell only, never credits.
  No other function, workflow, or integration writes `OperatorWallet`/`WalletTransaction`.
- Replay: `syncClosedDealFromHouszu` dedups credits by deal and dedups informational
  `recorded` commission rows by deal BEFORE any write; the guard precedes all wallet
  writes, so a recorded callback cannot create credits directly or via replay, and no
  other function consumes `recorded` rows to mint credits.
- Fail-closed: the control is a compile-time constant `false`; there is no configuration
  path that can enable it accidentally. Compensation was NOT re-enabled for testing.

### E. Runtime verification — passed / unverified

PASSED (runtime): all of Part A/B above; Phase 1 paused-gate tests (lead acceptance 409,
credit release 409, withdrawal 403, closing callback 401 without key, reward sweep no-op).

NOT POSSIBLE in this environment (exact limitation): the platform exposes only the
builder identity (admin) to backend-function tests, the exec sandbox, and the preview
browser. There is no isolated environment and no way to mint a non-admin test identity
(inviting a user contacts a real person, which this phase forbids). Therefore these checks
are CODE-VERIFIED but NOT runtime-verified as a second identity:
- Operator A cannot read Operator B's wallet/referral records (RLS `data.operator_id` /
  participant-anchored rules — schema-verified).
- Non-admin cannot create UserReward / MasterReferralAgreement / wallet mutations
  (admin-only create/update/delete rules — schema-verified).
- Non-admin RLS rejection of writes the Phase 1 functions authorize with service role.
Mocked Houszu authority-branch testing: the authority branch requires the shared secret
key; it was deliberately not exercised (using the real key against production would be a
production mutation). Recorded-callback behavior was tested only in its guarded
(rejected/recording) branches.

---

## PART 2 — PHASE 2 IMPLEMENTATION DESIGN (DESIGN ONLY — NOT BUILT)

Doctrine: extend the canonical UNPAID Chapter 11 seller/partner flow
(`submitPartnerReferredInquiry`, `resolvePartnerReferral`, opaque code resolver).
No fourth referral system. Everything below is additive.

### A. Seller permission — `SellerConsent` (new entity)

Fields: `consent_id`; `source_type`/`source_id` (the seller request — EstateTransitionLead
or Chapter 11 inquiry); `intended_recipient_ids` (operator + brokerage placeholders);
`contact_purpose` (introduction only); `consent_text_version` + `consent_text_snapshot`
(the exact text shown); `submitted_at` (SERVER timestamp); `attribution_source`
(how the seller reached us); `marketing_consent` (SEPARATE optional block, default none —
withdrawal of one never affects the other); `withdrawn_at`, `withdrawal_reason`;
`downstream_notifications` (append-only log of which recipients were told of a withdrawal);
`status`: granted | withdrawn | not_recorded.

Access: writes only via server functions at submission time; the seller (usually no
account) never writes directly. Recipient operators read their own records; admins all.
Storage: the consent block is stored linked to the request and surfaced in the operator's
partner-referral UI ("what this seller agreed to"). Existing submissions remain
`not_recorded` — NEVER backfilled to affirmative from historical submission alone.
Consent TEXT and version are placeholders until broker/legal approves language.

### B. Individual eligibility — `ReferralEligibilityProfile` (new entity)

Two strictly separated blocks on one record per licensee:
- `self_submitted` (operator-writable): full name, license number, state, type,
  expiration, brokerage name (PLACEHOLDER until confirmed), affidavit of affiliation.
- `verified` (admin/broker-verified ONLY — written by a backend function, never by the
  owner; operators cannot approve themselves): verification source, reviewer id/name,
  verification date, license status as of verification, brokerage identity (canonical
  BrokerageProfile link), effective eligibility start/end, approved jurisdictions,
  referenced agreement versions, `eligibility_history` (APPEND-ONLY: every status change
  with who/when/why — immutable).

Rules: unknown or unsupported jurisdiction → NO compensated activation. NJ
referral-agent rules are NOT assumed national — each state is configured explicitly.
Self-submitted information never displays as verified.

### C. Referral-time eligibility — snapshot on the canonical event

The canonical referral event = the existing server-side partner-referral intake
(`submitPartnerReferredInquiry`). At that moment the server writes an
`eligibility_snapshot` onto the case: licensee id, license status, brokerage,
agreement version, jurisdiction, and event timestamp — all SERVER-controlled. Rules:
- Current license status NEVER rewrites a historical snapshot.
- Pre-license introductions stay unpaid introductions forever; they cannot automatically
  become payable after licensing (a new referral event with a new snapshot is required).
- License lapse (eligibility end) stops NEW compensated activity immediately.
- Previously eligible PENDING transactions flip to `broker_review_required` —
  no automatic deletion, no automatic forfeiture; a broker decision resolves them.

### D. Four data categories — strict separation

1. **Illustrative assumptions** — admin-configured rates, clearly labeled assumptions:
   receiving-side commission rate assumption, referral share 25%, EstateSalen share 70%.
   Not KW-approved terms. Stored as config; versioned.
2. **Illustrative per-request estimates** — a block on the referral case computed from
   category 1 + the case. Formula: receiving brokerage commission × 25% × 70%; when
   commission is unknown: estimated sale price × disclosed assumed receiving-side rate
   × 25% × 70%. Shows gross vs net treatment and unknown deductions explicitly.
   **DISABLED pending broker/legal review.** A separate GENERAL HYPOTHETICAL
   CALCULATOR (UI-only, nothing persisted, big "illustration only" labeling) is the
   approved alternative.
3. **Broker-approved compensation** — `BrokerApprovedCompensation` (new entity):
   case link, contractual percentage, calculation basis, approver, agreement version.
   Written only by admin/broker-authorized functions.
4. **Payment status/evidence** — `CompensationPaymentRecord` (new entity): status,
   evidence document (private storage), recorded by admins from brokerage-supplied
   evidence. EstateSalen DISPLAYS payment status; it never becomes the payer of real
   estate compensation, and displaying status creates no payment obligation.

Hard rule: categories 1–2 NEVER feed WalletTransaction, UserReward, withdrawals,
subscription offsets, or any ledger. No cumulative opportunity-dollar balance exists
anywhere.

### E. Brokerage administration

`BrokerageProfile` (new entity): legal identity (placeholder until confirmed), state
licences, agreement registry (agreement id + version + covered transaction types +
effective dates), authorized admin contacts. Admin-only writes through server functions.
Admin screens: brokerage directory, agreement version management, compensation approval
queue, payment-evidence entry. Software-affiliate rewards ($25 path) stay fully separate —
no shared ledger, no shared labels beyond clear wording.

### F. User experience states (plain language)

- **Unlicensed operator**: "You can send tracked introductions. Compensated referrals
  require a verified license." (unpaid intro tools only)
- **Licensing candidate**: application checklist + progress ("We received your license
  details — review takes X days").
- **Verification pending**: "Your license is being verified. No compensated referrals
  yet."
- **Verified eligible**: license summary, expiry date, active jurisdictions.
- **Expired / suspended / affiliation changed**: "Your license status changed — new
  compensated referrals are paused. Existing cases go to broker review." No withdrawable
  balance is ever shown for unavailable amounts.
- **Broker review required**: case list + "Your brokerage is reviewing this case."

### G. Integrations — local vs external

LOCAL (EstateSalen code only): eligibility snapshot writes; consent records; estimate
blocks (disabled); admin screens; all UI states; Customer.io events (consent-gated,
zero compensation content — routed through the existing IdentityActivityOutbox guardrails).
EXTERNAL (requires work in the Houszu application — handoff, do NOT send yet):
1. Stop expecting wallet credits for operators; consume `compensation_credits_created: false`
   and the new eligibility-state fields.
2. Accept an eligibility flag per operator (verified/pending/lapsed) instead of
   credit-balance displays.
3. Treat HTTP 500 `recording_failed` as retryable (already contract-safe).
Houszu handoff requirements document: new field list, sample payloads per endpoint,
deprecation timeline for credit expectations, and the paused-control status. Customer.io:
no schema change; only consent-gated, non-compensation copy.

### Historical data & migration plan

- Legacy wallets/transactions: preserved, frozen, admin-only. No accrual, no deletion.
- `ReferralCommission` status `recorded`: stays informational forever.
- `MasterReferralAgreement`: historical rows keep null `terms_version` (not recorded);
  no validity upgrade, no re-signing requirement forced.
- `UserReward`: untouched; new records only via sanctioned paths.
- Consent: NO backfill — historical submissions are `not_recorded`.
- One-time migration job (admin-triggered, idempotent): create `ReferralEligibilityProfile`
  shells (self_submitted empty) for active exchange participants so they can apply.

### Broker/legal decisions

BLOCK ACTIVATION (cannot proceed to compensated operation without them):
consent text approval; brokerage legal identities and agreement terms; the actual
contractual percentages (25%/70% are illustrations only); per-state eligibility rules
(NJ ≠ national); who the licensed party is; payment evidence standards.

DO NOT BLOCK technical build: all schemas, snapshots, admin screens, UI states,
calculator, Houszu handoff doc.

### Bounded Phase 2 build sequence (acceptance criteria)

1. **Consent record + submission wiring** — AC: every new partner-referred inquiry writes
   a consent record server-side; historical records show `not_recorded`; withdrawal
   propagates to recipient notification queue.
2. **Eligibility profile + admin verification function** — AC: operator can submit, cannot
   self-verify (403), admin verification writes immutable history; lapse flips state.
3. **Referral-time snapshot** — AC: intake writes snapshot; no later code path reads
   current license for a historical case; pre-license cases stay unpaid after licensing.
4. **Broker/compensation/payment entities + admin screens** — AC: writes admin-only;
   estimates cannot reach any ledger (automated test); payment display is read-only.
5. **UI states + hypothetical calculator** — AC: all six states render; calculator
   persists nothing; no withdrawable balance appears for unavailable amounts.
6. **Houszu handoff + Customer.io copy** — AC: handoff doc complete; outbox payloads
   contain zero compensation figures and only consent-gated contact data.

Each step is independently shippable and leaves the compensation control disabled.

---

PHASE 1B SECURITY: PASS (non-admin runtime checks: code-verified, identity limitation reported)
PHASE 2 DESIGN: COMPLETE
COMPENSATION ACTIVATION: DISABLED
READY FOR PHASE 2 BUILD: YES (build steps 1–3 and 5–6 unblocked; step 4 and any
activation gated on broker/legal decisions)