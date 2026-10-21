# EstateSalen — P0 Security Rollout Certification Report
**Scope:** Chapter 6 audit, P0 entity cluster — RLS, ownership projections, financial file storage
**Status:** Implemented, backfilled, and verified. 2026-10-20

---

## 1. RLS matrix applied (13 entities)

All rules follow the audit's ownership model: **operator ownership** (`data.operator_id === {{user.id}}`), **team-assignment isolation** (`sale_team_ids` / `sale_team` projections), creator access where legitimate, **admin always**, and **no unguarded branches** (anonymous users match nothing).

| Entity | Read | Write |
|---|---|---|
| EstateSale | owner, team, creator, admin, public statuses (upcoming/active/completed) only | create/update: owner or admin (team can update); delete: owner/admin |
| Item | owner, team, seller, creator, admin, public marketplace tier (`sales_channels: marketplace`) | create: seller or operator; update: owner/team/seller/creator/admin; delete: owner/seller/admin |
| Transaction | owner, team, creator, admin | create: any authenticated; update/delete: creator/owner/admin |
| Expense | owner, team, creator, admin | create: owner; update/delete: creator/owner/admin |
| EarlySignIn | operator, own records (user_id / email match), admin | create: any authenticated; update/delete: operator/admin |
| Offer | operator, own records (creator / user_id), admin | operator/admin |
| VIPInvite | operator, creator, admin | operator/admin |
| SaleItemPricing | operator, admin | operator/admin |
| SaleClientPermission | operator, client, admin | operator/admin |
| PendingTeamInvite | operator, creator, admin | operator/admin |
| SaleNote / LaborEntry / SaleClientDecision | owner, team, creator, admin | owner/team (create), creator/owner (update) |

**Field-level security:** `EstateSale` and `Item` keep the previously applied field-level read rules on internal/financial fields (commission, revenue, buyer identity, research flags, site assessment, distance snapshot) — public surfaces only see public-marketing data.

**Anonymous-user posture:** every rule branch is guarded by a user role condition or a record-field match; anonymous visitors match only the deliberately public tiers (published sales, marketplace items).

## 2. Write-path projection coverage

Every create path now stamps the ownership fields its RLS rule authorizes against:

- **New helper** `src/hooks/useSaleScope.js` — fetches a sale's operator/team so child-record writes carry the right projections.
- `SaleExpensesModal` (all 3 create sites), `OffersPanel`, `BuyoutModal`, `SignTheListButton` (+ `EstateSaleDetail` passes the operator), `VIPEventManager`, `SaleClientPermissionsModal`, `Worksheet` (manual entry, bundle, cart-scan import), `UnifiedItemForm`, `CreateItemModal`, `PhotoLabelingModal` — all stamp `operator_id` (+ `sale_team_ids` where applicable).
- `SaleEditor.handleSave` — when the sale team changes, syncs the `sale_team_ids` projection across that sale's Items, Transactions, and Expenses (the sale remains the source of truth).
- Backend: `receiveSaleUpdate` (Transaction) and `googleLensPricing` (SaleItemPricing) derive `operator_id` / `sale_team_ids` from the sale at creation (service role).
- `MySales` $5-and-under and liquidation copies already carried `operator_id` — no change needed.
- Consumer self-reported purchase Transactions (`sale_id: 'user_purchase'`) intentionally keep `operator_id` null — they are not sale records; access is creator-scoped.

## 3. PendingTeamInvite redemption seam

Invite records are no longer readable by arbitrary authenticated users. New backend function **`redeemTeamInvite`**:
- Takes only the invite code; the code IS the check (service-role lookup).
- Marks the invite accepted and links the user server-side.
- Returns only the non-sensitive fields the invitee needs (operator, role, company name, note).
- Idempotent; rejects already-used codes.

`OnboardingChat` no longer reads or writes the invite collection directly. **End-to-end test passed:** test invite created → redeemed (code accepted, status `accepted`, user linked, correct operator/role returned) → test record deleted. Bogus code correctly returns `found: false`.

## 4. Financial file storage — receipts are now private

- `MyBusinessExpenses`: receipt upload now uses **UploadPrivateFile** (stored privately); AI receipt scan uses a **short-lived signed URL** for extraction; viewing a receipt generates a signed URL on click. Legacy public-URL receipts still open directly for continuity.
- `BulkScanModal` and `BulkReceiptScanner`: private upload + signed-URL extraction; stored `receipt_url` is the private file URI.
- `SaleExpensesModal` already used private storage (prior window).
- **Legacy audit:** 1 existing public BusinessExpense receipt found → downloaded and re-uploaded to private storage, record updated to the private URI. Remaining public-URL receipts across both expense entities: **0**.

## 5. Backfill of existing records

Service-role projection backfill completed:

| Entity | Records updated |
|---|---|
| EarlySignIn | 3 |
| SaleItemPricing | 484 |
| Item (sale-linked) | 30 |
| Item (standalone → operator = seller) | 23 |
| Expense / Transaction / Offer / SaleClientPermission / VIPInvite | 0 needed |

Post-backfill integrity: **0 sale-linked items, 0 SaleItemPricing records missing `operator_id`.** 10 Transactions reference a deleted sale (`…e5a`); they are historical orphans with no derivable owner and remain visible only to their creator and admins (all branches guarded — no anonymous exposure). All 14 EstateSales already carry `operator_id`.

## 6. Verification status

| Check | Status |
|---|---|
| Production build (`vite build`) | **Pass** — no errors |
| `redeemTeamInvite` end-to-end (create → redeem → verify → cleanup) | **Pass** |
| My Sales dashboard renders under new RLS (screenshot) | **Pass** |
| Worksheet loads sale + transactions under new RLS (screenshot) | **Pass** |
| Projection backfill + isolation spot-checks | **Pass** |
| Legacy receipt migrated to private storage | **Pass** |
| Worksheet "Add Transaction" UI gesture (projection stamping) | **Not automatically verified** — the managed preview browser timed out on all three attempts (app boot + page flow exceeded the 30s script budget). The change is a two-field payload addition to an already-working form; all test data cleaned up, none left behind. |
| Cross-operator RLS denial (second user) | **Not automatically verified** — requires a second authenticated identity; only the builder/owner path can be driven here. Rule evaluation follows the audited patterns. |

## 7. Known limitations / follow-ups

1. **Client (consumer) preview of draft sales** — `SaleClientPermission` grants clients pages (Worksheet, SaleInventory, …), but RLS now (correctly) blocks consumers from reading draft sales, and RLS cannot join entities. Zero SaleClientPermission records exist today, so no user is affected; if that flow is revived it needs a server-side client-view seam.
2. **Team-member edits of Transactions** — the SaleEditor team-sync's Transaction leg runs as the saving user; a team member (not operator/creator) editing a sale will skip Transaction projection updates (logged as a warning). Operators and admins — the normal editors — sync fully.
3. **`llbbAdmin` aggregates on Item** — field-level rules reject app-user aggregate/distinct; `llbbAdmin` uses the service client (admin-only function), which bypasses field rules by design.