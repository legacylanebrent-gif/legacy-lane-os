import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  cqCategoryLabel, cqJurisdictionLabel, cqStatusLabel, cqSourceLabel, escalationHint,
} from './complianceModel';

// Chapter 6 P2 — the AI Compliance Research Assistant. A GUARDED MODE of the existing
// AI Coach: it identifies questions, organizes known facts, flags missing information,
// suggests source types, and may suggest professional review. It can NEVER verify
// anything, invent sources, or claim legal certainty — and it cannot change status.
export default function AiResearchPanel({ open, onClose, question, user }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState('');

  const runResearch = async () => {
    setLoading(true); setError(''); setOutput(null);
    try {
      const prompt = [
        `Please help me organize research for this business/compliance question.`,
        `QUESTION: ${question.question}`,
        `CATEGORY: ${cqCategoryLabel(question.category)}`,
        `JURISDICTION: ${cqJurisdictionLabel(question.jurisdiction_type)}${question.jurisdiction_name ? ` — ${question.jurisdiction_name}` : ''}`,
        `CURRENT PROVENANCE STATUS: ${cqStatusLabel(question.status)}`,
        question.source_name ? `SOURCE RECORDED SO FAR: ${question.source_name} (${cqSourceLabel(question.source_type) || 'type not set'})` : 'SOURCE RECORDED SO FAR: none',
        question.notes ? `OPERATOR NOTES: ${question.notes}` : '',
        `What information is missing, what source TYPES should I research (never invent specific agency names, URLs, requirements, deadlines or fees), and does this question warrant review by a professional?`,
      ].filter(Boolean).join('\n');

      const res = await base44.functions.invoke('operatorAiCoach', {
        operator_id: user.id,
        screen_context: 'Compliance Questions',
        ai_mode: 'compliance_research',
        user_message: prompt,
        requested_output_type: 'markdown',
      });
      setOutput(res.data?.response || '');
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e.message || 'The research assistant is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" /> AI Research Assist
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p className="flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              This assistant organizes research only. Its output is an AI SUGGESTION — not legal, tax, insurance, or employment advice, and never a verified requirement.</p>
            <p>It cannot change this question's verification status. Only you can set a verified status, based on a source or professional you identify.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">{question.question}</div>
          {escalationHint(question.category) && (
            <p className="text-xs text-purple-700">{escalationHint(question.category)}</p>
          )}
          {!output && !loading && (
            <Button onClick={runResearch} className="w-full bg-orange-600 hover:bg-orange-700">
              <Sparkles className="w-4 h-4 mr-2" /> Prepare research plan for this question
            </Button>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Organizing the research plan…
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {output && (
            <div className="border border-slate-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {output}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}