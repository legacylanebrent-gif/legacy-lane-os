import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, ShieldQuestion, UserCheck, Sparkles, AlertTriangle, RefreshCcw } from 'lucide-react';
import {
  cqCategoryLabel, cqJurisdictionLabel, cqStatusLabel, cqStatusBadge, cqSourceLabel, cqIsStale,
} from './complianceModel';

// One compliance question card: provenance display only — never a compliance claim.
export default function QuestionCard({ question, sale, onEdit, onEscalate, onResearch, onDelete }) {
  const stale = cqIsStale(question);
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <ShieldQuestion className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-slate-900 text-sm leading-snug">{question.question}</p>
              {sale && (
                <p className="text-xs text-slate-500 mt-0.5">Sale: {sale.title}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={onDelete} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`text-xs ${cqStatusBadge(question.status)}`}>{cqStatusLabel(question.status)}</Badge>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">{cqCategoryLabel(question.category)}</Badge>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
            {cqJurisdictionLabel(question.jurisdiction_type)}{question.jurisdiction_name ? ` · ${question.jurisdiction_name}` : ''}
          </Badge>
          {stale && (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
              <RefreshCcw className="w-3 h-3 mr-1" /> Review — not re-confirmed recently
            </Badge>
          )}
          {question.professional_review_needed && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
              <UserCheck className="w-3 h-3 mr-1" /> Professional review needed
            </Badge>
          )}
        </div>

        {(question.status !== 'RESEARCH_NEEDED' || question.notes) && (
          <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
            {question.source_name && (
              <p className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Source:</span>
                {question.source_name}
                {question.source_type && <span>({cqSourceLabel(question.source_type)})</span>}
                {question.source_url && (
                  <a href={question.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">link</a>
                )}
              </p>
            )}
            {(question.last_verified_at || question.verified_by) && (
              <p className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Verified:</span>
                {question.verified_by || '—'}
                {question.last_verified_at ? ` · ${new Date(question.last_verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
              </p>
            )}
            {question.notes && <p className="text-slate-600">{question.notes}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onEscalate}>
            <UserCheck className="w-3.5 h-3.5 mr-1" /> Escalate to professional
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onResearch}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> AI research assist
          </Button>
        </div>

        {stale && (
          <p className="text-xs text-orange-600 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            This was verified a while ago — consider re-confirming it with the source. A review prompt, not a legal expiration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}