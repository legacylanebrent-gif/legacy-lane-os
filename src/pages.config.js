import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Onboarding": Onboarding,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: __Layout,
};