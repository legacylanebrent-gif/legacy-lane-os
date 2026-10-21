import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileDown, Eye, Lock, Upload, CheckCircle2, EyeOff, History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AGREEMENT_STATUS } from './agreementModel';
import { downloadAgreementPdf } from './agreementPdf';

// Chapter 9 P0/P1 — one agreement VERSION card. A finalized/executed agreement
// is a HISTORICAL SNAPSHOT: no edit controls exist once EXECUTED — later changes
// require an intentional new version (supersede) or flow through existing
// client-decision architecture. No e-signature: sign externally, upload the
// signed copy (stored privately), then mark executed.

export default function AgreementCard({ agreement, allAgreements, onNewVersion, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [showBody, setShowBody] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executedBy, setExecutedBy] = useState('');
  const cfg = AGREEMENT_STATUS[agreement.status] || AGREEMENT_STATUS.DRAFT;
  const frozen = agreement.status !== 'DRAFT';

  const supersedePrior = async (exceptId, { includeExecuted }) => {
    const now = new Date().toISOString();
    for (const a of allAgreements) {
      if (a.id === exceptId || a.status === 'SUPERSEDED' || a.status === 'VOIDED') continue;
      if (a.status === 'READY' || (includeExecuted && a.status === 'EXECUTED')) {
        await base44.entities.SaleAgreement.update(a.id, { status: 'SUPERSEDED', superseded_by: exceptId, superseded_at: now });
      }
    }
  };

  const finalize = async () => {
    setBusy('finalize');
    try {
      await base44.entities.SaleAgreement.update(agreement.id, { status: 'READY', finalized_at: new Date().toISOString() });
      await supersedePrior(agreement.id, { includeExecuted: false });
      onChanged(`Agreement v${agreement.version} finalized — snapshot frozen. Print/download, sign externally, upload the signed copy.`);
    } catch (e) { console.error(e); alert('Could not finalize.'); } finally { setBusy(null); }
  };

  const uploadSigned = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('upload');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.SaleAgreement.update(agreement.id, {
        signed_file_uri: file_uri, signed_file_name: file.name, signed_at: new Date().toISOString(),
      });
      onChanged('Signed copy uploaded (stored privately).');
    } catch (err) { console.error(err); alert('Could not upload the signed copy.'); } finally { setBusy(null); e.target.value = ''; }
  };

  const execute = async () => {
    setBusy('execute');
    try {
      const now = new Date().toISOString();
      await base44.entities.SaleAgreement.update(agreement.id, {
        status: 'EXECUTED', executed_at: now, executed_by_name: executedBy.trim() || 'Recorded by operator',
      });
      await supersedePrior(agreement.id, { includeExecuted: true });
      onChanged(`Agreement v${agreement.version} recorded as executed. This version is now an immutable historical snapshot.`);
    } catch (e) { console.error(e); alert('Could not record execution.'); } finally { setBusy(null); setExecuting(false); }
  };

  const voidAgreement = async () => {
    const reason = (prompt('Reason for voiding (kept on the record):') || '').trim();
    if (!reason) return;
    setBusy('void');
    try {
      await base44.entities.SaleAgreement.update(agreement.id, { status: 'VOIDED', voided_at: new Date().toISOString(), void_reason: reason });
      onChanged(`Agreement v${agreement.version} voided — history preserved.`);
    } catch (e) { alert('Could not void.'); } finally { setBusy(null); }
  };

  const viewSigned = async () => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: agreement.signed_file_uri });
      window.open(signed_url, '_blank');
    } catch (e) { console.error(e); alert('Could not open the signed copy.'); }
  };

  return (
    <Card className={`border-slate-200 ${agreement.status === 'EXECUTED' ? 'border-green-300' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">Agreement v{agreement.version}</span>
            <Badge variant="outline" className={cfg.tone}>{cfg.label}</Badge>
            {agreement.template_title && <span className="text-xs text-slate-400">{agreement.template_title} (template v{agreement.template_version || 1})</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBody(x => !x)}>{showBody ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}{showBody ? 'Hide' : 'Preview'}</Button>
            {frozen && <Button size="sm" variant="outline" onClick={() => downloadAgreementPdf(agreement)}><FileDown className="w-3.5 h-3.5 mr-1" />PDF (snapshot)</Button>}
          </div>
        </div>

        {agreement.executed_at && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
            Executed {new Date(agreement.executed_at).toLocaleDateString()}{agreement.executed_by_name ? ` — recorded signer: ${agreement.executed_by_name}` : ''}. EstateSalen records the signing; it does not validate signatures.
            {agreement.signed_file_uri && <> Signed copy: <button className="underline" onClick={viewSigned}>{agreement.signed_file_name || 'view (private)'}</button>.</>}
          </p>
        )}
        {agreement.status === 'SUPERSEDED' && agreement.superseded_at && (
          <p className="text-xs text-slate-500">Superseded {new Date(agreement.superseded_at).toLocaleDateString()} — kept as history.</p>
        )}
        {agreement.status === 'VOIDED' && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">Voided — reason kept on record: {agreement.void_reason || 'not recorded'}.</p>
        )}
        {frozen && agreement.status !== 'EXECUTED' && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Snapshot frozen at finalization — reprinting always reproduces this version. Changes require a new version.</p>
        )}
        {agreement.status === 'EXECUTED' && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />This executed agreement is a historical snapshot — it cannot be edited. Later changes belong to client decisions, scope history, or an intentional new version.</p>
        )}

        {showBody && (
          <pre className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap max-h-72 overflow-y-auto">{agreement.body_text}</pre>
        )}

        {agreement.status === 'DRAFT' && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700" disabled={busy === 'finalize'} onClick={finalize}>
              {busy === 'finalize' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}Finalize (freeze snapshot)
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (confirm('Delete this draft agreement?')) base44.entities.SaleAgreement.delete(agreement.id).then(() => onChanged('Draft deleted.')); }}>Delete draft</Button>
          </div>
        )}

        {agreement.status === 'READY' && (
          executing ? (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <Input placeholder="Signer / executed by (name recorded by you)" value={executedBy} onChange={e => setExecutedBy(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setExecuting(false)}>Cancel</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy === 'execute'} onClick={execute}>
                  {busy === 'execute' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}Mark Executed
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 items-center">
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx" onChange={uploadSigned} />
                <span className="inline-flex items-center h-8 px-3 rounded-md border border-input bg-white text-sm hover:bg-slate-50"><Upload className="w-3.5 h-3.5 mr-1" />{busy === 'upload' ? 'Uploading…' : 'Upload signed copy (private)'}</span>
              </label>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setExecuting(true)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Mark Executed</Button>
              <Button size="sm" variant="outline" onClick={() => onNewVersion(agreement)}><History className="w-3.5 h-3.5 mr-1" />New version</Button>
              <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === 'void'} onClick={voidAgreement}>Void</Button>
              <span className="text-[11px] text-slate-400">No e-signature: sign externally, then upload the signed copy.</span>
            </div>
          )
        )}

        {agreement.status === 'EXECUTED' && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {!agreement.signed_file_uri && (
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx" onChange={uploadSigned} />
                <span className="inline-flex items-center h-8 px-3 rounded-md border border-input bg-white text-sm hover:bg-slate-50"><Upload className="w-3.5 h-3.5 mr-1" />{busy === 'upload' ? 'Uploading…' : 'Upload signed copy'}</span>
              </label>
            )}
            <Button size="sm" variant="outline" onClick={() => onNewVersion(agreement)}><History className="w-3.5 h-3.5 mr-1" />Supersede — new version</Button>
            <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === 'void'} onClick={voidAgreement}>Void</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}