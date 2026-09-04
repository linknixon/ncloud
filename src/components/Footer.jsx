import React from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';

export default function Footer({ setActivePage }) {
  const { siteLogo } = useApp();
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '3rem',
          marginBottom: '3.5rem'
        }}>
          
          {/* Column 1: Company Profile */}
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
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
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.7' }}>
              Nova Cloud Edges (U) Limited is Uganda's premier provider of sovereign cloud edge hosting, enterprise ERP software implementations, corporate email solutions, and cybersecurity defense infrastructure.
            </p>
          </div>

          {/* Column 2: Featured Solutions Links */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: '700' }}>
              Featured Solutions
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Enterprise ERP & Accounting Software', page: 'shop' },
                { label: 'Corporate Email & Server Administration', page: 'services' },
                { label: 'Data Center Colocation & Rack Hosting', page: 'shop' },
                { label: 'Edge VPS Cloud Hosting (Uganda IXP)', page: 'shop' },
                { label: 'Next-Generation Network Firewalls', page: 'shop' },
                { label: 'Managed Security Operations Center (SOC)', page: 'services' }
              ].map((sol, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => setActivePage(sol.page)}
                    style={{
                      background: 'none',
                      color: '#cbd5e1',
                      fontSize: '0.925rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'left',
                      lineHeight: '1.4',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    <ArrowRight size={14} color="var(--accent-cyan)" style={{ flexShrink: 0 }} /> {sol.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Kampala Headquarters */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '1.25rem', fontWeight: '700' }}>
              Kampala Headquarters
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', color: '#cbd5e1', fontSize: '0.925rem', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <MapPin size={18} color="var(--secondary)" style={{ marginTop: '3px', flexShrink: 0 }} />
                <span>Plot 14 Parliament Avenue, Kampala, Uganda</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Phone size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                <span>0790001631</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Mail size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span>support@ncloud.co.ug</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Clock size={18} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                <span>Mon - Fri: 8:00 AM - 5:00 PM EAT</span>
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
            &copy; {new Date().getFullYear()} Nova Cloud Edges (U) Limited. All rights reserved. Registered in the Republic of Uganda.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', color: '#94a3b8', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setActivePage('terms')} style={{ background: 'none', color: '#cbd5e1', fontSize: '0.875rem', cursor: 'pointer' }}>
              Terms of Reference & SLA
            </button>
            <span style={{ color: '#475569' }}>•</span>
            <button onClick={() => setActivePage('privacy')} style={{ background: 'none', color: '#cbd5e1', fontSize: '0.875rem', cursor: 'pointer' }}>
              Privacy Policy
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
