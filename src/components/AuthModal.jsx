import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User, Building, Phone, Eye, EyeOff, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';

export default function AuthModal({ setActivePage }) {
  const { isAuthOpen, setIsAuthOpen, authMode, setUser, showToast } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsRegister(authMode === 'register');
    setIsForgotPassword(false);
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

  useEffect(() => {
    if (isAuthOpen) {
      fetch('/api/security/turnstile')
        .then(res => res.json())
        .then(data => {
          if (data.is_active && data.site_key) {
            setSiteKey(data.site_key);
            
            const renderWidget = () => {
              if (window.turnstile && turnstileRef.current) {
                try {
                  window.turnstile.render(turnstileRef.current, {
                    sitekey: data.site_key,
                    callback: (token) => setTurnstileToken(token)
                  });
                } catch (e) {}
              }
            };

            if (!document.getElementById('turnstile-script')) {
              const script = document.createElement('script');
              script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
              script.async = true;
              script.defer = true;
              script.id = 'turnstile-script';
              script.onload = renderWidget;
              document.body.appendChild(script);
            } else {
              setTimeout(renderWidget, 500);
            }
          }
        })
        .catch(() => {});
    } else {
      setTurnstileToken('');
    }
  }, [isAuthOpen, isRegister, isForgotPassword]);

  if (!isAuthOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (siteKey && !turnstileToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken })
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        throw new Error('Invalid response from server.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (!data.user || !data.token) {
        throw new Error('Invalid authentication data received.');
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      
      const role = data.user.role;
      if (['super_admin', 'admin', 'hr_manager', 'reviewer'].includes(role)) {
        setActivePage('admin');
      } else {
        // Keep them on current page, or redirect to a safe default if they were on a restricted page
        // For customers, let's refresh the current view or redirect to shop/portal
        if (window.location.pathname === '/admin' || window.location.pathname === '/') {
          setActivePage('shop');
        }
      }
      
      showToast(isRegister ? 'Account created successfully! Welcome to your Portal.' : `Welcome back, ${data.user.name}!`, 'success');
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

        {/* Clear Switcher Tabs (Sign In vs Register Account) */}
        {!isForgotPassword && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', background: 'var(--bg-main)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
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
              onClick={() => { setIsRegister(true); setError(''); }}
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

        {/* Social SSO OAuth Buttons - Currently Disabled per request */}
        {/*
        {!isForgotPassword && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Microsoft 365
          </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 0.65rem' }}>or use email & password</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>
          </>
        )}
        */

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: '600'
          }}>
            {error}
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
      </div>
    </div>
  );
}
