import React from 'react';

const FACT_LABELS = [
  ['property_type', 'Property type'],
  ['beds', 'Bedrooms'],
  ['baths', 'Bathrooms'],
  ['building_sqft', 'Building sq ft'],
  ['lot_size', 'Lot size'],
  ['year_built', 'Year built'],
  ['county', 'County'],
  ['parcel_id', 'Parcel / APN'],
  ['listing_status', 'Listing status'],
  ['list_date', 'Listed'],
  ['days_on_market', 'Days on market'],
  ['last_sale_date', 'Last recorded sale'],
];

export default function PropertyFacts({ facts = {} }) {
  const entries = FACT_LABELS.filter(([key]) => facts[key] !== undefined && facts[key] !== '' && facts[key] !== null);
  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Property information</h4>
      <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(([key, label]) => (
          <div key={key}>
            <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="text-sm text-slate-800">{String(facts[key])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        Facts about the subject property from the stored reference record. The owner’s mailing address is kept separate
        and never treated as the property address.
      </p>
    </section>
  );
}