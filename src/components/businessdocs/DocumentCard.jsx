import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Pencil, Archive, ArchiveRestore, RefreshCw, Users, Loader2 } from 'lucide-react';
import { categoryLabel, statusLabel, scopeLabel, expiringState, getSignedUrl, fmtDate } from './documentModel';

// One vault document with its practical actions. No delete: no status or
// action here implies a legal retention conclusion — archiving is the
// honest way to retire a document.
export default function DocumentCard({ doc, onEdit, onArchived, onPolicies, onReplaced }) {
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const exp = expiringState(doc);

  const openFile = async (download) => {
    setBusy(true);
    try {
      const url = await getSignedUrl(doc.file_uri, 300);
      if (url) window.open(url, '_blank');
      if (download && url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name || 'document';
        a.click();
      }
    } finally {
      setBusy(false);
    }
  };

  const replaceFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Replace the file? The document version will increase to ' + ((doc.version || 1) + 1) + ' and acknowledgments will no longer cover the new version.')) return;
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const updated = await base44.entities.BusinessDocument.update(doc.id, {
        file_uri, file_name: file.name, version: (doc.version || 1) + 1,
      });
      onReplaced?.(updated);
    } catch (err) {
      alert('Could not replace the file');
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async () => {
    setBusy(true);
    try {
      const next = doc.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      const updated = await base44.entities.BusinessDocument.update(doc.id, { status: next });
      onArchived?.(updated);
    } catch {
      alert('Could not update the document');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border bg-white ${doc.status === 'ARCHIVED' ? 'border-slate-200 opacity-75' : 'border-slate-200'} ${exp?.key === 'expired' ? 'ring-1 ring-red-200' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{doc.title}</p>
          <p className="text-xs text-slate-500 truncate">
            {doc.file_name || 'File'} · v{doc.version || 1} · {scopeLabel(doc.scope || 'business')} scope
          </p>
        </div>
        <Badge variant={doc.status === 'ACTIVE' ? 'default' : 'secondary'} className={doc.status === 'ACTIVE' ? 'bg-cyan-600' : ''}>
          {statusLabel(doc.status)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <Badge variant="outline" className="bg-slate-50">{categoryLabel(doc.category)}</Badge>
        {doc.category === 'POLICY' && doc.policy_type && (
          <Badge variant="outline" className="bg-indigo-50">{doc.policy_type}</Badge>
        )}
        {doc.effective_date && <Badge variant="outline" className="bg-slate-50">Effective {fmtDate(doc.effective_date)}</Badge>}
        {doc.expiration_date ? (
          <Badge variant="outline" className={exp ? { red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-50' }[exp.tone] : 'bg-green-50 text-green-700'}>
            {exp ? exp.label : `Expires ${fmtDate(doc.expiration_date)}`}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-slate-50">No expiration known</Badge>
        )}
      </div>

      {doc.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{doc.notes}</p>}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Button size="sm" variant="outline" onClick={() => openFile(false)} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} View
        </Button>
        <Button size="sm" variant="outline" onClick={() => openFile(true)} disabled={busy}>
          <Download className="w-3.5 h-3.5" /> Download
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(doc)}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
          <RefreshCw className="w-3.5 h-3.5" /> Replace file
        </Button>
        <Button size="sm" variant="outline" onClick={toggleArchive} disabled={busy}>
          {doc.status === 'ARCHIVED' ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          {doc.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
        </Button>
        {doc.category === 'POLICY' && (
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onPolicies(doc)}>
            <Users className="w-3.5 h-3.5" /> Acknowledgments
          </Button>
        )}
        <input ref={fileInput} type="file" className="hidden" accept="*/*" onChange={replaceFile} />
      </div>
    </div>
  );
}