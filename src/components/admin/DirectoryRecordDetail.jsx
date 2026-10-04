import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Compact label map for the record's fields, grouped for scanning
const GROUPS = [
  { label: 'Identity', fields: [
    ['company_name', 'Company'], ['owner_name', 'Owner'], ['membership_tier', 'Tier'],
    ['member_since', 'Member Since'], ['years_in_business', 'Years in Business'],
    ['sales_posted', 'Sales Posted'], ['active_sales_count', 'Active Sales'],
  ]},
  { label: 'Contact', fields: [
    ['phone', 'Phone'], ['phone_normalized', 'Phone (normalized)'], ['email', 'Email'],
    ['website', 'Website'], ['profile_url', 'ES.org Profile'], ['source_url', 'ES.net Profile'],
    ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['twitter', 'Twitter'],
    ['youtube', 'YouTube'], ['pinterest', 'Pinterest'],
  ]},
  { label: 'Location', fields: [
    ['city', 'City'], ['state', 'State'], ['zip_code', 'ZIP'], ['county', 'County'],
    ['geocoded_address', 'Geocoded Address'], ['geocoded_city', 'Geocoded City'],
    ['geocoded_county', 'Geocoded County'], ['geocoded_zip', 'Geocoded ZIP'],
    ['geocode_status', 'Geocode Status'], ['geocode_last_run', 'Geocode Last Run'],
  ]},
  { label: 'Enrichment & Outreach', fields: [
    ['email_confidence_score', 'Email Confidence'], ['email_verified_status', 'Email Verified'],
    ['email_source_type', 'Email Source Type'], ['email_source_url', 'Email Source URL'],
    ['email_last_checked', 'Email Last Checked'], ['enrichment_status', 'Enrichment Status'],
    ['enrichment_notes', 'Enrichment Notes'], ['outreach_status', 'Outreach Status'],
    ['do_not_contact', 'Do Not Contact'], ['unsubscribe_status', 'Unsubscribed'],
  ]},
  { label: 'Claim / Trial / Subscription', fields: [
    ['claim_status', 'Claim Status'], ['claim_verification_status', 'Claim Verification'],
    ['claimed_listing', 'Claimed'], ['claimed_date', 'Claimed Date'],
    ['claim_contact_name', 'Claim Contact'], ['claim_contact_email', 'Claim Email'],
    ['claim_contact_phone', 'Claim Phone'], ['claim_notes', 'Claim Notes'],
    ['free_trial_started', 'Free Trial Started'], ['free_trial_start_date', 'Trial Start'],
    ['free_trial_end_date', 'Trial End'], ['subscription_status', 'Subscription'],
    ['claimed_by_user_id', 'Claimed By User'], ['lead_access_enabled', 'Lead Access'],
  ]},
  { label: 'System', fields: [
    ['company_id', 'Company ID'], ['package_type', 'Package Type'], ['lead_stage', 'Lead Stage'],
    ['lead_source', 'Lead Source'], ['process_status', 'Process Status'], ['dedup_key', 'Dedup Key'],
    ['source_id', 'Source ID'], ['name_state_key', 'Name+State Key'], ['merge_status', 'Merge Status'],
    ['sources', 'Sources'], ['territory_match_status', 'Territory Match'],
    ['territory_ids', 'Territory IDs'], ['audience_sync_status', 'Audience Sync'],
    ['meta_custom_audience_id', 'Meta Audience ID'], ['last_synced_at', 'Last Synced'],
    ['last_scraped_at', 'Last Scraped'], ['scrape_status', 'Scrape Status'],
    ['has_facebook', 'Has Facebook'], ['bonded_insured', 'Bonded/Insured'],
    ['award_winner', 'Award Winner'], ['created_date', 'Created'], ['updated_date', 'Updated'],
  ]},
];

const fmt = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  if (typeof v === 'object') return null; // objects skipped (source_record_ids, tags)
  return String(v);
};

export default function DirectoryRecordDetail({ record, onClose }) {
  if (!record) return null;
  return (
    <Dialog open={!!record} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="truncate">{record.company_name || 'Untitled record'}</span>
          </DialogTitle>
          <DialogDescription>Full record details</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[60vh] pr-3">
          <div className="space-y-4 pb-4">
            {GROUPS.map(group => {
              const rows = group.fields
                .map(([key, label]) => [label, fmt(record[key])])
                .filter(([, v]) => v != null);
              if (rows.length === 0) return null;
              return (
                <div key={group.label}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{group.label}</h4>
                  <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-sm border border-slate-100 rounded-lg p-3">
                    {rows.map(([label, value]) => (
                      <React.Fragment key={label}>
                        <span className="text-slate-500">{label}</span>
                        <span className="text-slate-800 break-all">{value}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
            {(record.services_offered || []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Services</h4>
                <div className="flex flex-wrap gap-1">
                  {record.services_offered.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
                </div>
              </div>
            )}
            {(record.about_text || record.notes || '').trim() && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Notes / About</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.about_text || record.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}