// Sale photos as pickable options for the worksheet (transactions + offers).
// A photo with no saved name or description is still a real item on the sale,
// so it always appears — never filtered out just because it is untitled.
export function getSalePhotoOptions(sale) {
  const images = (sale?.images || []).filter((img) => img && (img.url || img.thumbnail_url));
  return images.map((img, index) => ({
    key: img.pipeline?.id || img.url || `photo-${index}`,
    name: (img.name || '').trim() || `Photo ${index + 1}`,
    description: img.description || '',
    imageUrl: img.url || img.thumbnail_url,
    suggested_price: typeof img.price === 'number' ? img.price : null,
  }));
}

export function filterSalePhotoOptions(options, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q)
  );
}