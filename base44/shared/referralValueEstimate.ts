// Referral value illustration — shared by the referral submission flow and the
// on-demand estimator so both calculate the same way.
//
// The payout is an ILLUSTRATION, never a quote or promise:
//   home value × 2% referral fee × 15% agent payout share.
// The 2% is an APPROXIMATE real estate agent commission — the real commission is
// set in the client's listing agreement. Every number here is approximate and
// changes once the actual sale price and actual commission are known.
// The estimate itself is a market estimate, never an appraisal.

export const REFERRAL_FEE_RATE = 0.02;
export const PAYOUT_SHARE_RATE = 0.15;

export function computeReferralPayout(homeValue) {
  const value = Number(homeValue);
  if (!Number.isFinite(value) || value <= 0) return null;
  const commission = Math.round(value * REFERRAL_FEE_RATE);
  const payout = Math.round(commission * PAYOUT_SHARE_RATE);
  return { commission, payout };
}

// The model usually returns numbers, but a formatted string ("$8,350,000") is
// common enough that it must not lose the whole estimate.
function whole(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  const cleaned = String(value ?? '').replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// A model that ignores the schema answers in prose and the platform hands back
// its raw text; that still counts as "no estimate" for us.
function asObject(result) {
  if (result && typeof result === 'object') return result;
  if (typeof result === 'string') {
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Writes the valuation block onto a ReferralLead. Called only from server
// functions; the client never supplies a home value.
export async function estimatePropertyValue(base44, property) {
  const place = [property?.address, property?.city, property?.state, property?.zip]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
  const estimatedAt = new Date().toISOString();

  if (!place) {
    return {
      home_value_status: 'unavailable',
      home_value_basis: 'There is no usable property address on this referral.',
      home_value_estimated_at: estimatedAt,
    };
  }

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Estimate the current market value of the residential property at: ${place}.

Use public web sources: recent comparable sales, current listing prices for similar homes in the same city and neighborhood, and public automated valuation estimates. Identify the property type, approximate size, and year built when you can.

Return the most likely sale price for this home selling within the next 6 months as a whole US dollar number, plus a realistic low and high range, and one or two sentences explaining which comparables or sources you relied on. If the address cannot be identified or matched to a specific property, say so plainly and set the confidence to "low".`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          estimated_value: { type: 'number' },
          low_value: { type: 'number' },
          high_value: { type: 'number' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          basis: { type: 'string' },
        },
        required: ['estimated_value', 'confidence', 'basis'],
      },
    });

    const payload = asObject(result);
    const estimated = whole(payload?.estimated_value);
    if (!estimated) {
      console.error('referralValueEstimate: unusable result:', typeof result, String(result).slice(0, 300));
      throw new Error('No usable estimate returned');
    }

    const payout = computeReferralPayout(estimated);
    const low = whole(payload?.low_value);
    const high = whole(payload?.high_value);

    return {
      home_value_status: 'estimated',
      estimated_home_value: estimated,
      home_value_low: low || undefined,
      home_value_high: high || undefined,
      home_value_confidence: ['high', 'medium', 'low'].includes(payload?.confidence) ? payload.confidence : 'low',
      home_value_basis: String(payload?.basis || '').slice(0, 600),
      home_value_source: 'AI market estimate using public web sources',
      home_value_estimated_at: estimatedAt,
      referral_commission_estimate: payout?.commission,
      referral_fee_estimate: payout?.payout,
    };
  } catch (error) {
    console.error('referralValueEstimate: valuation failed:', error?.message);
    return {
      home_value_status: 'unavailable',
      home_value_basis: 'A market value could not be estimated for this address.',
      home_value_estimated_at: estimatedAt,
    };
  }
}