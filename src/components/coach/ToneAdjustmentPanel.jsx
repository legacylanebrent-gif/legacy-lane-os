import React from 'react';
import { Button } from '@/components/ui/button';
import { Flame, Zap, Heart, Briefcase, Clock, Volume2 } from 'lucide-react';

export default function ToneAdjustmentPanel({ onAdjust, onSaveStyle, isAdjusting }) {
  return (
    <div className="mt-3 space-y-2 border-t border-slate-700 pt-2">
      <p className="text-xs text-slate-400 font-medium">Adjust tone:</p>
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('warmer')}
          disabled={isAdjusting}
          className="h-7 border-slate-600 text-slate-300 hover:border-orange-500/60 hover:text-orange-300 hover:bg-orange-950/20"
        >
          <Flame className="w-3 h-3 mr-1" /> Warmer
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('shorter')}
          disabled={isAdjusting}
          className="h-7 border-slate-600 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300 hover:bg-cyan-950/20"
        >
          <Zap className="w-3 h-3 mr-1" /> Shorter
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('emotional')}
          disabled={isAdjusting}
          className="h-7 border-slate-600 text-slate-300 hover:border-pink-500/60 hover:text-pink-300 hover:bg-pink-950/20"
        >
          <Heart className="w-3 h-3 mr-1" /> Emotional
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('professional')}
          disabled={isAdjusting}
          className="h-7 border-slate-600 text-slate-300 hover:border-blue-500/60 hover:text-blue-300 hover:bg-blue-950/20"
        >
          <Briefcase className="w-3 h-3 mr-1" /> Pro
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('urgent')}
          disabled={isAdjusting}
          className="h-7 border-slate-600 text-slate-300 hover:border-red-500/60 hover:text-red-300 hover:bg-red-950/20"
        >
          <Clock className="w-3 h-3 mr-1" /> Urgent
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdjust('calm')}
          disabled={isAdjusting}
          className="h-7 border-slate-600 text-slate-300 hover:border-green-500/60 hover:text-green-300 hover:bg-green-950/20"
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
          className="flex-1 h-7 border-amber-600/50 text-amber-300 hover:border-amber-500 hover:bg-amber-950/30"
        >
          💾 Save as my style
        </Button>
      </div>
    </div>
  );
}