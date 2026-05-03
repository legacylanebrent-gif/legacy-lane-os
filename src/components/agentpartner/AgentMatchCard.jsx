import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Star } from 'lucide-react';

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted: 'bg-green-100 text-green-700 border-green-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
};

export default function AgentMatchCard({ match, showRequestButton, onRequest, requesting }) {
  const score = Math.round(match.match_score || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{match.agent_name || 'Unknown Agent'}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {match.brokerage_name || 'Unknown Brokerage'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[match.status]}`}>
            {match.status}
          </span>
          {score > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {score}% match
            </span>
          )}
        </div>
      </div>

      {match.agent_id && (
        <p className="text-xs text-slate-400">Agent ID: {match.agent_id}</p>
      )}

      {showRequestButton && (
        <Button
          size="sm"
          onClick={() => onRequest(match.id)}
          disabled={requesting === match.id}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          {requesting === match.id ? 'Sending…' : 'Request Partnership'}
        </Button>
      )}
    </div>
  );
}