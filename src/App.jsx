import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import EditProfileModal from './components/EditProfileModal';
import CartDrawer from './components/CartDrawer';
import Toast from './components/Toast';
import BackToTop from './components/BackToTop';
import ErrorBoundary from './components/ErrorBoundary';

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

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
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
        '/verify-email': 'verify-email'
      };
      if (pageMap[path]) return pageMap[path];
    }
    return 'home';
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      let newPath = '/';
      if (activePage !== 'home' && activePage !== 'admin' && activePage !== 'verify' && activePage !== 'verify-email') {
        newPath = `/${activePage}`;
      } else if (activePage === 'admin') {
        newPath = '/admin';
      } else if (activePage === 'verify') {
        newPath = '/verify';
      } else if (activePage === 'verify-email') {
        newPath = window.location.pathname.includes('verify-email') ? window.location.pathname + window.location.search : '/verify-email';
      }
      if (currentPath !== newPath && !currentPath.includes('verify-email')) {
        window.history.pushState({}, '', newPath);
      }
    }
  }, [activePage]);

  useEffect(() => {
    const syncActivePageFromUrl = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const path = window.location.pathname;
        if (path === '/verify-email' || path.includes('verify-email') || params.get('token')) {
          setActivePage('verify-email');
        } else if (params.get('doc') || params.get('verify') || params.get('invoice') || params.get('payment') || params.get('quote') || params.get('ref') || params.get('view') === 'invoice' || params.get('view') === 'payment' || params.get('view') === 'verify' || path === '/verify') {
          setActivePage('verify');
        } else if (path === '/admin' || params.get('tab') || path === '/subscriptions') {
          setActivePage('admin');
        } else if (path === '/subscription') {
          setActivePage('subscription');
        } else {
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
          if (pageMap[path]) {
            setActivePage(pageMap[path]);
          } else {
            setActivePage('home');
          }
        }
      }
    };

    syncActivePageFromUrl();
    window.addEventListener('popstate', syncActivePageFromUrl);
    return () => window.removeEventListener('popstate', syncActivePageFromUrl);
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
          <CartDrawer onCheckout={() => setActivePage('subscription')} />
          <ShopCheckoutModal />
          <Toast />
          <BackToTop />
          <InstallPrompt />
        </div>
      </ErrorBoundary>
    </AppProvider>
  );
}
