import SEO from "../components/SEO";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, MapPin, X, ArrowRight, CheckCircle, Clock, 
  ShieldCheck, Ticket, Search, ExternalLink, Printer, 
  Copy, Check, AlertCircle, CreditCard, Smartphone, RefreshCw 
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from "../context/AppContext";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { showToast } = useApp();

  // Registration Form State
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [ticketQrImg, setTicketQrImg] = useState('');
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Paid Checkout State
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [pollingPayment, setPollingPayment] = useState(false);
  const [paymentTxnId, setPaymentTxnId] = useState(null);

  // Ticket Lookup State
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [showLookupModal, setShowLookupModal] = useState(false);

  // Turnstile State
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
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

  const fetchEvents = () => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();

    // Check if URL has ?ticket=EVT-...
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qTicket = params.get('ticket');
      if (qTicket) {
        handleLookupTicket(qTicket);
      }
    }

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

  useEffect(() => {
    if (!siteKey || !selectedEvent || registrationResult) return;
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
  }, [siteKey, selectedEvent, registrationResult]);

  // Generate QR code whenever viewing a ticket
  useEffect(() => {
    const currentTicket = registrationResult?.registration || viewingTicket?.ticket;
    if (currentTicket && currentTicket.ticket_id) {
      const qrData = `https://ncloud.co.ug/events?ticket=${encodeURIComponent(currentTicket.ticket_id)}`;
      QRCode.toDataURL(qrData, { width: 140, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(url => setTicketQrImg(url))
        .catch(() => {});
    }
  }, [registrationResult, viewingTicket]);

  // Poll payment status if in progress
  useEffect(() => {
    let interval = null;
    let timer = null;
    const currentTicketId = registrationResult?.ticket_id;
    if (pollingPayment && currentTicketId) {
      const checkTicketPayment = async () => {
        try {
          const res = await fetch(`/api/events/tickets/${currentTicketId}/status${paymentTxnId ? `?transactionId=${paymentTxnId}` : ''}`);
          const data = await res.json();
          if (data.status === 'Success' || (data.ticket && data.ticket.payment_status === 'paid')) {
            if (interval) clearInterval(interval);
            setPollingPayment(false);
            setRegistrationResult(prev => ({
              ...prev,
              registration: {
                ...prev.registration,
                status: 'confirmed',
                payment_status: 'paid'
              }
            }));
            showToast('Payment verified successfully! Your event ticket pass is now active.', 'success');
          }
        } catch (err) {
          console.warn('Error polling payment status:', err);
        }
      };

      // Fast initial check after 1.2s
      timer = setTimeout(checkTicketPayment, 1200);
      interval = setInterval(checkTicketPayment, 1800);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [pollingPayment, registrationResult, paymentTxnId]);

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

      setRegistrationResult(data);
      setPaymentPhone(formData.phone || '');
      showToast(data.message, 'success');
      fetchEvents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiatePayment = async (e) => {
    e && e.preventDefault();
    const ticketId = registrationResult?.ticket_id;
    if (!ticketId) return;

    if (paymentMethod === 'mobile_money' && !paymentPhone.trim()) {
      return showToast('Please enter your Mobile Money phone number.', 'error');
    }

    setPaying(true);
    try {
      const res = await fetch(`/api/events/tickets/${ticketId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: paymentMethod,
          phone: paymentPhone.trim(),
          email: formData.email.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate payment.');

      if (paymentMethod === 'card' && data.cardRedirectUrl) {
        window.location.href = data.cardRedirectUrl;
        return;
      }

      setPaymentTxnId(data.transactionId);
      setPollingPayment(true);
      showToast('Payment prompt dispatched to your phone! Please approve on your handset.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleLookupTicket = async (overrideTicketId) => {
    const tid = (overrideTicketId || lookupQuery || '').trim();
    if (!tid) return showToast('Please enter your Ticket ID.', 'error');

    setLookupLoading(true);
    try {
      const res = await fetch(`/api/events/tickets/${encodeURIComponent(tid)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket not found.');

      setViewingTicket(data);
      setShowLookupModal(false);
      setLookupQuery('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  const closeRegistration = () => {
    setSelectedEvent(null);
    setRegistrationResult(null);
    setPollingPayment(false);
    setFormData({ name: '', email: '', phone: '', company: '' });
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem', position: 'relative' }}>
      <SEO 
        title="Technology Events & Conferences | Nova Cloud Edges" 
        description="Register for upcoming technology summits, masterclasses, and cloud architecture conferences in Uganda." 
        keywords="events, tech conference, cloud computing uganda, cybersecurity masterclass" 
      />
      <div className="container">
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.4rem 1rem', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            <Ticket size={14} /> Technology Summits & Masterclasses
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
            Upcoming Technology Events
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 1.5rem', lineHeight: '1.6' }}>
            Join industry leaders, cloud architects, and cybersecurity specialists at our upcoming summits, webinars, and hands-on masterclasses.
          </p>

          <button
            type="button"
            onClick={() => setShowLookupModal(true)}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.45rem 1.15rem' }}
          >
            <Search size={15} /> Find / Verify My Ticket Pass
          </button>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 1rem auto' }} />
            Loading upcoming events schedule...
          </div>
        ) : events.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-main)' }}>No Events Scheduled</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>There are no upcoming events at the moment. Please check back soon or follow our tech advisories.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '2.25rem' }}>
            {events.map(item => {
              const isPaid = Boolean(item.is_paid && Number(item.price) > 0);
              const isDeadlinePassed = Boolean(item.is_deadline_passed);
              const isSoldOut = Boolean(item.is_sold_out);
              const canRegister = !isDeadlinePassed && !isSoldOut;

              return (
                <div 
                  key={item.id} 
                  className="glass-card" 
                  style={{ 
                    padding: 0, 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '210px', overflow: 'hidden' }}>
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    
                    {/* Top Badges (Paid/Free & Deadline) */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: isPaid ? 'rgba(15, 23, 42, 0.85)' : 'rgba(16, 185, 129, 0.9)',
                        color: isPaid ? '#38bdf8' : '#ffffff',
                        backdropFilter: 'blur(6px)',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        {isPaid ? `UGX ${Number(item.price).toLocaleString()}` : 'FREE ADMISSION'}
                      </span>
                    </div>

                    {isDeadlinePassed ? (
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                          Registration Closed
                        </span>
                      </div>
                    ) : isSoldOut ? (
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span style={{ background: 'rgba(245, 158, 11, 0.9)', color: '#ffffff', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                          Fully Booked
                        </span>
                      </div>
                    ) : item.registration_deadline ? (
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#cbd5e1', backdropFilter: 'blur(6px)', padding: '0.3rem 0.65rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' }}>
                          Closes: {new Date(item.registration_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', fontSize: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        <Calendar size={14} style={{ color: '#0284c7' }} /> {item.date}
                      </span>
                      <span className="badge-tag" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} /> {item.location || 'Virtual Session'}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.75rem', lineHeight: '1.35', color: 'var(--text-main)' }}>
                      {item.title}
                    </h2>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', flex: 1, marginBottom: '1.5rem', lineHeight: '1.6' }}>
                      {item.description}
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={!canRegister}
                        onClick={() => {
                          setSelectedEvent(item);
                          setRegistrationResult(null);
                        }}
                        className={canRegister ? "btn-primary" : "btn-secondary"}
                        style={{ 
                          width: '100%', 
                          justifyContent: 'center', 
                          fontWeight: '800',
                          opacity: canRegister ? 1 : 0.6,
                          cursor: canRegister ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {isDeadlinePassed ? 'Registration Closed' : isSoldOut ? 'Sold Out' : 'Register Now'} <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* REGISTRATION & PAYMENT MODAL */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={closeRegistration}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', padding: '2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge-tag" style={{ marginBottom: '0.4rem', display: 'inline-block' }}>
                  {registrationResult?.registration?.status === 'confirmed' ? 'Confirmed Ticket Pass' : registrationResult?.is_paid ? 'Secure Checkout' : 'Event Registration'}
                </span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: '900', lineHeight: '1.2', color: 'var(--text-main)' }}>
                  {selectedEvent.title}
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> {selectedEvent.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {selectedEvent.location}</span>
                </div>
              </div>
              <button 
                onClick={closeRegistration}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>
            
            {/* STAGE A: REGISTRATION COMPLETED (CONFIRMED PASS) */}
            {registrationResult?.registration?.status === 'confirmed' ? (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Admission Confirmed!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Your official ticket pass and calendar invite have been registered into the attendee roster.
                </p>

                {/* DIGITAL PASS CARD */}
                <div style={{
                  background: 'var(--card-bg, #0f172a)',
                  border: '2px dashed #0284c7',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: '800' }}>
                        Official Ticket ID
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8', letterSpacing: '1px' }}>
                        {registrationResult.ticket_id}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Attendee: <strong style={{ color: 'var(--text-main)' }}>{registrationResult.registration.name}</strong>
                      </div>
                    </div>

                    {ticketQrImg && (
                      <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                        <img src={ticketQrImg} alt="Ticket QR" style={{ width: '80px', height: '80px', display: 'block' }} />
                      </div>
                    )}
                  </div>

                  {/* EVENT LINK BUTTON IF AVAILABLE */}
                  {selectedEvent.event_link && (
                    <div style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Virtual Access / Meeting Link
                      </div>
                      <a 
                        href={selectedEvent.event_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: '700', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {selectedEvent.event_link} <ExternalLink size={13} />
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(registrationResult.ticket_id);
                        setCopiedTicket(true);
                        setTimeout(() => setCopiedTicket(false), 2500);
                        showToast('Ticket ID copied to clipboard!', 'success');
                      }}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedTicket ? <Check size={13} /> : <Copy size={13} />} {copiedTicket ? 'Copied' : 'Copy Ticket ID'}
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Printer size={13} /> Print Ticket Pass
                    </button>
                  </div>
                </div>

                <button onClick={closeRegistration} className="btn-primary" style={{ padding: '0.65rem 2rem' }}>
                  Done
                </button>
              </div>
            ) : registrationResult?.is_paid && registrationResult?.registration?.status === 'pending_payment' ? (
              
              /* STAGE B: PAID EVENT CHECKOUT VIA IOTEC PAY */
              <div className="animate-fade-in">
                <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '800' }}>Ticket Reference</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0284c7', fontSize: '1.1rem' }}>{registrationResult.ticket_id}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '800' }}>Amount Due</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-main)' }}>
                        UGX {Number(registrationResult.price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {pollingPayment ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1.25rem auto' }} />
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.4rem' }}>Awaiting Payment Approval...</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1rem auto' }}>
                      Please approve the Mobile Money prompt on your handset <strong>{paymentPhone}</strong>. Once approved, your ticket will activate automatically.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPollingPayment(false)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                    >
                      Cancel / Try Another Method
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleInitiatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mobile_money')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'mobile_money' ? '2px solid #0284c7' : '1px solid var(--border-color)',
                          background: paymentMethod === 'mobile_money' ? 'rgba(2, 132, 199, 0.1)' : 'var(--card-bg)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          color: 'var(--text-main)'
                        }}
                      >
                        <Smartphone size={16} color="#0284c7" /> Mobile Money (MTN / Airtel)
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'card' ? '2px solid #0284c7' : '1px solid var(--border-color)',
                          background: paymentMethod === 'card' ? 'rgba(2, 132, 199, 0.1)' : 'var(--card-bg)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          color: 'var(--text-main)'
                        }}
                      >
                        <CreditCard size={16} color="#0284c7" /> Credit / Debit Card
                      </button>
                    </div>

                    {paymentMethod === 'mobile_money' && (
                      <div className="form-group">
                        <label style={{ fontSize: '0.825rem', fontWeight: '700' }}>Mobile Money Phone Number *</label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="e.g. 0772123456 or 0701987654"
                          value={paymentPhone}
                          onChange={e => setPaymentPhone(e.target.value)}
                          required
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You will receive a secure USSD PIN prompt on this phone.</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={paying}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontWeight: '800' }}
                    >
                      {paying ? 'Connecting ioTec Gateway...' : `Pay UGX ${Number(registrationResult.price).toLocaleString()} (ioTec Pay)`}
                    </button>
                  </form>
                )}
              </div>
            ) : (

              /* STAGE C: INITIAL REGISTRATION FORM */
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.825rem', fontWeight: '700' }}>Full Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="e.g. Sandra Nansubuga"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.825rem', fontWeight: '700' }}>Email Address *</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      required 
                      placeholder="e.g. sandra@organization.ug"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.825rem', fontWeight: '700' }}>Phone Number (Optional)</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="e.g. 0790001631"
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.825rem', fontWeight: '700' }}>Company / Organization</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Enterprise Solutions Ltd"
                      value={formData.company} 
                      onChange={e => setFormData({...formData, company: e.target.value})} 
                    />
                  </div>
                </div>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div style={{ marginTop: '0.25rem' }}>
                  {turnstileError && (
                    <div style={{ color: '#ef4444', fontSize: '0.825rem', marginBottom: '0.4rem', padding: '0.45rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                      {turnstileError}
                    </div>
                  )}
                  {siteKey && !isLocalhost && (
                    <div ref={turnstileRef}></div>
                  )}
                  {isLocalhost && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.4rem', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                      [Dev Mode] Cloudflare Turnstile CAPTCHA bypassed for local development.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={submitting} 
                    style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontWeight: '800' }}
                  >
                    {submitting 
                      ? 'Registering Ticket...' 
                      : (selectedEvent.is_paid && Number(selectedEvent.price) > 0)
                        ? `Proceed to Payment (UGX ${Number(selectedEvent.price).toLocaleString()})`
                        : 'Confirm Free Ticket'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* LOOKUP TICKET PASS MODAL */}
      {showLookupModal && (
        <div className="modal-overlay" onClick={() => setShowLookupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Find Event Ticket Pass</h3>
              <button onClick={() => setShowLookupModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Enter your Ticket ID (e.g. <strong>EVT-2026-1042</strong>) to retrieve your digital ticket pass, QR code, and event access link.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Ticket ID (e.g. EVT-2026-XXXX)"
                value={lookupQuery}
                onChange={e => setLookupQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleLookupTicket()}
                disabled={lookupLoading}
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontWeight: '700' }}
              >
                {lookupLoading ? 'Searching...' : 'Find'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RETRIEVED TICKET MODAL */}
      {viewingTicket && (
        <div className="modal-overlay" onClick={() => setViewingTicket(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge-tag" style={{ marginBottom: '0.4rem', display: 'inline-block' }}>Official Ticket Pass</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  {viewingTicket.event.title}
                </h3>
              </div>
              <button onClick={() => setViewingTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'var(--card-bg, #0f172a)',
              border: '2px dashed #0284c7',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: '800' }}>
                    Ticket ID
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8' }}>
                    {viewingTicket.ticket.ticket_id}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Attendee: <strong>{viewingTicket.ticket.name}</strong> {viewingTicket.ticket.company ? `(${viewingTicket.ticket.company})` : ''}
                  </div>
                </div>

                <span style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  background: viewingTicket.ticket.status === 'confirmed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: viewingTicket.ticket.status === 'confirmed' ? '#10b981' : '#f59e0b',
                  border: `1px solid ${viewingTicket.ticket.status === 'confirmed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                }}>
                  ● {viewingTicket.ticket.status === 'confirmed' ? 'CONFIRMED PASS' : 'PAYMENT PENDING'}
                </span>
              </div>

              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1rem' }}>
                <div><strong>Date & Time:</strong> {viewingTicket.event.date} {viewingTicket.event.time ? `• ${viewingTicket.event.time}` : ''}</div>
                <div><strong>Location:</strong> {viewingTicket.event.location}</div>
              </div>

              {viewingTicket.event.event_link && viewingTicket.ticket.status === 'confirmed' && (
                <div style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '2px' }}>Event Access Link</div>
                  <a href={viewingTicket.event.event_link} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontSize: '0.825rem', fontWeight: '700', wordBreak: 'break-all' }}>
                    {viewingTicket.event.event_link}
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(viewingTicket.ticket.ticket_id);
                    setCopiedTicket(true);
                    setTimeout(() => setCopiedTicket(false), 2500);
                    showToast('Ticket ID copied to clipboard!', 'success');
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {copiedTicket ? <Check size={13} /> : <Copy size={13} />} {copiedTicket ? 'Copied' : 'Copy Ticket ID'}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={13} /> Print Pass
                </button>
              </div>
            </div>

            <button onClick={() => setViewingTicket(null)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
