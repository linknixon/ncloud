import SEO from "../components/SEO";
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Copy, Check, Ticket, AlertCircle, Printer } from 'lucide-react';
import { generateTicketThreadPDF } from '../utils/pdfGenerator';

export default function ContactPage() {
  const { showToast, siteLogo } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'General Technical Support',
    priority: 'medium',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);


  const turnstileRef = React.useRef(null);
  const [siteKey, setSiteKey] = useState(() => {
    try {
      return sessionStorage.getItem('nova_turnstile_site_key') || '';
    } catch (e) {
      return '';
    }
  });
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
          try {
            sessionStorage.setItem('nova_turnstile_site_key', data.site_key);
          } catch (e) {}

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
          try {
            sessionStorage.removeItem('nova_turnstile_site_key');
          } catch (e) {}
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
            execution: 'render',
            'refresh-expired': 'auto',
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
      } else if (attempts < 60) {
        timer = setTimeout(tryRender, 60);
      }
    };

    tryRender();

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
      const dataPayload = new FormData();
      Object.keys(formData).forEach(key => dataPayload.append(key, formData[key]));
      dataPayload.append('turnstileToken', turnstileToken || (isLocalhost ? 'bypass-localhost' : ''));
      Array.from(files).forEach(file => dataPayload.append('attachments', file));

      const res = await fetch('/api/contact', {
        method: 'POST',
        body: dataPayload
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      const generatedNum = data.ticket_number || data.contact?.ticket_number || '';
      const fullTicketObj = {
        ...(data.contact || {}),
        ticket_number: generatedNum,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        category: formData.category,
        priority: formData.priority,
        subject: formData.subject,
        message: formData.message,
        source: 'Website Contact Form',
        created_at: new Date().toISOString()
      };
      setTicketNumber(generatedNum);
      setSubmittedEmail(formData.email);
      setSubmittedTicket(fullTicketObj);
      setSubmitted(true);
      showToast(generatedNum ? `Support Ticket #${generatedNum} created!` : 'Support request logged successfully!', 'success');
      clearDraft();
      setFiles([]);
      setFormData({
        name: '',
        email: '',
        phone: '',
        category: 'General Technical Support',
        priority: 'medium',
        subject: '',
        message: ''
      });
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
            <div style={{ marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Support Desk & Inquiries</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Fill out the form below. Messages generate an official support ticket and notify our engineering team immediately.
            </p>

            {submitted ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)',
                border: '1px solid var(--accent-emerald)',
                padding: '2.5rem 1.75rem',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <CheckCircle2 size={32} color="var(--accent-emerald)" />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Support Ticket Generated!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
                  We have logged your request into our engineering queue. A formal ticket reference has been generated for your inquiry.
                </p>

                {ticketNumber && (
                  <div style={{
                    background: 'var(--card-bg, var(--bg-card, #ffffff))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: '700' }}>
                        Your Ticket Number
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: '800', color: '#0284c7', letterSpacing: '0.5px' }}>
                        {ticketNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(ticketNumber);
                        setCopiedTicket(true);
                        setTimeout(() => setCopiedTicket(false), 2500);
                        showToast('Ticket number copied to clipboard!', 'success');
                      }}
                      style={{
                        background: copiedTicket ? '#10b981' : 'rgba(2, 132, 199, 0.2)',
                        color: copiedTicket ? '#ffffff' : '#38bdf8',
                        border: '1px solid rgba(2, 132, 199, 0.4)',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copiedTicket ? <Check size={14} /> : <Copy size={14} />}
                      {copiedTicket ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '460px', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  A confirmation email has been dispatched to <strong>{submittedEmail || 'your email'}</strong>. Our assigned Technical Support Engineers will review and contact you shortly.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => generateTicketThreadPDF(submittedTicket || { ticket_number: ticketNumber, name: submittedEmail, email: submittedEmail, subject: 'Support Ticket Inquiry' }, { siteLogo })}
                    className="btn-primary"
                    style={{ padding: '0.65rem 1.4rem', fontSize: '0.875rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <Printer size={16} /> Print / Download Ticket PDF
                  </button>

                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setTicketNumber('');
                      setSubmittedTicket(null);
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem', borderRadius: '8px' }}
                  >
                    Submit Another Ticket
                  </button>
                </div>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Service Category</label>
                    <select
                      className="form-input"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      style={{ background: 'var(--card-bg)' }}
                    >
                      <option value="General Technical Support">General Technical Support</option>
                      <option value="Broadband & Fiber Connectivity">Broadband & Fiber Connectivity</option>
                      <option value="Cloud Colocation & Server Hosting">Cloud Colocation & Server Hosting</option>
                      <option value="Corporate Email (Zimbra) & Domains">Corporate Email (Zimbra) & Domains</option>
                      <option value="UniFi WiFi & Enterprise Networking">UniFi WiFi & Enterprise Networking</option>
                      <option value="Hardware Repair & Maintenance">Hardware Repair & Maintenance</option>
                      <option value="Service Inquiry / Quote Request">Service Inquiry / Quote Request</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Urgency Level</label>
                    <select
                      className="form-input"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      style={{ background: 'var(--card-bg)' }}
                    >
                      <option value="low">Low (General Inquiry / Non-urgent)</option>
                      <option value="medium">Medium (Standard Request)</option>
                      <option value="high">High (Service Disruption)</option>
                      <option value="urgent">Urgent (Critical Outage / Emergency)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Subject / Issue Summary *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Internet connectivity intermittent at Kampala branch"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Issue Description & Technical Details *</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Describe your issue, affected systems, location, and any error messages..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Attachments (Optional, max 20MB total)</label>
                  <input
                    type="file"
                    className="form-input"
                    multiple
                    accept=".jpg,.gif,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.sql,.txt,.html,.bmp,.zip,.tar.gz,.crt,.key,.ca-bundle"
                    onChange={e => {
                      const selected = Array.from(e.target.files);
                      const totalSize = selected.reduce((sum, f) => sum + f.size, 0);
                      if (totalSize > 20 * 1024 * 1024) {
                        alert('Total file size exceeds 20MB limit.');
                        e.target.value = '';
                        setFiles([]);
                        return;
                      }
                      setFiles(selected);
                    }}
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Allowed: .jpg, .gif, .jpeg, .png, .pdf, .doc, .docx, .xls, .xlsx, .csv, .sql, .txt, .html, .bmp, .zip, .tar.gz, .crt, .key, .ca-bundle</small>
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
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem', fontWeight: '700' }}
                  disabled={loading}
                >
                  {loading ? 'Logging Support Ticket...' : 'Submit Support Ticket'} <Send size={18} />
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
