import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { salePhotoPipeline } from '@/lib/salePhotoPipeline';

export default function usePhotoPipeline({ saleId, userId, imagesRef, onPhoto, onImages }) {
  const paused = useRef(false), running = useRef(false);
  const [state, setState] = useState({ running: false, total: 0, counts: {}, type: null, error: '' });
  async function run(type, selected = null) {
    if (!saleId) { setState(s => ({ ...s, error: 'Save the sale before scanning.' })); return; }
    if (running.current) return;
    if (type === 'deep' && !window.confirm('Run explicit SerpAPI Deep Scan? This uses Deep Scan credits. Results are comparable asking prices, not sold prices.')) return;
    running.current = true; paused.current = false;
    setState({ running: true, total: 0, counts: {}, type, error: '' });
    try {
      const initialized = await base44.functions.invoke('saveSaleImageChanges', { sale_id: saleId });
      const all = initialized.data.images;
      imagesRef.current = { ...imagesRef.current, images: all.map(photo => {
        const local = imagesRef.current?.images?.find(p => p.pipeline?.id === photo.pipeline?.id || p.url === photo.url);
        return local?._dirty ? { ...photo, name: local.name, description: local.description, price: local.price, _dirty: true } : photo;
      }) };
      onImages?.(all);
      const chosen = selected ? all.filter(p => selected.some(s => s.pipeline?.id ? s.pipeline.id === p.pipeline.id : s.url === p.url)) : all;
      const key = `photoPipeline:v2:${userId}:${saleId}:${type}`;
      const journal = {
        read: () => JSON.parse(localStorage.getItem(key) || '{}'),
        write: value => localStorage.setItem(key, JSON.stringify(value)),
        retainRecovery: value => localStorage.setItem(`${key}:recovery:${value.job.key}`, JSON.stringify(value))
      };
      const { runner, jobs } = salePhotoPipeline({
        invoke: (name, body) => base44.functions.invoke(name, body), saleId, images: chosen, type, journal,
        isPaused: () => paused.current,
        isCurrent: job => (imagesRef.current?.images || []).some(p => p.pipeline?.id === job.photoId && p.pipeline?.revision === job.imageRevision),
        onPhoto,
        onEvent: event => { if (event.type === 'status') setState(s => ({ ...s, counts: Object.fromEntries(['completed', 'needs_review', 'failed', 'save_failed', 'stale'].map(v => [v, [...runner.status.values()].filter(x => x === v).length])) })); }
      });
      setState(s => ({ ...s, total: jobs.length }));
      if (!jobs.length) setState(s => ({ ...s, error: type === 'classify' ? 'No eligible photos.' : 'No eligible single-item photos. Run initial classification first; review multiple or uncertain photos separately.' }));
      const summary = await runner.run(jobs);
      setState(s => ({ ...s, counts: summary.counts }));
    } catch (error) {
      setState(s => ({ ...s, error: error.response?.data?.error || error.message }));
    } finally { running.current = false; setState(s => ({ ...s, running: false })); }
  }
  return { state, run, pause: () => { paused.current = true; } };
}