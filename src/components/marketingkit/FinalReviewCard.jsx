// Chapter 18 P1-14/P1-45 — FINAL ACCURACY REVIEW. Assembled live from
// canonical sale truth; approval is always an explicit human action (AI never
// approves). Drafts are snapshots — sent/published external content never
// updates automatically; the public sale page is the current digital truth.
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Loader2, CheckCircle2 } from 'lucide-react';

const Row = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:gap-3 py-1.5 border-b border-slate-100 last:border-0">
    <div className="text-xs font-medium text-slate-500 sm:w-40 shrink-0">{label}</div>
    <div className="text-sm text-slate-800">{children}</div>
  </div>
);

export default function FinalReviewCard({ review, finalReview, onApprove, approving }) {
  if (!review) return null;
  const approved = !!(finalReview && finalReview.approved_at);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-cyan-700" /> Final accuracy review
        </div>
        <Button size="sm" onClick={onApprove} disabled={approving || approved}>
          {approving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
          {approved ? 'Approved' : 'Approve for marketing'}
        </Button>
      </div>
      <div className="mb-3">
        {approved ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Approved by {finalReview.approved_by_name || 'operator'} on {new Date(finalReview.approved_at).toLocaleString()}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-500">Not yet approved — human approval required before marketing goes out</Badge>
        )}
      </div>
      <Row label="Dates & hours">
        {(review.dates || []).length === 0 ? <span className="text-slate-400">None set</span> : (
          <span>{review.dates.map(d => `${d.date}${d.start_time ? ` ${d.start_time}–${d.end_time}` : ''}`).join(' · ')}</span>
        )}
      </Row>
      <Row label="Location">{review.location && (review.location.city || review.location.state) ? `${review.location.city || ''}${review.location.city && review.location.state ? ', ' : ''}${review.location.state || ''}` : <span className="text-slate-400">City/state missing</span>}</Row>
      <Row label="Payment methods">{(review.payment_methods || []).join(', ') || <span className="text-slate-400">None listed</span>}</Row>
      <Row label="Parking">{review.parking_info || <span className="text-slate-400">None</span>}</Row>
      <Row label="Policies / notes">{review.special_notes || <span className="text-slate-400">None</span>}</Row>
      <Row label="Categories">{(review.categories || []).join(', ') || <span className="text-slate-400">None</span>}</Row>
      <Row label="Discount stages">
        {(review.discount_stages || []).length === 0 ? <span className="text-slate-400">No planned discount stages</span> : (
          <span>{review.discount_stages.map(s => `${s.name || 'Stage'}${s.percent != null ? ` (${s.percent}% off)` : ''}`).join(' · ')}</span>
        )}
      </Row>
      <Row label="Pickup window">{review.pickup_window || <span className="text-slate-400">No default pickup window</span>}</Row>
      <Row label="Featured picks">
        {(review.featured || []).length === 0 ? <span className="text-slate-400">No canonical Item picks</span> : (
          <span>{review.featured.map(f => `${f.title || 'Item'}${f.status && f.status !== 'available' ? ' (no longer available!)' : ''}`).join(' · ')}</span>
        )}
      </Row>
      <Row label="Photos">{review.approved_photo_count} approved for marketing ({review.eligible_photo_count} eligible)</Row>
      <Row label="Merchandise">{review.item_count} items on this sale</Row>
      <p className="text-xs text-slate-500 mt-3">
        Assembled live from your records at review time. Drafts are point-in-time snapshots — sent email/SMS, published social posts and print never update automatically; the public sale page is the current digital truth.
      </p>
    </div>
  );
}