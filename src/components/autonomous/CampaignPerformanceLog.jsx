import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart2, TrendingUp, Users, MousePointerClick, DollarSign, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function CampaignPerformanceLog({ campaign, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rawLogs, setRawLogs] = useState([]);

  useEffect(() => {
    loadStats();
  }, [campaign.id]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Pull any matching SaleMarketingPerformance or MarketingCampaignPerformance logs
      const [perfLogs, campaignPerf] = await Promise.all([
        base44.entities.MarketingCampaignPerformance.filter({ campaign_key: campaign.meta_campaign_id || campaign.id }, '-created_at', 10).catch(() => []),
        base44.entities.SaleMarketingPerformance.list('-created_at', 5).catch(() => []),
      ]);
      setRawLogs(perfLogs);

      // If we have real perf data, aggregate it
      if (perfLogs.length > 0) {
        const latest = perfLogs[0];
        setStats({
          sent_count: latest.sent_count || 0,
          delivered_count: latest.delivered_count || 0,
          opened_count: latest.opened_count || 0,
          clicked_count: latest.clicked_count || 0,
          human_clicked_count: latest.human_clicked_count || 0,
          bounced_count: latest.bounced_count || 0,
          unsubscribed_count: latest.unsubscribed_count || 0,
          open_rate: latest.open_rate || 0,
          click_rate: latest.click_rate || 0,
          human_click_rate: latest.human_click_rate || 0,
          bounce_rate: latest.bounce_rate || 0,
          last_calculated_at: latest.last_calculated_at,
          source: 'live',
        });
      } else {
        // Show placeholder/simulated stats from campaign fields
        setStats({
          meta_campaign_id: campaign.meta_campaign_id,
          status: campaign.status,
          daily_budget: campaign.daily_budget,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          source: 'campaign_fields',
        });
      }
    } catch (_) {}
    setLoading(false);
  };

  const metricCards = stats?.source === 'live' ? [
    { label: 'Sent', value: stats.sent_count?.toLocaleString(), icon: Users, color: 'text-slate-600' },
    { label: 'Opened', value: stats.opened_count?.toLocaleString(), sub: `${(stats.open_rate * 100 || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Clicks (Human)', value: stats.human_clicked_count?.toLocaleString(), sub: `${(stats.human_click_rate * 100 || 0).toFixed(1)}%`, icon: MousePointerClick, color: 'text-indigo-600' },
    { label: 'Bounced', value: stats.bounced_count?.toLocaleString(), sub: `${(stats.bounce_rate * 100 || 0).toFixed(1)}%`, icon: BarChart2, color: 'text-amber-600' },
  ] : null;

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Performance Stats: {campaign.campaign_name}
          </DialogTitle>
          <DialogDescription>
            Performance log for this campaign run.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Campaign overview */}
            <div className="bg-slate-50 border rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs ${campaign.status === 'launched' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {campaign.status}
                </Badge>
                {campaign.meta_campaign_id && (
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Meta ID: {campaign.meta_campaign_id}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Daily Budget', value: campaign.daily_budget ? `$${campaign.daily_budget}/day` : '—' },
                  { label: 'Start Date', value: campaign.start_date || '—' },
                  { label: 'End Date', value: campaign.end_date || '—' },
                  { label: 'Objective', value: campaign.objective || '—' },
                  { label: 'Audience', value: campaign.target_audience || '—' },
                  { label: 'Created', value: campaign.created_at ? format(new Date(campaign.created_at), 'MMM d, yyyy') : '—' },
                ].map(f => (
                  <div key={f.label} className="bg-white rounded-lg border border-slate-200 p-2.5">
                    <div className="text-xs text-slate-400">{f.label}</div>
                    <div className="text-xs font-medium text-slate-700 mt-0.5 break-all">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live stats (if available) */}
            {metricCards ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Performance Metrics</p>
                  <button onClick={loadStats} className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />Refresh
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {metricCards.map(m => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                        <Icon className={`w-5 h-5 mx-auto mb-1.5 ${m.color}`} />
                        <div className="text-xl font-bold text-slate-800">{m.value}</div>
                        {m.sub && <div className="text-xs text-slate-400 mt-0.5">{m.sub} rate</div>}
                        <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                      </div>
                    );
                  })}
                </div>
                {stats.last_calculated_at && (
                  <p className="text-xs text-slate-400 mt-2 text-right">
                    Last updated: {format(new Date(stats.last_calculated_at), 'MMM d, h:mm a')}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <p className="font-semibold mb-1">No performance data yet</p>
                <p className="text-xs">Performance stats are collected after the campaign is launched and begins delivering. Check back once the campaign has been live for at least 24 hours.</p>
              </div>
            )}

            {/* Raw logs */}
            {rawLogs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Historical Snapshots</p>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-2.5 font-medium text-slate-500">Date</th>
                        <th className="text-left p-2.5 font-medium text-slate-500">Sent</th>
                        <th className="text-left p-2.5 font-medium text-slate-500">Opens</th>
                        <th className="text-left p-2.5 font-medium text-slate-500">Clicks</th>
                        <th className="text-left p-2.5 font-medium text-slate-500">Bounces</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawLogs.map(log => (
                        <tr key={log.id} className="border-b hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500">{log.last_calculated_at ? format(new Date(log.last_calculated_at), 'MMM d') : '—'}</td>
                          <td className="p-2.5 font-medium">{log.sent_count?.toLocaleString() || '—'}</td>
                          <td className="p-2.5 text-blue-600">{log.opened_count?.toLocaleString() || '—'} <span className="text-slate-400">({(log.open_rate * 100 || 0).toFixed(0)}%)</span></td>
                          <td className="p-2.5 text-indigo-600">{log.clicked_count?.toLocaleString() || '—'}</td>
                          <td className="p-2.5 text-amber-600">{log.bounced_count?.toLocaleString() || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {campaign.meta_campaign_id && (
              <div className="flex justify-between items-center pt-2 border-t">
                <a
                  href={`https://www.facebook.com/adsmanager/manage/campaigns?campaign_ids=${campaign.meta_campaign_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />View in Meta Ads Manager
                </a>
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Close</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}