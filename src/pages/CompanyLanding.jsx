import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Star, Check, ArrowRight, BarChart2, Users, ShoppingBag, Zap, MapPin,
  Camera, Bot, Mail, Phone, TrendingUp, Shield, Globe, Layers,
  ChevronDown, ChevronUp, DollarSign, Clock, Award, Sparkles,
  Package, FileText, MessageSquare, Heart, Target, Megaphone,
  QrCode, Gift, Trophy, Navigation, Bell
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'For Your Customers', href: '#customers' },
  { label: 'For Your Business', href: '#business' },
  { label: 'Grow with Us', href: '#growth' },
  { label: 'Pricing', href: '#pricing' },
];

const STATS = [
  { value: '10,000+', label: 'Companies Nationwide' },
  { value: '3x', label: 'Average Revenue Increase' },
  { value: '50+', label: 'Built-In Features' },
  { value: '1 Month', label: 'Free Trial' },
];

const CUSTOMER_FEATURES = [
  { icon: MapPin, title: 'Find Sales by Location', desc: 'Interactive map lets buyers discover your sales nearby instantly.' },
  { icon: Camera, title: 'Photo-Rich Listings', desc: 'High-quality photos and featured items attract more attendees before the sale even starts.' },
  { icon: ShoppingBag, title: 'Buy Online Anytime', desc: 'Customers shop your inventory 24/7 — no need to show up in person.' },
  { icon: Heart, title: 'Watchlists & Alerts', desc: 'Buyers save favorites and get notified, keeping them engaged and coming back.' },
  { icon: MessageSquare, title: 'Direct Item Messaging', desc: 'Buyers message you directly on specific items to ask questions, negotiate, or make offers.' },
  { icon: Shield, title: 'Trusted & Verified', desc: 'Ratings, reviews, and verified seller profiles build buyer confidence in your brand.' },
  { icon: QrCode, title: 'Sale Check-In', desc: 'Buyers scan a QR code to check in at your sale and earn instant reward points.' },
  { icon: Gift, title: 'Purchase Rewards', desc: 'Every purchase earns points redeemable for discounts — turning one-time shoppers into loyal regulars.' },
  { icon: Trophy, title: 'Monthly Drawings', desc: 'Active buyers are automatically entered into monthly prize drawings, driving repeat engagement.' },
  { icon: Navigation, title: 'Multi-Sale GPS Routes', desc: 'Buyers plan optimized driving routes across multiple sales in one day — maximizing their experience.' },
  { icon: Bell, title: 'Multi-Company Text Alerts', desc: 'Buyers subscribe to alerts from multiple operators and get SMS notifications the moment new sales go live.' },
  { icon: Star, title: 'VIP List Access', desc: 'Exclusive VIP buyers get early access before sales open and special post-sale bonuses — rewarding your best customers.' },
];

const BUSINESS_FEATURES = [
  { icon: Layers, title: 'Full Sale Dashboard', desc: 'Create, manage and publish estate sales from one beautifully designed control center. Create the sale, upload photos and watch AI perform the magic. Save 10+ hours per sale instantly.' },
  { icon: Camera, title: 'AI Item Pricing, Title & Description', desc: 'Google Lens-powered AI instantly estimates market value, generates a title, and writes a description for any item you photograph.' },
  { icon: Bot, title: 'AI Marketing Generator', desc: 'Generate Facebook posts, Instagram captions, email blasts, SMS, and blog posts in seconds. Press the button and all marketing is pushed to each social media.' },
  { icon: ShoppingBag, title: 'POS System for Checkout', desc: 'Buyers scan a QR code to add items to their cart and checkout in seconds — no more cash lines or lost tags.' },
  { icon: FileText, title: 'Export Sales Sheet w/ Commission Breakdown', desc: 'Export a full itemized sales report with commission calculations — ready to share with clients at the close of every sale.' },
  { icon: FileText, title: 'Sale Printed Signage', desc: 'Generate and print professional price tags, category signs, and sale banners directly from your inventory.' },
  { icon: Package, title: '10,000+ Pricing Database', desc: 'Access a massive built-in pricing reference database to quickly look up fair market values for estate sale items.' },
  { icon: MessageSquare, title: 'Offer Management & Communication', desc: 'Manage incoming offers, respond to clients, and track negotiations all in one place — keeping every deal organized and moving forward.' },
  { icon: DollarSign, title: 'Buyout Calculator', desc: 'Instantly calculate fair buyout offers based on inventory value, commission rates, and estimated sale proceeds.' },
  { icon: Layers, title: 'Post Items to Inventory', desc: 'Quickly add items to your sale inventory with photos, pricing, and descriptions — all organized in one place.' },
  { icon: FileText, title: 'Per Sale Task Lists', desc: 'Assign and track tasks for every sale — from setup to cleanup — so nothing falls through the cracks.' },
  { icon: Users, title: 'Assign Client to Sale', desc: 'Link estate clients directly to their sale for seamless communication, permissions, and access management.' },
  { icon: BarChart2, title: 'Revenue Analytics', desc: 'Track commissions, expenses, and profit per sale with crystal-clear financial dashboards.' },
  { icon: Users, title: 'Team Management', desc: 'Add staff with role-based access — manage your crew without sharing full account access.' },
  { icon: FileText, title: 'Contract Management', desc: 'Digital contracts with automated expiration alerts keep you legally protected.' },
  { icon: Mail, title: 'Email & SMS Campaigns', desc: 'Built-in marketing tools reach your buyer list without needing a third-party service.' },
  { icon: Globe, title: 'SEO-Optimized Listings', desc: 'Every sale page is built to rank on Google — free organic traffic to every event you host.' },
  { icon: Star, title: 'VIP Events', desc: 'Create exclusive VIP pre-sale events, invite your best buyers early, and reward loyalty — driving higher revenue before the doors even open.' },
];

const GROWTH_FEATURES = [
  { icon: Target, title: 'Lead Generation Machine', desc: 'Auto-capture leads from your website, ads, and the estate finder — all funneled to your dashboard.' },
  { icon: Globe, title: 'Custom Company Websites', desc: 'Get a professionally branded company website that showcases your sales, team, and services — no coding required.' },
  { icon: DollarSign, title: 'Business Expenses Tracker', desc: 'Log, categorize, and track all business expenses per sale or company-wide — with cash flow projections and profit reports.' },
  { icon: Target, title: 'Pre-Probate Territory Leads', desc: 'Get access to pre-probate leads in your territory — reach families before they even start looking for an estate sale company.' },
  { icon: Megaphone, title: 'Facebook Ads for Leads', desc: 'We launch and pay for targeted Facebook ad campaigns to generate estate sale leads in your area.' },
  { icon: Users, title: 'Full CRM for Marketing & Referrals', desc: 'Track every contact, conversation, and referral in one place — nurture leads and build lasting relationships that grow your business.' },
  { icon: DollarSign, title: 'Realtor Referral Income', desc: 'Earn a finder\'s fee by referring home sellers to real estate agents. Passive income from every sale.' },
  { icon: TrendingUp, title: 'Territory Heatmap', desc: 'Visualize where demand is highest in your region and target untapped markets strategically.' },
  { icon: Globe, title: 'National Marketplace', desc: 'List items on our national buyer network and sell to customers across the country via shipping.' },
  { icon: Megaphone, title: 'Featured Listings', desc: 'Pay to boost your sale to the top of national and local search results for maximum visibility.' },
  { icon: Sparkles, title: 'AI Business Coach', desc: 'Get strategic advice, pricing guidance, and growth tips from your built-in AI assistant.' },
  { icon: Award, title: 'Vendor Network Access', desc: 'Connect clients with trusted movers, attorneys, appraisers, and cleaners — and earn on referrals.' },
  { icon: Package, title: 'Auction Functionality', desc: 'Run online auctions to maximize item value far beyond what in-person shoppers would pay.' },
];

const FAQS = [
  { q: 'How long is the free trial?', a: 'You get a full 1-month free trial with complete access to all features in your selected plan. No credit card required to start.' },
  { q: 'Can I switch plans later?', a: 'Absolutely. You can upgrade or downgrade your plan at any time from your account settings.' },
  { q: 'Do my customers need to create accounts?', a: 'No. Buyers can browse and attend sales without an account. Creating one gives them watchlists and purchase history.' },
  { q: 'Is my data secure?', a: 'Yes. All data is encrypted and stored securely. We never sell your data to third parties.' },
  { q: 'Do I need technical knowledge to use the platform?', a: 'Not at all. The platform is designed for estate sale professionals — not tech experts. Setup takes minutes.' },
  { q: 'What happens to existing inventory between sales?', a: 'Unsold items can be listed on our online marketplace and sold to buyers nationwide between events.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-slate-900 text-base">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-orange-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && <p className="pb-5 text-slate-600 leading-relaxed">{a}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent = 'orange' }) {
  const colors = {
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    green: 'bg-green-100 text-green-600',
  };
  return (
    <div className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 mb-1">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function CompanyLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleGetStarted = () => {
    base44.auth.redirectToLogin('/OperatorPackages');
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LL</span>
              </div>
              <span className="font-serif font-bold text-slate-900 text-lg hidden sm:block">Legacy Lane</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className="text-sm text-slate-600 hover:text-orange-600 font-medium transition-colors">
                  {l.label}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link to="/OperatorPackages" className="hidden sm:inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                <div className="space-y-1.5">
                  <span className="block w-6 h-0.5 bg-slate-700" />
                  <span className="block w-6 h-0.5 bg-slate-700" />
                  <span className="block w-6 h-0.5 bg-slate-700" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="block text-slate-700 font-medium py-1" onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link to="/OperatorPackages" className="block w-full text-center bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg mt-2">
              Start Free Trial
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" /> The #1 Platform for Estate Sale Companies
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight mb-6">
            Run More Sales.<br />
            <span className="text-orange-400">Make More Money.</span><br />
            Stress Less.
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Legacy Lane OS is the all-in-one business platform built exclusively for estate sale companies — from your first sale to your hundredth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/OperatorPackages"
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-orange-900/40"
            >
              Start Your Free Month <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#customers"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              See All Features
            </a>
          </div>

          <p className="mt-6 text-sm text-slate-400">No credit card required · Cancel anytime · 1 month free</p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold mb-1">{s.value}</div>
                <div className="text-orange-200 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR YOUR CUSTOMERS ── */}
      <section id="customers" className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-orange-600 font-semibold text-sm mb-3 bg-orange-50 px-3 py-1 rounded-full">
              <Heart className="w-4 h-4" /> FOR YOUR CUSTOMERS
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
              Give Buyers an Experience They Love
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Happy buyers become repeat customers. Our platform keeps them coming back to every sale you host.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CUSTOMER_FEATURES.map(({ icon, title, desc }) => (
              <FeatureCard key={title} icon={icon} title={title} desc={desc} accent="orange" />
            ))}
          </div>

          {/* Highlight box */}
          <div className="mt-12 bg-orange-50 border border-orange-200 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Scan, Shop & Checkout In Seconds</h3>
              <p className="text-slate-600 leading-relaxed">
                Your shoppers scan a QR code to add items to their cart and checkout in seconds — no more lost tags. As you create a bundle, items in inventory appear or items from the database are suggested with common pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR YOUR BUSINESS ── */}
      <section id="business" className="py-20 md:py-28 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-3 bg-cyan-900/50 px-3 py-1 rounded-full">
              <Zap className="w-4 h-4" /> FOR YOUR BUSINESS
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4">
              We're Not Just a Weekend Sale Directory —<br className="hidden md:block" />
              <span className="text-cyan-400">We Also Supply You with the Tools That Run Your Business</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Stop duct-taping spreadsheets and apps together. Everything you need is in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BUSINESS_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-white mb-2">{title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* AI spotlight */}
          <div className="mt-12 bg-gradient-to-r from-cyan-900/50 to-slate-800 border border-cyan-700/30 rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-14 h-14 bg-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-cyan-400 text-sm font-semibold mb-2 uppercase tracking-wide">AI-Powered</div>
                <h3 className="text-2xl font-bold text-white mb-3">Your Personal AI Marketing Team</h3>
                <p className="text-slate-300 leading-relaxed max-w-2xl">
                  Describe your upcoming sale and our AI writes your Facebook posts, Instagram captions, email campaigns, SMS blasts, and even a full blog post — in your brand voice, in seconds. What used to take hours now takes two clicks.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Facebook Posts', 'Instagram Captions', 'Email Blasts', 'SMS Alerts', 'Blog Articles', 'Video Scripts'].map(tag => (
                    <span key={tag} className="bg-white/10 text-slate-300 text-xs px-3 py-1 rounded-full border border-white/10">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GROWTH ── */}
      <section id="growth" className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-green-600 font-semibold text-sm mb-3 bg-green-50 px-3 py-1 rounded-full">
              <TrendingUp className="w-4 h-4" /> FOR YOUR GROWTH
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
              Built to Scale With You
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              From one-person operation to regional powerhouse — our platform grows as fast as you do.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {GROWTH_FEATURES.map(({ icon, title, desc }) => (
              <FeatureCard key={title} icon={icon} title={title} desc={desc} accent="green" />
            ))}
          </div>

          {/* Referral callout */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-8 md:p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h3 className="text-2xl md:text-3xl font-bold mb-3">Earn Money Even Between Sales</h3>
            <p className="text-green-100 max-w-xl mx-auto leading-relaxed mb-6">
              When your clients are ready to sell their home, refer them to a real estate agent through our platform and earn a referral fee — automatically tracked and paid.
            </p>
            <Link to="/OperatorPackages" className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors">
              See How It Works <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL STRIP ── */}
      <section className="bg-orange-600 py-16 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-orange-300 text-orange-300" />)}
          </div>
          <blockquote className="text-2xl md:text-3xl font-serif italic leading-relaxed mb-6">
            "Legacy Lane OS completely transformed how we run our business. We doubled our revenue in the first 6 months — and the AI content tool alone saves us 10 hours a week."
          </blockquote>
          <p className="text-orange-200 font-medium">— Estate Sale Operator, Nashville TN</p>
        </div>
      </section>

      {/* ── PRICING CTA ── */}
      <section id="pricing" className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
            Start with a full month free. No credit card needed. Access every feature from day one.
          </p>

          {/* Feature checklist */}
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-12 text-left">
            {[
              'Unlimited sale listings', 'AI content generation', 'Online marketplace access',
              'Team member seats', 'Email & SMS campaigns', 'Referral income tracking',
              'Analytics & reporting', 'Priority support',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-slate-700 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/OperatorPackages"
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-orange-200"
            >
              View Plans & Pricing <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">30-day money-back guarantee · Cancel anytime</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-slate-500">Everything you need to know before getting started.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 md:px-10 divide-y divide-slate-200">
            {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-xl">LL</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Start Growing Today</h2>
          <p className="text-slate-400 mb-8 text-lg">Join thousands of estate sale companies already on Legacy Lane OS.</p>
          <Link
            to="/OperatorPackages"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors"
          >
            Claim Your Free Month <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Footer links */}
        <div className="border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">© 2026 Legacy Lane. All rights reserved.</p>
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