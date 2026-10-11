// Template #1 root — maps a page type to the Template #1 page component.
// Pure dispatch: receives already-fetched, tenant-safe view models.
import React from 'react';
import Template1Shell from './Template1Shell.jsx';
import Template1Home from './Template1Home.jsx';
import Template1Sales from './Template1Sales.jsx';
import Template1SaleDetail from './Template1SaleDetail.jsx';
import Template1StaticPage from './Template1StaticPage.jsx';
import TemplateErrorState from './TemplateErrorState.jsx';

export default function Template1({ pageType, website, detail, leadContext }) {
  const settings = website.settings || {};
  const shellProps = { settings, siteName: website.site_name, hostname: website.hostname, company: website.company };
  let content = null;
  if (pageType === 'home') content = <Template1Home website={website} />;
  else if (pageType === 'sales') content = <Template1Sales website={website} />;
  else if (pageType === 'sale_detail') content = <Template1SaleDetail website={website} detail={detail} />;
  else if (pageType === 'faq' && !(((settings.faq || {}).items) || []).length) {
    // Optional page with no content is not published (Phase 3D.3) — never a
    // stub "coming soon" page.
    content = <TemplateErrorState kind="page_not_available" />;
  }
  else if (['about', 'services', 'contact', 'faq', 'legal'].includes(pageType)) {
    content = <Template1StaticPage pageType={pageType} website={website} leadContext={leadContext} />;
  }
  return <Template1Shell {...shellProps}>{content}</Template1Shell>;
}