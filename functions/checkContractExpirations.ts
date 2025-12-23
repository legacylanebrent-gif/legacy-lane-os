import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active estate sales with contracts
    const sales = await base44.asServiceRole.entities.EstateSale.filter({
      status: ['upcoming', 'active']
    });

    const notifications = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const sale of sales) {
      if (!sale.sale_dates || sale.sale_dates.length === 0) continue;

      const saleEndDate = new Date(sale.sale_dates[sale.sale_dates.length - 1].date);
      const contractEndDate = new Date(saleEndDate.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days after sale

      // Check if contract expires within 30 days
      if (contractEndDate <= thirtyDaysFromNow && contractEndDate > today) {
        const daysUntilExpiration = Math.ceil((contractEndDate - today) / (1000 * 60 * 60 * 24));

        // Send notification to operator
        await base44.asServiceRole.functions.invoke('sendNotification', {
          user_id: sale.operator_id,
          type: 'contract_expiration',
          title: 'Contract Expiring Soon',
          message: `The contract for "${sale.title}" expires in ${daysUntilExpiration} days. Please review and renew if needed.`,
          link_to_page: 'SaleContracts',
          link_params: `saleId=${sale.id}`
        });

        notifications.push({
          sale_id: sale.id,
          operator_id: sale.operator_id,
          days_until_expiration: daysUntilExpiration
        });
      }
    }

    return Response.json({
      success: true,
      contracts_checked: sales.length,
      notifications_sent: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Error checking contract expirations:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});