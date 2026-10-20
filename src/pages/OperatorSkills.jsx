import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCcw, Star, TrendingUp, CheckCircle2, GraduationCap, Workflow, Users, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Chapter 3 P1 — operator skills self-assessment + personal development plan.
// A practical BUSINESS self-assessment (not a personality test, not scientific or
// diagnostic) across 11 categories, with a LEARN IT / SYSTEMIZE IT / DELEGATE IT /
// FIND A SPECIALIST plan that points at EXISTING EstateSalen systems only.

const ASSESSMENT = [
  { key: 'organization', label: 'Organization', questions: [
    'I keep written track of what needs to happen on every sale instead of relying on memory.',
    'My sale preparation follows a repeatable checklist.',
    'Important client instructions are recorded where my whole team can find them.',
  ]},
  { key: 'communication', label: 'Communication', questions: [
    'I can explain commissions and process clearly to a hesitant client.',
    'I keep a record of what I communicated to clients and when.',
    'My crew gets clear written instructions for sale day.',
  ]},
  { key: 'research', label: 'Research', questions: [
    'I know how to investigate unfamiliar merchandise.',
    'I recognize when an item needs a specialist rather than a guess.',
    'I reuse what I learned on past items instead of researching from scratch every time.',
  ]},
  { key: 'pricing', label: 'Pricing', questions: [
    'I can price common household merchandise confidently.',
    'I can recognize items that may be high value.',
    'I use data, not just gut feel, when pricing.',
  ]},
  { key: 'marketing', label: 'Marketing', questions: [
    'I promote sales consistently across channels.',
    'My marketing reaches enough buyers to hit my revenue goals.',
    'I follow a marketing timeline before every sale.',
  ]},
  { key: 'negotiation', label: 'Negotiation', questions: [
    'I can hold my commission when a client pushes back.',
    'I handle buyer haggling without giving away margin.',
    'I can negotiate fair terms with vendors and specialists.',
  ]},
  { key: 'technology', label: 'Technology', questions: [
    'I am comfortable with the software I need to run the business.',
    'I use digital tools rather than paper for critical records.',
    'I adapt quickly when a tool I rely on changes.',
  ]},
  { key: 'finances', label: 'Finances', questions: [
    'I know my actual revenue and costs per sale.',
    'I price my services to cover labor and overhead.',
    'I keep business and personal finances separate and documented.',
  ]},
  { key: 'management', label: 'Management', questions: [
    'I can hand work to others with clear instructions.',
    'My team knows exactly who owns each task.',
    'I follow up on delegated work without micromanaging.',
  ]},
  { key: 'networking', label: 'Networking', questions: [
    'I maintain active relationships with referral sources (agents, attorneys, senior move managers).',
    'I have a bench of trusted vendors and specialists.',
    'I ask for referrals and reviews systematically.',
  ]},
  { key: 'physical_work', label: 'Physical Work', questions: [
    'I can handle the physical demands of setup and sale days sustainably.',
    'I plan staffing to match the physical workload.',
    'I protect my body and energy across back-to-back sales.',
  ]},
];

const STRATEGIES = [
  { key: 'learn', label: 'Learn It', icon: GraduationCap, links: [
    { label: 'Training Blog', to: '/TrainingBlog' },
    { label: 'AI Coach (bottom-right button)', to: null },
  ]},
  { key: 'systemize', label: 'Systemize It', icon: Workflow, links: [
    { label: 'My Sales — tasks & checklists', to: '/MySales' },
    { label: 'AI Coach (bottom-right button)', to: null },
  ]},
  { key: 'delegate', label: 'Delegate It', icon: Users, links: [
    { label: 'Manage Team', to: '/ManageTeam' },
    { label: 'Task assignment in Sale Tasks', to: null },
  ]},
  { key: 'specialist', label: 'Find a Specialist', icon: Wrench, links: [
    { label: 'Vendor Management', to: '/VendorManagement' },
  ]},
];

const scoreColor = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';
const barColor = (s) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-amber-500' : 'bg-red-500';

export default function OperatorSkills() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [current, setCurrent] = useState(null);
  const [view, setView] = useState('loading'); // loading | intro | form | results
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setMe(user);
      const page = await base44.entities.OperatorSkillsAssessment.filter(
        { operator_id: user.id },
        { sort: '-created_date', limit: 20 }
      );
      const items = page.items || [];
      setAssessments(items);
      if (items.length > 0) showResults(items[0]);
      else setView('intro');
    } catch (error) {
      console.error('Error loading assessments:', error);
      setView('intro');
    }
  };

  const showResults = (record) => {
    setCurrent(record);
    const plan = (record.development_plan || []).map(p => ({ ...p }));
    // Ensure every development area has an editable plan entry.
    (record.development_areas || []).forEach(cat => {
      if (!plan.find(p => p.category === cat)) plan.push({ category: cat, weakness: '', strategies: [], note: '' });
    });
    setPlanDraft(plan);
    setView('results');
  };

  const setAnswer = (catIdx, qIdx, val) => {
    setAnswers(prev => ({ ...prev, [`${catIdx}_${qIdx}`]: val }));
  };

  const allAnswered = ASSESSMENT.every((c, ci) => c.questions.every((_, qi) => answers[`${ci}_${qi}`]));

  const submit = async () => {
    if (!allAnswered) {
      toast.error('Please rate every statement (11 categories, 3 each).');
      return;
    }
    setSubmitting(true);
    try {
      const category_scores = {};
      ASSESSMENT.forEach((c, ci) => {
        const sum = c.questions.reduce((s, _, qi) => s + answers[`${ci}_${qi}`], 0);
        category_scores[c.key] = Math.round((sum / (c.questions.length * 5)) * 100);
      });
      const overall = Math.round(Object.values(category_scores).reduce((a, b) => a + b, 0) / ASSESSMENT.length);
      const strengths = ASSESSMENT.filter(c => category_scores[c.key] >= 80).map(c => c.label);
      const byScore = [...ASSESSMENT].sort((a, b) => category_scores[a.key] - category_scores[b.key]);
      let devCats = byScore.filter(c => category_scores[c.key] < 80);
      const devAreas = devCats.map(c => c.label);
      const devKeys = devCats.map(c => c.key);
      const answersLog = ASSESSMENT.flatMap((c, ci) =>
        c.questions.map((q, qi) => ({ category: c.key, question: q, score: answers[`${ci}_${qi}`] }))
      );
      const summary = `Business self-assessment — overall ${overall}/100. Strongest areas: ${strengths.length ? strengths.join(', ') : 'none above 80 yet'}. Development priorities: ${devAreas.join(', ')}. This is a self-assessment to guide your own planning — not a scientific or diagnostic result.`;

      const created = await base44.entities.OperatorSkillsAssessment.create({
        operator_id: me.id,
        answers: answersLog,
        category_scores,
        overall_score: overall,
        strengths,
        development_areas: devAreas,
        summary,
        development_plan: devKeys.map(k => {
          const c = ASSESSMENT.find(x => x.key === k);
          return { category: c.label, weakness: '', strategies: [], note: '' };
        }),
      });
      const page = await base44.entities.OperatorSkillsAssessment.filter(
        { operator_id: me.id },
        { sort: '-created_date', limit: 20 }
      );
      setAssessments(page.items || []);
      showResults(created);
      toast.success('Assessment saved');
    } catch (error) {
      toast.error('Could not save assessment: ' + (error.message || 'error'));
    } finally {
      setSubmitting(false);
    }
  };

  const updatePlanEntry = (idx, patch) => {
    setPlanDraft(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const toggleStrategy = (idx, key) => {
    setPlanDraft(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const has = p.strategies.includes(key);
      return { ...p, strategies: has ? p.strategies.filter(s => s !== key) : [...p.strategies, key] };
    }));
  };

  const savePlan = async () => {
    setSavingPlan(true);
    try {
      await base44.entities.OperatorSkillsAssessment.update(current.id, {
        development_plan: planDraft,
      });
      const fresh = await base44.entities.OperatorSkillsAssessment.get(current.id);
      setCurrent(fresh);
      toast.success('Development plan saved');
    } catch (error) {
      toast.error('Could not save plan: ' + (error.message || 'error'));
    } finally {
      setSavingPlan(false);
    }
  };

  const scoreOf = (label) => {
    if (!current || !current.category_scores) return null;
    const c = ASSESSMENT.find(x => x.label === label);
    return c ? current.category_scores[c.key] : null;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Skills Assessment</h1>
          <p className="text-sm md:text-base text-slate-600">
            A practical business self-assessment across 11 categories — and a development plan for your weaker areas.
          </p>
        </div>
        {view === 'results' && (
          <Button variant="outline" onClick={() => { setAnswers({}); setView('form'); }} className="border-slate-300 text-slate-700 hover:bg-slate-50">
            <RotateCcw className="w-4 h-4 mr-2" /> Retake Assessment
          </Button>
        )}
      </div>

      {view === 'loading' && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
        </div>
      )}

      {view === 'intro' && (
        <Card>
          <CardContent className="pt-6 space-y-4 text-center py-8">
            <Star className="w-12 h-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-semibold text-slate-900">Know your own strengths</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Rate yourself honestly across 11 practical skill areas — 33 quick statements. You will get category scores,
              your strengths, your development areas, and a plan: Learn it, Systemize it, Delegate it, or Find a specialist.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              This is a business self-assessment to guide your own planning. It is not a personality test, and it is not a
              scientific or diagnostic result.
            </p>
            <Button onClick={() => setView('form')} className="bg-orange-600 hover:bg-orange-700">
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {view === 'form' && (
        <Card>
          <CardContent className="pt-6 space-y-8">
            <p className="text-xs text-slate-500">
              Rate each statement 1 (strongly disagree) to 5 (strongly agree) based on how your business actually runs today.
            </p>
            {ASSESSMENT.map((cat, ci) => (
              <div key={cat.key} className="border-b border-slate-100 pb-6 last:border-0">
                <h3 className="font-semibold text-slate-900 mb-3">{ci + 1}. {cat.label}</h3>
                <div className="space-y-4">
                  {cat.questions.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-sm text-slate-700 mb-1.5">{q}</p>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            onClick={() => setAnswer(ci, qi, v)}
                            className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                              answers[`${ci}_${qi}`] === v
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={submit} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Submit Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {view === 'results' && current && (
        <>
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Overall: <span className={scoreColor(current.overall_score)}>{current.overall_score}/100</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Taken {current.created_date ? format(new Date(current.created_date), 'MMM d, yyyy') : ''}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{current.summary}</p>

              <div className="space-y-2">
                {ASSESSMENT.map(cat => {
                  const s = scoreOf(cat.label);
                  if (s === null) return null;
                  return (
                    <div key={cat.key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-36 flex-shrink-0">{cat.label}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(s)}`} style={{ width: `${s}%` }} />
                      </div>
                      <span className={`text-xs font-semibold w-9 text-right ${scoreColor(s)}`}>{s}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 flex-wrap">
                {(current.strengths || []).map(s => (
                  <Badge key={s} className="bg-green-100 text-green-800 border border-green-300">Strength: {s}</Badge>
                ))}
                {(current.development_areas || []).map(s => (
                  <Badge key={s} className="bg-amber-100 text-amber-800 border border-amber-300">Develop: {s}</Badge>
                ))}
              </div>

              {assessments.length > 1 && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">History</h4>
                  <div className="flex gap-2 flex-wrap">
                    {assessments.map(a => (
                      <button
                        key={a.id}
                        onClick={() => showResults(a)}
                        className={`px-3 py-1.5 text-xs rounded-lg border ${a.id === current.id ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {a.created_date ? format(new Date(a.created_date), 'MMM d, yyyy') : '—'} · {a.overall_score}/100
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Personal Development Plan
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  For each development area, choose how you will handle it — then point the work at the EstateSalen systems that already exist.
                </p>
              </div>

              {planDraft.length === 0 ? (
                <p className="text-sm text-slate-500">No development areas — strong run. Retake after your next few sales to track changes.</p>
              ) : planDraft.map((p, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-slate-900 text-sm">{p.category}</h4>
                  <div className="space-y-1.5">
                    <Label>The specific weak area</Label>
                    <Input
                      placeholder="e.g. Pricing unfamiliar antiques / Social media marketing / Bookkeeping"
                      value={p.weakness}
                      onChange={e => updatePlanEntry(idx, { weakness: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>How will you handle it? (choose all that apply)</Label>
                    <div className="flex gap-2 flex-wrap">
                      {STRATEGIES.map(s => {
                        const on = p.strategies.includes(s.key);
                        return (
                          <button
                            key={s.key}
                            onClick={() => toggleStrategy(idx, s.key)}
                            className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 ${on ? 'bg-orange-600 text-white border-orange-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <s.icon className="w-3.5 h-3.5" />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                    {p.strategies.length > 0 && (
                      <div className="flex gap-x-4 gap-y-1 flex-wrap pt-1.5">
                        {p.strategies.map(sk => {
                          const s = STRATEGIES.find(x => x.key === sk);
                          return (
                            <div key={sk} className="text-xs text-slate-500">
                              <span className="font-medium text-slate-700">{s.label}:</span>{' '}
                              {s.links.map(l => (
                                <span key={l.label}>
                                  {l.to ? (
                                    <button onClick={() => navigate(l.to)} className="text-orange-600 hover:underline">{l.label}</button>
                                  ) : (
                                    <span>{l.label}</span>
                                  )}
                                  {l !== s.links[s.links.length - 1] ? ' · ' : ''}
                                </span>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea
                      rows={2}
                      placeholder="What exactly will you do, and by when?"
                      value={p.note}
                      onChange={e => updatePlanEntry(idx, { note: e.target.value })}
                    />
                  </div>
                </div>
              ))}

              <Button onClick={savePlan} disabled={savingPlan} className="bg-orange-600 hover:bg-orange-700">
                {savingPlan ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save Development Plan
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}