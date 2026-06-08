import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Trash2, Package, DollarSign, Clock } from 'lucide-react';

export default function EstateCleanoutHub() {
  return (
    <SEHubLayout
      badge="Estate Cleanout Guide"
      title="Estate Cleanout Guide"
      subtitle="How to clear out a home after a death, move, or estate sale"
      intro="After an estate sale, a move-out, or the passing of a loved one, clearing the remaining contents of a home is often the final step before selling or transferring the property. This guide explains your options."
      lifeEventType="estate_settlement"
      stateRouteSlug="estate-cleanout"
      pageUrl="/estate-cleanout"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Estate Cleanout Guide' }]}
      features={[
        { icon: Package, color: 'bg-blue-100 text-blue-700', title: 'Estate Sale First', desc: 'Sell valuables before scheduling a cleanout to maximize recovery' },
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Buyout Option', desc: 'Some companies will buy entire contents when a full sale isn\'t practical' },
        { icon: Trash2, color: 'bg-slate-100 text-slate-700', title: 'Junk Removal', desc: 'Professional services for final clearing and haul-away' },
        { icon: Clock, color: 'bg-amber-100 text-amber-700', title: 'Fast Timelines', desc: 'Many cleanout companies can complete a job in 1–3 days' },
      ]}
      steps={[
        { title: 'Hold the estate sale first', desc: 'Maximize recovery by selling anything of value before calling a cleanout company. Estate sale companies typically handle this.' },
        { title: 'Sort what remains', desc: 'Separate donation-worthy items from true junk. Many charities offer free pickup for furniture and household goods.' },
        { title: 'Schedule donation pickups', desc: 'Habitat for Humanity ReStores, Salvation Army, and similar organizations often pick up furniture and appliances.' },
        { title: 'Get cleanout quotes', desc: 'Prices vary significantly. Get 2–3 quotes. Pricing is typically based on volume/truck loads.' },
        { title: 'Confirm everything is removed', desc: 'Do a final walkthrough to ensure the property is broom-clean before listing or transferring.' },
      ]}
      faqs={[
        { q: 'How much does an estate cleanout cost?', a: 'Costs vary widely based on location, volume, and access. Get multiple quotes. Confirm with local cleanout vendors.' },
        { q: 'Should I do the estate sale before or after the cleanout?', a: 'Always before. A cleanout removes everything — including items that could be sold. Do the estate sale first to maximize recovery.' },
      ]}
      relatedLinks={[
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Senior Downsizing Guide', href: '/senior-downsizing' },
        { label: 'Inherited Property Guide', href: '/inherited-property' },
      ]}
      ctaTitle="Get Help with an Estate Cleanout"
      ctaDesc="Connect with estate sale companies and cleanout vendors in your area."
    />
  );
}