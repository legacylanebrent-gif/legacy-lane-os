import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronRight, Database, Code2, Globe, LayoutDashboard, Zap, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS = {
  DONE: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, iconColor: 'text-green-500' },
  PARTIAL: { label: 'Partial', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, iconColor: 'text-amber-500' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, iconColor: 'text-red-500' },
  MISSING: { label: 'Missing', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: XCircle, iconColor: 'text-slate-400' },
};

const PHASES = [
  { id: 1, title: 'Core Platform & Estate Sales', status: 'DONE', notes: 'EstateSale entity, Estate Sale Company Owner dashboard, sale listings, early sign-in, checkout, scan & cart, settlement statement.' },
  { id: 2, title: 'SEO Authority Engine', status: 'DONE', notes: 'Sale SEO pages, item profiles, brand/category/city hubs, blog posts, weekly market reports, sitemap, GSC integration.' },
  { id: 3, title: 'Knowledge & Pricing Engine (KE)', status: 'DONE', notes: 'ItemKnowledgeBase, demand signals, Google Lens pricing, sale recaps, weekly video intelligence batch.' },
  { id: 4, title: 'Lead Engine & CRM', status: 'DONE', notes: 'EstateTransitionLead, ProbateLead, lead scoring, routing, nurture email sequence, lead activity logs.' },
  { id: 5, title: 'Estate Sale Company Owner Growth & Referral Engine', status: 'DONE', notes: 'Referral agreements, wallet, commissions, agent partnerships, Estate Sale Company Owner territory profiles, Houszu integration.' },
  { id: 6, title: 'Marketing & Campaigns', status: 'DONE', notes: 'Social ads hub, Customer.io integration, Estate Sale Company Owner marketing dashboard, Facebook ad campaigns, campaign builder.' },
  { id: 7, title: 'Territory & Agent Network', status: 'DONE', notes: 'Territory heatmap, Houszu territory API, agent dashboard, Estate Sale Company Owner portal, territory FB post generator.' },
  { id: 8, title: 'AI Estate Sale Company Owner & Autonomous Agents', status: 'DONE', notes: 'AdminAI operator, autonomous run engine, AI coach, AI credits system, Estate Sale Company Owner AI usage alerts.' },
  { id: 9, title: 'Probate SEO Engine v1', status: 'DONE', notes: 'ProbateState, ProbateCounty entities, admin engine, probate hub, state/county public pages, basic checklist.' },
  { id: 10, title: 'Life Transition SEO Engine', status: 'DONE', notes: '14 life event static hubs, dynamic state/county pages, provider directory, content engine admin (6-tab), all generator functions.' },
  { id: 11, title: 'Checklist & Lead Magnet System', status: 'DONE', notes: 'LeadMagnet entity, 10 default checklists seeded, downloadLeadMagnet function, dynamic /estate-checklist routing, email delivery.' },
  { id: 12, title: 'Phase 12 NJ Deployment', status: 'PARTIAL', notes: 'deployNJPhase12 function built, admin deploy page built. Content NOT yet generated — ProbateState/ProbateCounty tables empty. Providers not assigned.' },
];

const ENTITIES = [
  { name: 'EstateSale', fields: 35, relations: ['Item', 'EarlySignIn', 'SaleItemPricing', 'SEOPage', 'SaleRecap'] },
  { name: 'Item', fields: 18, relations: ['EstateSale', 'MarketplaceItem', 'SEOItemProfile', 'SaleItemPricing'] },
  { name: 'EstateTransitionLead', fields: 28, relations: ['LeadActivityLog', 'ProviderRoutingRule', 'ProbateProviderRoutingRule'] },
  { name: 'ProbateLead', fields: 22, relations: ['ProbateChecklist'] },
  { name: 'ProbateState', fields: 16, relations: ['ProbateCounty'], note: '⚠ Empty — not yet populated' },
  { name: 'ProbateCounty', fields: 17, relations: ['ProbateState'], note: '⚠ Empty — not yet populated' },
  { name: 'StateGuide', fields: 12, relations: ['CountyGuide'], note: '⚠ Empty — not yet populated' },
  { name: 'CountyGuide', fields: 14, relations: ['StateGuide', 'ProviderDirectory'], note: '⚠ Empty — not yet populated' },
  { name: 'LifeEventHub', fields: 10, relations: [] },
  { name: 'LeadMagnet', fields: 15, relations: ['EstateTransitionLead'], note: '✓ 10 seeded records active' },
  { name: 'ProviderDirectory', fields: 14, relations: ['ProviderRoutingRule', 'TerritoryLaunch'] },
  { name: 'ProviderRoutingRule', fields: 9, relations: ['ProviderDirectory', 'EstateTransitionLead'] },
  { name: 'ProbateProviderRoutingRule', fields: 9, relations: ['ProbateLead'] },
  { name: 'TerritoryLaunch', fields: 14, relations: ['ProviderDirectory'] },
  { name: 'ItemKnowledgeBase', fields: 16, relations: ['DemandMetrics', 'SaleItemPricing'] },
  { name: 'WeeklyMarketReport', fields: 11, relations: ['ItemKnowledgeBase'] },
  { name: 'EstateSaleUniversityArticle', fields: 10, relations: [] },
  { name: 'ProbateChecklist', fields: 6, relations: ['ProbateLead'] },
  { name: 'ProbateContentJob', fields: 8, relations: ['ProbateState', 'ProbateCounty'] },
  { name: 'SEOIndexLog', fields: 7, relations: [] },
  { name: 'SEOPage', fields: 14, relations: ['EstateSale'] },
  { name: 'SEOCityHub', fields: 10, relations: [] },
  { name: 'SEOCategoryHub', fields: 10, relations: [] },
  { name: 'SEOBrandHub', fields: 10, relations: [] },
  { name: 'LeadActivityLog', fields: 5, relations: ['EstateTransitionLead'] },
  { name: 'SubscriptionPackage', fields: 18, relations: [] },
  { name: 'OperatorWallet', fields: 8, relations: ['WalletTransaction', 'ReferralCommission'] },
  { name: 'WalletTransaction', fields: 9, relations: ['OperatorWallet'] },
  { name: 'ReferralCommission', fields: 8, relations: [] },
  { name: 'ReferralDealPipeline', fields: 12, relations: [] },
  { name: 'KPISnapshot', fields: 10, relations: [] },
  { name: 'SocialPost', fields: 12, relations: [] },
  { name: 'SocialCampaign', fields: 10, relations: [] },
  { name: 'TerritoryFBPost', fields: 8, relations: ['TerritoryFBPage'] },
  { name: 'WeeklyVideoBatch', fields: 8, relations: ['WeeklyVideoItem'] },
  { name: 'ScrapedSaleOperator', fields: 14, relations: [] },
  { name: 'AutonomousAgentRun', fields: 10, relations: ['AutonomousAgentAction', 'AutonomousAgentToolLog'] },
  { name: 'AdminAISettings', fields: 8, relations: [] },
  { name: 'MarketingIntegrationSettings', fields: 6, relations: [] },
  { name: 'EarlySignIn', fields: 8, relations: ['EstateSale'] },
];

const FUNCTIONS = [
  // Lead Engine
  { name: 'onEstateTransitionLeadCreated', phase: 4, status: 'DONE' },
  { name: 'scoreEstateTransitionLead', phase: 4, status: 'DONE' },
  { name: 'routeEstateTransitionLead', phase: 4, status: 'DONE' },
  { name: 'sendEstateTransitionEmailSequence', phase: 4, status: 'DONE' },
  { name: 'processEstateTransitionSequence', phase: 4, status: 'DONE' },
  { name: 'downloadLeadMagnet', phase: 11, status: 'DONE' },
  { name: 'generateLeadMagnet', phase: 11, status: 'DONE' },
  { name: 'createProbateLead', phase: 9, status: 'DONE' },
  // SEO Engine
  { name: 'onSalePublished', phase: 2, status: 'DONE' },
  { name: 'generateSaleSeoPage', phase: 2, status: 'DONE' },
  { name: 'processItemSeoOnSaleUpdate', phase: 2, status: 'DONE' },
  { name: 'generateItemSEO', phase: 2, status: 'DONE' },
  { name: 'generateCityHubPage', phase: 2, status: 'DONE' },
  { name: 'generateCategoryHubPage', phase: 2, status: 'DONE' },
  { name: 'generateBrandHubPage', phase: 2, status: 'DONE' },
  { name: 'generateInventoryBasedBlogPosts', phase: 2, status: 'DONE' },
  { name: 'generateFullSitemap', phase: 2, status: 'DONE' },
  { name: 'generateInternalLinks', phase: 2, status: 'DONE' },
  { name: 'internalLinkingEngine', phase: 2, status: 'DONE' },
  { name: 'refreshAllLocalSEOHubs', phase: 2, status: 'DONE' },
  { name: 'generateStateHubPage', phase: 2, status: 'DONE' },
  { name: 'generateCountyHubPage', phase: 2, status: 'DONE' },
  { name: 'generateSchemaJson', phase: 2, status: 'DONE' },
  { name: 'generateSeoContent', phase: 2, status: 'DONE' },
  { name: 'generateSeoSlug', phase: 2, status: 'DONE' },
  { name: 'fetchSearchConsoleData', phase: 2, status: 'DONE' },
  { name: 'submitPageToIndex', phase: 2, status: 'DONE' },
  { name: 'backfillSEOPipeline', phase: 2, status: 'DONE' },
  { name: 'sitemap', phase: 2, status: 'DONE' },
  { name: 'robotsTxt', phase: 2, status: 'DONE' },
  // Knowledge Engine
  { name: 'extractDemandSignals', phase: 3, status: 'DONE' },
  { name: 'extractKnowledgeFromItem', phase: 3, status: 'DONE' },
  { name: 'recomputeDemandScores', phase: 3, status: 'DONE' },
  { name: 'googleLensPricing', phase: 3, status: 'DONE' },
  { name: 'generateSaleRecap', phase: 3, status: 'DONE' },
  { name: 'generateWeeklyMarketReport', phase: 3, status: 'DONE' },
  { name: 'generateWeeklyVideoBatch', phase: 3, status: 'DONE' },
  { name: 'generateYoutubeRecapScript', phase: 3, status: 'DONE' },
  { name: 'generateItemGuide', phase: 3, status: 'DONE' },
  // SEO Report
  { name: 'weeklySeoReportGenerator', phase: 2, status: 'DONE' },
  { name: 'generateDailySEOBoosts', phase: 2, status: 'DONE' },
  { name: 'generateOperatorSEOProfile', phase: 2, status: 'DONE' },
  { name: 'sendOperatorSEODigest', phase: 2, status: 'DONE' },
  { name: 'generateSaleImageSEO', phase: 2, status: 'FAILED', note: '5 consecutive failures, auto-paused' },
  // Life Transition Engine
  { name: 'generateStateGuide', phase: 10, status: 'DONE' },
  { name: 'generateCountyGuide', phase: 10, status: 'DONE' },
  { name: 'generateLifeEventHub', phase: 10, status: 'DONE' },
  { name: 'generateEstateSaleUniversityArticle', phase: 10, status: 'DONE' },
  // Probate Engine
  { name: 'generateProbateStatePage', phase: 9, status: 'DONE' },
  // Phase 12
  { name: 'deployNJPhase12', phase: 12, status: 'DONE', note: 'Built; not yet executed' },
  // Marketing
  { name: 'generateSocialCampaign', phase: 6, status: 'DONE' },
  { name: 'generateSocialImage', phase: 6, status: 'DONE' },
  { name: 'generateMonthlySocialCalendar', phase: 6, status: 'DONE' },
  { name: 'publishSocialPost', phase: 6, status: 'DONE' },
  { name: 'scheduleSocialPost', phase: 6, status: 'DONE' },
  { name: 'approveSocialPost', phase: 6, status: 'DONE' },
  { name: 'pushPostToSocialMedia', phase: 6, status: 'DONE' },
  { name: 'generateMarketingInsights', phase: 6, status: 'DONE' },
  { name: 'recalculateMarketingStats', phase: 6, status: 'DONE' },
  { name: 'refreshCampaignStats', phase: 6, status: 'DONE' },
  { name: 'customerioService', phase: 6, status: 'DONE' },
  { name: 'customerioWebhookIngest', phase: 6, status: 'DONE' },
  { name: 'salePromotionEngine', phase: 6, status: 'DONE' },
  { name: 'syncMetaAdSpend', phase: 6, status: 'DONE' },
  { name: 'getFacebookCampaigns', phase: 6, status: 'DONE' },
  { name: 'createFacebookCampaign', phase: 6, status: 'DONE' },
  { name: 'createMetaCampaignDraft', phase: 6, status: 'DONE' },
  { name: 'launchMetaCampaign', phase: 6, status: 'DONE' },
  { name: 'generateFacebookAdCampaign', phase: 6, status: 'DONE' },
  { name: 'generateFacebookAdImage', phase: 6, status: 'DONE' },
  { name: 'generateFacebookLeadAIResponse', phase: 6, status: 'DONE' },
  { name: 'sendFacebookLeadAdminAlert', phase: 6, status: 'DONE' },
  { name: 'metaLeadWebhook', phase: 6, status: 'DONE' },
  { name: 'syncFutureOperatorCustomAudience', phase: 6, status: 'DONE' },
  // Territory & Agent
  { name: 'generateTerritoryFBPosts', phase: 7, status: 'DONE' },
  { name: 'publishTerritoryFBPost', phase: 7, status: 'DONE' },
  { name: 'launchTerritory', phase: 7, status: 'DONE' },
  { name: 'publishTerritoryPages', phase: 7, status: 'DONE' },
  { name: 'fetchHousioTerritories', phase: 7, status: 'DONE' },
  { name: 'getHouszuTerritories', phase: 7, status: 'DONE' },
  { name: 'getMatchingOperatorsForTerritory', phase: 7, status: 'DONE' },
  { name: 'getMatchingAgentsFromHouszu', phase: 7, status: 'DONE' },
  { name: 'getTerritoryMunicipalities', phase: 7, status: 'DONE' },
  { name: 'getAvailableOperatorsForAgentTerritory', phase: 7, status: 'DONE' },
  { name: 'notifyTopOperatorsForAgentTerritory', phase: 7, status: 'DONE' },
  { name: 'notifyAdminsOfApplication', phase: 7, status: 'DONE' },
  { name: 'requestAgentPartnership', phase: 5, status: 'DONE' },
  // Wallet & Commissions
  { name: 'requestOperatorWithdrawal', phase: 5, status: 'DONE' },
  { name: 'adminApproveWithdrawal', phase: 5, status: 'DONE' },
  { name: 'adminFreezeOperatorWallet', phase: 5, status: 'DONE' },
  { name: 'getOperatorWalletSummary', phase: 5, status: 'DONE' },
  { name: 'releasePendingWalletCredits', phase: 5, status: 'DONE' },
  { name: 'getOperatorCommissionsFromHouszu', phase: 5, status: 'DONE' },
  { name: 'getOperatorDealsFromHouszu', phase: 5, status: 'DONE' },
  { name: 'getCommissionsForOperator', phase: 5, status: 'DONE' },
  { name: 'generateReferralAgreement', phase: 5, status: 'DONE' },
  { name: 'generateReferralQR', phase: 5, status: 'DONE' },
  { name: 'createReferral', phase: 5, status: 'DONE' },
  { name: 'processReferralRewards', phase: 5, status: 'DONE' },
  { name: 'processResellerReferralReward', phase: 5, status: 'DONE' },
  { name: 'updateDealStage', phase: 5, status: 'DONE' },
  { name: 'checkLeadCircumvention', phase: 5, status: 'DONE' },
  { name: 'detectLeadViolation', phase: 5, status: 'DONE' },
  { name: 'acceptLeadAndGenerateAgreement', phase: 5, status: 'DONE' },
  { name: 'syncClosedDealFromHouszu', phase: 5, status: 'DONE' },
  { name: 'notifyHouszu_CloseDeal', phase: 5, status: 'DONE' },
  { name: 'notifyHouszu_DealStageUpdate', phase: 5, status: 'DONE' },
  { name: 'getHouszu_DealDetails', phase: 5, status: 'DONE' },
  // AI
  { name: 'aiCoach', phase: 8, status: 'DONE' },
  { name: 'operatorAiCoach', phase: 8, status: 'DONE' },
  { name: 'adminAiOperator', phase: 8, status: 'DONE' },
  { name: 'openaiAssistant', phase: 8, status: 'DONE' },
  { name: 'executeAutonomousRun', phase: 8, status: 'DONE' },
  { name: 'approveAutonomousRun', phase: 8, status: 'DONE' },
  { name: 'proposeAutonomousRun', phase: 8, status: 'DONE' },
  { name: 'cancelAutonomousRun', phase: 8, status: 'DONE' },
  { name: 'adminUpdateUserTier', phase: 8, status: 'DONE' },
  { name: 'createAdminTasksFromAIReport', phase: 8, status: 'DONE' },
  // Platform
  { name: 'archiveCompletedSaleImages', phase: 1, status: 'DONE' },
  { name: 'dailyCostRevenueAnalysis', phase: 1, status: 'DONE' },
  { name: 'sendNewSaleAlerts', phase: 1, status: 'FAILED', note: '2 consecutive failures' },
  { name: 'sendNotification', phase: 1, status: 'DONE' },
  { name: 'sendPersonalizedSaleNotifications', phase: 1, status: 'DONE' },
  { name: 'sendOutreachEmail', phase: 1, status: 'DONE' },
  { name: 'trackOutreachReplies', phase: 1, status: 'DONE' },
  { name: 'gmailCrmSync', phase: 1, status: 'DONE' },
  { name: 'bulkEnrichCompanyEmails', phase: 7, status: 'DONE' },
  { name: 'enrichCompanyEmail', phase: 7, status: 'DONE' },
  { name: 'geocodeZip', phase: 1, status: 'DONE' },
  { name: 'calculateDistance', phase: 1, status: 'DONE' },
  { name: 'scoreLeads', phase: 4, status: 'DONE' },
  { name: 'buildCleanLeadList', phase: 4, status: 'DONE' },
  { name: 'scrapeEstateSalesNet', phase: 7, status: 'DONE' },
  { name: 'pushSaleDataWebhook', phase: 1, status: 'DONE' },
  { name: 'receiveSaleUpdate', phase: 1, status: 'DONE' },
  { name: 'saleDataFeed', phase: 1, status: 'DONE' },
  { name: 'syncToBCRise', phase: 1, status: 'DONE' },
  { name: 'generateCartQR', phase: 1, status: 'DONE' },
  { name: 'processSoldItem', phase: 1, status: 'DONE' },
  { name: 'closeExpiredAuctions', phase: 1, status: 'DONE' },
  { name: 'postItemToEbay', phase: 1, status: 'DONE' },
  { name: 'postItemToEtsy', phase: 1, status: 'DONE' },
  { name: 'syncItemStatusAcrossChannels', phase: 1, status: 'DONE' },
  { name: 'getConfig', phase: 1, status: 'DONE' },
  { name: 'setUserAccountType', phase: 1, status: 'DONE' },
  { name: 'setDefaultAccountType', phase: 1, status: 'DONE' },
  { name: 'generateOnboardingRecommendations', phase: 1, status: 'DONE' },
  { name: 'backfillSalePrices', phase: 1, status: 'DONE' },
  { name: 'deduplicateCheckins', phase: 1, status: 'DONE' },
  { name: 'reconstructSaleImages', phase: 1, status: 'DONE' },
  { name: 'getPlatformAdCampaigns', phase: 6, status: 'DONE' },
  { name: 'listSearchConsoleSites', phase: 2, status: 'DONE' },
];

const PUBLIC_ROUTES = [
  // Estate Sales
  { route: '/', label: 'Home / EstateSale Finder', status: 'DONE' },
  { route: '/estate-sales', label: 'City Hub (by city/state)', status: 'DONE' },
  { route: '/companies', label: 'Company Profile Page', status: 'DONE' },
  { route: '/sale-recap', label: 'Sale Recap Page', status: 'DONE' },
  { route: '/price-guide', label: 'Price Guide', status: 'DONE' },
  { route: '/categories', label: 'Category Hub', status: 'DONE' },
  { route: '/brands', label: 'Brand Hub', status: 'DONE' },
  { route: '/blog', label: 'Blog Index', status: 'DONE' },
  { route: '/blog-post', label: 'Blog Post Detail', status: 'DONE' },
  { route: '/wanted', label: 'Wanted Items', status: 'DONE' },
  { route: '/items', label: 'Items Hub', status: 'DONE' },
  { route: '/items/:itemSlug', label: 'Item Detail', status: 'DONE' },
  { route: '/learn', label: 'University / Learn Hub', status: 'DONE' },
  { route: '/learn/:articleSlug', label: 'Article Detail', status: 'DONE' },
  // Probate Engine
  { route: '/probate', label: 'Probate National Hub', status: 'DONE' },
  { route: '/probate/:stateSlug', label: 'Probate State Page', status: 'PARTIAL', note: 'Route works; ProbateState data empty' },
  { route: '/probate/:stateSlug/:countySlug', label: 'Probate County Page', status: 'PARTIAL', note: 'Route works; ProbateCounty data empty' },
  // Checklist / Lead Magnet
  { route: '/estate-checklist', label: 'Estate Checklist (national)', status: 'DONE' },
  { route: '/estate-checklist/:lifeEventSlug', label: 'Checklist by Life Event', status: 'DONE' },
  { route: '/estate-checklist/:lifeEventSlug/:stateSlug', label: 'Checklist by State', status: 'DONE' },
  { route: '/estate-checklist/:lifeEventSlug/:stateSlug/:countySlug', label: 'Checklist by County', status: 'DONE' },
  { route: '/probate-checklist', label: 'Legacy Probate Checklist', status: 'DONE' },
  // Life Event Hubs (static)
  { route: '/pre-probate', label: 'Pre-Probate Hub', status: 'DONE' },
  { route: '/inherited-property', label: 'Inherited Property Hub', status: 'DONE' },
  { route: '/senior-downsizing', label: 'Senior Downsizing Hub', status: 'DONE' },
  { route: '/assisted-living-transition', label: 'Assisted Living Hub', status: 'DONE' },
  { route: '/divorce-property-sale', label: 'Divorce Property Hub', status: 'DONE' },
  { route: '/foreclosure-cleanout', label: 'Foreclosure Cleanout Hub', status: 'DONE' },
  { route: '/estate-cleanout', label: 'Estate Cleanout Hub', status: 'DONE' },
  { route: '/executor-guide', label: 'Executor Guide Hub', status: 'DONE' },
  { route: '/trustee-guide', label: 'Trustee Guide Hub', status: 'DONE' },
  { route: '/heir-guide', label: 'Heir Guide Hub', status: 'DONE' },
  { route: '/moving-sale', label: 'Moving Sale Hub', status: 'DONE' },
  { route: '/estate-settlement-planner', label: 'Estate Settlement Planner', status: 'DONE' },
  // Dynamic Life Event Routes
  { route: '/:lifeEventSlug/:stateSlug', label: 'Life Event State Page', status: 'PARTIAL', note: 'Route live; StateGuide/CountyGuide data empty' },
  { route: '/:lifeEventSlug/:stateSlug/:countySlug', label: 'Life Event County Page', status: 'PARTIAL', note: 'Route live; CountyGuide data empty' },
  { route: '/estate-sale-companies/:stateSlug/:countySlug', label: 'Estate Sale Companies by County', status: 'PARTIAL', note: 'Route live; provider data needs populating' },
  { route: '/probate-realtors/:stateSlug/:countySlug', label: 'Probate Realtors by County', status: 'PARTIAL', note: 'Route live; provider data needs populating' },
  // Consumer
  { route: '/BrowseOperators', label: 'Browse Operators', status: 'DONE' },
  { route: '/CompanyLanding', label: 'Company Landing', status: 'DONE' },
  { route: '/CheckIn', label: 'Check-In', status: 'DONE' },
  { route: '/RoutePlanner', label: 'Route Planner', status: 'DONE' },
];

const ADMIN_DASHBOARDS = [
  { name: 'AdminDashboard', label: 'Main Admin Dashboard', status: 'DONE' },
  { name: 'AdminProbateEngine', label: 'Probate SEO Engine', status: 'DONE' },
  { name: 'AdminLifeTransitionEngine', label: 'Life Transition Engine', status: 'DONE' },
  { name: 'AdminContentEngine', label: 'Content Engine (6 tabs)', status: 'DONE' },
  { name: 'AdminPhase12Deploy', label: 'Phase 12 NJ Deploy', status: 'DONE' },
  { name: 'PlatformSEODashboard', label: 'SEO Dashboard (GSC)', status: 'DONE' },
  { name: 'AdminTerritoryDashboard', label: 'Territory Dashboard', status: 'DONE' },
  { name: 'OperatorPayoutWallet', label: 'Operator Payout Wallet', status: 'DONE' },
  { name: 'AdminAIOperator', label: 'AI Estate Sale Company Owner Console', status: 'DONE' },
  { name: 'AutonomousRunsDashboard', label: 'Autonomous Runs', status: 'DONE' },
  { name: 'AdminAgentApplications', label: 'Agent Applications', status: 'DONE' },
  { name: 'AdminEstatesalesOrg', label: 'EstateSales.org Ops', status: 'DONE' },
  { name: 'ImportedSalesDashboard', label: 'EstateSales.net Scraper', status: 'DONE' },
  { name: 'AdminLeads', label: 'All Leads', status: 'DONE' },
  { name: 'AdminLeadImporter', label: 'Lead Importer', status: 'DONE' },
  { name: 'CustomerIODashboard', label: 'Customer.io Dashboard', status: 'DONE' },
  { name: 'CustomerIOReportingCenter', label: 'Customer.io Reporting', status: 'DONE' },
  { name: 'AdminAICredits', label: 'AI Credit Management', status: 'DONE' },
  { name: 'WeeklyVideoIntelligence', label: 'Weekly Video Intelligence', status: 'DONE' },
  { name: 'NationalCoverageGrid', label: 'National Coverage Grid', status: 'DONE' },
  { name: 'ActualRevenue', label: 'Actual Revenue', status: 'DONE' },
  { name: 'PlatformExpenses', label: 'Platform Expenses', status: 'DONE' },
  { name: 'ComprehensiveRevenue', label: 'Comprehensive Revenue', status: 'DONE' },
  { name: 'TerritoryFBManager', label: 'Territory FB Manager', status: 'DONE' },
  { name: 'SEOBoostDashboard', label: 'SEO Boost Dashboard', status: 'DONE' },
];

const AUTOMATIONS_LIST = [
  { name: 'Estate Transition — Daily Email Sequence Processor', type: 'Scheduled Daily', status: 'DONE', lastRun: 'Active' },
  { name: 'Estate Transition Lead — Score, Route, Email', type: 'Entity: EstateTransitionLead create', status: 'DONE', lastRun: 'Active' },
  { name: 'Weekly Video Intelligence — Monday Auto-Generate', type: 'Scheduled Weekly Mon', status: 'DONE', lastRun: 'Success' },
  { name: 'KE — Nightly Demand Score Recomputation', type: 'Scheduled Daily 2am', status: 'DONE', lastRun: 'Active' },
  { name: 'KE — Generate Sale Recap on Completion', type: 'Entity: EstateSale update', status: 'DONE', lastRun: 'Active' },
  { name: 'KE — Extract Demand Signals from Wanted Listings', type: 'Entity: WantedItem create', status: 'DONE', lastRun: 'Active' },
  { name: 'KE — Extract Knowledge from Google Lens Pricing', type: 'Entity: SaleItemPricing create', status: 'DONE', lastRun: 'Active' },
  { name: 'SEO Authority Engine — On Sale Published', type: 'Entity: EstateSale create/update', status: 'DONE', lastRun: 'Active' },
  { name: 'Internal Linking Engine — On SEOPage Publish', type: 'Entity: SEOPage create/update', status: 'DONE', lastRun: 'Success' },
  { name: 'Submit Sitemap When SEOPage Published', type: 'Entity: SEOPage create/update', status: 'FAILED', lastRun: 'submitSitemapToGSC not found' },
  { name: 'Daily Sitemap Refresh & GSC Submit', type: 'Scheduled Daily 7am', status: 'FAILED', lastRun: 'submitSitemapToGSC not found' },
  { name: 'Generate Blog Posts When Sale Published', type: 'Entity: EstateSale update', status: 'DONE', lastRun: 'Active' },
  { name: 'WeeklySeoReportGenerator', type: 'Scheduled Weekly Sun 11pm', status: 'DONE', lastRun: 'Success' },
  { name: 'Daily Local SEO Hub Refresh', type: 'Scheduled Daily 3am', status: 'DONE', lastRun: 'Success' },
  { name: 'Generate Category Hub on New Categorized Item', type: 'Entity: SEOItemProfile create/update', status: 'FAILED', lastRun: '1 failure' },
  { name: 'Generate Brand Hub on New Branded Item', type: 'Entity: SEOItemProfile create/update', status: 'FAILED', lastRun: '1 failure' },
  { name: 'Generate Sale SEO Page on Publish', type: 'Entity: EstateSale create/update', status: 'DONE', lastRun: 'Active' },
  { name: 'Process Item SEO on Sale Update', type: 'Entity: EstateSale update', status: 'DONE', lastRun: 'Success' },
  { name: 'Weekly Estate Sale Company Owner SEO Digest Email', type: 'Scheduled Weekly Mon 8am', status: 'DONE', lastRun: 'Success' },
  { name: 'Nightly Search Console Data Fetch', type: 'Scheduled Daily 1am', status: 'DONE', lastRun: 'Success' },
  { name: 'Nightly Estate Sale Company Owner SEO Authority Profile', type: 'Scheduled Daily 3am', status: 'DONE', lastRun: 'Success' },
  { name: 'Nightly Sale Image SEO Enrichment', type: 'Scheduled Daily 2am', status: 'FAILED', lastRun: '5 failures — PAUSED' },
  { name: 'Nightly Sale Completion & Image Downsize', type: 'Scheduled Daily 3am', status: 'DONE', lastRun: 'Success' },
  { name: 'Nightly Cost vs Revenue Analysis', type: 'Scheduled Daily 2am', status: 'DONE', lastRun: 'Success' },
  { name: 'Daily EstateSales.net Scraper', type: 'Scheduled Daily', status: 'DONE', lastRun: 'Success' },
  { name: 'Daily Territory FB Post Generator', type: 'Scheduled Daily 7am', status: 'DONE', lastRun: 'Success' },
  { name: 'Track Outreach Replies — Gmail', type: 'Connector: Gmail mailbox', status: 'DONE', lastRun: 'Success' },
  { name: 'New Sale Alert Emails', type: 'Entity: EstateSale create', status: 'FAILED', lastRun: '2 failures' },
  { name: 'Nightly Campaign Stats Snapshot', type: 'Scheduled Daily midnight', status: 'DONE', lastRun: 'Success' },
  { name: 'Daily SEO Boost Generation', type: 'Scheduled Daily 3am', status: 'DONE', lastRun: 'Success' },
  { name: 'Sync Item Status Across Channels', type: 'Entity: Item update', status: 'DONE', lastRun: 'Success' },
  { name: 'Push Sale Data on Change', type: 'Entity: EstateSale create/update', status: 'DONE', lastRun: 'Success' },
  { name: 'Push Sale Data on Item Change', type: 'Entity: Item create/update/delete', status: 'DONE', lastRun: 'Success' },
  { name: 'Push Sale Data on EstateSale Change', type: 'Entity: EstateSale create/update', status: 'DONE', lastRun: 'Success' },
];

const MISSING_ITEMS = [
  'ProbateState table is empty — Phase 12 deploy button must be executed to populate NJ data. All other states require the generate function to be triggered per state.',
  'ProbateCounty table is empty — same as above; deploy or run generateProbateStatePage per state/county.',
  'StateGuide table is empty — generateStateGuide function exists but has not been run for any state.',
  'CountyGuide table is empty — generateCountyGuide function exists but has not been run for any county.',
  'ProviderDirectory has no records — operators, probate realtors, cleanout vendors, and investors must be added and assigned to NJ counties (Monmouth, Ocean, Middlesex) to activate provider-match CTAs on all life event pages.',
  'TerritoryLaunch has no NJ territory record — no operator, agent, cleanout vendor, or investor assigned to any NJ county.',
  '"Submit Sitemap When SEOPage Published" automation references function submitSitemapToGSC which does not exist as a backend function — automation will always fail. Needs to be repointed to generateFullSitemap or submitPageToIndex.',
  '"Daily Sitemap Refresh & GSC Submit" automation has same issue — submitSitemapToGSC not found.',
  '"Nightly Sale Image SEO Enrichment" automation is PAUSED with 5 consecutive failures — function generateSaleImageSEO needs debugging.',
  '"New Sale Alert Emails" automation has 2 consecutive failures — sendNewSaleAlerts function needs debugging.',
  '"Generate Category Hub on New Categorized Item" automation has 1 failure — generateCategoryHubPage needs investigation.',
  '"Generate Brand Hub on New Branded Item" automation has 1 failure — generateBrandHubPage needs investigation.',
  'Phase 12 deploy has NOT been executed — visit /AdminPhase12Deploy and click the Deploy button to generate all NJ draft content.',
  'No sitemap submission automation is successfully running — once Phase 12 content is generated and published, manually trigger generateFullSitemap from PlatformSEODashboard.',
  'LifeEventHub entity exists but no records have been seeded — generate hubs for each of the 14 life event types.',
  'No email nurture sequence is assigned to LeadMagnet downloads yet — downloadLeadMagnet function exists but verify it is wired to processEstateTransitionSequence for follow-up emails.',
];

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.MISSING;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
      <Icon className={`w-3 h-3 ${s.iconColor}`} />{s.label}
    </span>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-slate-200">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <Icon className="w-4 h-4 text-slate-500" />
            {title}
            {open ? <ChevronDown className="w-4 h-4 ml-auto text-slate-400" /> : <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
          </CardTitle>
        </CardHeader>
      </button>
      {open && <CardContent className="pt-0 pb-4 px-5">{children}</CardContent>}
    </Card>
  );
}

export default function AdminBuildReport() {
  const doneCount = PHASES.filter(p => p.status === 'DONE').length;
  const partialCount = PHASES.filter(p => p.status === 'PARTIAL').length;
  const fnDone = FUNCTIONS.filter(f => f.status === 'DONE').length;
  const fnFailed = FUNCTIONS.filter(f => f.status === 'FAILED').length;
  const routePartial = PUBLIC_ROUTES.filter(r => r.status === 'PARTIAL').length;
  const autoDone = AUTOMATIONS_LIST.filter(a => a.status === 'DONE').length;
  const autoFailed = AUTOMATIONS_LIST.filter(a => a.status === 'FAILED').length;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Build Completion Report — Phases 1–12</h1>
        <p className="text-slate-500 text-sm mt-1">EstateSalen Life Transition SEO Engine · Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* Top-level summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Phases Complete', value: `${doneCount}/12`, sub: `${partialCount} partial`, color: 'bg-green-50 border-green-200 text-green-800' },
          { label: 'Backend Functions', value: `${fnDone}`, sub: `${fnFailed} failing`, color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { label: 'Automations', value: `${autoDone}/${AUTOMATIONS_LIST.length}`, sub: `${autoFailed} failed`, color: autoFailed > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800' },
          { label: 'Missing Items', value: MISSING_ITEMS.length, sub: 'action required', color: 'bg-red-50 border-red-200 text-red-800' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-xs font-semibold">{c.label}</p>
            <p className="text-2xl font-bold mt-0.5">{c.value}</p>
            <p className="text-xs opacity-70">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Phase Summary */}
      <Section title="Phase Summary (1–12)" icon={ListChecks} defaultOpen={true}>
        <div className="space-y-2">
          {PHASES.map(p => (
            <div key={p.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs font-bold text-slate-400 w-12 shrink-0 pt-0.5">Ph. {p.id}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </Section>

      {/* Database Tables */}
      <Section title={`Database Tables — ${ENTITIES.length} entities`} icon={Database}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-semibold text-slate-600 pr-4">Table Name</th>
                <th className="text-left py-2 font-semibold text-slate-600 pr-4">Fields</th>
                <th className="text-left py-2 font-semibold text-slate-600 pr-4">Relationships</th>
                <th className="text-left py-2 font-semibold text-slate-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {ENTITIES.map(e => (
                <tr key={e.name} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-4 font-mono font-semibold text-slate-800">{e.name}</td>
                  <td className="py-1.5 pr-4 text-slate-600">{e.fields}</td>
                  <td className="py-1.5 pr-4 text-slate-500">{e.relations.length > 0 ? e.relations.join(', ') : '—'}</td>
                  <td className="py-1.5 text-slate-400 text-xs">{e.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Backend Functions */}
      <Section title={`Backend Functions — ${FUNCTIONS.length} total`} icon={Code2}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-semibold text-slate-600 pr-4">Function</th>
                <th className="text-left py-2 font-semibold text-slate-600 pr-4">Phase</th>
                <th className="text-left py-2 font-semibold text-slate-600 pr-4">Status</th>
                <th className="text-left py-2 font-semibold text-slate-600">Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {FUNCTIONS.map(f => (
                <tr key={f.name} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-4 font-mono text-slate-800">{f.name}</td>
                  <td className="py-1.5 pr-4 text-slate-500">{f.phase}</td>
                  <td className="py-1.5 pr-4">
                    <StatusBadge status={f.status} />
                    {f.note && <span className="ml-2 text-red-500">{f.note}</span>}
                  </td>
                  <td className="py-1.5 text-slate-400 font-mono">/api/functions/{f.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Public Routes */}
      <Section title={`Public Pages — ${PUBLIC_ROUTES.length} routes`} icon={Globe}>
        <div className="space-y-1">
          {PUBLIC_ROUTES.map(r => (
            <div key={r.route} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0 text-xs">
              <code className="font-mono text-slate-600 w-32 sm:w-80 shrink-0">{r.route}</code>
              <span className="flex-1 text-slate-500">{r.label}</span>
              <StatusBadge status={r.status} />
              {r.note && <span className="text-amber-600 text-xs max-w-xs">{r.note}</span>}
            </div>
          ))}
        </div>
      </Section>

      {/* Admin Dashboards */}
      <Section title={`Admin Dashboards — ${ADMIN_DASHBOARDS.length} pages`} icon={LayoutDashboard}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADMIN_DASHBOARDS.map(d => (
            <div key={d.name} className="flex items-center gap-3 py-1.5 text-xs">
              <StatusBadge status={d.status} />
              <Link to={`/${d.name}`} className="font-medium text-slate-700 hover:underline">{d.label}</Link>
              <code className="text-slate-400 font-mono text-xs">/{d.name}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* Automations */}
      <Section title={`Automations — ${AUTOMATIONS_LIST.length} total`} icon={Zap}>
        <div className="space-y-1.5">
          {AUTOMATIONS_LIST.map(a => (
            <div key={a.name} className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-0 text-xs">
              <StatusBadge status={a.status} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{a.name}</p>
                <p className="text-slate-400">{a.type} · {a.lastRun}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Missing Items */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4 text-red-500" />
            {MISSING_ITEMS.length} Missing / Action Required Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-5 px-5">
          <ol className="space-y-2 list-decimal list-outside ml-4">
            {MISSING_ITEMS.map((item, i) => (
              <li key={i} className="text-xs text-red-700 leading-relaxed">{item}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}