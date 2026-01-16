export function getSaleDisplayStatus(sale) {
  if (sale.status === 'draft') return 'draft';
  if (sale.status === 'completed') return 'completed';
  
  // For active/upcoming: check sale dates
  if (sale.sale_dates && sale.sale_dates.length > 0) {
    const now = new Date();
    const upcomingSales = sale.sale_dates.filter(saleDate => {
      const saleDateTime = new Date(`${saleDate.date}T${saleDate.start_time || '00:00'}`);
      return saleDateTime > now;
    });
    
    const activeSales = sale.sale_dates.filter(saleDate => {
      const saleStart = new Date(`${saleDate.date}T${saleDate.start_time || '00:00'}`);
      const saleEnd = new Date(`${saleDate.date}T${saleDate.end_time || '23:59'}`);
      return now >= saleStart && now <= saleEnd;
    });
    
    const pastSales = sale.sale_dates.filter(saleDate => {
      const saleDateTime = new Date(`${saleDate.date}T${saleDate.end_time || '23:59'}`);
      return now > saleDateTime;
    });
    
    // If any sale is currently active
    if (activeSales.length > 0) return 'active';
    
    // If any future sale exists
    if (upcomingSales.length > 0) return 'upcoming';
    
    // If all sales are past
    if (pastSales.length > 0) return 'completed';
  }
  
  return sale.status || 'draft';
}