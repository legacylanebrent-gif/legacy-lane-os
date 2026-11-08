import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Brand field with the shared brands list behind it: typing filters the list,
 * picking a suggestion reuses that exact brand, and a name that isn't on the
 * list yet is added to it when the field is left. Used by the sale photo editor,
 * the inventory item form and the marketplace listing form, so all three offer
 * the same brands.
 */

let brandCache = null;
let brandCachePromise = null;

function loadBrands() {
  if (brandCache) return Promise.resolve(brandCache);
  if (!brandCachePromise) {
    brandCachePromise = base44.entities.Brand
      .filter({ status: 'active' }, { sort: 'name', limit: 300 })
      .then(page => {
        brandCache = (page.items || [])
          .map(brand => ({ id: brand.id, name: brand.name, aliases: brand.aliases || [] }))
          .filter(brand => brand.name);
        return brandCache;
      })
      .catch(() => {
        brandCache = [];
        return brandCache;
      })
      .finally(() => { brandCachePromise = null; });
  }
  return brandCachePromise;
}

function rememberBrand(name) {
  if (!brandCache || !name) return;
  if (brandCache.some(brand => brand.name.toLowerCase() === name.toLowerCase())) return;
  brandCache = [...brandCache, { id: null, name, aliases: [] }]
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function BrandInput({
  value = '',
  onChange,
  placeholder = 'Brand or maker',
  inputClassName = '',
  wrapperClassName = '',
  hint = '',
  id,
}) {
  const [brands, setBrands] = useState(brandCache || []);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    let active = true;
    loadBrands().then(list => { if (active) setBrands(list); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onDocDown = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const typed = String(value || '').trim();

  const options = useMemo(() => {
    const query = typed.toLowerCase();
    const matches = !query
      ? brands.slice(0, 8)
      : brands.filter(brand =>
          brand.name.toLowerCase().includes(query)
          || (brand.aliases || []).some(alias => String(alias).toLowerCase().includes(query)),
        ).slice(0, 8);
    const exact = brands.some(brand => brand.name.toLowerCase() === query);
    return (typed && !exact) ? [...matches, { id: '__new__', name: typed, isNew: true }] : matches;
  }, [brands, typed]);

  const choose = (brand) => {
    onChange(brand.name);
    setBrands(brands);
    setOpen(false);
  };

  /** Leaving the field with a brand that isn't on the list adds it there. */
  const register = async () => {
    if (!typed) return;
    if (brands.some(brand => brand.name.toLowerCase() === typed.toLowerCase())) return;
    try {
      const res = await base44.functions.invoke('brandCatalog', { action: 'resolve', name: typed });
      const canonical = res.data?.brand?.name;
      if (!canonical) return;
      rememberBrand(canonical);
      setBrands(brandCache || brands);
      if (canonical !== typed) onChange(canonical);
    } catch (error) {
      console.error('Could not add this brand to the list:', error?.message || error);
    }
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (event.key === 'ArrowDown') { setOpen(true); setHighlight(0); }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(index => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      if (options[highlight]) { event.preventDefault(); choose(options[highlight]); }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${wrapperClassName}`} ref={boxRef}>
      <input
        id={id}
        value={value || ''}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); register(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={inputClassName}
      />
      {open && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((brand, index) => (
            <li key={brand.id || brand.name}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(event) => { event.preventDefault(); choose(brand); }}
                onMouseEnter={() => setHighlight(index)}
                className={`block w-full px-2.5 py-1.5 text-left text-[12px] ${index === highlight ? 'bg-cyan-50 text-cyan-900' : 'text-slate-700'}`}
              >
                {brand.isNew ? `Add "${brand.name}" to the brands list` : brand.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}