import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, amount } = await req.json();

    // Get or create user's credit account
    let creditAccount = await base44.entities.ConsumerImageSearchCredits.filter({ user_id: user.id });
    
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1).toISOString();

    if (creditAccount.length === 0) {
      // Create new credit account with 10 free searches per year
      creditAccount = await base44.entities.ConsumerImageSearchCredits.create({
        user_id: user.id,
        user_email: user.email,
        annual_limit: 10,
        searches_used: 0,
        purchased_searches: 0,
        period_start: yearStart,
        period_end: yearEnd,
      });
    } else {
      creditAccount = creditAccount[0];
      
      // Reset if new year
      if (new Date(creditAccount.period_end) < now) {
        creditAccount = await base44.entities.ConsumerImageSearchCredits.update(creditAccount.id, {
          searches_used: 0,
          period_start: yearStart,
          period_end: yearEnd,
        });
      }
    }

    // Handle different actions
    if (action === 'check') {
      const remaining = creditAccount.annual_limit - creditAccount.searches_used + creditAccount.purchased_searches;
      return Response.json({
        allowed: remaining > 0,
        annual_limit: creditAccount.annual_limit,
        searches_used: creditAccount.searches_used,
        purchased_searches: creditAccount.purchased_searches,
        remaining: remaining,
        period_start: creditAccount.period_start,
        period_end: creditAccount.period_end,
      });
    }

    if (action === 'consume') {
      const consumeAmount = amount || 1;
      const remaining = creditAccount.annual_limit - creditAccount.searches_used + creditAccount.purchased_searches;
      
      if (remaining < consumeAmount) {
        return Response.json({ 
          allowed: false, 
          error: 'Insufficient credits',
          remaining: remaining 
        }, { status: 403 });
      }

      // Consume from purchased searches first, then from free allowance
      let newPurchased = creditAccount.purchased_searches;
      let newUsed = creditAccount.searches_used;
      
      if (newPurchased >= consumeAmount) {
        newPurchased -= consumeAmount;
      } else {
        const fromFree = consumeAmount - newPurchased;
        newPurchased = 0;
        newUsed += fromFree;
      }

      await base44.entities.ConsumerImageSearchCredits.update(creditAccount.id, {
        searches_used: newUsed,
        purchased_searches: newPurchased,
      });

      return Response.json({
        allowed: true,
        consumed: consumeAmount,
        remaining: creditAccount.annual_limit - newUsed + newPurchased,
      });
    }

    if (action === 'purchase') {
      const purchaseAmount = amount || 50;
      const price = 9.99;
      
      // In a real implementation, this would integrate with Stripe/Wix Payments
      // For now, we'll just add the searches directly
      await base44.entities.ConsumerImageSearchCredits.update(creditAccount.id, {
        purchased_searches: creditAccount.purchased_searches + purchaseAmount,
      });

      return Response.json({
        allowed: true,
        message: `Successfully purchased ${purchaseAmount} image searches for $${price}`,
        purchased_searches: purchaseAmount,
        total_remaining: creditAccount.annual_limit - creditAccount.searches_used + creditAccount.purchased_searches + purchaseAmount,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Consumer image search credits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});