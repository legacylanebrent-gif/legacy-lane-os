import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronDown, ChevronUp, Eye } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'operator_intro',
    name: 'Friendly Intro — Operator',
    subject: 'Run your estate sales like a pro (my referral link inside)',
    body: `Hi {{name}},

I've been using Legacy Lane OS to run my estate sale business and it's been a game changer — AI-powered marketing, online auctions, a full POS system, and so much more.

I thought of you and wanted to share my referral link so you can try it free for a full month:

👉 {{referral_link}}

Use code {{referral_code}} at checkout to make sure the trial is applied.

If you have any questions, just reach out — happy to walk you through it.

{{sender_name}}`,
  },
  {
    id: 'operator_growth',
    name: 'Growth-Focused — Operator',
    subject: 'How I tripled my estate sale revenue (and how you can too)',
    body: `Hi {{name}},

Quick note — if you're still running your estate sale business without a dedicated platform, you're leaving serious money on the table.

Legacy Lane OS has changed the way I operate: AI content generation, buyer loyalty rewards, online marketplace, VIP pre-sale events, and full analytics.

Try it free for 30 days using my personal referral link:

{{referral_link}}

No credit card needed. Cancel anytime.

{{sender_name}}`,
  },
  {
    id: 'operator_casual',
    name: 'Short & Casual — Operator',
    subject: "Thought you'd love this tool",
    body: `Hey {{name}},

I'm on a platform called Legacy Lane OS that handles everything for my estate sale business and I think you'd really like it.

Here's my referral link — gives you a free month to try it out:
{{referral_link}}

Let me know what you think!

{{sender_name}}`,
  },
  {
    id: 'consumer_invite',
    name: 'Shopper Invite — Consumer',
    subject: `You're invited to find amazing estate sales near you`,
    body: `Hi {{name}},

I wanted to share a site I've been using to find incredible estate sales nearby — EstateSalen.com.

You can browse sales on an interactive map, get alerts for new sales in your area, and even shop online from home.

Sign up using my link and we both earn rewards:

{{referral_link}}

Hope to see you at a sale soon!

{{sender_name}}`,
  },
];

export default function BatchEmailTemplateSelector({ referralLink, referralCode, senderName, selected, onSelect }) {
  const [previewId, setPreviewId] = useState(null);

  const previewBody = (t) =>
    t.body
      .replace(/\{\{name\}\}/g, 'Jane')
      .replace(/\{\{referral_link\}\}/g, referralLink)
      .replace(/\{\{referral_code\}\}/g, referralCode)
      .replace(/\{\{sender_name\}\}/g, senderName || 'Your Name');

  return (
    <div className="space-y-3">
      {TEMPLATES.map(t => {
        const isSelected = selected?.id === t.id;
        const isPreviewing = previewId === t.id;

        return (
          <div
            key={t.id}
            className={`border rounded-2xl overflow-hidden transition-all cursor-pointer ${
              isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200 hover:border-orange-300'
            }`}
          >
            {/* Header row */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              onClick={() => onSelect(isSelected ? null : t)}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                <p className="text-xs text-slate-400 truncate">Subject: {t.subject}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewId(isPreviewing ? null : t.id); }}
                className="text-slate-400 hover:text-orange-500 flex-shrink-0 flex items-center gap-1 text-xs font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                {isPreviewing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Preview panel */}
            {isPreviewing && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-sm text-slate-700 mb-3">{t.subject}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Body Preview</p>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed bg-white border border-slate-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {previewBody(t)}
                </pre>
              </div>
            )}
          </div>
        );
      })}

      {selected && (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 px-1">
          <Check className="w-3.5 h-3.5" /> "{selected.name}" selected — your referral link is auto-inserted
        </p>
      )}
    </div>
  );
}