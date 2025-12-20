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
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: __Layout,
};