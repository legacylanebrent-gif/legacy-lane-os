import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';

const CheckItem = ({ children }) => (
  <li className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

const XItem = ({ children }) => (
  <li className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
    <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

const Section = ({ title, children, dark }) => (
  <div className={`py-16 px-6 ${dark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
    <div className="max-w-3xl mx-auto">
      {title && (
        <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tight mb-10 text-center ${dark ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h2>
      )}
      {children}
    </div>
  </div>
);

const CheckGrid = ({ items }) => (
  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {items.map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
  </ul>
);

const PricingTier = ({ tier, launch, monthly, note, featured }) => (
  <div className={`rounded-2xl p-6 border-2 ${featured ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}>
    {featured && <div className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">⭐ Best Value</div>}
    <div className="text-lg font-black text-slate-800 mb-1">{tier}</div>
    <div className="text-3xl font-black text-slate-900">${launch.toLocaleString()}</div>
    <div className="text-sm text-slate-500 mb-1">Launch Investment</div>
    <div className="text-xl font-bold text-slate-700">${monthly}/mo</div>
    {note && <div className="text-xs text-amber-600 font-semibold mt-1">{note}</div>}
  </div>
);

const TimelineDay = ({ day, items }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-sm shrink-0">{day}</div>
      <div className="w-0.5 bg-amber-200 flex-1 mt-1" />
    </div>
    <div className="pb-8 flex-1">
      <ul className="space-y-1 mt-1">
        {items.map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
      </ul>
    </div>
  </div>
);

export default function LandingPageBizInABox() {
  const [applyOpen, setApplyOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans bg-slate-50">

      {/* HERO */}
      <div className="bg-slate-900 text-white px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-amber-400 font-black uppercase tracking-widest text-xs mb-4">Legacy Lane Estate Co.</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase leading-tight tracking-tight mb-6">
            Own A Legacy Lane Estate Co. Division
          </h1>
          <p className="text-xl md:text-2xl font-bold text-amber-300 mb-4">
            Launch Your Own Estate Sale Company In As Little As 7 Days
          </p>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed">
            Backed By A National Brand, AI Technology, Marketing Systems, Coaching, Training, EstateSalen.com Exposure, And No Royalty Fees.
          </p>
          <button
            onClick={() => setApplyOpen(true)}
            className="mt-10 px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-full text-lg uppercase tracking-widest transition-colors"
          >
            Apply Now →
          </button>
        </div>
      </div>

      {/* INTRO */}
      <Section>
        <div className="prose prose-slate max-w-none text-center space-y-4 text-slate-700 text-base leading-relaxed">
          <p>Most estate sale business owners spend years building what we've already built.</p>
          <p>They create a brand. Build a website. Develop systems. Create marketing. Learn the industry. Build referral relationships.</p>
          <p>And spend thousands of dollars making mistakes along the way.</p>
          <p className="font-bold text-slate-900 text-lg">Legacy Lane Estate Co. was created to eliminate that process.</p>
          <p>We've spent years building the technology, systems, training, marketing assets, AI tools, referral opportunities, and operational infrastructure required to run a modern estate sale company.</p>
          <p className="font-bold text-slate-900 text-lg">Now you can leverage everything we've built and launch your own Legacy Lane Estate Co. division in your market.</p>
        </div>
      </Section>

      {/* NOT A FRANCHISE */}
      <div className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">This Is Not A Franchise</h2>
          <p className="text-slate-400 mb-8">Unlike traditional franchise opportunities:</p>
          <ul className="space-y-3 text-left inline-block mb-8">
            {[
              'No Royalty Fees', 'No Percentage Of Your Sales', 'No Percentage Of Your Revenue',
              'No National Advertising Fees', 'No Hidden Assessments', 'No Long-Term Franchise Contracts'
            ].map((item, i) => <XItem key={i}>{item}</XItem>)}
          </ul>
          <div className="mt-6 border-t border-slate-700 pt-6 text-slate-300 space-y-2">
            <p className="font-bold text-white text-lg">You own your business.</p>
            <p className="font-bold text-white text-lg">You keep what you earn.</p>
            <p>We provide the systems, technology, branding, coaching, marketing, and support to help you grow.</p>
          </div>
        </div>
      </div>

      {/* COST TO BUILD YOURSELF */}
      <Section title="What Would It Cost To Build This Yourself?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {[
            ['Professional Website', '$2,500 – $10,000'],
            ['Brand Development', '$1,000 – $5,000'],
            ['Marketing Materials', '$1,500 – $5,000'],
            ['Business Systems', '$2,500 – $10,000'],
            ['CRM & Marketing Software', '$200–$500/mo'],
            ['Inventory Management Tools', '$2,000 – $10,000'],
            ['POS System', '$1,000 – $5,000'],
            ['AI Marketing Tools', '$100–$500/mo'],
            ['Coaching & Consulting', '$5,000 – $20,000'],
            ['Training & Industry Education', '$2,000 – $10,000'],
          ].map(([label, cost], i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-700">{label}</span>
              <span className="text-sm font-bold text-red-600">{cost}</span>
            </div>
          ))}
        </div>
        <div className="bg-slate-900 text-white rounded-2xl p-6 text-center">
          <div className="text-slate-400 text-sm mb-1">Total Estimated Investment</div>
          <div className="text-4xl font-black text-amber-400">$18,000 – $70,000+</div>
          <div className="text-slate-400 text-sm mt-2">And that's before finding your first client.</div>
        </div>
      </Section>

      {/* DELIVERED IN 14 DAYS */}
      <div className="bg-amber-50 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3 text-center text-slate-900">Your Business Is Delivered In 14 Days Or Less</h2>
          <p className="text-center text-slate-600 mb-10">We Don't Just Give You Software. We Launch Your Business.</p>
          <CheckGrid items={[
            'Professional Website', 'Lead Capture Forms', 'Contact Forms', 'Service Pages', 'SEO Foundation',
            'Mobile Optimization', 'Hosting Included', 'Business Card Designs', 'Flyer Templates', 'Yard Sign Templates',
            'Event Banner Designs', 'Social Media Branding Package', 'Marketing Templates', 'Sales Presentation Materials',
            'Client Intake Forms', 'Contracts & Agreements', 'Legacy Lane OS Access', 'AI Marketing Suite Access',
            'Coaching Program Access', 'Training Portal Access', 'EstateSalen.com Profile', 'Founding Market Partner Badge',
            'Launch Roadmap', 'First Sale Fast Start Program'
          ]} />
        </div>
      </div>

      {/* TIMELINE */}
      <Section title="Launch In As Little As 7 Days">
        <div>
          <TimelineDay day="1" items={['Complete Onboarding', 'Meet Your Launch Coach', 'Business Setup Begins']} />
          <TimelineDay day="2–5" items={['Software Activated', 'Training Access Delivered', 'Branding Development', 'Website Setup', 'Marketing Assets Prepared']} />
          <TimelineDay day="6–7" items={['Begin Prospecting', 'Begin Marketing', 'Referral Outreach Begins', 'Community Awareness Campaigns Begin']} />
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-sm shrink-0">14</div>
            <ul className="space-y-1 mt-1">
              {['Complete Business Package Delivered', 'Website Live', 'Branding Delivered', 'Marketing Assets Delivered', 'Business Fully Operational'].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
            </ul>
          </div>
        </div>
      </Section>

      {/* WHAT'S INCLUDED — sections */}
      {[
        {
          title: 'Legacy Lane OS Elite Included',
          subtitle: 'Operate like a much larger company from day one — backed by 10 autonomous SuperAgents.',
          items: ['Sale Management', 'Inventory Management', 'Google Lens™ AI Item Research', 'AI Pricing Assistance', 'AI Descriptions', 'Smart QR Code System with Dynamic Pricing', 'VIP Presales', 'Customer Database', 'Marketing Automation', 'Team Management', 'POS Checkout System', 'Reporting & Analytics', 'ISO Wanted Items™ Buyer Matching', 'Reseller Event Management', 'Buyout Event Management', 'Referral Tracking', 'Lead Management', 'Customer Follow-Up Systems', '10-Agent SuperAgent Autonomous System']
        },
        {
          title: 'Your AI Marketing Department',
          subtitle: '10 SuperAgents work autonomously 24/7 — drafting campaigns, generating ads, and managing outreach while you sleep.',
          items: ['Meta (Facebook/Instagram) Ad Campaigns', 'AI Ad Copy & Creative Generation', 'Social Media Campaigns across all platforms', 'Email Campaigns (drafted & scheduled)', 'Text/SMS Campaigns', 'Featured Item Promotions', 'Sale Countdown Campaigns', 'VIP Event Promotions', 'Reseller Event Promotions', 'Cleanout Campaigns', 'Real Estate Referral Campaigns', 'Autonomous marketing pipeline from draft to publish']
        },
        {
          title: 'Free Coaching Included',
          subtitle: 'Most operators learn through expensive mistakes. Founding Market Partners receive ongoing coaching.',
          items: ['Business Launch Coaching', 'Marketing Coaching', 'Sales Coaching', 'Growth Coaching', 'Pricing Guidance', 'Team Building Guidance', 'Monthly Group Coaching', 'Quarterly Strategy Sessions', 'Private Community Access', 'Best Practices Library']
        },
        {
          title: 'First Sale Fast Start Program',
          subtitle: 'Our goal is to help you secure your first client as quickly as possible.',
          items: ['Startup Coaching', 'Marketing Playbooks', 'Referral Partner Outreach Scripts', 'Agent Partnership Scripts', 'Email Templates', 'Social Media Campaigns', 'Community Marketing Strategies', 'Weekly Launch Support', 'Business Development Resources']
        },
        {
          title: 'EstateSalen.com Exposure',
          subtitle: 'Every Founding Market Partner receives enhanced visibility within the EstateSalen ecosystem — including our consumer mobile app.',
          items: ['Premium Directory Placement', 'Founding Partner Badge', 'Enhanced Consumer Visibility', 'Featured Profile Opportunities', 'Referral Opportunities', 'Future Lead Distribution Programs', 'Priority Consideration For New Programs', 'Early Access To New Features', 'Featured in ISO Wanted Items matching results', 'Listed in consumer mobile app']
        },
        {
          title: 'Multiple Revenue Streams',
          subtitle: 'Legacy Lane partners can pursue multiple opportunities.',
          items: ['Estate Sales', 'Moving Sales', 'Downsizing Sales', 'Liquidation Sales', 'Buyout Opportunities', 'Reseller Events', 'Cleanout Referrals', 'Senior Transition Referrals', 'Vendor Referral Programs', 'Real Estate Referral Opportunities', 'Probate Opportunities', 'Estate Settlement Opportunities']
        },
      ].map((sec, i) => (
        <div key={i} className={`py-16 px-6 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2 text-slate-900">{sec.title}</h2>
            <p className="text-slate-500 mb-8 text-sm">{sec.subtitle}</p>
            <CheckGrid items={sec.items} />
          </div>
        </div>
      ))}

      {/* PRICING */}
      <div className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3 text-center">Founding Member Pricing</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Pricing increases every 25 members. Lock in the lowest rate now.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <PricingTier tier="Members 1–25" launch={2997} monthly={221} note="20% Off Elite For Life" featured />
            <PricingTier tier="Members 26–50" launch={4997} monthly={235} />
            <PricingTier tier="Members 51–75" launch={6997} monthly={249} />
            <PricingTier tier="Members 76–100" launch={8997} monthly={263} />
            <PricingTier tier="Future Public Pricing" launch={12997} monthly={277} />
          </div>

          <div className="border-t border-slate-700 pt-8 text-center">
            <h3 className="font-black text-lg mb-6 text-amber-400">Easy Payment Option — No Credit Check Required</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-600">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Option A</div>
                <div className="text-3xl font-black text-white">$2,997</div>
                <div className="text-slate-400 text-sm mt-1">Paid In Full</div>
              </div>
              <div className="bg-amber-600 rounded-2xl p-6">
                <div className="text-xs font-black text-amber-200 uppercase tracking-widest mb-2">Option B</div>
                <div className="text-3xl font-black text-white">$497 Down</div>
                <div className="text-sm mt-1 text-amber-100">+ 5 Monthly Payments Of $500</div>
                <div className="text-xs text-amber-200 mt-1">Launch immediately while completing your payment plan.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NO ROYALTIES */}
      <div className="bg-amber-500 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black uppercase text-slate-900 mb-4">No Royalties. Ever.</h2>
          <p className="text-slate-800 text-lg font-medium mb-2">Read that again.</p>
          <p className="text-slate-800">No royalties. No revenue sharing. No percentage of your sales. No percentage of your commissions. No national advertising fees. No hidden assessments.</p>
          <p className="text-2xl font-black text-slate-900 mt-6">You own your business. You keep what you earn.</p>
        </div>
      </div>

      {/* WHO THIS IS FOR */}
      <Section title="Who This Is For">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['Estate Sale Professionals', 'Real Estate Agents', 'Entrepreneurs', 'Senior Move Managers', 'Cleanout Companies', 'Resellers', 'Auction Professionals', 'Service Business Owners', 'Investors Seeking A Scalable Service Business'].map((item, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 text-center">
              {item}
            </div>
          ))}
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">No previous estate sale experience is required. The systems, technology, marketing, coaching, training, and support are already built.</p>
      </Section>

      {/* CTA */}
      <div className="bg-slate-900 text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">Build Faster. Launch Smarter. Grow With Confidence.</h2>
          <p className="text-slate-400 mb-8">Become a Founding Market Partner and launch your own Legacy Lane Estate Co. division backed by one of the most advanced estate sale business platforms being built today.</p>
          <div className="space-y-3 text-left inline-block mb-8">
            {['Schedule A Discovery Call', 'Review Your Market', 'Explore The Opportunity', 'Launch Your Legacy Lane Estate Co. Division', 'Your Business Delivered In 14 Days Or Less.'].map((item, i) => <CheckItem key={i}>{item}</CheckItem>)}
          </div>
          <div>
            <button
              onClick={() => setApplyOpen(true)}
              className="px-12 py-5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-full text-xl uppercase tracking-widest transition-colors"
            >
              Apply Now →
            </button>
          </div>
        </div>
      </div>

      {/* APPLY MODAL */}
      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase">Apply Now</h3>
              <button onClick={() => setApplyOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ApplyForm onClose={() => setApplyOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ApplyForm({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', market: '', background: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-amber-600" />
        </div>
        <h4 className="text-xl font-black text-slate-900 mb-2">Application Received!</h4>
        <p className="text-slate-500 text-sm mb-6">We'll be in touch within 24–48 hours to schedule your discovery call.</p>
        <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold text-sm">Close</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
        { key: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
        { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '(555) 555-5555' },
        { key: 'market', label: 'Your Market / City', type: 'text', placeholder: 'City, State' },
      ].map(({ key, label, type, placeholder }) => (
        <div key={key}>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{label}</label>
          <input
            type={type}
            required
            placeholder={placeholder}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Background / Experience</label>
        <textarea
          placeholder="Tell us a little about yourself..."
          rows={3}
          value={form.background}
          onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-full uppercase tracking-widest text-sm transition-colors">
        Submit Application →
      </button>
    </form>
  );
}