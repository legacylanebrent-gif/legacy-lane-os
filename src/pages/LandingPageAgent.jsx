import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Users, TrendingUp, Target, Shield, BarChart3, Search, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const OPPORTUNITIES = [
  { icon: Home, title: 'Probate & Inherited Properties', desc: 'Families settling estates need both a sale company AND a realtor. Be the agent they trust when the home needs to sell.' },
  { icon: Users, title: 'Senior Downsizing', desc: 'Seniors transitioning to smaller homes or assisted living need to sell the house AND the contents. You handle the house, we handle the contents.' },
  { icon: TrendingUp, title: 'Divorce Property Sales', desc: 'Divorce situations often require quick property liquidation. Being the agent with a trusted estate sale partner sets you apart.' },
  { icon: Target, title: 'Foreclosure & Distressed', desc: 'Properties facing foreclosure or in distress need fast action. Our operator network can clear the home while you handle the sale.' },
];

const PLATFORM_FEATURES = [
  { icon: Search, title: 'PropStream MLS Integration', desc: 'We ingest MLS listing data daily and identify properties that signal estate sale opportunities. Properties are scored and prioritized for outreach.' },
  { icon: Mail, title: 'AI-Generated Outreach', desc: 'Our SuperAgent system drafts personalized outreach emails for listing agents. You review, approve, and send — or let automation handle it.' },
  { icon: Shield, title: 'Structured Referral Agreements', desc: 'Every referral is tracked with a formal agreement. Commission splits, terms, and payouts are documented and automated.' },
  { icon: BarChart3, title: 'Referral Deal Pipeline', desc: 'Track every referred deal from initial introduction through closing. Know exactly where each opportunity stands and what\'s coming next.' },
  { icon: TrendingUp, title: 'Territory-Based Matching', desc: 'Operators are matched to your territory based on geography, certification, performance, and availability. You get the right partner for every property.' },
  { icon: Users, title: 'Dedicated Agent Dashboard', desc: 'Your personal command center for managing partnerships, tracking referrals, monitoring deal pipelines, and growing your referral revenue.' },
];

const BENEFITS = [
  'No cost to join the referral network',
  'Exclusive territory partnerships available',
  'Structured commission agreements (typically 25-35% of buyer agent commission)',
  'Automated documentation and tracking',
  'Access to estate sale companies across all 50 states',
  'AI-powered property opportunity identification',
  'Direct messaging with operator partners',
  'Real-time deal pipeline tracking',
];

export default function LandingPageAgent() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-orange-400 font-serif font-bold text-2xl tracking-tight">Estate<span className="text-white">Salen</span></span>
        </Link>
        <Link to="/AgentOperatorPortal">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Join the Network
          </Button>
        </Link>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-sm font-semibold px-4 py-1.5 rounded-full">
            For Real Estate Agents
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            Turn Every Estate Situation Into a Listing Opportunity
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Probates, downsizing, divorce, foreclosure — these life transitions create both estate sale AND real estate needs. Partner with our nationwide network of estate sale operators and capture the listing while they handle the contents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/AgentOperatorPortal">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-cyan-500/30">
                <Users className="w-5 h-5 mr-2" /> Join the Referral Network
              </Button>
            </Link>
            <Link to="/JoinReferralExchange">
              <Button variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl">
                Learn About the Exchange
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The Opportunity */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center">Opportunities Hiding in Every Life Transition</h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto">
            Most real estate agents miss the estate sale opportunity. When a family needs to sell the contents of a home, they also need to sell the home itself — and they need a realtor they can trust.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {OPPORTUNITIES.map((opp) => {
              const Icon = opp.icon;
              return (
                <div key={opp.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
                  <Icon className="w-7 h-7 text-cyan-600" />
                  <h3 className="font-bold text-slate-900 text-lg">{opp.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{opp.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center">How the Referral Exchange Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Join the Network', desc: 'Create your agent profile, set your territory preferences, and get matched with estate sale operators in your area.' },
              { step: '2', title: 'Receive Opportunities', desc: 'Our PropStream integration identifies estate-sale-eligible properties. Our SuperAgents draft outreach. You review and connect.' },
              { step: '3', title: 'Close & Earn', desc: 'When a referred client closes, your commission split is automatically calculated and tracked through our deal pipeline.' },
            ].map((item) => (
              <div key={item.step} className="bg-white border border-cyan-200 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xl mx-auto">{item.step}</div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center">Your Agent Toolkit</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-cyan-300 transition-colors">
                  <Icon className="w-7 h-7 text-cyan-600" />
                  <h3 className="font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-center">What Agents Get</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {BENEFITS.map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-5 py-4 text-sm text-slate-200">
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-cyan-600 to-cyan-800 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-serif font-bold">Build a Second Revenue Stream from Life Transitions</h2>
          <p className="text-cyan-100 text-xl max-w-xl mx-auto">
            Every probate, downsizing, and divorce situation is a listing waiting to happen. Partner with EstateSalen and capture the opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <Link to="/AgentOperatorPortal">
              <Button className="bg-white hover:bg-cyan-50 text-cyan-700 text-xl font-bold px-12 py-7 rounded-xl shadow-xl">
                Join the Referral Network
              </Button>
            </Link>
            <Link to="/JoinReferralExchange">
              <Button variant="outline" className="border-cyan-300 text-white hover:bg-cyan-500 text-lg font-semibold px-10 py-6 rounded-xl">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}