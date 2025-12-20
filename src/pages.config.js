import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import EstateSaleFinder from './pages/EstateSaleFinder';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Onboarding": Onboarding,
    "Dashboard": Dashboard,
    "EstateSaleFinder": EstateSaleFinder,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: __Layout,
};