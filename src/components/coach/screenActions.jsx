// Maps route pathnames to contextual quick-action buttons shown in the AI Coach panel.
// Each action has: label (button text), mode (which AI mode to activate), message (pre-filled prompt)

export const SCREEN_ACTIONS = {
  // Dashboard / home
  Dashboard: [
    { label: "📅 Create this week's growth plan", mode: 'weekly_growth_plan', message: "Build me a focused weekly growth plan for this week based on my current business." },
    { label: "🎯 Tell me what to focus on today", mode: 'general_assistant', message: "Based on my business situation, what should I prioritize and focus on today?" },
    { label: "📊 Review my lead flow", mode: 'lead_generation', message: "Review my current lead flow and tell me what's working and what I should improve." },
    { label: "✍️ Create social posts for the week", mode: 'social_media_post', message: "Create a week's worth of social media posts for my estate sale business — mix of educational, promotional, and engagement posts." },
  ],

  // Sale detail / sale editor
  SaleEditor: [
    { label: "📣 Promote this sale", mode: 'sale_promotion_package', message: "Generate a complete promotion package for my current sale. Use my sale details to create compelling content across all platforms." },
    { label: "📸 Write item highlight posts", mode: 'social_media_post', message: "Write a series of social media posts highlighting featured items from my current estate sale to drive traffic and excitement." },
    { label: "🚨 Create final-day urgency campaign", mode: 'social_media_post', message: "Write a final-day urgency campaign — social post, SMS, and email — to maximize attendance on the last day of my sale." },
    { label: "📧 Write email blast", mode: 'email_campaign', message: "Write a compelling email blast announcing my current estate sale to my subscriber list. Make it exciting and include a strong CTA." },
    { label: "🎬 Create video script", mode: 'video_script', message: "Write a 30–60 second video script promoting my current estate sale with a strong hook and CTA." },
  ],
  EstateSaleDetail: [
    { label: "📣 Promote this sale", mode: 'sale_promotion_package', message: "Generate a complete promotion package for my current sale." },
    { label: "📸 Write item highlight posts", mode: 'social_media_post', message: "Write social media posts highlighting featured items from this estate sale to drive traffic." },
    { label: "🚨 Create final-day urgency campaign", mode: 'social_media_post', message: "Write a final-day urgency campaign — social post, SMS, and email — to maximize last-day attendance." },
    { label: "📧 Write email blast", mode: 'email_campaign', message: "Write a compelling email blast announcing this estate sale to my subscriber list." },
    { label: "🎬 Create video script", mode: 'video_script', message: "Write a 30–60 second video promo script for this sale with a strong hook and CTA." },
  ],
  MySales: [
    { label: "📣 Promote my next sale", mode: 'sale_promotion_package', message: "Help me create a full promotion package for my next upcoming estate sale." },
    { label: "✍️ Create sale social posts", mode: 'social_media_post', message: "Write a series of social media posts to promote my upcoming estate sales." },
    { label: "📈 How do I increase sale revenue?", mode: 'business_coaching', message: "Give me actionable strategies to increase the revenue from each estate sale I run." },
  ],

  // Inventory
  SaleInventory: [
    { label: "📸 Turn featured items into social posts", mode: 'social_media_post', message: "Create engaging social media posts featuring the standout inventory items from my current sale to drive buyer interest." },
    { label: "📝 Create item descriptions", mode: 'general_assistant', message: "Help me write compelling, buyer-focused item descriptions for estate sale inventory that highlight value and drive interest." },
    { label: "⭐ Suggest high-interest items to promote", mode: 'general_assistant', message: "Based on common estate sale buyer behavior, which categories of items should I highlight in my marketing to maximize traffic?" },
  ],
  Inventory: [
    { label: "📸 Turn featured items into social posts", mode: 'social_media_post', message: "Create engaging social media posts for standout inventory items to drive buyer interest." },
    { label: "📝 Create item descriptions", mode: 'general_assistant', message: "Help me write compelling, buyer-focused item descriptions for my estate sale inventory." },
    { label: "⭐ Suggest high-interest items to promote", mode: 'general_assistant', message: "Which categories of items should I highlight in my marketing to maximize traffic and sales?" },
  ],

  // Leads
  Leads: [
    { label: "✉️ Draft client follow-up", mode: 'post_sale_followup', message: "Write a professional, warm follow-up message for a lead who inquired about estate sale services but hasn't responded yet." },
    { label: "🛡️ Handle this objection", mode: 'objection_handler', message: "Help me handle a common objection I'm facing from a potential estate sale client. Walk me through the scripts." },
    { label: "📋 Create consultation prep notes", mode: 'pricing_consultation', message: "Help me prepare for an upcoming estate sale consultation — what questions to ask, how to assess the estate, and how to close the contract." },
    { label: "💡 Suggest next best action", mode: 'general_assistant', message: "Looking at my lead pipeline, what should my next best action be to convert more leads into signed contracts?" },
  ],
  IncomingLeads: [
    { label: "✉️ Draft lead follow-up", mode: 'post_sale_followup', message: "Write a warm, professional follow-up message for an incoming lead who expressed interest in estate sale services." },
    { label: "🛡️ Handle a common objection", mode: 'objection_handler', message: "Help me handle objections from incoming leads who are hesitant to move forward." },
    { label: "📋 Consultation prep", mode: 'pricing_consultation', message: "Help me prepare for consultations with new leads — questions to ask and how to close the contract." },
  ],
  AdminLeads: [
    { label: "📊 Review lead pipeline", mode: 'lead_generation', message: "Help me analyze and improve my overall lead pipeline and conversion strategy." },
    { label: "✉️ Draft lead outreach", mode: 'post_sale_followup', message: "Write outreach messages for leads who haven't been contacted yet." },
    { label: "💡 Lead generation ideas", mode: 'lead_generation', message: "Give me 5 specific lead generation strategies I can implement this week for my territory." },
  ],

  // Marketing
  SaleMarketingCampaigns: [
    { label: "📅 Build weekly content calendar", mode: 'weekly_growth_plan', message: "Build a full weekly social media and email content calendar for my estate sale business, organized by day and platform." },
    { label: "📘 Create Facebook posts", mode: 'social_media_post', message: "Write 5 high-engagement Facebook posts for my estate sale business — mix of promotional, educational, and community content." },
    { label: "✍️ Write blog article", mode: 'blog_post', message: "Write an SEO-optimized blog article that positions me as the top estate sale expert in my territory and drives organic traffic." },
    { label: "📧 Create email campaign", mode: 'email_campaign', message: "Create a 3-email drip campaign sequence I can use to nurture leads and announce upcoming estate sales." },
  ],
  MarketingTasks: [
    { label: "📅 Build weekly content calendar", mode: 'weekly_growth_plan', message: "Build a full weekly content calendar for my estate sale marketing — organized by day and platform." },
    { label: "📘 Create Facebook posts", mode: 'social_media_post', message: "Write 5 high-engagement Facebook posts for my estate sale business." },
    { label: "✍️ Write blog article", mode: 'blog_post', message: "Write an SEO-optimized blog article positioning me as the top estate sale expert in my territory." },
    { label: "📧 Create email campaign", mode: 'email_campaign', message: "Create a 3-email nurture and announcement campaign sequence." },
  ],
  Campaigns: [
    { label: "📧 Write email campaign", mode: 'email_campaign', message: "Write a compelling email campaign for my estate sale business — include subject line, preview text, and full body." },
    { label: "📱 Write SMS campaign", mode: 'sms_campaign', message: "Write 3 SMS messages for my next campaign: announcement, reminder, and urgency." },
    { label: "📘 Create social campaign", mode: 'social_media_post', message: "Build a multi-post social media campaign I can schedule across Facebook and Instagram this week." },
  ],
  SocialAdsHub: [
    { label: "📘 Create Facebook ad copy", mode: 'social_media_post', message: "Write high-converting Facebook ad copy for my estate sale business — include headline, primary text, and CTA." },
    { label: "🎯 Build lead gen strategy", mode: 'lead_generation', message: "Build me a Facebook Ads lead generation strategy specifically for estate sale operators in my territory." },
    { label: "✍️ Create landing page copy", mode: 'general_assistant', message: "Write compelling landing page copy for a Facebook Ads lead capture page for estate sale services." },
  ],

  // Referral Partners
  CRM: [
    { label: "📨 Create agent outreach message", mode: 'real_estate_agent_relations', message: "Write a professional, compelling outreach message to local real estate agents introducing my estate sale services and proposing a referral partnership." },
    { label: "⚖️ Build probate attorney intro", mode: 'referral_partner_builder', message: "Write an introduction email to a probate attorney explaining my estate sale services and why referring clients to me benefits their practice." },
    { label: "🏡 Create senior community pitch", mode: 'referral_partner_builder', message: "Write a pitch for senior living communities, assisted living placement counselors, and senior move managers to refer downsizing clients to my estate sale company." },
  ],
  Pipeline: [
    { label: "📨 Draft partner outreach", mode: 'referral_partner_builder', message: "Write outreach messages to potential referral partners in my area — attorneys, agents, and senior care managers." },
    { label: "💡 Improve pipeline strategy", mode: 'business_coaching', message: "Help me improve my business development pipeline — how do I move more prospects to signed contracts?" },
    { label: "🤝 Build referral network", mode: 'referral_partner_builder', message: "Help me build a systematic referral partner network starting with the highest-value partner types for my territory." },
  ],
};

// Map pathname segments to screen keys
export function getScreenKey(pathname) {
  if (pathname === '/' || pathname === '') return 'Dashboard';
  const segment = pathname.replace(/^\//, '').split('/')[0];
  // Direct match
  if (SCREEN_ACTIONS[segment]) return segment;
  // Case-insensitive match
  const key = Object.keys(SCREEN_ACTIONS).find(k => k.toLowerCase() === segment.toLowerCase());
  return key || null;
}