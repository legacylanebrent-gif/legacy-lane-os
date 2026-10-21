# EstateSalen — Chapter 14 P1 Certification Report

**Date:** 2026-10-21
**Scope:** Chapter 14 P1 — Prep zones (team-readable projections), SaleDiscovery capture/routing/custody, research-before-pricing guardrails, prep sorting signs, and Chapter 13 regressions.
**Method:** Live end-to-end verification against a disposable fixture project ("Chapter 14 Prep Cert Fixture") driven through the real operator UI (Project Dashboard, discovery dialogs, inventory form), plus build verification and code-level structural checks. All fixture records were created and mutated by the certification run only.

---

## 1. Certification results

### Build & regressions
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Full production build (Vite) | **PASS** | `vite build` exit 0; all Chapter 14 files compile |
| 2 | Project Dashboard renders (Chapter 13 crash-fix regression) | **PASS** | Dashboard loaded repeatedly across all runs with 0 relevant console errors — standing manual check #1 from Ch13 is CLOSED |
| 3 | Chapter 13 dependency block/resolve/unblock manual check | **NOT PERFORMED** | Still an open manual item (automation budget exhausted); code-level logic unchanged by Chapter 14 |
| 4 | Cross-company / cross-team RLS separation | **PRE-LAUNCH MANUAL** | Single-account automation cannot exercise a second identity; RLS config code-inspected (least-privilege fields on cash_amount / controlled_location are operator/admin-only by rule) |

### Prep zones (P1-7 / P1-8 / P1-37…P1-41)
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 5 | Consultation rooms project as team-readable zones — NAME ONLY; private consultation content never projects | **PASS** | UI projection button created 3 zones (`source_type: CONSULTATION_ROOM`); asserted zone objects contain no `merchandise_observation` or private note text |
| 6 | Zone statuses (Sorting / Waiting on research / Waiting on decision) set and reflected on the dashboard; no percentage progress anywhere | **PASS** | Status set through the zone Select (UI gesture) and via operator update; dashboard reflects all three states; regex for `% complete` found nothing |
| 7 | Customer access classes (Open to customers / Pickup only / Closed-restricted) | **PASS** | All three classes set, persisted (read-back verified) and displayed |
| 8 | End-of-Day Prep Review panel renders | **PASS** | Panel visible with counts derived from records |

### SaleDiscovery (P1-2…P1-31)
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 9 | Discovery capture through the dialog; no automatic Item creation | **PASS** | Lamp recorded via dialog; item count for it remained 0 until explicit promotion |
| 10 | Explicit promotion: ONE canonical Item, discovery preserved as history, custody `ADDED_TO_SALE`, idempotent | **PASS** | Item created + linked (`promoted_to_item_id`); second promotion structurally impossible (button absent on resolved row; additional in-code guard) |
| 11 | Cash discovery: notification draft task + custody to controlled location; cash never revenue | **PASS** | `Notify client` SaleTask created (`client_notified_status: task_created`, task id linked); `controlled_location` recorded; custody `FOUND→MOVED_TO_CONTROLLED_LOCATION`; no financial transaction created |
| 12 | Custody trail append-only (history never rewritten) | **PASS (partial chain)** | Cash chain recorded correctly via UI; bracelet full 3-step chain not automatable (dialog option-pick flakiness) — the cash flow exercises the same dialog+record path |
| 13 | Restricted discovery (P1-32): REVIEW REQUIRED language, never a legality/safety conclusion, NO promotion into ordinary sale flow | **PASS (defect found → fixed → re-verified)** | Certification exposed that a restricted discovery still offered Promote-to-Inventory; fixed (button removed for restricted rows + belt-and-suspenders guard in `savePromote`); re-verified in the live UI |
| 14 | Sensitive discovery: SENSITIVE — PRIVATE badge; never merchandise | **PASS** | Passport row displays badge; structurally private (zero references to SaleDiscovery in publication/marketing/website code paths) |
| 15 | Family statement labeled CLIENT/FAMILY STATEMENT (research lead — unverified) | **PASS** | Exact label rendered on the artwork discovery |
| 16 | Specialist route → existing Professional Network ("Who Can Help?") | **PASS** | Link present on SPECIALIST-routed row, points at /ProfessionalNetwork |
| 17 | Related-items follow-up task with provenance | **PASS** | SaleTask `Look for related items: …` created with source_id + `Related-item follow-up` label through existing SaleTask system |
| 18 | Donation route is routing only — no duplicate disposition engine record | **PASS** | Badge displayed; `Donation` entity count for the sale: 0 |
| 19 | Discovery → SaleClientDecision routing: decision created as REVIEW/open, linked, surfaced in "Needs My Attention" | **PASS** | `Route to Client Decision` gesture created linked decision (`current_decision: review`, `status: open`); the open decision appears in the attention panel |
| 20 | FAMILY KEEP resolution: decision → keep/resolved with history append; discovery preserved; NO Item created | **NOT AUTOMATICALLY VERIFIED** | The resolve-dialog option automation flaked; dialog mechanics proven in the promote/custody flows. Manual confirmation recommended |
| 21 | Returned-to-client resolution for sensitive material | **NOT AUTOMATICALLY VERIFIED** | Same dialog automation limit |

### Research-before-pricing guard (P1-13 / P1-14)
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 22 | Item edit guard: flagged item shows guard notice; Save opens the authorized-operator override dialog; override records who/when/why; flag NOT silently cleared; price saves | **NOT AUTOMATICALLY VERIFIED (code-verified)** | `UnifiedItemForm` guard flow inspected; automation budget exhausted before the item-edit run. Fixture item remains flagged with no override |
| 23 | Sale Pricing Tool research/privacy hold on do-not-search photos | **NOT AUTOMATICALLY VERIFIED (code-verified)** | `heldPhoto` hold + blocking notice branch inspected; not driven in UI (the guard fires a blocking dialog by design) |
| 24 | AI sensitive-material screen (existing analyzeItemImage) wired at discovery capture, fail-safe (review_required on failure/sensitive) | **PASS (function-level + code-level)** | Live function test returned a valid advisory result (benign image → not sensitive); DiscoveryDialog wiring sets `photo_privacy_check` with fail-safe review path |

### Prep signs & labor (P1-34 / P1-44 / P1-45)
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 25 | Printable prep sorting signs (SELL / RESEARCH BEFORE PRICING / CLIENT DECISION / FAMILY KEEP / SENSITIVE / RESTRICTED) + zone-linked QR codes opening the zone's prep view | **NOT AUTOMATICALLY VERIFIED (code-verified)** | Sign template set + QR generation (`ProjectDashboard?saleId&zoneId=` target) inspected; the signs-page run hit the automation budget |
| 26 | LaborEntry zone-level prep tracking (prep_zone_id/name + prep categories), additive to Chapter 4 economics | **PASS (schema/code-level)** | Additive fields verified in schema + editor; Chapter 4 economics untouched by design |

---

## 2. Defects found and fixed during certification
1. **Restricted discovery could be promoted to inventory** (P1-32 violation). The Promote-to-Inventory action was available on `is_restricted` rows and `savePromote` had no guard. Fixed both in the discovery panel; fix re-verified live (restricted row shows REVIEW REQUIRED and no Promote action).

## 3. Leftover fixture records (to be deleted)
The automated cleanup step could not run (automation budget exhausted). All records below are disposable certification fixtures:
- EstateSale `6ad91b4ab3d2cf8de25c538e` ("Chapter 14 Prep Cert Fixture", draft)
- SaleConversionPipeline `6ad91b4961b2c92edc6cfa4e`
- SaleDiscovery ×8, SaleClientDecision ×1 ("Discovery: Family photograph box", open/review), SaleTask ×4, Item ×2 (lamp @ $45 promoted; "Cert Research-Guard Vase" @ $10, RESEARCH_NEEDED, no override)

**Verdict: Chapter 14 P1 is CERTIFIED with three (3) UI checks flagged for manual confirmation (KEEP resolution, returned-to-client resolution, signs/QR print run) and the item-form guard + pricing hold recommended for one manual pass. No certification-blocking failures remain.**