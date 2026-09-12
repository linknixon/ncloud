import SEO from "../components/SEO";
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const { showToast } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const turnstileRef = React.useRef(null);
  const [siteKey, setSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );

  const widgetIdRef = React.useRef(null);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!siteKey) return;
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
  }, [siteKey]);

  const { clearDraft } = useAutoSaveDraft('contact_form', formData, setFormData);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLocalhost && siteKey && !turnstileToken) {
      setTurnstileError('Please complete the CAPTCHA verification.');
      return;
    }
    setLoading(true);
    setTurnstileError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          turnstileToken: turnstileToken || (isLocalhost ? 'bypass-localhost' : '') 
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setSubmitted(true);
      showToast('Thank you! Your message has been sent to Nova Cloud Edges.', 'success');
      clearDraft();
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO title="Contact Us | Nova Cloud" description="Get in touch with Nova Cloud for dedicated support and inquiries." keywords="contact Nova Cloud, ISP support Kampala, IT consulting email" />
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.0rem', marginTop: '0.5rem' }}>Contact Nova Cloud Edges</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Have questions about our cloud infrastructure, enterprise software solutions, or technical services? Our Kampala team is ready to assist you.
          </p>
        </div>

        <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
          
          {/* Contact Details Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Kampala Headquarters</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Visit our main corporate offices or contact our support desk directly.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(233, 30, 99, 0.1)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <MapPin size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Physical Location</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  Lugga Zone, Ndejje, Wakiso, Uganda
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.1)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Phone size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Phone & Support Lines</h4>
                <a href="tel:0790001631" style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.95rem', textDecoration: 'none', display: 'inline-block', marginTop: '0.2rem' }}>
                  0790001631
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Mail size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Email Address</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  support@ncloud.co.ug
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Operating Hours</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  Monday - Friday: 8:00 AM - 5:00 PM EAT
                </p>
              </div>
            </div>

          </div>

          {/* Contact Form */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Send Us a Message</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Fill out the form below. Messages are logged into our MySQL support queue.
            </p>

            {submitted ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--accent-emerald)',
                padding: '2rem',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <CheckCircle2 size={40} color="var(--accent-emerald)" style={{ marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>Message Sent!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  We have received your inquiry and our support engineers will respond shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-secondary"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Samuel Okello"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. samuel@company.co.ug"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. 0790001631"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Technical Inquiry / Service Support"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Your Message *</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Write your message or technical request here..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                {turnstileError && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '600' }}>
                    {turnstileError}
                  </div>
                )}

                {siteKey && (
                  <div style={{ margin: '1rem 0' }}>
                    <div ref={turnstileRef}></div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
                  disabled={loading}
                >
                  {loading ? 'Sending Message...' : 'Submit Message'} <Send size={18} />
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
