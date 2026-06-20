import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Rocket } from 'lucide-react';

const STEPS = [
  { key: 'details', label: 'Copying sale details' },
  { key: 'location', label: 'Copying location & address' },
  { key: 'images', label: 'Duplicating photos & item data' },
  { key: 'categories', label: 'Copying categories & settings' },
  { key: 'creating', label: 'Creating new draft sale' },
  { key: 'done', label: 'Ready' },
];

export default function LiquidationProgressModal({ open, currentStep, error }) {
  if (!open) return null;

  const currentIdx = STEPS.findIndex(s => s.key === currentStep);
  const isDone = currentStep === 'done';
  const isError = !!error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Launching Liquidation Event</h2>
            <p className="text-sm text-slate-500">
              {isDone ? 'Sale created successfully!' : isError ? 'Something went wrong' : 'Duplicating your sale...'}
            </p>
          </div>
        </div>

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
                {/* Icon */}
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

                {/* Label */}
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-700 font-medium">Redirecting to edit your new sale...</p>
          </div>
        )}
      </div>
    </div>
  );
}