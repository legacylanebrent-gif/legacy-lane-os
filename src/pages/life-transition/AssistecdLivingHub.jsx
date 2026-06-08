import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Heart, Clock, Home, Users } from 'lucide-react';

export default function AssistedLivingHub() {
  return (
    <SEHubLayout
      badge="Senior Transition Guide"
      title="Assisted Living Transition Guide"
      subtitle="What to do with the home and belongings when a parent moves to memory care or assisted living"
      intro="When a parent or loved one moves into assisted living or memory care, the family is often left managing a home full of belongings under significant time pressure. This guide helps you understand your options."
      lifeEventType="senior_transition"
      stateRouteSlug="assisted-living-transition"
      pageUrl="/assisted-living-transition"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Assisted Living Transition Guide' }]}
      features={[
        { icon: Clock, color: 'bg-red-100 text-red-700', title: 'Time-Sensitive Decisions', desc: 'Most families have 30–90 days to clear the home' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Home Options', desc: 'Sell, rent, or hold — each option has implications for benefits eligibility' },
        { icon: Heart, color: 'bg-pink-100 text-pink-700', title: 'Personal Property', desc: 'Estate sale, donation, family gifting, or cleanout' },
        { icon: Users, color: 'bg-green-100 text-green-700', title: 'Family Coordination', desc: 'Managing decisions when multiple siblings are involved' },
      ]}
      steps={[
        { title: 'Understand the timeline', desc: 'Assisted living facilities rarely hold a room indefinitely. Clarify how long you have to clear the home.' },
        { title: 'Consult an elder law attorney', desc: 'If Medicaid is involved, the home\'s disposition can affect benefits eligibility. Confirm with a licensed elder law attorney before selling.' },
        { title: 'Decide what your loved one can bring', desc: 'Most assisted living rooms are small. Help your family member choose meaningful items to take.' },
        { title: 'Schedule an estate sale', desc: 'An estate sale company can organize and sell the remaining contents, often netting more than a quick cleanout.' },
        { title: 'Clear and clean the home', desc: 'After the sale, a cleanout company handles remaining items and prepares the home for sale or rental.' },
        { title: 'Evaluate what to do with the property', desc: 'Renting the home may preserve options. Selling may be necessary. Confirm tax and benefit implications first.' },
      ]}
      faqs={[
        { q: 'Can we sell the house while a parent is in assisted living?', a: 'Yes, but if Medicaid is or may become involved, selling the home can affect eligibility. Consult an elder law attorney before proceeding.' },
        { q: 'How quickly can an estate sale be organized?', a: 'Most estate sale companies can organize a sale within 2–4 weeks of initial contact, depending on the volume of items and their schedule.' },
      ]}
      relatedLinks={[
        { label: 'Senior Downsizing Guide', href: '/senior-downsizing' },
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Estate Cleanout Guide', href: '/estate-cleanout' },
      ]}
      ctaTitle="Get Help with an Assisted Living Transition"
      ctaDesc="Connect with estate sale companies, senior move specialists, and realtors in your area."
    />
  );
}