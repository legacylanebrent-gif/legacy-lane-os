import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

const TONE_OPTIONS = [
  { value: 'warm', label: 'Warm & Friendly' },
  { value: 'direct', label: 'Direct & Straightforward' },
  { value: 'premium', label: 'Premium & Exclusive' },
  { value: 'casual', label: 'Casual & Approachable' },
  { value: 'emotional', label: 'Emotional & Empathetic' },
  { value: 'professional', label: 'Professional & Authoritative' },
];

const VOICE_TONE_OPTIONS = [
  { value: 'faith-based', label: '🙏 Faith-Based' },
  { value: 'neutral', label: '⚖️ Neutral' },
  { value: 'luxury', label: '✨ Luxury' },
  { value: 'family-first', label: '👨‍👩‍👧‍👦 Family-First' },
  { value: 'practical', label: '🔧 Practical' },
];

export default function VoicePreferencesModal({ open, onOpenChange, preferences, onSave }) {
  const [form, setForm] = useState(preferences || {
    language_tone: 'warm',
    voice_tone: 'neutral',
    preferred_cta: '',
    post_length: 'medium',
    urgency_level: 'balanced',
    common_phrases: '',
    disliked_phrases: '',
  });

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Your Voice & Style Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Language Tone */}
          <div>
            <Label className="text-slate-300 text-sm">How do you prefer to sound?</Label>
            <Select value={form.language_tone} onValueChange={v => setForm(p => ({ ...p, language_tone: v }))}>
              <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {TONE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-slate-200">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Tone (thematic) */}
          <div>
            <Label className="text-slate-300 text-sm">What's your voice tone?</Label>
            <Select value={form.voice_tone} onValueChange={v => setForm(p => ({ ...p, voice_tone: v }))}>
              <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {VOICE_TONE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-slate-200">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post Length */}
          <div>
            <Label className="text-slate-300 text-sm">Preferred post length?</Label>
            <Select value={form.post_length} onValueChange={v => setForm(p => ({ ...p, post_length: v }))}>
              <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="short" className="text-slate-200">Short (1–2 sentences)</SelectItem>
                <SelectItem value="medium" className="text-slate-200">Medium (3–5 sentences)</SelectItem>
                <SelectItem value="long" className="text-slate-200">Long (detailed, 200+ words)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Urgency Level */}
          <div>
            <Label className="text-slate-300 text-sm">Preferred urgency level?</Label>
            <Select value={form.urgency_level} onValueChange={v => setForm(p => ({ ...p, urgency_level: v }))}>
              <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="calm" className="text-slate-200">Calm & Relaxed</SelectItem>
                <SelectItem value="balanced" className="text-slate-200">Balanced</SelectItem>
                <SelectItem value="urgent" className="text-slate-200">Urgent & Time-Sensitive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred CTA */}
          <div>
            <Label className="text-slate-300 text-sm">Phrases you like to use for CTAs?</Label>
            <Textarea
              value={form.preferred_cta}
              onChange={e => setForm(p => ({ ...p, preferred_cta: e.target.value }))}
              placeholder="e.g., 'Call me today', 'Schedule your free walkthrough', 'Let's chat'"
              className="mt-1 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 resize-none h-20"
            />
            <p className="text-xs text-slate-500 mt-1">Separate multiple phrases with commas</p>
          </div>

          {/* Common Phrases */}
          <div>
            <Label className="text-slate-300 text-sm">Phrases you use often?</Label>
            <Textarea
              value={form.common_phrases}
              onChange={e => setForm(p => ({ ...p, common_phrases: e.target.value }))}
              placeholder="e.g., 'One of a kind', 'Family heirloom', 'Hidden gems', 'Estate treasures'"
              className="mt-1 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 resize-none h-20"
            />
            <p className="text-xs text-slate-500 mt-1">Separate multiple phrases with commas</p>
          </div>

          {/* Disliked Phrases */}
          <div>
            <Label className="text-slate-300 text-sm">Phrases to avoid?</Label>
            <Textarea
              value={form.disliked_phrases}
              onChange={e => setForm(p => ({ ...p, disliked_phrases: e.target.value }))}
              placeholder="e.g., 'junk', 'old stuff', 'clearance'"
              className="mt-1 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 resize-none h-20"
            />
            <p className="text-xs text-slate-500 mt-1">Separate multiple phrases with commas</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">Save Preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}