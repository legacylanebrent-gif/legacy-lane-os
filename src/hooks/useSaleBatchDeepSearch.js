import { base44 } from '@/api/base44Client';

/**
 * Runs the sale photo "Deep Search" batch: one AI image search per photo.
 *
 * Each photo's result is saved ON ITS OWN, addressed by the photo's URL, so a
 * batch run can never write one photo's title onto other photos and can never
 * re-apply an older copy of the whole photo list (which made titles "revert").
 */
export default function useSaleBatchDeepSearch({
  formData,
  setFormData,
  saleId,
  multiItemFlags,
  cleanTitle,
  persistImageFields,
  setSerpResults,
  setSerpSearching,
  setPhotoTitles,
  setSerpBatchRunning,
  setSerpBatchProgress,
  setShowDeepSearchModal,
  setDeepSearchModalIndex,
  setCreditRefreshTrigger,
  setCreditDisplayKey,
}) {
  return async (startFromIndex = 0) => {
    if (!saleId) { alert('Save the sale first'); return; }
    const images = formData.images;

    const eligible = (img, absIdx) => {
      const statusOk = img.serp_search_status === 'search_allowed'
        || img.serp_search_status === undefined
        || img.serp_search_status === null;
      return !img.name && !multiItemFlags[absIdx] && img.skip_item !== true
        && img.skip_serp_search !== true && img.serp_search_status !== 'do_not_search' && statusOk;
    };

    const remaining = images.slice(startFromIndex).filter((img, relIdx) => eligible(img, startFromIndex + relIdx));
    if (remaining.length === 0) {
      alert('All eligible images have already been processed. Multi-item images are skipped — use "Multi-Item AI Assess" on those.');
      return;
    }
    const flaggedCount = images.slice(startFromIndex).filter((img, relIdx) => multiItemFlags[startFromIndex + relIdx]).length;
    const msg = `${remaining.length} image(s) will be processed via AI image search.${flaggedCount > 0 ? `\n\n${flaggedCount} multi-item image(s) will be skipped — use "Multi-Item AI Assess" on those.` : ''}\n\nContinue?`;
    if (!window.confirm(msg)) return;

    setSerpBatchRunning(true);
    setSerpBatchProgress({ current: 0, total: remaining.length, stoppedAt: null });
    setShowDeepSearchModal(true);
    let processed = 0;

    for (let i = startFromIndex; i < images.length; i++) {
      const img = images[i];
      if (!img || img.name) continue;
      if (!eligible(img, i)) continue;

      setDeepSearchModalIndex(i);
      setSerpSearching(prev => ({ ...prev, [i]: true }));
      try {
        try {
          const creditCheck = await base44.functions.invoke('checkGoogleLensCredits', {});
          if (!creditCheck.data.allowed) {
            setSerpBatchProgress(prev => ({ ...prev, stoppedAt: i, current: processed }));
            setSerpSearching({});
            setSerpBatchRunning(false);
            setShowDeepSearchModal(false);
            alert(`Google Lens credit limit reached after ${processed} image(s).\n\nPurchase more credits to continue.`);
            return;
          }
        } catch (creditErr) {
          console.warn('Credit check failed, proceeding anyway:', creditErr.message);
        }

        const res = await base44.functions.invoke('googleLensPricing', { image_url: img.url, sale_id: saleId });
        const data = res.data;

        if (data.error) {
          console.warn(`AI search skipped image ${i + 1}: ${data.error}`);
          setSerpResults(prev => ({ ...prev, [img.url]: { error: data.error } }));
          processed++;
          setSerpBatchProgress(prev => ({ ...prev, current: processed }));
          if (/run out|credits|quota|limit|payment|account/i.test(data.error)) {
            setSerpBatchProgress(prev => ({ ...prev, stoppedAt: i, current: processed }));
            setSerpSearching({});
            setSerpBatchRunning(false);
            setShowDeepSearchModal(false);
            alert(`AI search credits exhausted after ${processed} image(s).\n\nPlease contact support, then click "Resume from image ${i + 1}" to continue.`);
            return;
          }
        } else {
          setSerpResults(prev => ({ ...prev, [img.url]: data }));

          const fields = {};
          const cleanedTitle = cleanTitle(data.item_title);
          if (cleanedTitle) {
            fields.name = cleanedTitle;
            setPhotoTitles(pt => ({ ...pt, [img.url]: cleanedTitle }));
          }
          if (!img.synopsis) {
            const withPrices = (data.matches || []).filter(m => m.price && m.title);
            const sources = withPrices.slice(0, 3);
            let syn = '';
            if (cleanedTitle) syn += `${cleanedTitle}.`;
            if (sources.length > 0) syn += ` Currently listed for ${sources.map(m => `${m.price} on ${m.source}`).join(', ')}.`;
            if (data.price_range?.min && data.price_range?.max) syn += ` Market price range: $${data.price_range.min}–$${data.price_range.max}.`;
            if (syn.trim()) fields.synopsis = syn.trim();
          }
          if (data.price_range?.avg) fields.ai_first_search_price = data.price_range.avg;

          if (Object.keys(fields).length > 0) {
            setFormData(prev => {
              const updated = [...prev.images];
              if (updated[i]) updated[i] = { ...updated[i], ...fields };
              return { ...prev, images: updated };
            });
            await persistImageFields(img.url, fields);
          }

          processed++;
          setSerpBatchProgress(prev => ({ ...prev, current: processed }));
          if (processed % 5 === 0) {
            setCreditRefreshTrigger(prev => prev + 1);
            setCreditDisplayKey(prev => prev + 1);
          }
        }
      } catch (e) {
        console.warn(`AI search skipped image ${i + 1}:`, e.message);
        processed++;
        setSerpBatchProgress(prev => ({ ...prev, current: processed }));
      }
      setSerpSearching(prev => ({ ...prev, [i]: false }));
      await new Promise(r => setTimeout(r, 1000));
    }

    setCreditRefreshTrigger(prev => prev + 1);
    setCreditDisplayKey(prev => prev + 1);
    setSerpBatchRunning(false);
    setShowDeepSearchModal(false);
    setSerpBatchProgress({ current: 0, total: 0, stoppedAt: null });
  };
}