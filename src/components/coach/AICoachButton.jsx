import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain } from 'lucide-react';
import AICoachPanel from './AICoachPanel';

const OPERATOR_ROLES = [
  'estate_sale_operator', 'team_admin', 'team_member', 'team_marketer',
  'real_estate_agent', 'investor', 'coach',
  'super_admin', 'platform_ops', 'admin',
];

export default function AICoachButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u && OPERATOR_ROLES.includes(u.primary_account_type || u.role)) {
        setUser(u);
      }
    }).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 hover:shadow-orange-500/30 ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}`}
        aria-label="Open AI Coach"
      >
        <Brain className="w-4 h-4" />
        AI Coach
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </button>

      {/* Slide-out panel overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <AICoachPanel user={user} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}