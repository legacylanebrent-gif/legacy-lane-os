// Shared AI credit management helper
// Import this logic inline since NO LOCAL IMPORTS are allowed in Deno functions.
// Usage: copy the exported functions into each backend function that needs credit gating.

// TOKEN_TO_CREDIT_RATIO: 1 credit = 1 token (adjust later)
const TOKEN_TO_CREDIT_RATIO = 1;

export async function getOrCreateCreditAccount(base44, operatorId) {
  const accounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: operatorId });
  if (accounts.length > 0) return accounts[0];

  // Create a pending account so admin can set limits later
  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return await base44.asServiceRole.entities.OperatorAICreditAccount.create({
    operator_id: operatorId,
    subscription_tier: 'starter',
    monthly_credit_limit: 0,
    monthly_credits_used: 0,
    bonus_credits: 0,
    rollover_credits: 0,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    status: 'pending_setup',
  });
}

export function getAvailableCredits(account) {
  return (account.monthly_credit_limit || 0)
    + (account.bonus_credits || 0)
    + (account.rollover_credits || 0)
    - (account.monthly_credits_used || 0);
}

export async function recordUsage(base44, operatorId, account, { requestId, aiMode, modelUsed, inputTokens, outputTokens, totalTokens, estimatedCost, reason }) {
  const creditsCharged = Math.ceil(totalTokens * TOKEN_TO_CREDIT_RATIO);

  // Write ledger entry
  await base44.asServiceRole.entities.OperatorAICreditLedger.create({
    operator_id: operatorId,
    request_id: requestId || crypto.randomUUID(),
    ai_mode: aiMode,
    model_used: modelUsed,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost: estimatedCost,
    credits_charged: creditsCharged,
    credit_reason: reason || aiMode,
  });

  // Update running total on the credit account
  const newUsed = (account.monthly_credits_used || 0) + creditsCharged;
  await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
    monthly_credits_used: newUsed,
    status: newUsed >= (account.monthly_credit_limit || 0) ? 'over_limit' : 'active',
  });

  // Fire usage alerts at 75%, 90%, 100%
  const limit = (account.monthly_credit_limit || 0) + (account.bonus_credits || 0) + (account.rollover_credits || 0);
  if (limit > 0) {
    const pct = (newUsed / limit) * 100;
    const thresholds = [{ t: 75, type: 'usage_warning' }, { t: 90, type: 'usage_critical' }, { t: 100, type: 'limit_reached' }];
    for (const { t, type } of thresholds) {
      if (pct >= t) {
        const existing = await base44.asServiceRole.entities.OperatorAIUsageAlert.filter({ operator_id: operatorId, alert_type: type, was_shown: false });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.OperatorAIUsageAlert.create({
            operator_id: operatorId,
            alert_type: type,
            threshold_percent: t,
            message: t >= 100
              ? 'You have reached your AI credit limit for this billing period. Upgrade your plan or add more credits.'
              : `You have used ${t}% of your AI credits for this billing period.`,
            was_shown: false,
          });
        }
      }
    }
  }

  return creditsCharged;
}