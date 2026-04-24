import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Plus, RefreshCw, Trash2, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return 'll_' + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function ApiKeyManager() {
  const [user, setUser] = useState(null);
  const [apiKeyRecord, setApiKeyRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const records = await base44.entities.CompanyApiKey.filter({ operator_id: u.id });
      if (records.length > 0) {
        const rec = records[0];
        setApiKeyRecord(rec);
        setWebhookUrl(rec.webhook_url || '');
        setWebhookEnabled(rec.webhook_enabled || false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    setSaving(true);
    try {
      const newKey = generateApiKey();
      if (apiKeyRecord) {
        const updated = await base44.entities.CompanyApiKey.update(apiKeyRecord.id, { api_key: newKey });
        setApiKeyRecord({ ...apiKeyRecord, api_key: newKey });
      } else {
        const created = await base44.entities.CompanyApiKey.create({
          operator_id: user.id,
          operator_name: user.full_name || user.company_name || user.email,
          api_key: newKey,
          webhook_enabled: false,
          is_active: true
        });
        setApiKeyRecord(created);
      }
    } catch (err) {
      alert('Failed to generate key: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!apiKeyRecord) return;
    setSaving(true);
    try {
      await base44.entities.CompanyApiKey.update(apiKeyRecord.id, {
        webhook_url: webhookUrl,
        webhook_enabled: webhookEnabled
      });
      setApiKeyRecord({ ...apiKeyRecord, webhook_url: webhookUrl, webhook_enabled: webhookEnabled });
      alert('Webhook settings saved!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualPush = async () => {
    if (!apiKeyRecord?.webhook_url) {
      alert('Please set and save a webhook URL first.');
      return;
    }
    setPushing(true);
    try {
      await base44.functions.invoke('pushSaleDataWebhook', { operator_id: user.id });
      alert('Data pushed successfully to your webhook!');
      await loadData();
    } catch (err) {
      alert('Push failed: ' + err.message);
    } finally {
      setPushing(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status) => {
    if (status === 'success') return <Badge className="bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Success</Badge>;
    if (status === 'failed') return <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    return null;
  };

  if (loading) return <div className="p-8 animate-pulse text-slate-500">Loading...</div>;

  // Detect function base URL from current app domain
  const appOrigin = window.location.origin;
  const pullEndpointNote = 'Use the backend function URL from: Dashboard → Code → Functions → saleDataFeed';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 mt-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900">Website Data Feed API</h1>
        <p className="text-slate-500 mt-1">Connect your personal website to Legacy Lane OS — push your sales and inventory automatically.</p>
      </div>

      {/* API Key Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Your API Key</h2>
          <p className="text-sm text-slate-600">Paste this key into your website's integration settings to authenticate pull requests.</p>

          {apiKeyRecord ? (
            <div className="flex items-center gap-2">
              <Input
                value={apiKeyRecord.api_key}
                readOnly
                className="font-mono text-sm bg-slate-50"
              />
              <Button size="icon" variant="outline" onClick={() => handleCopy(apiKeyRecord.api_key)}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="outline" onClick={handleGenerateKey} disabled={saving} title="Regenerate key">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerateKey} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Generate API Key
            </Button>
          )}

          {apiKeyRecord && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2 border border-slate-200">
              <p className="font-semibold text-slate-700">REST Pull Endpoint (GET your data anytime)</p>
              <p className="text-slate-500 text-xs">{pullEndpointNote}</p>
              <div className="bg-slate-900 text-green-400 rounded p-3 font-mono text-xs mt-2 space-y-1">
                <p>POST {'<function_url>'}/saleDataFeed</p>
                <p>{`{ "api_key": "${apiKeyRecord.api_key}" }`}</p>
              </div>
              <p className="text-xs text-slate-400">Your website can call this endpoint at any time to get the latest sales + inventory data.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Card */}
      {apiKeyRecord && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Webhook Push</h2>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">Enable auto-push</Label>
                <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
              </div>
            </div>
            <p className="text-sm text-slate-600">
              When enabled, Legacy Lane OS will automatically POST your full sales + inventory data to your website whenever anything changes.
            </p>

            <div className="space-y-2">
              <Label>Your Website Webhook URL</Label>
              <Input
                placeholder="https://yourwebsite.com/api/legacy-lane-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-slate-400">Your server should accept a POST request with JSON body. The request includes an <code className="bg-slate-100 px-1 rounded">X-LegacyLane-Api-Key</code> header for verification.</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSaveWebhook} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? 'Saving...' : 'Save Webhook Settings'}
              </Button>
              <Button onClick={handleManualPush} disabled={pushing} variant="outline" className="border-cyan-600 text-cyan-700 hover:bg-cyan-50">
                <Send className="w-4 h-4 mr-2" />
                {pushing ? 'Pushing...' : 'Push Now (Manual)'}
              </Button>
            </div>

            {apiKeyRecord.last_push_at && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm">
                <span className="text-slate-500">Last push:</span>
                <span className="text-slate-700">{new Date(apiKeyRecord.last_push_at).toLocaleString()}</span>
                {getStatusBadge(apiKeyRecord.last_push_status)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payload Preview */}
      {apiKeyRecord && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Payload Structure</h2>
            <p className="text-sm text-slate-600">Your website will receive this JSON structure on every push or pull:</p>
            <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs overflow-auto">
{`{
  "event": "data_updated",
  "generated_at": "2026-04-24T10:00:00Z",
  "operator_id": "...",
  "operator_name": "Your Company Name",
  "sales": [
    {
      "id": "...",
      "title": "Spring Estate Sale",
      "status": "active",
      "sale_dates": [{ "date": "2026-05-01", "start_time": "08:00" }],
      "address": { "street": "...", "city": "...", "state": "TX", "zip": "..." },
      "images": ["https://..."],
      "items": [
        {
          "id": "...",
          "title": "Antique Vase",
          "price": 45.00,
          "status": "available",
          "images": ["https://..."],
          "category": "antiques"
        }
      ]
    }
  ]
}`}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}