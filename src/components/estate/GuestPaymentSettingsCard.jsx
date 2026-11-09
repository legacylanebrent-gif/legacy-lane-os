import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { GUEST_PAYMENT_METHODS } from '@/lib/salePaymentMethods';

// Guest sellers take payment offline only: cash, check, Zelle or Venmo.
// Card is never an option here, and the Zelle/Venmo QR codes they upload are
// the ones customers scan at checkout.
export default function GuestPaymentSettingsCard({ saleId, user, methods, onChangeMethods }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(!!saleId);
  const [uploading, setUploading] = useState('');
  const [handles, setHandles] = useState({ zelle_handle: '', venmo_handle: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!saleId) { setRecord(null); setLoading(false); return; }
      setLoading(true);
      try {
        const found = await base44.entities.SalePaymentOptions.filter({ sale_id: saleId });
        if (cancelled) return;
        const rec = found[0] || null;
        setRecord(rec);
        setHandles({
          zelle_handle: rec?.zelle_handle || '',
          venmo_handle: rec?.venmo_handle || '',
        });
      } catch (e) {
        console.error('Failed to load payment options:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [saleId]);

  const save = async (patch) => {
    if (!saleId) return;
    try {
      if (record?.id) {
        const updated = await base44.entities.SalePaymentOptions.update(record.id, patch);
        setRecord(updated);
      } else {
        const created = await base44.entities.SalePaymentOptions.create({
          sale_id: saleId,
          owner_id: user?.id,
          owner_name: user?.full_name || '',
          methods: methods || [],
          ...patch,
        });
        setRecord(created);
      }
    } catch (e) {
      console.error('Failed to save payment options:', e);
      alert('Could not save payment settings. Please try again.');
    }
  };

  const handleUpload = async (field, file) => {
    if (!file || !saleId) return;
    setUploading(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await save({ [field]: file_url });
    } catch (e) {
      console.error('QR upload failed:', e);
      alert('Upload failed. Please try a different image.');
    } finally {
      setUploading('');
    }
  };

  const toggle = (value) => {
    const current = methods || [];
    onChangeMethods(current.includes(value) ? current.filter((m) => m !== value) : [...current, value]);
  };

  const qrTiles = [
    { key: 'zelle', method: 'zelle', label: 'Zelle QR code', handleKey: 'zelle_handle', urlKey: 'zelle_qr_url' },
    { key: 'venmo', method: 'venmo', label: 'Venmo QR code', handleKey: 'venmo_handle', urlKey: 'venmo_qr_url' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900 mb-1">Accepted Payment Methods</h3>
        <p className="text-sm text-slate-600 mb-2">
          Cash, check, Zelle or Venmo only. Card payments are not available for this account type.
        </p>
        <div className="flex flex-wrap gap-2">
          {GUEST_PAYMENT_METHODS.map((opt) => {
            const active = (methods || []).includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  active ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 space-y-4">
        <div>
          <h3 className="font-medium text-slate-900">Zelle &amp; Venmo QR codes</h3>
          <p className="text-sm text-slate-600">
            Upload the QR codes from your Zelle and Venmo apps so customers can scan and pay at checkout.
          </p>
        </div>

        {!saleId && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Save the sale first, then you can upload your QR codes here.
          </p>
        )}

        {saleId && loading ? (
          <p className="text-sm text-slate-500">Loading your payment settings…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {qrTiles.map((tile) => {
              const url = record?.[tile.urlKey];
              return (
                <div key={tile.key} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <Label>{tile.label}</Label>
                  <div className="flex items-start gap-3">
                    {url && (
                      <img src={url} alt={tile.label} className="w-24 h-24 object-contain border rounded-lg p-1 bg-white" />
                    )}
                    <div className="space-y-2">
                      <label className={`inline-block ${saleId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <Button variant="outline" size="sm" asChild disabled={!saleId}>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {uploading === tile.urlKey ? 'Uploading…' : url ? 'Change QR' : 'Upload QR'}
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!saleId || uploading === tile.urlKey}
                          onChange={(e) => handleUpload(tile.urlKey, e.target.files?.[0])}
                        />
                      </label>
                      {url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => save({ [tile.urlKey]: '' })}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <Input
                    placeholder={tile.method === 'zelle' ? 'Zelle phone or email' : '@Venmo username'}
                    value={handles[tile.handleKey] || ''}
                    disabled={!saleId}
                    onChange={(e) => setHandles((p) => ({ ...p, [tile.handleKey]: e.target.value }))}
                    onBlur={() => {
                      if ((record?.[tile.handleKey] || '') !== handles[tile.handleKey]) {
                        save({ [tile.handleKey]: handles[tile.handleKey] });
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}