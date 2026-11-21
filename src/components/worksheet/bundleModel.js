// Bundle helpers for the worksheet. A bundle's name is derived from the items
// it contains — the operator never types it — and the suggested total is the
// sum of the item prices, which the operator uses to set ONE checkout price.
export function bundleNameFromItems(items = []) {
  return items
    .map((i) => (i.name || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function bundleSuggestedTotal(items = []) {
  return items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
}