# CHAPTER 24 — ESTATESALEN CROSS-AUDIT REPORT
## AI, Automation, Evidence, Authority & Human Control

**Audit only. Nothing was built, deployed, modified, or sent.** Every classification below was traced to actual code, entity schemas, workflows, prompts, and backend write paths — not UI copy or comments.

---

## EXECUTIVE SUMMARY

- **120 Chapter 24 promises audited: ~70 fully supported (58%), ~30 partially supported / enhance (25%), ~20 genuine gaps (17%).**
- **Strongest existing AI architecture:** the Chapter 15/16 verified-facts boundary (research_notes with AI_SUGGESTION never becoming buyer-facing without human approval), the Marketing Kit facts-only JSON grounding with explicit approval gates, and the backend authority functions (changeItemPrice, saleRefund, transitionGuards, itemHold) which no AI surface can bypass.
- **Strongest existing automation architecture:** the IdentityActivityOutbox (durable, claim-leased, retry/backoff, dead-lettering) and the deterministic readiness-gate automations (Enforce Skip Image Clean, Publication Sync with privacy-filtered payloads).
- **Largest genuine gaps:** no explicit AI risk ladder, no operator-facing automation "Why did this happen?" record, no AI provenance/source display, no offline fallback kit or recovery checklist, no cross-project historical intelligence, no employee AI assistant, no deterministic conflicting-instruction detection.
- **2 verified P0s** (both fixable without new entities):
  - **P0-1 — operatorAiCoach loads ANY sale via service role with no sale-ownership check** (`active_sale_id` is caller-supplied; only `operator_id` is checked). AI is an RLS bypass: an operator/team member can point the coach at another operator's sale and receive its address, estimated value, actual revenue, and commission rate.
  - **P0-2 — generateSaleRecap auto-publishes a PUBLIC SaleRecap on sale completion with no human approval**, containing an AI-generated summary AND client financial figures (`actual_revenue`, `estimated_sale_value`). SaleRecap has no RLS (world-readable). Automation → published truth including private financial disclosure. (Secondary: the workflow invokes it with empty args `{}` — likely fails to resolve the sale, a broken-automation visibility problem.)

---

## AI CONSTITUTION — ENFORCED vs MERELY RECOMMENDED

| Doctrine | Status |
|---|---|
| AI may draft/organize/summarize/surface/recommend; may not silently create evidence, authority, payment/financial/property-completion truth | **Structurally enforced** at backend write seams: SaleClientDecision create/update is operator/admin-only (RLS); consequential dispositions require validated client decisions (transitionGuards.validateDecisionAuthority); refunds are operator/admin-only with authorized_by; prices only through changeItemPrice with HIGH_VALUE authority; settlement/close gates from Ch23. No AI path writes any of these. |
| AI output ≠ verified fact | **Enforced** by the verified_facts human-approval boundary and AI_SUGGESTION source_type confined to research_notes. **Exception (P0-2):** recap ai_summary publishes automatically. |
| Protect private information before AI sees it; minimum necessary data | **Enforced** in buildMarketingKit (curated facts JSON), mySaleDay (documented projection rules; access_details/controlled_location never exposed), analyzeItemImage (sensitive guard runs first, no transcription). **Violated** in operatorAiCoach (loads full sale record incl. address + financials, and P0-1 bypass). |
| A trigger is not authority | **Enforced** (entity automations only generate drafts/notifications; every consequential write is a sanctioned human path). **Exception (P0-2).** |
| Higher consequence → stronger review | **Enforced in practice** (HIGH_VALUE, refunds, decisions, transition, settlement all gated) but **not formalized** — there is no explicit risk-ladder classification (Promise 50, gap). |
| Don't automate a bad process; automation needs purpose/trigger/owner/action/ending/exception/override | **Partially enforced**: workflows carry trigger conditions and run history; outbox carries idempotency/retry/dead-letter. No per-automation owner/exception metadata. |
| Have a plan when technology fails | **Gap** (partial print surfaces exist; no coherent offline kit or outage checklist). |

---

## THREE-LAYER MODEL

**Layer separation is real and mostly clean:**

- **LAYER 1 (Automation)** — correctly used for: payment webhook → Order paid (posPayment idempotent resolution), sale completed → recap generation, sale publish → SEO/social-draft generation, entity → Customer.io outbox enqueue, skip-image cleanup, photo privacy enforcement, daily digests. All Layer-1 actions are either notifications, drafts, or record projections — none grant authority.
- **LAYER 2 (AI Assistance)** — analyzeItemImage (identification suggestion + sensitive-material STOP), googleLensPricing (comparable evidence to SaleItemPricing, never Item.price), PhotoLabelingModal (editable suggestions), buildMarketingKit (facts-grounded drafts + approval), generateSocialCampaign (needs_review / not_published), aiCoach/operatorAiCoach (advisory text with [CONFIRM] placeholders and "UNKNOWN from records" instructions), AiStagingCoachPanel / PrepCoachPanel (explicit hedged advisory language, "AI suggestion (advisory — not fact)"), compliance research mode (AiResearchPanel: "cannot change this question's verification status").
- **LAYER 3 (Human Decision)** — changeItemPrice, SaleClientDecision approval, disposition setting, refund authorization, settlement finalization, transition completion approval, marketing final review / photo approval, publishing.

**Where layers collapse incorrectly:**
1. **P0-2**: recap generation merges Layers 1+2 into a published outcome (AI summary → public truth with zero Layer 3).
2. **operatorAiCoach (P0-1)**: Layer 2 reads Layer-3-protected records without the Layer-3 access rule.
3. Minor: `screen_context` from the frontend enters the coach prompt unlabeled as untrusted (label-only injection surface; low impact).

---

## AI FEATURES INVENTORY (actual, verified)

| Feature | Implementation | Output destination | Human gate |
|---|---|---|---|
| Sensitive-material image screen | analyzeItemImage (vision, guard FIRST, no transcription) | STOP/REVIEW signal → photo_library.screen_status | Fail-safe: review_required, human clears |
| Item name/description/price suggestion | PhotoLabelingModal / BatchLabelModal (frontend InvokeLLM) | Editable draft fields + internal ProductDatabase | Operator edits & saves; not auto-public |
| Comparable/price evidence | googleLensPricing (SerpAPI) | SaleItemPricing record (never Item.price) | Operator price decision via changeItemPrice |
| Marketing kit drafts | buildMarketingKit (facts-only JSON, brand-truth guardrails) | MarketingKit drafts | approve_photos → approve_final_review |
| Social campaign drafts | generateSocialCampaign (auto on publish) | SocialPost approval_status=needs_review, publish_status=not_published | publishSocialPost (human) |
| AI coach (multi-mode) | aiCoach (per-sale auth check: operator/admin only; credit ledger) | Chat text + user ai_coach_memory | Advisory only; no execution |
| Operations/staging/prep coach | operatorAiCoach + AiStagingCoachPanel/PrepCoachPanel (hedged) | Advisory text | Advisory only |
| Compliance research organizer | aiCoach compliance_research mode + AiResearchPanel | Research notes (AI_SUGGESTION) | Human sets verified status only |
| Sale recap summary | generateSaleRecap | SaleRecap (published!) | **NONE — P0-2** |
| SEO content generators | generateItemSEO (only if approved_public), generateSaleSeoPage, blog/hub generators | SEOPage content | Item photo approval upstream; sale pages for already-public sales |
| Guide bot | guideAIChat (public, static topic prompt, no user records) | Chat text | Public Q&A; points to Get Help |
| Spam/moderation | detectCommentSpam, detectMessageSpam, moderateStoryContent | Flags/holds | Human moderation |
| Seller onboarding AI | sellerOnboardingAi (loadAuthorizedSale) | Onboarding guidance | Advisory |
| LLBB website builder | llbbAiBuilder (structured JSON schema output) | WebsiteTenant drafts | Publish/review flow |
| Demand/knowledge extraction | extractKnowledgeFromItem, extractDemandSignals | ItemKnowledge/DemandMetrics | Repository approval (approved_public) |

---

## AUTOMATIONS INVENTORY (verified, meaningful)

**Workflow automations (94 files; major ones):**
- Publication Sync on Sale/Item Change — privacy-filtered canonical payload (publicationPayload.ts strips buyer info, internal metadata).
- Enforce Skip Image Clean — hard rule: skipped photos cannot hold auto-generated data.
- KE — Generate Sale Recap on Completion — **P0-2 (auto-publish + financials + empty args likely broken)**.
- Auto-Generate Social Campaign on Sale Publish — drafts only (needs_review).
- CustomerIO Sync (9 entity triggers) — all through IdentityActivityOutbox (durable, retry, dead-letter).
- Houszu Outbox Flush (Hourly), Estate Transition Lead sequence, daily digests/scrapers/expiry checks, calendar reminders, wanted-item matching.
- Business Document Expiration Reminders, Sale Website Slug on Create, Sale Status Change Notifications.

**Entity-trigger backend functions (Layer 1):** onSalePublished, notifySaleStatusChange (skips unchanged status; provenance in payload), onUserCreated, onEstateTransitionLeadCreated, matchWantedItemOnCreate, autoPublishSales.

**Scheduled:** 30+ daily/weekly workflows (digests, cleanup, SEO, snapshots).

---

## VERIFIED FACTS / AI OUTPUT
Architecture is exemplary: `Item.verified_facts` (company-represented, human-approved, source_type provenance) vs `research_notes` (working info; AI_SUGGESTION only here). No code path moves research_notes to verified_facts automatically. **Verdict: ENFORCED.**

## EVIDENCE / PROVENANCE
verified_facts.source_type + verified_by/verified_at; ItemComparable; specialist_opinions (relationship operator-declared); appraisal_context.document_id; Activity as the single change log with item_id; task/issue/decision source_type/source_id/source_label. **Verdict: STRONG.**

## HUMAN APPROVAL
Required before consequential/public: verified facts (human move), kit photos + final review, social publish, HIGH_VALUE price, refunds, client decisions, dispositions, settlement, transition, project close. Not required (gap): recap publication (P0-2), SEO page text for already-public sales (acceptable — derived from public facts).

## AUTHORITY
Backend-enforced at write seams — verified in changeItemPrice (operator/seller/admin + reason + Activity history), saleRefund (operator/admin, authorized_by), transitionGuards (consequential outcomes require validated decision; protected merchandise), itemHold (HIGH_VALUE operator-only), SaleClientDecision RLS (operator/admin only), approveTransitionCompletion, mySaleDay authority matrix. **AI cannot write authority anywhere. Verdict: STRONG.**

## PRIVACY
- site_assessment.access_details: operator-only field RLS; mySaleDay never projects it; no AI context builder includes it (verified by grep across AI functions).
- Seller phone/email: field-level RLS on Donation (narrow provider window); mySaleDay excludes authority contact info.
- Publication payloads: buyer/payment/internal fields stripped (publicationPayload.publicItem).
- **Verdict: strong, with the two P0 exceptions.**

## MINIMUM NECESSARY DATA
- buildMarketingKit: exemplary (capped, field-selected facts JSON; no PII).
- aiCoach: curated operational context + [CONFIRM] governance footer.
- operatorAiCoach: **over-shares** (full sale record: address, estimated/actual revenue, commission) and, via P0-1, to unauthorized callers.
- googleLensPricing: image URL only. Good.

## ROLE-BASED AI ACCESS
- aiCoach: per-sale operator/admin check present (line 186) — correct.
- analyzeItemImage, PhotoLabelingModal: run in user context (RLS applies) — correct.
- **operatorAiCoach: BROKEN (P0-1)** — sale loaded with asServiceRole and no ownership check.
- guideAIChat: no records — safe.
- **AI is NOT otherwise an RLS bypass.** One verified violation.

## PHOTO PRIVACY
photo_library private by default; approved_public settable only when screen_status is screen_passed/cleared_by_human (schema-enforced seam); purposes CUSTODY_EVIDENCE/RESEARCH never casually publishable; eligiblePhotos() excludes skip/do-not-search/retained-private; enforceSkipImageClean automation; generateItemSEO requires approved_public. **PHOTO PRIVACY MATRIX:** capture → photo_library (private) → analyzeItemImage screen (fail-safe review_required) → human approve_photos → marketing-eligible set → kit/publication payload. **No bypass path found** except the sale-level legacy images[] set (operator-curated, human act). Verdict: ENFORCED.

## PRICING
AI organizes evidence (SaleItemPricing min/max/avg, comparables); price truth = Item.price, written only via changeItemPrice with authority + reason + history; original_price opening snapshot immutable. PricingWorkspace/PriceDecisionSection present operator judgment fields (rationale, ranges). No historical operator-data learning (Promise 72: gap, honest). **Verdict: correct separation.**

## CLIENT DECISIONS
request_status (REQUESTED/UNDER_REVIEW) never changes current_decision; only operator approval appends controlling history; operator/admin-only writes; decision_id required for consequential outcomes. **Verdict: ENFORCED (strongest architecture in the product).**

## OPERATOR COACH
Modes verified: marketing/blog/SMS-draft/client-nurture/team-briefing/pricing/operations/staging/compliance-research/growth strategy. Operations mode grounded in real records with explicit "Anything not listed is UNKNOWN — never invent it." Credit ledger = per-call audit trail. Memory on user record. Coach returns text only — cannot execute. **Verdict: mature; P0-1 must be fixed; provenance display (82/107) is the enhance.**

## EMPLOYEE AI
No employee AI assistant exists. Employees get deterministic, least-privilege MySaleDay, authority matrix, Ask for Help (plain form), policy acknowledgments. **Promise 85/86/88/90/92: NOT EXISTING (P2 candidates).**

## SOP / TRAINING
SaleKitTemplate (reusable task/checklist templates), AiChecklistPanel (equipment checklists — AI-suggested, operator-saved), ComplianceQuestion/PolicyAcknowledgment, TrainingBlog/Courses. No AI SOP assistant or scenario training. **Verdict: template architecture exists; AI SOP features P2.**

## AUTOMATION DESIGN
Workflows carry trigger + condition + run history; outbox carries purpose/ending (delivery)/exception (retry, dead-letter)/override (DedupKillSwitch). No per-automation owner/exception-metadata requirement. **Verdict: partially designed.**

## AUTOMATION AUDITABILITY
Workflow run history + function logs (dashboard) serve admins. Operator-facing "Why did this happen?" per action: absent. Activity records human + sanctioned-function actions; automated drafts record their sources where humans save them. **Verdict: PARTIAL (P1 candidate).**

## SYSTEM HEALTH
Outbox dead-lettering + IdentitySyncError + retry with lease release; workflow run history; credit/quota monitors; Google Lens credit monitor. Failure does not disappear silently at the platform layer. Operator-facing surfacing is thin. **Verdict: PARTIAL.**

## MANUAL FALLBACK
Print surfaces verified: SaleFloorSigns/PrintSigns, ItemLabels, SaleExport, Worksheet + TransactionForm (manual transaction entry), SaleReceipt. No coherent "offline mode," outage checklist, or recovery procedure document. **Verdict: raw materials exist; kit absent (P1 candidate).**

## RECOVERY
Offline truth re-enters through: manual Transaction/Worksheet entry, CashSession closing count + variance explanation (never auto-zeroed), PaymentAttempt merchant-verification resolution (authorized human, who/when recorded), release recording. Safe-by-design; undocumented as a procedure. **Verdict: mechanisms exist, checklist absent.**

## HISTORICAL LEARNING
**DATA EXISTS** (rich: pricing, labor, marketing, incidents, near-misses, profitability per Ch23). **ANALYSIS EXISTS partially** (per-sale economics panel, dashboard sums, DemandMetrics recompute, would_take_ten_more reflection). **AI USES ANALYSIS: NO.** Cross-project pattern views and an AI business coach are absent (Promises 115–120: PARTIAL → P2/LATER).

---

## AI RISK LADDER MATRIX

| Feature | AI Action | Data Used | Consequence | Risk | Human review | Authority | AI writes prod truth? | Guard | Gap |
|---|---|---|---|---|---|---|---|---|---|
| Item description | suggest | image | buyer-facing copy | MOD | operator edits & saves | operator | No | draft-in-place | none structural |
| Sale description/kit | draft | curated facts | public marketing | MOD | approve_final_review | operator | No | facts JSON + guardrails | prompt-level only |
| Email draft | draft | sale context | client comms | MOD | human sends; Activity log | operator | No | [CONFIRM] placeholders | — |
| SMS draft | draft | sale context | client comms | MOD | human sends externally | operator | No | 160-char rule | no in-app send (truthful) |
| Social draft | draft | sale facts | public posts | MOD | needs_review → publish | operator | No | approval_status | — |
| Item identification | suggest | image | research/pricing | MOD | research_notes only | operator | No | sensitive guard; AI_SUGGESTION label | — |
| Research/comparables | organize | SerpAPI evidence | pricing input | MOD | operator judges | operator | No (SaleItemPricing only) | — | no auto-organize into ItemComparable |
| Pricing | suggest | comparables | money decisions | HIGH | changeItemPrice authority | operator/seller/admin | No | backend guard + reason | — |
| Client decision summary | summarize | decisions | client authority | HIGH | never writes decisions | operator | No | RLS + request_status | no alert on conflicts |
| Operator coaching | advise | sale records | operational | MOD | advisory only | operator | No | UNKNOWN rule | P0-1 access bypass |
| Employee assistant | — | — | — | — | — | — | — | — | not built |
| Settlement/recon assistance | none | — | — | — | — | — | No | Ch23 gates | no AI (honest) |
| Sale recap summary | generate + PUBLISH | sale + financials | public content | HIGH | **NONE** | none | **YES — P0-2** | none | fix required |
| Public guide bot | answer | static prompt | consumer guidance | LOW | n/a | n/a | No | no record access | — |

## AI DATA EXPOSURE MATRIX (strict fields)

| Feature | Fields sent | Necessary? | Sensitive? | Role check | Min-necessary? | Recommendation |
|---|---|---|---|---|---|---|
| buildMarketingKit | capped facts JSON (no PII) | ✓ | none | loadAuthorizedSale | ✓ EXEMPLARY | none |
| aiCoach | operational sale context, tasks/decisions/notes/inventory/authorities (names only) | ✓ | notes may hold client detail; operator-only OK | operator/admin check | ✓ mostly | exclude free-text note bodies from context |
| operatorAiCoach | FULL sale record (address, estimated/actual revenue, commission) | partial | financials | **BROKEN (P0-1)** | ✗ | fix ownership check; send curated fields only |
| analyzeItemImage | image URL | ✓ | images may show private material | user-context RLS | ✓ | guard already fails safe |
| googleLensPricing | image URL, sale_id | ✓ | low | auth only; **no sale-ownership check** | ✓ | add ownership check (P1) |
| generateSaleRecap | sale + items + pricings | over-broad | **publishes actual_revenue publicly** | none (automation) | ✗ | draft + omit/gate revenue (P0-2) |
| mySaleDay | projected team-safe view model | ✓ | excludes access/custody/contacts | membership derived server-side | ✓ EXEMPLARY | none |
| guideAIChat | conversation only | ✓ | none | public | ✓ | none |

## AUTHORITY MATRIX

| Action | AI suggest | AI draft | AI execute | Human role required | Client authority? | Backend enforcement |
|---|---|---|---|---|---|---|
| Publish marketing | ✓ | ✓ | ✗ | operator (final review) | n/a | approve_final_review; publish is human |
| Set price | ✓ | ✗ | ✗ | operator/seller | n/a | changeItemPrice guard |
| Change HIGH_VALUE price | ✗ | ✗ | ✗ | operator/seller/admin | n/a | HIGH_VALUE_AUTHORITY_REQUIRED + reason |
| Approve discount | ✓ (stage display) | ✗ | ✗ (never auto-applied) | cashier/operator | optional | human applies via price path |
| Record client decision | ✓ summarize | ✗ | ✗ | operator/admin | YES (SaleAuthority in history) | RLS + request_status |
| Change disposition | ✓ | ✗ | ✗ | operator | YES (validated decision) | transitionGuards |
| Authorize cleanout/donation | ✗ | ✗ | ✗ | operator | YES | setTransitionEventScope |
| Issue refund | ✗ | ✗ | ✗ | operator/admin | n/a | saleRefund 403 guard |
| Resolve payment exception | ✗ | ✗ | ✗ | authorized merchant verification | n/a | resolvePaymentAttempt + resolution_via |
| Finalize settlement | ✗ | ✗ | ✗ | operator | n/a | Ch23 readiness gates |
| Mark financial complete | ✗ | ✗ | ✗ | operator | n/a | settlement writer |
| Mark transition complete | ✗ | ✗ | ✗ | operator | n/a | approveTransitionCompletion |
| Close project | ✗ | ✗ | ✗ | operator | n/a | close gates (transition + access closeout) |

**No AI path can execute any consequential action. Verified.**

## AUTOMATION MAP (major, verified)

| Automation | Trigger | Action | Owner | Ending | Exception | Override | Audit | Status |
|---|---|---|---|---|---|---|---|---|
| Publication Sync | sale/item update | privacy-filtered payload to destinations | platform | synced | logged errors | re-save | payload + sync records | ACTIVE |
| Skip Image Clean | estate sale update | strip AI data from skipped photos | platform | clean | log | operator re-skip | Activity | ACTIVE |
| Social draft on publish | status → upcoming/active | draft campaign + posts (needs_review) | operator (to approve) | approved/ignored | skip non-eligible | delete drafts | SocialPost records | ACTIVE, gated |
| Recap on completion | status → completed | generate + **auto-publish** recap | NOBODY | published | **empty-args invocation likely fails silently** | update record | SaleRecap | **P0-2** |
| CustomerIO entity sync | 9 entity events | outbox enqueue → flush | platform | delivered/dlq | retry+dead-letter | DedupKillSwitch | outbox + errors | ACTIVE |
| Sale status notifications | status changed (real) | notify operator/followers | platform | sent | skip unchanged | delete | Activity | ACTIVE |
| Sale website slug | sale create | deterministic slug assign | platform | assigned | collision suffix | rename (routed) | field | ACTIVE |

## HANDOFF MATRIX

| Handoff | Source truth | Destination | Automatic? | Human gate | Idempotent? | Auditable? | Gap |
|---|---|---|---|---|---|---|---|
| Lead → Consultation | WebsiteLead/bridgeInquiryToDeal | SaleConversionPipeline.consultation | deterministic bridge | operator opens Consultation Mode | yes (source link) | provenance fields | none material |
| Agreement → Active Sale | SaleAgreement executed | activateSale → EstateSale | human-triggered | operator | yes (activation block) | activation provenance | none |
| Active Sale → Preparation | activation | zones/tasks (saleActivationTemplate) | templated, human-confirmed | operator | yes | source_type provenance | none |
| Paid Item → Pickup | Order paid (Ch21 doctrine) | Item release/pickup truth | deterministic obligation display | release is human | yes | releases[] append-only | no auto-reminder (truthful gap) |
| Sale Ends → Transition | status completed | transition module | **human-triggered, not automatic** (honest) | operator | yes | transition block | none |
| Reconciliation → Settlement | payment records | settlement finalize | gated | operator | yes | Ch23 blocks | none |
| Project Close → Review | close | SaleRecap post_sale_review | surfaced, human-written | operator | yes | recap block | none |

## EVIDENCE MATRIX (consequential facts)

| Claim | Source | Evidence | Verification | Approval | Publish eligible? |
|---|---|---|---|---|---|
| Item identification | research/AI | research_notes (AI_SUGGESTION) | verification_status (human) | verified_facts move | only approved facts |
| Price | operator | rationale + comparables + history | human decision | changeItemPrice authority | sale page (already public) |
| Client instruction | SaleClientDecision | history + authority | operator-recorded | controlling entry | never auto — settlement only |
| Payment | provider webhook / merchant verification | PaymentAttempt + provider refs | resolution_via | webhook/authorized human | internal only |
| Physical release | Item.releases | release entries | employee-recorded, append-only | n/a | internal |
| Transition complete | approveTransitionCompletion | guard chain + human approval | operator | recorded who/when | internal |
| Sale results (public recap) | generateSaleRecap | derived + AI summary | **none** | **none** | **currently YES — P0-2: must become draft + gated** |

## PHOTO PRIVACY MATRIX
capture → photo_library (private, purpose-tagged) → sensitive screen (fail-safe review_required) → human approve (approved_public) → marketing-eligible set → kit approval → privacy-filtered publication payload. **Bypass paths: none found.** Sale-level legacy images[] remain operator-curated human act.

## AI AUTHORITY TRACE — "Client note: donate the dining set"
An AI summary is chat text or research note only. SaleClientDecision creation is operator/admin (RLS) and requires a history entry with SaleAuthority authorized_by; a pending REQUEST never authorizes; setItemDisposition validates the decision (sale match, no REQUESTED/UNDER_REVIEW, authorized_by present). **Summary can NEVER become the decision. VERDICT: PASS (NO, as expected).**

## CONFLICT TRACE — retained clock vs. later note "Clock can go"
Free-text notes are never read as authority anywhere (verified across disposition, decision, settlement paths); CLIENT_RETAINED merchandise stays structurally protected until an authoritative decision changes. **The wrong outcome is prevented, but no ALERT surfaces the conflict** — the operator sees both records but must notice. VERDICT: PROTECTED, NOT ALERTED (Promise 58 gap; deterministic note-vs-decision comparator = P2).

## PRICING TRACE — AI suggests $1,200, operator chooses $950
Suggestions live in SaleItemPricing/price ranges; current price truth = Item.price = $950 via changeItemPrice; HIGH_VALUE guard enforced at backend regardless of AI. **VERDICT: PASS.**

## PHOTO TRACE — prescription bottle in research photo
approved_public requires screen_status screen_passed/cleared_by_human; sensitive guard returns STOP; enforceSkipImageClean strips auto data from skipped photos; kit eligibility re-checks skip flags. **VERDICT: PASS (NO auto-marketing).**

## EMPLOYEE AI TRACE — "What is the seller's access code?"
No employee AI surface reads access_details (mySaleDay projection rules; field RLS operator-only). **BUT P0-1:** operatorAiCoach would read another operator's sale record if an authorized coach user supplies a foreign active_sale_id — the coach would disclose address/financials (access codes are still excluded from its prompt). **VERDICT: DENY for codes (PASS); FAIL for foreign sale records (P0-1).**

## AUTOMATION TRACE — paid furniture remains onsite
Payment truth (Order paid via webhook/verified tender) → pickup obligation displayed deterministically (remaining count from releases[]) → MISSED PICKUP when past due → human release closes custody. "Why did this workflow start?" is answerable from Order + releases provenance, not from an automation record. **VERDICT: PASS with auditability note.**

## FAILURE TRACE — live-sale outage
Actual fallbacks: print signs/labels/export, manual Worksheet/TransactionForm entry, paper receipts, CashSession honest variance, merchant verification for ambiguous payments. **No coherent offline kit, outage checklist, or documented recovery procedure. VERDICT: PARTIAL — do not claim resilience beyond these.**

## SYSTEM HEALTH TRACE
Outbox: retry/backoff, dead-letter, IdentitySyncError; workflow run history per automation; quota/credit monitors. Admin can see failures; operator-facing surfacing is thin. **VERDICT: PARTIAL.**

## HISTORICAL LEARNING TRACE
DATA EXISTS → partially; ANALYSIS EXISTS → per-sale + a few aggregates; AI USES ANALYSIS → NO. **VERDICT as stated; P2/LATER.**

---

## ENTITY TESTS — DO NOT IMPLEMENT

**No new core entity is required.** The audit found every Chapter 24 truth can be preserved by reuse:
- AI provenance / "what did the AI know" → **Activity** (already item/sale-scoped, source-capable) + coach context snippets; no AIRecommendation entity.
- Automation event/audit → **workflow run history + Activity**; no Automation entity.
- Company AI-use policy → **BusinessDocument** (policy category + PolicyAcknowledgment); no new entity.
- Near-miss/corrective action → already additive on SaleIssue (Ch23).
Constitutional fixes (P0-1, P0-2) are code-level: an ownership check and a status/gate change — no schema changes needed.

## P0 (verified only)

1. **P0-1 — operatorAiCoach sale access bypass.** `active_sale_id` loads any sale via asServiceRole with no ownership/membership check (only `operator_id` is validated). Fix: reuse the loadAuthorizedSale pattern before building context; send curated fields only. *AI as RLS bypass.*
2. **P0-2 — generateSaleRecap auto-publish.** Automation publishes an AI summary + client financial figures (actual_revenue, estimated_sale_value) to a world-readable SaleRecap with no human gate; the workflow also passes empty args (likely silent no-op — verify). Fix: default `status:'draft'`, operator publish action, revenue fields omitted or opt-in. *AI output + private financials → production truth without authority.*
3. **P1-adjacent (verify at fix time):** googleLensPricing writes SaleItemPricing for a caller-supplied sale_id with no ownership check.

## P1 (smallest set — subject to your approval; NOT BUILT)

1. Fix P0-1 and P0-2 (code-only, reuse-first).
2. Ownership check in googleLensPricing.
3. AI provenance display: show the record-derived inputs snippet with coach answers (reuse existing context builders; no new entity).
4. Company AI-use policy as a BusinessDocument policy + acknowledgment (reuse).
5. Automation "Why did this happen?": record trigger context in Activity for consequential automations (reuse).
6. Offline sale-day fallback kit + technology outage checklist (printable BusinessDocument templates; reuses existing print surfaces).

## P2 (do not build)
AI risk-ladder formalization, deterministic conflicting-instruction alert, AI employee assistant / SOP assistant / scenario training, company knowledge search, redaction assistance / crop-redact, repetition finder / time-savings / friction / efficiency coach / automation ROI, advanced workflow metadata (owner/exception/missing-step review), historical cross-project intelligence (pricing/labor/marketing/operational), AI business coach.

## LATER (do not build)
True offline transactional mode, local-device sync, operator-facing workflow builder, cross-project ML, predictive pricing/staffing/marketing, autonomous agent workflows.

---

## READY-TO-USE TOOLS — all 31 classified

| # | Tool | Classification |
|---|---|---|
| 1 | AI-use policy | SMALL ENHANCEMENT (BusinessDocument reuse) — P1 |
| 2 | AI risk ladder | GENUINE SOFTWARE GAP — P2 |
| 3 | AI verification checklist | BOOK / PRINTABLE (Chapter 16 surfaces already live) |
| 4 | Item-description prompt guide | EXISTING TEMPLATE (kit prompts already encode it) |
| 5 | Research verification worksheet | BOOK / PRINTABLE |
| 6 | AI pricing review | INTERACTIVE SYSTEM ALREADY BETTER (PricingWorkspace) |
| 7 | AI-content approval checklist | INTERACTIVE SYSTEM ALREADY BETTER (approve flows) |
| 8 | Photo privacy checklist | INTERACTIVE SYSTEM ALREADY BETTER (screen + approval) |
| 9 | Sensitive-information checklist | EXISTING TEMPLATE (guard covers images; text = P2) |
| 10 | Client-authority verification | INTERACTIVE SYSTEM ALREADY BETTER (transitionGuards) |
| 11 | AI recommendation review | SMALL ENHANCEMENT (provenance display — P1) |
| 12 | Human approval matrix | EXISTING TEMPLATE (report above is the matrix) |
| 13 | Automation opportunity worksheet | BOOK / PRINTABLE |
| 14 | Workflow mapping sheet | BOOK / PRINTABLE |
| 15 | Automation readiness checklist | BOOK / PRINTABLE |
| 16 | Automation ROI worksheet | P2 |
| 17 | Repetitive-task audit | P2 |
| 18 | Handoff audit | INTERACTIVE SYSTEM ALREADY BETTER (handoff matrix above) |
| 19 | Trigger/action worksheet | BOOK / PRINTABLE |
| 20 | Exception-planning worksheet | BOOK / PRINTABLE (outbox already models it) |
| 21 | AI employee-use guide | P2 (no employee AI yet) |
| 22 | AI training scenarios | P2 |
| 23 | AI privacy acknowledgment | SMALL ENHANCEMENT (PolicyAcknowledgment reuse) — P1 |
| 24 | Manual fallback plan | SMALL ENHANCEMENT — P1 |
| 25 | Technology outage checklist | SMALL ENHANCEMENT — P1 |
| 26 | Offline sale-day sheet | SMALL ENHANCEMENT (print surfaces exist) — P1 |
| 27 | Payment-system fallback procedure | SMALL ENHANCEMENT — P1 |
| 28 | Sold-item fallback list | EXISTING TEMPLATE (SaleExport/labels) |
| 29 | Pickup fallback list | EXISTING TEMPLATE (PickupsCard/print) |
| 30 | System recovery checklist | SMALL ENHANCEMENT — P1 |
| 31 | Automation performance review | P2 |

---

## BOOK TRUTH — every named promise classified

| Promise | Verdict |
|---|---|
| Verified Item Facts (1) | ✓ Item schema Ch15/16 |
| AI Item/Sale Description, Email/SMS/Social Drafts (2–6) | ✓ verified paths above; SMS = draft-only, never claimed sent |
| Fact-Locked Description (7) | △ prompt+JSON grounding exists; not a structural runtime lock (no P1 claim without enhancement) |
| Unverified Claim Warning (8) | △ verified/research boundary enforces it; no generic claim scanner |
| Evidence Link (9) | ✓ verified_facts.source_type, ItemComparable, specialist_opinions, appraisal_context |
| Human Approval (10) | ✓ as mapped |
| Plain-Language Mode (11) | ✎ book/template only |
| First-Draft Assistant (12) | ✓ aiCoach modes |
| Rewrite/Shorten (13) | △ conversational only |
| Tone Control (14) | ✓ preferred_tone/brand_voice in coach |
| Checklist Builder (15) | ✓ AiChecklistPanel + SaleKitTemplate (operator-saved) |
| Template Creation (16) | ✓ SaleKitTemplate/MessageTemplate |
| Connected Content / Field Reuse (17–18) | ✓ canonical projections; some manual seams remain |
| One-Click Marketing (19) | ✓ kit + channels (email/social/print); SMS truthfully draft-only |
| One-Click Client Comms (20) | ✓ coach drafting, human sends |
| One-Click Team Briefing (21) | ✓ aiCoach team mode + MySaleDay |
| Inquiry Follow-Up (22) | ✓ Ch10 bridge + next_action |
| Appointment Reminders (23) | △ operator calendar reminders only |
| Deadline Reminders (24) | △ deterministic overdue display; no outbound reminders |
| Pickup Reminders (25) | △ obligation + MISSED PICKUP display; no auto-send (truthful) |
| Recurring Admin Tasks (26) | ✕ (platform-scheduled only) — LATER |
| Overdue Alerts (27) | ✓ Needs Action / overdue surfaces |
| Handoffs 28–34 | ✓ all verified (matrix above) |
| Trigger Record (35) | △ payload provenance on some; not uniform |
| Action History (36) | ✓ Activity/ledger/outbox |
| Source Information (37) | ✓ source_type/source_id provenance fields |
| Human Override (38) | ✓ operator control; immutable truths never rewritten |
| Automation Audit Trail (39) | △ run history exists; no unified why-record |
| AI Identification Assistant (40) | ✓ analyzeItemImage, no overstatement |
| AI Research Builder (41) | △ evidence capture only |
| AI Comparable Organizer (42) | △ ItemComparable is operator-curated |
| AI Research Summary (43) | ✓ AI_SUGGESTION-only notes |
| Confidence/Uncertainty (44) | ✓ honest enums; no fake percentages |
| Evidence Checklist (45) | △ fields exist; no checklist UI |
| Verification Status (46) | ✓ actual vocab: UNVERIFIED/RESEARCHING/REASONABLY_VERIFIED/SPECIALIST_REVIEWED |
| Specialist Escalation (47) | ✓ offsite_research/specialist_opinions/SPECIALIST |
| Source Record (48) | ✓ provenance preserved |
| Human Decision (49) | ✓ |
| AI Risk Ladder (50) | ✕ implicit only — P2 to formalize |
| Low/Moderate/High-Risk Review (51–53) | ✓ in practice (gates mapped) |
| Escalation Rules (54) | ✓ backend-enforced; recap exception (P0-2) |
| Source-of-Authority Link (55) | ✓ |
| Summary vs Source (56) | ✓ |
| Authority Warning (57) | ✓ UNKNOWN/None-recorded surfaced |
| Conflicting Instruction Alert (58) | ✕ protected but not alerted — P2 |
| Decision Hold (59) | ✓ guards block until authority resolves |
| Sensitive Info Warning (60) | △ image-side only |
| Minimum Necessary Data (61) | △ exemplary in kit/mySaleDay; violated in coach (P0-1/2) |
| Redaction Assistance (62) | ✕ |
| Role-Based AI Access (63) | △ one verified bypass (P0-1) — CRITICAL |
| AI Data Policy (64) | ✕ (BusinessDocument reuse possible) — P1 |
| Photo Privacy 65–69 | ✓ all enforced (matrix above) |
| AI Pricing Assistant (70) | ✓ suggestion-only |
| Pricing Confidence (71) | ✓ evidence-strength display |
| Local Market Context (72) | ✕ historical data not used — P2 |
| Selling-Window Context (73) | ✓ market_context + rationale |
| Operator Price Approval (74) | ✓ backend authority |
| AI Decision Summary (75) | △ conversational only |
| Decision Context (76) | ✓ |
| Authorized Decision-Maker (77) | ✓ SaleAuthority |
| Human Confirmation (78) | ✓ |
| Decision History (79) | ✓ append-only |
| Operator Coach 80–84 | ✓/△ as detailed (context-aware ✓, reasoning context △, alternatives △, cannot execute ✓) |
| Employee AI 85–92 | ✕ / ✓ deterministic equivalents (89 escalate-don't-guess ✓, 93 briefings ✓) |
| Company Knowledge Search (94) | ✕ P2 |
| Workflow Builder (95) | ✕ LATER |
| Missing-Step Review (96) | ✕ P2 |
| Exception Planning (97) | △ outbox models it |
| Human Approval Gates (98) | ✓ mapped |
| Automation Readiness (99) | ✕ worksheet/book |
| Repetition/Time-Savings/Friction/Efficiency/ROI (100–104) | ✕ P2 — never invent savings |
| Automation Map (105) | △ dashboard-level |
| Why Did This Happen? (106) | △ P1 candidate |
| AI Recommendation Source (107) | △ P1 candidate |
| Workflow History (108) | △ |
| System Health (109) | △ strong platform-side, thin operator-side |
| Manual Fallback (110) | △ not a mode — P1 kit |
| Printable Records (111) | ✓ |
| Offline Kit (112) | ✕ P1 candidate |
| Recovery Workflow (113) | △ mechanisms exist |
| Outage Checklist (114) | ✕ P1 candidate |
| Historical Analysis 115–120 | △ data ✓, analysis partial, AI use ✕ — P2/LATER |

**Coverage: ~70 ✓ EXISTING · ~30 △ ENHANCE/PARTIAL · ~20 ✕ (P2/LATER/BOOK) · ＋ required: 0 (reuse-first) · ✕ DUPLICATE: the book's separate employee-AI and workflow-builder systems — covered by MySaleDay authority + platform workflows.**

## REQUIRED BOOK WORDING CHANGES (exact replacements)

1. "AI generates and publishes a sale recap" → **"When a sale completes, the system prepares a recap draft with an AI summary; the operator reviews and publishes it. Client financial figures are never published without the operator's explicit choice."**
2. "AI coach knows your sale" → **"The AI coach reads only the sale records you are authorized to see and only the fields needed; it summarizes and suggests — it never decides, records, or publishes."**
3. "Automatic appointment and pickup reminders are sent" → **"Deadlines and missed pickups are surfaced in the product; sending reminders remains a human action."**
4. "AI learns from your history to price smarter" → **"Your completed projects are recorded in full detail; the system compares estimates to actuals on each sale. Cross-project pattern learning is a future capability, not a current one."**
5. "AI can draft your team's SOPs and training scenarios" → **"The AI drafts copy and organizes research; SOPs are your approved documents (Business Documents) and training lives in your published courses. Scenario generation is planned, not built."**
6. "Works offline" → **"Critical records are printable and manual transactions can be recorded on paper and re-entered; EstateSalen is not an offline system."**

## DO-NOT-REBUILD
Chapter 24 promises already satisfied by Ch8 equipment/readiness, Ch10 next-actions, Ch13 authority/tasks/issues, Ch14 research routing, Ch15 facts/photo privacy, Ch16 pricing/comparables, Ch17 staging, Ch18 marketing/consent, Ch19 employee authority/help, Ch20 live ops, Ch21 payments/custody, Ch22 disposition/authority, Ch23 reconciliation/settlement/learning — plus SaleAuthority, SaleClientDecision, SaleTask, SaleIssue, BusinessDocument, SaleRecap, the Customer.io outbox, the AI Coach architecture, backend authority gates, and RLS. Specifically: **no AIRecommendation, Automation, AIApproval, or Evidence entity; no second employee-help, checklist, template, or knowledge system.**

## PRODUCT DOCTRINES — confirm/refine
All Chapter 24 constitution doctrines are **confirmed as permanent** — the product already enforces the consequential core (evidence, authority, payment, financial, completion truths) at backend write seams. Two refinements: (a) the constitution must be *product-enforced*, not prompt-enforced, wherever possible — P0-2 shows the cost of a prompt-era automation that predates the doctrine; (b) "minimum necessary data" must be audited per AI surface as a standing rule, not assumed — P0-1 shows a seam that drifted.

## RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)
1. **P0-1** coach ownership check + curated coach context fields.
2. **P0-2** recap draft-gate (+ revenue opt-in) and fix the empty-args trigger; verify run.
3. googleLensPricing ownership check.
4. AI provenance display + "Why did this happen?" via Activity reuse.
5. AI-use policy + privacy acknowledgment via BusinessDocument/PolicyAcknowledgment.
6. Offline fallback kit + outage/recovery checklists (printable templates).
7. (P2, later chapters) risk-ladder formalization, conflict alerts, employee AI, historical intelligence.

## PRE-LAUNCH DEPENDENCIES (carried forward)
- Ch19: genuine non-owner HIGH_VALUE / client-decision denial (physical second-user test).
- Ch21: 428px physical-device checkout confirmation.
- Ch22/23: genuine second-company isolation denial.
- **Ch24 additions (manual-only):** after P0 fixes, re-test operatorAiCoach with a foreign sale id (expect 403), and confirm no recap publishes without operator approval.

## FINAL CERTIFICATION

# ✅ GO WITH CONDITIONS

The product's authority, evidence, privacy, and human-approval architecture is real, backend-enforced, and consistent with the Chapter 24 constitution. Conditions before launch: fix **P0-1 (coach sale-access bypass)** and **P0-2 (recap auto-publish with client financials)**, then re-run the two manual checks above. No new entities; no Chapter 24 feature build required for launch.

**AUDIT COMPLETE — NOTHING WAS BUILT, MODIFIED, OR DEPLOYED.**