import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Loader2, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw,
  Sparkles, Download, Eye, Users, MapPin, Activity, Zap, BookOpen
} from 'lucide-react';

const MAPPING_COLORS = {
  mapped: 'bg-green-100 text-green-700',
  partially_mapped: 'bg-blue-100 text-blue-700',
  unmapped: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
  ignored: 'bg-slate-50 text-slate-400',
};

const EVENT_COLORS = {
  email_sent: 'bg-slate-100 text-slate-600',
  email_delivered: 'bg-blue-100 text-blue-700',
  email_opened: 'bg-indigo-100 text-indigo-700',
  email_human_opened: 'bg-purple-100 text-purple-700',
  email_clicked: 'bg-cyan-100 text-cyan-700',
  email_human_clicked: 'bg-teal-100 text-teal-700',
  email_bounced: 'bg-red-100 text-red-700',
  email_spam_complaint: 'bg-red-200 text-red-800',
  email_unsubscribed: 'bg-orange-100 text-orange-700',
  email_suppressed: 'bg-red-100 text-red-800',
  email_failed: 'bg-red-100 text-red-700',
};

function StatCard({ label, value, color = 'text-slate-900', sub }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function CustomerIOReportingCenter() {
  const [user, setUser] = useState(null);
  const [engagementLogs, setEngagementLogs] = useState([]);
  const [salePerfs, setSalePerfs] = useState([]);
  const [operatorPerfs, setOperatorPerfs] = useState([]);
  const [suppressedProfiles, setSuppressedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterMapping, setFilterMapping] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      if (u?.role !== 'admin') { setLoading(false); return; }
      setUser(u);

      const [logs, sPerfs, opPerfs, suppressed] = await Promise.all([
        base44.entities.MarketingEngagementLog.list('-created_at', 200),
        base44.entities.SaleMarketingPerformance.list('-last_calculated_at', 50),
        base44.entities.OperatorMarketingPerformance.list('-updated_at', 50),
        base44.entities.ConsumerMarketingProfile.filter({ suppression_status: 'unsubscribed_all' }),
      ]);

      setEngagementLogs(logs);
      setSalePerfs(sPerfs);
      setOperatorPerfs(opPerfs);
      setSuppressedProfiles(suppressed);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    await base44.functions.invoke('recalculateMarketingStats', {});
    await loadData();
    setRecalculating(false);
  };

  const handleMarkIgnored = async (logId) => {
    await base44.entities.MarketingEngagementLog.update(logId, { mapping_status: 'ignored' });
    loadData();
  };

  const exportCSV = () => {
    const rows = [
      ['event_type', 'email', 'operator_id', 'sale_id', 'mapping_status', 'created_at'].join(','),
      ...engagementLogs.map(l => [l.normalized_event_type, l.consumer_email || '', l.operator_id || '', l.sale_id || '', l.mapping_status, l.created_at || ''].join(','))
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customerio_events.csv'; a.click();
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!user || user.role !== 'admin') return <div className="p-8 text-center text-slate-500">Admin access required.</div>;

  // Stats
  const countByEvent = {};
  const countByMapping = {};
  engagementLogs.forEach(l => {
    countByEvent[l.normalized_event_type] = (countByEvent[l.normalized_event_type] || 0) + 1;
    countByMapping[l.mapping_status] = (countByMapping[l.mapping_status] || 0) + 1;
  });

  const unmappedLogs = engagementLogs.filter(l => l.mapping_status === 'unmapped' || l.mapping_status === 'failed');
  const failedLogs = engagementLogs.filter(l => l.processing_status === 'failed');

  // Filtered logs
  let filteredLogs = engagementLogs;
  if (filterMapping !== 'all') filteredLogs = filteredLogs.filter(l => l.mapping_status === filterMapping);
  if (filterEvent !== 'all') filteredLogs = filteredLogs.filter(l => l.normalized_event_type === filterEvent);
  if (searchEmail) filteredLogs = filteredLogs.filter(l => l.consumer_email?.includes(searchEmail));

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'events', label: `Events (${engagementLogs.length})` },
    { key: 'operators', label: `Operators (${operatorPerfs.length})` },
    { key: 'sales', label: `Sales (${salePerfs.length})` },
    { key: 'suppressed', label: `Suppressed (${suppressedProfiles.length})` },
    { key: 'setup', label: 'Webhook Setup' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            Customer.io Reporting Center
          </h1>
          <p className="text-slate-500 mt-1">Monitor campaign performance, webhook activity, deliverability, operator results, and buyer engagement across Legacy Lane OS.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
          <Button size="sm" onClick={handleRecalculate} disabled={recalculating} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            {recalculating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Recalculating...</> : <><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Recalculate Stats</>}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {unmappedLogs.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">{unmappedLogs.length} webhook events could not be mapped to Legacy Lane records.</p>
                <p className="text-sm text-amber-700 mt-1">Check the Events tab to review and fix unmapped events.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Events" value={engagementLogs.length.toLocaleString()} />
            <StatCard label="Email Sent" value={(countByEvent['email_sent'] || 0).toLocaleString()} color="text-slate-700" />
            <StatCard label="Human Opens" value={(countByEvent['email_human_opened'] || 0).toLocaleString()} color="text-purple-600" />
            <StatCard label="Human Clicks" value={(countByEvent['email_human_clicked'] || 0).toLocaleString()} color="text-teal-600" />
            <StatCard label="Bounced" value={countByEvent['email_bounced'] || 0} color="text-red-600" />
            <StatCard label="Spam Reports" value={countByEvent['email_spam_complaint'] || 0} color="text-red-700" />
            <StatCard label="Unsubscribed" value={countByEvent['email_unsubscribed'] || 0} color="text-amber-600" />
            <StatCard label="Suppressed Users" value={suppressedProfiles.length} color="text-red-800" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(countByMapping).map(([status, count]) => (
              <div key={status} className="bg-white border border-slate-200 rounded-xl p-3">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${MAPPING_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
                <p className="text-xl font-bold text-slate-800 mt-2">{count}</p>
              </div>
            ))}
          </div>

          {/* Top operators */}
          {operatorPerfs.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Top Performing Operators</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {operatorPerfs.slice(0, 5).map(op => (
                  <div key={op.id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                    <span className="flex-1 font-medium text-slate-800">{op.operator_name || op.operator_id}</span>
                    <span className="text-xs text-slate-500">H.Open: <strong className="text-purple-600">{op.average_human_open_rate || 0}%</strong></span>
                    <span className="text-xs text-slate-500">H.Click: <strong className="text-teal-600">{op.average_human_click_rate || 0}%</strong></span>
                    <span className="text-xs text-slate-500">Unsubs: <strong className="text-amber-600">{op.total_unsubscribed || 0}</strong></span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── EVENTS TAB ── */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Filter by email..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="h-8 text-xs max-w-xs" />
            <select value={filterMapping} onChange={e => setFilterMapping(e.target.value)} className="h-8 text-xs border border-slate-300 rounded-md px-2">
              <option value="all">All mapping</option>
              {['mapped', 'partially_mapped', 'unmapped', 'failed', 'ignored'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="h-8 text-xs border border-slate-300 rounded-md px-2">
              <option value="all">All events</option>
              {Object.keys(EVENT_COLORS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-10">No events match filters.</p>
                ) : (
                  filteredLogs.map(log => (
                    <div key={log.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 text-xs ${selectedLog?.id === log.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] flex-shrink-0 ${EVENT_COLORS[log.normalized_event_type] || 'bg-slate-100 text-slate-600'}`}>{log.normalized_event_type || log.raw_event_type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${MAPPING_COLORS[log.mapping_status] || ''}`}>{log.mapping_status}</span>
                      <span className="text-slate-600 truncate flex-1">{log.consumer_email || '—'}</span>
                      <span className="text-slate-400 flex-shrink-0">{log.operator_id ? log.operator_id.slice(0, 8) : '—'}</span>
                      <span className="text-slate-400 flex-shrink-0">{log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)} className="text-[10px] px-1.5 py-0.5 border border-slate-300 rounded hover:bg-slate-100">
                          <Eye className="w-2.5 h-2.5" />
                        </button>
                        {log.mapping_status === 'unmapped' && (
                          <button onClick={() => handleMarkIgnored(log.id)} className="text-[10px] px-1.5 py-0.5 border border-slate-300 rounded hover:bg-slate-100 text-slate-400">
                            Ignore
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Raw payload viewer */}
          {selectedLog && (
            <Card className="border-indigo-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Raw Webhook Payload — {selectedLog.raw_event_type}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-64 leading-relaxed">
                  {JSON.stringify(selectedLog.raw_payload_json, null, 2)}
                </pre>
                {selectedLog.error_message && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{selectedLog.error_message}</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── OPERATORS TAB ── */}
      {activeTab === 'operators' && (
        <Card>
          <CardContent className="p-0">
            {operatorPerfs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">No operator performance data yet. Recalculate stats after events are received.</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Operator', 'Sent', 'Delivered', 'H.Open%', 'H.Click%', 'Unsub%', 'Bounced', 'Spam', 'Net Audience'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {operatorPerfs.map(op => (
                      <tr key={op.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{op.operator_name || op.operator_id?.slice(0, 12)}</td>
                        <td className="px-3 py-2">{op.total_sent}</td>
                        <td className="px-3 py-2">{op.total_delivered}</td>
                        <td className="px-3 py-2 font-semibold text-purple-600">{op.average_human_open_rate}%</td>
                        <td className="px-3 py-2 font-semibold text-teal-600">{op.average_human_click_rate}%</td>
                        <td className="px-3 py-2 text-amber-600">{op.average_unsubscribe_rate}%</td>
                        <td className="px-3 py-2 text-red-600">{op.total_bounced}</td>
                        <td className="px-3 py-2 text-red-700">{op.total_spam_complaints}</td>
                        <td className={`px-3 py-2 font-semibold ${op.net_audience_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{op.net_audience_growth >= 0 ? '+' : ''}{op.net_audience_growth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SALES TAB ── */}
      {activeTab === 'sales' && (
        <Card>
          <CardContent className="p-0">
            {salePerfs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">No sale performance data yet.</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Sale', 'Operator', 'Sent', 'H.Open%', 'H.Click%', 'Directions', 'Saved', 'Unsubs', 'Interest'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {salePerfs.map(s => {
                      const iScore = s.estimated_attendance_interest_score || 0;
                      const level = iScore >= 70 ? 'high' : iScore >= 40 ? 'moderate' : 'low';
                      return (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800 max-w-[180px] truncate">{s.sale_title}</td>
                          <td className="px-3 py-2 text-slate-500">{s.operator_name || '—'}</td>
                          <td className="px-3 py-2">{s.total_sent}</td>
                          <td className="px-3 py-2 font-semibold text-purple-600">{s.total_delivered > 0 ? Math.round(s.total_human_opened / s.total_delivered * 100) : 0}%</td>
                          <td className="px-3 py-2 font-semibold text-teal-600">{s.total_delivered > 0 ? Math.round(s.total_human_clicked / s.total_delivered * 100) : 0}%</td>
                          <td className="px-3 py-2">{s.direction_clicks}</td>
                          <td className="px-3 py-2">{s.save_sale_clicks}</td>
                          <td className="px-3 py-2 text-amber-600">{s.total_unsubscribed}</td>
                          <td className="px-3 py-2">
                            <Badge className={`text-[10px] ${MAPPING_COLORS[level === 'high' ? 'mapped' : level === 'moderate' ? 'partially_mapped' : 'unmapped']}`}>{iScore}/100</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SUPPRESSED TAB ── */}
      {activeTab === 'suppressed' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800">Global suppression list — {suppressedProfiles.length} users</p>
            <p className="text-xs text-red-700 mt-1">These users will not receive any marketing events. Suppression is permanent unless user explicitly re-opts in.</p>
          </div>
          <Card>
            <CardContent className="p-0">
              {suppressedProfiles.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 text-xs">
                  <span className="font-mono text-slate-700 flex-1">{p.email}</span>
                  <Badge className="bg-red-100 text-red-700 text-[10px]">{p.suppression_status}</Badge>
                  <span className="text-slate-400">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</span>
                </div>
              ))}
              {suppressedProfiles.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No suppressed users. Good!</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── WEBHOOK SETUP TAB ── */}
      {activeTab === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Customer.io Reporting Webhook Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3">
              {[
                'Log in to your Customer.io workspace',
                'Go to Data & Integrations → Reporting Webhooks',
                'Click "Add Destination" and choose Webhook',
                'Set the endpoint URL to your Legacy Lane backend function URL for customerioWebhookIngest',
                'Select all message activity events: sent, delivered, opened, human_opened, clicked, human_clicked, converted, bounced, failed, spammed, unsubscribed, suppressed',
                'Copy the webhook signing secret and add it as CUSTOMERIO_WEBHOOK_SIGNING_SECRET in your environment variables',
                'Click "Send Test Event" in Customer.io',
                'Return here and refresh — the test event should appear in the Events tab',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-100 space-y-1">
              <p className="text-slate-400"># Environment variables to add:</p>
              <p>CUSTOMERIO_WEBHOOK_SIGNING_SECRET=<span className="text-amber-400">your_secret_here</span></p>
              <p>CUSTOMERIO_ENABLED=<span className="text-green-400">true</span></p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-800 mb-2">Supported Inbound Event Types</p>
              <div className="flex flex-wrap gap-1.5">
                {['sent', 'delivered', 'opened', 'human_opened', 'clicked', 'human_clicked', 'converted', 'bounced', 'dropped', 'failed', 'spammed', 'unsubscribed', 'suppressed'].map(e => (
                  <span key={e} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono">{e}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}