import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, ChevronDown, ChevronUp, Pencil, Trash2, Ticket, Sparkles, ClipboardPaste } from 'lucide-react';
import { CATEGORY_LABELS, SEVERITY_LABELS, buildAiFixPrompt } from '@/lib/punchList';

const SEVERITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_STYLES = {
  open: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  wont_fix: 'bg-slate-200 text-slate-500',
};

const SOURCE_BADGES = {
  support_ticket: { label: 'Ticket', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Ticket },
  ai_coach: { label: 'AI Coach', className: 'bg-purple-100 text-purple-800 border-purple-200', icon: Sparkles },
  bulk_paste: { label: 'Pasted', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: ClipboardPaste },
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
  }
}

export default function PunchListItemCard({ item, onAdvance, onEdit, onDelete }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const sourceBadge = SOURCE_BADGES[item.source];
  const SourceIcon = sourceBadge?.icon;
  const isResolved = item.status === 'resolved';
  const prompt = buildAiFixPrompt(item);

  const handleCopy = async () => {
    await copyText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={item.is_launch_blocker && !isResolved ? 'border-red-300' : ''}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className={`font-semibold text-slate-900 ${isResolved ? 'line-through text-slate-400' : ''}`}>
                {item.title}
              </h3>
              {item.is_launch_blocker && !isResolved && (
                <Badge variant="destructive" className="text-[10px]">LAUNCH BLOCKER</Badge>
              )}
              <Badge className={`text-[10px] border ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium}`}>
                {SEVERITY_LABELS[item.severity] || 'Medium'}
              </Badge>
              <Badge className={`text-[10px] ${STATUS_STYLES[item.status] || STATUS_STYLES.open}`}>
                {(item.status || 'open').replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {CATEGORY_LABELS[item.category] || 'Other'}
              </Badge>
              {sourceBadge && (
                <Badge className={`text-[10px] border flex items-center gap-1 ${sourceBadge.className}`}>
                  <SourceIcon className="w-3 h-3" />
                  {sourceBadge.label}{item.source_ref ? ` ${item.source_ref}` : ''}
                </Badge>
              )}
            </div>

            {item.description && (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {item.requested_by_name && (
                <p className="text-xs text-slate-400">Reported by: {item.requested_by_name}</p>
              )}
              {item.assigned_to && (
                <p className="text-xs text-slate-400">Assigned to: {item.assigned_to}</p>
              )}
            </div>

            {showPrompt && (
              <pre className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap font-mono">
                {prompt}
              </pre>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleCopy}
              className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}
              title="Copy the Base44 AI fix prompt"
            >
              {copied ? <Check className="w-4 h-4 sm:mr-1" /> : <Copy className="w-4 h-4 sm:mr-1" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy AI prompt'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPrompt((v) => !v)} title="Show prompt">
              {showPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAdvance(item)} title="Advance status">
              Advance
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(item)} title="Edit">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(item)} title="Delete">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}