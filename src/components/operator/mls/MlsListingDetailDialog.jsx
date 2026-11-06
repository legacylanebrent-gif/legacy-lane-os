import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, MapPin } from 'lucide-react';
import { formatPrice } from './mlsFilters';

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="text-right text-xs font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  const hasContent = React.Children.toArray(children).some(Boolean);
  if (!hasContent) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function MlsListingDetailDialog({ listing, onClose }) {
  if (!listing) return null;

  const address = [listing.property_address, listing.unit_number && `Unit ${listing.unit_number}`]
    .filter(Boolean)
    .join(' ');
  const location = [listing.city, listing.state, listing.zip].filter(Boolean).join(', ');
  const size = listing.square_feet ? `${Number(listing.square_feet).toLocaleString()} sq ft` : null;
  const landSize = listing.lot_size ? `${Number(listing.lot_size).toLocaleString()} lot` : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base leading-tight">
            {address || 'Listing details'}
          </DialogTitle>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3" />
            {location || 'Location unavailable'}
            {listing.miles != null && (
              <span className="font-semibold text-cyan-700">· {listing.miles} mi away</span>
            )}
          </p>
        </DialogHeader>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900 tabular-nums">
            {formatPrice(listing.list_price)}
          </span>
          {listing.listing_status && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {listing.listing_status}
            </span>
          )}
        </div>

        <Section title="Listing">
          <Row label="List date" value={listing.list_date} />
          <Row
            label="Days on market"
            value={listing.days_on_market != null ? String(listing.days_on_market) : null}
          />
          <Row label="MLS #" value={listing.mls_number} />
          <Row label="Listing type" value={listing.property_type} />
          <Row label="Property status" value={listing.property_status} />
          <Row label="Source" value={listing.source} />
        </Section>

        <Section title="Property">
          <Row label="County" value={listing.county} />
          <Row label="Beds" value={listing.beds != null ? String(listing.beds) : null} />
          <Row label="Baths" value={listing.baths != null ? String(listing.baths) : null} />
          <Row label="Size" value={size} />
          <Row label="Lot size" value={landSize} />
          <Row label="Year built" value={listing.year_built ? String(listing.year_built) : null} />
          <Row label="Estimated value" value={listing.estimated_value ? formatPrice(listing.estimated_value) : null} />
          <Row label="Last sale date" value={listing.last_sale_date} />
          <Row
            label="Last sale amount"
            value={listing.last_sale_amount ? formatPrice(listing.last_sale_amount) : null}
          />
          <Row
            label="Estate sale fit"
            value={
              listing.estate_sale_score_label
                ? `${listing.estate_sale_score_label} (${listing.estate_sale_score ?? '—'})`
                : null
            }
          />
        </Section>

        <Section title="Listing agent">
          <Row label="Agent" value={listing.listing_agent_name} />
          <Row label="Brokerage" value={listing.listing_brokerage} />
          <Row label="Phone" value={listing.listing_agent_phone} />
          <Row label="Email" value={listing.listing_agent_email} />
        </Section>

        {listing.listing_remarks && (
          <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Remarks
            </p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
              {listing.listing_remarks}
            </p>
          </div>
        )}

        {listing.listing_url && (
          <a
            href={listing.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Open original listing
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}