import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';

const list = (r) => (Array.isArray(r) ? r : (r?.items || []));

// Dashboard entry point to the operator's saved coaching library.
export default function CoachingGlossaryCard({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        setEntries(list(await base44.entities.CoachGlossaryEntry.filter({ user_id: user.id }, '-saved_at', 3)));
      } catch (_) {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">Coaching Glossary</p>
              <p className="text-[11px] text-slate-500">Your saved AI Coach advice</p>
            </div>
          </div>
          <Link to="/CoachingGlossary" className="text-xs text-orange-700 hover:underline inline-flex items-center gap-0.5">
            Open<ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nothing saved yet. Ask the AI Coach for a plan, then press “Save to glossary” — it waits for you here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map(e => (
              <li key={e.id} className="text-xs text-slate-700 truncate">
                <span className="text-slate-400 mr-1">·</span>{e.title}
              </li>
            ))}
          </ul>
        )}

        <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs">
          <Link to="/CoachingGlossary">View all saved coaching</Link>
        </Button>
      </CardContent>
    </Card>
  );
}