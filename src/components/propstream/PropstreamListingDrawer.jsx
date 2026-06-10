import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import {
  MapPin, User, Home, Building2, Mail, Phone, Star, CheckCircle,
  Copy, ChevronDown, ChevronUp, Loader
} from 'lucide-react';

const SCORE_COLORS = { Priority: 'bg-red-100 text-red-700', Strong: 'bg-orange-100 text-orange-700', Moderate: 'bg-yellow-100 text-yellow-700', Low: 'bg-slate-100 text-slate-600' };
const EMAIL_STATUS_COLORS = { draft: 'bg-slate-100 text-slate-600', ready: 'bg-blue-100 text-blue-700', sent: 'bg-green-100 text-green-700', replied: 'bg-purple-100 text-purple-700', interested: 'bg-emerald-100 text-emerald-700', not_interested: 'bg-red-100 text-red-700' };

export default function PropstreamListingDrawer({ listing, onClose, onUpdate }) {
  const [notes, setNotes] = useState(listing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [opMsgOpen, setOpMsgOpen] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);

  if (!listing) return null;

  const fmt = (v) => v ?? '—';
  const fmtPrice = (v) => v ? `$${Number(v).toLocaleString()}` : '—';
  const flag = (bool, label) => bool ? <Badge key={label} className="bg-purple-100 text-purple-700 text-xs">{label}</Badge> : null;

  const saveNotes = async () => {
    setSaving(true);
    await base44.entities.PropstreamREListing.update(listing.id, { notes });
    setSaving(false);
    onUpdate && onUpdate();
  };

  const generateEmail = async () => {
    setGeneratingEmail(true);
    await base44.functions.invoke('generateListingAgentEmails', { listing_ids: [listing.id] });
    setGeneratingEmail(false);
    onUpdate && onUpdate();
  };

  const updateStatus = async (field, value) => {
    await base44.entities.PropstreamREListing.update(listing.id, { [field]: value });
    onUpdate && onUpdate();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b bg-slate-50 flex items-start justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg leading-tight">{listing.property_address}</h2>
          <p className="text-slate-500 text-sm">{listing.city}, {listing.state} {listing.zip}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge className={SCORE_COLORS[listing.estate_sale_score_label] || 'bg-slate-100 text-slate-600'}>
              ★ {listing.estate_sale_score} — {listing.estate_sale_score_label}
            </Badge>
            <Badge className={EMAIL_STATUS_COLORS[listing.email_status] || ''}>Email: {listing.email_status}</Badge>
            <Badge className="bg-slate-100 text-slate-600">Op: {(listing.operator_status || '').replace(/_/g, ' ')}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Flags */}
        <div className="flex flex-wrap gap-1.5">
          {[
            [listing.probate_indicator, 'Probate'],
            [listing.inherited_indicator, 'Inherited'],
            [listing.senior_owner_indicator, 'Senior Owner'],
            [listing.absentee_owner, 'Absentee Owner'],
            [listing.vacant, 'Vacant'],
            [listing.preforeclosure_indicator, 'Pre-Foreclosure'],
            [listing.foreclosure_indicator, 'Foreclosure'],
            [listing.lien_indicator, 'Lien'],
            [listing.tax_delinquent_indicator, 'Tax Delinquent'],
            [listing.divorce_indicator, 'Divorce'],
          ].map(([v, label]) => v ? <Badge key={label} className="bg-purple-100 text-purple-700 text-xs">{label}</Badge> : null)}
        </div>

        {/* MLS / Import Meta */}
        <Section title="MLS & Listing Info" icon={<Building2 className="w-4 h-4" />}>
          <Grid2>
            <DV label="MLS #" value={fmt(listing.mls_number)} />
            <DV label="Listing Status" value={fmt(listing.listing_status)} />
            <DV label="List Date" value={fmt(listing.list_date)} />
            {listing.listing_url && <DV label="Listing URL" value={<a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate block max-w-[180px]">View Listing</a>} span2 />}
          </Grid2>
        </Section>

        {/* Property */}
        <Section title="Property Details" icon={<Home className="w-4 h-4" />}>
          <Grid2>
            <DV label="List Price" value={fmtPrice(listing.list_price)} />
            <DV label="Est. Value" value={fmtPrice(listing.estimated_value)} />
            <DV label="Beds / Baths" value={`${fmt(listing.beds)} / ${fmt(listing.baths)}`} />
            <DV label="Sq Ft" value={listing.square_feet ? Number(listing.square_feet).toLocaleString() : '—'} />
            <DV label="Lot Size" value={fmt(listing.lot_size)} />
            <DV label="Year Built" value={fmt(listing.year_built)} />
            <DV label="Property Type" value={fmt(listing.property_type)} />
            <DV label="Days on Market" value={fmt(listing.days_on_market)} />
            {listing.listing_remarks && <DV label="Remarks" value={listing.listing_remarks} span2 />}
          </Grid2>
        </Section>

        {/* Owner */}
        <Section title="Owner Details" icon={<User className="w-4 h-4" />}>
          <Grid2>
            <DV label="Owner 1" value={`${fmt(listing.owner_1_first_name)} ${fmt(listing.owner_1_last_name)}`.trim() || fmt(listing.owner_name)} span2 />
            {(listing.owner_2_first_name || listing.owner_2_last_name) && <DV label="Owner 2" value={`${listing.owner_2_first_name || ''} ${listing.owner_2_last_name || ''}`.trim()} span2 />}
            <DV label="Ownership Length" value={listing.ownership_length_years ? `${listing.ownership_length_years} yrs` : '—'} />
            <DV label="Owner Occupied" value={listing.owner_occupied ? 'Yes' : 'No'} />
            <DV label="Deceased Owner" value={listing.deceased_owner ? 'Yes' : '—'} />
            <DV label="Litigator" value={listing.litigator ? 'Yes' : '—'} />
            <DV label="Mailing Address" value={listing.owner_mailing_address ? `${listing.owner_mailing_address}, ${listing.owner_mailing_city || ''} ${listing.owner_mailing_state || ''} ${listing.owner_mailing_zip || ''}` : '—'} span2 />
            {listing.mailing_care_of_name && <DV label="Care Of" value={listing.mailing_care_of_name} span2 />}
            <DV label="Do Not Mail" value={listing.do_not_mail ? 'Yes' : 'No'} />
          </Grid2>
        </Section>

        {/* Phones & Emails */}
        <Section title="Contact Info" icon={<Phone className="w-4 h-4" />}>
          <Grid2>
            {[1,2,3,4,5].map(n => listing[`phone_${n}`] ? (
              <DV key={n} label={`Phone ${n}${listing[`phone_${n}_type`] ? ` (${listing[`phone_${n}_type`]})` : ''}${listing[`phone_${n}_dnc`] ? ' ⛔' : ''}`}
                value={<a href={`tel:${listing[`phone_${n}`]}`} className="text-blue-600 underline">{listing[`phone_${n}`]}</a>} />
            ) : null)}
            {[1,2,3,4].map(n => listing[`email_${n}`] ? (
              <DV key={`e${n}`} label={`Email ${n}`}
                value={<a href={`mailto:${listing[`email_${n}`]}`} className="text-blue-600 underline truncate block">{listing[`email_${n}`]}</a>} />
            ) : null)}
          </Grid2>
        </Section>

        {/* Financials */}
        <Section title="Financials" icon={<Building2 className="w-4 h-4" />}>
          <Grid2>
            <DV label="Equity Estimate" value={fmtPrice(listing.equity_estimate)} />
            <DV label="Mortgage Balance" value={fmtPrice(listing.mortgage_balance)} />
            <DV label="Est. LTV %" value={listing.estimated_ltv ? `${listing.estimated_ltv}%` : '—'} />
            <DV label="Open Loans" value={fmt(listing.total_open_loans)} />
            <DV label="Last Sale Amount" value={fmtPrice(listing.last_sale_amount)} />
            <DV label="Last Sale Date" value={fmt(listing.last_sale_date)} />
            {listing.lien_indicator && <>
              <DV label="Lien Amount" value={fmtPrice(listing.lien_amount)} />
              <DV label="Lien Date" value={fmt(listing.lien_date)} />
            </>}
            {listing.preforeclosure_indicator && <>
              <DV label="PreFC Unpaid Bal" value={fmtPrice(listing.prefc_unpaid_balance)} />
              <DV label="PreFC Auction Date" value={fmt(listing.prefc_auction_date)} />
              <DV label="PreFC Doc #" value={fmt(listing.prefc_doc_number)} />
            </>}
          </Grid2>
        </Section>

        {/* Agent */}
        <Section title="Listing Agent" icon={<Building2 className="w-4 h-4" />}>
          <Grid2>
            <DV label="Agent" value={fmt(listing.listing_agent_name)} />
            <DV label="Brokerage" value={fmt(listing.listing_brokerage)} />
            <DV label="Email" value={listing.listing_agent_email ? (
              <a href={`mailto:${listing.listing_agent_email}`} className="text-blue-600 underline">{listing.listing_agent_email}</a>
            ) : '—'} />
            <DV label="Phone" value={listing.listing_agent_phone ? (
              <a href={`tel:${listing.listing_agent_phone}`} className="text-blue-600 underline">{listing.listing_agent_phone}</a>
            ) : '—'} />
          </Grid2>
        </Section>

        {/* Territory */}
        <Section title="Territory & Assignment" icon={<MapPin className="w-4 h-4" />}>
          <Grid2>
            <DV label="FIPS Code" value={fmt(listing.fips_code)} />
            <DV label="County" value={fmt(listing.county)} />
            <DV label="Territory" value={listing.territory_name || 'Not matched'} />
            <DV label="Territory ID" value={fmt(listing.territory_id)} />
            <DV label="Matched Operators" value={(listing.matched_operator_ids || []).length} />
            <DV label="Assigned Operator ID" value={fmt(listing.assigned_operator_id)} />
            <DV label="Assigned Agent ID" value={fmt(listing.assigned_agent_id)} />
            <DV label="APN" value={fmt(listing.apn)} />
            <DV label="Lat / Lng" value={listing.latitude ? `${listing.latitude}, ${listing.longitude}` : '—'} />
            <DV label="Public Source" value={fmt(listing.public_submission_source)} />
          </Grid2>
        </Section>

        {/* Score Breakdown */}
        <Section title="Estate Sale Score Breakdown" icon={<Star className="w-4 h-4" />}>
          {(listing.score_reasons || []).length > 0 ? (
            <ul className="space-y-1">
              {listing.score_reasons.map((r, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className={r.includes('negative') ? 'text-red-500' : 'text-green-600'}>
                    {r.includes('negative') ? '−' : '+'}
                  </span>
                  <span className="text-slate-700">{r}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-400 text-sm">No score reasons yet. Run scoring first.</p>}
        </Section>

        {/* Agent Email */}
        <Section title="Agent Outreach Email" icon={<Mail className="w-4 h-4" />}>
          {listing.email_body ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={EMAIL_STATUS_COLORS[listing.email_status] || ''}>{listing.email_status}</Badge>
                <select value={listing.email_status} onChange={e => updateStatus('email_status', e.target.value)} className="text-xs border rounded px-2 py-1">
                  {['draft', 'ready', 'sent', 'replied', 'interested', 'not_interested'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setEmailOpen(!emailOpen)} className="text-xs text-blue-600 flex items-center gap-1 mb-2">
                {emailOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {emailOpen ? 'Collapse' : 'View email'}
              </button>
              {emailOpen && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-2">
                  <p className="font-medium text-slate-700">Subject: {listing.email_subject}</p>
                  <pre className="whitespace-pre-wrap text-slate-600 font-sans text-xs">{listing.email_body}</pre>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`Subject: ${listing.email_subject}\n\n${listing.email_body}`)}>
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button size="sm" onClick={generateEmail} disabled={generatingEmail} className="bg-blue-600 hover:bg-blue-700 text-white">
              {generatingEmail ? <Loader className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
              Generate Email
            </Button>
          )}
        </Section>

        {/* Operator Message */}
        {listing.operator_message_body && (
          <Section title="Operator Message" icon={<CheckCircle className="w-4 h-4" />}>
            <button onClick={() => setOpMsgOpen(!opMsgOpen)} className="text-xs text-blue-600 flex items-center gap-1 mb-2">
              {opMsgOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {opMsgOpen ? 'Collapse' : 'View message'}
            </button>
            {opMsgOpen && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-2">
                <p className="font-medium text-slate-700">Subject: {listing.operator_message_subject}</p>
                <pre className="whitespace-pre-wrap text-slate-600 font-sans text-xs">{listing.operator_message_body}</pre>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(listing.operator_message_body)}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
            )}
          </Section>
        )}

        {/* Agent Submission */}
        {listing.agent_submitted_to_pool && (
          <Section title="Agent Submission" icon={<CheckCircle className="w-4 h-4 text-green-500" />}>
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Agent Submitted to Pool
              </span>
            </div>
            <Grid2>
              <DV label="Submitter" value={`${listing.agent_submitter_first_name || ''} ${listing.agent_submitter_last_name || ''}`.trim() || '—'} />
              <DV label="Brokerage" value={listing.agent_submitter_brokerage || '—'} />
              <DV label="Email" value={listing.agent_submitter_email ? <a href={`mailto:${listing.agent_submitter_email}`} className="text-blue-600 underline">{listing.agent_submitter_email}</a> : '—'} />
              <DV label="Phone" value={listing.agent_submitter_phone || '—'} />
              <DV label="Preferred Contact" value={listing.agent_preferred_contact_method || '—'} />
              <DV label="Best Time" value={listing.agent_best_contact_time || '—'} />
              <DV label="Timeline" value={listing.requested_estate_sale_timeline || '—'} />
              <DV label="Help Type" value={listing.requested_help_type || '—'} />
              <DV label="Contents Level" value={listing.home_contents_level || '—'} />
              <DV label="Seller Situation" value={listing.seller_situation || '—'} />
              <DV label="Target Close Date" value={listing.target_closing_date || '—'} />
              <DV label="Submission Status" value={listing.agent_submission_status || '—'} />
              {listing.operator_notes_from_agent && <DV label="Agent Notes" value={listing.operator_notes_from_agent} span2 />}
              <DV label="Submitted" value={listing.agent_submission_date ? new Date(listing.agent_submission_date).toLocaleDateString() : '—'} />
            </Grid2>
          </Section>
        )}

        {/* Notes */}
        <Section title="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes…" className="text-sm" />
          <Button size="sm" onClick={saveNotes} disabled={saving} className="mt-2">
            {saving ? 'Saving…' : 'Save Notes'}
          </Button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-slate-500">{icon}</span>}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-3">{children}</div>
    </div>
  );
}

function Grid2({ children }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function DV({ label, value, span2 }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value ?? '—'}</p>
    </div>
  );
}