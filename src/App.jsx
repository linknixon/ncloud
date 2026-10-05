import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import PasswordExpiryModal from './components/PasswordExpiryModal';
import CartDrawer from './components/CartDrawer';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import PaymentSuccessModal from './components/PaymentSuccessModal';

import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ShopPage from './pages/ShopPage';
import JobsPage from './pages/JobsPage';
import SubscriptionPaymentPage from './pages/SubscriptionPaymentPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/AdminDashboard';
import TermsPage from './pages/TermsPage';
import AboutPage from './pages/AboutPage';
import NewsPage from './pages/NewsPage';
import EventsPage from './pages/EventsPage';
import PrivacyPage from './pages/PrivacyPage';
import VerifyDocumentPage from './pages/VerifyDocumentPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

import ShopCheckoutModal from './components/ShopCheckoutModal';
import InstallPrompt from './components/InstallPrompt';

const getAppBasePath = () => {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  if (pathname.startsWith('/ncloud')) return '/ncloud';
  if (pathname.startsWith('/nova-website')) return '/nova-website';
  return '';
};

const resolvePageFromLocation = () => {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  const basePath = getAppBasePath();
  let path = window.location.pathname;
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  if (!path || path === '') path = '/';

  if (path === '/sitemap' || path === '/sitemap.xml') {
    if (typeof window !== 'undefined') window.location.replace('/sitemap.xml');
    return 'home';
  }
  if (path === '/rss' || path === '/rss.xml') {
    if (typeof window !== 'undefined') window.location.replace('/rss.xml');
    return 'home';
  }

  if (path === '/verify-email' || path.includes('verify-email') || params.get('token')) {
    return 'verify-email';
  }
  if (params.get('doc') || params.get('verify') || params.get('invoice') || params.get('payment') || params.get('quote') || params.get('ref') || params.get('view') === 'invoice' || params.get('view') === 'payment' || params.get('view') === 'verify' || path === '/verify') {
    return 'verify';
  }
  if (path === '/admin' || params.get('tab') || path === '/subscriptions') {
    return 'admin';
  }
  if (path === '/subscription') {
    return 'subscription';
  }

  if (params.get('product') || params.get('item')) {
    return 'shop';
  }

  const pageParam = params.get('page') || params.get('p');
  if (pageParam) {
    const cleanParam = pageParam.startsWith('/') ? pageParam : `/${pageParam}`;
    const directMatch = {
      '/': 'home', '/shop': 'shop', '/services': 'services', '/jobs': 'jobs', '/careers': 'careers',
      '/events': 'events', '/contact': 'contact', '/about': 'about', '/news': 'news',
      '/terms': 'terms', '/privacy': 'privacy', '/subscription': 'subscription',
      '/admin': 'admin', '/verify': 'verify', '/verify-email': 'verify-email'
    }[cleanParam];
    if (directMatch) return directMatch;
  }

  const hash = window.location.hash.replace('#', '').replace('/', '');
  if (hash) {
    const hashMatch = {
      'shop': 'shop', 'services': 'services', 'jobs': 'jobs', 'careers': 'careers',
      'events': 'events', 'contact': 'contact', 'about': 'about', 'news': 'news',
      'terms': 'terms', 'privacy': 'privacy', 'subscription': 'subscription',
      'admin': 'admin', 'verify': 'verify', 'verify-email': 'verify-email'
    }[hash];
    if (hashMatch) return hashMatch;
  }

  const pageMap = {
    '/': 'home',
    '/shop': 'shop',
    '/services': 'services',
    '/jobs': 'jobs',
    '/careers': 'careers',
    '/events': 'events',
    '/contact': 'contact',
    '/about': 'about',
    '/news': 'news',
    '/terms': 'terms',
    '/privacy': 'privacy',
    '/subscription': 'subscription',
    '/admin': 'admin',
    '/verify': 'verify',
    '/verify-email': 'verify-email',
    '/signup': 'home',
    '/register': 'home',
    '/login': 'home'
  };

  return pageMap[path] || 'home';
};

export default function App() {
  const [activePage, setActivePage] = useState(() => resolvePageFromLocation());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (typeof window !== 'undefined') {
      const basePath = getAppBasePath();
      const currentPath = window.location.pathname;
      let newRoute = '/';
      if (activePage !== 'home' && activePage !== 'admin' && activePage !== 'verify' && activePage !== 'verify-email') {
        newRoute = `/${activePage}`;
      } else if (activePage === 'admin') {
        newRoute = '/admin';
      } else if (activePage === 'verify') {
        newRoute = '/verify';
      } else if (activePage === 'verify-email') {
        newRoute = window.location.pathname.includes('verify-email') ? window.location.pathname + window.location.search : '/verify-email';
      }

      const targetPath = basePath ? (newRoute === '/' ? `${basePath}/` : `${basePath}${newRoute}`) : newRoute;
      if (currentPath !== targetPath && !currentPath.includes('verify-email')) {
        window.history.pushState({}, '', targetPath);
      }
    }
  }, [activePage]);

  useEffect(() => {
    const syncActivePageFromUrl = () => {
      setActivePage(resolvePageFromLocation());
    };

    window.addEventListener('popstate', syncActivePageFromUrl);
    window.addEventListener('hashchange', syncActivePageFromUrl);
    return () => {
      window.removeEventListener('popstate', syncActivePageFromUrl);
      window.removeEventListener('hashchange', syncActivePageFromUrl);
    };
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage setActivePage={setActivePage} />;
      case 'services':
        return <ServicesPage setActivePage={setActivePage} />;
      case 'shop':
        return <ShopPage setActivePage={setActivePage} />;
      case 'jobs':
        return <JobsPage />;
      case 'subscription':
        return <SubscriptionPaymentPage setActivePage={setActivePage} />;
      case 'contact':
        return <ContactPage />;
      case 'about':
        return <AboutPage setActivePage={setActivePage} />;
      case 'news':
        return <NewsPage />;
      case 'events':
        return <EventsPage setActivePage={setActivePage} />;
      case 'careers':
        return <JobsPage setActivePage={setActivePage} />;
      case 'terms':
        return <TermsPage setActivePage={setActivePage} />;
      case 'privacy':
        return <PrivacyPage setActivePage={setActivePage} />;
      case 'verify':
        return <VerifyDocumentPage setActivePage={setActivePage} />;
      case 'verify-email':
        return <VerifyEmailPage setActivePage={setActivePage} />;
      case 'admin':
        return <AdminDashboard setActivePage={setActivePage} />;
      default:
        return <HomePage setActivePage={setActivePage} />;
    }
  };

  return (
    <AppProvider>
      <ErrorBoundary setActivePage={setActivePage}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar activePage={activePage} setActivePage={setActivePage} />
          <main style={{ flex: 1 }}>
            <ErrorBoundary key={activePage} setActivePage={setActivePage} onReset={() => setActivePage(activePage)}>
              {renderPage()}
            </ErrorBoundary>
          </main>
          <Footer setActivePage={setActivePage} />

          {/* Floating Components */}
          <AuthModal setActivePage={setActivePage} />
          <EditProfileModal />
          <PasswordExpiryModal />
          <CartDrawer onCheckout={() => setActivePage('subscription')} />
          <ShopCheckoutModal />
          <PaymentSuccessModal />
          <Toast />
          <InstallPrompt />
        </div>
      </ErrorBoundary>
    </AppProvider>
  );
}
