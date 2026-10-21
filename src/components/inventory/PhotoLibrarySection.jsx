import React, { useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Chapter 15 P0/P1-23 — the Item photo library. PRIVATE BY DEFAULT: photos are uploaded
// to PRIVATE storage (file_uri) and viewed through short-lived signed URLs. Every photo
// is screened by the EXISTING sensitive-material AI screen before it may ever be
// approved; a screening failure or sensitive flag yields review_required — NEVER
// silently cleared. Approving a photo for marketing is an EXPLICIT publication step that
// creates the public copy. The same underlying file is reused across workflows.
const PURPOSES = ['RESEARCH', 'CONDITION', 'DETAIL', 'MARKETING', 'CUSTODY_EVIDENCE', 'OTHER_PRIVATE'];

const PURPOSE_BADGE = {
  RESEARCH: 'bg-violet-100 text-violet-700',
  CONDITION: 'bg-blue-100 text-blue-700',
  DETAIL: 'bg-cyan-100 text-cyan-700',
  MARKETING: 'bg-green-100 text-green-700',
  CUSTODY_EVIDENCE: 'bg-amber-100 text-amber-700',
  OTHER_PRIVATE: 'bg-slate-100 text-slate-600',
};

export default function PhotoLibrarySection({ photos, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(-1);
  const [purpose, setPurpose] = useState('RESEARCH');
  const [signedUrls, setSignedUrls] = useState({});
  const fileRef = useRef(null);

  // Refresh signed URLs for private photos (short-lived, generated for display only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const needed = (photos || []).filter(p => p.file_uri && !signedUrls[p.file_uri]);
      if (needed.length === 0) return;
      const updates = {};
      for (const p of needed) {
        try {
          const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: p.file_uri });
          if (res.signed_url) updates[p.file_uri] = res.signed_url;
        } catch (e) {
          updates[p.file_uri] = null; // do not retry-loop; row renders without thumbnail
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const canApprove = p => p.screen_status === 'screen_passed' || p.screen_status === 'cleared_by_human';

  const addFiles = async fileList => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    const added = [];
    try {
      for (const file of files) {
        // P0: private storage first — a photo is never public merely because it was uploaded.
        const up = await base44.integrations.Core.UploadPrivateFile({ file });
        const file_uri = up.file_uri;
        let screen_status = 'not_run';
        try {
          const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
          const res = await base44.functions.invoke('analyzeItemImage', {
            image_url: signed.signed_url,
            categories: ['documents', 'sensitive', 'ordinary'],
          });
          const r = res.data || {};
          if (r.error) {
            screen_status = 'review_required'; // FAIL-SAFE: a screen failure is never "cleared"
          } else {
            screen_status = r.sensitive === true ? 'review_required' : 'screen_passed';
          }
        } catch (e) {
          screen_status = 'review_required'; // FAIL-SAFE
        }
        added.push({
          file_uri,
          url: '',
          purpose,
          approved_public: false,
          screen_status,
          added_at: new Date().toISOString(),
        });
      }
      onChange([...(photos || []), ...added]);
      if (added.some(p => p.screen_status === 'review_required')) {
        toast.warning('Photo added — but it needs privacy review before ANY public or marketing use.');
      } else {
        toast.success('Photo added — private by default until approved for marketing.');
      }
    } catch (e) {
      toast.error('Photo upload failed: ' + e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setPhoto = (idx, patch) => {
    const next = [...(photos || [])];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  // EXPLICIT PUBLICATION STEP: approving for marketing creates the public copy of the
  // already-screened private file. Only reachable after the privacy screen passed.
  const approveForMarketing = async idx => {
    const p = (photos || [])[idx];
    if (!canApprove(p)) {
      toast.error('Privacy review is required before this photo can be public. Clear it first.');
      return;
    }
    if (!p.url) {
      setPublishing(idx);
      try {
        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: p.file_uri });
        const blob = await (await fetch(signed.signed_url)).blob();
        const pub = await base44.integrations.Core.UploadPublicFile({
          file: new File([blob], `item-photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }),
        });
        setPhoto(idx, { approved_public: true, url: pub.file_url });
        toast.success('Approved for marketing — the public photo now feeds labels and marketing.');
      } catch (e) {
        toast.error('Could not publish photo: ' + e.message);
        setPublishing(-1);
        return;
      }
      setPublishing(-1);
    } else {
      setPhoto(idx, { approved_public: !p.approved_public });
    }
  };

  const remove = idx => {
    onChange((photos || []).filter((_, i) => i !== idx));
  };

  const srcFor = p => p.url || signedUrls[p.file_uri] || '';

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <select
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          title="Why is this photo being taken? Purpose sets the privacy default."
        >
          {PURPOSES.map(p => (
            <option key={p} value={p}>{p.replace('_', ' ')}</option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Screening…' : 'Add photos'}
        </Button>
        <p className="text-xs text-slate-500 flex-1 min-w-[180px]">
          Stored privately and screened for sensitive material — nothing is public until you approve it for marketing.
        </p>
      </div>

      {(photos || []).length === 0 ? (
        <p className="text-xs text-slate-400">No photos yet. Research, condition and detail photos live here — marketing needs an explicit approval.</p>
      ) : (
        <div className="space-y-2">
          {photos.map((p, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 flex-wrap">
              {srcFor(p) ? (
                <img src={srcFor(p)} alt={p.note || p.purpose} className="w-14 h-14 object-cover rounded" />
              ) : (
                <div className="w-14 h-14 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">private</div>
              )}
              <div className="flex-1 min-w-[140px] space-y-1">
                <div className="flex gap-1.5 flex-wrap items-center">
                  <Badge className={`text-[10px] ${PURPOSE_BADGE[p.purpose] || PURPOSE_BADGE.OTHER_PRIVATE}`}>{(p.purpose || 'OTHER_PRIVATE').replace('_', ' ')}</Badge>
                  {p.screen_status === 'screen_passed' && (
                    <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200"><ShieldCheck className="w-3 h-3 mr-0.5" />screen passed</Badge>
                  )}
                  {p.screen_status === 'review_required' && (
                    <Badge className="text-[10px] bg-red-50 text-red-700 border border-red-200"><ShieldAlert className="w-3 h-3 mr-0.5" />privacy review required</Badge>
                  )}
                  {p.screen_status === 'cleared_by_human' && (
                    <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200">cleared by human</Badge>
                  )}
                  {p.source_discovery_id && (
                    <Badge className="text-[10px] bg-slate-50 text-slate-500">discovery evidence</Badge>
                  )}
                </div>
                <input
                  value={p.note || ''}
                  onChange={e => setPhoto(idx, { note: e.target.value })}
                  placeholder="Caption (mark, signature, underside, damage detail…)"
                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                {p.approved_public ? (
                  <Button size="sm" type="button" variant="outline" className="text-green-700 border-green-300" onClick={() => setPhoto(idx, { approved_public: false })}>Approved ✓</Button>
                ) : (
                  <Button
                    size="sm" type="button" variant="outline"
                    disabled={publishing === idx}
                    title={canApprove(p) ? 'Approve for public/marketing use (creates the public copy)' : 'Privacy review required first'}
                    onClick={() => approveForMarketing(idx)}
                  >
                    {publishing === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve public'}
                  </Button>
                )}
                <Button size="sm" type="button" variant="ghost" onClick={() => remove(idx)} className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}