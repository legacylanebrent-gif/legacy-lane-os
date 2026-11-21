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
      { name: 'Security: Entrances and exits reviewed', description: 'Walk the doors and note where buyers will come in and out.', category: 'Preparation' },
      { name: 'Security: Restricted areas identified', description: 'Mark the rooms that are off-limits with signs or a barrier.', category: 'Preparation' },
      { name: 'Security: Checkout location chosen', description: 'Pick a checkout spot where you can see the busy areas.', category: 'Preparation' },
      { name: 'Security: High-value items reviewed', description: 'Decide how the expensive items are displayed and watched.', category: 'Preparation' },
      { name: 'Security: Sold-item area considered', description: 'Pick where paid items wait for pickup so they are not sold twice.', category: 'Preparation' },
      { name: 'Security: Pickup area considered', description: 'Set the pickup spot and how heavy items get out.', category: 'Preparation' },
      { name: 'Security: Staff visibility considered', description: 'Make sure someone is watching checkout, high-value items and the door.', category: 'Preparation' },
    ],
  },
  CHECKOUT_SETUP: {
    label: 'Checkout Setup',
    tasks: [
      { name: 'Checkout Setup: Location ready', description: 'Set up the checkout table with room for a line.', category: 'Execution' },
      { name: 'Checkout Setup: Device ready', description: 'Charge, connect and test the phone or scanner before opening.', category: 'Execution' },
      { name: 'Checkout Setup: Payment methods confirmed', description: 'Agree what you take (cash, card, Venmo/Zelle, check) and match the signs.', category: 'Execution' },
      { name: 'Checkout Setup: Cash procedure reviewed', description: 'Walk the team through the cash box and the change you start with.', category: 'Execution' },
      { name: 'Checkout Setup: Sold-item process reviewed', description: 'Show the team how items get marked sold and where they wait.', category: 'Execution' },
      { name: 'Checkout Setup: Pickup process reviewed', description: 'Tell the team how big items are picked up and where.', category: 'Execution' },
      { name: 'Checkout Setup: Signage ready', description: 'Put up the checkout, payment and pickup signs before the doors open.', category: 'Execution' },
    ],
  },
  // Chapter 14 P1-39 — property protection concerns (reviewed, never a condition certification).
  PROPERTY_PROTECTION: {
    label: 'Property Protection',
    tasks: [
      { name: 'Property Protection: Floors protected', description: 'Put runners, mats or cardboard on the floors people and heavy items will cross.', category: 'Preparation' },
      { name: 'Property Protection: Walls and doorways reviewed', description: 'Walk the path big items take and protect tight corners and trim.', category: 'Preparation' },
      { name: 'Property Protection: Stairs and railings reviewed', description: 'Check the stairs on that path and note where you need a second person.', category: 'Preparation' },
      { name: 'Property Protection: Landscaping and exterior reviewed', description: 'Check the walkways and outside paths buyers and movers use.', category: 'Preparation' },
      { name: 'Property Protection: Architectural features noted', description: 'Note anything built in that must not be damaged or sold.', category: 'Preparation' },
      { name: 'Property Protection: Large-item removal concerns recorded', description: 'Write down how big items leave and any tight spots.', category: 'Preparation' },
    ],
  },
};