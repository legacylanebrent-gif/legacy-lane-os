import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, BrainCircuit, Sun } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Chapter 8 P2 — AI OPERATIONS COACH panel + TODAY'S PREP BRIEF. Both are
// grounded in the DETERMINISTIC preparation analysis (real records); the AI
// may summarize, surface, suggest, prioritize and explain — it may NOT mark
// equipment packed, complete checklists, approve decisions, change scope,
// mark research verified, mark a sale ready, complete tasks or process
// transactions. Human/system records stay authoritative.
const AUTHORITY_RULES = `AUTHORITY RULES (strict):
- You may summarize, surface, suggest, prioritize and explain.
- You may NOT mark anything done: do not claim equipment is packed, checklists completed, decisions approved, scope changed, research verified, tasks completed or the sale ready.
- Base every statement ONLY on the facts provided. If something is unknown, say UNKNOWN — never guess, never invent issues that are not in the records.
- Never invent facts about the property, client, items or team.`;

export default function PrepCoachPanel({ sale, prepFacts }) {
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);

  const getBrief = async () => {
    setBriefLoading(true);
    setBrief(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Operations Coach preparing an on-demand TODAY'S PREP BRIEF for the estate sale "${sale.title}".

${prepFacts}

${AUTHORITY_RULES}

Produce a concise prep brief with EXACTLY these sections (skip none; write "None from records." where a section has nothing):
TOP PRIORITIES (max 3, most time-critical first, each with why)
OPEN RESEARCH
EQUIPMENT
CLIENT QUESTIONS
MARKETING
SECURITY / CHECKOUT
TASKS DUE
Use plain markdown (### headers, short bullets). Keep it under 300 words.`,
      });
      setBrief(typeof res === 'string' ? res : (res?.response || JSON.stringify(res)));
    } catch (e) {
      console.error(e);
      setBrief('Could not generate the prep brief right now.');
    } finally {
      setBriefLoading(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setQaLoading(true);
    setAnswer(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Operations Coach for the estate sale "${sale.title}". The operator asks: "${question.trim()}"

Verified sale facts from records:
${prepFacts}

${AUTHORITY_RULES}

Answer directly and concisely in plain markdown, ending with 1-2 specific next actions the operator can take in the platform.`,
      });
      setAnswer(typeof res === 'string' ? res : (res?.response || JSON.stringify(res)));
    } catch (e) {
      console.error(e);
      setAnswer('Could not answer right now.');
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-cyan-600" />Operations Coach</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500">
          Answers come from this sale's records — equipment, research, decisions, tasks, security/checkout reviews,
          marketing readiness. The coach can summarize, suggest and prioritize; it cannot complete anything for you.
        </p>
        <div>
          <Button onClick={getBrief} disabled={briefLoading} className="bg-cyan-700 hover:bg-cyan-800">
            {briefLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Preparing...</> : <><Sun className="w-4 h-4 mr-1" />Today's Prep Brief</>}
          </Button>
        </div>
        {brief && (
          <div className="border border-slate-200 rounded-lg p-4 prose prose-sm max-w-none text-slate-800">
            <ReactMarkdown>{brief}</ReactMarkdown>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            placeholder='e.g. "What am I forgetting before this sale?"'
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask(); }}
          />
          <Button onClick={ask} disabled={qaLoading} variant="outline" className="sm:w-32">
            {qaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
          </Button>
        </div>
        {answer && (
          <div className="border border-slate-200 rounded-lg p-4 prose prose-sm max-w-none text-slate-800">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}