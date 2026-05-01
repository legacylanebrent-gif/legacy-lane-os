import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Minus, ArrowRight, Star, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES = [
  {
    label: 'Sale Management',
    rows: [
      { feature: 'Create & publish estate sale listings', us: true, them: true },
      { feature: 'Unlimited sale listings', us: true, them: false },
      { feature: 'Drag-and-drop photo management', us: true, them: false },
      { feature: 'Batch photo labeling & pricing', us: true, them: false },
      { feature: 'AI-powered item pricing (Google Lens)', us: true, them: false },
      { feature: 'Sale scheduling with multi-date support', us: true, them: true },
      { feature: 'Featured / premium listing upgrades', us: true, them: true },
      { feature: 'QR code in-person checkout', us: true, them: false },
      { feature: 'Inventory management dashboard', us: true, them: false },
    ],
  },
  {
    label: 'Online Selling',
    rows: [
      { feature: 'National online marketplace', us: true, them: false },
      { feature: 'Fixed-price "Buy Now" listings', us: true, them: false },
      { feature: 'Auction functionality', us: true, them: false },
      { feature: 'Proxy / auto-bid auctions', us: true, them: false },
      { feature: 'Shipping to buyers nationwide', us: true, them: false },
      { feature: 'Item status synced across channels', us: true, them: false },
      { feature: 'Buyer watchlists & price alerts', us: true, them: false },
    ],
  },
  {
    label: 'Marketing & Growth',
    rows: [
      { feature: 'AI content generator (posts, emails, SMS)', us: true, them: false },
      { feature: 'Built-in email campaign tool', us: true, them: false },
      { feature: 'Built-in SMS campaign tool', us: true, them: false },
      { feature: 'SEO-optimized sale pages', us: true, them: true },
      { feature: 'Social media integration', us: true, them: false },
      { feature: 'Content calendar & scheduling', us: true, them: false },
      { feature: 'SEO boost per listing (AI-generated)', us: true, them: false },
      { feature: 'Facebook Ad campaign builder', us: true, them: false },
    ],
  },
  {
    label: 'Lead Generation & CRM',
    rows: [
      { feature: 'Lead capture from multiple sources', us: true, them: false },
      { feature: 'Lead scoring & routing', us: true, them: false },
      { feature: 'Territory heatmap analytics', us: true, them: false },
      { feature: 'Built-in CRM (contacts, pipeline)', us: true, them: false },
      { feature: 'Activity timeline per contact', us: true, them: false },
      { feature: 'Realtor referral income tracking', us: true, them: false },
      { feature: 'Referral program for buyers', us: true, them: false },
    ],
  },
  {
    label: 'Business Operations',
    rows: [
      { feature: 'Team management & role-based access', us: true, them: false },
      { feature: 'Digital contracts with expiration alerts', us: true, them: false },
      { feature: 'Revenue & commission analytics', us: true, them: false },
      { feature: 'Expense tracking & cash flow projections', us: true, them: false },
      { feature: 'AI business coach', us: true, them: false },
      { feature: 'API access & webhooks', us: true, them: false },
      { feature: 'Vendor network directory', us: true, them: false },
      { feature: 'Buyer rewards & loyalty program', us: true, them: false },
    ],
  },
  {
    label: 'Buyer Experience',
    rows: [
      { feature: 'Interactive map to find nearby sales', us: true, them: true },
      { feature: 'Photo-rich sale listings', us: true, them: true },
      { feature: 'Shop online without attending in person', us: true, them: false },
      { feature: 'Direct buyer-seller messaging', us: true, them: false },
      { feature: 'Buyer purchase history & receipts', us: true, them: false },
      { feature: 'Mobile-optimized buyer experience', us: true, them: 'partial' },
    ],
  },
  {
    label: 'Pricing & Value',
    rows: [
      { feature: 'Free 1-month trial', us: true, them: false },
      { feature: 'No per-listing fees', us: true, them: false },
      { feature: 'Flat monthly subscription', us: true, them: false },
      { feature: '30-day money-back guarantee', us: true, them: false },
    ],
  },
];

const HERO_STATS = [
  { us: '50+', them: '~5', label: 'Platform Features' },
  { us: 'Yes', them: 'No', label: 'Online Marketplace' },
  { us: 'Yes', them: 'No', label: 'AI Tools Built-In' },
  { us: '1 Month Free', them: 'None', label: 'Free Trial' },
];

function Cell({ value }) {
  if (value === true) return (
    <div className="flex justify-center">
      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-4 h-4 text-green-600" />
      </div>
    </div>
  );
  if (value === false) return (
    <div className="flex justify-center">
      <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center">
        <X className="w-4 h-4 text-red-400" />
      </div>
    </div>
  );
  if (value === 'partial') return (
    <div className="flex justify-center">
      <div className="w-7 h-7 rounded-full bg-yellow-50 flex items-center justify-center">
        <Minus className="w-4 h-4 text-yellow-500" />
      </div>
    </div>
  );
  return <span className="text-slate-500 text-sm text-center block">{value}</span>;
}

function CategorySection({ category, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-bold text-slate-800 text-base">{category.label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{category.rows.length} features</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {category.rows.map((row, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] items-center px-5 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
            >
              <span className="text-sm text-slate-700 pr-4">{row.feature}</span>
              <Cell value={row.us} />
              <Cell value={row.them} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompareEstateSales() {
  const totalFeatures = CATEGORIES.reduce((sum, c) => sum + c.rows.length, 0);
  const usWins = CATEGORIES.reduce((sum, c) => sum + c.rows.filter(r => r.us === true && r.them !== true).length, 0);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LL</span>
            </div>
            <span className="font-serif font-bold text-slate-900 text-lg hidden sm:block">Legacy Lane</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/CompanyLanding" className="text-sm text-slate-600 hover:text-slate-900 font-medium hidden sm:block">
              See All Features
            </Link>
            <Link
              to="/OperatorPackages"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" /> Honest Side-by-Side Comparison
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-tight mb-5">
            Legacy Lane OS vs.<br />
            <span className="text-slate-400">EstateSales.net</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            EstateSales.net is a listing directory. Legacy Lane OS is a full business operating system. See exactly what you get — and what you're missing.
          </p>

          {/* Quick stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {HERO_STATS.map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-xs text-slate-400 mb-2">{s.label}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-center flex-1">
                    <div className="text-orange-400 font-bold text-sm">{s.us}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Legacy Lane</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center flex-1">
                    <div className="text-slate-400 font-bold text-sm">{s.them}</div>
                    <div className="text-xs text-slate-500 mt-0.5">EstateSales.net</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORE BANNER ── */}
      <section className="bg-orange-600 text-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-orange-200 text-orange-200" />
              <span className="font-bold text-lg">Legacy Lane wins <span className="underline">{usWins} of {totalFeatures}</span> features</span>
            </div>
            <span className="hidden sm:block text-orange-300">·</span>
            <span className="text-orange-200 text-sm">EstateSales.net is a directory. We're your entire business platform.</span>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Sticky column headers */}
          <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4 shadow-sm sticky top-16 z-30">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Feature</div>
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="hidden sm:inline">Legacy Lane</span>
                <span className="sm:hidden">LL</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-400 px-2 py-1">EstateSales<span className="hidden sm:inline">.net</span></div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mb-6 text-xs text-slate-500 justify-center flex-wrap">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-600" /> Included</span>
            <span className="flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-red-400" /> Not available</span>
            <span className="flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-yellow-500" /> Partial / limited</span>
          </div>

          {/* Category sections */}
          {CATEGORIES.map((cat, idx) => (
            <CategorySection key={cat.label} category={cat} defaultOpen={idx === 0} />
          ))}

          {/* Summary row */}
          <div className="mt-6 bg-slate-900 text-white rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] items-center px-5 py-5">
              <div>
                <div className="font-bold text-lg">Total Features</div>
                <div className="text-slate-400 text-sm mt-0.5">Across all categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{totalFeatures}</div>
                <div className="text-xs text-slate-400 mt-0.5">Legacy Lane</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-400">{totalFeatures - usWins}</div>
                <div className="text-xs text-slate-400 mt-0.5">EstateSales.net</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-4">
            Stop Renting a Listing.<br />
            <span className="text-orange-600">Own Your Business.</span>
          </h2>
          <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            EstateSales.net lists your sales. Legacy Lane OS runs your entire company — marketing, CRM, operations, AI, and more — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/OperatorPackages"
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-orange-100"
            >
              Start Your Free Month <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/CompanyLanding"
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              See All Features
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-400">No credit card required · Cancel anytime · 30-day money-back guarantee</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-white">
        <div className="border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">© 2026 Legacy Lane. All rights reserved. · Comparison data based on publicly available information.</p>
            <div className="flex items-center gap-6">
              <Link to="/CompanyLanding" className="text-slate-400 hover:text-orange-400 text-sm transition-colors">
                Features
              </Link>
              <Link to="/CompareEstateSales" className="text-slate-400 hover:text-orange-400 text-sm transition-colors">
                Compare vs EstateSales.net
              </Link>
              <Link to="/OperatorPackages" className="text-slate-400 hover:text-orange-400 text-sm transition-colors">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}