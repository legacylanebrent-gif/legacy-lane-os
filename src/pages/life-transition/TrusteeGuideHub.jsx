import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { Scale, FileText, Home, DollarSign } from 'lucide-react';

export default function TrusteeGuideHub() {
  return (
    <SEHubLayout
      badge="Trustee Guide"
      title="Trustee's Guide to Managing a Trust Estate"
      subtitle="Understanding your role and responsibilities as a trustee"
      intro="Acting as trustee of a trust estate carries fiduciary duties that differ from those of a probate executor. This guide provides a general educational overview of the trustee's role when real estate and personal property are involved."
      lifeEventType="probate"
      stateRouteSlug="probate"
      pageUrl="/trustee-guide"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Trustee Guide' }]}
      features={[
        { icon: Scale, color: 'bg-purple-100 text-purple-700', title: 'Fiduciary Duties', desc: 'General overview of trustee responsibilities to beneficiaries' },
        { icon: FileText, color: 'bg-blue-100 text-blue-700', title: 'Trust Administration', desc: 'Key steps in administering a revocable or irrevocable trust' },
        { icon: Home, color: 'bg-amber-100 text-amber-700', title: 'Real Property in Trust', desc: 'How to handle real estate held in trust' },
        { icon: DollarSign, color: 'bg-green-100 text-green-700', title: 'Accounting', desc: 'Trustee accounting and distribution requirements' },
      ]}
      steps={[
        { title: 'Review the trust document', desc: 'The trust document is your governing authority. Understand its terms completely before taking any action.' },
        { title: 'Notify beneficiaries', desc: 'Most states require trustees to notify beneficiaries when they assume the role. Confirm your state\'s requirements with an attorney.' },
        { title: 'Inventory trust assets', desc: 'Identify and document all assets held in the trust, including real estate, accounts, and personal property.' },
        { title: 'Manage and protect trust property', desc: 'Maintain insurance, pay property taxes, and address any maintenance needs on real property.' },
        { title: 'Prepare accountings', desc: 'Keep detailed records of all receipts, expenses, and distributions. Beneficiaries may be entitled to annual accountings.' },
        { title: 'Distribute per trust terms', desc: 'Distribute assets according to the trust\'s instructions. Consult an attorney if any distributions are unclear.' },
      ]}
      faqs={[
        { q: 'Is a trustee different from an executor?', a: 'Yes. An executor administers a probate estate through the court. A trustee administers a trust, which typically avoids probate. Both carry fiduciary duties.' },
        { q: 'Can a trustee sell trust property?', a: 'Generally yes, if the trust document permits it and the trustee acts in the best interests of the beneficiaries. Confirm with an attorney.' },
      ]}
      relatedLinks={[
        { label: 'Executor Guide', href: '/executor-guide' },
        { label: 'Probate Guide', href: '/probate' },
        { label: 'Inherited Property Guide', href: '/inherited-property' },
      ]}
      ctaTitle="Get Help with Trust Estate Property"
      ctaDesc="Connect with estate sale companies and realtors experienced in trust and probate properties."
    />
  );
}