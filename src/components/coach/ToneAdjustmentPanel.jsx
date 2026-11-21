import React from 'react';
import { Flame, Zap, Heart, Briefcase, Clock, Volume2, Bookmark } from 'lucide-react';

// These controls sit inside the dark AI Coach panel. They are plain buttons with
// solid dark surfaces and white labels — not theme buttons — so the text can never
// fall back to light gray on white.
const TONES = [
  { key: 'warmer', label: 'Warmer', Icon: Flame, icon: 'text-orange-400' },
  { key: 'shorter', label: 'Shorter', Icon: Zap, icon: 'text-cyan-300' },
  { key: 'emotional', label: 'Emotional', Icon: Heart, icon: 'text-pink-400' },
  { key: 'professional', label: 'Pro', Icon: Briefcase, icon: 'text-blue-300' },
  { key: 'urgent', label: 'Urgent', Icon: Clock, icon: 'text-red-400' },
  { key: 'calm', label: 'Calm', Icon: Volume2, icon: 'text-green-400' },
];

const BTN =
  'inline-flex items-center justify-center gap-1 h-8 px-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs font-semibold transition-colors hover:bg-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed';

export default function ToneAdjustmentPanel({ onAdjust, onSaveStyle, isAdjusting }) {
  return (
    <div className="mt-3 ml-8 space-y-2 border-t border-slate-700 pt-2">
      <p className="text-xs text-slate-200 font-semibold">Adjust tone</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TONES.map(({ key, label, Icon, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAdjust(key)}
            disabled={isAdjusting}
            className={BTN}
          >
            <Icon className={`w-3 h-3 ${icon}`} />
            <span className="text-white">{label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSaveStyle()}
        disabled={isAdjusting}
        className="inline-flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Bookmark className="w-3 h-3" />
        Save as my style
      </button>
    </div>
  );
}