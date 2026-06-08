import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Scale, Home, Package, DollarSign } from 'lucide-react';

export default function DivorcePropertyHub() {
  return (
    <SEHubLayout
      badge="Divorce Property Guide"
      title="Divorce Property Sale Guide"
      subtitle="Selling a home and dividing personal property during divorce"
      intro="Selling a jointly owned home or dividing household contents during a divorce requires coordination, documentation, and often time-sensitive decisions. This guide explains the process in general terms."
      lifeEventType="divorce"
      stateRouteSlug="divorce-property-sale"
      pageUrl="/divorce-property-sale"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Divorce Property Sale Guide' }]}
      features={[
        { icon: Scale, color: 'bg-purple-100 text-purple-700', title: 'Legal Process', desc: 'Understanding marital property division — confirm with your attorney' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Selling the Home', desc: 'How to sell a jointly owned home during or after divorce' },
        { icon: Package, color: 'bg-blue-100 text-blue-700', title: 'Personal Property', desc: 'Estate sales, buyouts, and dividing household contents' },
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Tax Considerations', desc: 'Capital gains, basis, and filing status — confirm with a CPA' },
      ]}
      steps={[
        { title: 'Consult your divorce attorney', desc: 'Property decisions made during divorce can have legal consequences. Always confirm with your attorney before selling or removing assets.' },
        { title: 'Get the home appraised', desc: 'An independent appraisal establishes fair market value for equitable division.' },
        { title: 'Agree on the sale approach', desc: 'Both parties typically must agree on whether to sell, how to list, and how to divide proceeds.' },
        { title: 'Divide personal property', desc: 'Create an inventory and agree on who takes what. Contested high-value items may need independent appraisal.' },
        { title: 'Consider an estate sale for remaining contents', desc: 'If neither party wants certain items, an estate sale can liquidate them and split proceeds per your agreement.' },
        { title: 'Close out the property', desc: 'After sale, proceeds are typically divided per the divorce decree or settlement agreement.' },
      ]}
      faqs={[
        { q: 'Can I have an estate sale during a divorce?', a: 'Yes, but both parties typically must agree if assets are marital property. Confirm with your divorce attorney.' },
        { q: 'Who pays for repairs and maintenance while the home is on the market?', a: 'This is typically addressed in the divorce agreement or court order. Confirm with your attorney.' },
      ]}
      relatedLinks={[
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Find Probate Realtors', href: '/probate-realtors' },
        { label: 'Estate Cleanout Guide', href: '/estate-cleanout' },
      ]}
      ctaTitle="Get Help with a Divorce Property Sale"
      ctaDesc="Connect with estate sale companies, realtors, and cleanout vendors who can help."
    />
  );
}