import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, SkipForward, HelpCircle } from 'lucide-react';
import { suggestIsoQuestions } from './isoApi';

/**
 * At most three adaptive questions, never repeating a topic already answered.
 * Every question is answerable with "No preference" so nothing is forced.
 */
export default function IsoQuestionsStep({ known, accountPreferences, onDone, onSkip }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [freeText, setFreeText] = useState({});
  const [intent, setIntent] = useState(null);

  useEffect(() => {
    let alive = true;
    suggestIsoQuestions({ known, accountPreferences })
      .then(res => {
        if (!alive) return;
        setQuestions(res.questions || []);
        setIntent({ suggestion: res.intent_suggestion || 'ongoing', reason: res.intent_reason || '' });
      })
      .catch(() => alive && setQuestions([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const answerFor = (q) => {
    const typed = (freeText[q.id] || '').trim();
    if (typed) return typed;
    return answers[q.id] || '';
  };

  const finish = () => {
    const collected = {};
    const asked = [];
    questions.forEach(q => {
      const value = answerFor(q);
      asked.push(q.topic);
      if (value) collected[q.topic] = value;
    });
    onDone({ answers: collected, askedTopics: asked, intent });
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Working out what to ask…
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          You have already described enough for us to start. You can fine-tune budget and area in the next step.
        </p>
        <Button onClick={() => onDone({ answers: {}, askedTopics: [], intent })} className="w-full bg-cyan-700 hover:bg-cyan-800 gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        A few quick questions make your matches much better. Every one can be skipped.
      </p>

      {questions.map(q => (
        <div key={q.id} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{q.question}</p>
              {q.why && <p className="text-[11px] text-slate-500">{q.why}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {[...(q.options || []), 'No preference'].map(option => {
              const active = (answers[q.id] || '') === option || (!answers[q.id] && option === 'No preference' && !freeText[q.id]);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setAnswers({ ...answers, [q.id]: option === 'No preference' ? '' : option });
                    setFreeText({ ...freeText, [q.id]: '' });
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-cyan-700 text-white border-cyan-700' : 'border-slate-300 text-slate-700 hover:border-cyan-400'}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {q.allow_free_text && (
            <Input
              className="mt-2 h-9 text-sm"
              placeholder="Or type your own answer"
              value={freeText[q.id] || ''}
              onChange={e => setFreeText({ ...freeText, [q.id]: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={finish} className="flex-1 bg-cyan-700 hover:bg-cyan-800 gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={onSkip} className="gap-1 text-slate-600">
          <SkipForward className="w-4 h-4" /> Skip
        </Button>
      </div>
    </div>
  );
}