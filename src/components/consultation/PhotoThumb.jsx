import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Chapter 12 P1 — PRIVATE consultation photo thumbnail. Resolves a short-lived
// signed URL on demand; the stored file_uri is private storage only and is never
// copied into marketing/public/inventory media.
export default function PhotoThumb({ fileUri, name = 'Consultation photo', className = 'w-14 h-14' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let live = true;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 900 })
      .then(r => { if (live) setUrl(r.signed_url); })
      .catch(() => {});
    return () => { live = false; };
  }, [fileUri]);
  return url
    ? <img src={url} alt={name} className={`${className} rounded-lg object-cover border border-slate-200`} />
    : <div className={`${className} rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] text-slate-400`}>loading…</div>;
}