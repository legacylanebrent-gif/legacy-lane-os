import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle, Send, Key, ExternalLink, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'bg-[#1877F2] hover:bg-[#1565d8] text-white',
    icon: '📘',
    credentialFields: [
      { key: 'page_access_token', label: 'Page Access Token', placeholder: 'EAA...', savedKey: 'access_token' },
      { key: 'page_id', label: 'Facebook Page ID', placeholder: '123456789', savedKey: 'page_id' },
    ],
    apiDocs: 'https://developers.facebook.com/docs/graph-api/reference/page/photos',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90',
    icon: '📸',
    credentialFields: [
      { key: 'access_token', label: 'Instagram Access Token', placeholder: 'EAA...', savedKey: 'access_token' },
      { key: 'ig_user_id', label: 'Instagram Business Account ID', placeholder: '17841...', savedKey: 'business_account_id' },
    ],
    apiDocs: 'https://developers.facebook.com/docs/instagram-api/reference/ig-user/media',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: 'bg-black hover:bg-slate-800 text-white',
    icon: '🎵',
    credentialFields: [
      { key: 'access_token', label: 'TikTok Access Token', placeholder: 'att_...', savedKey: 'access_token' },
      { key: 'open_id', label: 'TikTok Open ID', placeholder: '...', savedKey: 'open_id' },
    ],
    apiDocs: 'https://developers.tiktok.com/doc/content-posting-api-reference-upload-media',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'bg-[#0A66C2] hover:bg-[#0958a8] text-white',
    icon: '💼',
    credentialFields: [
      { key: 'access_token', label: 'LinkedIn Access Token', placeholder: 'AQV...', savedKey: 'access_token' },
      { key: 'organization_urn', label: 'Organization URN', placeholder: 'urn:li:organization:12345', savedKey: 'organization_id' },
    ],
    apiDocs: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    color: 'bg-black hover:bg-slate-800 text-white',
    icon: '𝕏',
    credentialFields: [
      { key: 'api_key', label: 'API Key', placeholder: '...', savedKey: 'api_key' },
      { key: 'api_secret', label: 'API Secret', placeholder: '...', savedKey: 'api_secret' },
      { key: 'access_token', label: 'Access Token', placeholder: '...', savedKey: 'access_token' },
      { key: 'access_secret', label: 'Access Token Secret', placeholder: '...', savedKey: 'access_token_secret' },
    ],
    apiDocs: 'https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets',
  },
];

export default function PushToSocialModal({ campaign, open, onClose }) {
  const [activePlatform, setActivePlatform] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);
  const [savedCreds, setSavedCreds] = useState({});
  const [loadingCreds, setLoadingCreds] = useState(false);

  const platform = PLATFORMS.find(p => p.id === activePlatform);

  useEffect(() => {
    if (open) {
      setLoadingCreds(true);
      base44.auth.me().then(u => {
        const sc = u?.social_media_credentials || {};
        setSavedCreds(sc);
        // Map saved credential keys to what pushPostToSocialMedia expects
        // facebook: page_id + access_token → page_id + page_access_token
        setLoadingCreds(false);
      }).catch(() => setLoadingCreds(false));
    }
  }, [open]);

  // When platform is selected, pre-fill credentials from saved profile data
  const handleSelectPlatform = (platformId) => {
    setActivePlatform(platformId);
    setResult(null);
    const p = PLATFORMS.find(x => x.id === platformId);
    const saved = savedCreds[platformId] || {};
    // Build pre-filled credentials from saved profile fields
    const prefilled = {};
    p.credentialFields.forEach(f => {
      prefilled[f.key] = saved[f.savedKey || f.key] || '';
    });
    setCredentials(prefilled);
  };

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

  const isSavedForPlatform = (platformId) => {
    const p = PLATFORMS.find(x => x.id === platformId);
    const saved = savedCreds[platformId] || {};
    return p?.credentialFields.every(f => saved[f.savedKey || f.key]);
  };

  const allFieldsFilled = platform?.credentialFields.every(f => credentials[f.key]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Send className="w-4 h-4 text-purple-600" />
            Push Post to Social Media
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Select a platform to publish.{' '}
            <Link to="/MyProfile?tab=social" onClick={handleClose} className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
              <Settings className="w-3 h-3" /> Manage saved credentials
            </Link>
          </p>
        </DialogHeader>

        {loadingCreds ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          <>
            {/* Platform buttons with saved indicator */}
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => {
                const saved = isSavedForPlatform(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlatform(p.id)}
                    className={`text-xs px-3 py-2 rounded-full font-semibold transition-all border flex items-center gap-1.5 ${
                      activePlatform === p.id
                        ? p.color + ' border-transparent shadow-md scale-105'
                        : 'border-slate-200 text-slate-600 bg-white hover:border-slate-400'
                    }`}
                  >
                    <span>{p.icon}</span>
                    {p.name}
                    {saved && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Credentials form */}
            {platform && (
              <div className="space-y-3 mt-2">
                {isSavedForPlatform(platform.id) ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700">
                      <strong>Saved credentials loaded</strong> from your profile. Ready to publish!
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-700">
                      No saved credentials for {platform.name}.{' '}
                      <Link to="/MyProfile?tab=social" onClick={handleClose} className="font-semibold underline">
                        Set them up once in your Profile
                      </Link>{' '}
                      to skip this step next time.
                    </p>
                  </div>
                )}

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
                  disabled={pushing || !allFieldsFilled}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}