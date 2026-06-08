import React from 'react';
import SEHubLayout from '@/components/seo-engine/SEHubLayout';
import { FileText, Clock, Users, Home } from 'lucide-react';

export default function PreProbateHub() {
  return (
    <SEHubLayout
      badge="Estate Planning Guidance"
      title="Pre-Probate Planning Guide"
      subtitle="Steps families can take before or immediately after a death"
      intro="Pre-probate planning means organizing documents, understanding what the estate contains, and preparing for the legal and practical steps ahead — before the formal probate process begins."
      lifeEventType="probate"
      stateRouteSlug="probate"
      pageUrl="/pre-probate"
      pageType="life_event_hub"
      breadcrumbs={[{ label: 'Pre-Probate Guide' }]}
      features={[
        { icon: FileText, color: 'bg-blue-100 text-blue-700', title: 'Document Checklist', desc: 'Know exactly which documents to locate first' },
        { icon: Clock, color: 'bg-amber-100 text-amber-700', title: 'Time-Sensitive Steps', desc: 'Some tasks must happen within days — know what they are' },
        { icon: Users, color: 'bg-green-100 text-green-700', title: 'Family Coordination', desc: 'Guidance on coordinating decisions with multiple heirs' },
        { icon: Home, color: 'bg-purple-100 text-purple-700', title: 'Property Preparation', desc: 'How to secure and assess real estate and personal property' },
      ]}
      steps={[
        { title: 'Secure the property', desc: 'Change locks, forward mail, and secure valuables immediately after a death.' },
        { title: 'Locate the will and estate documents', desc: 'Check safe deposit boxes, home files, and contact the deceased\'s attorney.' },
        { title: 'Gather certified death certificates', desc: 'Order more than you think you need — typically 10–15 copies.' },
        { title: 'Notify financial institutions', desc: 'Notify banks, investment firms, and insurance companies. Do not move funds until you have legal authority.' },
        { title: 'Document personal property', desc: 'Photograph and inventory contents before anything is moved, donated, or discarded.' },
        { title: 'Consult a probate attorney', desc: 'Even a brief consultation helps clarify what your state requires.' },
      ]}
      faqs={[
        { q: 'What should I do in the first 48 hours after a death?', a: 'Secure the property, gather documents, order death certificates, and notify immediate family. Do not distribute or sell anything until you have legal authority.' },
        { q: 'Can I enter and secure the property before probate?', a: 'Generally yes, to secure it — but consult an attorney before removing or selling any assets.' },
        { q: 'What happens if there is no will?', a: 'The estate passes according to your state\'s intestate succession laws. A probate court will appoint an administrator. Confirm with your local probate court or licensed attorney.' },
      ]}
      relatedLinks={[
        { label: 'Probate Guide', href: '/probate' },
        { label: 'Executor Guide', href: '/executor-guide' },
        { label: 'Estate Checklist', href: '/estate-checklist' },
      ]}
      ctaTitle="Get Help Planning the Next Steps"
      ctaDesc="We'll connect you with estate sale companies, realtors, and other professionals who can help you through this process."
    />
  );
}