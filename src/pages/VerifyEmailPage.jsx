import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Mail, ArrowRight, ShieldCheck, RefreshCw, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function VerifyEmailPage({ setActivePage }) {
  const { openAuthModal, showToast } = useApp();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email address...');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please use the link sent to your email.');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Your email has been confirmed successfully! Your account is now active.');
          if (data.token) {
            localStorage.setItem('token', data.token);
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
            }
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Invalid or expired verification link. Please request a new link.');
          if (data.email) setResendEmail(data.email);
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage('Unable to connect to verification server. Please check your internet connection.');
      });
  }, []);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      showToast('Please enter your registered email address.', 'error');
      return;
    }
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend verification link.');
      setResendSent(true);
      showToast('A fresh verification link has been dispatched to your email.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.08) 0%, transparent 70%)'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Brand Icon Header */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          background: status === 'success' 
            ? 'rgba(16, 185, 129, 0.15)' 
            : status === 'error' 
              ? 'rgba(239, 68, 68, 0.15)' 
              : 'rgba(37, 99, 235, 0.15)',
          color: status === 'success' 
            ? '#10b981' 
            : status === 'error' 
              ? '#ef4444' 
              : '#2563eb'
        }}>
          {status === 'verifying' && <RefreshCw size={36} className="spinner" style={{ animation: 'spin 1.5s linear infinite' }} />}
          {status === 'success' && <CheckCircle size={40} />}
          {status === 'error' && <XCircle size={40} />}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
          {status === 'verifying' && 'Verifying Email Address...'}
          {status === 'success' && 'Email Confirmed Successfully!'}
          {status === 'error' && 'Verification Link Issue'}
        </h2>

        {/* Explanation Message */}
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
          {message}
        </p>

        {/* Action button on Success */}
        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => {
                if (setActivePage) setActivePage('home');
                window.history.replaceState({}, '', '/');
                openAuthModal(false);
              }}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '1rem',
                fontWeight: '800'
              }}
            >
              <LogIn size={18} /> Sign In to Portal Now
            </button>
            <button
              onClick={() => {
                if (setActivePage) setActivePage('home');
                window.history.replaceState({}, '', '/');
              }}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Back to Home Page
            </button>
          </div>
        )}

        {/* Resend Form on Error */}
        {status === 'error' && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'left' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} color="var(--primary)" /> Resend Verification Email
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              If your link has expired or was not received, enter your email address below to receive a new link.
            </p>

            {resendSent ? (
              <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' }}>
                A new verification email has been sent! Please check your inbox and spam folder.
              </div>
            ) : (
              <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: '700' }}
                >
                  {resending ? 'Sending Link...' : 'Resend Verification Email'} <ArrowRight size={16} />
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  if (setActivePage) setActivePage('home');
                  window.history.replaceState({}, '', '/');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
              >
                ← Return to Nova Cloud Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
