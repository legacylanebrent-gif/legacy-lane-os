import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Home, DollarSign, Users, FileText } from 'lucide-react';

export default function InheritedPropertyHub() {
  return (
    <SEHubLayout
      badge="Inherited Home Guide"
      title="What to Do with an Inherited Property"
      subtitle="Sell, rent, keep, or donate — understanding all your options"
      intro="Inheriting a home comes with important decisions and often a tight timeline. This guide walks you through the practical, legal, and financial considerations when you've inherited real estate."
      lifeEventType="inherited_home"
      stateRouteSlug="inherited-property"
      pageUrl="/inherited-property"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Inherited Property Guide' }]}
      features={[
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Sell the Home', desc: 'Understand your options: realtor, cash offer, or auction' },
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Tax Implications', desc: 'General overview of stepped-up basis and inheritance taxes' },
        { icon: Users, color: 'bg-blue-100 text-blue-700', title: 'Multiple Heirs', desc: 'Coordinating decisions when several people inherit' },
        { icon: FileText, color: 'bg-purple-100 text-purple-700', title: 'Probate Connection', desc: 'When inherited property goes through probate' },
      ]}
      steps={[
        { title: 'Confirm legal ownership', desc: 'You must have legal title or authority (Letters Testamentary) before making any decisions about the property.' },
        { title: 'Get the property appraised', desc: 'A professional appraisal establishes fair market value for tax purposes and sale planning.' },
        { title: 'Assess the property\'s condition', desc: 'Walk through with a contractor to identify repairs needed. This affects your sale strategy.' },
        { title: 'Decide: keep, sell, rent, or donate', desc: 'Each option has different tax, cost, and timeline implications. Consult a CPA and attorney.' },
        { title: 'If selling — choose your method', desc: 'MLS listing with a realtor, off-market cash offer, or probate auction are the most common options.' },
        { title: 'Handle personal property first', desc: 'Schedule an estate sale or cleanout before listing the home for sale.' },
      ]}
      faqs={[
        { q: 'Do I have to pay taxes when I inherit a home?', a: 'Generally, inherited property receives a stepped-up cost basis, which may reduce capital gains taxes if you sell. Rules vary by state and situation — always confirm with a CPA or tax attorney.' },
        { q: 'Can I sell inherited property before probate is complete?', a: 'Usually not without court approval. Confirm with your probate court or a licensed attorney.' },
        { q: 'What if multiple siblings inherit the home?', a: 'All heirs must agree on the disposition. If heirs disagree, a partition action through the courts may be necessary. Consult an attorney.' },
      ]}
      relatedLinks={[
        { label: 'Probate Guide', href: '/probate' },
        { label: 'Find Probate Realtors', href: '/probate-realtors' },
        { label: 'Estate Cleanout Guide', href: '/estate-cleanout' },
        { label: 'Estate Sale Guide', href: '/estate-sale-companies' },
      ]}
      ctaTitle="Get Help with an Inherited Property"
      ctaDesc="Connect with probate-friendly realtors, estate sale companies, and cleanout vendors in your area."
    />
  );
}