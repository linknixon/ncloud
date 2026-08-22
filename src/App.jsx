import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import CartDrawer from './components/CartDrawer';
import Toast from './components/Toast';

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
import PrivacyPage from './pages/PrivacyPage';

export default function App() {
  const [activePage, setActivePage] = useState('home');

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
        return <SubscriptionPaymentPage />;
      case 'contact':
        return <ContactPage />;
      case 'about':
        return <AboutPage setActivePage={setActivePage} />;
      case 'news':
        return <NewsPage />;
      case 'terms':
        return <TermsPage setActivePage={setActivePage} />;
      case 'privacy':
        return <PrivacyPage setActivePage={setActivePage} />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <HomePage setActivePage={setActivePage} />;
    }
  };

  return (
    <AppProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar activePage={activePage} setActivePage={setActivePage} />
        <main style={{ flex: 1 }}>
          {renderPage()}
        </main>
        <Footer setActivePage={setActivePage} />

        {/* Floating Components */}
        <AuthModal />
        <CartDrawer onCheckout={() => setActivePage('subscription')} />
        <Toast />
      </div>
    </AppProvider>
  );
}
