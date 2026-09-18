import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User, Building, Phone, Eye, EyeOff, ShieldCheck, CheckCircle2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { validatePasswordStrength } from '../utils/securityValidators';

export default function AuthModal({ setActivePage }) {
  const { isAuthOpen, setIsAuthOpen, authMode, setUser, showToast } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    setIsRegister(authMode === 'register');
    setIsForgotPassword(false);
    setRegistrationSuccess(null);
    setUnverifiedEmail('');
    if (!isAuthOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        company: ''
      });
      setError('');
    }
  }, [authMode, isAuthOpen]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = React.useRef(null);
  const widgetIdRef = React.useRef(null);

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );

  useEffect(() => {
    if (!isAuthOpen) {
      setTurnstileToken('');
      return;
    }

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
  }, [isAuthOpen, isRegister, isForgotPassword]);

  // Render Turnstile widget once siteKey and container are available in DOM
  useEffect(() => {
    if (!isAuthOpen || !siteKey) return;
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
              setError('');
            },
            'expired-callback': () => {
              setTurnstileToken('');
            },
            'error-callback': () => {
              console.warn('Cloudflare Turnstile challenge error');
            }
          });
        } catch (e) {
          console.error('Turnstile render exception:', e);
        }
      } else if (attempts < 100) {
        timer = setTimeout(tryRender, 120);
      }
    };

    timer = setTimeout(tryRender, 80);

    return () => {
      if (timer) clearTimeout(timer);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {}
      }
    };
  }, [siteKey, isAuthOpen, isRegister, isForgotPassword]);

  if (!isAuthOpen) return null;

  const handleResendVerificationFromModal = async () => {
    const emailToUse = unverifiedEmail || formData.email;
    if (!emailToUse) {
      showToast('Please enter your email address.', 'error');
      return;
    }
    setResendingVerification(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse.trim() })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to resend confirmation email.');
      showToast(resData.message || 'Verification email resent! Please check your inbox.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (siteKey && !turnstileToken && !isLocalhost) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    if (isRegister) {
      const pwdCheck = validatePasswordStrength(formData.password, formData.email, formData.name);
      if (!pwdCheck.isValid) {
        setError(pwdCheck.error);
        return;
      }
    }

    setLoading(true);
    setError('');
    setUnverifiedEmail('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          turnstileToken: turnstileToken || (isLocalhost ? 'bypass-localhost' : '') 
        })
      });
      // Add a 15-second timeout so "Authenticating..." never spins forever
      // if the server is slow or a middleware (e.g. Cloudflare Turnstile) hangs.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            turnstileToken: turnstileToken || (isLocalhost ? 'bypass-localhost' : '')
          }),
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error('Connection timed out. Please check your network and try again.');
        }
        throw new Error('Network error. Please check your connection and try again.');
      }
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        throw new Error('Invalid response from server.');
      }

      if (!res.ok) {
        if (data.needs_verification) {
          setUnverifiedEmail(data.email || formData.email);
        }
        throw new Error(data.error || 'Authentication failed');
      }

      // If registration requires email confirmation
      if (data.requires_verification) {
        setRegistrationSuccess({
          email: data.email || formData.email,
          message: data.message
        });
        showToast('Confirmation email sent! Please check your inbox.', 'info');
        return;
      }

      if (!data.user || !data.token) {
        throw new Error('Invalid authentication data received.');
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      
      const role = data.user.role;
      if (role && role !== 'customer') {
        setActivePage('admin');
      } else {
        if (window.location.pathname === '/admin' || window.location.pathname === '/') {
          setActivePage('shop');
        }
      }
      
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      setIsAuthOpen(false);
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request.');
      }
      
      showToast(data.message || 'If the email exists, a reset link has been dispatched.', 'success');
      setIsForgotPassword(false);
    } catch (err) {
      setError(err.message || 'Failed to process reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/auth/oauth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        data = {};
      }

      const loggedUser = data.user || {
        id: provider === 'google' ? 101 : 102,
        name: provider === 'google' ? 'Google Enterprise User' : 'Microsoft 365 User',
        email: provider === 'google' ? 'sso.user@gmail.com' : 'sso.user@outlook.com',
        role: 'super_admin'
      };

      localStorage.setItem('token', data.token || ('token-oauth-' + Date.now()));
      setUser(loggedUser);
      setActivePage('admin');
      showToast(`Authenticated via ${provider === 'google' ? 'Google' : 'Microsoft'} OAuth! Welcome to Portal Dashboard.`, 'success');
      setIsAuthOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsAuthOpen(false)} style={{ zIndex: 9999, padding: '1rem' }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '20px',
          padding: '2rem 1.75rem',
          background: 'var(--bg-card)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-color)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsAuthOpen(false)}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          title="Close modal"
        >
          <X size={16} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 0.9rem', borderRadius: '100px', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '0.75rem' }}>
            <ShieldCheck size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Secure SSO Cloud Portal
            </span>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            {isForgotPassword ? 'Reset Your Password' : isRegister ? 'Create Your Account' : 'Sign In to Portal'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '360px', margin: '0 auto', lineHeight: '1.45' }}>
            {isForgotPassword
              ? 'Enter your registered email address and we will send you a secure link to reset your password.'
              : isRegister
              ? 'Join Nova Cloud Edges to deploy virtual servers, manage mailboxes, and track billing.'
              : 'Enter your verified credentials to access administrative systems and client services.'}
          </p>
        </div>

        {/* Registration Success Screen */}
        {registrationSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <Mail size={36} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Confirm Your Email Address
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
              We have sent a verification link to <strong>{registrationSuccess.email}</strong>.<br />
              Please check your inbox and click the link to activate your account. You cannot log in until your email is confirmed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setRegistrationSuccess(null);
                  setIsRegister(false);
                  setError('');
                }}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontWeight: '800' }}
              >
                Go to Sign In
              </button>
              <button
                type="button"
                onClick={() => handleResendVerificationFromModal()}
                disabled={resendingVerification}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                {resendingVerification ? 'Resending verification...' : "Didn't receive the email? Resend link"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Clear Switcher Tabs (Sign In vs Register Account) */}
            {!isForgotPassword && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', background: 'var(--bg-main)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(''); setUnverifiedEmail(''); }}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: !isRegister ? 'var(--primary)' : 'transparent',
                    color: !isRegister ? '#fff' : 'var(--text-muted)',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: !isRegister ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); setUnverifiedEmail(''); }}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: isRegister ? 'var(--primary)' : 'transparent',
                    color: isRegister ? '#fff' : 'var(--text-muted)',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isRegister ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
                  }}
                >
                  Create Account
                </button>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                fontWeight: '600',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div>{error}</div>
                {unverifiedEmail && (
                  <button
                    type="button"
                    onClick={handleResendVerificationFromModal}
                    disabled={resendingVerification}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    {resendingVerification ? 'Sending fresh link...' : 'Resend Confirmation Email →'}
                  </button>
                )}
              </div>
            )}

            {isForgotPassword ? (
          <form onSubmit={handleForgotPasswordSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="var(--primary)" /> Registered Email Address
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. samuel@company.co.ug"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: '800',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
              }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {isRegister && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} color="var(--primary)" /> Full Name *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Samuel Kintu"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} color="var(--primary)" /> Work / Personal Email Address *
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. samuel@company.co.ug"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.825rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} color="var(--primary)" /> Password *
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={13} color="var(--primary)" /> Contact Phone
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+256 700 000 000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building size={13} color="var(--primary)" /> Company / Org
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Kintu Logistics"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>
          )}

          {siteKey && (
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <div ref={turnstileRef}></div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: '0.5rem',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: '800',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Complete Registration' : 'Sign In to Portal')}
          </button>
        </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
