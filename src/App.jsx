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