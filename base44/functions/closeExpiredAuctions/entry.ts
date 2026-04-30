import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admins can call this
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all active auctions
    const allAuctions = await base44.asServiceRole.entities.MarketplaceItem.filter(
      { listing_type: 'AUCTION', status: 'ACTIVE' },
      '-created_date',
    );

    const now = new Date();
    const closed = [];

    for (const item of allAuctions) {
      const endDate = new Date(item.auction_end_date);

      // Check if auction has ended
      if (endDate <= now) {
        // Get all bids for this item
        const bids = await base44.asServiceRole.entities.Bid.filter(
          { marketplace_item_id: item.id },
          '-created_date',
        );

        let winnerId = null;
        let winningBid = null;

        if (bids.length > 0) {
          // Find highest bid
          const sorted = [...bids].sort((a, b) => b.bid_amount - a.bid_amount);
          winningBid = sorted[0];
          winnerId = winningBid.bidder_id;

          // Create purchase record
          if (winnerId) {
            await base44.asServiceRole.entities.Purchase.create({
              marketplace_item_id: item.id,
              seller_id: item.operator_id,
              buyer_id: winnerId,
              purchase_type: 'AUCTION_WON',
              final_price: winningBid.bid_amount,
              shipping_option_chosen: item.shipping_option === 'SHIPS_ONLY' ? 'SHIP' : 'LOCAL_PICKUP',
              shipping_cost_paid: item.shipping_option === 'SHIPS_ONLY' ? item.shipping_cost || 0 : 0,
              status: 'PENDING_PAYMENT_OFFLINE',
            });
          }
        }

        // Update item status
        await base44.asServiceRole.entities.MarketplaceItem.update(item.id, {
          status: 'AUCTION_CLOSED',
        });

        closed.push({
          itemId: item.id,
          title: item.title,
          winnerId,
          winningBid: winningBid?.bid_amount,
          bidCount: bids.length,
        });
      }
    }

    return Response.json({
      message: `Closed ${closed.length} auctions`,
      closedAuctions: closed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});