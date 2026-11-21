import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Trash2, ArrowRight } from 'lucide-react';
import { GLOSSARY_CATEGORIES } from './CoachSaveDialog';
import { downloadEntry } from './glossaryFile';

const labelFor = (value) => (GLOSSARY_CATEGORIES.find(c => c.value === value) || {}).label || 'Other';

export default function GlossaryEntryCard({ entry, onOpen, onDelete }) {
  return (
    <Card className="hover:border-cyan-300 transition-colors">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-snug">{entry.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {entry.saved_at ? new Date(entry.saved_at).toLocaleDateString() : ''}
              {entry.mode_label ? ` · ${entry.mode_label}` : ''}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] whitespace-nowrap">{labelFor(entry.category)}</Badge>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{entry.summary || (entry.content || '').slice(0, 180)}</p>
        {(entry.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(entry.tags || []).map(t => (
              <span key={t} className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{t}</span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpen(entry)}>
            Open <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadEntry(entry)}>
            <Download className="w-3 h-3 mr-1" />File
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:bg-red-50 ml-auto" onClick={() => onDelete(entry)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}