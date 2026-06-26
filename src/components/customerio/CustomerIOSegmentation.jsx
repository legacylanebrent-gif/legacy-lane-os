import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Users, Tag, Bell, Heart, Crown, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

// Recommended segments — conditions map to traits we send on every identify call
const RECOMMENDED_SEGMENTS = [
  // ── Role-based segments ──
  { group: 'Roles', icon: Tag, color: 'text-blue-600 bg-blue-50', segments: [
    { name: 'Consumers', condition: 'role = consumer', trait: 'role' },
    { name: 'Estate Sale Operators', condition: 'role = estate_sale_operator', trait: 'role' },
    { name: 'Real Estate Agents', condition: 'role = real_estate_agent', trait: 'role' },
    { name: 'Vendors', condition: 'role = vendor', trait: 'role' },
    { name: 'Investors', condition: 'role = investor', trait: 'role' },
    { name: 'Consignors', condition: 'role = consignor', trait: 'role' },
    { name: 'Collectors/Dealers', condition: 'role = collector_dealer', trait: 'role' },
  ]},
  // ── Subscription tier segments ──
  { group: 'Subscription Packages', icon: Crown, color: 'text-amber-600 bg-amber-50', segments: [
    { name: 'Starter Tier', condition: 'subscription_tier = starter', trait: 'subscription_tier' },
    { name: 'Growth Tier', condition: 'subscription_tier = growth', trait: 'subscription_tier' },
    { name: 'Professional Tier', condition: 'subscription_tier = professional', trait: 'subscription_tier' },
    { name: 'Elite Tier', condition: 'subscription_tier = elite', trait: 'subscription_tier' },
    { name: 'Active Subscribers', condition: 'subscription_status = active', trait: 'subscription_status' },
    { name: 'No Subscription', condition: 'subscription_tier = none', trait: 'subscription_tier' },
  ]},
  // ── Notification preference segments ──
  { group: 'Notification Preferences', icon: Bell, color: 'text-purple-600 bg-purple-50', segments: [
    { name: 'EstateSalen Marketing Opt-in', condition: 'estate_salen_marketing = true', trait: 'estate_salen_marketing' },
    { name: 'Local Sale Alerts Opt-in', condition: 'local_sale_notifications = true', trait: 'local_sale_notifications' },
    { name: 'Company Direct Emails Opt-in', condition: 'company_direct_emails = true', trait: 'company_direct_emails' },
    { name: 'Cool Finds Email Digest', condition: 'cool_finds_blog_email = true', trait: 'cool_finds_blog_email' },
    { name: 'Cool Finds In-App Notifications', condition: 'cool_finds_blog_in_app = true', trait: 'cool_finds_blog_in_app' },
    { name: 'All Marketing Opted Out', condition: 'estate_salen_marketing = false AND local_sale_notifications = false AND company_direct_emails = false', trait: 'estate_salen_marketing' },
  ]},
  // ── Favorite company segments ──
  { group: 'Favorite Companies', icon: Heart, color: 'text-rose-600 bg-rose-50', segments: [
    { name: 'Follows Any Operator', condition: 'active_operator_count > 0', trait: 'active_operator_count' },
    { name: 'Follows 5+ Operators', condition: 'active_operator_count >= 5', trait: 'active_operator_count' },
    { name: 'Follows 10+ Operators', condition: 'active_operator_count >= 10', trait: 'active_operator_count' },
    { name: 'Company Direct + Follows Operator', condition: 'company_direct_emails = true AND active_operator_count > 0', trait: 'company_direct_emails' },
  ]},
];

export default function CustomerIOSegmentation() {
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);

  const loadSegments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('customerioService', { action: 'listSegments' });
      if (res.data?.success) {
        setSegments(res.data.segments);
      } else {
        setError(res.data?.error || 'Failed to load segments');
      }
    } catch (err) {
      setError(err.message || 'Failed to load segments');
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Segmentation Strategy
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadSegments} disabled={loading} className="text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Load Existing Segments
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Every <code className="text-xs bg-slate-100 px-1 rounded">identify</code> call sends role, subscription tier, notification preferences, and favorite companies as traits.
          Build segments in Customer.io using these traits — no code changes needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing segments from Customer.io */}
        {segments && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 mb-2">Existing Segments in Customer.io ({Array.isArray(segments) ? segments.length : 0})</p>
            {Array.isArray(segments) && segments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {segments.map(s => (
                  <Badge key={s.id || s.name} variant="outline" className="text-xs">
                    {s.name || s.id}
                    {s.count !== undefined && <span className="ml-1 text-slate-400">({s.count})</span>}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No segments found. Create them in Customer.io using the recipes below.</p>
            )}
          </div>
        )}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            {error}. Make sure <code className="text-xs">CUSTOMERIO_APP_API_KEY</code> is set.
          </div>
        )}

        {/* Recommended segment recipes */}
        <div className="space-y-2">
          {RECOMMENDED_SEGMENTS.map((group, gi) => {
            const Icon = group.icon;
            const isExpanded = expandedGroup === gi;
            return (
              <div key={gi} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : gi)}
                  className="w-full flex items-center gap-2.5 p-3 hover:bg-slate-50 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${group.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{group.group}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{group.segments.length} segments</Badge>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {group.segments.map((seg, si) => (
                      <div key={si} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                        <span className="font-medium text-slate-700 w-56 flex-shrink-0">{seg.name}</span>
                        <code className="text-slate-500 bg-slate-50 px-2 py-1 rounded flex-1 font-mono text-[11px]">{seg.condition}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* How-to */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs text-indigo-800 font-semibold mb-1.5">How to create these segments in Customer.io:</p>
          <ol className="space-y-1 text-xs text-indigo-700">
            <li>1. Go to <span className="font-medium">People → Segments → New Segment</span> in Customer.io</li>
            <li>2. Name it exactly as shown above (e.g. "Estate Sale Operators")</li>
            <li>3. Add a condition: <span className="font-medium">Attribute</span> → select the trait → set the operator and value</li>
            <li>4. Save — the segment auto-populates as identify calls flow in</li>
          </ol>
          <a href="https://fly.customer.io/segments" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium mt-2 hover:underline">
            Open Customer.io Segments <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}