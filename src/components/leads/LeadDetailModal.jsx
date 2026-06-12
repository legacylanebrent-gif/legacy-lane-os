import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

const FieldRow = ({ label, value, mono }) => {
  if (value === undefined || value === null || value === '') return null;
  const isReactEl = React.isValidElement(value);
  const boolClass = typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-500') : '';
  const display = isReactEl ? null : (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value));
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      {isReactEl ? (
        <div className="text-sm">{value}</div>
      ) : (
        <p className={`text-sm ${mono ? 'font-mono' : ''} ${boolClass} text-slate-700`}>{display}</p>
      )}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="space-y-2 border-t pt-3">
    <p className="font-semibold text-sm text-slate-800">{title}</p>
    <div className="grid grid-cols-2 gap-3 text-sm">{children}</div>
  </div>
);

export default function LeadDetailModal({ lead, operators, onAssign, onMarkConverted, open, onOpenChange }) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg">Propstream Lead Detail</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${getScoreColor(lead.score || 0)}`}>{lead.score || 0}</div>
              <div>
                <p className="font-bold text-lg">{lead.contact_name || 'Unknown Owner'}</p>
                {lead.propstream_owner_type && <Badge className="bg-purple-100 text-purple-700">{lead.propstream_owner_type}</Badge>}
                {lead.propstream_id && <p className="text-xs text-slate-500 mt-1">PS ID: {lead.propstream_id}</p>}
              </div>
            </div>

            {/* Contact Information - All Fields */}
            <Section title="Contact Information">
              <FieldRow label="Full Name" value={lead.contact_name} />
              <FieldRow label="First Name" value={lead.contact_name_first} />
              <FieldRow label="Last Name" value={lead.contact_name_last} />
              <FieldRow label="Co-Owner" value={[lead.contact_name_2_first, lead.contact_name_2_last].filter(Boolean).join(' ') || null} />

              <FieldRow label="Email 1" value={lead.contact_email ? <a href={`mailto:${lead.contact_email}`} className="text-cyan-600 hover:underline">{lead.contact_email}</a> : null} />
              <FieldRow label="Email 2" value={lead.contact_email_2 ? <a href={`mailto:${lead.contact_email_2}`} className="text-cyan-600 hover:underline">{lead.contact_email_2}</a> : null} />
              <FieldRow label="Email 3" value={lead.contact_email_3 ? <a href={`mailto:${lead.contact_email_3}`} className="text-cyan-600 hover:underline">{lead.contact_email_3}</a> : null} />
              <FieldRow label="Email 4" value={lead.contact_email_4 ? <a href={`mailto:${lead.contact_email_4}`} className="text-cyan-600 hover:underline">{lead.contact_email_4}</a> : null} />

              <FieldRow label="Phone 1" value={lead.contact_phone} />
              <FieldRow label="Phone 1 Type" value={lead.contact_phone_1_type} />
              <FieldRow label="Phone 1 DNC" value={lead.contact_phone_1_dnc} />
              <FieldRow label="Phone 2" value={lead.contact_phone_2} />
              <FieldRow label="Phone 2 Type" value={lead.contact_phone_2_type} />
              <FieldRow label="Phone 2 DNC" value={lead.contact_phone_2_dnc} />
              <FieldRow label="Phone 3" value={lead.contact_phone_3} />
              <FieldRow label="Phone 3 Type" value={lead.contact_phone_3_type} />
              <FieldRow label="Phone 3 DNC" value={lead.contact_phone_3_dnc} />
              <FieldRow label="Phone 4" value={lead.contact_phone_4} />
              <FieldRow label="Phone 4 Type" value={lead.contact_phone_4_type} />
              <FieldRow label="Phone 4 DNC" value={lead.contact_phone_4_dnc} />
              <FieldRow label="Phone 5" value={lead.contact_phone_5} />
              <FieldRow label="Phone 5 Type" value={lead.contact_phone_5_type} />
              <FieldRow label="Phone 5 DNC" value={lead.contact_phone_5_dnc} />
            </Section>

            {/* Property Address */}
            <Section title="Property Address">
              <FieldRow label="Street" value={lead.property_address} />
              <FieldRow label="Unit" value={lead.property_unit} />
              <FieldRow label="City" value={lead.property_city} />
              <FieldRow label="State" value={lead.property_state} />
              <FieldRow label="ZIP" value={lead.property_zip} />
              <FieldRow label="County" value={lead.property_county} />
              <FieldRow label="APN" value={lead.property_apn} />
              <FieldRow label="Latitude" value={lead.property_latitude} />
              <FieldRow label="Longitude" value={lead.property_longitude} />
            </Section>

            {/* Mailing Address */}
            <Section title="Mailing Address">
              <FieldRow label="Care Of" value={lead.mailing_care_of} />
              <FieldRow label="Street" value={lead.mailing_address} />
              <FieldRow label="Unit" value={lead.mailing_unit} />
              <FieldRow label="City" value={lead.mailing_city} />
              <FieldRow label="State" value={lead.mailing_state} />
              <FieldRow label="ZIP" value={lead.mailing_zip} />
              <FieldRow label="County" value={lead.mailing_county} />
              <FieldRow label="Do Not Mail" value={lead.do_not_mail} />
            </Section>

            {/* Property Details */}
            <Section title="Property Details">
              <FieldRow label="Est. Value" value={lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : null} />
              <FieldRow label="Equity" value={lead.propstream_equity ? `$${Number(lead.propstream_equity).toLocaleString()}` : null} />
              <FieldRow label="Market Value" value={lead.propstream_market_value ? `$${Number(lead.propstream_market_value).toLocaleString()}` : null} />
              <FieldRow label="Assessed Value" value={lead.total_assessed_value ? `$${Number(lead.total_assessed_value).toLocaleString()}` : null} />
              <FieldRow label="Beds" value={lead.propstream_beds} />
              <FieldRow label="Baths" value={lead.propstream_baths} />
              <FieldRow label="Sq Ft" value={lead.propstream_sqft ? Number(lead.propstream_sqft).toLocaleString() : null} />
              <FieldRow label="Lot Size" value={lead.propstream_lot_size} />
              <FieldRow label="Year Built" value={lead.propstream_year_built} />
              <FieldRow label="Property Type" value={lead.propstream_property_type} />
              <FieldRow label="Zoning" value={lead.propstream_zoning} />
              <FieldRow label="Home Size" value={lead.home_size} />
              <FieldRow label="Property Status" value={lead.property_status} />
              <FieldRow label="Sales Allowed" value={lead.sales_allowed} />
              <FieldRow label="Owner Occupied" value={lead.owner_occupied} />
              <FieldRow label="Gated Community" value={lead.gated_community} />
              <FieldRow label="Litigator" value={lead.litigator} />
            </Section>

            {/* Condition */}
            <Section title="Condition">
              <FieldRow label="Overall" value={lead.total_condition} />
              <FieldRow label="Interior" value={lead.interior_condition} />
              <FieldRow label="Exterior" value={lead.exterior_condition} />
              <FieldRow label="Bathrooms" value={lead.bathroom_condition} />
              <FieldRow label="Kitchen" value={lead.kitchen_condition} />
            </Section>

            {/* Loan & Title */}
            <Section title="Loan & Title">
              <FieldRow label="Open Loans" value={lead.total_open_loans} />
              <FieldRow label="Est. Remaining Balance" value={lead.est_remaining_balance_loans ? `$${Number(lead.est_remaining_balance_loans).toLocaleString()}` : null} />
              <FieldRow label="Loan-to-Value" value={lead.est_loan_to_value != null ? `${(lead.est_loan_to_value * 100).toFixed(1)}%` : null} />
              <FieldRow label="Lien Amount" value={lead.lien_amount ? `$${Number(lead.lien_amount).toLocaleString()}` : null} />
              <FieldRow label="Lien Type" value={lead.lien_type} />
              <FieldRow label="Foreclosure Factor" value={lead.foreclosure_factor} />
            </Section>

            {/* Sales History */}
            <Section title="Sales History">
              <FieldRow label="Last Sale Date" value={lead.propstream_last_sale_date ? new Date(lead.propstream_last_sale_date).toLocaleDateString() : null} />
              <FieldRow label="Last Sale Price" value={lead.propstream_last_sale_price ? `$${Number(lead.propstream_last_sale_price).toLocaleString()}` : null} />
              <FieldRow label="MLS Status" value={lead.mls_status} />
              <FieldRow label="MLS Date" value={lead.mls_date ? new Date(lead.mls_date).toLocaleDateString() : null} />
              <FieldRow label="MLS Amount" value={lead.mls_amount ? `$${Number(lead.mls_amount).toLocaleString()}` : null} />
            </Section>

            {/* Lead Info */}
            <Section title="Lead Info">
              <FieldRow label="Source" value={lead.source} />
              <FieldRow label="Source Details" value={lead.source_details} />
              <FieldRow label="Situation" value={lead.situation} />
              <FieldRow label="Timeline" value={lead.timeline ? lead.timeline.replace(/_/g, ' ') : null} />
              <FieldRow label="Intent" value={lead.intent} />
              <FieldRow label="Website Page" value={lead.website_page} />
              <FieldRow label="Date Added to List" value={lead.date_added_to_list ? new Date(lead.date_added_to_list).toLocaleString() : null} />
              <FieldRow label="Method of Add" value={lead.method_of_add} />
            </Section>

            {/* Marketing Activity */}
            <Section title="Marketing Activity">
              <FieldRow label="Lists" value={lead.marketing_lists} />
              <FieldRow label="Campaigns" value={lead.marketing_campaigns} />
              <FieldRow label="VM Drops" value={lead.voicemail_drops} />
              <FieldRow label="Dialer" value={lead.dialer} />
              <FieldRow label="Postcards" value={lead.postcards} />
              <FieldRow label="Emails" value={lead.emails} />
              <FieldRow label="Skip Traces" value={lead.skip_traces} />
            </Section>

            {/* Notes */}
            {lead.notes && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm border-t pt-3">
                <p className="font-medium mb-1">Notes</p>
                <p className="text-slate-600">{lead.notes}</p>
              </div>
            )}

            {/* Assignment */}
            {!lead.routed_to && !lead.converted && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-1">Assign to Estate Sale Company Owner</p>
                <Select onValueChange={(opId) => onAssign(lead.id, opId)}>
                  <SelectTrigger><SelectValue placeholder="Select Estate Sale Company Owner..." /></SelectTrigger>
                  <SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {lead.routed_to && !lead.converted && (
              <div className="border-t pt-3">
                <Button onClick={() => onMarkConverted(lead.id)} className="w-full bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />Mark as Converted</Button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t text-xs text-slate-500">
              <Clock className="w-3 h-3" />Created: {new Date(lead.created_date).toLocaleString()}
              {lead.converted && <Badge className="ml-auto bg-green-100 text-green-800">Converted</Badge>}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}