import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle, Send, Key, ExternalLink } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'bg-[#1877F2] hover:bg-[#1565d8] text-white',
    icon: 'f',
    credentialFields: [
      { key: 'page_access_token', label: 'Page Access Token', placeholder: 'EAA...' },
      { key: 'page_id', label: 'Facebook Page ID', placeholder: '123456789' },
    ],
    apiDocs: 'https://developers.facebook.com/docs/graph-api/reference/page/photos',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90',
    icon: '📸',
    credentialFields: [
      { key: 'access_token', label: 'Instagram Access Token', placeholder: 'EAA...' },
      { key: 'ig_user_id', label: 'Instagram Business Account ID', placeholder: '17841...' },
    ],
    apiDocs: 'https://developers.facebook.com/docs/instagram-api/reference/ig-user/media',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: 'bg-black hover:bg-slate-800 text-white',
    icon: '♪',
    credentialFields: [
      { key: 'access_token', label: 'TikTok Access Token', placeholder: 'att_...' },
      { key: 'open_id', label: 'TikTok Open ID', placeholder: '...' },
    ],
    apiDocs: 'https://developers.tiktok.com/doc/content-posting-api-reference-upload-media',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'bg-[#0A66C2] hover:bg-[#0958a8] text-white',
    icon: 'in',
    credentialFields: [
      { key: 'access_token', label: 'LinkedIn Access Token', placeholder: 'AQV...' },
      { key: 'organization_urn', label: 'Organization URN', placeholder: 'urn:li:organization:12345' },
    ],
    apiDocs: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    color: 'bg-black hover:bg-slate-800 text-white',
    icon: '𝕏',
    credentialFields: [
      { key: 'api_key', label: 'API Key', placeholder: '...' },
      { key: 'api_secret', label: 'API Secret', placeholder: '...' },
      { key: 'access_token', label: 'Access Token', placeholder: '...' },
      { key: 'access_secret', label: 'Access Token Secret', placeholder: '...' },
    ],
    apiDocs: 'https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets',
  },
];

export default function PushToSocialModal({ campaign, open, onClose }) {
  const [activePlatform, setActivePlatform] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null); // {success, message}

  const platform = PLATFORMS.find(p => p.id === activePlatform);

  const handlePush = async () => {
    if (!platform || !campaign) return;
    setPushing(true);
    setResult(null);

    try {
      // Call the backend function to push post
      const res = await base44.functions.invoke('pushPostToSocialMedia', {
        platform: platform.id,
        campaign_id: campaign.id,
        caption: campaign.description?.slice(0, 2000) || campaign.title,
        image_url: campaign.image_url || null,
        credentials,
      });
      setResult({ success: true, message: res.data?.message || 'Post published successfully!' });
    } catch (err) {
      setResult({ success: false, message: err?.response?.data?.error || err.message || 'Failed to publish post.' });
    }
    setPushing(false);
  };

  const handleClose = () => {
    setActivePlatform(null);
    setCredentials({});
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Send className="w-4 h-4 text-purple-600" />
            Push Post to Social Media
          </DialogTitle>
          <p className="text-xs text-slate-500">Select a platform and enter your credentials to publish.</p>
        </DialogHeader>

        {/* Platform buttons */}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => { setActivePlatform(p.id); setCredentials({}); setResult(null); }}
              className={`text-xs px-4 py-2 rounded-full font-semibold transition-all border ${
                activePlatform === p.id
                  ? p.color + ' border-transparent shadow-md scale-105'
                  : 'border-slate-200 text-slate-600 bg-white hover:border-slate-400'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Credentials form */}
        {platform && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs font-semibold text-slate-700">{platform.name} Credentials</p>
              </div>
              <a href={platform.apiDocs} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />API Docs
              </a>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                <strong>Security Note:</strong> Credentials are sent directly to the publish function and are never stored. For a production setup, store tokens as secrets in your dashboard.
              </p>
            </div>

            {platform.credentialFields.map(field => (
              <div key={field.key}>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1">{field.label}</label>
                <Input
                  type="password"
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ''}
                  onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="text-xs h-8 font-mono"
                />
              </div>
            ))}

            {/* Post preview summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Post Content</p>
              <p className="text-xs text-slate-700 line-clamp-2">{campaign.description?.slice(0, 200) || campaign.title}</p>
              {campaign.image_url && (
                <div className="flex items-center gap-1 mt-1.5">
                  <img src={campaign.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                  <span className="text-[10px] text-slate-400">Image attached</span>
                </div>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium border ${
                result.success
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {result.success
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {result.message}
              </div>
            )}

            <Button
              onClick={handlePush}
              disabled={pushing || platform.credentialFields.some(f => !credentials[f.key])}
              className="w-full h-10 font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white"
            >
              {pushing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing to {platform.name}...</>
                : <><Send className="w-4 h-4 mr-2" />Push to {platform.name}</>}
            </Button>
          </div>
        )}

        {!activePlatform && (
          <p className="text-xs text-slate-400 text-center py-4">Select a platform above to continue.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}