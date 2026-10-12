// Phase 4D (Part 12) — concise guided orientation on the client's first
// visit. No long tutorial: one screen, Start Setup or Skip Tour, remembered
// per website in localStorage.
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PartyPopper, ArrowRight } from 'lucide-react';

const STEPS = [
  'Confirm your business information',
  'Add your branding — logo and colors',
  'Customize your homepage',
  'Select your services',
  'Add your contact information',
  'Preview your website',
  'Submit it for review'
];

export default function GuidedOnboarding({ open, websiteName, onStart, onSkip }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="max-w-md" hideClose>
        <div className="text-center">
          <PartyPopper className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
          <div className="font-heading text-xl font-bold text-slate-900">Welcome to your new website</div>
          <p className="text-sm text-slate-500 mt-1">We've already created your website{websiteName ? ` — ${websiteName}` : ''}. Just finish these steps together:</p>
        </div>
        <ol className="space-y-2 my-4">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="ghost" onClick={onSkip}>Skip Tour</Button>
          <Button onClick={onStart} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Start Setup <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}