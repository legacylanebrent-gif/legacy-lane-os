import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get leads that haven't been scored yet (score is missing or null)
    const allLeads = await base44.entities.Lead.filter({}, '-created_date', 500);
    const leads = allLeads.filter(l => !l.score || l.score === 0);

    if (leads.length === 0) {
      return Response.json({ scored: 0, message: 'No unscored leads found' });
    }

    // Score all leads in memory
    const scored = [];
    for (const lead of leads) {
      let score = 50;

      if (lead.estimated_value) {
        if (lead.estimated_value > 500000) score += 15;
        else if (lead.estimated_value > 300000) score += 10;
        else if (lead.estimated_value > 100000) score += 5;
      }

      if (lead.propstream_equity) {
        if (lead.propstream_equity > 200000) score += 15;
        else if (lead.propstream_equity > 100000) score += 10;
        else if (lead.propstream_equity > 50000) score += 5;
      }

      const distressedOwnerTypes = ['Distressed', 'Foreclosure', 'Pre-Foreclosure', 'Inherited'];
      if (lead.propstream_owner_type && distressedOwnerTypes.some(t => lead.propstream_owner_type.includes(t))) {
        score += 10;
      }

      const highPrioritySituations = ['probate', 'foreclosure', 'downsizing'];
      if (lead.situation && highPrioritySituations.includes(lead.situation)) {
        score += 10;
      }

      if (lead.contact_email && lead.contact_phone) score += 5;
      else if (lead.contact_email || lead.contact_phone) score += 2;

      score = Math.min(score, 100);
      scored.push({ id: lead.id, score });
    }

    // Sequential updates in small batches with delays
    let updated = 0;
    for (let i = 0; i < scored.length; i++) {
      await base44.entities.Lead.update(scored[i].id, { score: scored[i].score });
      updated++;
      // Small delay between updates to avoid rate limits
      if (i % 5 === 4) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return Response.json({ scored: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});