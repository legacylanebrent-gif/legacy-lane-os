import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import SalePricingTool from './pages/SalePricingTool';
import ApiKeyManager from './pages/ApiKeyManager';
import ManageTeam from './pages/ManageTeam';
import AdminLeadsSocialAds from './pages/AdminLeadsSocialAds';
import AdminLeadsPropstream from './pages/AdminLeadsPropstream';
import AdminLeadsWebsite from './pages/AdminLeadsWebsite';
import AIAssistant from './pages/AIAssistant';
import SocialAdsHub from './pages/SocialAdsHub';
import AdminAICredits from './pages/AdminAICredits';
import MarketplaceItemDetail from './pages/MarketplaceItemDetail';
import ScanAndCart from './pages/ScanAndCart';
import CheckoutStation from './pages/CheckoutStation';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SalePipeline from './pages/SalePipeline';
import ReferralOutreach from './pages/ReferralOutreach';
import LeadFunnel from './pages/LeadFunnel';
import TerritoryHeatmap from './pages/TerritoryHeatmap';
import ContentCalendar from './pages/ContentCalendar';
import SEOBoostDashboard from './pages/SEOBoostDashboard';
import CSVLeadImport from './pages/CSVLeadImport';
import AdminLeadImporter from './pages/AdminLeadImporter';
import CompanyLanding from './pages/CompanyLanding';
import CompareEstateSales from './pages/CompareEstateSales';
import ReferralDashboard from './pages/ReferralDashboard';
import ReferralBatchInvite from './pages/ReferralBatchInvite';
import OperatorProfile from './pages/OperatorProfile';
import OperatorDashboard from './pages/OperatorDashboard';
import SoldInventory from './pages/SoldInventory';
import StorageManagement from './pages/StorageManagement';
import ViewStorageContents from './pages/ViewStorageContents';
import ResellerDashboard from './pages/ResellerDashboard';
import LandingPageSaleLeak from './pages/LandingPageSaleLeak';
import LandingPageProfitLevers from './pages/LandingPageProfitLevers';
import LandingPageScaleReady from './pages/LandingPageScaleReady';
import LandingPageCalculator from './pages/LandingPageCalculator';
import LandingPageChaosToControl from './pages/LandingPageChaosToControl';
import LandingPageOfferClose from './pages/LandingPageOfferClose';
import LandingPageFitFinder from './pages/LandingPageFitFinder';
import LandingPageReferralEngine from './pages/LandingPageReferralEngine';
import LandingPageAIPlan from './pages/LandingPageAIPlan';
import LandingPageRetarget from './pages/LandingPageRetarget';
import AgentPartnerships from './pages/AgentPartnerships';
import JoinReferralExchange from './pages/JoinReferralExchange';
import ReferralDealPipeline from './pages/ReferralDealPipeline';
import OperatorCommissions from './pages/OperatorCommissions';
import OperatorWalletDashboard from './pages/OperatorWalletDashboard.jsx';
import AdminWalletDashboard from './pages/AdminWalletDashboard.jsx';
import AdminAIOperator from './pages/AdminAIOperator.jsx';
import MarketingPreferences from './pages/MarketingPreferences';
import CustomerIODashboard from './pages/CustomerIODashboard';
import OperatorMarketingDashboard from './pages/OperatorMarketingDashboard';
import CustomerIOReportingCenter from './pages/CustomerIOReportingCenter';
import CheckIn from './pages/CheckIn';
import EarlySignIn from './pages/EarlySignIn';
import MyEarlySignIns from './pages/MyEarlySignIns';
import RoutePlanner from './pages/RoutePlanner';
import FavoriteCompanies from './pages/FavoriteCompanies';
import VendorProfile from './pages/VendorProfile';
import SaleConversionPipelinePage from './pages/SaleConversionPipeline';
import SettlementStatement from './pages/SettlementStatement';
import CompanyEmailEnrichment from './pages/CompanyEmailEnrichment';
import BrowseOperators from './pages/BrowseOperators';
import HowToUse from './pages/HowToUse';
import AgentOperatorPortal from './pages/AgentOperatorPortal';
import AdminAgentApplications from './pages/AdminAgentApplications';
import AdminTerritoryDashboard from './pages/AdminTerritoryDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminEstatesalesOrg from './pages/AdminEstatesalesOrg';
import FutOperLeads from './pages/FutOperLeads';
import AutonomousRunsDashboard from './pages/AutonomousRunsDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StateOperators from './pages/StateOperators';
import NationalCoverageGrid from './pages/NationalCoverageGrid';
import TerritoryFBManager from './pages/TerritoryFBManager';
import ImportedSalesDashboard from './pages/ImportedSalesDashboard';
import LandingPageOneDay from './pages/LandingPageOneDay';
import PlatformExpenses from './pages/PlatformExpenses';
import PlatformAds from './pages/PlatformAds';
import PlatformSEODashboard from './pages/PlatformSEODashboard.jsx';
import ActualRevenue from './pages/ActualRevenue';
import MySalesGuide from './pages/MySalesGuide';
import CityHubPage from './pages/CityHubPage';
import CategoryHubPage from './pages/CategoryHubPage';
import BrandHubPage from './pages/BrandHubPage';
import BlogPost from './pages/BlogPost';
import BlogIndex from './pages/BlogIndex';
import CompanyProfilePage from './pages/CompanyProfilePage';
import SaleRecapPage from './pages/SaleRecapPage';
import PriceGuidePage from './pages/PriceGuidePage';
import WantedItemsPage from './pages/WantedItemsPage';
import WeeklyVideoIntelligence from './pages/WeeklyVideoIntelligence';
import ProbateHub from './pages/ProbateHub';
import ProbateStatePage from './pages/ProbateStatePage';
import ProbateChecklist from './pages/ProbateChecklist';
import AdminProbateEngine from './pages/AdminProbateEngine';
import AdminLifeTransitionEngine from './pages/AdminLifeTransitionEngine';
import AdminContentEngine from './pages/AdminContentEngine';
import EstateChecklist from './pages/EstateChecklist';
import AdminPhase12Deploy from './pages/AdminPhase12Deploy';
import AdminBuildReport from './pages/AdminBuildReport';
import PropstreamREListings from './pages/PropstreamREListings';
import PropstreamREListingImporter from './pages/PropstreamREListingImporter';
import AgentListingEstateSaleRequest from './pages/AgentListingEstateSaleRequest';
import ClaimBusiness from './pages/ClaimBusiness';
import OnboardingChat from './pages/OnboardingChat';
import ResellerNetwork from './pages/ResellerNetwork';
import CleanoutNetwork from './pages/CleanoutNetwork';
import AdminCleanoutLeads from './pages/AdminCleanoutLeads';
import AgentRequestThankYou from './pages/AgentRequestThankYou';
import LaunchAuditCenter from './pages/LaunchAuditCenter';
import AdminHousioSync from './pages/AdminHousioSync';
import ResellerPackupEventEditor from './pages/ResellerPackupEventEditor';
import ResellerPackupEvents from './pages/ResellerPackupEvents';
import AdminCentralRepository from './pages/AdminCentralRepository';
import LandingPageBizInABox from './pages/LandingPageBizInABox';
import LaunchCommandCenter from './pages/LaunchCommandCenter';
import NotificationAnalytics from './pages/NotificationAnalytics';
import RelationshipHealthDashboard from './pages/RelationshipHealthDashboard';
import RelationshipsDashboard from './pages/RelationshipsDashboard';
import SuperAgentCommandCenter from './pages/SuperAgentCommandCenter.jsx';
import PropstreamAgentLeads from './pages/PropstreamAgentLeads';
import MobileHome from './pages/MobileHome';
import CollectorDealerDashboard from './pages/CollectorDealerDashboard';

// Life Transition SEO Engine — Phase 2
import ProbateHubV2 from './pages/life-transition/ProbateHubV2';
import PreProbateHub from './pages/life-transition/PreProbateHub';
import InheritedPropertyHub from './pages/life-transition/InheritedPropertyHub';
import SeniorDownsizingHub from './pages/life-transition/SeniorDownsizingHub';
import AssistedLivingHub from './pages/life-transition/AssistecdLivingHub';
import DivorcePropertyHub from './pages/life-transition/DivorcePropertyHub';
import ForeclosureCleanoutHub from './pages/life-transition/ForeclosureCleanoutHub';
import EstateCleanoutHub from './pages/life-transition/EstateCleanoutHub';
import ExecutorGuideHub from './pages/life-transition/ExecutorGuideHub';
import TrusteeGuideHub from './pages/life-transition/TrusteeGuideHub';
import HeirGuideHub from './pages/life-transition/HeirGuideHub';
import MovingSaleHub from './pages/life-transition/MovingSaleHub';
import ItemsHub from './pages/life-transition/ItemsHub';
import ItemDetailPage from './pages/life-transition/ItemDetailPage';
import LearnHub from './pages/life-transition/LearnHub';
import EstateSettlementPlanner from './pages/life-transition/EstateSettlementPlanner';
import LifeEventStatePage from './pages/life-transition/LifeEventStatePage';
import LifeEventCountyPage from './pages/life-transition/LifeEventCountyPage';
import ProviderDirectoryPage from './pages/life-transition/ProviderDirectoryPage';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/SalePricingTool" element={<LayoutWrapper currentPageName="SalePricingTool"><SalePricingTool /></LayoutWrapper>} />
      <Route path="/ApiKeyManager" element={<LayoutWrapper currentPageName="ApiKeyManager"><ApiKeyManager /></LayoutWrapper>} />
      <Route path="/ManageTeam" element={<LayoutWrapper currentPageName="ManageTeam"><ManageTeam /></LayoutWrapper>} />
      <Route path="/AdminLeadsSocialAds" element={<LayoutWrapper currentPageName="AdminLeadsSocialAds"><AdminLeadsSocialAds /></LayoutWrapper>} />
      <Route path="/AdminLeadsPropstream" element={<LayoutWrapper currentPageName="AdminLeadsPropstream"><AdminLeadsPropstream /></LayoutWrapper>} />
      <Route path="/AdminLeadsWebsite" element={<LayoutWrapper currentPageName="AdminLeadsWebsite"><AdminLeadsWebsite /></LayoutWrapper>} />
      <Route path="/AIAssistant" element={<LayoutWrapper currentPageName="AIAssistant"><AIAssistant /></LayoutWrapper>} />
      <Route path="/SocialAdsHub" element={<LayoutWrapper currentPageName="SocialAdsHub"><SocialAdsHub /></LayoutWrapper>} />
      <Route path="/AdminAICredits" element={<LayoutWrapper currentPageName="AdminAICredits"><AdminAICredits /></LayoutWrapper>} />
      <Route path="/MarketplaceItemDetail" element={<LayoutWrapper currentPageName="MarketplaceItemDetail"><MarketplaceItemDetail /></LayoutWrapper>} />
      <Route path="/ScanAndCart" element={<LayoutWrapper currentPageName="ScanAndCart"><ScanAndCart /></LayoutWrapper>} />
      <Route path="/CheckoutStation" element={<LayoutWrapper currentPageName="CheckoutStation"><CheckoutStation /></LayoutWrapper>} />
      <Route path="/SalePipeline" element={<LayoutWrapper currentPageName="SalePipeline"><SalePipeline /></LayoutWrapper>} />
      <Route path="/ReferralOutreach" element={<LayoutWrapper currentPageName="ReferralOutreach"><ReferralOutreach /></LayoutWrapper>} />
      <Route path="/LeadFunnel" element={<LayoutWrapper currentPageName="LeadFunnel"><LeadFunnel /></LayoutWrapper>} />
      <Route path="/TerritoryHeatmap" element={<LayoutWrapper currentPageName="TerritoryHeatmap"><TerritoryHeatmap /></LayoutWrapper>} />
      <Route path="/ContentCalendar" element={<LayoutWrapper currentPageName="ContentCalendar"><ContentCalendar /></LayoutWrapper>} />
      <Route path="/SEOBoostDashboard" element={<LayoutWrapper currentPageName="SEOBoostDashboard"><SEOBoostDashboard /></LayoutWrapper>} />
      <Route path="/CSVLeadImport" element={<LayoutWrapper currentPageName="CSVLeadImport"><CSVLeadImport /></LayoutWrapper>} />
      <Route path="/AdminLeadImporter" element={<LayoutWrapper currentPageName="AdminLeadImporter"><AdminLeadImporter /></LayoutWrapper>} />
      <Route path="/CompanyLanding" element={<CompanyLanding />} />
      <Route path="/CompareEstateSales" element={<CompareEstateSales />} />
      <Route path="/ReferralDashboard" element={<LayoutWrapper currentPageName="ReferralDashboard"><ReferralDashboard /></LayoutWrapper>} />
      <Route path="/ReferralBatchInvite" element={<LayoutWrapper currentPageName="ReferralBatchInvite"><ReferralBatchInvite /></LayoutWrapper>} />
      <Route path="/OperatorProfile" element={<LayoutWrapper currentPageName="OperatorProfile"><OperatorProfile /></LayoutWrapper>} />
      <Route path="/OperatorDashboard" element={<LayoutWrapper currentPageName="OperatorDashboard"><OperatorDashboard /></LayoutWrapper>} />
      <Route path="/SoldInventory" element={<LayoutWrapper currentPageName="SoldInventory"><SoldInventory /></LayoutWrapper>} />
      <Route path="/StorageManagement" element={<LayoutWrapper currentPageName="StorageManagement"><StorageManagement /></LayoutWrapper>} />
      <Route path="/ViewStorageContents" element={<LayoutWrapper currentPageName="ViewStorageContents"><ViewStorageContents /></LayoutWrapper>} />
      <Route path="/ResellerDashboard" element={<LayoutWrapper currentPageName="ResellerDashboard"><ResellerDashboard /></LayoutWrapper>} />
      <Route path="/CollectorDealerDashboard" element={<LayoutWrapper currentPageName="CollectorDealerDashboard"><CollectorDealerDashboard /></LayoutWrapper>} />
      <Route path="/LandingPageSaleLeak" element={<LandingPageSaleLeak />} />
      <Route path="/LandingPageProfitLevers" element={<LandingPageProfitLevers />} />
      <Route path="/LandingPageScaleReady" element={<LandingPageScaleReady />} />
      <Route path="/LandingPageCalculator" element={<LandingPageCalculator />} />
      <Route path="/LandingPageChaosToControl" element={<LandingPageChaosToControl />} />
      <Route path="/LandingPageOfferClose" element={<LandingPageOfferClose />} />
      <Route path="/LandingPageFitFinder" element={<LandingPageFitFinder />} />
      <Route path="/LandingPageReferralEngine" element={<LandingPageReferralEngine />} />
      <Route path="/LandingPageAIPlan" element={<LandingPageAIPlan />} />
      <Route path="/LandingPageRetarget" element={<LandingPageRetarget />} />
      <Route path="/LandingPageBizInABox" element={<LandingPageBizInABox />} />
      <Route path="/AgentPartnerships" element={<LayoutWrapper currentPageName="AgentPartnerships"><AgentPartnerships /></LayoutWrapper>} />
      <Route path="/JoinReferralExchange" element={<LayoutWrapper currentPageName="JoinReferralExchange"><JoinReferralExchange /></LayoutWrapper>} />
      <Route path="/ReferralDealPipeline" element={<LayoutWrapper currentPageName="ReferralDealPipeline"><ReferralDealPipeline /></LayoutWrapper>} />
      <Route path="/OperatorCommissions" element={<LayoutWrapper currentPageName="OperatorCommissions"><OperatorCommissions /></LayoutWrapper>} />
      <Route path="/OperatorWalletDashboard" element={<LayoutWrapper currentPageName="OperatorWalletDashboard"><OperatorWalletDashboard /></LayoutWrapper>} />
      <Route path="/AdminWalletDashboard" element={<LayoutWrapper currentPageName="AdminWalletDashboard"><AdminWalletDashboard /></LayoutWrapper>} />
      <Route path="/AdminAIOperator" element={<LayoutWrapper currentPageName="AdminAIOperator"><AdminAIOperator /></LayoutWrapper>} />
      <Route path="/MarketingPreferences" element={<LayoutWrapper currentPageName="MarketingPreferences"><MarketingPreferences /></LayoutWrapper>} />
      <Route path="/CustomerIODashboard" element={<LayoutWrapper currentPageName="CustomerIODashboard"><CustomerIODashboard /></LayoutWrapper>} />
      <Route path="/OperatorMarketingDashboard" element={<LayoutWrapper currentPageName="OperatorMarketingDashboard"><OperatorMarketingDashboard /></LayoutWrapper>} />
      <Route path="/CustomerIOReportingCenter" element={<LayoutWrapper currentPageName="CustomerIOReportingCenter"><CustomerIOReportingCenter /></LayoutWrapper>} />
      <Route path="/CheckIn" element={<CheckIn />} />
      <Route path="/EarlySignIn" element={<LayoutWrapper currentPageName="EarlySignIn"><EarlySignIn /></LayoutWrapper>} />
      <Route path="/MyEarlySignIns" element={<LayoutWrapper currentPageName="MyEarlySignIns"><MyEarlySignIns /></LayoutWrapper>} />
      <Route path="/RoutePlanner" element={<RoutePlanner />} />
      <Route path="/FavoriteCompanies" element={<LayoutWrapper currentPageName="FavoriteCompanies"><FavoriteCompanies /></LayoutWrapper>} />
      <Route path="/VendorProfile" element={<LayoutWrapper currentPageName="VendorProfile"><VendorProfile /></LayoutWrapper>} />
      <Route path="/SaleConversionPipeline" element={<LayoutWrapper currentPageName="SaleConversionPipeline"><SaleConversionPipelinePage /></LayoutWrapper>} />
      <Route path="/SettlementStatement" element={<LayoutWrapper currentPageName="SettlementStatement"><SettlementStatement /></LayoutWrapper>} />
      <Route path="/CompanyEmailEnrichment" element={<LayoutWrapper currentPageName="CompanyEmailEnrichment"><CompanyEmailEnrichment /></LayoutWrapper>} />
      <Route path="/BrowseOperators" element={<BrowseOperators />} />
      <Route path="/HowToUse" element={<LayoutWrapper currentPageName="HowToUse"><HowToUse /></LayoutWrapper>} />
      <Route path="/AgentOperatorPortal" element={<LayoutWrapper currentPageName="AgentOperatorPortal"><AgentOperatorPortal /></LayoutWrapper>} />
      <Route path="/AdminAgentApplications" element={<LayoutWrapper currentPageName="AdminAgentApplications"><AdminAgentApplications /></LayoutWrapper>} />
      <Route path="/AdminTerritoryDashboard" element={<LayoutWrapper currentPageName="AdminTerritoryDashboard"><AdminTerritoryDashboard /></LayoutWrapper>} />
      <Route path="/AgentDashboard" element={<LayoutWrapper currentPageName="AgentDashboard"><AgentDashboard /></LayoutWrapper>} />
      <Route path="/AdminEstatesalesOrg" element={<LayoutWrapper currentPageName="AdminEstatesalesOrg"><AdminEstatesalesOrg /></LayoutWrapper>} />
      <Route path="/FutOperLeads" element={<LayoutWrapper currentPageName="FutOperLeads"><FutOperLeads /></LayoutWrapper>} />
      <Route path="/AutonomousRunsDashboard" element={<LayoutWrapper currentPageName="AutonomousRunsDashboard"><AutonomousRunsDashboard /></LayoutWrapper>} />
      <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><AdminDashboard /></LayoutWrapper>} />
      <Route path="/StateOperators" element={<StateOperators />} />
      <Route path="/NationalCoverageGrid" element={<LayoutWrapper currentPageName="NationalCoverageGrid"><NationalCoverageGrid /></LayoutWrapper>} />
      <Route path="/TerritoryFBManager" element={<LayoutWrapper currentPageName="TerritoryFBManager"><TerritoryFBManager /></LayoutWrapper>} />
      <Route path="/ImportedSalesDashboard" element={<LayoutWrapper currentPageName="ImportedSalesDashboard"><ImportedSalesDashboard /></LayoutWrapper>} />
      <Route path="/LandingPageOneDay" element={<LandingPageOneDay />} />
      <Route path="/PlatformExpenses" element={<LayoutWrapper currentPageName="PlatformExpenses"><PlatformExpenses /></LayoutWrapper>} />
      <Route path="/PlatformAds" element={<LayoutWrapper currentPageName="PlatformAds"><PlatformAds /></LayoutWrapper>} />
      <Route path="/PlatformSEODashboard" element={<LayoutWrapper currentPageName="PlatformSEODashboard"><PlatformSEODashboard /></LayoutWrapper>} />
      <Route path="/ActualRevenue" element={<LayoutWrapper currentPageName="ActualRevenue"><ActualRevenue /></LayoutWrapper>} />
      <Route path="/MySalesGuide" element={<LayoutWrapper currentPageName="MySalesGuide"><MySalesGuide /></LayoutWrapper>} />

      {/* ── Knowledge Graph Public Routes ── */}
      <Route path="/estate-sales" element={<CityHubPage />} />
      <Route path="/categories" element={<CategoryHubPage />} />
      <Route path="/brands" element={<BrandHubPage />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog-post" element={<BlogPost />} />
      <Route path="/companies" element={<CompanyProfilePage />} />
      <Route path="/sale-recap" element={<SaleRecapPage />} />
      <Route path="/price-guide" element={<PriceGuidePage />} />
      <Route path="/wanted" element={<WantedItemsPage />} />
      <Route path="/WeeklyVideoIntelligence" element={<LayoutWrapper currentPageName="WeeklyVideoIntelligence"><WeeklyVideoIntelligence /></LayoutWrapper>} />
      <Route path="/AdminProbateEngine" element={<LayoutWrapper currentPageName="AdminProbateEngine"><AdminProbateEngine /></LayoutWrapper>} />
      <Route path="/AdminLifeTransitionEngine" element={<LayoutWrapper currentPageName="AdminLifeTransitionEngine"><AdminLifeTransitionEngine /></LayoutWrapper>} />
      <Route path="/AdminContentEngine" element={<LayoutWrapper currentPageName="AdminContentEngine"><AdminContentEngine /></LayoutWrapper>} />
      <Route path="/AdminPhase12Deploy" element={<LayoutWrapper currentPageName="AdminPhase12Deploy"><AdminPhase12Deploy /></LayoutWrapper>} />
      <Route path="/AdminBuildReport" element={<LayoutWrapper currentPageName="AdminBuildReport"><AdminBuildReport /></LayoutWrapper>} />
      <Route path="/PropstreamREListings" element={<LayoutWrapper currentPageName="PropstreamREListings"><PropstreamREListings /></LayoutWrapper>} />
      <Route path="/PropstreamREListingImporter" element={<LayoutWrapper currentPageName="PropstreamREListingImporter"><PropstreamREListingImporter /></LayoutWrapper>} />
      <Route path="/agent-listing-estate-sale-request" element={<AgentListingEstateSaleRequest />} />
      <Route path="/claim-business" element={<ClaimBusiness />} />
      <Route path="/reseller-network" element={<ResellerNetwork />} />
      <Route path="/cleanout-network" element={<CleanoutNetwork />} />
      <Route path="/AdminCleanoutLeads" element={<LayoutWrapper currentPageName="AdminCleanoutLeads"><AdminCleanoutLeads /></LayoutWrapper>} />
      <Route path="/LaunchAuditCenter" element={<LayoutWrapper currentPageName="LaunchAuditCenter"><LaunchAuditCenter /></LayoutWrapper>} />
      <Route path="/LaunchCommandCenter" element={<LayoutWrapper currentPageName="LaunchCommandCenter"><LaunchCommandCenter /></LayoutWrapper>} />
      <Route path="/AdminHousioSync" element={<LayoutWrapper currentPageName="AdminHousioSync"><AdminHousioSync /></LayoutWrapper>} />
      <Route path="/ResellerPackupEventEditor" element={<LayoutWrapper currentPageName="ResellerPackupEventEditor"><ResellerPackupEventEditor /></LayoutWrapper>} />
      <Route path="/ResellerPackupEvents" element={<LayoutWrapper currentPageName="ResellerPackupEvents"><ResellerPackupEvents /></LayoutWrapper>} />
      <Route path="/AdminCentralRepository" element={<LayoutWrapper currentPageName="AdminCentralRepository"><AdminCentralRepository /></LayoutWrapper>} />
      <Route path="/NotificationAnalytics" element={<LayoutWrapper currentPageName="NotificationAnalytics"><NotificationAnalytics /></LayoutWrapper>} />
      <Route path="/RelationshipHealthDashboard" element={<LayoutWrapper currentPageName="RelationshipHealthDashboard"><RelationshipHealthDashboard /></LayoutWrapper>} />
      <Route path="/RelationshipsDashboard" element={<LayoutWrapper currentPageName="RelationshipsDashboard"><RelationshipsDashboard /></LayoutWrapper>} />
      <Route path="/SuperAgentCommandCenter" element={<LayoutWrapper currentPageName="SuperAgentCommandCenter"><SuperAgentCommandCenter /></LayoutWrapper>} />
      <Route path="/PropstreamAgentLeads" element={<LayoutWrapper currentPageName="PropstreamAgentLeads"><PropstreamAgentLeads /></LayoutWrapper>} />
      <Route path="/agent-request" element={<AgentListingEstateSaleRequest />} />
      <Route path="/agent-request/thank-you" element={<AgentRequestThankYou />} />

      {/* ── Probate SEO Engine Public Routes ── */}
      <Route path="/probate" element={<ProbateHub />} />
      <Route path="/probate/:stateSlug" element={<ProbateStatePage />} />
      <Route path="/probate/:stateSlug/:countySlug" element={<ProbateStatePage />} />
      <Route path="/probate-checklist" element={<EstateChecklist />} />

      {/* ── Life Transition SEO Engine — Static Hubs ── */}
      <Route path="/pre-probate" element={<PreProbateHub />} />
      <Route path="/inherited-property" element={<InheritedPropertyHub />} />
      <Route path="/senior-downsizing" element={<SeniorDownsizingHub />} />
      <Route path="/assisted-living-transition" element={<AssistedLivingHub />} />
      <Route path="/divorce-property-sale" element={<DivorcePropertyHub />} />
      <Route path="/foreclosure-cleanout" element={<ForeclosureCleanoutHub />} />
      <Route path="/estate-cleanout" element={<EstateCleanoutHub />} />
      <Route path="/executor-guide" element={<ExecutorGuideHub />} />
      <Route path="/trustee-guide" element={<TrusteeGuideHub />} />
      <Route path="/heir-guide" element={<HeirGuideHub />} />
      <Route path="/moving-sale" element={<MovingSaleHub />} />
      <Route path="/items" element={<ItemsHub />} />
      <Route path="/items/:itemSlug" element={<ItemDetailPage />} />
      <Route path="/learn" element={<LearnHub />} />
      <Route path="/learn/:articleSlug" element={<LearnHub />} />
      <Route path="/estate-checklist" element={<EstateChecklist />} />
      <Route path="/estate-checklist/:lifeEventSlug" element={<EstateChecklist />} />
      <Route path="/estate-checklist/:lifeEventSlug/:stateSlug" element={<EstateChecklist />} />
      <Route path="/estate-checklist/:lifeEventSlug/:stateSlug/:countySlug" element={<EstateChecklist />} />
      <Route path="/estate-settlement-planner" element={<EstateSettlementPlanner />} />

      {/* ── Life Transition SEO Engine — Dynamic Routes ── */}
      <Route path="/estate-sale-companies" element={<ProviderDirectoryPage directoryType="estate-sale-companies" />} />
      <Route path="/estate-sale-companies/:stateSlug" element={<ProviderDirectoryPage directoryType="estate-sale-companies" />} />
      <Route path="/estate-sale-companies/:stateSlug/:countySlug" element={<ProviderDirectoryPage directoryType="estate-sale-companies" />} />
      <Route path="/probate-realtors" element={<ProviderDirectoryPage directoryType="probate-realtors" />} />
      <Route path="/probate-realtors/:stateSlug" element={<ProviderDirectoryPage directoryType="probate-realtors" />} />
      <Route path="/probate-realtors/:stateSlug/:countySlug" element={<ProviderDirectoryPage directoryType="probate-realtors" />} />
      <Route path="/:lifeEventSlug/:stateSlug" element={<LifeEventStatePage />} />
      <Route path="/:lifeEventSlug/:stateSlug/:countySlug" element={<LifeEventCountyPage />} />

      {/* ── Mobile Consumer App Routes ── */}
      <Route path="/OnboardingChat" element={<OnboardingChat />} />
      <Route path="/mobile" element={<MobileHome />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App