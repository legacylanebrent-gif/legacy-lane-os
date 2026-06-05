import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SalePhotoReviewStep({ saleId, onStepComplete }) {
  const [photos, setPhotos] = useState([]);
  const [checkedSkipUrls, setCheckedSkipUrls] = useState(new Set());
  const [originalSkipUrls, setOriginalSkipUrls] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saleId) loadPhotos();
  }, [saleId]);

  async function loadPhotos() {
    setLoading(true);
    try {
      const [user, sales] = await Promise.all([
        base44.auth.me(),
        base44.entities.EstateSale.filter({ id: saleId })
      ]);
      setCurrentUser(user);

      const sale = sales[0];
      if (!sale) return;

      const images = (sale.images || []).map(img => ({
        ...img,
        skip_serp_search: img.skip_serp_search === true,
        serp_search_status: img.skip_serp_search === true ? "do_not_search" : (img.serp_search_status || "search_allowed"),
      }));

      const existingSkipUrls = new Set(
        images.filter(img => img.skip_serp_search === true).map(img => img.url)
      );

      setPhotos(images);
      setCheckedSkipUrls(existingSkipUrls);
      setOriginalSkipUrls(existingSkipUrls);
      setSaved(existingSkipUrls.size > 0 || images.length > 0);
    } catch (err) {
      console.error("Error loading sale photos:", err);
      alert("Could not load sale photos.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSkip(url) {
    setSaved(false);
    setCheckedSkipUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function saveSelections() {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const userLabel = currentUser?.email || currentUser?.id || "unknown";

      const updatedImages = photos.map(img => {
        const shouldSkip = checkedSkipUrls.has(img.url);
        return {
          ...img,
          skip_serp_search: shouldSkip,
          serp_search_status: shouldSkip ? "do_not_search" : "search_allowed",
          skip_updated_at: now,
          skip_updated_by: userLabel,
        };
      });

      await base44.entities.EstateSale.update(saleId, { images: updatedImages });

      setPhotos(updatedImages);
      setOriginalSkipUrls(new Set(checkedSkipUrls));
      setSaved(true);
    } catch (err) {
      console.error("Error saving Step 1 selections:", err);
      alert("Selections did not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const hasUnsavedChanges =
    checkedSkipUrls.size !== originalSkipUrls.size ||
    [...checkedSkipUrls].some(url => !originalSkipUrls.has(url));

  const searchCount = photos.length - checkedSkipUrls.size;
  const skipCount = checkedSkipUrls.size;

  if (loading) return <div className="p-6 text-slate-500">Loading images...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Step 1: Choose Images Not to Search</h2>
          <p className="text-sm text-slate-600 mt-1">
            All images default to <strong>Search Yes</strong>. Check only the images that should be skipped.
            Click <strong>Save Step 1 Selections</strong> before continuing to Step 2.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-700 font-medium">Will Search</div>
            <div className="text-2xl font-bold text-green-800">{searchCount}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs text-red-700 font-medium">Do Not Search</div>
            <div className="text-2xl font-bold text-red-800">{skipCount}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-600 font-medium">Total Images</div>
            <div className="text-2xl font-bold text-slate-800">{photos.length}</div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {photos.map((photo, index) => {
          const isChecked = checkedSkipUrls.has(photo.url);
          return (
            <div
              key={photo.url || index}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
                isChecked ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"
              }`}
            >
              <div className="aspect-square bg-slate-100">
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <label className="flex items-start gap-2 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSkip(photo.url)}
                  className="mt-0.5 accent-red-600"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Do Not Search</div>
                  <div className="text-[10px] text-slate-500">
                    {isChecked ? "Will be skipped" : "Default: Search Yes"}
                  </div>
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Sticky Footer */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 justify-between items-center sticky bottom-2 shadow-md">
        <div className="text-sm">
          {hasUnsavedChanges && (
            <span className="text-red-600 font-medium">⚠ Unsaved changes — save before continuing.</span>
          )}
          {!hasUnsavedChanges && saved && (
            <span className="text-green-700 font-medium">✓ Step 1 selections saved.</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={saveSelections}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm disabled:bg-slate-300 hover:bg-slate-700 transition-colors"
          >
            {saving ? "Saving..." : "Save Step 1 Selections"}
          </button>
          <button
            type="button"
            disabled={hasUnsavedChanges || saving || !saved}
            onClick={() => {
              if (hasUnsavedChanges) {
                alert("Please save Step 1 selections before continuing.");
                return;
              }
              onStepComplete && onStepComplete();
            }}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              !hasUnsavedChanges && saved && !saving
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Continue to Step 2 →
          </button>
        </div>
      </div>
    </div>
  );
}