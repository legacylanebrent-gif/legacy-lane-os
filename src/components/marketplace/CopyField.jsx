import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, Copy } from 'lucide-react';

// One listing field with its own copy button, so the operator pastes straight
// into the matching Facebook Marketplace field.
export default function CopyField({ label, value, onChange, onBlur, multiline = false, rows = 4, placeholder, type = 'text' }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value === null || value === undefined ? '' : String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Clipboard blocked:', error);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] uppercase tracking-wide text-slate-500">{label}</Label>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1"
        >
          {copied ? <><Check className="w-3 h-3 text-green-600" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      {multiline ? (
        <Textarea
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          rows={rows}
          placeholder={placeholder}
          className="text-sm"
        />
      ) : (
        <Input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}