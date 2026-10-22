// Chapter 22 P0/P1 — shared transition disposition guards.
// Pure helpers reused by setItemDisposition, setTransitionEventScope,
// completeTransitionEvent, and approveTransitionCompletion so the protection
// and client-authority rules are enforced identically at every write seam.

export const DISPOSITION_OUTCOMES = ["RESELL", "SPECIALIST", "BUYOUT", "DONATE", "CLEANOUT", "CLIENT_RETAINS", "DISPOSE", "DECISION_REQUIRED"];

// Consequential outcomes REQUIRE a client-authorized SaleClientDecision.
// RESELL and DECISION_REQUIRED are routing states, not property-altering outcomes.
export const CONSEQUENTIAL_OUTCOMES = ["SPECIALIST", "BUYOUT", "DONATE", "CLEANOUT", "CLIENT_RETAINS", "DISPOSE"];

// PROTECTED MERCHANDISE — structural guard (P0-4). Free text may explain a
// disposition; free text must never be the only thing preventing the wrong
// item from leaving the property.
export function dispositionProtectionReason(item) {
  if (item.status === "sold") {
    return item.pickup_completed_at
      ? "This merchandise is SOLD and fully released — its disposition is complete."
      : "SOLD / paid merchandise awaiting buyer pickup is PROTECTED merchandise and cannot be dispositioned; release it to the buyer through the canonical release path.";
  }
  if (item.offsite_research && item.offsite_research.status === "OFFSITE") {
    return "This merchandise is in SPECIALIST CUSTODY (offsite) and is protected until it is returned or resolved.";
  }
  const d = item.post_sale_disposition || {};
  if (d.resolved_at) {
    return "This merchandise's disposition is already resolved — it has its ending.";
  }
  if (d.outcome === "CLIENT_RETAINS" && d.decision_id) {
    return "This merchandise is CLIENT-RETAINED under an authoritative client decision — it is protected until an authoritative decision changes.";
  }
  return null;
}

// Client authority check (P0-5). An unapproved client REQUEST is never
// authorization; a decision with no recorded history entry has no authorized
// decision-maker. Returns { error } or { lastHistory }.
export function validateDecisionAuthority(decision, saleId) {
  if (!decision) return { error: "Client decision not found." };
  if (decision.sale_id !== saleId) return { error: "The decision does not belong to this sale." };
  if (["REQUESTED", "UNDER_REVIEW"].includes(decision.request_status)) {
    return { error: "A pending client request is not authorization — approve the request first." };
  }
  const history = decision.history || [];
  if (!history.length) return { error: "The decision has no recorded authorized instruction (no history entry)." };
  const last = history[history.length - 1];
  if (!last || !last.authorized_by) return { error: "The decision's controlling instruction has no authorized decision-maker." };
  return { lastHistory: last };
}