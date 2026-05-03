import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id, new_stage } = await req.json();

    if (!deal_id || !new_stage) {
      return Response.json({ error: 'deal_id and new_stage required' }, { status: 400 });
    }

    // Get the deal
    const deals = await base44.asServiceRole.entities.ReferralDealPipeline.filter({
      deal_id,
    });

    if (deals.length === 0) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = deals[0];
    const oldStage = deal.stage;
    const now = new Date().toISOString();

    // Update deal stage
    await base44.asServiceRole.entities.ReferralDealPipeline.update(deal.id, {
      stage: new_stage,
      notes: `Stage updated from ${oldStage} to ${new_stage} on ${now}`,
    });

    console.log(`[PIPELINE] Deal ${deal_id}: ${oldStage} → ${new_stage}`);

    // If closing, trigger commission tracking and credit calculation
    if (new_stage === 'closed') {
      console.log(`[CLOSE] Triggering commission tracking for deal ${deal_id}`);
      
      // Calculate commission
      const actualSalePrice = deal.actual_sale_price || deal.estimated_value || 0;
      const commissionRate = 0.06; // 6% standard
      const actualCommission = Math.round(actualSalePrice * commissionRate);
      const referralPercentage = deal.referral_percentage || 25;
      const actualReferralFee = Math.round(actualCommission * (referralPercentage / 100));

      // Update deal with final values
      await base44.asServiceRole.entities.ReferralDealPipeline.update(deal.id, {
        actual_commission: actualCommission,
        actual_referral_fee: actualReferralFee,
        closing_date: now,
      });

      // Trigger credit calculation for operator
      if (deal.operator_id && actualReferralFee > 0) {
        const creditAmount = Math.floor(actualReferralFee / 100 / 10); // Convert to credits (~$10 per credit)
        console.log(`[CREDITS] Crediting ${creditAmount} credits to operator ${deal.operator_id}`);
        
        // Get or create operator credit account
        const creditAccounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({
          operator_id: deal.operator_id,
        });

        if (creditAccounts.length > 0) {
          const newBalance = (creditAccounts[0].credits_balance || 0) + creditAmount;
          await base44.asServiceRole.entities.OperatorAICreditAccount.update(creditAccounts[0].id, {
            credits_balance: newBalance,
          });
        }
      }
    }

    return Response.json({
      success: true,
      deal_id,
      old_stage: oldStage,
      new_stage,
      updated_at: now,
      message: `Deal moved from ${oldStage} to ${new_stage}`,
    });
  } catch (error) {
    console.error('Error updating deal stage:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});