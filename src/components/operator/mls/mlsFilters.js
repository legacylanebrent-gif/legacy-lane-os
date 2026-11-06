export const DEFAULT_FILTERS = {
  max_miles: null,
  cities: [],
  price_min: '',
  price_max: '',
  sort: 'newest',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest to oldest' },
  { value: 'oldest', label: 'Oldest to newest' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'distance', label: 'Closest first' },
];

export const DISTANCE_STEPS = [5, 10, 15, 25, 50, 100];

export function normalizeFilters(raw) {
  const value = raw || {};
  return {
    max_miles: Number(value.max_miles) > 0 ? Number(value.max_miles) : null,
    cities: Array.isArray(value.cities) ? value.cities.map(String) : [],
    price_min: value.price_min ?? '',
    price_max: value.price_max ?? '',
    sort: SORT_OPTIONS.some((o) => o.value === value.sort) ? value.sort : 'newest',
  };
}

export function sameFilters(a, b) {
  const x = normalizeFilters(a);
  const y = normalizeFilters(b);
  return (
    x.max_miles === y.max_miles &&
    x.sort === y.sort &&
    String(x.price_min) === String(y.price_min) &&
    String(x.price_max) === String(y.price_max) &&
    x.cities.slice().sort().join('|') === y.cities.slice().sort().join('|')
  );
}

export function filterCount(filters) {
  let n = 0;
  if (filters.max_miles) n += 1;
  if (filters.cities.length) n += 1;
  if (filters.price_min || filters.price_max) n += 1;
  return n;
}

export function formatPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `$${Math.round(n).toLocaleString()}` : '—';
}