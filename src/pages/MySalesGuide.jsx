import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Edit, DollarSign, Package, TrendingUp, FileText, BarChart3,
  Megaphone, Download, Star, Briefcase, Receipt, Sparkles, Users,
  Eye, ChevronRight, CheckCircle2, Lock, ArrowRight, ArrowLeft, Zap, Globe,
  ClipboardList, Camera, Calendar, MapPin, BookOpen, Crown
} from 'lucide-react';

// ── Tier ordering ────────────────────────────────────────────────────
const TIER_ORDER = { basic: 1, pro: 2, premium: 3 };

// ── Sale-card button catalogue ────────────────────────────────────────
const BUTTONS = [
  {
    icon: Edit,
    label: 'Edit',
    color: 'border-blue-500 text-blue-700 bg-blue-50',
    tier: 'basic',
    description: 'Update sale details, dates, address, photos, and description at any time before or during the sale.',
  },
  {
    icon: DollarSign,
    label: 'POS',
    color: 'border-green-500 text-green-700 bg-green-50',
    tier: 'pro',
    description: 'A full Point-of-Sale system. Scan items, build carts, accept payment methods, and close transactions on the spot — no hardware required.',
  },
  {
    icon: Package,
    label: 'Inventory',
    color: 'border-purple-500 text-purple-700 bg-purple-50',
    tier: 'basic',
    description: 'Catalog every item for sale with photos, descriptions, and prices. Tracks what\'s sold vs. available in real time.',
  },
  {
    icon: TrendingUp,
    label: 'Attendance',
    color: 'border-cyan-500 text-cyan-700 bg-cyan-50',
    tier: 'basic',
    description: 'Log attendance by day and time slot. Useful for planning future sales and reporting to estate clients.',
  },
  {
    icon: FileText,
    label: 'Tasks',
    color: 'border-amber-500 text-amber-700 bg-amber-50',
    tier: 'basic',
    description: 'Create and assign pre-sale and day-of checklists. Never miss staging, signage, setup, or cleanup steps again.',
  },
  {
    icon: BarChart3,
    label: 'Statistics',
    color: 'border-indigo-500 text-indigo-700 bg-indigo-50',
    tier: 'basic',
    description: 'View live and post-sale metrics: views, saves, revenue, attendance, and item sell-through rate.',
  },
  {
    icon: Megaphone,
    label: 'Signs',
    color: 'border-red-500 text-red-700 bg-red-50',
    tier: 'basic',
    description: 'Generate print-ready directional signs and stake cards pre-loaded with your sale address and dates.',
  },
  {
    icon: Download,
    label: 'Export',
    color: 'border-slate-500 text-slate-700 bg-slate-50',
    tier: 'basic',
    description: 'Download a full data export of the sale — inventory, revenue, attendance, and contacts — as a CSV or PDF for client reporting.',
  },
  {
    icon: Star,
    label: 'VIP Event',
    color: 'border-yellow-500 text-yellow-700 bg-yellow-50',
    tier: 'growth',
    description: 'Host a paid or invite-only pre-sale VIP preview night. Manage ticketing, RSVPs, and early-access entry lists.',
  },
  {
    icon: Briefcase,
    label: 'Buyout',
    color: 'border-orange-500 text-orange-700 bg-orange-50',
    tier: 'pro',
    description: 'Record a bulk buyout offer from a dealer or liquidator — tracks the offer amount and ties it to the sale record.',
  },
  {
    icon: Receipt,
    label: 'Expenses / Mileage',
    color: 'border-emerald-500 text-emerald-700 bg-emerald-50',
    tier: 'pro',
    description: 'Log all sale-related costs (supplies, labor, fuel) and mileage. Generates a P&L summary and settlement statement data.',
  },
  {
    icon: Megaphone,
    label: 'Marketing',
    color: 'border-pink-500 text-pink-700 bg-pink-50',
    tier: 'growth',
    description: 'Launch email blasts, SMS campaigns, and Facebook/Instagram ads directly tied to this sale. Track opens, clicks, and ad spend.',
  },
  {
    icon: FileText,
    label: 'Contracts',
    color: 'border-blue-600 text-blue-700 bg-blue-50',
    tier: 'basic',
    description: 'Generate, send, and store the client estate sale agreement. Available as soon as the draft is created — no need to wait until the sale is booked.',
  },
  {
    icon: Users,
    label: 'Early Sign-In',
    color: 'border-indigo-500 text-indigo-700 bg-indigo-50',
    tier: 'basic',
    description: 'Manage the public early-arrival line list. Shoppers register online and you can view, print, or call the list day-of.',
  },
  {
    icon: Sparkles,
    label: 'Social Media Posts',
    color: 'border-purple-500 text-purple-700 bg-purple-50',
    tier: 'growth',
    description: 'AI-generate a full social media campaign: tease posts, address-reveal posts, day-of content, and results posts — then push to Facebook & Instagram.',
  },
];

// Map package names to a simple tier key
const packageToTierKey = (name) => {
  if (!name) return 'basic';
  const n = name.toLowerCase();
  if (n === 'elite') return 'elite';
  if (n === 'growth') return 'growth';
  if (n === 'professional') return 'pro';
  return 'basic';
};

const tierBadge = (tier) => {
  const map = {
    basic: { label: 'All Plans', color: 'bg-slate-100 text-slate-700' },
    pro: { label: 'Professional+', color: 'bg-blue-100 text-blue-700' },
    growth: { label: 'Growth+', color: 'bg-purple-100 text-purple-700' },
    elite: { label: 'Elite Only', color: 'bg-yellow-100 text-yellow-800' },
  };
  return map[tier] || map.basic;
};

// ── Stage steps ────────────────────────────────────────────────────────
const STAGES = [
  {
    icon: Plus,
    color: 'bg-orange-100 text-orange-600',
    title: 'Create the Draft — Before the Sale is Even Booked',
    body: `Don't wait until everything is confirmed. The moment you have a prospect or a signed contract, create the sale as a Draft right away.\n\nWhy? Because from the moment a draft exists, you can:\n• Generate the client Contracts (signed digitally)\n• Kick off the initial Marketing Materials\n• Build your checklist of Tasks\n• Start cataloging items in Inventory before the sale day\n\nThink of the Draft as your staging area — nothing goes live publicly until you choose to publish.`,
  },
  {
    icon: Edit,
    color: 'bg-blue-100 text-blue-600',
    title: 'Build Out the Sale Details',
    body: `Use the Edit button to fill in everything that makes the listing shine:\n• Full property address and sale dates/times\n• Sale type (Estate Tag Sale, Online Auction, Moving Sale, etc.)\n• High-quality photos of featured items\n• Payment methods accepted (cash, card, Venmo, etc.)\n• Special notes, parking info, and categories\n\nThe more detail, the better your SEO ranking and the more buyers show up.`,
  },
  {
    icon: FileText,
    color: 'bg-blue-100 text-blue-600',
    title: 'Generate the Client Contract',
    body: `Even in Draft status, you can open Contracts and generate the estate sale agreement pre-filled with the sale details. Send it directly to the client for digital signature.\n\nThis protects you legally from day one and signals professionalism to the client — long before the first shopper arrives.`,
  },
  {
    icon: ClipboardList,
    color: 'bg-amber-100 text-amber-600',
    title: 'Assign Tasks & Build the Checklist',
    body: `Open Tasks to build your pre-sale operational checklist. Stage the home, post directional signs, set up the POS station, arrange staff — each item tracked and checked off.\n\nTeam members on Elite plans can be assigned tasks directly so nothing falls through the cracks.`,
  },
  {
    icon: Camera,
    color: 'bg-purple-100 text-purple-600',
    title: 'Catalog the Inventory',
    body: `Use Inventory to photograph and price items before the sale opens. Labeled items become trackable in the POS — scan them at checkout for instant sell-through tracking.\n\nOn Growth and Elite plans, Google Lens pricing suggests market values based on your item photos, saving hours of research.`,
  },
  {
    icon: Megaphone,
    color: 'bg-pink-100 text-pink-600',
    title: 'Launch Marketing — Before Doors Open',
    body: `Once the listing is published, the Marketing and Social Media Posts buttons unlock a full pre-sale campaign:\n• AI-written tease and sneak-peek posts for Facebook & Instagram\n• Address-reveal post (auto-unlocks 24 hrs before sale)\n• Email blast to regional followers\n• Optional paid Facebook & Instagram ad campaigns\n\nThe platform handles scheduling — you approve and it posts automatically.`,
  },
  {
    icon: DollarSign,
    color: 'bg-green-100 text-green-600',
    title: 'Run the Sale — POS + Attendance',
    body: `On sale day, open the POS to process transactions. Items scanned from Inventory check out automatically. At the end of each day, run an attendance count and log it.\n\nEarly Sign-In shows you the line list before doors open so you can manage the crowd professionally.`,
  },
  {
    icon: BarChart3,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Track Performance & Close Out',
    body: `After the sale, open Statistics for the full breakdown: total revenue, per-day attendance, best-selling categories, and shopper engagement.\n\nExpenses/Mileage lets you log all costs so the Settlement Statement auto-generates the net payout to the estate client — clean, professional, and ready to send.`,
  },
];

export default function MySalesGuide() {
  const navigate = useNavigate();
  const [userPackage, setUserPackage] = useState(null);
  const [premiumPackage, setPremiumPackage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const packages = await base44.entities.SubscriptionPackage.filter({ account_type: 'estate_sale_operator', is_active: true });

      // Sort by tier: basic → pro → premium
      packages.sort((a, b) => (TIER_ORDER[a.tier_level] || 0) - (TIER_ORDER[b.tier_level] || 0));

      // The Elite package is the top one
      const elite = packages.find(p => p.package_name === 'Elite') || packages[packages.length - 1];
      setPremiumPackage(elite);

      // Match user's subscription tier
      const subTier = user?.subscription_tier || user?.package_name || null;
      const matched = subTier ? packages.find(p => p.package_name === subTier || p.tier_level === subTier) : null;
      setUserPackage(matched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const userTierKey = packageToTierKey(userPackage?.package_name);
  const isElite = userTierKey === 'elite';
  const isGrowth = userTierKey === 'growth' || isElite;
  const isPro = userTierKey === 'pro' || isGrowth;

  const userHasButton = (tier) => {
    if (tier === 'basic') return true;
    if (tier === 'pro') return isPro;
    if (tier === 'growth') return isGrowth;
    if (tier === 'elite') return isElite;
    return false;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-14 pb-24">

      {/* ── Back link ── */}
      <div className="pt-2">
        <button
          onClick={() => navigate('/MySales')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-600 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Sales
        </button>
      </div>

      {/* ── Hero ── */}
      <div className="text-center space-y-4 pt-6">
        <Badge className="bg-orange-100 text-orange-700 text-sm px-4 py-1">My Sales — Complete Guide</Badge>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 leading-tight">
          Run Every Sale Like a Pro
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          From the moment you land a new estate client to the day you hand over the settlement check — 
          here's exactly how to use My Sales to manage every step.
        </p>
        {userPackage && (
          <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Your plan: <strong>{userPackage.package_name}</strong>
          </div>
        )}
      </div>

      {/* ── Stage-by-stage process ── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-orange-500" />
          The Full Sale Lifecycle
        </h2>
        <p className="text-slate-600">Follow these stages for every sale — whether you're running a small moving sale or a multi-day estate event.</p>

        <div className="space-y-4">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <Card key={i} className="overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-0 flex">
                  <div className={`w-1.5 flex-shrink-0 ${stage.color.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}`} />
                  <div className="p-5 flex-1">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stage.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step {i + 1}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{stage.title}</h3>
                        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{stage.body}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Button-by-button guide ── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-orange-500" />
          Every Button, Explained
        </h2>
        <p className="text-slate-600">Each sale card is packed with tools. Here's what every button does and which plan unlocks it.</p>

        <div className="grid gap-4 md:grid-cols-2">
          {BUTTONS.map((btn, i) => {
            const Icon = btn.icon;
            const hasIt = userHasButton(btn.tier);
            const badge = tierBadge(btn.tier);
            return (
              <Card
                key={i}
                className={`border transition-shadow hover:shadow-md ${!hasIt ? 'opacity-70' : ''}`}
              >
                <CardContent className="p-4 flex gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${btn.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-slate-900">{btn.label}</span>
                      <Badge className={`text-xs px-2 py-0 ${badge.color}`}>{badge.label}</Badge>
                      {!hasIt && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Lock className="w-3 h-3" /> Upgrade to unlock
                        </span>
                      )}
                      {hasIt && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{btn.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Upgrade CTA (shown only to non-Elite users) ── */}
      {!isElite && premiumPackage && (
        <section>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
            <CardContent className="p-8 relative">
              <div className="absolute top-4 right-4 opacity-10">
                <Crown className="w-32 h-32 text-yellow-400" />
              </div>
              <div className="relative space-y-4 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-400 font-bold uppercase tracking-wider text-sm">Upgrade to {premiumPackage.package_name}</span>
                </div>
                <h3 className="text-3xl font-serif font-bold leading-tight">
                  Unlock the Full Power of Your Sales Dashboard
                </h3>
                <p className="text-slate-300 text-base leading-relaxed">
                  {premiumPackage.description}
                </p>
                <ul className="space-y-2">
                  {(premiumPackage.features || []).slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-200 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-6"
                    onClick={() => navigate(createPageUrl('OperatorPackages'))}
                  >
                    View All Plans <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <span>From</span>
                    <span className="text-white font-bold text-lg">${premiumPackage.monthly_price}/mo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Back button ── */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate(createPageUrl('MySales'))}>
          ← Back to My Sales
        </Button>
      </div>

    </div>
  );
}