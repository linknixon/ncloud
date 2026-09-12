import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, X, ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from "../context/AppContext";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { showToast } = useApp();

  // Registration Form State
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Turnstile State
  const turnstileRef = React.useRef(null);
  const widgetIdRef = React.useRef(null);
  const [siteKey, setSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/security/turnstile')
      .then(res => res.json())
      .then(data => {
        if (data.is_active && data.site_key) {
          setSiteKey(data.site_key);
          if (!document.getElementById('turnstile-script')) {
            const script = document.createElement('script');
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;
            script.id = 'turnstile-script';
            document.body.appendChild(script);
          }
        } else {
          setSiteKey('');
          if (data.bypass_allowed || isLocalhost) {
            setTurnstileToken('bypass-localhost');
          }
        }
      })
      .catch(() => {
        if (isLocalhost) setTurnstileToken('bypass-localhost');
      });
  }, []);

  useEffect(() => {
    if (!siteKey || !selectedEvent) return;
    let timer = null;
    let attempts = 0;

    const tryRender = () => {
      attempts++;
      if (window.turnstile && turnstileRef.current) {
        try {
          if (widgetIdRef.current !== null) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }
        } catch (e) {}
        turnstileRef.current.innerHTML = '';
        try {
          widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: siteKey,
            theme: 'light',
            callback: (token) => {
              setTurnstileToken(token);
              setTurnstileError('');
            },
            'error-callback': () => {
              console.warn('Turnstile challenge error');
            }
          });
        } catch (e) {
          console.error('Turnstile render exception:', e);
        }
      } else if (attempts < 100) {
        timer = setTimeout(tryRender, 120);
      }
    };

    timer = setTimeout(tryRender, 100);

    return () => {
      if (timer) clearTimeout(timer);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {}
      }
    };
  }, [siteKey, selectedEvent]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isLocalhost && siteKey && !turnstileToken) {
      setTurnstileError('Please complete the CAPTCHA verification.');
      return;
    }
    setSubmitting(true);
    setTurnstileError('');

    try {
      const res = await fetch(`/api/events/${selectedEvent.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          turnstileToken: turnstileToken || (isLocalhost ? 'bypass-localhost' : '') 
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to register');

      setSubmitted(true);
      showToast(data.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closeRegistration = () => {
    setSelectedEvent(null);
    setSubmitted(false);
    setFormData({ name: '', email: '', phone: '', company: '' });
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem', position: 'relative' }}>
      <SEO title="Events & Conferences | Nova Cloud" description="Register for upcoming technology events and cloud conferences." keywords="events, tech conference, cloud computing uganda" />
      <div className="container">
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span className="badge-tag">Events & Summits</span>
          <h1 style={{ fontSize: '2.6rem', marginTop: '0.5rem' }}>Upcoming Technology Events</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Join industry leaders, cloud architects, and cybersecurity experts at our upcoming conferences, webinars, and masterclasses.
          </p>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading upcoming events...
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            There are no upcoming events at the moment. Please check back later.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.25rem' }}>
            {events.map(item => (
              <div key={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                />
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                      <Calendar size={15} style={{ color: 'var(--primary)' }} /> {item.date}
                    </span>
                    <span className="badge-tag" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {item.location}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', lineHeight: '1.35', fontWeight: '800' }}>
                    {item.title}
                  </h2>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    {item.description}
                  </p>

                  <button
                    onClick={() => setSelectedEvent(item)}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Register Now <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* REGISTRATION MODAL */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={closeRegistration}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge-tag" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>Event Registration</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', lineHeight: '1.2' }}>{selectedEvent.title}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {selectedEvent.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {selectedEvent.location}</span>
                </div>
              </div>
              <button 
                onClick={closeRegistration}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <CheckCircle size={64} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Registration Successful!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                  Thank you for registering for {selectedEvent.title}. Your seat is secured!
                </p>
                <button onClick={closeRegistration} className="btn-secondary" style={{ padding: '0.6rem 2rem' }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label>Phone Number (Optional)</label>
                    <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Company / Organization</label>
                    <input type="text" className="form-input" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                  </div>
                </div>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div style={{ marginTop: '0.5rem' }}>
                  {turnstileError && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                      {turnstileError}
                    </div>
                  )}
                  {siteKey && !isLocalhost && (
                    <div ref={turnstileRef}></div>
                  )}
                  {isLocalhost && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                      [Dev Mode] Cloudflare CAPTCHA bypassed for localhost.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
                    {submitting ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
