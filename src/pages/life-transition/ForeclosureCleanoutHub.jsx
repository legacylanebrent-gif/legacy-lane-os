import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Home, Trash2, Clock, DollarSign } from 'lucide-react';

export default function ForeclosureCleanoutHub() {
  return (
    <SEHubLayout
      badge="Foreclosure Cleanout Guide"
      title="Foreclosure Cleanout Guide"
      subtitle="What homeowners and families need to know about clearing a property before or after foreclosure"
      intro="Whether you're a homeowner facing foreclosure or a buyer who purchased a foreclosed property, understanding the cleanout process can save time, money, and stress."
      lifeEventType="estate_settlement"
      stateRouteSlug="foreclosure-cleanout"
      pageUrl="/foreclosure-cleanout"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Foreclosure Cleanout Guide' }]}
      features={[
        { icon: Clock, color: 'bg-red-100 text-red-700', title: 'Time-Sensitive', desc: 'Foreclosure timelines are strict — understand your deadlines' },
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Recover Value', desc: 'An estate sale before vacating can recover thousands in value' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Property Condition', desc: 'What buyers and banks typically expect when taking possession' },
        { icon: Trash2, color: 'bg-slate-100 text-slate-700', title: 'Cleanout Services', desc: 'Professional cleanout and junk removal options' },
      ]}
      steps={[
        { title: 'Understand your timeline', desc: 'Foreclosure timelines vary by state. You may have weeks or months. Confirm your specific deadline with your attorney.' },
        { title: 'Consult an attorney immediately', desc: 'A foreclosure or real estate attorney can explain your rights, potential defenses, and options.' },
        { title: 'Inventory your personal property', desc: 'Photograph and document everything. You have the right to remove your personal belongings before the lender takes possession.' },
        { title: 'Consider a moving sale or estate sale', desc: 'If you cannot take everything, an estate sale or buyout company can purchase contents quickly.' },
        { title: 'Arrange cleanout for what remains', desc: 'A professional cleanout service handles remaining items and prepares the property for handover.' },
      ]}
      faqs={[
        { q: 'Can I take personal property from a foreclosed home?', a: 'Generally yes — personal property (not fixtures) belongs to you and can be removed. Confirm your state\'s rules with a licensed attorney.' },
        { q: 'What happens to belongings left behind in a foreclosure?', a: 'Laws vary by state. Some states require the lender to store items, others allow immediate disposal. Confirm with a licensed attorney.' },
      ]}
      relatedLinks={[
        { label: 'Estate Cleanout Guide', href: '/estate-cleanout' },
        { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
        { label: 'Moving Sale Guide', href: '/moving-sale' },
      ]}
      ctaTitle="Get Help with a Foreclosure Cleanout"
      ctaDesc="Connect with estate sale companies and cleanout vendors in your area."
    />
  );
}