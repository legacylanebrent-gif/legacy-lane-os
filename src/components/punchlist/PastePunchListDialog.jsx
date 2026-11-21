import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardPaste, Loader2, AlertCircle } from 'lucide-react';
import { parsePastedLines, titleFromLine } from '@/lib/punchList';

export default function PastePunchListDialog({ open, onOpenChange, onCreated }) {
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const lines = parsePastedLines(text);

  const handleCreate = async () => {
    if (!lines.length) return;
    setCreating(true);
    setError('');
    try {
      const batch = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const records = lines.map((line) => ({
        title: titleFromLine(line),
        description: line,
        category: 'other',
        severity: 'medium',
        status: 'open',
        source: 'bulk_paste',
        source_ref: `Pasted ${batch}`,
      }));
      for (let i = 0; i < records.length; i += 100) {
        await base44.entities.PunchListItem.bulkCreate(records.slice(i, i + 100));
      }
      setText('');
      onOpenChange(false);
      if (onCreated) await onCreated(records.length);
    } catch (createError) {
      console.error('Paste import failed:', createError);
      setError('Those items could not be saved. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!creating) { setError(''); onOpenChange(next); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-orange-600" />
            Paste &amp; Create Punch List Items
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Paste your notes below. Each line becomes its own punch list task, with a ready-to-copy Base44 AI fix prompt.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Fix the map pins on mobile\nOperator dashboard plan strip shows the wrong price\nBundle pricing skips tax'}
            className="min-h-52 font-mono text-sm"
            disabled={creating}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              {lines.length} task{lines.length === 1 ? '' : 's'} detected
            </span>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setText('')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
                disabled={creating}
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !lines.length}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardPaste className="w-4 h-4 mr-2" />}
            {creating ? 'Creating...' : `Create ${lines.length} item${lines.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}