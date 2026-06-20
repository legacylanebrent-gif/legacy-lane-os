import React from 'react';
import { Loader2, CheckCircle2, Rocket, Copy, Edit3, Globe, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { key: 'details', label: 'Copying sale details' },
  { key: 'location', label: 'Copying location & address' },
  { key: 'images', label: 'Duplicating photos & item data' },
  { key: 'categories', label: 'Copying categories & settings' },
  { key: 'creating', label: 'Creating new draft sale' },
  { key: 'done', label: 'Done' },
];

export default function LiquidationProgressModal({ open, currentStep, error, onCancel, onConfirm, saleTitle }) {
  if (!open) return null;

  const isConfirming = currentStep === 'confirm';
  const currentIdx = isConfirming ? -1 : STEPS.findIndex(s => s.key === currentStep);
  const isDone = currentStep === 'done';
  const isError = !!error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              {isConfirming ? 'Launch Liquidation Event' : 'Launching Liquidation Event'}
            </h2>
            <p className="text-sm text-slate-500">
              {isConfirming
                ? `Duplicate "${saleTitle || 'this sale'}" for new dates`
                : isDone ? 'Sale created successfully!' : isError ? 'Something went wrong' : 'Duplicating your sale...'}
            </p>
          </div>
          {isConfirming && (
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── CONFIRMATION PHASE ── */}
        {isConfirming && (
          <div className="space-y-4">
            {/* What will happen */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                This will <strong className="text-slate-900">duplicate your entire sale</strong> — including all photos, 
                descriptions, item data, categories, and settings — into a <strong className="text-orange-700">new draft sale</strong>.
              </p>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Step 1: Duplication</p>
                    <p className="text-xs text-slate-500">The sale will be copied and saved as a <strong className="text-slate-700">draft</strong> in your account. It will <strong className="text-red-600">not</strong> appear on estatesalen.com yet.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Step 2: Edit Your Draft</p>
                    <p className="text-xs text-slate-500">You'll set <strong className="text-slate-700">new sale dates</strong>, review all photos, adjust pricing, and make any changes needed for the liquidation event.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Step 3: Publish</p>
                    <p className="text-xs text-slate-500">Once you're happy with the draft, click <strong className="text-slate-700">Publish Sale</strong> in the editor. Your sale will then go live on <strong className="text-slate-700">estatesalen.com</strong> for shoppers to discover.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What gets copied */}
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-500">What gets copied:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                <li>All photos &amp; item data (pricing is reset)</li>
                <li>Categories, sale type &amp; settings</li>
                <li>Property address &amp; location</li>
                <li>Payment methods &amp; notes</li>
              </ul>
              <p className="font-medium text-slate-500 mt-2">What you'll need to set:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                <li>New sale dates &amp; times</li>
                <li>Updated pricing &amp; descriptions</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={onCancel} className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
              <Button onClick={onConfirm} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                <Rocket className="w-4 h-4 mr-2" />
                Launch Liquidation
              </Button>
            </div>
          </div>
        )}

        {/* ── PROGRESS PHASE ── */}
        {!isConfirming && (
          <>
            {/* Progress Steps */}
            <div className="space-y-1">
              {STEPS.map((step, idx) => {
                const completed = idx < currentIdx || isDone;
                const active = idx === currentIdx && !isDone && !isError;
                const failed = isError && idx === currentIdx;

                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      completed ? 'bg-green-50' : active ? 'bg-orange-50' : failed ? 'bg-red-50' : 'bg-slate-50'
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : active ? (
                      <Loader2 className="w-5 h-5 text-orange-600 animate-spin flex-shrink-0" />
                    ) : failed ? (
                      <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 text-xs font-bold">!</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        completed ? 'text-green-800 font-medium' :
                        active ? 'text-orange-800 font-medium' :
                        failed ? 'text-red-700' :
                        'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Overall Progress Bar */}
            {!isDone && !isError && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span>{currentIdx} of {STEPS.length - 1} steps</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(5, (currentIdx / (STEPS.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Done state */}
            {isDone && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">Draft sale created!</p>
                </div>
                <p className="text-xs text-green-700 leading-relaxed">
                  Your liquidation event is saved as a <strong>draft</strong>. You'll be redirected to the editor where you can set new dates, review items, and click <strong>Publish Sale</strong> when ready to go live on estatesalen.com.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}