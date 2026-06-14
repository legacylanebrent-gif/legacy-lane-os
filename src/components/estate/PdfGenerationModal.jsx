import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FileDown, Image, FileText, CheckCircle2, Loader2, X } from 'lucide-react';

const STEPS = [
  { key: 'loading', label: 'Loading thumbnails', icon: Image },
  { key: 'building', label: 'Building PDF pages', icon: FileText },
  { key: 'done', label: 'Ready to download', icon: CheckCircle2 },
];

export default function PdfGenerationModal({ open, onClose, status, progress, onCancel }) {
  const isRunning = status === 'loading' || status === 'building';
  const isDone = status === 'done';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isRunning) onClose(); }}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => isRunning && e.preventDefault()}>
        <div className="space-y-5 py-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
              <FileDown className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isDone ? 'PDF Ready!' : 'Generating PDF'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {isDone
                ? 'Your PDF has been generated and will download automatically.'
                : 'Please wait while we prepare your PDF...'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-slate-400 text-center">{progress}%</p>
          </div>

          {/* Step indicators */}
          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const isActive = status === step.key;
              const isComplete = (() => {
                if (status === 'done') return true;
                if (status === 'building' && step.key === 'loading') return true;
                return false;
              })();
              const Icon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-orange-50 border border-orange-200' :
                    isComplete ? 'bg-green-50' : 'bg-slate-50'
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    isActive ? 'text-orange-700 font-medium' :
                    isComplete ? 'text-green-700' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cancel button while running */}
          {isRunning && onCancel && (
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={onCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}