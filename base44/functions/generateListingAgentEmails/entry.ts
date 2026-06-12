import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai@4.86.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const body = await req.json().catch(() => ({}));
    const { listing_ids, batch_id } = body;

    let allListings;
    if (batch_id) {
      allListings = await base44.asServiceRole.entities.PropstreamREListing.filter({ import_batch_id: batch_id }, '-estate_sale_score', 500);
    } else {
      allListings = await base44.asServiceRole.entities.PropstreamREListing.list('-estate_sale_score', 2000);
    }

    let toProcess;
    if (listing_ids && listing_ids.length > 0) {
      const idSet = new Set(listing_ids);
      toProcess = allListings.filter(l => idSet.has(l.id)).slice(0, 50);
    } else {
      toProcess = allListings.filter(l => l.listing_agent_email && l.email_status === 'draft').slice(0, 25);
    }

    let generated = 0;
    for (const listing of toProcess) {
      try {
        const agentFirst = (listing.listing_agent_name || 'there').split(' ')[0];
        const address = `${listing.property_address}, ${listing.city}, ${listing.state} ${listing.zip}`;
        const scoreContext = listing.score_reasons?.length
          ? `Key opportunity signals: ${listing.score_reasons.slice(0, 4).join('; ')}`
          : '';

        const prompt = `Write a professional, personalized real estate outreach email from Brent Cramp at EstateSalen.com to a listing agent named ${agentFirst} (${listing.listing_agent_name || 'Agent'}) at ${listing.listing_brokerage || 'their brokerage'}.

Property: ${address}
Estate Sale Opportunity Score: ${listing.estate_sale_score} / 100 (${listing.estate_sale_score_label})
${scoreContext}
Ownership: ${listing.ownership_length_years ? listing.ownership_length_years + ' years' : 'unknown'}
Vacant: ${listing.vacant ? 'Yes' : 'No'}
Senior Owner: ${listing.senior_owner_indicator ? 'Yes' : 'No'}
Probate: ${listing.probate_indicator ? 'Yes' : 'No'}

EMAIL GOAL: Ask if the seller may need help with an estate sale, downsizing sale, moving sale, or cleanout before closing.

STRUCTURE:
- Hi ${agentFirst},
- Reference the listing naturally
- Explain many sellers need help with contents (especially long-time owners, downsizers, estates)
- Introduce EstateSalen as the connection to local estate sale companies
- Briefly explain what estate sale companies do
- Ask if their seller may benefit
- Softly introduce agent referral program (Estate Sale Company Owners meet sellers before listing, can refer future leads to agent partners - no upfront cost, referral fee only at closing)
- Clear CTA
- Sign off: Best, Brent Cramp / EstateSalen.com

Tone: Professional, warm, helpful, not salesy. 4-6 short paragraphs.

Return JSON with exactly these two fields: "subject" and "body"`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a professional real estate email copywriter. Return only valid JSON with "subject" and "body" fields.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        await base44.asServiceRole.entities.PropstreamREListing.update(listing.id, {
          email_subject: result.subject,
          email_body: result.body,
          email_status: 'ready'
        });
        generated++;
      } catch { /* skip individual failures */ }
    }

    return Response.json({ success: true, generated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});