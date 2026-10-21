import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Camera } from 'lucide-react';

// Chapter 8 P2 — AI STAGING COACH (advisory mode only; deliberately NOT Chapter 17
// staging intelligence). The operator may share a room photo and/or describe the
// room; the AI suggests practical staging considerations with hedged language.
// PHOTO OBSERVATION / AI SUGGESTION / OPERATOR DECISION stay distinct, and
// nothing here is ever written into canonical sale records automatically.
export default function AiStagingCoachPanel({ sale }) {
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!description.trim() && !file) { setError('Describe the room or attach a photo first.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let photoUrl = null;
      if (file) {
        // Property photos stay private: private storage + time-limited signed URL for the AI call only.
        const up = await base44.integrations.Core.UploadPrivateFile({ file });
        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: up.file_uri, expires_in: 900 });
        photoUrl = signed.signed_url;
      }
      const prompt = `You are an ADVISORY staging coach for an estate sale. The operator is preparing the sale "${sale.title}".
${photoUrl ? 'A room photo is attached. First list what is VISIBLY present (merchandise, furniture, tables, racks, walkways, boxes, clutter) — PHOTO OBSERVATION only; do not guess at anything not visible.' : 'No photo is provided — rely only on the operator description.'}
${description.trim() ? `OPERATOR ROOM DESCRIPTION: ${description.trim()}` : ''}

Suggest practical staging considerations in these areas ONLY where the facts support them:
- merchandise grouping; traffic flow; visibility of key merchandise
- table/rack use; price visibility; reducing clutter
- operational efficiency (checkout sightlines, staff visibility, high-value/controlled-display handling)

STRICT RULES:
- Use hedged, advisory language: "Consider...", "Review...", "Possible issue: ...", "The operator should verify...".
- NEVER certify or imply safety, security, structural condition, ADA compliance, fire-code compliance, legal occupancy, or electrical adequacy. You are not qualified to judge any of these.
- Do not make claims about the property beyond what is visible/described. If something is unknown, say it is unknown.
- Do not invent merchandise, values, or client information.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: photoUrl ? [photoUrl] : undefined,
        response_json_schema: {
          type: 'object',
          properties: {
            photo_observations: { type: 'array', items: { type: 'string' } },
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: { type: 'string' },
                  suggestion: { type: 'string' },
                  why: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setResult(res || {});
      setFile(null);
    } catch (e) {
      console.error(e);
      setError('Could not analyze. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" />AI Staging Coach <Badge variant="outline" className="font-normal">Advisory</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Describe a room (and optionally attach a photo — stored privately, never shown publicly). Suggestions are advisory
          considerations only: the AI never certifies safety, security, structural, ADA, fire-code, occupancy or electrical
          adequacy, and nothing is written to sale records automatically.
        </p>
        <Textarea
          placeholder="e.g. Living room, moderate volume: two sofas to sell, mixed smalls on shelves, one folding table, narrow doorway to dining room..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-md px-3 h-9 cursor-pointer hover:bg-slate-50 min-w-0">
            <Camera className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{file ? file.name : 'Attach room photo (private)'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <Button onClick={analyze} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Analyzing...</> : 'Get staging considerations'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="space-y-3 pt-2">
            {(result.photo_observations || []).length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Photo observation (what is visible)</p>
                <ul className="text-sm text-slate-700 space-y-1 list-disc pl-4">
                  {(result.photo_observations || []).map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            )}
            {(result.suggestions || []).length > 0 && (
              <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-1">AI suggestion (advisory — not fact)</p>
                <ul className="text-sm text-slate-700 space-y-2 list-disc pl-4">
                  {(result.suggestions || []).map((s, i) => (
                    <li key={i}><span className="font-medium">{s.area}:</span> {s.suggestion}{s.why ? <span className="text-slate-500"> ({s.why})</span> : null}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Operator decision (yours only)</p>
              <p className="text-sm text-slate-600">
                Suggestions are not saved to sale records. Take what helps, verify it on site, and record real commitments
                where your team works — SaleTasks or the security/checkout reviews above.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}