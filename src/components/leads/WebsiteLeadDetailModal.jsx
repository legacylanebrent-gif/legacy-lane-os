import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Mail, Phone, Clock, CheckCircle, User, Home, DollarSign, FileText, Tag, Building2 } from 'lucide-react';

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const Field = ({ label, value, link }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      {link ? (
        <a href={link} className="text-cyan-600 hover:underline break-all text-sm">{value}</a>
      ) : (
        <p className="text-slate-800 text-sm break-words">{value}</p>
      )}
    </div>
  );
};

const Section = ({ icon: Icon, title, children }) => (
  <div className="border border-slate-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-slate-400" />
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
  </div>
);

const formatBool = (v) => v ? 'Yes' : 'No';
const formatArr = (v) => Array.isArray(v) ? v.join(', ') : v;
const formatDate = (v) => v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
const formatDateTime = (v) => v ? new Date(v).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
const formatMoney = (v) => (v !== null && v !== undefined) ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null;

export default function WebsiteLeadDetailModal({ lead, open, onOpenChange, operators, onAssign, onMarkConverted }) {
  const [assignId, setAssignId] = useState('');

  if (!lead) return null;

  const phones = [];
  for (let i = 1; i <= 5; i++) {
    const num = lead[`contact_phone${i > 1 ? `_${i}` : ''}`];
    if (num) phones.push({ number: num, type: lead[`contact_phone${i > 1 ? `_${i}` : ''}_type`], dnc: lead[`contact_phone${i > 1 ? `_${i}` : ''}_dnc`] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col [&>button]:hidden">
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-800 text-white z-10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <DialogHeader className="flex-none">
          <DialogTitle className="text-2xl font-serif">Website Lead</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4 space-y-4 mt-2">
          {/* Score + Name */}
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${getScoreColor(lead.score || 0)}`}>
              {lead.score || 0}
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900">{lead.contact_name || 'Unknown'}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {lead.lead_status === 'in_progress' && <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>}
                {lead.lead_status === 'submitted' && <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>}
                {lead.converted ? <Badge className="bg-green-100 text-green-800">Converted</Badge>
                  : lead.routed_to ? <Badge className="bg-cyan-100 text-cyan-800">Assigned</Badge>
                  : <Badge className="bg-orange-100 text-orange-800">New</Badge>}
                {lead.website_page && <Badge className="bg-slate-100 text-slate-700">{lead.website_page}</Badge>}
              </div>
            </div>
          </div>

          {/* Quick contact grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {lead.contact_email && <Field label="Email" value={lead.contact_email} link={`mailto:${lead.contact_email}`} />}
            {lead.contact_phone && <Field label="Phone" value={lead.contact_phone} link={`tel:${lead.contact_phone}`} />}
            {lead.timeline && <Field label="Timeline" value={formatLabel(lead.timeline)} />}
            {lead.intent && <Field label="Intent" value={formatLabel(lead.intent)} />}
            {lead.situation && <Field label="Situation" value={formatLabel(lead.situation)} />}
            {lead.estimated_value != null && <Field label="Est. Value" value={formatMoney(lead.estimated_value)} />}
          </div>

          {/* Property Address */}
          {lead.property_address && (
            <div className="flex items-start gap-2 p-3 bg-cyan-50 rounded-lg">
              <MapPin className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-800">{lead.property_address}</p>
                {(lead.property_city || lead.property_state || lead.property_zip) && (
                  <p className="text-sm text-slate-600">{[lead.property_city, lead.property_state, lead.property_zip].filter(Boolean).join(', ')}</p>
                )}
                {lead.property_county && <p className="text-xs text-slate-500 mt-0.5">{lead.property_county}</p>}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <Section icon={User} title="Contact Information">
            <Field label="First Name" value={lead.contact_name_first} />
            <Field label="Last Name" value={lead.contact_name_last} />
            <Field label="Contact 2 First" value={lead.contact_name_2_first} />
            <Field label="Contact 2 Last" value={lead.contact_name_2_last} />
            <Field label="Email 2" value={lead.contact_email_2} link={lead.contact_email_2 ? `mailto:${lead.contact_email_2}` : null} />
            <Field label="Email 3" value={lead.contact_email_3} link={lead.contact_email_3 ? `mailto:${lead.contact_email_3}` : null} />
            <Field label="Email 4" value={lead.contact_email_4} link={lead.contact_email_4 ? `mailto:${lead.contact_email_4}` : null} />
            <Field label="Care Of" value={lead.mailing_care_of} />
            {phones.map((p, i) => (
              <Field key={i} label={`Phone ${i + 1}`} value={`${p.number}${p.type ? ` (${p.type})` : ''}${p.dnc ? ' — DNC' : ''}`} link={`tel:${p.number}`} />
            ))}
          </Section>

          {/* Mailing Address */}
          <Section icon={Mail} title="Mailing Address">
            <Field label="Address" value={lead.mailing_address} />
            <Field label="Unit" value={lead.mailing_unit} />
            <Field label="City" value={lead.mailing_city} />
            <Field label="State" value={lead.mailing_state} />
            <Field label="ZIP" value={lead.mailing_zip} />
            <Field label="County" value={lead.mailing_county} />
            <Field label="Do Not Mail" value={lead.do_not_mail != null ? formatBool(lead.do_not_mail) : null} />
          </Section>

          {/* Property Details */}
          <Section icon={Home} title="Property Details">
            <Field label="Unit" value={lead.property_unit} />
            <Field label="County" value={lead.property_county} />
            <Field label="APN" value={lead.property_apn} />
            <Field label="Status" value={lead.property_status} />
            <Field label="Owner Occupied" value={lead.owner_occupied != null ? formatBool(lead.owner_occupied) : null} />
            <Field label="Litigator" value={lead.litigator != null ? formatBool(lead.litigator) : null} />
            <Field label="Latitude" value={lead.property_latitude} />
            <Field label="Longitude" value={lead.property_longitude} />
          </Section>

          {/* Sale Preferences */}
          <Section icon={Tag} title="Sale Preferences">
            <Field label="Home Size" value={lead.home_size} />
            <Field label="Gated Community" value={lead.gated_community != null ? formatBool(lead.gated_community) : null} />
            <Field label="Sales Allowed" value={lead.sales_allowed} />
            <Field label="Amount to Sell" value={lead.amount_to_sell} />
            <Field label="Home on Market" value={lead.home_on_market != null ? formatBool(lead.home_on_market) : null} />
            <Field label="Service Type" value={formatArr(lead.service_type)} />
            <div className="col-span-2">
              <Field label="Items to Sell" value={formatArr(lead.items_to_sell)} />
            </div>
          </Section>

          {/* Lead Management */}
          <Section icon={FileText} title="Lead Management">
            <Field label="Source" value={formatLabel(lead.source)} />
            <Field label="Source Details" value={lead.source_details} />
            <Field label="Lead Status" value={formatLabel(lead.lead_status)} />
            <Field label="Current Step" value={lead.current_step} />
            <Field label="Score" value={lead.score} />
            <Field label="Converted" value={lead.converted != null ? formatBool(lead.converted) : null} />
            <Field label="Conversion Date" value={formatDateTime(lead.conversion_date)} />
            <Field label="Revenue Generated" value={formatMoney(lead.revenue_generated)} />
            <Field label="Ad Platform" value={lead.ad_platform} />
            <Field label="Ad Campaign" value={lead.ad_campaign} />
            <Field label="Website Page" value={lead.website_page} />
            <Field label="Routed To" value={lead.routed_to} />
          </Section>

          {/* Referral Info */}
          <Section icon={DollarSign} title="Referral Information">
            <Field label="Referral Eligible" value={lead.referral_eligible != null ? formatBool(lead.referral_eligible) : null} />
            <Field label="Est. Referral Fee" value={formatMoney(lead.estimated_referral_fee)} />
            <Field label="Referral Status" value={formatLabel(lead.referral_status)} />
            <Field label="Referral Accepted" value={formatDateTime(lead.referral_accepted_at)} />
            <Field label="Referral Paid" value={formatDateTime(lead.referral_paid_at)} />
            <Field label="Referral Paid Amount" value={formatMoney(lead.referral_paid_amount)} />
          </Section>

          {/* Propstream Data */}
          {(lead.propstream_id || lead.propstream_market_value || lead.propstream_equity) && (
            <Section icon={Building2} title="Propstream Data">
              <Field label="Propstream ID" value={lead.propstream_id} />
              <Field label="Equity" value={formatMoney(lead.propstream_equity)} />
              <Field label="Market Value" value={formatMoney(lead.propstream_market_value)} />
              <Field label="Loan Amount" value={formatMoney(lead.propstream_loan_amount)} />
              <Field label="Owner Type" value={lead.propstream_owner_type} />
              <Field label="Property Type" value={lead.propstream_property_type} />
              <Field label="Beds" value={lead.propstream_beds} />
              <Field label="Baths" value={lead.propstream_baths} />
              <Field label="Sqft" value={lead.propstream_sqft} />
              <Field label="Lot Size" value={lead.propstream_lot_size} />
              <Field label="Year Built" value={lead.propstream_year_built} />
              <Field label="Zoning" value={lead.propstream_zoning} />
              <Field label="Last Sale Date" value={formatDate(lead.propstream_last_sale_date)} />
              <Field label="Last Sale Price" value={formatMoney(lead.propstream_last_sale_price)} />
            </Section>
          )}

          {/* Property Valuation */}
          {(lead.total_assessed_value || lead.total_open_loans || lead.est_remaining_balance_loans) && (
            <Section icon={DollarSign} title="Property Valuation & Loans">
              <Field label="Total Assessed Value" value={formatMoney(lead.total_assessed_value)} />
              <Field label="Total Open Loans" value={lead.total_open_loans} />
              <Field label="Est. Remaining Balance" value={formatMoney(lead.est_remaining_balance_loans)} />
              <Field label="Est. Loan-to-Value" value={lead.est_loan_to_value != null ? `${lead.est_loan_to_value}%` : null} />
              <Field label="Lien Amount" value={formatMoney(lead.lien_amount)} />
              <Field label="MLS Status" value={lead.mls_status} />
              <Field label="MLS Date" value={formatDate(lead.mls_date)} />
              <Field label="MLS Amount" value={formatMoney(lead.mls_amount)} />
            </Section>
          )}

          {/* Property Condition */}
          {(lead.total_condition || lead.interior_condition || lead.exterior_condition) && (
            <Section icon={Home} title="Property Condition">
              <Field label="Total Condition" value={lead.total_condition} />
              <Field label="Interior" value={lead.interior_condition} />
              <Field label="Exterior" value={lead.exterior_condition} />
              <Field label="Bathroom" value={lead.bathroom_condition} />
              <Field label="Kitchen" value={lead.kitchen_condition} />
              <Field label="Foreclosure Factor" value={lead.foreclosure_factor} />
            </Section>
          )}

          {/* Marketing Activity */}
          {(lead.marketing_lists || lead.marketing_campaigns || lead.emails) && (
            <Section icon={Tag} title="Marketing Activity">
              <Field label="Marketing Lists" value={lead.marketing_lists} />
              <Field label="Marketing Campaigns" value={lead.marketing_campaigns} />
              <Field label="Voicemail Drops" value={lead.voicemail_drops} />
              <Field label="Dialer" value={lead.dialer} />
              <Field label="Postcards" value={lead.postcards} />
              <Field label="Emails" value={lead.emails} />
              <Field label="Skip Traces" value={lead.skip_traces} />
              <Field label="Date Added to List" value={formatDateTime(lead.date_added_to_list)} />
              <Field label="Method of Add" value={lead.method_of_add} />
            </Section>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Assignment */}
          {!lead.converted && (
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Assign to operator</p>
              {lead.routed_to ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-100 text-cyan-800">
                    {operators.find(o => o.id === lead.routed_to)?.company_name || operators.find(o => o.id === lead.routed_to)?.full_name || 'Assigned'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => onMarkConverted(lead.id)} className="ml-auto">
                    <CheckCircle className="w-4 h-4 mr-1" /> Mark Converted
                  </Button>
                </div>
              ) : (
                <Select value={assignId} onValueChange={(opId) => { setAssignId(opId); onAssign(lead.id, opId); }}>
                  <SelectTrigger><SelectValue placeholder="Select Estate Sale Company Owner..." /></SelectTrigger>
                  <SelectContent>
                    {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none flex items-center gap-2 pt-3 border-t text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Created: {formatDateTime(lead.created_date)}</span>
          {lead.updated_date && <span className="ml-4">Updated: {formatDateTime(lead.updated_date)}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}