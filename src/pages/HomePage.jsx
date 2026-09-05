import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Cloud, 
  Cpu, 
  Mail, 
  ShieldCheck, 
  Server, 
  ArrowRight, 
  CheckCircle2, 
  Award, 
  ShoppingBag,
  Zap,
  ChevronLeft,
  ChevronRight,
  Building
} from 'lucide-react';

export default function HomePage({ setActivePage }) {
  const { addToCart } = useApp();

  // Hero Data Center Moving Image Slider
  const defaultSliders = [
    {
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80',
      title: 'Tier III Sovereign Cloud Edge Datacenter',
      subtitle: 'Redundant power, precision cooling, and direct fiber interconnects in Kampala'
    },
    {
      url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1400&q=80',
      title: 'High-Density Server Rack Colocation',
      subtitle: 'Dual A+B power feeds, 1Gbps unmetered bandwidth, and 99.99% uptime SLA'
    },
    {
      url: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=1400&q=80',
      title: 'Zimbra & QuickBooks Cloud Cluster Nodes',
      subtitle: 'Instant NVMe storage access with zero data sovereignty compliance risk'
    },
    {
      url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80',
      title: '24/7 Threat Intelligence Operations Center',
      subtitle: 'Expert Cyber Security Team monitoring enterprise defense round the clock'
    }
  ];

  const [sliderImages, setSliderImages] = useState(defaultSliders);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Automatic slide rotation every 3.8 seconds
  useEffect(() => {
    if (sliderImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderImages.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [sliderImages.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % Math.max(1, sliderImages.length));
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + sliderImages.length) % Math.max(1, sliderImages.length));

  // Dynamic API Data
  const [partners, setPartners] = useState([]);
  const [news, setNews] = useState([]);
  const [isoList, setIsoList] = useState([]);

  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    fetch('/api/sliders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const activeOnes = data.filter(s => s.active !== false).map(s => ({
            url: s.image || s.url,
            title: s.title,
            subtitle: s.subtitle
          }));
          if (activeOnes.length > 0) {
            setSliderImages(activeOnes);
          }
        }
      })
      .catch(() => {});
    fetch('/api/partners').then(res => res.json()).then(data => setPartners(data)).catch(() => {});
    fetch('/api/news').then(res => res.json()).then(data => setNews(data)).catch(() => {});
    fetch('/api/iso').then(res => res.json()).then(data => setIsoList(data)).catch(() => {});
    fetch('/api/products').then(res => res.json()).then(data => {
      if (Array.isArray(data)) {
        // Filter products marked as featured, or use first 4 if none are marked
        let featured = data.filter(p => p.badge && (p.badge.toLowerCase().includes('feature') || p.badge === 'Best Seller' || p.badge === 'Popular' || p.badge === 'Infrastructure'));
        if (featured.length === 0) featured = data.slice(0, 4);
        setFeaturedProducts(featured.slice(0, 4));
      }
    }).catch(() => {});
  }, []);


  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <SEO title="Nova Cloud Uganda | Enterprise ISP" description="Empowering your business with scalable internet and cloud infrastructure." keywords="best internet provider uganda, cloud infrastructure, enterprise connectivity" />
      
      {/* 1. Hero Section with Auto-Moving Data Center Image Slider */}
      <section style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#050a14', color: '#fff' }}>
        <div className="hero-slider-container" style={{ position: 'relative', height: '680px', width: '100%' }}>
          
          {sliderImages.map((slide, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: currentSlide === idx ? 1 : 0,
                transition: 'opacity 0.9s ease-in-out',
                zIndex: currentSlide === idx ? 1 : 0,
                pointerEvents: currentSlide === idx ? 'auto' : 'none'
              }}
            >
              <img
                src={slide.url}
                alt={slide.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.82) contrast(1.05)' }}
              />
              <div className="hero-slide-overlay" style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(5,10,20,0.2) 0%, rgba(5,10,20,0.45) 50%, rgba(5,10,20,0.82) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '2.5rem'
              }}>
                <div className="container" style={{ maxWidth: '1080px' }}>
                  
                  <h1 style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)', color: '#fff', fontWeight: '800', lineHeight: 1.25, marginBottom: '1.25rem', letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' }}>
                    {slide.title}
                  </h1>
                  
                  <p style={{ fontSize: '1.15rem', color: '#f8fafc', marginBottom: '2.25rem', maxWidth: '800px', margin: '0 auto 2.25rem', lineHeight: '1.6', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {slide.subtitle}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setActivePage('services')} className="btn-primary" style={{ padding: '1.05rem 2.5rem', fontSize: '1.1rem' }}>
                      Explore Services <ArrowRight size={20} />
                    </button>
                    <button onClick={() => setActivePage('shop')} className="btn-secondary" style={{ padding: '1.05rem 2.5rem', fontSize: '1.1rem', background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                      <ShoppingBag size={20} /> Colocation & Software
                    </button>
                  </div>

                </div>
              </div>
            </div>
          ))}

          {/* Slider Arrows */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Previous Slide"
            style={{
              position: 'absolute',
              left: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 25,
              background: 'rgba(5, 10, 20, 0.75)',
              color: '#ffffff',
              borderRadius: '999px',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronLeft size={30} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Next Slide"
            style={{
              position: 'absolute',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 25,
              background: 'rgba(5, 10, 20, 0.75)',
              color: '#ffffff',
              borderRadius: '999px',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              transition: 'all 0.2s ease'
            }}
          >
            <ChevronRight size={30} />
          </button>

          {/* Slider Indicators */}
          <div style={{ position: 'absolute', bottom: '1.75rem', left: '50%', transform: 'translateX(-50%)', zIndex: 25, display: 'flex', gap: '0.6rem' }}>
            {sliderImages.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setCurrentSlide(i)}
                style={{ width: currentSlide === i ? '32px' : '12px', height: '12px', borderRadius: '999px', background: currentSlide === i ? 'var(--secondary)' : 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
            ))}
          </div>

        </div>
      </section>

      {/* 2. ISO Standards & Security Compliance Section */}
      <section style={{ padding: '4.5rem 0', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto 2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)', fontWeight: '800', lineHeight: '1.3' }}>ISO Standards & Security Compliance</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
              International quality benchmarks for enterprise data security, zero-trust controls, and infrastructure availability.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
            {(isoList.length > 0 ? isoList : [
              { code: 'ISO/IEC 27001:2022', title: 'Information Security Management' },
              { code: 'ISO 9001:2015', title: 'Quality Management Systems' },
              { code: 'SOC 2 Type II', title: 'Data Center Security SLA' }
            ]).map((iso, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-main)', padding: '1.1rem 1.6rem', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', minWidth: '280px', textAlign: 'left' }}>
                <Award size={36} color="var(--primary)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.15rem', color: 'var(--primary)' }}>{iso.code}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>{iso.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Expert Cyber Security Team Spotlight Banner */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e3a8a 60%, #0284c7 100%)',
            color: '#fff',
            padding: '3.5rem',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2.5rem'
          }}>
            <div style={{ maxWidth: '780px' }}>
              <h2 style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)', color: '#fff', marginBottom: '1rem', fontWeight: '800', lineHeight: '1.28' }}>
                Expert Cyber Security Team
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.2rem', lineHeight: '1.7' }}>
                Nova Cloud Edges retains a dedicated <strong>Expert Cyber Security Team</strong> (CISSP, Certified Ethical Hackers) providing 24/7 Threat Intelligence SOC monitoring, endpoint protection, intrusion prevention, and Sophos Next-Gen Firewall management.
              </p>
            </div>

            <button
              onClick={() => setActivePage('about')}
              style={{ background: '#ffffff', color: 'var(--primary)', fontWeight: '800', padding: '1.1rem 2.25rem', borderRadius: '12px', fontSize: '1.05rem', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}
            >
              Consult Cyber Security Team <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Featured Digital Shop & Colocation Management */}
      <section style={{ padding: '5.5rem 0', background: 'var(--bg-card-hover)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.45rem, 2.4vw, 1.95rem)', fontWeight: '800', lineHeight: '1.3' }}>Featured Software & Colocation Racks</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.4rem', marginBottom: '1.25rem' }}>
              Enterprise software solutions, virtual private servers, and datacenter colocation.
            </p>
            <button onClick={() => setActivePage('shop')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}>
              View Digital Shop <ArrowRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.25rem' }}>
            {featuredProducts.map(prod => (
              <div key={prod.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span className="badge-tag" style={{ fontSize: '0.75rem' }}>{prod.badge}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                      {prod.currency} {prod.price.toLocaleString()} / mo
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', lineHeight: '1.35' }}>{prod.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', flex: 1, marginBottom: '1.75rem', lineHeight: '1.6' }}>
                    {prod.short_desc || prod.description || prod.desc}
                  </p>
                  <button onClick={() => addToCart(prod)} className="btn-primary" style={{ justifyContent: 'center', padding: '0.9rem' }}>
                    <ShoppingBag size={20} /> Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Industry Partners Section */}
      <section style={{ padding: '5.5rem 0', background: 'var(--bg-card)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.45rem, 2.4vw, 1.95rem)', fontWeight: '800', lineHeight: '1.3' }}>Our Trusted Technology Partners</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '720px', margin: '0.5rem auto 0' }}>
              We collaborate with global and regional technology leaders to guarantee enterprise connectivity, software licensing, and fiber interconnects.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.75rem', justifyContent: 'center' }}>
            {(partners.length > 0 ? partners : [
              { name: 'Google Cloud', category: 'Premier Cloud Partner', logo_url: 'https://www.gstatic.com/devrel-devsite/prod/v3e2bb97f1f91b7d5ee7d354bf5644781df52bd66bce68532ee81f62c01d4a896/cloud/images/cloud-logo.svg' },
              { name: 'Microsoft', category: 'Gold Cloud Solutions Provider', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
              { name: 'RENU Uganda', category: 'Research & Education Network', logo_url: 'https://renu.ac.ug/wp-content/uploads/2021/08/cropped-renu-logo-1.png' },
              { name: 'Raxio Data Centre', category: 'Tier III Colocation Facility', logo_url: 'https://raxio.co.ug/wp-content/uploads/2021/04/Raxio-logo.png' },
              { name: 'Liquid Intelligent Technologies', category: 'Cross-Border Fiber Transit', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Liquid_Intelligent_Technologies_logo.png' },
              { name: 'MTN Business Uganda', category: 'Enterprise Telecom & MPLS', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg' }
            ]).map((p, idx) => {
              const partnerLogo = p.logo_url || p.logo;
              return (
                <div key={p.id || idx} className="glass-card" style={{ textAlign: 'center', padding: '1.75rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(226, 232, 240, 0.8)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    overflow: 'hidden',
                    padding: '10px'
                  }}>
                    {partnerLogo ? (
                      <img
                        src={partnerLogo}
                        alt={p.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '50%'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(30, 58, 138, 0.15))',
                      display: partnerLogo ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      fontWeight: '800',
                      fontSize: '1.35rem'
                    }}>
                      {(p.name || 'P').charAt(0)}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.3rem' }}>{p.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>{p.category}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Latest Feeds & News Postings Section */}
      <section style={{ padding: '5.5rem 0', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.45rem, 2.4vw, 1.95rem)', fontWeight: '800', lineHeight: '1.3' }}>Latest News Postings & Feeds</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.4rem', marginBottom: '1.25rem' }}>
              Technical advisories, enterprise cloud updates, and ISO compliance releases.
            </p>
            <button onClick={() => setActivePage('about')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}>
              View More News <ArrowRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.25rem' }}>
            {(news.length > 0 ? news.slice(0, 3) : [
              { id: 1, title: 'Nova Cloud Edges Achieves ISO/IEC 27001 Certification', date: '2026-08-10', category: 'Security', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80' },
              { id: 2, title: 'Expanding High-Speed Data Center Colocation Racks', date: '2026-07-28', category: 'Infrastructure', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80' },
              { id: 3, title: 'Zimbra Collaboration Suite Migration Guide for Enterprise IT', date: '2026-07-15', category: 'Email', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' }
            ]).map((item, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img src={item.image} alt={item.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span className="badge-tag" style={{ fontSize: '0.7rem' }}>{item.category}</span>
                    <span>{item.date}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', lineHeight: '1.4', marginBottom: '1.25rem' }}>{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
