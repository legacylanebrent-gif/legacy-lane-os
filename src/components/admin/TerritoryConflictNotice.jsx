import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const MAX_SHOWN = 6;

function formatToken(token) {
  return token.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TerritoryConflictNotice({ conflicts }) {
  if (!conflicts?.length) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-amber-800">
          Overlaps {conflicts.length} approved {conflicts.length === 1 ? 'territory' : 'territories'}
        </p>
      </div>
      <div className="space-y-2">
        {conflicts.map((c) => (
          <div key={c.id} className="text-xs text-amber-900">
            <span className="font-medium">{c.name}</span>
            {c.county ? <span className="text-amber-700"> · {c.county}</span> : null}
            <div className="flex flex-wrap gap-1 mt-1">
              {c.shared.slice(0, MAX_SHOWN).map((token) => (
                <Badge key={token} className="bg-amber-200 text-amber-900 text-[10px] font-normal">
                  {formatToken(token)}
                </Badge>
              ))}
              {c.shared.length > MAX_SHOWN && (
                <Badge className="bg-amber-200 text-amber-900 text-[10px] font-normal">
                  +{c.shared.length - MAX_SHOWN} more
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}