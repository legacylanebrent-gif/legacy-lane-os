// Chapter 8 P1 — lightweight operational task TEMPLATES executed through the
// existing SaleTask system. Deliberately NOT a second checklist engine: these
// are just suggested SaleTask records. Security completion means CHECKLIST
// REVIEWED — never a safety/security/compliance certification.

export const CHECKLIST_TEMPLATES = {
  LOAD_OUT: {
    label: 'Load Out',
    tasks: [
      { name: 'Load Out: Project the standard sale kit', description: 'Confirm the sale equipment list matches the standard kit plus any sale-specific additions before loading.', category: 'Execution' },
      { name: 'Load Out: Pack reusable equipment', description: 'Pack tables, racks, checkout device, cords and signs; mark each entry packed as it goes on the truck.', category: 'Execution' },
      { name: 'Load Out: Confirm consumables', description: 'Confirm price labels, tape, markers and bags are sufficient for this sale.', category: 'Execution' },
      { name: 'Load Out: Verify nothing forgotten', description: 'Walk the equipment list once more before departing for the property.', category: 'Execution' },
    ],
  },
  PACK_OUT: {
    label: 'Pack Out',
    tasks: [
      { name: 'Pack Out: Collect all company equipment', description: 'Walk the property and collect tables, racks, checkout device, cords and signs.', category: 'Post-Sale' },
      { name: 'Pack Out: Record an ending for every asset', description: 'Mark each equipment entry Returned, Damaged, Missing, or Left Intentionally — every company asset that leaves should have an ending.', category: 'Post-Sale' },
      { name: 'Pack Out: Flag restock needs', description: 'Mark consumables that need restocking (labels, tape, markers, bags) and note the restock task.', category: 'Post-Sale' },
      { name: 'Pack Out: Final walkthrough of the property', description: 'Confirm no company equipment or merchandise remains on site.', category: 'Post-Sale' },
    ],
  },
  SECURITY_WALKTHROUGH: {
    label: 'Security Walkthrough',
    tasks: [
      { name: 'Security: Entrances and exits reviewed', description: 'Walk entrances and exits; note where buyer traffic will flow. Completion means checklist reviewed — not a security certification.', category: 'Preparation' },
      { name: 'Security: Restricted areas identified', description: 'Identify rooms/areas that are off-limits and mark them (signs, barriers) before opening.', category: 'Preparation' },
      { name: 'Security: Checkout location chosen', description: 'Choose the checkout spot with sightlines to high-traffic display areas.', category: 'Preparation' },
      { name: 'Security: High-value items reviewed', description: 'Review items marked High Value or Controlled Display and decide how they are displayed/handled during the sale.', category: 'Preparation' },
      { name: 'Security: Sold-item area considered', description: 'Decide where paid merchandise waits for pickup so it is not re-sold or moved.', category: 'Preparation' },
      { name: 'Security: Pickup area considered', description: 'Designate the pickup area and how buyers get heavy items out.', category: 'Preparation' },
      { name: 'Security: Staff visibility considered', description: 'Confirm staffing so key areas (checkout, high-value display, entrances) are visible to the team.', category: 'Preparation' },
    ],
  },
  CHECKOUT_SETUP: {
    label: 'Checkout Setup',
    tasks: [
      { name: 'Checkout Setup: Location ready', description: 'Set up the checkout table with clear buyer access and queue space.', category: 'Execution' },
      { name: 'Checkout Setup: Device ready', description: 'Confirm the checkout device/scanner is charged, connected and tested before opening.', category: 'Execution' },
      { name: 'Checkout Setup: Payment methods confirmed', description: 'Confirm which payment methods are accepted for this sale (cash, card, Venmo/Zelle, check) and that signs match.', category: 'Execution' },
      { name: 'Checkout Setup: Cash procedure reviewed', description: 'Review the cash box arrangement and change fund with the team.', category: 'Execution' },
      { name: 'Checkout Setup: Sold-item process reviewed', description: 'Brief the team on marking items sold and where paid merchandise waits.', category: 'Execution' },
      { name: 'Checkout Setup: Pickup process reviewed', description: 'Brief the team on large-item pickup and the pickup area.', category: 'Execution' },
      { name: 'Checkout Setup: Signage ready', description: 'Place checkout, payment and pickup signs before buyers arrive.', category: 'Execution' },
    ],
  },
  // Chapter 14 P1-39 — property protection concerns (reviewed, never a condition certification).
  PROPERTY_PROTECTION: {
    label: 'Property Protection',
    tasks: [
      { name: 'Property Protection: Floors protected', description: 'Protect floors in high-traffic and heavy-item routes (runners, mats, cardboard) before prep and sale traffic. Review means checked — not a condition certification.', category: 'Preparation' },
      { name: 'Property Protection: Walls and doorways reviewed', description: 'Walk the large-item removal routes; mark tight doorways/corners and protect trim where needed.', category: 'Preparation' },
      { name: 'Property Protection: Stairs and railings reviewed', description: 'Review stairs/railings on the removal path and note where extra care or a second person is needed.', category: 'Preparation' },
      { name: 'Property Protection: Landscaping and exterior reviewed', description: 'Check walkways, plantings and exterior paths buyers and movers will use.', category: 'Preparation' },
      { name: 'Property Protection: Architectural features noted', description: 'Note built-ins, fixtures, or features that must not be damaged or removed from the sale.', category: 'Preparation' },
      { name: 'Property Protection: Large-item removal concerns recorded', description: 'Record removal routes and special concerns on the prep zones / pickup plan.', category: 'Preparation' },
    ],
  },
};