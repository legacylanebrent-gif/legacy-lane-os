import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import EstateSaleFinder from './pages/EstateSaleFinder';
import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses';
import CourseDetail from './pages/CourseDetail';
import CourseLearning from './pages/CourseLearning';
import BrowseItems from './pages/BrowseItems';
import MyListings from './pages/MyListings';
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
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: __Layout,
};