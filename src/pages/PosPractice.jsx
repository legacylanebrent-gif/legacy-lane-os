// Chapter 19 P1-16 — POS PRACTICE: a client-only training simulator. It
// writes NOTHING to the database — practicing a checkout, a declined card, a
// discount question, and a pickup is always safe. Scenarios mirror the
// authority matrix and the payment-truth doctrine (a failed payment is never
// paid).
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle2, GraduationCap, Trash2, XCircle } from 'lucide-react';

const SAMPLE_ITEMS = [
  { id: 'p1', title: 'Dining table', number: '#012', price: 150 },
  { id: 'p2', title: 'Box of kitchen utensils', number: '#037', price: 8 },
  { id: 'p3', title: 'Lamp with shade', number: '#054', price: 20 },
  { id: 'p4', title: 'Sterling flatware set (HIGH VALUE)', number: '#003', price: 600, highValue: true },
];

const SCENARIOS = [
  {
    key: 's1', situation: 'A buyer offers $40 for the lamp marked $60.',
    options: ['Accept the $40', 'Record the offer and ask the operator', 'Say no and walk away'],
    correct: 1,
    why: 'Accepting an offer is an operator decision. Record the offer (who, item, amount) and ask — never decide for them, and never say "no" on the company\'s behalf either.',
  },
  {
    key: 's2', situation: 'The card reader shows DECLINED. The buyer says their bank always does this and asks to take the dresser anyway.',
    options: ['Let them take it — they seem trustworthy', 'Ask the operator', 'Take a photo of their ID and let them take it'],
    correct: 1,
    why: 'A failed or unknown payment is NEVER paid. Do not release merchandise. Do not collect ID documents either — that is not your call. Raise a payment issue and let the operator decide.',
  },
  {
    key: 's3', situation: 'A family member says: "Keep that painting off the sale, Mom wants it."',
    options: ['Pull the painting from the floor yourself', 'Record what they said and ask the operator for a client decision', 'Ignore them — only the operator speaks for the client'],
    correct: 1,
    why: 'A family statement is never authorization. Record it and escalate. Only a recorded client decision changes what happens to merchandise.',
  },
  {
    key: 's4', situation: 'The buyer paid cash for the dresser and arranged a friend to pick it up tomorrow.',
    options: ['Release it today anyway — it is paid', 'Only release to the named authorized person, and record the pickup when it happens', 'Refuse — pickups are operator-only'],
    correct: 1,
    why: 'Paid merchandise can be released when the record shows it paid — release only to the buyer or the person they authorized by name, and record when the pickup happens.',
  },
  {
    key: 's5', situation: 'You find an envelope with $200 in a dresser drawer.',
    options: ['Put it in the till — it is sale money', 'Keep it safe, record a discovery with a photo, and tell the operator immediately', 'Put it back and say nothing'],
    correct: 1,
    why: 'Found cash is never sale revenue. Secure it, record it, and escalate. Cash is handled only by the operator.',
  },
];

const PayIcon = ({ ok }) => (ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />);

export default function PosPractice() {
  const [cart, setCart] = useState([]);
  const [tendered, setTendered] = useState('');
  const [payResult, setPayResult] = useState(null); // 'approved' | 'declined' | {change}
  const [answers, setAnswers] = useState({});

  const total = cart.reduce((s, i) => s + i.price, 0);
  const add = (item) => setCart((c) => [...c, { ...item, key: `${item.id}-${Date.now()}` }]);
  const remove = (key) => setCart((c) => c.filter((i) => i.key !== key));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-cyan-700" /> Checkout & Payment Practice
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">PRACTICE MODE — nothing is saved</Badge>
          <p className="text-xs text-slate-500">A safe place to practice sale-day situations. No real orders, items, or payments are created.</p>
        </div>
      </div>

      <Tabs defaultValue="cart" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cart">Scan & cart</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="pickup">Pickup</TabsTrigger>
          <TabsTrigger value="scenarios">What can I decide?</TabsTrigger>
        </TabsList>

        <TabsContent value="cart" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Practice items</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_ITEMS.map((i) => (
                <button key={i.id} onClick={() => add(i)} disabled={!!i.highValue}
                  className={`text-left p-2.5 rounded-lg border text-sm ${i.highValue ? 'border-red-200 bg-red-50 opacity-70 cursor-not-allowed' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className="font-medium text-slate-800">{i.number} {i.title}</span>
                  <span className="block text-xs text-slate-500">${i.price}</span>
                  {i.highValue && <span className="block text-[11px] text-red-600 mt-0.5">High Value — in practice, ask the operator to check this one out</span>}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Cart</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {cart.length === 0 && <p className="text-sm text-slate-400">Tap items above to "scan" them.</p>}
              {cart.map((c) => (
                <div key={c.key} className="flex items-center justify-between text-sm p-1.5 rounded bg-slate-50">
                  <span>{c.number} {c.title} — ${c.price}</span>
                  <button onClick={() => remove(c.key)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {cart.length > 0 && <p className="text-sm font-semibold text-slate-800 pt-1 border-t border-slate-200">Total: ${total}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Take payment (practice)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setPayResult({ cash: true })}>Practice: cash</Button>
                <Button variant="outline" onClick={() => setPayResult({ approved: true })}>Practice: card approved</Button>
                <Button variant="outline" className="border-red-300 text-red-700" onClick={() => setPayResult({ declined: true })}>Practice: card DECLINED</Button>
              </div>
              {payResult?.cash && (
                <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-sm text-slate-600">Cash tendered:</p>
                  <Input type="number" min="0" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder="e.g. 60" className="max-w-32" />
                  {tendered !== '' && (
                    <p className="text-sm font-medium">
                      {Number(tendered) >= total
                        ? <span className="text-green-700 flex items-center gap-1.5"><PayIcon ok /> Change due: ${(Number(tendered) - total).toFixed(2)}</span>
                        : <span className="text-red-600 flex items-center gap-1.5"><PayIcon ok={false} /> Not enough — need ${(total - Number(tendered)).toFixed(2)} more</span>}
                    </p>
                  )}
                </div>
              )}
              {payResult?.approved && (
                <p className="text-sm text-green-700 flex items-center gap-1.5"><PayIcon ok /> Card approved — payment truth recorded. The merchandise may be released to the buyer.</p>
              )}
              {payResult?.declined && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>DECLINED means not paid. Do NOT release the merchandise, do not take matters into your own hands — raise a payment issue and find the operator.</span>
                </div>
              )}
              {total === 0 && <p className="text-xs text-slate-400">Scan items in the first tab first (total $0).</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pickup" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pickup lifecycle (practice)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                'Paid at checkout → the item is sold, NOT yet picked up.',
                'Buyer arrives → check the item shows PAID before releasing anything.',
                'Someone else arrives → release only to the buyer or the person the buyer authorized BY NAME (recorded by the operator).',
                'Released → record that the pickup happened. Until then the item shows as awaiting pickup.',
                'Anything unclear → ask for help. Never release on a promise, a screenshot, or a text.',
              ].map((s, i) => (
                <p key={i} className="flex items-start gap-2 text-slate-700"><span className="text-cyan-700 font-semibold">{i + 1}.</span>{s}</p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-3">
          {SCENARIOS.map((s) => (
            <Card key={s.key}>
              <CardHeader className="pb-2"><CardTitle className="text-base font-normal text-slate-800">{s.situation}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {s.options.map((opt, oi) => {
                  const answered = answers[s.key] != null;
                  const isCorrect = oi === s.correct;
                  return (
                    <button key={oi} disabled={answered}
                      onClick={() => setAnswers((a) => ({ ...a, [s.key]: oi }))}
                      className={`w-full text-left text-sm p-2 rounded-lg border ${answered
                        ? (isCorrect ? 'border-green-300 bg-green-50' : oi === answers[s.key] ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white opacity-60')
                        : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      {opt}
                    </button>
                  );
                })}
                {answers[s.key] != null && (
                  <p className={`text-xs p-2 rounded-md ${answers[s.key] === s.correct ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    {answers[s.key] === s.correct ? 'Correct — ' : 'Not quite — '}{s.why}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}