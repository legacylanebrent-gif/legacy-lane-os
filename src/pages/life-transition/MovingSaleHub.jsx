import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Package, DollarSign, Home, Clock } from 'lucide-react';

export default function MovingSaleHub() {
  return (
    <SEHubLayout
      badge="Moving Sale Guide"
      title="Moving Sale & Estate Sale Guide"
      subtitle="How to sell household contents when moving, downsizing, or relocating"
      intro="Whether you're downsizing, relocating, or simply need to clear out a home, a moving sale or estate sale can turn unwanted belongings into cash. This guide explains your options."
      lifeEventType="estate_settlement"
      stateRouteSlug="moving-sale"
      pageUrl="/moving-sale"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Moving Sale Guide' }]}
      features={[
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Maximize Returns', desc: 'Estate sales typically net more than garage sales for large volumes' },
        { icon: Package, color: 'bg-blue-100 text-blue-700', title: 'What to Sell', desc: 'Furniture, collectibles, tools, kitchen items, and more' },
        { icon: Clock, color: 'bg-amber-100 text-amber-700', title: 'Timeline', desc: 'Most companies can organize a sale within 2–4 weeks' },
        { icon: Home, color: 'bg-slate-100 text-slate-700', title: 'Prepare the Home', desc: 'How to prepare for a successful sale' },
      ]}
      steps={[
        { title: 'Decide what you\'re keeping', desc: 'Separate items you\'re taking to your new home before the estate sale company arrives to organize.' },
        { title: 'Contact estate sale companies', desc: 'Get 2–3 quotes. Companies typically charge 25–40% commission of gross sales.' },
        { title: 'Prepare and clean items', desc: 'Items in better condition sell for more. Wipe down furniture, gather sets together, find original boxes for electronics.' },
        { title: 'Set aside sentimental items', desc: 'Clearly mark anything that is not for sale. Communicate this to the estate sale company.' },
        { title: 'Allow the company to run the sale', desc: 'A good estate sale company handles pricing, advertising, setup, and staffing. Trust the process.' },
        { title: 'Arrange donation/cleanout for what remains', desc: 'Most companies offer to help clear remaining items after the sale for an additional fee.' },
      ]}
      faqs={[
        { q: 'What\'s the difference between a garage sale and an estate sale?', a: 'Estate sale companies handle everything — pricing, advertising, setup, and sales — and typically achieve higher prices for quality items. Garage sales are DIY and better for small volumes of common items.' },
        { q: 'How much do estate sale companies charge?', a: 'Typically 25–40% of gross sales. Confirm with local companies.' },
      ]}
      relatedLinks={[
        { label: 'Senior Downsizing Guide', href: '/senior-downsizing' },
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Estate Cleanout Guide', href: '/estate-cleanout' },
      ]}
      ctaTitle="Find an Estate Sale Company Near You"
      ctaDesc="Tell us your state and situation and we'll connect you with local estate sale professionals."
    />
  );
}