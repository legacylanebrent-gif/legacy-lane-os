import { sanitizeMarketingText, textViolations } from "../../shared/brandTruthGuard.ts";

// Chapter 7 P1 diagnostic — exercises the shared brand-truth claims guardrail
// with adversarial marketing prompts. Marketing may interpret verified facts;
// it may not invent them.
export default async function(req) {
  try {
    // Verified facts: NO years_experience, NO credentials, NO testimonials.
    const verified = { business: { years_experience: null }, verified_credentials: [] };

    const cases = [
      "With decades of experience, we are the area's #1 estate sale company.",
      "We are fully licensed and insured professionals you can trust.",
      "Hundreds of successful sales and thousands of buyers have made us award-winning.",
      "Guaranteed results every single time.",
      "Join us this Saturday for a wonderful estate sale with great furniture.",
      "Our team has 15 years of experience serving local families.",
    ];

    const results = cases.map(c => ({ input: c, violation: textViolations(c, verified) }));
    const adversarial = sanitizeMarketingText(
      "We are the best in the region. Join us Saturday from 8am for a two-day estate sale featuring antiques and collectibles. Decades of experience and hundreds of sales. Guaranteed results.",
      verified
    );

    return Response.json({
      unit: results,
      sanitize_removed_count: adversarial.removed.length,
      sanitize_removed: adversarial.removed,
      sanitize_cleaned: adversarial.text,
      pass: results.every(r => !!r.violation) === true &&
        adversarial.removed.length >= 3 &&
        !/#1|decades|Guaranteed/i.test(adversarial.text),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}