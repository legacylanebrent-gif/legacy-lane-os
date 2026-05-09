import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { answers } = await req.json();

    const prompt = `You are a business advisor for Legacy Lane OS, an estate sale management platform.

An operator just completed their onboarding questionnaire. Based on their answers, recommend the most relevant features from our platform and explain WHY each one fits their specific situation.

Their answers:
${Object.entries(answers).map(([q, a]) => `- ${q}: ${Array.isArray(a) ? a.join(', ') : a}`).join('\n')}

Our platform features:
1. **Sale Editor** - Create and manage estate sale listings with photos, descriptions, dates
2. **Inventory Management** - Track every item with pricing, photos, categories, barcodes
3. **Scan & Checkout** - Mobile barcode scanning for fast day-of-sale checkout
4. **Income Tracker** - Log all revenue streams and generate financial reports
5. **Business Expense Tracker** - Categorize and track all business expenses for taxes
6. **Marketing Tasks** - Plan and execute social media, email, and advertising campaigns
7. **Social Ads Hub** - Build Facebook/Instagram ads to promote sales
8. **Email Campaigns** - Send branded email blasts to your customer list
9. **Sale Statistics** - Deep analytics on sell-through rates, avg item prices, top categories
10. **Lead Pipeline** - Manage incoming client leads from initial contact to contract signing
11. **Sale Conversion Pipeline** - Track a lead from signed contract to completed sale
12. **CRM & Contacts** - Maintain a database of clients, vendors, and referral partners
13. **Vendor Network** - Connect with cleanout crews, movers, photographers, stagers
14. **Referral Dashboard** - Earn commissions by referring agents and other operators
15. **Settlement Statement** - Generate professional client payout statements
16. **Early Sign-In List** - Let buyers sign up before a sale to build buzz
17. **AI Pricing Tool** - Use AI to suggest item prices based on market data
18. **Courses & Training** - Access business growth training and estate sale best practices
19. **AI Assistant** - Get AI-powered business advice, copy writing, and strategic help
20. **VIP Events** - Host exclusive preview events for your best buyers

Based on the operator's answers, select the 6-8 MOST relevant features for THEM specifically. For each, provide:
- A clear, specific reason why it fits their business situation (reference their actual answers)
- A priority level: "Must-Have", "High Value", or "Nice to Have"
- One concrete action they can take first

Return as JSON with this structure:
{
  "business_summary": "2-3 sentence summary of their business situation",
  "top_opportunity": "The single biggest growth opportunity you see for them",
  "recommendations": [
    {
      "feature": "Feature Name",
      "reason": "Specific reason based on their answers",
      "priority": "Must-Have|High Value|Nice to Have",
      "first_step": "What to do first",
      "route": "/PageName"
    }
  ]
}

Routes for reference: SaleEditor, Inventory, ScanAndCart, IncomeTracker, MyBusinessExpenses, MarketingTasks, SocialAdsHub, ContentCalendar, SaleStatistics, Leads, SaleConversionPipeline, CRM, Vendors, ReferralDashboard, SettlementStatement, EarlySignIn, SalePricingTool, Courses, AIAssistant, VIPEvent`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          business_summary: { type: 'string' },
          top_opportunity: { type: 'string' },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                feature: { type: 'string' },
                reason: { type: 'string' },
                priority: { type: 'string' },
                first_step: { type: 'string' },
                route: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});