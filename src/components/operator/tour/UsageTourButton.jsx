import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Prominent launcher for the guided usage tour + AI help.
 * tone="hero" sits on the dark operator hero, tone="light" on white surfaces.
 */
export default function UsageTourButton({ onClick, tone = 'light', className, label = 'AI Guided Tour' }) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        'w-full sm:w-auto font-semibold shadow-md',
        tone === 'hero'
          ? 'bg-cyan-400 text-slate-900 hover:bg-cyan-300'
          : 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white hover:from-cyan-700 hover:to-teal-600',
        className
      )}
    >
      <Sparkles className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}