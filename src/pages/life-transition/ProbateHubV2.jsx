import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Scale, Home, Users, FileText } from 'lucide-react';

export default function ProbateHubV2() {
  return (
    <SEHubLayout
      badge="Free Educational Guide"
      title="Probate Guide for All 50 States"
      subtitle="Step-by-step help for families settling an estate"
      intro="When a loved one passes, the legal process of settling their estate can feel overwhelming. Our free educational guides explain the probate process in plain language, state by state, so families know what to expect."
      lifeEventType="probate"
      stateRouteSlug="probate"
      pageUrl="/probate"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Probate Guide' }]}
      features={[
        { icon: Scale, color: 'bg-purple-100 text-purple-700', title: 'State Probate Guides', desc: 'Court names, small estate processes, and general steps for all 50 states' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Estate Sale Help', desc: 'Connect with licensed estate sale companies experienced in probate' },
        { icon: Users, color: 'bg-green-100 text-green-700', title: 'Realtor Referrals', desc: 'Find probate-friendly agents who know how to sell inherited homes' },
        { icon: FileText, color: 'bg-blue-100 text-blue-700', title: 'Free Checklist', desc: 'Download our 18-step estate settlement checklist' },
      ]}
      steps={[
        { title: 'Obtain death certificates', desc: 'Get multiple certified copies — typically 8–12. Required by courts, banks, insurers, and title companies.' },
        { title: 'Locate the will and key documents', desc: 'Find the original will, trusts, property deeds, vehicle titles, and account statements.' },
        { title: 'Determine if probate is required', desc: 'Not all assets go through probate. Jointly held assets, trusts, and beneficiary-designated accounts may transfer outside probate.' },
        { title: 'File with the probate court', desc: 'File in the county where the deceased resided. Forms, fees, and timelines vary by state.' },
        { title: 'Get appointed as executor/administrator', desc: 'The court issues Letters Testamentary or Letters of Administration, giving you legal authority to act.' },
        { title: 'Inventory assets and debts', desc: 'Create a complete inventory. Some states require a formal inventory filed with the court.' },
        { title: 'Handle personal property', desc: 'Decide what to keep, sell, donate, or discard. An estate sale company can help liquidate contents.' },
        { title: 'Sell real estate if needed', desc: 'List with a probate-friendly realtor, accept a cash offer, or go through auction. Court approval may be required.' },
        { title: 'Pay debts and distribute assets', desc: 'Pay all valid debts, file final taxes, then distribute remaining assets to heirs per the will or intestate law.' },
      ]}
      faqs={[
        { q: 'Does every estate have to go through probate?', a: 'No. Assets held jointly, in trusts, or with named beneficiaries often transfer outside probate. Confirm with a licensed attorney.' },
        { q: 'How long does probate take?', a: 'It varies widely by state and estate complexity — from a few months to over a year. Confirm with your local probate court or attorney.' },
        { q: 'Can I sell the house before probate is finished?', a: 'Generally, the executor must have authority from the court before selling estate property. Confirm with your local probate court or a licensed attorney.' },
        { q: 'When do I need an estate sale company?', a: 'When there is significant personal property to liquidate — furniture, collectibles, tools, household contents — an estate sale company can organize and run the sale, maximizing returns.' },
        { q: 'Do I need a probate attorney?', a: 'For complex estates, real estate, or disputes among heirs, an attorney is strongly recommended. For simple estates, some families handle probate themselves, but always confirm your state\'s requirements.' },
      ]}
      relatedLinks={[
        { label: 'Inherited Property Guide', href: '/inherited-property' },
        { label: 'Executor Guide', href: '/executor-guide' },
        { label: 'Estate Sale Checklist', href: '/estate-checklist' },
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Find Probate Realtors', href: '/probate-realtors' },
        { label: 'Pre-Probate Planning', href: '/pre-probate' },
      ]}
      ctaTitle="Get Free Help Settling an Estate"
      ctaDesc="Tell us about your situation and we'll connect you with estate sale companies, realtors, cleanout vendors, and other trusted professionals near you."
    />
  );
}