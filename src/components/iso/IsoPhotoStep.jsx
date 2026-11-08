import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, Loader2, ArrowRight, AlertTriangle, Check, Eye } from 'lucide-react';
import { identifyIsoPhoto } from './isoApi';

/**
 * Photo-assisted identification. The photo is interpreted, never authenticated:
 * a brand is offered only when the picture itself shows brand evidence, and
 * everything else stays in "we could not confirm".
 */
export default function IsoPhotoStep({ onIdentified }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [photo, setPhoto] = useState(null);
  const [ident, setIdent] = useState(null);
  const [focus, setFocus] = useState('');
  const [brand, setBrand] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setNotice('');
    setIdent(null);
    try {
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      setPhoto({ file_uri: uploaded.file_uri });
      const res = await identifyIsoPhoto({ fileUri: uploaded.file_uri });
      if (res.sensitive) {
        setNotice(res.message || 'That photo looks private. Please use a photo of the item itself.');
        return;
      }
      setIdent(res.identification || {});
      setFocus(res.identification?.objects?.[0] || '');
    } catch (err) {
      setError(err.message || 'We could not read that photo. Please try another one.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    onIdentified({
      identification: { ...ident, focused_object: focus || ident?.objects?.[0] || '' },
      brand: brand.trim(),
      file_uri: photo?.file_uri || '',
      entry_path: 'photo',
    });
  };

  return (
    <div className="space-y-4">
      {!ident && (
        <label className="block rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50/50 p-6 text-center cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => upload(e.target.files?.[0])}
          />
          {busy ? (
            <span className="inline-flex items-center gap-2 text-sm text-cyan-800">
              <Loader2 className="w-4 h-4 animate-spin" /> Looking at your photo…
            </span>
          ) : (
            <>
              <Camera className="w-7 h-7 text-cyan-700 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-900">Add a photo of the item</div>
              <div className="text-xs text-slate-500">A clear photo of the item itself works best</div>
            </>
          )}
        </label>
      )}

      {preview && <img src={preview} alt="Your reference" className="w-full max-h-48 object-contain rounded-lg bg-slate-100" />}
      {notice && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {notice}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {ident && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm text-slate-800">{ident.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {ident.item_type && <Badge variant="secondary" className="text-xs">{ident.item_type}</Badge>}
              {ident.category && <Badge variant="outline" className="text-xs">{ident.category}</Badge>}
              {ident.style && <Badge variant="outline" className="text-xs">{ident.style}</Badge>}
              {(ident.colors || []).map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
            </div>
            {ident.brand_supported && ident.brand_suggestion ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
                <Check className="w-3 h-3" /> The photo shows a brand marking: {ident.brand_suggestion}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                We could not confirm a brand from this photo. If you know it, type it below.
              </p>
            )}
            {(ident.uncertainties || []).length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Not confirmed: {ident.uncertainties.join(', ')}
              </p>
            )}
          </div>

          {ident.multiple_objects && (ident.objects || []).length > 1 && (
            <div>
              <Label className="text-xs">Which item are you looking for?</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ident.objects.map(obj => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => setFocus(obj)}
                    className={`px-2 py-1 rounded-full text-xs border ${focus === obj ? 'bg-cyan-700 text-white border-cyan-700' : 'border-slate-300 text-slate-700'}`}
                  >
                    {obj}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="iso-photo-brand" className="text-xs">Brand or maker (optional)</Label>
            <Input id="iso-photo-brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Type it only if you know it" />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 flex items-start gap-2">
            <Eye className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-600">
              Your photo is stored privately — only you can open it. It is never shown publicly unless you share it.
            </p>
          </div>

          <Button onClick={confirm} className="w-full bg-cyan-700 hover:bg-cyan-800 gap-2">
            Looks right, continue <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => { setIdent(null); setPreview(''); setPhoto(null); }} className="w-full text-slate-600">
            Use a different photo
          </Button>
        </div>
      )}
    </div>
  );
}