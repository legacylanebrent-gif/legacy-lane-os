import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// One-time helper: lists all verified sites in this Google Search Console account
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');

    const res = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GSC API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return Response.json({ sites: data.siteEntry || [] });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});