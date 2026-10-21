import React, { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff } from 'lucide-react';

// Chapter 12 P1 — VOICE → NOTE. Dictation appends spoken text to the field for the
// operator's review. NO AI organization or restructuring of spoken walkthroughs (P2).
export default function VoiceNoteInput({ value, onChange, placeholder, rows = 3, label }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = () => {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setListening(false);
  };

  const toggle = () => {
    if (listening) return stop();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) onChange(((value || '') + ' ' + text.trim()).trim());
    };
    rec.onend = () => { if (recRef.current === rec) { recRef.current = null; setListening(false); } };
    rec.onerror = () => stop();
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium text-slate-600">{label}</p>}
      <div className="relative">
        <Textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="pr-11 text-base" />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? 'Stop dictation' : 'Dictate note'}
            className={`absolute right-2 bottom-2 w-9 h-9 rounded-full flex items-center justify-center border ${listening ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-white border-slate-300 text-slate-500'}`}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>
      {listening && (
        <p className="text-[10px] text-cyan-600">Listening — tap to stop. Spoken text is added for your review; nothing is auto-organized.</p>
      )}
    </div>
  );
}