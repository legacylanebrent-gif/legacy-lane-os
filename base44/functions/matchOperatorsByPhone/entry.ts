import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch both tables (up to 10k each)
    const [orgRecords, netRecords] = await Promise.all([
      base44.asServiceRole.entities.EstatesalesOrgOperator.list('-created_date', 10000),
      base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', 10000),
    ]);

    // Normalize phone: strip everything except digits
    const normalizePhone = (p) => p ? p.replace(/\D/g, '') : null;

    // Build phone sets
    const orgPhones = new Set();
    const netPhones = new Set();

    let orgWithPhone = 0;
    let netWithPhone = 0;

    for (const r of orgRecords) {
      const p = normalizePhone(r.phone);
      if (p && p.length >= 10) { orgPhones.add(p); orgWithPhone++; }
    }
    for (const r of netRecords) {
      const p = normalizePhone(r.phone);
      if (p && p.length >= 10) { netPhones.add(p); netWithPhone++; }
    }

    // Phones that appear in BOTH tables
    const matched = [...orgPhones].filter(p => netPhones.has(p));
    const onlyInOrg = [...orgPhones].filter(p => !netPhones.has(p));
    const onlyInNet = [...netPhones].filter(p => !orgPhones.has(p));

    // Unique across both combined
    const allUnique = new Set([...orgPhones, ...netPhones]);

    return Response.json({
      org_total_records: orgRecords.length,
      net_total_records: netRecords.length,
      org_records_with_phone: orgWithPhone,
      net_records_with_phone: netWithPhone,
      org_unique_phones: orgPhones.size,
      net_unique_phones: netPhones.size,
      phones_in_both_tables: matched.length,
      phones_only_in_org: onlyInOrg.length,
      phones_only_in_net: onlyInNet.length,
      total_unique_companies_by_phone: allUnique.size,
      overlap_percentage: orgPhones.size > 0 ? ((matched.length / orgPhones.size) * 100).toFixed(1) + '%' : 'N/A',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});