import React, { useState, useEffect } from 'react';
import { Cloud, Cpu, Mail, ShieldCheck, Server, CheckCircle2, ArrowRight, PhoneCall, Radio, BarChart3, Code2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ServicesPage({ setActivePage }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      <div className="container">
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.1rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            Our Core Services & Technical Capabilities
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto', fontSize: '1.0rem' }}>
            We provide localized edge server hosting, QuickBooks ERP implementation, Zimbra Email Experts server administration, cybersecurity defense, IoT edge gateways, and custom software engineering.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {paginatedServices.map((srv, idx) => {
                const IconComponent = getIcon(srv.icon);
                const features = Array.isArray(srv.features) 
                  ? srv.features 
                  : (typeof srv.features === 'string' ? JSON.parse(srv.features) : []);

                return (
                  <div
                    key={srv.id || idx}
                    className="glass-card responsive-2col"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(260px, 1fr) 2fr',
                      gap: '2.5rem',
                      padding: '2.5rem',
                      alignItems: 'center'
                    }}
                  >
                    {/* Icon & Title */}
                    <div>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'var(--gradient-brand)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        boxShadow: '0 6px 18px rgba(79, 70, 229, 0.3)'
                      }}>
                        <IconComponent size={32} />
                      </div>
                      <h2 style={{ fontSize: '1.6rem', marginBottom: '0.75rem', lineHeight: '1.3' }}>
                        {srv.title}
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {srv.summary}
                      </p>
                    </div>

                    {/* Features & Content */}
                    <div>
                      <p style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: '1.7' }}>
                        {srv.description}
                      </p>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '0.85rem',
                        marginBottom: '2rem'
                      }}>
                        {features.map((feat, fIdx) => (
                          <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: '600' }}>
                            <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                          onClick={() => setActivePage('contact')}
                          className="btn-primary"
                        >
                          <PhoneCall size={18} /> Request Service Quote
                        </button>
                        {srv.slug && (srv.slug.includes('quickbooks') || srv.slug.includes('email') || srv.slug.includes('vps')) ? (
                          <button
                            onClick={() => setActivePage('shop')}
                            className="btn-secondary"
                          >
                            Order License Online <ArrowRight size={18} />
                          </button>
                        ) : null}
                      </div>
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
