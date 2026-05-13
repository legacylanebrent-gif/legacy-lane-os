import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { county, state } = body;

    if (!county || !state) {
      return Response.json({ error: 'county and state are required' }, { status: 400 });
    }

    // Step 1: Ask OpenAI for all municipalities in this county
    const municipalityPrompt = `List every incorporated and unincorporated municipality (cities, boroughs, townships, villages, towns, CDPs) in ${county} County, ${state}, USA.

Return a JSON object with:
- municipalities: array of objects, each with:
  - name: string (official name)
  - type: string (Borough, Township, City, CDP, Village, Town, etc.)
  - incorporated: boolean
  - notes: string (optional, any relevant note)
  - lat: number (approximate center latitude)
  - lng: number (approximate center longitude)
  - zip_codes: array of strings (primary ZIP codes for this municipality)
- total_count: number
- breakdown: object mapping type → count (e.g. {"Borough": 12, "Township": 8})

Be comprehensive and accurate. Return valid JSON only.`;

    const municipalityResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: municipalityPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = municipalityResponse.choices[0]?.message?.content;
    if (!content) {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    const municipalities = (parsed.municipalities || []).map(m => ({
      name: m.name || '',
      type: m.type || '',
      incorporated: m.incorporated ?? null,
      notes: m.notes || '',
      lat: m.lat || null,
      lng: m.lng || null,
      zip_codes: m.zip_codes || [],
    }));

    return Response.json({
      municipalities,
      total_count: parsed.total_count || municipalities.length,
      breakdown: parsed.breakdown || {},
      county,
      state,
    });

  } catch (error) {
    console.error('[getTerritoryMunicipalities] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});