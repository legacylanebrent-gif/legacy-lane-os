// Referral Rebuild — Phase 1 shared control.
//
// THE ONE centrally enforced switch for the LEGACY real-estate referral
// compensation program (Houszu / "Legacy Lane" wallet credits: 30% of
// referral_amount_due_to_brent, 10-day hold, withdrawals).
//
// Phase 1 doctrine:
//   - Default DISABLED. Every server entry point that could create, release,
//     or pay legacy referral compensation MUST check this flag BEFORE any
//     write, regardless of UI state. Hiding buttons is never the control.
//   - Existing records, balances, agreements, and history are PRESERVED —
//     this control only stops NEW accruals and payouts.
//   - Closing information that can be safely recorded is recorded
//     informationally (no monetary entitlement); an event that cannot be
//     recorded gets an explicit NON-SUCCESS response so the sender retries —
//     an unrecorded event is never acknowledged as processed.
//
// This file is documentation of an operational state, not a legal conclusion.
export const LEGACY_REFERRAL_COMPENSATION_ENABLED = false;

export const LEGACY_COMPENSATION_PAUSED_CODE = 'legacy_referral_compensation_paused';

export const LEGACY_COMPENSATION_PAUSED_MESSAGE =
  'Legacy referral compensation is paused. New credits, releases, and withdrawals from the legacy Houszu/Legacy Lane referral program are disabled while the referral eligibility system is rebuilt. Existing records, agreements, and history are preserved.';