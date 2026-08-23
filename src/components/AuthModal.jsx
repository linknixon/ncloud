import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User, Building, Phone } from 'lucide-react';

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, authMode, setUser, showToast, setActivePage } = useApp();
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    setIsRegister(authMode === 'register');
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

  if (!isAuthOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setActivePage('admin');
      showToast(isRegister ? 'Account created! Welcome to your Portal Dashboard.' : `Welcome back, ${data.user.name}! Landing on Portal Dashboard.`, 'success');
      setIsAuthOpen(false);
    } catch (err) {
      setError(err.message);
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
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `${provider} OAuth authentication failed`);

      localStorage.setItem('token', data.token);
      setUser(data.user);
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
    <div className="modal-overlay" onClick={() => setIsAuthOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setIsAuthOpen(false)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            color: 'var(--text-muted)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.55rem', marginBottom: '0.4rem', fontWeight: '800' }}>
            {isRegister ? 'Create Nova Customer Account' : 'Sign In to Nova Customer Portal'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 auto', maxWidth: '360px', lineHeight: '1.5' }}>
            Access enterprise cloud subscriptions, software licenses, and customer portal tools.
          </p>
        </div>

        {/* Social SSO OAuth Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Continue with Microsoft
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 0.75rem' }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. David Mukasa"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. name@ncloud.co.ug"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label>Phone Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+256 770 000 000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Company Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Uganda Ltd"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegister ? 'Register Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{ background: 'none', color: 'var(--primary)', fontWeight: '700' }}
          >
            {isRegister ? 'Sign In' : 'Register Now'}
          </button>
        </div>

        {!isRegister && (
          <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Demo Admin Credentials: <code>support@ncloud.co.ug</code> / <code>Admin@123456</code>
          </div>
        )}
      </div>
    </div>
  );
}
