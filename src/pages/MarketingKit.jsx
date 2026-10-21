// Chapter 7 P2 — ONE-CLICK MARKETING KIT.
// ORCHESTRATION over the existing marketing surfaces: one "Build Marketing
// Kit" action coordinates the sale page, description, social, email, SMS
// draft, QR, printable signs and featured merchandise from canonical truth —
// with zero duplicate data entry. The kit PREPARES; the operator retains
// control; every publish/send happens through its own existing system.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, QrCode, Download, ArrowLeft, Megaphone, Signpost, ImageIcon, Save } from 'lucide-react';
import QRCode from 'qrcode';
import PhotoApprovalGrid from '@/components/marketingkit/PhotoApprovalGrid';
import KitDrafts from '@/components/marketingkit/KitDrafts';
import ListingCompletenessCard from '@/components/marketingkit/ListingCompletenessCard';
import FinalReviewCard from '@/components/marketingkit/FinalReviewCard';
import FeaturedItemsCard from '@/components/marketingkit/FeaturedItemsCard';
import MarketingTasksCard, { buildMarketingTaskPlan } from '@/components/marketingkit/MarketingTasksCard';
import PostSaleReviewCard from '@/components/marketingkit/PostSaleReviewCard';

const STATUS_BADGE = {
  not_created: 'bg-slate-100 text-slate-500 border-slate-200',
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  ready: 'bg-green-100 text-green-800 border-green-200'
};
const STATUS_LABEL = { not_created: 'Not created', draft: 'Draft', ready: 'Ready' };

export default function MarketingKit() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const saleId = params.get('saleId');
  const [sales, setSales] = useState(null);
  const [sale, setSale] = useState(null);
  const [kit, setKit] = useState(null);
  const [eligiblePhotos, setEligiblePhotos] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [featuredPicks, setFeaturedPicks] = useState([]);
  const [availabilityWarnings, setAvailabilityWarnings] = useState([]);
  const [review, setReview] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [mktTasks, setMktTasks] = useState([]);
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [approving, setApproving] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const loadSaleList = async () => {
    const me = await base44.auth.me();
    const page = await base44.entities.EstateSale.filter(
      { operator_id: me.id, status: { $in: ['draft', 'upcoming', 'active'] } },
      { sort: '-updated_date', limit: 50 });
    setSales(page.items || []);
    setLoading(false);
  };

  const applyKitExtras = (data, s) => {
    if (data.listing_completeness) setCompleteness(data.listing_completeness);
    if (Array.isArray(data.featured)) setFeaturedPicks(data.featured);
    if (Array.isArray(data.availability_warnings)) setAvailabilityWarnings(data.availability_warnings);
    if (data.review) setReview(data.review);
  };

  const loadKit = async (sid) => {
    try {
      const [salePage, kitRes, itemsPage, tasksPage] = await Promise.all([
        base44.entities.EstateSale.filter({ id: sid }),
        base44.functions.invoke('buildMarketingKit', { action: 'get', sale_id: sid }),
        base44.entities.Item.filter({ estate_sale_id: sid }, { limit: 200 }).catch(() => ({ items: [] })),
        base44.entities.SaleTask.filter({ sale_id: sid, category: 'Marketing' }, { limit: 50 }).catch(() => ({ items: [] }))
      ]);
      const s = (salePage.items || salePage)[0];
      if (!s) { navigate('/MySales'); return; }
      setSale(s);
      const k = kitRes.data.kit;
      setKit(k);
      setEligiblePhotos(kitRes.data.eligible_photos || []);
      applyKitExtras(kitRes.data, s);
      setSaleItems(itemsPage.items || []);
      setMktTasks(tasksPage.items || []);
      setDraft(k ? {
        sale_description: k.sale_description, social_posts: k.social_posts || [],
        email_draft: k.email_draft || {}, sms_draft: k.sms_draft, ai_removals: k.ai_removals || []
      } : { social_posts: [], email_draft: {} });
      if (k && k.qr_url) QRCode.toDataURL(k.qr_url, { width: 320, margin: 2 }).then(setQrDataUrl).catch(() => {});
    } catch (e) {
      navigate('/MySales');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (saleId) loadKit(saleId); else loadSaleList();
  }, [saleId]);

  const build = async () => {
    setBuilding(true);
    try {
      const res = await base44.functions.invoke('buildMarketingKit', { action: 'build', sale_id: saleId });
      const k = res.data.kit;
      setKit(k);
      applyKitExtras(res.data, sale);
      setDraft({
        sale_description: k.sale_description, social_posts: k.social_posts || [],
        email_draft: k.email_draft || {}, sms_draft: k.sms_draft, ai_removals: k.ai_removals || []
      });
      if (k.qr_url) QRCode.toDataURL(k.qr_url, { width: 320, margin: 2 }).then(setQrDataUrl).catch(() => {});
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      alert((d && d.message) || 'Could not build the kit — try again.');
    }
    setBuilding(false);
  };

  const savePhotos = async (indexes) => {
    setSavingPhotos(true);
    try {
      const res = await base44.functions.invoke('buildMarketingKit', { action: 'approve_photos', sale_id: saleId, indexes });
      setKit(res.data.kit);
    } catch (e) { alert('Could not save photo approvals.'); }
    setSavingPhotos(false);
  };

  const saveDrafts = async () => {
    setSavingDrafts(true);
    try {
      const res = await base44.functions.invoke('buildMarketingKit', {
        action: 'save_drafts', sale_id: saleId,
        sale_description: draft.sale_description, social_posts: draft.social_posts,
        email_subject: (draft.email_draft || {}).subject, email_body: (draft.email_draft || {}).body,
        sms_draft: draft.sms_draft
      });
      setKit(res.data.kit);
    } catch (e) { alert('Could not save drafts.'); }
    setSavingDrafts(false);
  };

  const setComponentStatus = async (component, status) => {
    try {
      const res = await base44.functions.invoke('buildMarketingKit', { action: 'set_component_status', sale_id: saleId, component, status });
      setKit(res.data.kit);
    } catch (e) { alert('Could not update status.'); }
  };

  // Chapter 18 P1-15 — save canonical featured-Item picks (server validates
  // the Items belong to this sale) and refresh conflict warnings.
  const saveFeaturedItems = async (ids) => {
    setSavingFeatured(true);
    try {
      const res = await base44.functions.invoke('buildMarketingKit', { action: 'save_featured_items', sale_id: saleId, featured_item_ids: ids });
      setKit(res.data.kit);
      setFeaturedPicks(res.data.featured || []);
      setAvailabilityWarnings(res.data.availability_warnings || []);
      refreshReview();
    } catch (e) { alert('Could not save featured picks.'); }
    setSavingFeatured(false);
  };

  // Chapter 18 P1-14 — explicit human approval of the final accuracy review.
  const approveFinalReview = async () => {
    setApproving(true);
    try {
      const res = await base44.functions.invoke('buildMarketingKit', { action: 'approve_final_review', sale_id: saleId });
      setKit(res.data.kit);
      refreshReview();
    } catch (e) { alert('Could not record the approval.'); }
    setApproving(false);
  };

  const refreshReview = async () => {
    try {
      const res = await base44.functions.invoke('buildMarketingKit', { action: 'get', sale_id: saleId });
      applyKitExtras(res.data, sale);
    } catch (e) { /* non-fatal */ }
  };

  // Chapter 18 P1-28 — marketing responsibilities reuse the canonical
  // SaleTask (owner, due date, status, sale relationship).
  const createTaskPlan = async () => {
    if (!sale) return;
    setCreatingPlan(true);
    try {
      const me = await base44.auth.me();
      const plan = buildMarketingTaskPlan(sale, me.id);
      await base44.entities.SaleTask.bulkCreate(plan);
      const tasksPage = await base44.entities.SaleTask.filter({ sale_id: sale.id, category: 'Marketing' }, { limit: 50 });
      setMktTasks(tasksPage.items || []);
    } catch (e) { alert('Could not create the task plan.'); }
    setCreatingPlan(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;

  // No sale selected — pick which sale to kit up.
  if (!saleId) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-1 flex items-center gap-2.5"><Megaphone className="w-6 h-6 text-cyan-700" /> Marketing Kit</h1>
        <p className="text-slate-600 mb-5">One coordinated package for a sale — description, social, email, SMS draft, QR and signs — built from your records, no re-typing.</p>
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {(sales || []).map(s => (
            <Link key={s.id} to={`/MarketingKit?saleId=${s.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <div className="font-medium text-slate-800">{s.title}</div>
                <div className="text-xs text-slate-500">{s.status} · updated {new Date(s.updated_date).toLocaleDateString()}</div>
              </div>
              <Button size="sm">Build Kit</Button>
            </Link>
          ))}
          {(sales || []).length === 0 && <div className="p-6 text-slate-500 text-sm">No active or upcoming sales to market yet.</div>}
        </div>
      </div>
    );
  }

  const cs = (kit && kit.component_status) || {};
  const chips = [['description', 'Description'], ['social', 'Social'], ['email', 'Email'], ['sms', 'SMS draft'], ['qr', 'QR'], ['signs', 'Signs'], ['featured', 'Featured'], ['final_review', 'Final review']];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link to="/MySales" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Back to Sales</Link>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-2xl font-heading font-bold text-slate-900">Marketing Kit</h1>
        <Badge variant="outline" className="capitalize">{sale && sale.status}</Badge>
      </div>
      <p className="text-slate-600 mb-4">{sale && sale.title}</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {chips.map(([k, label]) => (
          <Badge key={k} className={STATUS_BADGE[cs[k] || 'not_created']}>{label}: {STATUS_LABEL[cs[k] || 'not_created']}</Badge>
        ))}
      </div>

      <div className="space-y-6">
        <ListingCompletenessCard completeness={completeness} />
        <MarketingTasksCard sale={sale} tasks={mktTasks} creating={creatingPlan} onCreatePlan={createTaskPlan} />
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-700" /> One-click kit</div>
            <Button onClick={build} disabled={building}>
              {building ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {kit ? 'Regenerate Kit' : 'Build Marketing Kit'}
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Everything derives from your sale record — dates, location, parking, payment methods, featured items and
            your service catalog. AI drafts follow the brand-truth guardrail: marketing may interpret verified facts,
            never invent them.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-cyan-700" /> Photos — approve for marketing</div>
          <p className="text-sm text-slate-500 mb-4">Nothing is assumed public-safe: only photos you approve here are used for marketing.</p>
          <PhotoApprovalGrid photos={eligiblePhotos} approved={(kit && kit.approved_photo_indexes) || []} onSaved={savePhotos} saving={savingPhotos} />
        </div>

        {kit && (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-slate-900">Content drafts</div>
                <Button variant="outline" size="sm" onClick={saveDrafts} disabled={savingDrafts}>
                  {savingDrafts ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />} Save drafts
                </Button>
              </div>
              <KitDrafts draft={draft} onChange={setDraft} />
              <p className="text-xs text-slate-500 mt-3">
                Drafts are point-in-time snapshots — sent email/SMS, published social posts and print never update automatically.
                The public sale page is the current digital truth. SMS here is a DRAFT only: EstateSalen does not send SMS.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><QrCode className="w-4 h-4 text-cyan-700" /> QR code</div>
                {qrDataUrl ? (
                  <div className="space-y-3">
                    <img src={qrDataUrl} alt="Sale QR code" className="w-40 h-40 rounded-lg border border-slate-100" />
                    <p className="text-xs text-slate-500 break-all">Points to your public sale page: {kit.qr_url}</p>
                    <a href={qrDataUrl} download={`sale-${saleId}-qr.png`}><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" /> Download</Button></a>
                  </div>
                ) : <p className="text-sm text-slate-400">Build the kit to generate the QR code.</p>}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><Signpost className="w-4 h-4 text-cyan-700" /> Printable signs</div>
                <p className="text-sm text-slate-500 mb-3">Directional, parking, checkout, sold and pickup signs derive from this sale's details.</p>
                <Link to={`/PrintSigns?saleId=${saleId}`}><Button variant="outline" size="sm">Open Print Signs</Button></Link>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><Megaphone className="w-4 h-4 text-cyan-700" /> Public sale page</div>
                <p className="text-sm text-slate-500 mb-3">The kit's destination — publish or update the sale listing itself.</p>
                <Link to={`/SalePublication?saleId=${saleId}`}><Button variant="outline" size="sm">Open Sale Publication</Button></Link>
              </div>

              <FeaturedItemsCard
                items={saleItems}
                featured={featuredPicks}
                warnings={availabilityWarnings}
                onSave={saveFeaturedItems}
                saving={savingFeatured}
              />
            </div>

            <FinalReviewCard
              review={review}
              finalReview={kit && kit.final_review}
              onApprove={approveFinalReview}
              approving={approving}
            />

            {sale && ['completed', 'archived'].includes(sale.status) && (
              <PostSaleReviewCard saleId={sale.id} />
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="font-semibold text-slate-900 mb-3">Mark components ready</div>
              <div className="flex flex-wrap gap-2">
                {chips.map(([k, label]) => (
                  <button key={k} onClick={() => setComponentStatus(k, cs[k] === 'ready' ? 'draft' : 'ready')}
                    className={`px-3 py-1.5 rounded-full text-sm border ${cs[k] === 'ready' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    {label} {cs[k] === 'ready' ? '✓ Ready' : '→ Ready'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">Readiness is preparation tracking — publishing and sending stay in their own systems under your control.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}