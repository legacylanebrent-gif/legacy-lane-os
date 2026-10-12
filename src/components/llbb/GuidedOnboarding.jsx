// Phase 4D (Part 12) — welcome modal, Pilot #1 P1 repair.
// Communicates: framework is already created, choose how to finish it.
// NO manual 7-step checklist — the next screen (Setup Method) presents the
// certified Phase 4F AI-first choice. Choice is remembered per website.
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PartyPopper, ArrowRight, Zap, Wrench } from 'lucide-react';

export default function GuidedOnboarding({ open, websiteName, onStart, onSkip }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="max-w-md" hideClose>
        <div className="text-center">
          <PartyPopper className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
          <div className="font-heading text-xl font-bold text-slate-900">Welcome to your new website</div>
          <p className="text-sm text-slate-500 mt-1">We've already created your website framework{websiteName ? ` — ${websiteName}` : ''}. Choose how you'd like to finish it.</p>
        </div>
        <div className="space-y-2.5 my-4">
          <div className="flex items-start gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-left">
            <Zap className="w-4 h-4 text-cyan-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-cyan-800">Fastest</div>
              <div className="text-sm text-slate-700">Let EstateSalen build your starting website for you.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left">
            <Wrench className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Manual</div>
              <div className="text-sm text-slate-700">Customize each section yourself.</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="ghost" onClick={onSkip}>I'll look around first</Button>
          <Button onClick={onStart} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Get Started <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}