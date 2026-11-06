import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, Mail, MessageSquare, Users, StickyNote, Activity as ActivityIcon } from 'lucide-react';
import { rows } from './saleDayMetrics';

const ICONS = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Users,
  in_person: Users,
  voicemail: Phone,
  client_update: ActivityIcon,
  note: StickyNote,
};

function relative(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RecentActivity({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    base44.entities.Activity.filter(
      { operator_id: user.id },
      { sort: '-created_date', limit: 6 }
    )
      .then((res) => !cancelled && setItems(rows(res)))
      .catch((e) => console.error('Recent activity:', e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">Recent activity</h2>
          <p className="text-xs text-slate-500">Client contact you&apos;ve logged</p>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />)
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Nothing logged yet. Calls, emails and client updates will show up here.
          </p>
        ) : (
          items.map((a) => {
            const Icon = ICONS[a.activity_type] || ActivityIcon;
            return (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">
                    {a.subject || a.recipient_name || a.activity_type}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {a.direction ? `${a.direction} · ` : ''}
                    {relative(a.completed_date || a.created_date)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}