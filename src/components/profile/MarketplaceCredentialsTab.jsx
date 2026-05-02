import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function MarketplaceCredentialsTab({ platform }) {
  const isEtsy = platform === 'etsy';

  const [creds, setCreds] = useState({
    api_key: '',
    api_secret: '',
    access_token: '',
    shop_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const userKey = isEtsy ? 'etsy_credentials' : 'ebay_credentials';

  useEffect(() => {
    loadCreds();
  }, [platform]);

  const loadCreds = async () => {
    const user = await base44.auth.me();
    const existing = user[userKey];
    if (existing) setCreds({ api_key: '', api_secret: '', access_token: '', shop_id: '', ...existing });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ [userKey]: creds });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const isConnected = !!(creds.access_token && creds.api_key);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEtsy ? (
                <span className="text-2xl">🧶</span>
              ) : (
                <span className="text-2xl">🛍️</span>
              )}
              {isEtsy ? 'Etsy' : 'eBay'} API Credentials
            </div>
            {isConnected ? (
              <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Not Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            {isEtsy ? (
              <>
                <p className="font-semibold mb-1">How to get your Etsy API credentials:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to <a href="https://www.etsy.com/developers/register" target="_blank" rel="noreferrer" className="underline font-medium">etsy.com/developers/register</a></li>
                  <li>Create a new app to get your <strong>Keystring</strong> (API Key)</li>
                  <li>Generate an OAuth access token for your shop</li>
                  <li>Find your Shop ID in your Etsy shop settings or URL</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">How to get your eBay API credentials:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to <a href="https://developer.ebay.com" target="_blank" rel="noreferrer" className="underline font-medium">developer.ebay.com</a></li>
                  <li>Create an application to get your <strong>App ID</strong> and <strong>Cert ID</strong></li>
                  <li>Generate a User Access Token via OAuth</li>
                </ol>
              </>
            )}
            <a
              href={isEtsy ? 'https://www.etsy.com/developers' : 'https://developer.ebay.com'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-blue-700 font-medium hover:underline text-xs"
            >
              Open Developer Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>{isEtsy ? 'API Keystring (App ID)' : 'App ID (Client ID)'}</Label>
              <Input
                value={creds.api_key}
                onChange={e => setCreds({ ...creds, api_key: e.target.value })}
                placeholder={isEtsy ? 'your-etsy-keystring' : 'AppID-xxxxx'}
              />
            </div>
            <div>
              <Label>{isEtsy ? 'Shared Secret' : 'Cert ID (Client Secret)'}</Label>
              <Input
                type="password"
                value={creds.api_secret}
                onChange={e => setCreds({ ...creds, api_secret: e.target.value })}
                placeholder="••••••••••••"
              />
            </div>
            <div>
              <Label>OAuth Access Token</Label>
              <Input
                type="password"
                value={creds.access_token}
                onChange={e => setCreds({ ...creds, access_token: e.target.value })}
                placeholder="v1.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <Label>{isEtsy ? 'Shop ID' : 'Seller ID / Username'}</Label>
              <Input
                value={creds.shop_id}
                onChange={e => setCreds({ ...creds, shop_id: e.target.value })}
                placeholder={isEtsy ? '12345678' : 'your-ebay-username'}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Credentials'}
          </Button>

          <p className="text-xs text-slate-500">
            Credentials are stored securely on your account and used only when you choose to post an item to {isEtsy ? 'Etsy' : 'eBay'}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}