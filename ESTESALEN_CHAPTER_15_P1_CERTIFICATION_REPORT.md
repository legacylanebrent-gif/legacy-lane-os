# EstateSalen — Chapter 15 P0/P1 Certification Report (Item Lifecycle)

Date: 2026-10-21 · Scope: Chapter 15 P0 (photo privacy) + P1 item-lifecycle features, verified against live preview + production data.

## Results summary

| # | Feature (Chapter 15) | Method | Status |
|---|---|---|---|
| 1 | Photo library private by default; `approved_public=false`; screen before publish (P0) | Code audit + `analyzeItemImage` function test (screen passed a benign image) | PASS |
| 2 | Cross-company RLS (operator/seller/team/read-scope projections) | Schema audit only | **MANUAL — pre-launch check required** |
| 3 | Quick item: title + price + level card + zone = sellable record, nothing forced | Automated UI gesture (form opened, Quick selected, saved) | PASS |
| 4 | Level escalation/de-escalation never deletes data; UI emphasis only | Form guard + history code audit | CODE-VERIFIED (UI gesture not completed — see notes) |
| 5 | Level downgrade requires explicit unlock ("Change to a lighter level?") | Markup/logic audit | CODE-VERIFIED (not UI-driven) |
| 6 | Lighter levels locked after escalation | Form logic audit | CODE-VERIFIED (not UI-driven) |
| 7 | Stable sale-scoped item numbers; no duplicate under rapid creation | Two live creations (nos. 1, 2) via server `assignItemNumber`; immutable on every later write | PASS |
| 8 | Discovery → Item promotion: description, zone, sub-location, research, provenance carried | Automated UI gesture (dashboard → Promote → Create Item) | PASS |
| 9 | Restricted discoveries never offer ordinary promotion | Guard present in promote path (Ch14 P1-32) — re-confirmed in code | PASS (code) |
| 10 | Location truth: zone badge "Garage — Back Wall" on rows | Data persisted; badge markup audit | PASS (zone set via promotion path) |
| 11 | Family statements never shown as provenance (carried labeled/unverified) | Promoted item carries `CLIENT_FAMILY_STATEMENT` research note labeled "(unverified)" | PASS |
| 12 | `research_notes` (working) vs `verified_facts` (approved, who/when/source) | Separation verified via promotion handoff | PASS (fact-approval gesture not completed) |
| 13 | Photo upload gesture through real form | Not automatable in preview (file input) — screen function + code path verified | MANUAL (cosmetic) |
| 14 | Furniture depth: dimensions, condition, included/excluded, groups | Form fields + schema audit | PASS (code) |
| 15 | QR labels encode canonical ID + item number; label reprints keep number | `ItemLabels` audit | PASS (code) |
| 16 | Offer → canonical Item link (`item_id`), identity never from mutable name | `OffersPanel`/`checkoutForOffer` audit | PASS (code) |
| 17 | Field burden per level (Research: mark/serial/notes; High-value: custody chain) | Form audit | PASS (code) |
| 18 | Guidance suggestions shown at creation; operator always free | `suggestLevel` + guidance dialog audit | PASS (code) |
| 19 | Resale-scope merchandise (vehicles/jewelry) not forced into depth model | Level taxonomy only, no forced attributes | PASS (code) |
| 20 | Canonical transaction: distinct statuses sold/paid/pickup (no free-text paid boolean) | Schema + sold-flow audit | PASS (code) |
| 21 | Legacy `images` arrays untouched (grandfathered) | Schema default + code audit; no migration | PASS (code) |
| 22 | Custody chain continuity discovery → item; controlled location carried | Automated: promoted item seeded with FOUND→MOVED chain + controlled location | PASS |
| 23 | Guidance dialog: company rules or built-in defaults | Markup audit | PASS (code) |
| 24 | Printable backup list (connectivity backup) | Print function audit | PASS (code) |
| 25 | Labor vocabulary additive; Chapter 4 economics untouched | `LaborEntry` enum + derivation audit | PASS (code) |
| 26 | Mobile 390–428px without horizontal scroll | Form/table layout audit | PASS (code; viewport sweep not completed) |
| 27 | Photo access least-privilege (research/custody photos never public) | Code audit | PASS (code) — pair with manual check #2 |
| 28 | No regressions to Ch13/14 (tasks, prep zones, discovery board) | Dashboard rendered during certification; build green | PASS |
| 29 | Promoted item does not publish images (`images` empty until approved) | Automated | PASS |

## Automated evidence (this run)

- **Discovery → Item (Tests 8/22/11/12/29):** created a live fixture discovery (valuable, custody chain, family statement, controlled location) and promoted it through the real Project Dashboard UI. Result: item created with correct title/zone/sub-location, `inventory_level=HIGH_VALUE`, `research_status=RESEARCH_NEEDED`, `promoted_from_discovery_id` set, server item number 1 assigned, custody chain seeded (FOUND → MOVED_TO_CONTROLLED_LOCATION), controlled location carried, family statement stored as a CLIENT/FAMILY STATEMENT research note labeled "(unverified)", and `images` empty (nothing public). All assertions PASS.
- **Quick item (Test 3/7/10):** created through the real inventory form at QUICK level — item number 2 assigned (unique vs. 1), level QUICK, sub-location saved, no photo leakage. PASS.
- **Runtime:** no console errors during the certified flows; production build green.
- **Cleanup:** all 4 fixture records (2 items, 1 discovery, 1 sale) deleted by exact ID after the run.

## Not completed / manual follow-ups

1. **Level-transition UI gestures (Tests 4/5/6) and fact-approval gesture (Test 12):** the verification script selected the row edit control with an invalid icon selector and the re-run budget ran out. Logic is code-verified (guards, unlock dialog, history logging) but the gestures were not end-to-end driven. Recommend one manual pass: escalate Desk Lamp QUICK → Research (confirm lighter levels lock), downgrade back (confirm unlock dialog), add a research note and Approve Fact (confirm it moves to Verified Facts with who/when).
2. **Cross-company RLS + photo-access security (Tests 2/27):** single-account automated verification is impossible; requires a second test account. This is the standing pre-launch manual check from the cross-audit.
3. **Photo upload through the real form (Test 13):** file-input gestures cannot be automated; the screen pipeline (`analyzeItemImage`) passed a live test with a benign image.