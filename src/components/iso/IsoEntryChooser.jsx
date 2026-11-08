import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PenLine, MessageSquare, Camera, ListPlus, ArrowRight } from 'lucide-react';

/**
 * First screen of the ISO flow: three ways to say what you are looking for.
 * The customer's own words are kept verbatim in `original_wording`.
 */
export default function IsoEntryChooser({ onDescribe, onGuided, onPhoto, onList }) {
  const [mode, setMode] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');

  const options = [
    { key: 'describe', icon: PenLine, title: 'Describe it myself', hint: 'Type what you are looking for in your own words' },
    { key: 'guided', icon: MessageSquare, title: 'Answer a few questions', hint: 'Three quick questions to build the search' },
    { key: 'photo', icon: Camera, title: 'Show a photo', hint: 'We describe what the photo shows, you confirm it' },
  ];

  const submitDescribe = () => {
    if (!text.trim()) return;
    onDescribe({
      title: title.trim() || text.trim().split(/[.,\n]/)[0].slice(0, 80),
      description: text.trim(),
      original_wording: text.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {options.map(opt => {
          const Icon = opt.icon;
          const active = mode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setMode(opt.key);
                if (opt.key === 'guided') onGuided();
                if (opt.key === 'photo') onPhoto();
              }}
              className={`text-left rounded-xl border-2 p-3 transition-colors ${active ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300'}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-cyan-700 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm">{opt.title}</div>
                  <div className="text-xs text-slate-500">{opt.hint}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {mode === 'describe' && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <div>
            <Label htmlFor="iso-title" className="text-xs">Short name (optional)</Label>
            <Input
              id="iso-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Mid-century walnut credenza"
            />
          </div>
          <div>
            <Label htmlFor="iso-text" className="text-xs">What are you looking for?</Label>
            <Textarea
              id="iso-text"
              rows={4}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="A 1960s walnut credenza, around 60 inches wide, good condition. I can pick up within 30 miles of Toms River."
            />
          </div>
          <Button onClick={submitDescribe} disabled={!text.trim()} className="w-full bg-cyan-700 hover:bg-cyan-800 gap-2">
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={onList}
        className="w-full flex items-center gap-2 text-sm text-cyan-800 hover:text-cyan-900 font-medium pt-1"
      >
        <ListPlus className="w-4 h-4" /> I collect or resell — build a list instead
      </button>
    </div>
  );
}