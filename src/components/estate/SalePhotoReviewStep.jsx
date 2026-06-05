import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SalePhotoReviewStep({ saleId, onStepComplete }) {
  const [photos, setPhotos] = useState([]);
  const [savingIndexes, setSavingIndexes] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

      // Patch any images that don't have serp_search_status yet
      const images = (sale.images || []).map(img => ({
        ...img,
        serp_search_status: img.serp_search_status || "pending_review",
        skip_serp_search: img.skip_serp_search || false,
      }));

      // If any needed patching, write back to DB immediately
      const needsPatch = (sale.images || []).some(img => !img.serp_search_status);
      if (needsPatch) {
        await base44.entities.EstateSale.update(saleId, { images });
      }

      setPhotos(images);
    } finally {
      setLoading(false);
    }
  }

  async function updateDecision(index, decision) {
    const isSkip = decision === "do_not_search";
    const nextStatus = isSkip ? "do_not_search" : "search_allowed";
    const now = new Date().toISOString();
    const byUser = currentUser?.email || currentUser?.id || "unknown";

    // Optimistic update
    setSavingIndexes(prev => new Set(prev).add(index));
    setPhotos(prev => prev.map((p, i) => i !== index ? p : {
      ...p,
      serp_search_status: nextStatus,
      skip_serp_search: isSkip,
      skip_updated_at: now,
      skip_updated_by: byUser,
    }));

    try {
      // Fetch fresh, mutate, write back
      const fresh = await base44.entities.EstateSale.filter({ id: saleId });
      const freshImages = (fresh[0]?.images || []).map((img, i) => {
        if (i !== index) return img;
        return {
          ...img,
          serp_search_status: nextStatus,
          skip_serp_search: isSkip,
          skip_updated_at: now,
          skip_updated_by: byUser,
        };
      });
      await base44.entities.EstateSale.update(saleId, { images: freshImages });
      setPhotos(freshImages);
    } catch (err) {
      console.error("Failed to save decision:", err);
      alert("This choice did not save. Please try again.");
      await loadPhotos();
    } finally {
      setSavingIndexes(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  const reviewedCount = photos.filter(p =>
    p.serp_search_status === "search_allowed" || p.serp_search_status === "do_not_search"
  ).length;

  const allReviewed = photos.length > 0 && photos.every(p =>
    p.serp_search_status === "search_allowed" || p.serp_search_status === "do_not_search"
  );

  function statusLabel(photo) {
    if (photo.serp_search_status === "do_not_search") return "Don't Search";
    if (photo.serp_search_status === "search_allowed") return "Will Search";
    return "Pending Review";
  }

  function statusClass(photo) {
    if (photo.serp_search_status === "do_not_search") return "bg-red-100 text-red-700 border-red-200";
    if (photo.serp_search_status === "search_allowed") return "bg-green-100 text-green-700 border-green-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  if (loading) return <div className="p-6 text-slate-500">Loading photo review...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Step 1: Choose Which Photos Should Use AI Search</h2>
        <p className="text-sm text-slate-600">
          Review every uploaded photo before running AI image search. Mark generic, cluttered, duplicate, or unnecessary images as <strong>Don't Search</strong>. <span className="text-green-700 font-medium">Your choices save instantly</span> — you can leave and come back without losing your work.
        </p>
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-sm text-slate-700">
            <strong>{reviewedCount}</strong> of <strong>{photos.length}</strong> photos reviewed
          </span>
          {allReviewed
            ? <span className="text-sm text-green-700 font-semibold">✓ Step 1 complete</span>
            : <span className="text-sm text-red-600 font-medium">Complete Step 1 before continuing</span>
          }
        </div>

      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {photos.map((photo, index) => {
          const saving = savingIndexes.has(index);
          return (
            <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-square bg-slate-100">
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2 space-y-2">
                <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 inline-block ${statusClass(photo)}`}>
                  {statusLabel(photo)}
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateDecision(index, "search_allowed")}
                  className={`w-full text-xs rounded-lg px-2 py-1.5 font-medium border transition-colors ${
                    photo.serp_search_status === "search_allowed"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-green-700 border-green-300 hover:bg-green-50"
                  }`}
                >
                  {saving ? "Saving..." : "✓ Search This"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateDecision(index, "do_not_search")}
                  className={`w-full text-xs rounded-lg px-2 py-1.5 font-medium border transition-colors ${
                    photo.serp_search_status === "do_not_search"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-red-700 border-red-300 hover:bg-red-50"
                  }`}
                >
                  {saving ? "Saving..." : "⊘ Don't Search"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex flex-col items-end gap-2 pt-4 border-t border-slate-200">
        {!allReviewed && (
          <p className="text-xs text-red-600">
            Step 1 must be completed before AI item lookup can begin. Please choose <strong>Search This Image</strong> or <strong>Don't Search</strong> for every photo.
          </p>
        )}
        <button
          type="button"
          disabled={!allReviewed}
          onClick={() => onStepComplete && onStepComplete()}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${
            allReviewed
              ? "bg-slate-900 text-white hover:bg-slate-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Continue to Step 2 →
        </button>
      </div>
    </div>
  );
}