import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User, Building, Phone } from 'lucide-react';

export default function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, authMode, setUser, showToast } = useApp();
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
      showToast(isRegister ? 'Account created successfully!' : `Welcome back, ${data.user.name}!`, 'success');
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

        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {isRegister ? 'Create a Nova Account' : 'Sign In to Nova Portal'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Access enterprise software licenses, subscriptions, and job applications stored in MySQL.
        </p>

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
