import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log('[DEBUG] Method received:', req.method);
  console.log('[DEBUG] Request path:', url.pathname);

  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';
  console.log('[DEBUG] x-legacy-shared-key header present:', incomingKey ? 'YES' : 'NO');
  console.log('[DEBUG] LEGACY_SHARED_API_KEY secret present:', expectedKey ? 'YES' : 'NO');

  // Accept both GET and POST for initial connectivity testing
  // GET = diagnostic ping (no auth required)
  if (req.method === 'GET') {
    return Response.json({
      success: true,
      message: 'Legacy Lane OS operator endpoint is reachable. Use POST with x-legacy-shared-key header.',
      correct_url: `${url.origin}/functions/getAvailableOperatorsForAgentTerritory`,
      note: 'Base44 public endpoint format is /functions/<name> — NOT /api/<name>',
    });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { success: false, error: 'Method Not Allowed. Use POST.' },
      { status: 405 }
    );
  }

  // Validate shared key
  if (!incomingKey || incomingKey !== expectedKey) {
    console.log('[DEBUG] Shared key invalid or missing');
    return Response.json(
      { success: false, error: 'Unauthorized: invalid shared key' },
      { status: 401 }
    );
  }

  console.log('[DEBUG] Auth passed. Returning test response.');

  return Response.json({
    success: true,
    message: 'POST route is live',
    route_tested: 'getAvailableOperatorsForAgentTerritory',
    correct_url_format: '/functions/getAvailableOperatorsForAgentTerritory',
    operators: [
      {
        operator_id: 'legacy_test_operator_001',
        company_name: 'Legacy Lane Test Operator',
        service_counties: ['Monmouth'],
        service_towns: ['Middletown', 'Red Bank', 'Holmdel'],
        service_zip_codes: ['07748', '07701', '07733'],
        match_score: 100,
        status: 'available',
      },
    ],
  });
});