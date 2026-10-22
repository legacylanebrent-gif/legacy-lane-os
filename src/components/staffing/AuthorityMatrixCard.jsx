// Chapter 19 P1-11 — the deterministic AUTHORITY MATRIX view. Derived by the
// server (mySaleDay + the shared matrix module) so the operator and every
// employee see identical guidance. Guidance only — never an authorization,
// never auto-applied.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Scale } from 'lucide-react';

const LEVEL_BADGE = {
  'CAN DECIDE': 'bg-green-100 text-green-800 border-green-300',
  'ASK MANAGER': 'bg-amber-100 text-amber-800 border-amber-300',
  'STOP / ESCALATE': 'bg-red-100 text-red-800 border-red-300',
};

export default function AuthorityMatrixCard({ sale, rows }) {
  const [matrix, setMatrix] = useState(rows || null);
  const [loading, setLoading] = useState(!rows);

  useEffect(() => {
    if (rows || !sale) { setMatrix(rows || null); setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('mySaleDay', { action: 'view', sale_id: sale.id });
        if (alive) setMatrix(res?.data?.brief?.authority_matrix || []);
      } catch (e) {
        console.error(e);
        if (alive) setMatrix([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [sale?.id, rows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="w-5 h-5 text-cyan-700" /> Authority Matrix
        </CardTitle>
        <p className="text-xs text-slate-500">
          Derived from the company's recorded policy and this sale's merchandise. Guidance for the team — not a legal or compliance determination.
        </p>
      </CardHeader>
      <CardContent>
        {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Deriving…</div>}
        {!loading && (!matrix || matrix.length === 0) && <p className="text-sm text-slate-400">Not available.</p>}
        {matrix && matrix.length > 0 && (
          <div className="space-y-1.5">
            {matrix.map((r) => (
              <div key={r.area} className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border flex-shrink-0 self-start ${LEVEL_BADGE[r.level] || ''}`}>{r.level}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}