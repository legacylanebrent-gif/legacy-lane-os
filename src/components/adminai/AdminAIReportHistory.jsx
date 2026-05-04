import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  draft: 'bg-slate-100 text-slate-500 border-slate-300',
  active: 'bg-green-100 text-green-700 border-green-300',
  archived: 'bg-slate-100 text-slate-400 border-slate-200',
};

export default function AdminAIReportHistory({ reports, onView }) {
  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        No reports yet. Run your first Admin AI command above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map(report => (
        <div key={report.id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{report.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {report.command_type && (
                <span className="text-xs text-amber-600">{report.command_type}</span>
              )}
              {report.execution_mode && (
                <span className="text-xs text-slate-400">· {report.execution_mode}</span>
              )}
              {report.created_at && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </div>
            {report.executive_summary && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{report.executive_summary.slice(0, 120)}...</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`text-xs ${statusColors[report.status] || statusColors.draft}`}>
              {report.status || 'draft'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(report)}
              className="text-amber-600 hover:bg-amber-50 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />View
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}