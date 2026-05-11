Deno.serve(async (req) => {
  const sitemapUrl = req.url.replace(/\/[^/]+$/, '/sitemap');

  const content = `User-agent: *
Allow: /

# High-value public pages
Allow: /EstateSaleDetail
Allow: /EstateSaleFinder
Allow: /StateCities
Allow: /SearchByState
Allow: /BrowseOperators
Allow: /BrowseItems
Allow: /OperatorPackages
Allow: /StartYourCompany
Allow: /CompareEstateSales
Allow: /SaleLanding
Allow: /ItemDetail

# Block admin / operator-only pages
Disallow: /Dashboard
Disallow: /AdminUsers
Disallow: /AdminEstateSales
Disallow: /AdminLeads
Disallow: /SaleEditor
Disallow: /SaleInventory
Disallow: /SaleTasks
Disallow: /SalePipeline
Disallow: /CheckoutStation
Disallow: /ScanAndCart
Disallow: /ManageTeam
Disallow: /ApiKeyManager

Sitemap: ${sitemapUrl}
`;

  return new Response(content, {
    status: 200,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' },
  });
});