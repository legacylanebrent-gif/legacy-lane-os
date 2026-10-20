import React from 'react';

// Extracted from SaleEditor (Chapter 4 P1 file-size refactor — no behavior change).
// Step 1 guide: flags photos that should be excluded from AI search.
export default function SaleSkipGuideModal({ open, onGotIt }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <h2 className="text-lg font-bold text-slate-900">Flag Photos to Skip</h2>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">
          Before running any AI searches, scroll through your photos and press <strong className="text-red-600">⊘ Don't Search</strong> on any image that:
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
            <span><strong>Close-up or detail shot</strong> — zoomed in on a pattern, mark, or label (not the full item)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
            <span><strong>Duplicate photo</strong> — same item photographed from a different angle</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
            <span><strong>Multi-item scene</strong> — a shelf, table, or pile of many different things that can't be identified as one item</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
            <span><strong>Non-searchable image</strong> — blurry, room overview, or anything unlikely to return a useful price</span>
          </li>
        </ul>
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
          💡 Skipped photos are excluded from Steps 2 &amp; 3, saving API credits and keeping results clean.
        </p>
        <button
          onClick={onGotIt}
          className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
        >
          Got it — I'll scroll through and flag them
        </button>
      </div>
    </div>
  );
}