import React, { useState } from 'react';
import { Loader2, Mail, Phone, ShieldAlert } from 'lucide-react';
import { enrichment, CONTACT_MARK_LABELS } from './listingApi';

const MARK_OPTIONS = [
  { value: 'none', label: 'Not marked' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'not_owner', label: 'Someone else' },
];

function ContactRow({ contact, onMark, busy }) {
  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
            {contact.kind === 'email' ? <Mail className="h-3.5 w-3.5 text-slate-400" /> : <Phone className="h-3.5 w-3.5 text-slate-400" />}
            <span className="break-all">{contact.value_display}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {contact.owner_name || 'Owner of record'}
            {contact.phone_type ? ` · ${contact.phone_type}` : ''}
            {contact.source ? ` · ${contact.source}` : ''}
            {contact.source_date ? ` · as of ${contact.source_date}` : ''}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          Unverified
        </span>
      </div>

      {(contact.restrictions || []).length > 0 && (
        <p className="mt-1 flex items-center gap-1 text-xs text-rose-700">
          <ShieldAlert className="h-3 w-3" /> {contact.restrictions.join(', ').replace(/_/g, ' ')}
        </p>
      )}
      {contact.agent_status !== 'none' && (
        <p className="mt-1 text-xs text-slate-600">
          {CONTACT_MARK_LABELS[contact.agent_status]}
          {contact.agent_status_by_name ? ` · ${contact.agent_status_by_name}` : ''}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-slate-500" htmlFor={`mark-${contact.contact_id}`}>Your mark</label>
        <select
          id={`mark-${contact.contact_id}`}
          value={contact.agent_status || 'none'}
          disabled={busy}
          onChange={(e) => onMark(contact, e.target.value)}
          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
        >
          {MARK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      </div>
    </div>
  );
}

export default function OwnerContacts({ opportunity, onChanged }) {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const contacts = opportunity?.contacts || [];
  const withheld = opportunity?.contacts_withheld || '';
  const emails = contacts.filter((c) => c.kind === 'email');
  const phones = contacts.filter((c) => c.kind === 'phone');

  const mark = async (contact, status) => {
    setBusyId(contact.contact_id);
    setError('');
    try {
      await enrichment.markContact(opportunity.id, contact.contact_id, status, contact.kind);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Owner contact information</h4>

      {withheld && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{withheld}</p>}

      {contacts.length === 0 && !withheld && (
        <p className="mt-2 text-xs text-slate-600">
          No owner phone numbers or emails are stored for this property yet. Run Enrich Data to read them from the
          matched reference record.
        </p>
      )}

      {emails.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Email addresses ({emails.length})</p>
          {emails.map((c) => <ContactRow key={c.contact_id} contact={c} onMark={mark} busy={busyId === c.contact_id} />)}
        </div>
      )}

      {phones.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Phone numbers ({phones.length})</p>
          {phones.map((c) => <ContactRow key={c.contact_id} contact={c} onMark={mark} busy={busyId === c.contact_id} />)}
        </div>
      )}

      {contacts.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Provider-supplied contact details are unverified. A verified property match does not verify a phone number or
          email. Your marks are kept when the data is refreshed, and a value you rejected is never restored as usable.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </section>
  );
}