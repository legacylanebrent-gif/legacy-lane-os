import {
  BarChart2, Award, GitBranch, DollarSign, Briefcase, Users,
  Trash2, Heart, UserPlus, Warehouse, ShoppingBag, HandCoins,
  Megaphone, Zap, BarChart3, TrendingUp, FileText,
  Sparkles, GraduationCap, Network, MapPin
} from 'lucide-react';

// Single source of truth for every operator page link, organized by section.
// Consumed by src/pages/OperatorLinks.jsx — the sidebar shows only the core
// daily tools plus one "Operator Links" entry pointing at that hub page.
// ELITE: true pages require an Elite subscription (mirrors the old sidebar gate).
export const OPERATOR_LINK_SECTIONS = [
  {
    title: '🏆 Owner & Agent Hub',
    links: [
      { page: 'OperatorDashboard', label: 'Owner Dashboard', icon: BarChart2 },
      { page: 'AgentDashboard', label: 'Agent Dashboard', icon: Award },
      { page: 'ReferralDealPipeline', label: 'Referral Pipeline', icon: GitBranch },
      { page: 'OperatorCommissions', label: 'Commissions', icon: DollarSign },
      { page: 'AgentOperatorPortal', label: 'Owner Partnerships', icon: Briefcase },
      { page: 'AgentPartnerships', label: 'Agent Partnerships', icon: Users },
    ],
  },
  {
    title: '🏷 Sales Tools',
    links: [
      { page: 'CleanoutEditor', label: 'My Cleanouts', icon: Trash2 },
      { page: 'DonationEditor', label: 'My Donations', icon: Heart },
      { page: 'ManageTeam', label: 'Manage Team', icon: UserPlus },
      { page: 'StorageManagement', label: 'Storage Management', icon: Warehouse },
      { page: 'MyListings', label: 'Marketplace Listings', icon: ShoppingBag },
      { page: 'Buyouts', label: 'Buyouts', icon: HandCoins },
      { page: 'SaleConversionPipeline', label: 'Sale Pipeline', icon: TrendingUp },
    ],
  },
  {
    title: '📣 Marketing',
    links: [
      { page: 'MarketingTasks', label: 'Marketing Tasks', icon: Megaphone },
      { page: 'CampaignBuilder', label: 'Campaign Builder', icon: Zap, elite: true },
      { page: 'Campaigns', label: 'Campaigns', icon: Megaphone, elite: true },
      { page: 'Analytics', label: 'Analytics', icon: BarChart3, elite: true },
      { page: 'SocialAdsHub', label: 'Social Ads Hub', icon: Megaphone, elite: true },
    ],
  },
  {
    title: '💰 Finance',
    links: [
      { page: 'IncomeTracker', label: 'Income Tracker', icon: TrendingUp },
      { page: 'MyBusinessExpenses', label: 'Business Expenses', icon: FileText },
      { page: 'AIAssistant', label: 'AI Assistant', icon: Sparkles },
    ],
  },
  {
    title: '🎓 Education',
    links: [
      { page: 'Courses', label: 'Browse Courses', icon: GraduationCap },
      { page: 'MyCourses', label: 'My Courses', icon: GraduationCap },
      { page: 'TrainingBlog', label: 'Training Blog', icon: FileText },
    ],
  },
  {
    title: '🧭 Directory',
    links: [
      { page: 'Vendors', label: 'Vendors', icon: Network },
      { page: 'EstateSaleFinder', label: 'Find Estate Sales', icon: MapPin },
    ],
  },
];