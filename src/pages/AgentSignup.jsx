import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check, MapPin, Shield, Zap, Star, AlertTriangle,
  Building2, Home, ArrowRight, TrendingUp, Users, Award, Lock, ChevronRight, ShieldCheck
} from 'lucide-react';
import SharedFooter from '@/components/layout/SharedFooter';
import TerritoryCalculator from '@/components/agent/TerritoryCalculator';
import AgentApplicationForm from '@/components/agent/AgentApplicationForm';

const preferredFeatures = [
  'Choose one city or multiple cities',
  'Small monthly territory participation fee',
  'Receive qualified seller & referral opportunities',
  'Build relationships with local estate sale companies',
  '20% referral fee only when a platform-generated deal closes',
  'Great starting option for agents testing a market',
];

const exclusiveFeatures = [
  'Buy into a city, group of cities, or territory',
  'No monthly participation fee',
  'Priority or exclusive access to territory-generated leads',
  'Stronger positioning with estate sale company partners',
  'Territory protection subject to performance standards',
  '20% referral fee still applies on closed platform-generated deals',
];

const benefits = [
  { icon: Home, title: 'Estate-Sale Seller Opportunities', desc: 'Access to families making real estate decisions alongside personal property decisions.' },
  { icon: Users, title: 'Referral Relationships With Operators', desc: 'Build trusted relationships with estate sale companies already inside these homes.' },
  { icon: MapPin, title: 'Territory-Based Positioning', desc: "You're the preferred or exclusive agent in the cities you choose to protect." },
  { icon: TrendingUp, title: 'Lead Routing From the Platform', desc: 'Opportunities routed directly from EstateSalen.com and Legacy Lane OS partners.' },
  { icon: Star, title: 'Priority Visibility in Selected Markets', desc: 'Be the agent estate sale operators think of first when a real estate need arises.' },
  { icon: Award, title: 'Life-Transition Niche Authority', desc: 'Build a reputation serving probate, downsizing, senior moves, inherited homes, and more.' },
];

const lifeEvents = [
  'Probate', 'Downsizing', 'Senior Moves', 'Inherited Homes',
  'Divorce', 'Relocation', 'Family Cleanouts', 'Business Closings',
];

export default function AgentSignup() {

  const scrollToForm = () => {
    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'20px 20px'}} />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 text-orange-400 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <MapPin className="w-4 h-4" /> EstateSalen.com · Powered by Legacy Lane OS
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            Own the Estate Sale<br />Referral Lane in<br />
            <span className="text-orange-400">Your Market</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-6 leading-relaxed">
            Become the preferred real estate agent for estate-sale-driven seller opportunities in your city, county, or territory.
          </p>
          <p className="text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Estate sales often happen during major life transitions: probate, downsizing, relocation, divorce, senior moves, inherited homes, and family cleanouts. These are moments where real estate decisions are often close behind. EstateSalen.com, powered by Legacy Lane OS, helps connect those opportunities with qualified local agents who are ready to serve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={scrollToForm} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-6 text-lg rounded-xl flex items-center gap-2">
              Apply for Territory Access <ArrowRight className="w-5 h-5" />
            </Button>
            <a href="https://houszu.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-slate-400 text-white bg-slate-700 hover:bg-slate-600 px-8 py-6 text-lg rounded-xl">
                Learn About Houszu for Agents
              </Button>
            </a>
          </div>

          {/* Life event tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-12">
            {lifeEvents.map(e => (
              <span key={e} className="bg-slate-700/60 border border-slate-600 text-slate-300 px-3 py-1 rounded-full text-sm">{e}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY THIS EXISTS ──────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-amber-100 text-amber-800 mb-6 px-4 py-1.5">The Opportunity</Badge>
          <h2 className="text-4xl font-serif font-bold text-slate-900 mb-6">
            Estate Sale Companies Are Often First to the Opportunity
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed mb-8">
            Before a home is listed, before the family calls three agents, and before the property becomes public — an estate sale company may already be inside the home helping the family solve the personal property problem. That creates a powerful opportunity for the right real estate agent.
          </p>
          <div className="bg-white border-l-4 border-orange-500 rounded-xl p-8 text-left shadow-sm mb-6">
            <p className="text-slate-700 text-lg leading-relaxed">
              <strong className="text-slate-900">Legacy Lane OS</strong> gives estate sale companies a way to refer real estate opportunities to trusted agents — while giving agents access to a relationship-driven lead source that most competitors never see. This is not a cold internet lead. This is a warm introduction from a company already inside the home.
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-left shadow-sm mb-6">
            <p className="text-slate-700 text-lg leading-relaxed">
              We spend <strong className="text-slate-900">thousands of dollars per month</strong> generating leads for estate sale companies — because we know they are often the first company in line to resolve the clutter and organization side of a home that will inevitably be listed on the market. Becoming an agent partner or territory owner gives you exclusive access to one of the most valuable referral pipelines in residential real estate.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-left shadow-sm">
            <p className="text-slate-700 text-lg leading-relaxed mb-4">
              All referrals flow through a real estate brokerage as per normal. The estate sale company also receives a portion in <strong className="text-slate-900">marketing credits</strong> to be applied toward future leads and services on EstateSalen.com.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Because of this, there is a strong mutual incentive for the estate sale company to remain loyal to their agent partner — creating a self-reinforcing relationship that benefits everyone involved.
            </p>
          </div>
        </div>
      </section>

      {/* ── PARTICIPATION CARDS ──────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="bg-slate-100 text-slate-700 mb-4 px-4 py-1.5">Two Ways to Participate</Badge>
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">How Agents Participate</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Choose the model that fits your market ambitions — whether you want to test a market or own it.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Preferred Agent */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1">Preferred Agent</Badge>
                  <Star className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">City-Level Access</h3>
                <p className="text-slate-500 text-sm mb-6">Best for agents who want estate-sale-driven referral opportunities without a full territory buy-in.</p>
                <ul className="space-y-3 mb-8">
                  {preferredFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={scrollToForm} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
                  Apply as Preferred Agent
                </Button>
              </CardContent>
            </Card>

            {/* Exclusive Territory */}
            <Card className="border-2 border-orange-400 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-orange-500 text-white px-4 py-1 shadow">Territory Ownership</Badge>
              </div>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-orange-100 text-orange-800 px-3 py-1">Exclusive Territory Owner</Badge>
                  <Lock className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Own Your Territory</h3>
                <p className="text-slate-500 text-sm mb-6">Best for agents who want priority or exclusive access in selected cities or regions.</p>
                <ul className="space-y-3 mb-6">
                  {exclusiveFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Guarantee banner */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex gap-3 items-start mb-6">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-emerald-800 text-sm font-bold">Territory Owner Guarantee</p>
                    <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                      Earn at least <span className="font-bold">5× your annual investment</span> in GCI from platform leads — or your next year's fees are <span className="font-bold">free</span>.
                    </p>
                  </div>
                </div>

                <Button onClick={scrollToForm} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3">
                  Check Territory Availability
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── TERRITORY CALCULATOR ─────────────────────────────────────── */}
      <TerritoryCalculator />

      {/* ── WHAT AGENTS RECEIVE ──────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="bg-green-100 text-green-800 mb-4 px-4 py-1.5">Agent Benefits</Badge>
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              What You Get as a Legacy Lane Preferred Agent
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-xl border border-slate-100 bg-slate-50 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">{b.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY THIS IS DIFFERENT ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-slate-700 text-slate-200 mb-6 px-4 py-1.5">Our Positioning</Badge>
          <h2 className="text-4xl font-serif font-bold text-white mb-6">
            This Is Not Another Internet Lead Program
          </h2>
          <p className="text-xl text-slate-300 leading-relaxed mb-8">
            Most lead platforms sell the same inquiry to multiple agents. Legacy Lane OS is different. We are building a relationship-based referral network around estate sale companies, life-event sellers, and local real estate professionals.
          </p>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-left">
            <p className="text-slate-200 text-lg leading-relaxed">
              The goal is not random leads. The goal is <strong className="text-orange-400">trusted local positioning before the home hits the open market</strong>. When an estate sale company trusts you, they introduce you to families at exactly the right moment — before the competition even knows the opportunity exists.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { label: 'Same Lead Sold to Everyone', bad: true },
              { label: 'Cold Internet Inquiry', bad: true },
              { label: 'Generic Agent Directory', bad: true },
            ].concat([
              { label: 'Relationship-Based Referrals', bad: false },
              { label: 'Warm Introduction From Operators', bad: false },
              { label: 'Territory-Protected Positioning', bad: false },
            ]).map((item, i) => (
              <div key={i} className={`rounded-xl p-4 border ${item.bad ? 'bg-red-900/20 border-red-800/40' : 'bg-green-900/20 border-green-700/40'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${item.bad ? 'text-red-400' : 'text-green-400'}`}>{item.bad ? '✕' : '✓'}</span>
                  <span className={`text-sm font-medium ${item.bad ? 'text-red-300 line-through' : 'text-green-300'}`}>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERFORMANCE EXPECTATIONS ─────────────────────────────────── */}
      <section className="py-20 px-4 bg-amber-50 border-y border-amber-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
                Territory Access Comes With Responsibility
              </h2>
              <p className="text-slate-700 text-lg leading-relaxed mb-4">
                Agents receiving preferred or exclusive access must respond quickly, protect the relationship with the estate sale company, provide professional service, and follow all brokerage and legal requirements.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Exclusive territories may be reviewed for performance, responsiveness, conversion activity, and relationship quality. Territory access is a privilege — not a guarantee. Our goal is to connect families in transition with agents who will genuinely serve them well.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOUSZU CROSS-SELL ────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-900 to-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-6 px-4 py-1.5">Agent Growth Platform</Badge>
              <h2 className="text-4xl font-serif font-bold text-white mb-4">
                Want the Full Agent Growth System?
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                <strong className="text-white">Houszu</strong> is the real estate agent growth platform built to help agents convert more opportunities, build marketing funnels, create AI-powered listing assets, manage campaigns, and grow their local authority.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                If Legacy Lane OS helps you access estate-sale-driven opportunities, Houszu helps you convert, market, and scale them.
              </p>
              <a href="https://houszu.com" target="_blank" rel="noopener noreferrer">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 text-lg rounded-xl flex items-center gap-2">
                  Explore Houszu for Agents <ChevronRight className="w-5 h-5" />
                </Button>
              </a>
            </div>
            <div className="space-y-4">
              {[
                { icon: Zap, title: 'AI-Powered Listing Assets', desc: 'Generate marketing content, images, and campaigns automatically.' },
                { icon: TrendingUp, title: 'Marketing Funnels & Campaigns', desc: 'Build and manage full lead conversion funnels for your market.' },
                { icon: Building2, title: 'Local Authority Building', desc: 'Establish your reputation as the go-to agent in your niche.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA + FORM ─────────────────────────────────────────── */}
      <section id="apply-form" className="py-20 px-4 bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-6 px-4 py-1.5">
              Limited Territory Availability
            </Badge>
            <h2 className="text-4xl font-serif font-bold text-white mb-4">
              Apply Before Your Territory Is Claimed
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Preferred and exclusive territory opportunities are limited by city and market. If you want to become the go-to real estate agent for estate-sale-related opportunities in your area, apply now and request the cities you want to protect.
            </p>
          </div>
          <AgentApplicationForm />
        </div>
      </section>

      {/* ── LEGAL DISCLAIMER ─────────────────────────────────────────── */}
      <section className="py-10 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-500 text-xs leading-relaxed">
              <strong className="text-slate-400">Legal & Compliance Notice:</strong> EstateSalen.com and Legacy Lane OS are not acting as real estate brokers and do not directly receive real estate commissions. Referral compensation must be handled through the agent's brokerage and in compliance with all applicable state real estate laws, brokerage policies, referral agreements, and RESPA-related requirements. Final referral agreement language will be provided separately by legal counsel. This page is for informational and application purposes only and does not constitute a binding agreement.
            </p>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}