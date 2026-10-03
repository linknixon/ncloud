import React from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Mail, Clock, ArrowRight, ShieldCheck, FileText, Rss } from 'lucide-react';

export default function Footer({ setActivePage }) {
  const { siteLogo } = useApp();

  const handleNav = (e, pageId) => {
    e.preventDefault();
    if (setActivePage) {
      setActivePage(pageId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleShopCategory = (e, categoryName) => {
    e.preventDefault();
    if (setActivePage) {
      setActivePage('shop');
      window.history.pushState({}, '', `/shop?category=${encodeURIComponent(categoryName)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer style={{
      background: 'var(--gradient-dark)',
      color: '#f8fafc',
      paddingTop: '4.5rem',
      paddingBottom: '2.5rem',
      borderTop: '1px solid var(--border-color)',
      marginTop: '5rem'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3.5rem'
        }}>
          
          {/* Column 1: Company Profile & Uganda Sovereign Cloud */}
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <a 
                href="/" 
                onClick={(e) => handleNav(e, 'home')}
                style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}
                title="Nova Cloud Edges Uganda"
              >
                {siteLogo ? (
                  <img src={siteLogo} alt="Nova Cloud Edges Logo" style={{ height: '46px', maxWidth: '200px', objectFit: 'contain' }} />
                ) : (
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
                      NOVA <span style={{ color: 'var(--accent-cyan)' }}>CLOUD EDGES</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.06em', fontWeight: '700', marginTop: '4px' }}>
                      EMPOWERING TECHNOLOGY SOLUTIONS
                    </div>
                  </div>
                )}
              </a>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              Nova Cloud Edges (U) Limited is Uganda's premier sovereign cloud edge hosting, enterprise ERP implementations, corporate email management, and cybersecurity defense provider registered in the Republic of Uganda.
            </p>
          </div>

          {/* Column 2: Public Navigation Links (All Public Pages) */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
              Public Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Home', path: '/', page: 'home' },
                { label: 'About Us & Leadership', path: '/about', page: 'about' },
                { label: 'Enterprise Cloud & IT Services', path: '/services', page: 'services' },
                { label: 'Nova Cloud Online Shop', path: '/shop', page: 'shop' },
                { label: 'Careers & Tech Jobs Uganda', path: '/jobs', page: 'jobs' },
                { label: 'Upcoming Tech Events & Summits', path: '/events', page: 'events' },
                { label: 'Cloud VPS & Hosting Plans', path: '/subscription', page: 'subscription' },
                { label: 'Contact Us & Kampala Helpdesk', path: '/contact', page: 'contact' },
                { label: 'Technology News & Advisories', path: '/news', page: 'news' }
              ].map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.path}
                    onClick={(e) => handleNav(e, link.page)}
                    style={{
                      color: '#cbd5e1',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      lineHeight: '1.4',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                  >
                    <ArrowRight size={13} color="var(--accent-cyan)" style={{ flexShrink: 0 }} /> {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Shop & Featured Solutions (Uganda Geo-Targeted) */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
              Shop & Sovereign Solutions
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Cloud VPS Hosting (Uganda IXP)', path: '/shop?category=Hosting+Services', cat: 'Hosting Services' },
                { label: 'High-Speed WiFi Access Passes', path: '/shop?category=WiFi+Vouchers', cat: 'WiFi Vouchers' },
                { label: 'Intuit QuickBooks Enterprise ERP', path: '/shop?category=Software+%26+Licenses', cat: 'Software & Licenses' },
                { label: 'Tier III Server Colocation Kampala', path: '/shop?category=Hosting+Services', cat: 'Hosting Services' },
                { label: 'Zimbra Corporate Mailbox & Admin', path: '/shop?category=Hosting+Services', cat: 'Hosting Services' },
                { label: 'MikroTik & Hardware Firewalls', path: '/shop?category=Hardware+%26+Security', cat: 'Hardware & Security' },
                { label: 'Internet Domain Names Registration', path: '/shop?category=Domain+Names', cat: 'Domain Names' }
              ].map((sol, idx) => (
                <li key={idx}>
                  <a
                    href={sol.path}
                    onClick={(e) => handleShopCategory(e, sol.cat)}
                    style={{
                      color: '#cbd5e1',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      lineHeight: '1.4',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-emerald)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                  >
                    <ArrowRight size={13} color="var(--accent-emerald)" style={{ flexShrink: 0 }} /> {sol.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Kampala Headquarters & Local Payment Methods */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
              Kampala Headquarters
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <a 
                href="https://maps.google.com/?q=Lugga+Zone,+Ndejje,+Wakiso,+Uganda"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', color: '#cbd5e1', textDecoration: 'none' }}
                title="Open Google Maps location"
              >
                <MapPin size={18} color="var(--secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Lugga Zone, Ndejje, Wakiso, Kampala, Uganda</span>
              </a>
              <a 
                href="tel:0790001631" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', textDecoration: 'none' }}
                title="Call Nova Cloud Edges Support"
              >
                <Phone size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                <span>+256 790 001631 (Call / MoMo)</span>
              </a>
              <a 
                href="mailto:support@ncloud.co.ug" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#cbd5e1', textDecoration: 'none' }}
                title="Email Nova Cloud Edges"
              >
                <Mail size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span>support@ncloud.co.ug</span>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Clock size={18} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                <span>Mon - Fri: 8:00 AM - 5:00 PM EAT</span>
              </div>
            </div>

            {/* Accepted Local Ugandan Payment Methods */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Accepted Uganda Payment Methods:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                
                {/* MTN Mobile Money */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffcc00',
                  color: '#002b49',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} title="MTN Mobile Money Uganda (*165#)">
                  <svg width="18" height="12" viewBox="0 0 36 24" fill="none">
                    <rect width="36" height="24" rx="4" fill="#002b49"/>
                    <ellipse cx="18" cy="12" rx="14" ry="9" stroke="#ffcc00" strokeWidth="2.5"/>
                    <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="#ffcc00" fontSize="10" fontWeight="900" fontFamily="Arial, sans-serif">MTN</text>
                  </svg>
                  <span>MoMo</span>
                </div>

                {/* Airtel Money */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#e11900',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} title="Airtel Money Uganda (*185#)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c-2.49 0-4.5-2.01-4.5-4.5S8.51 7.5 11 7.5c1.47 0 2.77.71 3.59 1.8l-1.42 1.42C12.75 10.3 11.94 10 11 10c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5c1.15 0 2.11-.78 2.4-1.83H11v-2h4.5v.5c0 2.67-1.95 4.83-4.5 4.83z"/>
                  </svg>
                  <span>airtel money</span>
                </div>

                {/* Visa */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} title="Visa Card Checkout">
                  <svg width="34" height="14" viewBox="0 0 60 20" fill="none">
                    <path d="M23.5 1.5L16.2 18.5H11.3L6.8 5.4C6.5 4.3 6.3 3.9 5.4 3.4C3.9 2.6 1.8 1.9 0 1.5L0.2 0.7H8.5C9.6 0.7 10.6 1.5 10.8 2.8L13 14.1L17.8 0.7H23.5V1.5ZM44.2 12.8C44.2 8 37.4 7.7 37.4 5.5C37.4 4.7 38.2 3.9 39.8 3.7C40.6 3.6 42.8 3.5 45.2 4.6L46.1 0.8C44.8 0.3 43.1 0 41 0C36 0 32.5 2.6 32.5 6.4C32.5 9.2 35 10.7 36.9 11.7C38.9 12.6 39.6 13.3 39.6 14.2C39.6 15.6 38 16.2 36.4 16.2C33.8 16.2 32.3 15.8 31.1 15.2L30.1 19.2C31.5 19.8 34 20.3 36.6 20.3C41.9 20.3 44.2 17.7 44.2 12.8ZM57.2 18.5H61.6L57.8 0.7H53.8C52.8 0.7 52 1.3 51.6 2.2L44.1 18.5H49.1L50.1 15.8H56.2L56.7 18.5H57.2ZM51.5 12L53.9 5.5L55.3 12H51.5ZM31.2 0.7L27.2 18.5H22.5L26.5 0.7H31.2Z" fill="#1A1F71"/>
                  </svg>
                </div>

                {/* Mastercard */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#1e293b',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} title="Mastercard Worldwide">
                  <svg width="24" height="15" viewBox="0 0 38 24">
                    <circle cx="12" cy="12" r="10" fill="#EB001B"/>
                    <circle cx="26" cy="12" r="10" fill="#F79E1B"/>
                    <path d="M19 4.38a9.98 9.98 0 0 1 3.82 7.62 9.98 9.98 0 0 1-3.82 7.62 9.98 9.98 0 0 1-3.82-7.62A9.98 9.98 0 0 1 19 4.38z" fill="#FF5F00"/>
                  </svg>
                </div>

                {/* Bank Wire */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#e2e8f0',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: '700'
                }} title="Direct Bank Wire EFT / RTGS (UGX & USD)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="21" x2="21" y2="21"/>
                    <line x1="6" y1="18" x2="6" y2="11"/>
                    <line x1="10" y1="18" x2="10" y2="11"/>
                    <line x1="14" y1="18" x2="14" y2="11"/>
                    <line x1="18" y1="18" x2="18" y2="11"/>
                    <polygon points="12 2 20 7 4 7"/>
                  </svg>
                  <span>Bank Wire</span>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Footer Bottom Line */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.875rem',
          color: '#64748b'
        }}>
          <div>
            &copy; {new Date().getFullYear()} Nova Cloud Edges (U) Limited. All rights reserved. Sovereign Cloud Provider registered in the Republic of Uganda.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', color: '#94a3b8', flexWrap: 'wrap', alignItems: 'center' }}>
            <a 
              href="/terms" 
              onClick={(e) => handleNav(e, 'terms')} 
              style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.875rem' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
            >
              Terms of Reference & SLA
            </a>
            <span style={{ color: '#475569' }}>•</span>
            <a 
              href="/privacy" 
              onClick={(e) => handleNav(e, 'privacy')} 
              style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.875rem' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
            >
              Privacy Policy
            </a>
            <span style={{ color: '#475569' }}>•</span>
            <a 
              href="/verify" 
              onClick={(e) => handleNav(e, 'verify')} 
              style={{ 
                color: '#38bdf8', 
                textDecoration: 'none',
                fontSize: '0.875rem', 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: '600'
              }}
              title="Official Document Verification & Digital Clearance"
            >
              <ShieldCheck size={16} color="#38bdf8" /> Verify Document
            </a>
            <span style={{ color: '#475569' }}>•</span>
            <a 
              href="/sitemap.xml" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                color: '#94a3b8', 
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="XML Sitemap for Search Engines"
            >
              <FileText size={14} /> Sitemap
            </a>
            <span style={{ color: '#475569' }}>•</span>
            <a 
              href="/rss.xml" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                color: '#94a3b8', 
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Tech Advisories & RSS Feed"
            >
              <Rss size={14} /> RSS Feed
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
