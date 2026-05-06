import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Zap, Settings, RefreshCw, Send, BookOpen, Users, Activity } from 'lucide-react';

const STATUS_COLORS = {
  connected: 'bg-green-100 text-green-700 border-green-200',
  not_configured: 'bg-amber-100 text-amber-700 border-amber-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  disabled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const EVENT_STATUS_COLORS = {
  sent: 'bg-green-100 text-green-700',
  skipped: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

export default function CustomerIODashboard() {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [profileCount, setProfileCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      if (u?.role !== 'admin') { setLoading(false); return; }
      setUser(u);

      const [configRes, logs, profiles] = await Promise.all([
        base44.functions.invoke('customerioService', { action: 'getConfig' }),
        base44.entities.MarketingEventLog.list('-created_at', 50),
        base44.entities.ConsumerMarketingProfile.list(),
      ]);

      setConfig(configRes.data);
      setEventLogs(logs);
      setProfileCount(profiles.length);

      const statCounts = { sent: 0, skipped: 0, failed: 0, pending: 0 };
      logs.forEach(l => { if (statCounts[l.status] !== undefined) statCounts[l.status]++; });
      setStats(statCounts);
    } catch (err) {
      console.error('Error loading CustomerIO dashboard:', err);
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('customerioService', { action: 'testConnection' });
      setTestResult(res.data);
      loadData();
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    }
    setTesting(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!user || user.role !== 'admin') return <div className="p-8 text-center text-slate-500">Admin access required.</div>;

  const configStatus = config?.status || 'not_configured';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            Customer.io Integration
          </h1>
          <p className="text-slate-500 mt-1">Marketing automation engine for Legacy Lane OS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
          <Button size="sm" onClick={handleTestConnection} disabled={testing} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            {testing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Testing...</> : <><Send className="w-3.5 h-3.5 mr-1.5" />Test Connection</>}
          </Button>
        </div>
      </div>

      {/* Connection Status Banner */}
      {!config?.configured && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Customer.io infrastructure is installed but credentials have not been added yet.</p>
            <p className="text-sm text-amber-700 mt-1">All marketing events are being logged in safe-skip mode. Add your environment variables when ready.</p>
            <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3 font-mono text-xs text-slate-700 space-y-0.5">
              <p>CUSTOMERIO_ENABLED=true</p>
              <p>CUSTOMERIO_API_MODE=pipelines</p>
              <p>CUSTOMERIO_PIPELINES_WRITE_KEY=your_write_key</p>
              <p>CUSTOMERIO_REGION=us</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-xl p-4 border flex items-center gap-3 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {testResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>{testResult.message}</p>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <Badge className={`${STATUS_COLORS[configStatus]} text-xs`}>{configStatus.replace('_', ' ')}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">API Mode</p>
            <p className="text-lg font-bold text-slate-800 capitalize">{config?.apiMode || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Profiles Synced</p>
            <p className="text-2xl font-bold text-indigo-600">{profileCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Events Sent</p>
            <p className="text-2xl font-bold text-green-600">{stats.sent || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 mb-1">Skipped (no creds)</p>
            <p className="text-2xl font-bold text-amber-700">{stats.skipped || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-700">{stats.failed || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Region</p>
            <p className="text-xl font-bold text-slate-700 uppercase">{config?.region || 'us'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {[
              'Create a Customer.io account at customer.io',
              'Create a workspace named "Legacy Lane OS"',
              'Add a verified sending domain for your email address',
              'Navigate to Settings → API Credentials and copy your Pipelines Write Key',
              'Add CUSTOMERIO_ENABLED=true and credentials to environment variables',
              'Click "Test Connection" above to verify the integration',
              'In Customer.io, create campaigns triggered by: sale.created, sale.reminder_due, sale.final_day, consumer.subscribed_to_operator',
              'Add the Legacy Lane Preference Center URL (/MarketingPreferences) to every email footer',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Recent Event Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            Recent Event Log
            <Badge variant="outline" className="text-xs">{eventLogs.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No events logged yet. Events will appear here once users follow operators or sales are created.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {eventLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${EVENT_STATUS_COLORS[log.status] || 'bg-slate-100 text-slate-600'}`}>{log.status}</span>
                  <span className="font-mono text-slate-700 flex-1">{log.event_name}</span>
                  <span className="text-slate-400 truncate max-w-32">{log.consumer_email || '—'}</span>
                  <span className="text-slate-400 flex-shrink-0">{log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Note */}
      <Card className="border-slate-300 bg-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">Migration Note — Mailchimp Removal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mailchimp has been fully removed from Legacy Lane OS. All previous Mailchimp references (list_id, audience_id, mailchimp_status, mailchimp_list_id) in MarketingTask notes fields are deprecated — those fields will no longer be written to. 
            The EmailCampaignModal now stores Customer.io-ready metadata. No Mailchimp data has been deleted from existing records. 
            Customer.io replaces all email distribution. Legacy Lane OS remains the master database for consent, subscriptions, and preferences.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}