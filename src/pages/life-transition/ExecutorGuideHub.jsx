import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Scale, FileText, Home, Users } from 'lucide-react';

export default function ExecutorGuideHub() {
  return (
    <SEHubLayout
      badge="Executor Guide"
      title="Executor's Guide to Settling an Estate"
      subtitle="Your responsibilities, your timeline, and where to start"
      intro="Being named executor of an estate is an honor — and a significant responsibility. This guide explains the executor's role in plain language and helps you understand the general steps involved."
      lifeEventType="probate"
      stateRouteSlug="probate"
      pageUrl="/executor-guide"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Executor Guide' }]}
      features={[
        { icon: Scale, color: 'bg-purple-100 text-purple-700', title: 'Legal Duties', desc: 'General overview of an executor\'s legal responsibilities' },
        { icon: FileText, color: 'bg-blue-100 text-blue-700', title: 'Document Management', desc: 'What paperwork you\'ll need to gather and file' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Property & Assets', desc: 'How to manage real estate, personal property, and financial accounts' },
        { icon: Users, color: 'bg-green-100 text-green-700', title: 'Heir Communication', desc: 'Managing expectations and communications with beneficiaries' },
      ]}
      steps={[
        { title: 'Obtain Letters Testamentary', desc: 'Once the court appoints you, you\'ll receive Letters Testamentary — the legal document authorizing you to act on behalf of the estate.' },
        { title: 'Open an estate bank account', desc: 'All estate income and expenses should flow through a dedicated estate account. Do not commingle with personal funds.' },
        { title: 'Inventory and protect all assets', desc: 'Create a complete inventory. Secure real estate, vehicles, and valuables. Notify financial institutions.' },
        { title: 'Notify creditors and beneficiaries', desc: 'Most states require formal notification. Confirm your state\'s specific requirements with the probate court or your attorney.' },
        { title: 'Pay valid debts and expenses', desc: 'Debts must be paid before distributions. Consult an attorney if creditor claims are disputed.' },
        { title: 'File final tax returns', desc: 'An estate may have its own tax obligations. Consult a CPA or tax attorney familiar with estate taxation.' },
        { title: 'Distribute assets and close the estate', desc: 'Once debts and taxes are settled, distribute assets per the will and file to close the estate with the court.' },
      ]}
      faqs={[
        { q: 'Can I be removed as executor?', a: 'Yes. A court can remove an executor for misconduct, conflict of interest, or inability to perform duties. Consult an attorney if this situation arises.' },
        { q: 'Am I personally liable for estate debts?', a: 'Generally no, as long as you follow proper procedures and do not distribute assets before paying valid debts. Confirm with a licensed attorney.' },
        { q: 'How long does an executor have to settle an estate?', a: 'Timelines vary by state. Simple estates may close in 6–12 months; complex ones can take years. Confirm with your local probate court or attorney.' },
      ]}
      relatedLinks={[
        { label: 'Probate Guide', href: '/probate' },
        { label: 'Heir Guide', href: '/heir-guide' },
        { label: 'Trustee Guide', href: '/trustee-guide' },
        { label: 'Estate Checklist', href: '/estate-checklist' },
      ]}
      ctaTitle="Get Help Settling the Estate"
      ctaDesc="Connect with estate sale companies, realtors, and other professionals who specialize in working with executors."
    />
  );
}