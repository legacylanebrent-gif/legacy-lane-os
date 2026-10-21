# CHAPTER 6 P1 IMPLEMENTATION & CERTIFICATION REPORT

**Status: P1 CERTIFIED WITH PRE-LAUNCH DEPENDENCIES**
**Build gate: EXIT = 0 (vite production build).**

---

## EXECUTIVE SUMMARY

Shipped: the canonical **Business Document Vault** (one entity, private storage, signed links), a **daily expiration reminder engine** (60/30/7/expired, idempotent, factual wording), the **minimal Team Member worker directory** (platform-linked and non-platform helpers, default-rate labor integration), and **policy / confidentiality acknowledgments** with version truth — plus the book's Business Document Checklist and professional-adviser Contact roles.

Deferred (P2, not implemented): compliance-question provenance system, AI Compliance Research Assistant, Professional Escalation AI, AI Business Setup Coach, AI Annual Business Review, Sensitive Material AI Photo Guard, full record-retention engine, automated legal/regulatory rules, reimbursable-expense → settlement enhancement, full document version control (a minimal version integer is used for acknowledgment truth only).

Defects discovered: one pre-existing React dev warning in the shared console buffer ("Invalid prop supplied to React.Fragment") — appears app-wide, not emitted by the new components (none use Fragment); pages render and function correctly. Not fixed (out of P1 scope). No P1 defects found in testing.

## BUSINESS DOCUMENT VAULT

**PASS**

- Entity: **BusinessDocument** (one vault — no insurance/legal/training/compliance sub-vaults).
- Scope model: `scope` = business | sale | contact | team_member, with exactly one optional reference field per scope (`sale_id` / `contact_id` / `team_member_id`). Contradictory combinations cannot be created through the vault UI; business is the default.
- Categories: FORMATION, INSURANCE, AGREEMENT, POLICY, REGISTRATION, PERMIT, CERTIFICATION, PROFESSIONAL, OTHER. `policy_type` labels POLICY documents (Confidentiality, Safety, Photo/Privacy, Sale-Day Procedure…) — policies are just vault documents; no second repository.
- Statuses: ACTIVE, ARCHIVED, REVIEW. No "safe to delete" or any status implying a retention conclusion; the UI has **no delete action at all** — archiving is the honest retirement path.
- UI (Business Documents page): upload, name, category, effective/expiration dates, notes, view, download, archive/restore, replace-file (version bump), server-side filter (category / status / expiring-soon / search), expiring banners, and the acknowledgment dialog for POLICY documents.
- Document history: platform built-ins (created/updated/by) plus `version` incremented on file replacement — enough to know what changed, when, and who. Full file version control deferred.

## PRIVATE FILE SECURITY

**PASS**

- Upload: `UploadPrivateFile` only — no public upload path exists for BusinessDocument.
- Signed view: short-lived `CreateFileSignedUrl` (15 min read / 5 min card view), verified live: worker seam returned a working signed URL with a ~900s token.
- Unauthorized access: workers/unrelated users cannot read vault records (RLS below); the worker seam returns only policies assigned to the caller.
- Public URL exposure: **zero** — no BusinessDocument file is publicly reachable. (Note: the one synthetic QA file remains in PRIVATE storage — the platform has no private-file delete API; it has no public URL and its signed links have expired. No records remain.)

## EXPIRATION / RENEWAL

**PASS**

- Date ownership: the document owns `expiration_date`; nothing is duplicated into a second compliance database.
- Architecture: BusinessDocument → expiration_date → daily reminder engine (`businessDocumentExpirationCheck`, invoked by the "Business Document Expiration Reminders (Daily)" workflow at 9:00am ET) → operator Notification → operator action.
- Tested live: a document 20 days out produced exactly one reminder — `"P1 TEST General Liability Policy" expires in 20 days (on 2026-11-10).` — to the correct operator, linking to the vault.
- Idempotency: second run → `reminders_created: 0` (per-window ledger on the document). Each window (60/30/7/expired) fires at most once; only the tightest current window is sent.
- Wording: factual dates only; no legal-consequence language.
- Unknown-date behavior: a document with no expiration date got no reminder and displays "No expiration known" — never "never expires". (Known limitation: if an expiration date is edited after a window already fired, that window is not re-armed.)

## TEAM MEMBER

**PASS**

- Entity: **TeamMember** (no existing entity could safely be extended; platform User is not duplicated — records link to it via optional `user_id`).
- Platform-linked worker: created with `user_id` → "Account linked" (verified rendering), enables in-app policy acknowledgment.
- Non-platform helper: no `user_id`; tracked by name in the worker directory and on LaborEntry via `team_member_id` + `member_name`. Such helpers cannot join `EstateSale.sale_team` (requires a platform account) — **no RLS was weakened to accommodate them**; sale-team assignment remains user-ID based, and the labor picker offers directory workers alongside sale-team users and free-text helpers.
- Default rate: `default_hourly_rate` copies into new LaborEntries (blank-rate rule respected: copies only when the entry rate is still empty). Snapshot doctrine verified live: changed the worker default 25 → 30; the existing entry's rate stayed **25**, and the entry carries the worker's `team_member_id`.
- Labor integration: LaborEntry remains the canonical project labor record; a new optional `team_member_id` field gives consistent worker identity. Worker selection, default rate, and identity verified in the updated Labor Hours panel.
- Sensitive-data exclusions: no SSN / tax ID / bank / medical / payroll / credential / ID / background-check fields exist. Emergency contact NOT added (reported here, not built, per doctrine).
- Statuses: ACTIVE / INACTIVE only.

## POLICY ACKNOWLEDGMENT

**PASS**

- Policy source: POLICY-category BusinessDocuments — one architecture. Confidentiality is just another policy type (verified with a Confidentiality Policy; no second subsystem).
- Assignment: operator assigns a policy to a team member in the vault's Acknowledgments dialog (shares the worker link `/MyPolicies`); the assignment snapshots the assigned version.
- Explicit acknowledgment: workers open **Team Policies** (/MyPolicies) — served by the `policyAcknowledgments` seam, which returns ONLY their own assignments with a short-lived signed link. "Read policy" and "I acknowledge this policy" are separate; acknowledging requires a confirm action.
- Version truth: acknowledgment records WHO (team member / user), WHAT VERSION (`acknowledged_version` snapshotted at acknowledge time), WHEN (`acknowledged_at`). Verified live: acknowledged at v1 → replaced file (v2) → the worker's record still shows acknowledged **v1** and both operator dialog and worker page show it needs re-acknowledgment for v2. The assignment's version snapshot is never rewritten.
- Workers never write acknowledgment records through RLS (update is operator/admin only) — the status transition happens only in the server seam after verifying the caller, so versions/statuses cannot be tampered with. Non-platform helpers: operator can record an offline acknowledgment (noted "Recorded by operator").

## BUSINESS DOCUMENT CHECKLIST

**PASS**

- Implemented as the vault's built-in "Starting guide — documents to review with your professional advisers" (no separate static worksheet): per-category guidance plus an "N on file" chip derived live from the operator's real vault contents.
- Not-advice framing throughout: "Consider whether your business needs each kind of document. Nothing here is legal advice." Nothing implies every business needs every document; completion is never represented as legal compliance. (Not applicable / needs attention markers were not persisted — the on-file derivation plus the guide text keeps this honest without a second checklist database.)

## PROFESSIONAL ADVISERS

**PASS**

- No separate adviser directory: added `insurance`, `payroll`, `bookkeeper`, `tax_adviser`, `employment_adviser` to the canonical Contact role taxonomy alongside the existing `attorney`, `cpa`. No adviser AI or escalation (P2).

## RLS

All three entities launched with full rules — **no repeat of the P0 finding**:

- **BusinessDocument: PASS** — read/create/update/delete all operator (`data.operator_id === {{user.id}}`) or platform admin only. Ordinary sale workers: no access by default (verified: the worker seam is the only path). Unrelated operator: no access. Public/anonymous: matches no branch.
- **TeamMember: PASS** — operator/admin only on all four operations (phone/email are within this boundary). Workers do not read their own directory records; they only see policies assigned to them via the seam.
- **PolicyAcknowledgment: PASS** — read: operator, the assigned worker (`data.user_id === {{user.id}}`), admin; create/update/delete: operator/admin only. The subject can read their own acknowledgment history but can never write it through RLS — the seam performs the transition service-side.

- **Cross-operator test: NOT PERFORMED — carried as a mandatory pre-launch verification.** The environment still permits only the builder identity (users join via real invitations; User records cannot be inserted, and sending live invite emails for a synthetic second account was not done). No simulated success claimed.
- **Anonymous test: PASS by construction** — every branch on all three entities is guarded by a role condition or record-field match; anonymous visitors match nothing. (Not drivable in the logged-in preview; rule shape verified against the RLS guide.)

## P0 SECURITY REGRESSION

- EstateSale: **PASS** — untouched this session; verified unchanged.
- Item: **PASS** — untouched.
- Expense / BusinessExpense: **PASS** — untouched; private-receipt architecture reused for vault files.
- Pipeline (SaleConversionPipeline): **PASS** — untouched.
- Buyer PII (EarlySignIn / Offer / VIPInvite): **PASS** — untouched.
- Transactions: **PASS** — untouched.
- Invites (PendingTeamInvite → redeemTeamInvite seam): **PASS** — untouched, still deployed; the new acknowledgment seam follows the same pattern.
- Receipts: **PASS** — no public upload path anywhere in this change set; vault uses the same private/signed architecture.
- Production build passes; no P0 rule was weakened to accommodate helpers or workers.

## CHAPTER 1–5 REGRESSION

- Chapter 1 (sale operations/client decisions): **PASS** — no touched surfaces; smoke reads fine.
- Chapter 2 (referral source / pipeline): **PASS** — untouched.
- Chapter 3 (research flags / coach): **PASS** — untouched.
- Chapter 4 (labor/economics): **PASS** — LaborEntry additive field only (`team_member_id`); economics model untouched; rate snapshot doctrine explicitly re-verified. Labor panel edit reviewed for existing owner/team/helper paths.
- Chapter 5 (distance snapshots / site assessment): **PASS** — untouched; snapshot doctrine mirrored here.

## QA

- **Created:** 3 BusinessDocuments (expiring / no-expiration / policy), 2 TeamMembers (linked worker + helper), 1 PolicyAcknowledgment, 1 LaborEntry, 1 private test file, 1 reminder notification (+ 1 prior-window leftover notification found).
- **Deleted:** all of the above records by exact ID (8 this session + 1 prior-window leftover).
- **Remaining: 0** records across BusinessDocument, TeamMember, PolicyAcknowledgment, LaborEntry, Notification, and synthetic sales. One QA text file remains in PRIVATE storage (no delete API for private files; no public URL, signed links expired) — flagged, no record references it.
- Verification status: function tests, snapshot/version/wording/idempotency tests, and page renders (vault, team members, worker policies — captured at mobile viewport) all **passing**. The expiring-soon filter button was exercised but its DOM assertion was lost to a preview timeout (screenshots show the filter row rendered; the reminder engine itself is fully verified server-side). Second-account denial remains manual (see below).

## UPDATED CHAPTER 6 COVERAGE

With P1 shipped: document vault, expiration reminders, team member record, policy/confidentiality acknowledgments, business document checklist, and professional-adviser reuse are covered. Remaining Chapter 6 ground (P2+): compliance-question provenance, AI compliance research, professional escalation AI, business setup coach, annual review, sensitive-material photo guard, retention engine, regulatory rules.

## BOOK TRUTH

Safe to state: "EstateSalen organizes your business documents with expiration reminders, a worker directory, and policy acknowledgment tracking — privately stored, plainly worded." Still requiring revision if the book claims any of: legal/tax/insurance *advice*, HR/payroll capability, compliance certification, record-retention guarantees, or automatic regulatory rule tracking — none of those exist, by design. EstateSalen is explicitly not an HRIS, a payroll system, or a legal/tax/insurance-advice system.

## P2 ROADMAP (REPORT ONLY — NOT IMPLEMENTED)

1. ComplianceQuestion + provenance system. 2. AI Compliance Research Assistant. 3. Professional Escalation AI. 4. AI Business Setup Coach. 5. AI Annual Business Review. 6. Sensitive Material AI Photo Guard. 7. Full record-retention engine. 8. Automated legal/regulatory rules. 9. Reimbursable-expense → settlement enhancement. 10. Referral/buyer search filters. 11. Full document version control (beyond the acknowledgment-truth integer). 12. Re-arming reminder windows when an expiration date is edited.

## PRE-LAUNCH DEPENDENCIES

- Second-account cross-operator RLS test (BusinessDocument / TeamMember / PolicyAcknowledgment + P0 cluster): **carried — mandatory**.
- Worksheet "Add Transaction" manual interaction test: **carried**.
- Draft-sale client-page access: **remains intentionally unsupported** unless explicitly revived.
- Expiring-soon filter button: quick manual click-through recommended (engine verified server-side).
- SMS certification, Houszu certification: unchanged from prior register.
- New dependency: none.

## FINAL CHAPTER 6 P1 CERTIFICATION

**P1 CERTIFIED WITH PRE-LAUNCH DEPENDENCIES**