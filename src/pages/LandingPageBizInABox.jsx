import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import SharedFooter from '@/components/layout/SharedFooter';
import PathCard from '@/components/bizinabox/PathCard';
import OwnershipCompare from '@/components/bizinabox/OwnershipCompare';
import IncludedParts from '@/components/bizinabox/IncludedParts';
import ProgramFaqs from '@/components/bizinabox/ProgramFaqs';
import InquiryForm from '@/components/bizinabox/InquiryForm';
import ApplyModal from '@/components/bizinabox/ApplyModal';
import { OPERATOR_PATHS, OPERATOR_DUTIES, WHO_THRIVES, NOT_THIS_PROGRAM } from '@/components/bizinabox/content';

const Section = ({ title, subtitle, children, dark }) => (
  <div className={`py-16 px-6 ${dark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
    <div className="max-w-4xl mx-auto">
      {title && (
        <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tight mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h2>
      )}
      {subtitle && <p className={`mb-8 text-sm leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
      {children}
    </div>
  </div>
);

const CheckList = ({ items, dark }) => (
  <ul className="space-y-3">
    {items.map((item, i) => (
      <li key={i} className={`flex items-start gap-3 text-sm md:text-base leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        <Check className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export default function LandingPageBizInABox() {
  const [applyKey, setApplyKey] = useState(null);
  const activePath = OPERATOR_PATHS.find((p) => p.key === applyKey);

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      {/* HERO */}
      <div className="bg-slate-900 text-white px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-amber-400 font-black uppercase tracking-widest text-xs mb-4">The opportunity</p>
          <h1 className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tight mb-6">
            Own an estate transition business in your community.
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
            Families everywhere need help managing belongings, moves, and homes during life's biggest transitions.
            Legacy Lane Local gives an organized, service-minded operator the systems to serve them — on one of two
            partner paths.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setApplyKey('full_buy_in')}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-full text-sm uppercase tracking-widest transition-colors"
            >
              Apply as an Operator
            </button>
            <button
              onClick={() => setApplyKey('joint_build')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-full text-sm uppercase tracking-widest transition-colors"
            >
              Apply as a Joint Build Partner
            </button>
          </div>
        </div>
      </div>

      {/* WHAT YOU'LL DO */}
      <Section title="What you'll do as an operator">
        <CheckList items={OPERATOR_DUTIES} />
      </Section>

      {/* WHO THRIVES */}
      <div className="bg-slate-50 border-y border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-8 text-slate-900">Who thrives in this work</h2>
          <CheckList items={WHO_THRIVES} />
        </div>
      </div>

      {/* TWO PATHS */}
      <Section
        title="Two ways to get started"
        subtitle="Both paths receive the complete Legacy Lane Local operator package and the same $197 monthly operator subscription. What differs is how you pay the $4,997: in full upfront with no profit share, or $497 a month with 25% of profit shared until it is fully paid."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {OPERATOR_PATHS.map((path) => (
            <PathCard key={path.key} path={path} onApply={setApplyKey} />
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-2">
            The 25% profit share, plainly
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            <span className="font-bold">Pay the $4,997 in full:</span> no profit share at all. Your only ongoing cost is
            the $197 monthly subscription.
          </p>
          <p className="text-sm text-slate-700 leading-relaxed mt-2">
            <span className="font-bold">Pay $497 a month:</span> the $4,997 is paid down in installments, the $197
            monthly subscription is billed alongside each payment, and Legacy Lane receives 25% of total profit until
            the full $4,997 is paid — on top of both. Paying the monthly amounts does not reduce the profit share.
          </p>
        </div>
      </Section>

      {/* COMPARE */}
      <div className="bg-white border-y border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-8 text-slate-900">Compare</h2>
          <OwnershipCompare />
          <div className="mt-8 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              How total profit is defined, reported, and paid is confirmed in your agreement. The $197 monthly
              operator subscription applies on both paths — $147 for EstateSalen Elite plus $50 for website hosting
              and operator support — and continues for as long as you operate your business.
            </p>
            <p className="font-semibold text-slate-800">
              Applying records your interest. It does not start billing, activate an operator, or start the
              build-phase clock.
            </p>
          </div>
        </div>
      </div>

      {/* WHAT'S INCLUDED */}
      <Section
        title="What's included"
        subtitle="Both partner paths receive the same seven-part operator package — the platform, the playbooks, the training, the brand toolkit, the licensing pathway, the support desk, and the operator community."
      >
        <IncludedParts />
        <p className="text-sm text-slate-500 mt-6">Both paths receive the complete package. Exact deliverables are confirmed in your agreement.</p>
      </Section>

      {/* LICENSING */}
      <div className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-6">The real estate licensing requirement</h2>
          <p className="text-slate-300 text-base leading-relaxed">
            Every Legacy Lane operator must either hold a current active real estate license or enroll in an approved
            real estate school within six calendar months of contractual activation. Enrolling keeps your transition
            pathway open — but it does not authorize licensed real estate activity. Until you hold an active license,
            licensed work is performed only by licensed professionals.
          </p>
        </div>
      </div>

      {/* WHAT THIS IS NOT */}
      <Section title="What this program is not">
        <ul className="space-y-3">
          {NOT_THIS_PROGRAM.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm md:text-base leading-relaxed text-slate-700">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-1" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600 leading-relaxed mt-6">
          You own and operate your business. Legacy Lane supplies the operating platform, playbooks, training, and
          support, and on the Joint Build path receives a share of total profit until the buyout is completed.
        </p>
      </Section>

      {/* FAQ */}
      <div className="bg-slate-50 border-y border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-8 text-slate-900">Common questions</h2>
          <ProgramFaqs />
        </div>
      </div>

      {/* DISCOVERY CALL */}
      <Section
        title="Not ready to apply? Schedule a discovery call."
        subtitle="A short, no-obligation conversation about the opportunity, the investment, and your market."
      >
        <div className="max-w-xl">
          <InquiryForm mode="call" />
        </div>
      </Section>

      {/* FINAL CTA */}
      <div className="bg-slate-900 text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">Sound like you?</h2>
          <p className="text-slate-400 mb-8">
            Start with the application — a short conversation follows, and every commitment is written down before you
            decide.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setApplyKey('full_buy_in')}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-full text-sm uppercase tracking-widest transition-colors"
            >
              Apply as an Operator
            </button>
            <button
              onClick={() => setApplyKey('joint_build')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-full text-sm uppercase tracking-widest transition-colors"
            >
              Apply as a Joint Build Partner
            </button>
          </div>
        </div>
      </div>

      {activePath && <ApplyModal path={activePath} onClose={() => setApplyKey(null)} />}

      <SharedFooter />
    </div>
  );
}