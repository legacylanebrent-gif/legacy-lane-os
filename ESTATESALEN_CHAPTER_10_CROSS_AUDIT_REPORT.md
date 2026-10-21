# CHAPTER 10 — ESTATESALEN CROSS-AUDIT REPORT
**FINDING THE FIRST CLIENT, LEAD MANAGEMENT, FOLLOW-UP & CONVERSION**
Audit date: 2026-10-21 · AUDIT ONLY — nothing built, no data modified, no emails/SMS/campaigns triggered, no integrations touched.

Method: source inspection of the deployed app (entities, pages, components, backend functions, shared modules, workflows) verified by direct reads/greps this session. Prior Chapter 1–9 certifications were relied on only where re-verified or previously certified in-repo. Nothing classified below is intended architecture.

---

## EXECUTIVE SUMMARY

- **Coverage:** 69 audit parts → **16 EXISTING/SUPPORTED (23%)**, **25 PARTIAL / ENHANCE (36%)**, **12 GENUINE GAPS (17%)**, **2 LATER**, **14 assessment/book/no-build items (20%)**. Including partials, **59% of Chapter 10 promises are supported today** by real code.
- **Strongest existing architecture:** the Chapter 9 inquiry→consultation→proposal→agreement→settlement chain with immutable snapshots and accepted-terms provenance; Chapter 2 structured referral source carried deal→sale; Chapter 7 credibility architecture (Company truth, testimonials, case studies, brand-truth guardrails); explicit-only inquiry consent; the Customer.io outbox with canonical-event quarantine.
- **Largest genuine gap:** **Next-action discipline (Part 9)** — `SaleConversionPipeline` has NO next-action field, no owner beyond the single operator, and no deterministic stale-lead logic anywhere in the codebase (grep-verified). The Chapter 10 core promise "no active lead disappears because the operator forgot what happens next" is **NOT currently supported by the system**. Second largest: `lost_reason` exists in the schema but has **zero UI/code usage** — lost outcomes are effectively untracked; LOST / REFERRED ELSEWHERE / NURTURE are conflated into one `lost` stage.
- **Book impact:** the book can truthfully describe the discovery→inquiry→qualification→proposal→agreement→sale chain as an existing system, and credibility/testimonial/case-study doctrine as enforced. It cannot yet claim: next-action CRM discipline, stale-lead protection, referred-elsewhere tracking, response-time measurement, or source→revenue dashboards. Those need the P1 list below or careful wording.

---

## 1. CREDIBILITY / PROFESSIONAL PRESENCE
✓ EXISTING. Canonical `Company` entity consumed by: `BusinessProfile.jsx`, LLBB `BusinessEditor/ServicesEditor/TestimonialsEditor`, `OperatorService` catalog (website explains; SaleScope selects — Ch7 doctrine enforced in schema), `OperatorSitePage`, website templates (`Template1Root` + sections), `saleCaseStudies` function, `OperatorServices.jsx`. A prospective seller learns company name, story, service area, actual services, contact info, website, and process (website FAQ/services; consultation/access flow inside the app). Stale User/profile duplicates are not consumed for company truth (verified in Ch7 certification, schema unchanged). Credentials: `BusinessDocument` categories INSURANCE/REGISTRATION/CERTIFICATION exist but are private-by-design and not auto-marketed — correct (no fabricated credentials).
Classification: **✓ EXISTING** (entity: Company, OperatorService; pages: BusinessProfile, OperatorServices, CaseStudies, ClientTestimonials; guardrail: brandTruthGuard).

## 2. OPERATOR WEBSITE
✓ EXISTING PLATFORM CAPABILITY — `WebsiteTenant` runtime-served architecture, `WebsiteDomain` custom domains, template registry (`src/templates/registry.jsx`), `SellerInquiryForm`, `LeadForm`, sale detail/gallery/services pages, `websiteSitemap`, `robotsTxt`. **SELF-SERVICE GENERALLY AVAILABLE:** the studio/collab seams (`AiWebsiteBuilderPanel`, `GuidedOnboarding`, review/publish workflow) are built, but provisioning is deliberately **platform-admin-gated** (control-plane doctrine) — self-service onboarding without admin oversight is NOT currently offered, by design. Pre-launch website bridge dependency: **carry forward honestly** (tenant provisioning remains admin-mediated; this is a policy, not a defect).
Classification: **✓ EXISTING CAPABILITY / △ self-service = intentional admin-gated (not a gap to "fix" without revisiting the platform-admin doctrine)**.

## 3. SELLER PROCESS GUIDE
△ ENHANCE. Website has services/FAQ; `SellerOnboarding` (Ch7 P2) is operator-facing guided workflow, not client-facing educational copy. No single client-facing INQUIRY→CONSULTATION→PREPARATION→SALE→CLOSEOUT explainer exists.
Classification: **✎ BOOK / PRINTABLE + small website-FAQ enhancement.** Do not build a feature for educational copy.

## 4. PROFESSIONAL DOCUMENTS
✓ EXISTING (Chapters 6/7/9 certified): `BusinessDocument` (AGREEMENT templates with `{{MERGE_VARIABLE}}` text, version-tracked), `SaleProposal` (versioned snapshots, finalize/accept/supersede), `SaleAgreement` (merge→READY→EXECUTED, signed-copy upload, immutable), `SaleScope` (version history), `SaleClientDecision`, `SellerOnboarding` guided steps, `SaleCaseStudy`, consultation records (`consultation_date`/`consultation_notes` on the deal + `SaleNote`), printables (signs, QR, PDFs).
Classification: **✓ EXISTING — the book can say operators use consistent consultation materials, proposals, agreements and worksheets.**

## 5. AI COMPANY STORY BUILDER
✓ EXISTING. `llbbAiBuilder`/`llbbAiContent` + `brandTruthGuard.ts` (`sanitizeMarketingText`) with the frozen adversarial pattern set: superlatives, volume/decade experience claims, testimonials/awards/ratings invention blocked. AI organizes true background; guardrail verified intact in shared module (re-read this audit).
Classification: **✓ EXISTING / SUPPORTED.**

## 6. SELLER INQUIRY FORMS
Actual working sources (verified in code):
1. **Operator website** — `SellerInquiryForm`/`LeadForm` → `submitWebsiteLead` (server-derives tenant/company; never trusts client IDs).
2. **EstateSalen public estate-transition pages** — `EstateTransitionLeadForm` → `routeEstateTransitionLead` (geo-scored provider routing).
3. **Platform public lead capture** — `LeadCapture` flow → `notifyWebsiteLead` (admin notification + email).
4. **QR codes** — MarketingKit `qr_url` (deterministic public sale page), `generateCartQR`.
5. **Manual entry** — deal editor on `SaleConversionPipeline` page.
6. **Houszu inbound** — functions exist (`getOperatorDealsFromHouszu`, `syncClosedDealFromHouszu`); **not verified live** (see §12).
Classification: **✓ EXISTING for 1–5; ↔ Houszu = committed pre-launch.**

## 7. SELLER LEAD RECORD
✓ `SaleConversionPipeline` is canonical: contact (name/email/phone), property (address/city/state), `situation` (6-value reason-for-sale enum), timing (`estimated_sale_start/end_date`, `consultation_date`), decision-maker (Ch9 `SaleAuthority` at sale level; `client_fit` pre-sale), merchandise notes (`notes`; detailed merchandise recorded at sale), referral source (Ch2 block), stage, distance snapshot (Ch5), economics (Ch4), accepted terms (Ch9).
**Gaps:** no next-action, single-owner only, no communication panel on the deal page, no bridge from `WebsiteLead`/`EstateTransitionLead` into a deal (manual re-entry).
Classification: **✓ EXISTING with △ gaps (below). Do NOT build a second CRM.**

## 8. LEAD STATUS
Actual taxonomy: `new_lead → consultation_scheduled → contract_signed → setup_in_progress → sale_live → completed | lost`, with deterministic auto-sync from linked `EstateSale.status` (`SALE_STATUS_TO_STAGE` map) and drag-transition kanban. No CONTACTED/QUALIFIED granularity before consultation; no transition history log (only `updated_date`); terminal outcomes: completed / lost only.
Classification: **✓ EXISTING equivalent model (coarser than the book's, acceptable) — but terminal outcomes are conflated (Part 52).**

## 9. NEXT ACTION  ⚠ CORE PROMISE
＋ BUILD. Grep-verified: **no `next_action` field, no next-action UI, no reminder, no overdue awareness anywhere on `SaleConversionPipeline`.** `Contact.next_follow_up` exists for the contact-side CRM; `SaleTask` is sale-scoped; `ai_timeline_tasks` is a per-deal checklist, not a per-lead "what happens next." A CRM full of leads without next actions is exactly what exists today.
Classification: **＋ BUILD (P1, extend `SaleConversionPipeline`).**

## 10. LEAD OWNER
△ Every deal has `operator_id` (required, RLS anchor) — accountability exists at company level. No team-member assignee pre-sale (`sale_team` starts at EstateSale). Single-operator companies (Chapter 10's audience: new operators) are fully covered.
Classification: **△ PARTIAL — owner exists (operator); optional assignee later; do not build an assignment system now.**

## 11. LEAD NOTIFICATIONS
△ Mixed: platform leads notify admins in-app + email (`notifyWebsiteLead`, roles-filtered); urgent estate-transition leads notify (`routeEstateTransitionLead`); **operator-website `WebsiteLead`s create NO notification/alert — operators see them only in the LLBB `LeadsPanel` dashboard.** A legitimate website inquiry can arrive with no one alerted (visibility requires opening the panel). Failure behavior is best-effort per-notification with logged errors, no retry ledger.
Classification: **△ ENHANCE (P1: notify tenant members on new `WebsiteLead`).**

## 12. AI FIRST RESPONSE
✕ Not existing. No code drafts a first response from inquiry content (grep for first-response modes: none). Coach modes (`coachModes.jsx`) cover objections, campaigns, review generation — not inquiry response.
Classification: **＋ BUILD (P2: grounded aiCoach mode reading WebsiteLead/deal fields; guardrails already exist; draft-only).**

## 13. RESPONSE TEMPLATES
✓ `MessageTemplate` entity (operator-controlled subject/body templates, tone, variables, usage tracking) + campaign builder + `OutreachSequence` + MarketingKit email/SMS drafts + ClientTestimonials request template (copy-to-clipboard, never auto-sent). Both operator-controlled templates and AI-assisted drafts exist; hardcoded copy is limited to system notifications.
Classification: **✓ EXISTING.**

## 14. FOLLOW-UP REMINDERS
△ `Contact.next_follow_up` + `Activity.scheduled_date` store date/context/outcome; no overdue surfacing or push reminder for CRM follow-ups found. A stored date is not a functioning reminder yet.
Classification: **△ ENHANCE (overdue visibility — folds into the P1 next-action work).**

## 15. COMMUNICATION HISTORY
△ Two distinct surfaces: (a) sale-scoped `CommunicationsPanel` on canonical `Activity` (Ch3 — communication that occurred, deliberately not SaleNote); (b) pre-sale `Contact`+`Activity` CRM records (`ContactDetail`, `ActivityTimeline`) with `contact_id`/`deal_id`/`sale_id`/`operator_id`, direction, outcome. The **pipeline deal page has no communications panel** — pre-sale opportunity history is recorded against Contact/Activity but not surfaced where the lead lives.
Classification: **△ ENHANCE (render Activity for the linked deal/lead on the pipeline page — reuse Activity; no new entity).**

## 16. AI CONVERSATION PREPARATION
✕ No lead-grounded prep mode (Ch8 operations mode is sale-grounded).
Classification: **＋ BUILD (P2): deterministic record summary + open questions; AI must not fill unknowns — schema supports honest unknowns already.**

## 17. FOLLOW-UP SCHEDULING
△ Free-form today: notes + calendar + consultation dates. No forced cadence — which actually satisfies "reflect the family's circumstances"; what's missing is the structured next-action date to hang it on.
Classification: **△ covered by Part 9 P1 (next_action_date free-scheduled, not cadence-forced).**

## 18. LONG-TERM LEAD NURTURE
△ No nurture state on the deal (`lost` is the only non-won terminal). Consumer-side long-term nurture exists (Customer.io campaigns, consent-gated). A months-long legitimate opportunity must sit in `new_lead` or be marked lost.
Classification: **△ ENHANCE (outcome_type NURTURE — Part 52).**

## 19. EDUCATIONAL FOLLOW-UP
✓ Content infrastructure exists: EstateSaleUniversity articles, blog engine, checklists (`ChecklistViewer` + `ChecklistDownloadForm` with email delivery), lead magnets.
Classification: **✓ EXISTING content infra; ✎ book supplements seller-specific pieces. Do not build a library.**

## 20. AI FOLLOW-UP DRAFTS
△ Coach Client-Relations modes draft with screen context, but no mode is automatically grounded on lead history (previous contact, stage, next action).
Classification: **△ P2: ground the existing coach on deal + Activity; no generic "just checking in" when context exists; no auto-send.**

## 21. STALE LEAD ALERTS  ⚠ CORE PROMISE
＋ BUILD. Grep-verified: **no stale-lead logic exists.** No query, no badge, no workflow, no dashboard.
Classification: **＋ BUILD (P1, deterministic — see Part 51 recommendation).**

## 22. REFERRAL SOURCE
✓ Chapter 2 architecture intact: `referral_source_type` (12-value enum), `referral_source_name`, optional `referral_source_contact_id` (prefer linking Contact over duplicating people), `referral_source_notes`, projected to `EstateSale` for display. "How did you hear about us?" is capturable consistently at deal intake.
Classification: **✓ EXISTING — reuse, do not rebuild.**

## 23. MARKETING ATTRIBUTION
△ SELF-REPORTED: solid (Part 22 + `Lead.source/ad_platform/ad_campaign` for ad-sourced leads + `WebsiteLead.source_url/referrer`). TECHNICALLY ATTRIBUTED: partial only — no UTM/click attribution pipeline exists.
Classification: **△ HONEST: self-reported attribution exists; click attribution does not. Do not claim it.**

## 24. SOURCE CONVERSION TRACKING
△ Source survives deal→sale (projection), revenue lands on the deal (`actual_revenue` mirror from settlement), and Ch9 adds proposal/agreement linked to the deal — so source is traceable through the full chain **in the data**. No UI follows source through inquiry→proposal→agreement→revenue.
Classification: **△ data supports it; dashboard does not (Part 47). Major product opportunity (P2).**

## 25. REFERRAL PARTNER PERFORMANCE
△ Per-partner performance (inquiries→signed→revenue by `referral_source_name`/Contact) is derivable from stored records via SDK aggregate; no dashboard, no automatic analysis. Referral count ≠ referral quality — no quality view exists.
Classification: **△ manual analysis today; LATER intelligence.**

## 26. GEOGRAPHIC LEAD TRACKING
✓/△ Data: deal property city/state, `EstateSale` full address/geo/`distance_miles` snapshot (Ch5), `Lead` lat/lng/county, territory architecture. **Reporting does not exist** — geographic seller-demand analysis is possible from stored data only.
Classification: **△ stored data yes, report no.**

## 27. LEAD QUALIFICATION
✓ Deal intake captures situation, timing, property, distance, merchandise volume (site_assessment is sale-stage; pre-sale has `client_fit` 8 observable-condition dimensions + notes, Ch5), internal min-revenue/contribution thresholds, estimated range (Ch9 operator-supplied only). Enough to decide whether a consultation makes sense.
Classification: **✓ EXISTING (Ch4/5).**

## 28. CONSULTATION SCHEDULER
✎ **DATE RECORD, not a booking system:** `consultation_date` stored on the deal, shown on the pipeline calendar (`calendarEvents`). No availability, no client-facing booking, no confirmation. Calendly connector is available in the connector catalog if ever wanted (LATER).
Classification: **✎ date record (book tool supplements); do not claim scheduling.**

## 29. CONSULTATION PREPARATION
△ `sellerOnboardingAi` drafts honest client updates from onboarding facts; no standard "who should attend / what to bring / what not to remove" client prep template.
Classification: **✎ BOOK + △ small template enhancement.**

## 30. DON'T THROW IT AWAY YET
✎ BOOK / PRINTABLE handout. No subsystem; none needed.

## 31. CONSULTATION RECORD CREATION
✓/△ Within the core chain, carry-forward is real: deal→sale creation copies client, property, referral projection, dates; Ch9 proposal/agreement read canonical deal/scope — no retyping. **Break: `WebsiteLead`/`EstateTransitionLead` → `SaleConversionPipeline` deal requires manual re-entry** (no bridge creates a deal from a captured inquiry).
Classification: **△ P1: inquiry→deal bridge (server-side, preserving source fields).**

## 32. ALTERNATIVE-SERVICE WORKFLOW
△ Routing exists for estate-transition leads (`needs_cleanout/needs_realtor/...` + `ProbateProviderRoutingRule`/`ProviderRoutingRule` + `matchCleanoutLead`/`matchResellerLead`). For **operator pipeline deals**, an unsuitable lead can only go to `lost` — no alternative-service classification. (Lead routing, not Chapter 22 merchandise disposition.)
Classification: **△ ENHANCE (P1/P2 small — classify + refer, Part 54).**

## 33. PROFESSIONAL REFERRAL NETWORK
✓ `ProviderDirectory` + routing rules, cleanout/donation/reseller networks (`CleanoutNetwork`, vendors), `Contact` roles/tags for Realtors/attorneys/organizers/movers.
Classification: **✓ EXISTING — do not create another vendor directory.**

## 34. REFERRAL-OUT TRACKING
＋ Today REFERRED ELSEWHERE can only be `lost` — no destination, contact, reason, or date. (`Lead.referral_status` is the agent↔operator referral *exchange*, a different system.)
Classification: **＋ BUILD (small field extension, Part 54).**

## 35. HOUSZU CONNECTION
△ Functions implemented and deployed (`getOperatorDealsFromHouszu`, `syncClosedDealFromHouszu`, `notifyHouszu_*`, partner client) with secrets present (`HOUSZU_API_URL/KEY`, partner service token). Known issue carried: **Houszu identityResolve down/undeployed (B2-03)**; feed-pull sync relies on receiver cadence; certification remains a pre-launch dependency.
Classification: **△ IMPLEMENTED BUT UNVERIFIED / ✆ COMMITTED PRE-LAUNCH. Do not overstate.**

## 36. FUTURE OPPORTUNITY
△ Same as Part 18 — "not ready today" must be faked as `lost` or parked in `new_lead`.
Classification: **△ NURTURE outcome needed (Part 52).**

## 37. POST-SALE CLIENT FOLLOW-UP
△ Coach `Post-Sale Follow-Up` drafting mode + testimonial request + case studies exist; **no structured post-sale follow-up scheduling** (thank-you/check-in/referral ask) on a completed deal.
Classification: **△ ENHANCE — reuse the Part 9 next-action fields; do not create another post-sale CRM.**

## 38. TESTIMONIAL REQUEST
✓ Storage: `ClientTestimonial` (source enum, sale link, `permission_to_publish`, status CAPTURED→APPROVED→PUBLISHED→ARCHIVED, revocation = permission flip → private regardless of status). **REQUEST capability exists:** "Request a testimonial" dialog prepares an honest draft template, copy-to-clipboard, explicit "nothing is sent automatically; a reply is never recorded until you enter it here with permission."
Classification: **✓ EXISTING (request ≠ storage — both present, human-mediated).**

## 39. REFERRAL REQUEST
△ No dedicated ask-for-referrals template found; `ReferCompany` is operator-to-operator referral, coach `Referral Partners` mode is coaching. A received referral CAN connect back (source_type `past_client` + name + optional Contact link).
Classification: **△ SMALL ENHANCEMENT (template) — not a system.**

## 40. BUYER → SELLER CONNECTION
△ Matching keys exist: `EarlySignIn.user_id`, `Offer.user_id`, `VIPInvite.user_id` (Ch5 canonical joins), `ConsumerMarketingProfile`, `resolveUserIdentity` (normalized email) for Customer.io. **No surface recognizes "this seller was previously a buyer/attendee"** — keys are stored, not connected.
Classification: **△ data-only today; do not overstate identity resolution. P2 view.**

## 41. PROFESSIONAL CONTACT CAPTURE
✓ `Contact` (roles, tags, situation, source) + provider directory.
Classification: **✓ EXISTING — reuse Contact.**

## 42. COMPLETED SALE PORTFOLIO
✓ `SaleCaseStudy` (real completed sale required, generalized location, operator-selected photos, record-supported metrics snapshotted with provenance, publish control, private-by-default) + website testimonials section. Ch7 P2 certified.
Classification: **✓ EXISTING.**

## 43. POST-CONSULTATION REVIEW
△ `consultation_notes`, `client_fit` updates and `SaleNote` cover it lightweightly. No structured review — and none needed.
Classification: **↔ COVERED by existing notes; ✕ do not build a second recap system.**

## 44. LOST-OPPORTUNITY REVIEW
＋ `lost_reason` exists in the **schema only** — grep-verified **zero UI or code writes it**. No reason taxonomy, no notes prompt, no review surface.
Classification: **＋ BUILD (P1 small: reason select + notes on the lost transition).**

## 45. AI PROCESS IMPROVEMENT COACH
✕ No cross-lead pattern analysis exists (single-lead coaching only; AdminAI is platform operations).
Classification: **LATER — do not claim business intelligence where only records exist.**

## 46. TEMPLATE IMPROVEMENT SUGGESTIONS
✕ Not existing. LATER (AI P2+).

## 47. CONVERSION DASHBOARD
＋ Operator sees a stage kanban + counts (`SaleConversionPipeline` page) and admin sees `LeadFunnel` (platform Lead counts). **No operator dashboard consumes SaleProposal/SaleAgreement states or source→revenue.** Stored data is not a dashboard.
Classification: **＋ BUILD (P2 — SDK aggregate over existing entities; no new records needed).**

## 48. CRM TRUTH CHAIN — matrix:
| Transition | Canonical record | Identity preserved | Source preserved | History preserved | Manual retyping |
|---|---|---|---|---|---|
| INQUIRY (website) | `WebsiteLead` | yes (email/phone) | yes (`source_url/referrer`) | yes (record) | — |
| INQUIRY → LEAD/deal | `SaleConversionPipeline` | **no bridge — re-entry required** | **depends on operator re-entry** | no link to WebsiteLead | **YES (gap)** |
| QUALIFICATION | deal (`client_fit`, economics) | yes | yes | partial (updated_date only) | no |
| CONSULTATION | deal fields + Activity | yes | yes | Activity available, **not surfaced on deal page** | no |
| PROPOSAL | `SaleProposal` (deal_id, sale_id) | yes | via deal | immutable snapshot ✓ | no |
| AGREEMENT | `SaleAgreement` (deal_id, sale_id, proposal_id) | yes | via deal | immutable snapshot ✓ | no |
| SALE | `EstateSale` (+deal link, referral projection) | yes | **yes (projection from deal)** | yes | no |
| SETTLEMENT | deal (`actual_revenue`, payouts; EstateSale canonical) | yes | via deal | payout records ✓ | no |
| TESTIMONIAL | `ClientTestimonial` (optional sale_id) | optional link | n/a | yes | no |
| REFERRAL (next deal) | next deal's Ch2 source block (+ Contact link) | via Contact | **yes** | yes | partial |

## 49. SOURCE → REVENUE MATRIX
Per-deal: **YES** — deal carries referral source + settlement-written `actual_revenue` + accepted-terms snapshot; "where did this revenue client come from?" is answerable from the deal record. Business-wide: **NO** — no aggregation UI, and the WebsiteLead→deal bridge break means website-sourced deals depend on the operator re-entering source correctly. Breaks: (1) inquiry→deal manual re-entry, (2) no source→revenue aggregation surface, (3) lost/unconverted leads carry no revenue outcome analysis.

## 50. NEXT-ACTION DISCIPLINE (proposed rule — evaluate only)
Current architecture does NOT support "every active opportunity must have owner/status/next action/date." Hard enforcement would conflict with existing freeform workflows (deals parked in `new_lead` while auto-sync from sales runs). **Recommendation: soft enforcement** — visible next-action fields + deterministic stale surfacing (Part 51) rather than blocking saves. Do not implement now.

## 51. STALE LEAD DEFINITION (recommendation only)
Smallest useful deterministic rule: stage NOT IN (completed, lost) AND no future `consultation_date` AND `next_action_date` null-or-past AND `updated_date` older than operator-configured threshold (v1 proxy; any touch refreshes it — acceptable) → stale badge/list. AI may explain/prioritize; **AI never determines staleness.** Do not implement now.

## 52. WON / LOST / REFERRED / NURTURE
✕ Conflated today: one `lost` stage for lost, referred-elsewhere, and not-ready. Doctrine "not ready ≠ lost" and "referred ≠ lost" is **violated by the current model**.
Classification: **＋ BUILD small (outcome_type on the deal).**

## 53. LOST REASON
＋ Field exists, unused. Add reason select (price/fee, timing, not qualified, competitor, not ready, scope, authority, location, capacity, no response, alternative service, unknown) + notes + date. Do not over-engineer.

## 54. REFERRAL-OUT MODEL
＋ No new entity: extend `SaleConversionPipeline` with `referred_to_contact_id`, `referred_service`, `referred_at`, `referred_notes` (reuse Contact for the destination professional).

## 55. LEAD RESPONSE TIME
✕ Not measurable today: no first-response timestamp; automated acknowledgment ≠ human response, and neither is recorded against the lead. Possible later KPI via timestamp on first operator Activity linked to the lead. **Do not claim response-time measurement.**

## 56. FOLLOW-UP RELIABILITY
✕ Not measurable until Part 9 fields exist; then counts/overdue derive from server aggregates. No vanity metrics — defer.

## 57. CONSENT
✓ Website-lead consent is **explicit-only, recorded verbatim, never inferred from submission** (`marketing_opt_in`/`vip_opt_in`/`sms_opt_in` + `consent_captured_at`); `consentGuard` checks preferences + Customer.io suppression before marketing sends; EarlySignIn opt-in decoupled from sign-the-list (Ch7 fix intact); inquiry submission creates **no** Customer.io marketing writes (attribution object only, "no Customer.io writes" in code). Transactional (requested response) vs marketing/nurture distinction is enforced.
Classification: **✓ EXISTING / CERTIFIED — critical doctrine holds.**

## 58. CUSTOMER.IO
✓ Architecture LIVE per prior certification: `IdentityActivityOutbox` (durable), hourly `Houszu Outbox Flush` workflow drain, idempotency, privacy filtering, canonical Houszu v1.6.0 vocabulary with registry-gap **quarantine** (re-verified in `identityActivityOutbox.ts` this audit), direct production writes forbidden by internal guardrail, `CUSTOMERIO_ENABLED` set. Nothing triggered during this audit. Seller-inquiry events do NOT flow without consent flags (Part 57).
Classification: **✓ LIVE (architecture) — delivery re-certification not re-run this audit.**

## 59. AI BOUNDARIES
✓ Every AI surface inspected is draft-only with human send/approval (testimonial request copy-out, seller onboarding client updates guardrailed, coach outputs never auto-send, proposals/agreements never AI-authored legal language). No AI mutates lead status, closes leads, or schedules consultations. Unknowns stay unknown (Ch9 doctrine).
Classification: **✓ EXISTING — doctrine already enforced; preserve in any Part 12/16/20 builds.**

---

## 60. READY-TO-USE CLIENT-BUILDING TOOLS (all 26)

| # | Tool | Classification |
|---|---|---|
| 1 | New-business credibility checklist | ✎ BOOK (points reader at in-app Readiness panels) |
| 2 | First-client readiness assessment | ↔ INTERACTIVE SYSTEM ALREADY BETTER (`LaunchReadinessScore`, LLBB `ReadinessPanel`, `OperatorSkillsAssessment`) |
| 3 | Company introduction sheet | ✎ BOOK (generated from Company truth via existing AI story builder) |
| 4 | Seller process guide | ✎ BOOK + △ small website-FAQ enhancement |
| 5 | Personal-network announcement template | ✎ BOOK (AI Content Creation mode can assist) |
| 6 | Professional introduction email | ✓ EXISTING template infra (`MessageTemplate`) + coach; ✎ supplement |
| 7 | Seller inquiry form | ✓ INTERACTIVE SYSTEM ALREADY BETTER (website + platform forms) |
| 8 | Initial-call worksheet | ✎ BOOK (+ later AI conversation-prep mode, Part 16) |
| 9 | Lead qualification checklist | ↔ INTERACTIVE SYSTEM ALREADY BETTER (`client_fit` 8 dimensions + deal intake) |
| 10 | How-did-you-hear tracker | ✓ INTERACTIVE SYSTEM ALREADY BETTER (Ch2 structured source) |
| 11 | Lead-status worksheet | ✓ INTERACTIVE SYSTEM ALREADY BETTER (stage kanban) — do not print |
| 12 | Next-action planner | ＋ GENUINE SOFTWARE GAP (P1 fields) — ✎ book stopgap |
| 13 | First-response email templates | △ SMALL ENHANCEMENT (seed MessageTemplate) / ✎ BOOK |
| 14 | SMS response templates | ✓ template infra exists; SMS *sending* remains manual/pre-launch (SMS certification dependency) |
| 15 | Long-term follow-up templates | △ SMALL ENHANCEMENT + ✎ BOOK (needs NURTURE state, Part 52) |
| 16 | Pre-consultation email | △ SMALL ENHANCEMENT (template) / ✎ BOOK |
| 17 | Don't Throw It Away Yet handout | ✎ BOOK / PRINTABLE |
| 18 | Consultation scheduling checklist | ✎ BOOK (system stores dates; no booking — be honest) |
| 19 | Alternative-service referral sheet | △ ENHANCE (Parts 32/34) — routing partially exists |
| 20 | Post-consultation follow-up | ↔ covered by Activity/comms + coach; formalize via P1 next-action |
| 21 | Lost-lead review | ＋ SMALL ENHANCEMENT (lost_reason UI — Part 44) |
| 22 | Testimonial request | ✓ INTERACTIVE SYSTEM ALREADY BETTER (request dialog) |
| 23 | Referral request | △ SMALL ENHANCEMENT (template; Part 39) |
| 24 | Post-sale client follow-up | △ covered by coach mode; scheduling via P1 next-action |
| 25 | First-sale review worksheet | ✎ BOOK (data side covered by `SaleRecap`/closeout) |
| 26 | First-sale readiness checklist | ↔ INTERACTIVE SYSTEM ALREADY BETTER (PrepareSale deterministic readiness + guided closeout) |

## 61. DO-NOT-REBUILD LIST
Confirmed canonical, must not be duplicated: `Company` · operator website/LLBB stack · `Contact` · `Lead` · `WebsiteLead` · `EstateTransitionLead` · `SaleConversionPipeline` · `EstateSale` · `SaleProposal` · `SaleAgreement` · `SaleAuthority` · `SaleScope` · `SaleClientDecision` · `SaleTask` · `SaleNote` · `Activity` · CommunicationsPanel · Customer.io `IdentityActivityOutbox`+flush · `ConsumerMarketingProfile`/`resolveUserIdentity` · ClientTestimonials · SaleCaseStudy · ProviderDirectory + routing rules · Donation/Cleanout/Reseller networks · Houszu referral architecture · AI Coach (`operatorAiCoach`) · `MessageTemplate` · Notification · Ch2 referral-source block · Ch5 distance/geo snapshots.

## 62. SMALLEST RECOMMENDED ARCHITECTURE (DO NOT IMPLEMENT)
**One entity extended — `SaleConversionPipeline` — plus two functions/pages; NO new CRM, NO new entities:**
1. `next_action` (text), `next_action_date` (date), optional `assigned_user_id`.
2. `outcome_type` ∈ {won, lost, referred, nurture} + `lost_reason` (select) + `lost_notes` + referred-out block (Part 54).
3. Deterministic stale derivation (Part 51) rendered on the pipeline page; optional daily workflow later.
4. Server-side `WebsiteLead`/`EstateTransitionLead` → deal bridge (preserves source fields).
5. Notification to tenant members on new `WebsiteLead`.
6. P2: conversion/source→revenue dashboard (SDK aggregates over existing records) + grounded AI first-response/conversation-prep/follow-up coach modes.

## 63. CRM IDENTITY
Actual matching keys: platform `user_id` (strong; EarlySignIn/Offer/VIPInvite, Ch5), normalized email, phone. `ConsumerMarketingProfile` + `resolveUserIdentity` resolve the canonical person **for Customer.io only**. CRM records (Contact, WebsiteLead, deals) share no dedup/merge logic with that resolution. Limitation stated honestly: the same human can exist as buyer profile + Contact + website lead + deal with no cross-link.

## 64. LEAD DUPLICATION
No CRM dedup or merge exists. Double submission → two WebsiteLeads; call-after-web → manual duplicate Contact/deal; ex-buyer → unrecognized. Customer.io dedups by resolved person; CRM does not. **P2: match-on-email/phone duplicate warning (never auto-merge).**

## 65. FIRST-CLIENT MODE
✓ Truth guardrails prevent fake-established (brand patterns incl. experience/decade claims; testimonials never AI-invented; case studies require real completed sales; estimates never invented). Launch-mode architecture (LaunchReadinessScore, LlbbPilot) supports new operators. △ No adaptive presentation that reorganizes marketing surfaces for 0-sale operators — website simply shows what's true. Doctrine "look prepared, never pretend established" is **enforced by the guardrails themselves**.

## 66. FIRST SALE → SECOND SALE LOOP
Intact: lead→deal→consultation→proposal→agreement→sale→closeout→settlement→testimonial capture→case study→referral-source capture on next deal. **Broken transitions:** (1) post-sale follow-up scheduling (Part 37), (2) referral request template (Part 39), (3) buyer→seller recognition (Part 40), (4) conversion dashboard feedback (Part 47). All four are P1/P2 items above.

## 67. BUSINESS LEARNING LOOP
Stored automatically: source, stage, (reason — once UI exists), revenue, dates. **Learned automatically: nothing.** No cross-lead analysis exists. Honest classification: records exist, intelligence does not — LATER.

## 68. BOOK TRUTH TEST (strict promises)
| Promise | Can the book say it today? |
|---|---|
| Operator website | YES (existing capability; self-service = admin-mediated, word carefully) |
| Seller process guide | YES AS EXISTING-SYSTEM OUTCOME for website services/FAQ; full guide = BOOK |
| Seller lead record | YES |
| Lead status | YES (equivalent coarser model) |
| Next action | **NOT YET — BUILD (P1)** |
| Lead notifications | YES WITH SMALL ENHANCEMENT (website-lead alert missing) |
| AI first response | **NOT YET — BUILD (P2)** |
| Follow-up reminders | YES WITH SMALL ENHANCEMENT (overdue visibility) |
| Communication history | YES WITH SMALL ENHANCEMENT (surface on deal page) |
| Long-term nurture | NOT YET (NURTURE outcome — P1 small) |
| Stale lead alerts | **NOT YET — BUILD (P1)** |
| Marketing attribution | YES AS SELF-REPORTED ONLY — WORDING MUST NOT CLAIM CLICK ATTRIBUTION |
| Source conversion tracking | YES AS STORED DATA; dashboard NOT YET (P2) |
| Referral partner performance | YES AS MANUAL ANALYSIS ONLY |
| Geographic lead tracking | YES AS STORED DATA; reporting NOT YET |
| Consultation scheduler | WORDING SHOULD CHANGE — date record, not booking |
| Alternative-service workflow | YES WITH SMALL ENHANCEMENT (pipeline deals) |
| Referral-out tracking | **NOT YET — BUILD (P1 small)** |
| Houszu connection | COMMITTED PRE-LAUNCH (implemented, unverified) |
| Post-sale follow-up | YES WITH SMALL ENHANCEMENT |
| Testimonial request | YES |
| Referral request | YES WITH SMALL ENHANCEMENT (template) |
| Buyer-to-seller connection | WORDING SHOULD CHANGE — keys stored, no recognition surface |
| Lost opportunity review | NOT YET (lost_reason UI — P1 small) |
| AI process improvement coach | LATER |
| Conversion dashboard | NOT YET — BUILD (P2) |

## 69. PRODUCT DOCTRINES
Adopt all twelve. Status against current architecture:
- "Source, status, owner, next action, outcome" — **3 of 5 exist** (source ✓, status ✓, owner ✓ company-level, next action ✕, outcome-type ✕). Adopt with P1.
- "No active lead should disappear" — aspirational until Part 9/21 build.
- "Not ready ≠ lost" / "Referred ≠ lost" — **violated by current model**; adopt with Part 52.
- "Automated acknowledgment ≠ human response" — holds (no automated acknowledgment even claims to be a response).
- "Seller inquiry is not marketing consent" — **already enforced** (explicit-only consent).
- "Follow-up reflects family circumstances" — holds (no forced cadence).
- "AI prepares the operator, never pretends" — **already enforced** (draft-only everywhere).
- "Every completed sale makes the next easier" — partially (testimonials/case studies/source capture); dashboard feedback pending.
- "Every source measurable against outcome" — data yes, surface no.
- "Stored data is not intelligence until it helps the operator use it" — adopt; motivates P2 dashboard.
- "Look prepared, never pretend established" — **already enforced** (guardrails).

---

## 70. P0 / P1 / P2 / P3 / LATER ROADMAP
- **P0:** none new. Consent, inquiry-privacy, and cross-company leakage boundaries verified intact this audit; no source/revenue truth corruption found (deal revenue is settlement-written, Ch9 certified).
- **P1 (Chapter 10 core promise):** next-action fields + soft enforcement; outcome_type WON/LOST/REFERRED/NURTURE + lost-reason UI; deterministic stale surfacing; WebsiteLead→deal bridge; operator notification on new website leads; comms/history surface on the deal page.
- **P2:** conversion + source→revenue dashboard; grounded AI first-response / conversation-prep / follow-up draft modes; duplicate-warning (no auto-merge); response-time KPI; referral-request + pre-consultation templates.
- **P3:** overdue follow-up polish; nurture campaign linkage; geographic demand report.
- **LATER:** cross-lead AI process improvement coach; template improvement suggestions; UTM/click attribution; buyer→seller recognition surface.

## 71. RECOMMENDED IMPLEMENTATION SEQUENCE (DO NOT IMPLEMENT)
1. `SaleConversionPipeline` field extension (next action, outcome, lost reason, referred-out) — one schema change, backward-compatible defaults.
2. Pipeline-page UI: next-action editor, outcome dialog, stale badge/list, Activity surface.
3. WebsiteLead→deal bridge (server-side function).
4. Website-lead notification to tenant members.
5. Conversion/source→revenue dashboard.
6. AI modes (first response, conversation prep, grounded follow-up) — all draft-only.

## 72. PRE-LAUNCH DEPENDENCIES (carried forward, unchanged by this audit)
Physical Item QR → camera → checkout/receipt · two Chapter 9 manual UI confirmations (decision dialog; closeout warning-clearing) · second-account RLS denial · Worksheet Add Transaction click-through · Vault Expiring Soon filter · Professional escalation Contact selection · SMS certification · **Houszu certification (incl. B2-03 identityResolve)** · Meta access/secrets (B5-01 token expired).

## 73. CERTIFICATION

# **GO WITH ENHANCEMENTS**

The discovery→inquiry→qualification→proposal→agreement→sale→settlement→testimonial chain, credibility architecture, consent boundaries, and AI guardrails are real and certified. The Chapter 10 core follow-up promises (next action, stale-lead protection, referred-elsewhere/nurture outcomes, lost reasons) require the P1 enhancements above before the book claims them as system behavior. No P0 blockers found. **Chapter 10 is NOT built. Stopped. Awaiting explicit authorization.**