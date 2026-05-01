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