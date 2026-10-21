// Chapter 13 P1 — ACTIVATE SALE (P1-1..P1-3): one-click activation of an
// accepted opportunity into an executable project. The backend function is
// the single writer (deterministic gate, idempotent create, template launch);
// this card shows exactly what is missing before activation and routes to the
// active project. Repeated clicks NEVER duplicate the sale.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Rocket } from 'lucide-react';

export default function ActivateSaleCard({ deal, linkedSale, onLinked }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gate, setGate] = useState(null); // { missing, warnings, needs_warning_confirmation }

  const activate = async (confirmWarnings = false) => {
    setLoading(true);
    setGate(null);
    try {
      const res = await base44.functions.invoke('activateSale', {
        deal_id: deal.id, confirm_warnings: confirmWarnings,
      });
      const data = res.data || {};
      if (data.ok) {
        setGate(null);
        onLinked && onLinked(data.sale_id);
        navigate(`/ProjectDashboard?saleId=${data.sale_id}`);
        return;
      }
      setGate({
        missing: data.missing || [],
        warnings: data.warnings || [],
        needs_warning_confirmation: !!data.needs_warning_confirmation,
      });
    } catch (e) {
      console.error(e);
      setGate({ missing: ['Activation failed — try again.'], warnings: [], needs_warning_confirmation: false });
    } finally {
      setLoading(false);
    }
  };

  if (linkedSale || deal.estate_sale_id) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>This opportunity is already an active project{linkedSale ? `: ${linkedSale.title}` : ''}.</span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => navigate(`/SaleEditor?saleId=${deal.estate_sale_id}`)}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />Sale Editor
            </Button>
            <Button size="sm" className="bg-green-700 hover:bg-green-800"
              onClick={() => navigate(`/ProjectDashboard?saleId=${deal.estate_sale_id}`)}>
              Open Project Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-cyan-200 bg-cyan-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="w-5 h-5 text-cyan-700" /> Activate Sale
        </CardTitle>
        <p className="text-xs text-slate-600">
          Turn this accepted opportunity into an executable project — client, property, dates, commission and terms are
          inherited from the deal and accepted proposal. Nothing is retyped; nothing in the proposal or agreement changes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {gate && (gate.missing.length > 0 || gate.warnings.length > 0) && (
          <div className="space-y-2">
            {gate.missing.map((m, i) => (
              <div key={i} className="text-sm rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{m}</span>
              </div>
            ))}
            {gate.warnings.map((w, i) => (
              <div key={i} className="text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{w}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!gate?.needs_warning_confirmation ? (
            <Button onClick={() => activate(false)} disabled={loading} className="bg-cyan-700 hover:bg-cyan-800">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              Activate Sale
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setGate(null)} disabled={loading}>Go Back</Button>
              <Button onClick={() => activate(true)} disabled={loading} className="bg-cyan-700 hover:bg-cyan-800">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                Activate Anyway (I reviewed the warnings)
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}