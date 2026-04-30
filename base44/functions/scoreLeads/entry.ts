import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all unscored leads
    const leads = await base44.entities.Lead.filter({ score: { $exists: false } });
    
    if (leads.length === 0) {
      return Response.json({ scored: 0, message: 'No unscored leads found' });
    }

    const updated = [];
    for (const lead of leads) {
      let score = 50; // baseline

      // Boost for property value
      if (lead.estimated_value) {
        if (lead.estimated_value > 500000) score += 15;
        else if (lead.estimated_value > 300000) score += 10;
        else if (lead.estimated_value > 100000) score += 5;
      }

      // Boost for equity
      if (lead.propstream_equity) {
        if (lead.propstream_equity > 200000) score += 15;
        else if (lead.propstream_equity > 100000) score += 10;
        else if (lead.propstream_equity > 50000) score += 5;
      }

      // Boost for owner type
      const distressedOwnerTypes = ['Distressed', 'Foreclosure', 'Pre-Foreclosure', 'Inherited'];
      if (lead.propstream_owner_type && distressedOwnerTypes.some(t => lead.propstream_owner_type.includes(t))) {
        score += 10;
      }

      // Boost for situation
      const highPrioritySituations = ['probate', 'foreclosure', 'downsizing'];
      if (lead.situation && highPrioritySituations.includes(lead.situation)) {
        score += 10;
      }

      // Boost for contact info
      if (lead.contact_email && lead.contact_phone) score += 5;
      else if (lead.contact_email || lead.contact_phone) score += 2;

      // Cap at 100
      score = Math.min(score, 100);

      await base44.entities.Lead.update(lead.id, { score });
      updated.push(lead.id);
    }

    return Response.json({ scored: updated.length, leadIds: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});