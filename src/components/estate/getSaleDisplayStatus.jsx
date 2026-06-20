export function getSaleDisplayStatus(sale) {
  // Draft: not published
  if (sale.status === 'draft') return 'draft';

  // Always compute date-based status if dates exist
  if (sale.sale_dates && sale.sale_dates.length > 0) {
    const now = new Date();

    const activeSales = sale.sale_dates.filter(saleDate => {
      // Parse date in local timezone
      const [year, month, day] = saleDate.date.split('-');
      const saleStart = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
        parseInt(saleDate.start_time?.split(':')[0] || 0), 
        parseInt(saleDate.start_time?.split(':')[1] || 0)
      );
      const saleEnd = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(saleDate.end_time?.split(':')[0] || 23),
        parseInt(saleDate.end_time?.split(':')[1] || 59)
      );
      return now >= saleStart && now <= saleEnd;
    });

    const upcomingSales = sale.sale_dates.filter(saleDate => {
      const [year, month, day] = saleDate.date.split('-');
      const saleStart = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(saleDate.start_time?.split(':')[0] || 0),
        parseInt(saleDate.start_time?.split(':')[1] || 0)
      );
      return saleStart > now;
    });

    const pastSales = sale.sale_dates.filter(saleDate => {
      const [year, month, day] = saleDate.date.split('-');
      const saleEnd = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(saleDate.end_time?.split(':')[0] || 23),
        parseInt(saleDate.end_time?.split(':')[1] || 59)
      );
      return now > saleEnd;
    });

    // If any sale is currently happening
    if (activeSales.length > 0) return 'active';

    // Check upcoming sales for "starts today" / "starts tomorrow" / "upcoming"
    if (upcomingSales.length > 0) {
      // Find the soonest upcoming start
      const soonest = upcomingSales.reduce((earliest, saleDate) => {
        const [year, month, day] = saleDate.date.split('-');
        const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
          parseInt(saleDate.start_time?.split(':')[0] || 0),
          parseInt(saleDate.start_time?.split(':')[1] || 0)
        );
        return (!earliest || start < earliest) ? start : earliest;
      }, null);

      const msUntilStart = soonest - now;
      const hoursUntilStart = msUntilStart / (1000 * 60 * 60);

      // "Starts Today": same calendar date as the start
      const soonestMidnight = new Date(soonest.getFullYear(), soonest.getMonth(), soonest.getDate(), 0, 0, 0);
      if (now >= soonestMidnight && hoursUntilStart >= 0) return 'starts_today';

      // "Starts Tomorrow": start is on the next calendar day from today
      const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const dayAfterTomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
      if (soonest >= tomorrowMidnight && soonest < dayAfterTomorrowMidnight) return 'starts_tomorrow';

      return 'upcoming';
    }

    // If all sales have passed
    if (pastSales.length === sale.sale_dates.length) {
      // Respect an explicitly-set active/upcoming status even when dates have passed
      if (sale.status === 'active' || sale.status === 'upcoming') return sale.status;
      return 'completed';
    }
  }

  return sale.status || 'draft';
}

// Determine if sale should be visible on frontend to public users
export function shouldShowSaleOnFrontend(sale) {
  // Explicitly-set status takes priority over date-based computation
  if (sale.status === 'active' || sale.status === 'upcoming') {
    // Even with active/upcoming status, hide if all dates have passed in user's local timezone
    const now = new Date();
    if (sale.sale_dates && sale.sale_dates.length > 0) {
      const allPast = sale.sale_dates.every(saleDate => {
        const [year, month, day] = saleDate.date.split('-');
        const saleEnd = new Date(
          parseInt(year), parseInt(month) - 1, parseInt(day),
          parseInt(saleDate.end_time?.split(':')[0] ?? 23),
          parseInt(saleDate.end_time?.split(':')[1] ?? 59)
        );
        return now > saleEnd;
      });
      if (allPast) return false;
    }
    return true;
  }
  if (sale.status === 'draft' || sale.status === 'completed' || sale.status === 'archived') return false;
  // Fall back to date-based status
  const displayStatus = getSaleDisplayStatus(sale);
  return displayStatus === 'active' || displayStatus === 'upcoming';
}