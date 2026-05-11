export function getSaleDisplayStatus(sale) {
  // Draft: not published
  if (sale.status === 'draft') return 'draft';

  // Always compute date-based status if dates exist
  if (sale.sale_dates && sale.sale_dates.length > 0) {
    const now = new Date();

    const activeSales = sale.sale_dates.filter(saleDate => {
      const saleStart = new Date(`${saleDate.date}T${saleDate.start_time || '00:00'}`);
      const saleEnd = new Date(`${saleDate.date}T${saleDate.end_time || '23:59'}`);
      return now >= saleStart && now <= saleEnd;
    });

    const upcomingSales = sale.sale_dates.filter(saleDate => {
      const saleStart = new Date(`${saleDate.date}T${saleDate.start_time || '00:00'}`);
      return saleStart > now;
    });

    const pastSales = sale.sale_dates.filter(saleDate => {
      const saleEnd = new Date(`${saleDate.date}T${saleDate.end_time || '23:59'}`);
      return now > saleEnd;
    });

    // If any sale is currently happening
    if (activeSales.length > 0) return 'active';

    // If any future sale exists
    if (upcomingSales.length > 0) return 'upcoming';

    // If all sales have passed
    if (pastSales.length === sale.sale_dates.length) return 'completed';
  }

  return sale.status || 'draft';
}

// Determine if sale should be visible on frontend to public users
export function shouldShowSaleOnFrontend(sale) {
  const displayStatus = getSaleDisplayStatus(sale);
  return displayStatus === 'active' || displayStatus === 'upcoming';
}