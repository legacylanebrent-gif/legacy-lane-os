// Chapter 13 P1 — the standard onboarding task template used by the
// activateSale backend function when an accepted opportunity becomes an
// active project (P1-10: idempotent, no duplicate template on repeated
// activation). The 15 steps mirror the canonical Chapter 1 SaleTasks
// template (source seam: src/pages/SaleTasks.jsx DEFAULT_TASKS — kept in
// deliberate sync, same names/descriptions), plus the Final Property
// Walkthrough scheduling step (P1-57, reuses the same SaleTask substrate —
// no second closeout checklist).
export const ACTIVATION_TASKS = [
  { name: 'Initial Client Meeting', description: 'Meet with client to discuss estate sale needs and timeline', category: 'Planning' },
  { name: 'Sign Contract', description: 'Review and sign estate sale agreement with client', category: 'Planning' },
  { name: 'Property Walkthrough', description: 'Conduct detailed walkthrough and inventory of items', category: 'Planning' },
  { name: 'Sensitive Material Review', description: 'STOP — before photographing or cataloging contents, separate documents, IDs, medications, financial information, private photos, and other sensitive material for operator/client review. Do not catalog or photograph sensitive material.', category: 'Preparation' },
  { name: 'Research & Pricing', description: 'Research item values and set pricing strategy', category: 'Preparation' },
  { name: 'Item Sorting & Organization', description: 'Sort, organize, and stage items for sale', category: 'Preparation' },
  { name: 'Photography & Listing', description: 'Take photos and create online listings', category: 'Marketing' },
  { name: 'Marketing & Advertising', description: 'Promote sale through various channels', category: 'Marketing' },
  { name: 'Signage & Directional Signs', description: 'Create and place directional signs', category: 'Marketing' },
  { name: 'Setup & Staging', description: 'Final staging and setup of sale space', category: 'Execution' },
  { name: 'Staff Coordination', description: 'Coordinate and brief sale day staff', category: 'Execution' },
  { name: 'Sale Day Operations', description: 'Manage sale day activities and transactions', category: 'Execution' },
  { name: 'Breakdown & Cleanup', description: 'Remove unsold items and clean property', category: 'Post-Sale' },
  { name: 'Donation Coordination', description: 'Arrange pickup/delivery of unsold items', category: 'Post-Sale' },
  { name: 'Final Accounting', description: 'Calculate totals and prepare financial report', category: 'Post-Sale' },
  { name: 'Payment to Client', description: 'Process and deliver payment to client', category: 'Post-Sale' },
  { name: 'Final Property Walkthrough', description: 'Walk the property with the client/family at the end: confirm merchandise removed, retained items handled, excluded areas resolved, and the property left as agreed. Reuses the same closeout checklist architecture — this task is the scheduling anchor.', category: 'Post-Sale' },
];