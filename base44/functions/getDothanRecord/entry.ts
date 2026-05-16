import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { state, action } = body;

    // Analyze failure patterns for a state
    if (action === 'analyze_failures') {
      const targetState = state || 'AL';
      const pageSize = 1000;
      let skip = 0;
      const allRecords = [];

      while (true) {
        const batch = await base44.asServiceRole.entities.FutureOperatorLead.filter(
          { state: targetState }, '-created_date', pageSize, skip
        );
        allRecords.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }

      const total = allRecords.length;
      const failed = allRecords.filter(r => r.enrichment_status === 'failed');
      const found = allRecords.filter(r => r.enrichment_status === 'found' || r.enrichment_status === 'verified' || r.email);
      const notStarted = allRecords.filter(r => r.enrichment_status === 'not_started');
      const geocodeFailed = allRecords.filter(r => r.geocode_status === 'failed');
      const geocoded = allRecords.filter(r => r.geocode_status === 'geocoded');
      const noPhone = allRecords.filter(r => !r.phone);
      const noWebsite = allRecords.filter(r => !r.website);
      const noPhoneNoWebsite = allRecords.filter(r => !r.phone && !r.website);

      // Sample of failed records with their details
      const failedSample = failed.slice(0, 10).map(r => ({
        company: r.company_name,
        phone: r.phone,
        website: r.website,
        city: r.city,
        geocode_status: r.geocode_status,
        enrichment_status: r.enrichment_status,
        process_status: r.process_status,
      }));

      return Response.json({
        state: targetState,
        total,
        enrichment: {
          failed: failed.length,
          failed_pct: ((failed.length / total) * 100).toFixed(1),
          found_with_email: found.length,
          not_started: notStarted.length,
        },
        geocoding: {
          geocoded: geocoded.length,
          failed: geocodeFailed.length,
          failed_pct: ((geocodeFailed.length / total) * 100).toFixed(1),
        },
        data_quality: {
          no_phone: noPhone.length,
          no_website: noWebsite.length,
          no_phone_and_no_website: noPhoneNoWebsite.length,
        },
        failed_sample: failedSample,
      });
    }

    // Default: search for "Dothan"
    const records = await base44.asServiceRole.entities.FutureOperatorLead.filter({
      company_name: { $regex: 'Dothan', $options: 'i' }
    });

    return Response.json({ count: records.length, records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});