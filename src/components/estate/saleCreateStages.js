// The four stages of the Create Estate Sale form, described so the AI coach can
// explain exactly one stage at a time (and walk through all four in order).
export const SALE_CREATE_STAGES = [
  {
    key: 'basic_info',
    step: 1,
    label: 'Basic Info',
    contents: [
      'Sale Title — the public name buyers see in search and on the listing card',
      'Property Address — street, city, state and ZIP; the street is chosen from address suggestions',
      'Sale Area/Region — the market area used for local promotion and listings',
    ],
    requirement: 'Title, street, city, state and sale area/region must all be filled in before Continue to Schedule works.',
  },
  {
    key: 'schedule',
    step: 2,
    label: 'Schedule',
    contents: [
      'One sale date at a time, each with a start time and end time',
      'Every added date appears in a list below and can be removed',
      'Several dates can be added for a multi-day sale',
    ],
    requirement: 'At least one sale date is required before Continue to Media works.',
  },
  {
    key: 'media',
    step: 3,
    label: 'Media',
    contents: [
      'Thumbnails tab — take photos with the camera or upload files; drag to reorder, click a photo to select it',
      'The sparkles button on a photo runs AI label and price for that photo',
      'Details & Pricing tab — edit each photo title, description and price; select several photos for Bulk Edit',
      'Photos drive the public gallery, the marketing kit and buyer interest, so the best items deserve a clean, well-lit photo',
    ],
    requirement: 'Photos are optional here, but a sale with no photos is hard for buyers to evaluate.',
  },
  {
    key: 'details',
    step: 4,
    label: 'Details',
    contents: [
      'Description — write it or use AI Generate to draft it from the title, address and photos',
      'Categories, Estimated Total Value and Commission Rate',
      'Payment methods, Parking Information and Special Notes shown to attendees',
      'Early Sign-In List toggle, Assign Client details and one-time Featured Listing add-ons',
      'Publish Now makes the sale public; Save as Draft keeps it private',
    ],
    requirement: 'The sale can be published from this step at any time.',
  },
];

export const STAGE_AI_SYSTEM = `You are a calm, practical coach helping someone who is creating their first estate sale listing on EstateSalen.
Speak plainly and use their language, not developer language. Never mention software fields as "inputs" or "state".
Never invent platform features that were not described to you.`;

export function stagePrompt(stage) {
  return `${STAGE_AI_SYSTEM}

The operator is on step ${stage.step} of 4 — "${stage.label}" — of the Create Estate Sale form.

What this step actually contains:
- ${stage.contents.join('\n- ')}
Rule for moving on: ${stage.requirement}

Explain ONLY this step, in this JSON shape:
- headline: a short reassuring title for this step (6 words or fewer)
- what_it_is: 2-3 sentences on what this step is for and why it matters
- do_this: 3 to 5 short imperative steps the operator should take right now
- watch_out: one sentence on the most common mistake people make on this step

Do not describe the other three steps at all.`;
}

export const STAGE_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    what_it_is: { type: 'string' },
    do_this: { type: 'array', items: { type: 'string' } },
    watch_out: { type: 'string' },
  },
};

export function walkthroughPrompt() {
  return `${STAGE_AI_SYSTEM}

Walk a brand-new operator through all four steps of the Create Estate Sale form, in order.

${SALE_CREATE_STAGES.map(
    (s) => `Step ${s.step} — ${s.label}
- ${s.contents.join('\n- ')}
- Rule: ${s.requirement}`
  ).join('\n\n')}

Return JSON with a "stages" array of exactly 4 items, one per step in order:
- step: 1, 2, 3 or 4
- headline: short title for the step (6 words or fewer)
- what_happens: 2-3 sentences on what the operator does on this step
- do_this: 3 to 5 short imperative steps
- watch_out: one sentence on the most common mistake on this step

Keep every sentence short and friendly. No legal or tax advice.`;
}

export const WALKTHROUGH_SCHEMA = {
  type: 'object',
  properties: {
    stages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'integer' },
          headline: { type: 'string' },
          what_happens: { type: 'string' },
          do_this: { type: 'array', items: { type: 'string' } },
          watch_out: { type: 'string' },
        },
      },
    },
  },
};