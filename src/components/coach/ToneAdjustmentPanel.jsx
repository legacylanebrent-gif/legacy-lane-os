import React from 'react';
import { Button } from '@/components/ui/button';
import { Flame, Zap, Heart, Briefcase, Clock, Volume2 } from 'lucide-react';

// Dark surface + light text on every control: these sit inside the dark coach panel,
// so the default light button treatment made the labels almost unreadable.
const TONE_BUTTON = 'h-7 bg-slate-800 text-slate-100 border-slate-600 hover:text-white';

export default function ToneAdjustmentPanel({ onAdjust, onSaveStyle, isAdjusting }) {
  return (
    <div className="mt-3 ml-8 space-y-2 border-t border-slate-700 pt-2">
      <p className="text-xs text-slate-300 font-medium">Adjust tone:</p>
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('warmer')}
          disabled={isAdjusting}
          className={`${TONE_BUTTON} hover:border-orange-400 hover:bg-orange-900/40`}
        >
          <Flame className="w-3 h-3 mr-1" /> Warmer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('shorter')}
          disabled={isAdjusting}
          className={`${TONE_BUTTON} hover:border-cyan-400 hover:bg-cyan-900/40`}
        >
          <Zap className="w-3 h-3 mr-1" /> Shorter
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('emotional')}
          disabled={isAdjusting}
          className={`${TONE_BUTTON} hover:border-pink-400 hover:bg-pink-900/40`}
        >
          <Heart className="w-3 h-3 mr-1" /> Emotional
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('professional')}
          disabled={isAdjusting}
          className={`${TONE_BUTTON} hover:border-blue-400 hover:bg-blue-900/40`}
        >
          <Briefcase className="w-3 h-3 mr-1" /> Pro
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('urgent')}
          disabled={isAdjusting}
          className={`${TONE_BUTTON} hover:border-red-400 hover:bg-red-900/40`}
        >
          <Clock className="w-3 h-3 mr-1" /> Urgent
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('calm')}
          disabled={isAdjusting}
          className={`${TONE_BUTTON} hover:border-green-400 hover:bg-green-900/40`}
        >
          <Volume2 className="w-3 h-3 mr-1" /> Calm
        </Button>
      </div>

      <div className="flex gap-1.5 text-xs pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSaveStyle()}
          disabled={isAdjusting}
          className="flex-1 h-7 bg-slate-800 text-amber-200 border-amber-600/60 hover:bg-amber-900/30 hover:text-amber-100"
        >
          💾 Save as my style
        </Button>
      </div>
    </div>
  );
}