import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function FeatureModal({ feature, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!feature) return;
    setLoading(true);
    setDetails(null);

    base44.integrations.Core.InvokeLLM({
      prompt: `You are a sales copywriter for Legacy Lane OS, a business platform for estate sale companies.

Write a rich, detailed feature description for: "${feature.title}"

Short description context: "${feature.desc}"

Return a JSON object with:
- "headline": a punchy one-liner (max 10 words) that leads with the business benefit
- "overview": 2-3 sentences explaining what this feature does and why it matters
- "how_it_works": array of 3-4 short bullet strings describing how the feature works step by step
- "time_saved": a specific, concrete statement about how much time or money this saves operators (e.g. "Saves operators 3–5 hours per sale")
- "business_impact": 2 sentences on the measurable business impact (more revenue, fewer mistakes, happier clients, etc.)

Be specific, concrete, and enthusiastic but professional. Focus on estate sale operators as the audience.`,
      response_json_schema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          overview: { type: 'string' },
          how_it_works: { type: 'array', items: { type: 'string' } },
          time_saved: { type: 'string' },
          business_impact: { type: 'string' },
        },
      },
    }).then(res => {
      setDetails(res);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [feature?.title]);

  if (!feature) return null;

  const Icon = feature.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${feature.accentClass}`}>
              {Icon && <Icon className="w-5 h-5" />}
            </div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">{feature.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-slate-500 text-sm">Loading feature details...</p>
            </div>
          ) : details ? (
            <>
              {/* Headline */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <p className="font-bold text-orange-700 text-base">{details.headline}</p>
              </div>

              {/* Overview */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What It Is</h3>
                <p className="text-slate-700 leading-relaxed text-sm">{details.overview}</p>
              </div>

              {/* How it works */}
              {details.how_it_works?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">How It Works</h3>
                  <ul className="space-y-2">
                    {details.how_it_works.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </div>
                        <span className="text-slate-600 text-sm leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Time saved */}
              {details.time_saved && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
                  <span className="text-green-600 text-lg mt-0.5">⏱</span>
                  <p className="text-green-800 font-semibold text-sm">{details.time_saved}</p>
                </div>
              )}

              {/* Business impact */}
              {details.business_impact && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Business Impact</h3>
                  <p className="text-slate-700 leading-relaxed text-sm">{details.business_impact}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">{feature.desc}</p>
          )}
        </div>
      </div>
    </div>
  );
}