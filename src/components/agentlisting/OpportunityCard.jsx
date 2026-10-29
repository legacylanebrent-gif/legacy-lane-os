import React from 'react';
import { CalendarClock, ListChecks, Mail, MapPin, Phone, User } from 'lucide-react';
import { LISTING_STATUS_LABELS, ENRICHMENT_LABELS, ENRICHMENT_STYLES } from './listingApi';
import OwnershipBadge from './OwnershipBadge';

function DuePill({ days }) {
  if (days === null || days === undefined) return null;
  if (days < 0) return <span className="text-xs font-medium text-rose-600">Past deadline</span>;
  if (days <= 14) return <span className="text-xs font-medium text-amber-700">{days} day{days === 1 ? '' : 's'} left</span>;
  return <span className="text-xs text-slate-500">{days} days left</span>;
}

export default function OpportunityCard({ card, onOpen, selected = false, onToggleSelect }) {
  const enrichmentStatus = card.enrichment_status || 'never';

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
        selected ? 'border-cyan-500 ring-1 ring-cyan-200' : 'border-slate-200 hover:border-cyan-300'
      }`}
    >
      <button type="button" onClick={() => onOpen(card.id)} className="w-full p-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <MapPin className="h-4 w-4 shrink-0 text-cyan-600" />
              <span className="truncate">{card.formatted_address}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {LISTING_STATUS_LABELS[card.listing_status_mapped] || 'Status unclear'}
              </span>
              {card.status_review_required && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Check listing status</span>
              )}
              <span>{card.service_need_label}</span>
              {card.pending_date && <span>Pending {card.pending_date}</span>}
            </div>
          </div>
          <OwnershipBadge status={card.match_status} reviewStatus={card.review_status} conflict={!!card.conflict_note} />
        </div>

        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {card.owner_of_record ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">Owner of record: {card.owner_of_record}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="h-3.5 w-3.5 text-slate-300" />
              <span>{card.match_status === 'possible' ? 'Candidates need review' : 'No ownership record matched'}</span>
            </div>
          )}
          {card.contact_count > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {card.phone_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {card.phone_count} phone{card.phone_count === 1 ? '' : 's'}
                </span>
              )}
              {card.email_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {card.email_count} email{card.email_count === 1 ? '' : 's'}
                </span>
              )}
            </div>
          ) : card.contacts_withheld ? (
            <p className="line-clamp-2 text-xs text-slate-500">{card.contacts_withheld}</p>
          ) : null}
          {card.next_action && (
            <div className="flex items-start gap-1.5 text-xs text-slate-700">
              <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="line-clamp-2">{card.next_action}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
              {card.deadline || card.expected_closing_date || 'No closing date'}
            </span>
            <DuePill days={card.days_to_deadline} />
            {card.open_tasks > 0 && (
              <span className={card.tasks_due > 0 ? 'font-medium text-amber-700' : ''}>
                {card.open_tasks} open task{card.open_tasks === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(card.id)}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Select
        </label>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ENRICHMENT_STYLES[enrichmentStatus] || ENRICHMENT_STYLES.never}`}
        >
          {ENRICHMENT_LABELS[enrichmentStatus] || 'Not enriched yet'}
        </span>
      </div>
    </div>
  );
}