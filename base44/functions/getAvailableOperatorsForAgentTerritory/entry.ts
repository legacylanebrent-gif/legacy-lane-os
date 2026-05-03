import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  console.log('[DEBUG] Method received:', req.method);

  // Only accept POST
  if (req.method !== 'POST') {
    console.log('[DEBUG] Rejected non-POST request');
    return Response.json(
      { success: false, error: 'Method Not Allowed. Use POST.' },
      { status: 405 }
    );
  }

  // Validate shared key
  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';
  console.log('[DEBUG] Shared key present:', incomingKey ? 'YES' : 'NO');

  if (!incomingKey || incomingKey !== expectedKey) {
    console.log('[DEBUG] Shared key invalid or missing');
    return Response.json(
      { success: false, error: 'Unauthorized: invalid shared key' },
      { status: 401 }
    );
  }

  console.log('[DEBUG] Auth passed. Returning hardcoded test response.');

  // Hardcoded test response — replace with real logic after Houszu confirms 200
  return Response.json({
    success: true,
    source: 'Legacy Lane OS',
    function: 'getAvailableOperatorsForAgentTerritory',
    message: 'Reverse operator endpoint is live',
    operators: [
      {
        operator_id: 'legacy_test_operator_001',
        company_name: 'Legacy Lane Test Operator',
        owner_name: 'Test Owner',
        email: 'test@example.com',
        phone: '555-555-5555',
        service_counties: ['Monmouth'],
        service_towns: ['Middletown', 'Red Bank', 'Holmdel'],
        service_zip_codes: ['07748', '07701', '07733'],
        match_score: 100,
        status: 'available',
      },
    ],
  });
});