import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Home, Package, Heart, Users } from 'lucide-react';

export default function SeniorDownsizingHub() {
  return (
    <SEHubLayout
      badge="Downsizing Guide"
      title="Senior Downsizing Guide"
      subtitle="Helping older adults and families through a major transition"
      intro="Downsizing a family home is one of the most emotionally and logistically complex transitions a family can face. Whether you're helping a parent move to a smaller home or assisted living, this guide helps you understand the process."
      lifeEventType="downsizing"
      stateRouteSlug="senior-downsizing"
      pageUrl="/senior-downsizing"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Senior Downsizing Guide' }]}
      features={[
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Sell the Family Home', desc: 'Options for listing, cash offers, and senior-friendly buyers' },
        { icon: Package, color: 'bg-blue-100 text-blue-700', title: 'Estate Sale', desc: 'Liquidate decades of belongings with help from an estate sale company' },
        { icon: Heart, color: 'bg-pink-100 text-pink-700', title: 'Donate & Gift', desc: 'What to donate, what to gift to family, and what to discard' },
        { icon: Users, color: 'bg-green-100 text-green-700', title: 'Family Coordination', desc: 'Managing decisions when multiple family members are involved' },
      ]}
      steps={[
        { title: 'Start the conversation early', desc: 'Downsizing works best when started 3–6 months before a planned move. Rushed timelines lead to lower returns and more stress.' },
        { title: 'Sort by category, not room', desc: 'Work through furniture, clothing, collectibles, and paperwork separately to avoid overwhelm.' },
        { title: 'Identify high-value items early', desc: 'Antiques, jewelry, art, and collectibles should be appraised before being priced or given away.' },
        { title: 'Schedule an estate sale or buyout', desc: 'An estate sale company can handle the pricing, advertising, and running of the sale. A buyout may be faster if time is critical.' },
        { title: 'Arrange donation pickups', desc: 'Many charities offer free pickup for furniture and household goods. Schedule this after the estate sale.' },
        { title: 'Prepare the home for sale', desc: 'After contents are cleared, address any needed repairs and list with a realtor or consider a cash offer.' },
      ]}
      faqs={[
        { q: 'How far in advance should I start the downsizing process?', a: 'Ideally 3–6 months before a planned move. If an unexpected health event triggers the move, an estate sale company can often organize a sale within 2–4 weeks.' },
        { q: 'Is it better to have an estate sale or sell items online?', a: 'Estate sales are more efficient for large quantities of items. Online selling maximizes value for individual high-value pieces but is time-intensive.' },
        { q: 'What happens to items left after the estate sale?', a: 'Remaining items can be donated, sold to a buyout company, or hauled away by a cleanout service.' },
      ]}
      relatedLinks={[
        { label: 'Assisted Living Transition Guide', href: '/assisted-living-transition' },
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Estate Cleanout Guide', href: '/estate-cleanout' },
      ]}
      ctaTitle="Get Help Downsizing"
      ctaDesc="Connect with estate sale companies, realtors, and senior move specialists in your area."
    />
  );
}