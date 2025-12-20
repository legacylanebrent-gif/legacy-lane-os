import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import EstateSaleFinder from './pages/EstateSaleFinder';
import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses';
import CourseDetail from './pages/CourseDetail';
import CourseLearning from './pages/CourseLearning';
import BrowseItems from './pages/BrowseItems';
import MyListings from './pages/MyListings';
import Campaigns from './pages/Campaigns';
import CampaignBuilder from './pages/CampaignBuilder';
import Analytics from './pages/Analytics';
import CRM from './pages/CRM';
import Pipeline from './pages/Pipeline';
import ContactDetail from './pages/ContactDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Onboarding": Onboarding,
    "Dashboard": Dashboard,
    "EstateSaleFinder": EstateSaleFinder,
    "Courses": Courses,
    "MyCourses": MyCourses,
    "CourseDetail": CourseDetail,
    "CourseLearning": CourseLearning,
    "BrowseItems": BrowseItems,
    "MyListings": MyListings,
    "Campaigns": Campaigns,
    "CampaignBuilder": CampaignBuilder,
    "Analytics": Analytics,
    "CRM": CRM,
    "Pipeline": Pipeline,
    "ContactDetail": ContactDetail,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: __Layout,
};