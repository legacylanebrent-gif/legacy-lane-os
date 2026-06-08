import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Users, Home, DollarSign, FileText } from 'lucide-react';

export default function HeirGuideHub() {
  return (
    <SEHubLayout
      badge="Heir Guide"
      title="Heir's Guide to Inherited Property & Estate Settlement"
      subtitle="What to expect when you inherit — and how to protect your interests"
      intro="Becoming an heir to an estate involves legal rights, practical decisions, and often complex family dynamics. This guide helps heirs understand the general process and what to expect."
      lifeEventType="inherited_home"
      stateRouteSlug="inherited-property"
      pageUrl="/heir-guide"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Heir Guide' }]}
      features={[
        { icon: Users, color: 'bg-blue-100 text-blue-700', title: 'Your Rights as an Heir', desc: 'General overview of heir rights during probate' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Inherited Property', desc: 'What happens to real estate when you inherit it' },
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Receiving Your Inheritance', desc: 'Timelines and what to expect when assets are distributed' },
        { icon: FileText, color: 'bg-purple-100 text-purple-700', title: 'Contesting a Will', desc: 'General information about when and how wills can be challenged' },
      ]}
      steps={[
        { title: 'Understand your status', desc: 'Confirm whether you are a named beneficiary in a will, a trust beneficiary, or an heir by intestate succession (no will).' },
        { title: 'Monitor the probate process', desc: 'Heirs are typically entitled to notice of probate proceedings. Confirm your rights with a licensed attorney.' },
        { title: 'Review the inventory', desc: 'The executor should provide an inventory of estate assets. Review it carefully for accuracy.' },
        { title: 'Ask questions', desc: 'You have the right to ask the executor for updates. If you have concerns about estate management, consult an attorney.' },
        { title: 'Coordinate on personal property', desc: 'Work with other heirs and the executor to agree on personal property distribution before an estate sale.' },
        { title: 'Receive your distribution', desc: 'After debts and taxes are paid, remaining assets are distributed per the will or intestate law.' },
      ]}
      faqs={[
        { q: 'How long does it take to receive an inheritance?', a: 'Typically 6–18 months or longer for complex estates. The executor must pay all debts and taxes before distributing assets.' },
        { q: 'Can I contest a will if I think it\'s unfair?', a: 'Will contests are possible but require legal grounds (fraud, undue influence, lack of capacity). Consult a probate litigation attorney.' },
        { q: 'What if the executor is not doing their job?', a: 'Heirs can petition the probate court to compel the executor to act or to remove them. Consult an attorney.' },
      ]}
      relatedLinks={[
        { label: 'Probate Guide', href: '/probate' },
        { label: 'Executor Guide', href: '/executor-guide' },
        { label: 'Inherited Property Guide', href: '/inherited-property' },
      ]}
      ctaTitle="Get Help as an Heir"
      ctaDesc="Connect with estate sale companies and probate-friendly realtors to help settle the estate."
    />
  );
}