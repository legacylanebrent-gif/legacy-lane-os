# ESTATESALEN — PHASE 2.5 CERTIFICATION (CONTROLLED)

Date: 2026-11-09 · Scope: verify Phase 2 without rebuilding it · Mode: automated/isolated only

## Hard blocker first

**No genuine guest account exists.** A service-role count of users with `primary_account_type = diy_seller` returned **0**. I cannot create User records (invite-only) and cannot obtain a sign-in session for another person, so no test could be run *as* a guest. **No real charge was initiated** — authorization was not given. Therefore every guest-identity item below is NOT TESTED, not "passed".

## Results

| Item | Result | Basis |
| --- | --- | --- |
| Real guest checkout ($147) | **NOT TESTED** | No guest account; no charge authorization |
| Payment verification (server) | **NOT TESTED** | Requires a real approved order; unsigned webhook fail-closed was re-confirmed (401 Invalid signature) |
| Entitlement creation | **NOT TESTED** (real payment) | Grant path code-verified only |
| First sale publishing | **NOT TESTED** as guest | Operator/subscription path PASS (automated) |
| AI allowance | **PASS** | Controlled allowance of 2 on isolated fixtures |
| Guest operational permissions | **NOT TESTED** | Needs guest session |
| Sale closeout | **PASS** | Isolated sale → completed via canonical transition |
| Historical access | **PASS** | Completed sale remained readable |
| Second-sale refusal | **NOT TESTED** | Needs guest session |
| Second payment + publication | **NOT TESTED** | Needs guest session + charge |
| Featured placement checkout | **NOT TESTED** (live) | Owner/duplicate/ended-weekend guards verified in code only |
| Featured placement visibility | **PASS** (structural) | Real ordering/sections exist (see below) |
| Placement expiration | **PASS** | Entitlement `expired`, sale flag cleared, audit entry |
| Operator regression | **PASS** (automated) | Publish via subscription; guest rules confined to `diy_seller` |

## AI allowance — what was actually executed

Isolated sale + bound entitlement with allowance temporarily set to **2** (production constant 60 never touched; no customer record altered; all fixtures deleted afterwards).

- Two successful descriptions: persisted text produced, counter 2/2, internal cost tracked ($0.04).
- Third run with a photo still pending: returned `allowance_exhausted`, remaining 0, photo left **unprocessed**, and **no model call** (search-credit counter unchanged).
- Hard failure (photo with no image): failed with "Invalid file attachment", counter stayed **0**.
- **Finding:** an unreadable image URL that makes the model return a placeholder ("Error reading image") still **consumed 1**. The rule is "count only descriptions produced and persisted", and that produced one — but from a customer's point of view a broken photo costs a unit. Worth a decision, not a bug in the tested rule.
- Production allowance confirmed at **60** from the single constant used when a package is created, enforced by the same gate proven above.

## Featured placement — audit correction

My earlier note that placements get no visibility benefit was **wrong**. Ordering already depends on the flags:

- Home: separate national and local featured sections above the regular grid.
- Mobile home: national → local → regular ordering.
- Estate Sale Finder: local featured separated within county/region results.
- Sale detail and favorites: featured badges.

No impression, click or traffic metrics exist anywhere, so no ranking or traffic claim can be made. Placement checkout stays available because the advertised behaviour is real; nothing promises volume.

## Gap found and fixed

A completed sale could be **reopened**: `unpublish` set it back to `draft`, which then allowed `publish` (reproduced: completed → draft → upcoming). Added the missing guard. Re-verified against the current function code: unpublish → `completed_sale_cannot_be_reopened`, publish → `completed_sale_cannot_be_republished`, status stayed `completed`, history still readable. Fixtures removed.

## Verdict

Phase 3 must not start. Production readiness is **not** declared: no guest checkout, payment verification, guest permissions, or second-sale refusal has been genuinely exercised. What remains is one real guest run (pay → publish → operate → close → refuse second sale → buy again → publish), which needs a `diy_seller` account to exist and explicit authorization to charge $147.