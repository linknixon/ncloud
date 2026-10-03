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
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '999px',
              fontSize: '0.78rem',
              color: '#38bdf8',
              fontWeight: '700'
            }}>
              <span>🇺🇬 Sovereign Uganda Datacenter</span>
            </div>
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
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Accepted Uganda Payment Methods:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>MTN Mobile Money</span>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>Airtel Money</span>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>Visa / Mastercard</span>
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>Bank Wire (UGX / USD)</span>
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
