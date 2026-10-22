# Chapter 22 P0/P1 — Transition Completion Certification Report

Date: 2026-10-22 · Method: dedicated certification fixtures (30 items, 3 sales, 3 donations, 2 cleanouts, 8 decisions, 1 authority, 1 equipment) exercised through the sanctioned backend paths and the real Transition Completion UI. All fixtures deleted; zero residue verified.

## P0 — Certification results

| # | Requirement | Result | Evidence |
|---|---|---|---|
| P0-1 | Company isolation RLS on Donation, DonationResponse, Cleanout, CleanoutBid, CleanoutVendorProfile; admin-only CleanoutLead; Vendor directory-safe | PASS (rules live + deployed) | Entity RLS rules shipped; operator/owner positive paths proven by every operation above; seller PII fields locked to operator/admin with the narrow published/awarded provider window |
| P0-2 | Canonical sale_id link on Donation/Cleanout; legacy address-only records unresolved | PASS | Backfill matched the unambiguous case; the ambiguous pair (Legacy Unique Cleanout vs Legacy Ambiguous Donation, two sales same address) was left UNRESOLVED by design — no guessing |
| P0-3 | Item-level post_sale_disposition block; no second disposition entity | PASS | Written only via setItemDisposition; additive on existing Item |
| P0-4 | Sold/paid/awaiting-pickup merchandise protected from removal scope | PASS | Cleanout scope attempt with 2 sold items → rejected; pickup releases via recordItemRelease only |
| P0-5 | Client-retained, specialist-custody, sensitive/controlled merchandise protected | PASS | Retained items rejected from cleanout scope; sensitive box rejectable only into CLIENT_RETAINS with its own authorized decision |
| P0-6 | Excluded/protected lists structural; free text cannot replace | PASS | setTransitionEventScope enforces included/excluded IDs; free-text scope_description advisory only |
| P0-7 | Cleanout scope = exact approved item list, client-authorized | PASS | Scope write requires decision_id; unauthorized load rejected 409 |
| P0-8 | Donation load = exact approved items | PASS | 7-item DONATE load set; donation company cannot convert items by pickup |
| P0-9 | Buyout award with client decision, structural item list, transfer recording | PASS | No-decision buyout blocked; award → transfer → 2 items resolved; excluded piano remained protected and needed its own disposition |

## P1 — Certification results

| # | Requirement | Result | Evidence |
|---|---|---|---|
| P1-1 | Provider-work ≠ done: cleanout completion requires operator verification | PASS | Provider-complete without operator_verified → 409; verified path → completed |
| P1-2 | Donation acceptance of THIS load (directory interest is never acceptance) | PASS | NOT_CHECKED acceptance blocked completion with inline UI error; ACCEPTED → completed |
| P1-3 | Family pickup = named collector, no broader client authority | PASS | 6 family releases via recordItemRelease; collector gains nothing |
| P1-4 | Family/final walkthrough human confirmations + exception reasons | PASS (after fix) | 2 areas confirmed; exception reason persisted; staleness bug fixed (controlled state) and re-verified |
| P1-5 | Nothing-leftover rule: remaining tracked items need disposition/reason | PASS | Unrouted piano surfaced as blocker until dispositioned; 25-item trace: 25/25 accounted, 0 anonymous |
| P1-6 | Walkthrough-driven completion gate | PASS | Walkthrough blocker held approval until completed |
| P1-7 | Buyout transfer recording resolves included items | PASS | transferred_at written; 2 items resolved |
| P1-8 | Open obligations gate approval | PASS | 10-blocker NOT READY (pickups, donation, buyout, dispositions, decisions, retained-at-property, equipment pack-out, walkthrough) → each cleared progressively → READY |
| P1-9 | SALE COMPLETE ≠ TRANSITION COMPLETE | PASS | States rendered independently (SALE COMPLETE / SETTLEMENT OPEN / TRANSITION OPEN → COMPLETE) |
| P1-10 | Objective/deadline/standard planning inputs; UNKNOWN honest | PASS | Clear-property objective, real-estate-closing deadline, PROPERTY_CLEARED standard |

## UI certification
- Full flow driven in the live app: blockers list → disposition dialog → family release dialog → donation completion dialog (acceptance guard fired inline) → buyout transfer → walkthrough confirm + exception → **TRANSITION COMPLETE**, verified persisted via SDK read (transition_completed_at, completed_by_name, walkthrough completed_at, exception note preserved).
- Page renders responsively; mobile 390px-class viewport: **0px horizontal overflow**; cards stack vertically.
- Walkthrough exception-reason bug found and fixed: confirm could drop a just-typed reason (stale closure). Fixed with controlled state; re-verified live.
- No console errors attributable to the new pages.

## Not automatically verified (manual pre-launch)
- **Cross-company RLS denial with a real second user** (a second operator reading Donation/Cleanout records): requires a second account; cannot be exercised in the builder session. Rules are deployed; recommend one manual check before launch.
- radix Select dropdown automation (keyboard-driven native interaction works; the automation gesture itself was flaky) — dialog logic verified via the same backend path and the inline acceptance guard was captured on screen.