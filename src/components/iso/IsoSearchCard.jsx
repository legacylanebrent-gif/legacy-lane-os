import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Pause, Play, Archive, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import IsoCustomerMatchRow from './IsoCustomerMatchRow';

const STATUS_STYLE = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-100 text-amber-800 border-amber-200',
  fulfilled: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
};

const budgetText = (iso) => {
  if (iso.budget_min && iso.budget_max) return `$${iso.budget_min}–$${iso.budget_max}`;
  if (iso.budget_max) return `Up to $${iso.budget_max}`;
  if (iso.budget_min) return `$${iso.budget_min}+`;
  return '';
};

/** One saved ISO with its matches, lifecycle controls and feedback. */
export default function IsoSearchCard({ iso, matches, onFeedback, onStatus, onFulfill, onDelete, busyMatch }) {
  const [open, setOpen] = useState(false);
  const strong = matches.filter(m => m.match_quality === 'strong' && m.availability !== 'unavailable').length;
  const possible = matches.filter(m => m.match_quality === 'possible' && m.availability !== 'unavailable').length;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-semibold text-slate-900 break-words">{iso.title}</h3>
              <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLE[iso.status] || ''}`}>{iso.status}</Badge>
              {iso.intent === 'one_time' && <Badge variant="outline" className="text-[10px]">One-time</Badge>}
            </div>
            {iso.description && <p className="text-xs text-slate-600 line-clamp-2 mt-1">{iso.description}</p>}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {iso.brand && <Badge variant="outline" className="text-[10px]">{iso.brand}</Badge>}
              {iso.category && <Badge variant="secondary" className="text-[10px]">{iso.category}</Badge>}
              {budgetText(iso) && <span className="text-[11px] text-slate-600">{budgetText(iso)}</span>}
              {iso.zip_code && <span className="text-[11px] text-slate-500">{iso.zip_code}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-slate-900">{strong + possible}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">matches</div>
            {strong > 0 && <div className="text-[10px] text-emerald-700">{strong} strong</div>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Button size="sm" variant="outline" onClick={() => setOpen(!open)} className="h-7 text-xs gap-1">
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {open ? 'Hide' : 'View'} matches
          </Button>
          {iso.status === 'active' && (
            <Button size="sm" variant="ghost" onClick={() => onStatus(iso, 'paused')} className="h-7 text-xs gap-1 text-slate-600">
              <Pause className="w-3 h-3" /> Pause
            </Button>
          )}
          {iso.status === 'paused' && (
            <Button size="sm" variant="ghost" onClick={() => onStatus(iso, 'active')} className="h-7 text-xs gap-1 text-slate-600">
              <Play className="w-3 h-3" /> Resume
            </Button>
          )}
          {['active', 'paused'].includes(iso.status) && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onFulfill(iso)} className="h-7 text-xs gap-1 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Found it
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onStatus(iso, 'archived')} className="h-7 text-xs gap-1 text-slate-600">
                <Archive className="w-3 h-3" /> Archive
              </Button>
            </>
          )}
          {iso.status !== 'archived' && (
            <Button size="sm" variant="ghost" disabled={busyMatch === iso.id} onClick={() => onStatus(iso, 'rematch')} className="h-7 text-xs gap-1 text-cyan-700">
              <RefreshCw className={`w-3 h-3 ${busyMatch === iso.id ? 'animate-spin' : ''}`} /> Check again
            </Button>
          )}
          {iso.status === 'archived' && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(iso)} className="h-7 text-xs gap-1 text-red-600">
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          )}
        </div>

        {open && (
          <div className="mt-3 border-t border-slate-100 pt-2">
            {matches.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Nothing matched yet. We keep checking published sales, marketplace items and operator inventory.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {matches.map(m => (
                  <IsoCustomerMatchRow key={m.id} match={m} onFeedback={onFeedback} />
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}