import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { Cloud, Cpu, Mail, ShieldCheck, Server, CheckCircle2, ArrowRight, PhoneCall, Radio, BarChart3, Code2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ServicesPage({ setActivePage }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setServices(data);
        } else {
          setServices([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setServices([]);
        setLoading(false);
      });
  }, []);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Cloud': return Cloud;
      case 'Cpu': return Cpu;
      case 'Mail': return Mail;
      case 'ShieldCheck': return ShieldCheck;
      case 'Radio': return Radio;
      case 'BarChart3': return BarChart3;
      case 'Code2': return Code2;
      default: return Server;
    }
  };

  const filteredServices = services.filter(srv =>
    srv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (srv.summary && srv.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (srv.description && srv.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO title="Our Services & Solutions | Nova Cloud" description="Explore our premium ISP and IT solutions tailored for your business." keywords="dedicated internet, cloud hosting, managed IT services, structured cabling" />
      <div className="container">
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.1rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            Our Core Services & Technical Capabilities
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto', fontSize: '1.0rem' }}>
            We provide localized edge server hosting, enterprise ERP implementations, corporate email administration, cybersecurity defense, IoT edge gateways, and custom software engineering.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '440px', margin: '0 auto 3rem', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search services & capabilities..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        {/* Services List Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading core services...
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            No services found matching your search query.
          </div>
        ) : (
          <>
            {/* 2 Services Per Row Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '2rem' }}>
              {paginatedServices.map((srv, idx) => {
                const IconComponent = getIcon(srv.icon);
                const features = Array.isArray(srv.features) 
                  ? srv.features 
                  : (typeof srv.features === 'string' ? JSON.parse(srv.features) : []);

                return (
                  <div
                    key={srv.id || idx}
                    className="glass-card"
                    style={{
                      padding: '2rem',
                      borderRadius: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Icon & Title Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '14px',
                          background: 'var(--gradient-brand)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 6px 18px rgba(79, 70, 229, 0.3)'
                        }}>
                          <IconComponent size={28} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 0.35rem', lineHeight: '1.3' }}>
                            {srv.title}
                          </h2>
                          <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', lineHeight: '1.4' }}>
                            {srv.summary}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: '1.65', marginBottom: '1.25rem' }}>
                        {srv.description}
                      </p>

                      {/* Key Features Checkmark Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.65rem',
                        marginBottom: '1.5rem',
                        background: 'var(--bg-main)',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {features.map((feat, fIdx) => (
                          <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
                            <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                      <button
                        onClick={() => setActivePage('contact')}
                        className="btn-primary"
                        style={{ padding: '0.65rem 1.1rem', fontSize: '0.875rem' }}
                      >
                        <PhoneCall size={16} /> Request Quote
                      </button>
                      {srv.slug && (srv.slug.includes('quickbooks') || srv.slug.includes('email') || srv.slug.includes('vps')) ? (
                        <button
                          onClick={() => setActivePage('shop')}
                          className="btn-secondary"
                          style={{ padding: '0.65rem 1.1rem', fontSize: '0.875rem' }}
                        >
                          Order Online <ArrowRight size={16} />
                        </button>
                      ) : null}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (10 services per page) */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3.5rem' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '0.6rem 1.25rem' }}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '0.6rem 1.25rem' }}
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
