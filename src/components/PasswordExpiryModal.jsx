import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, AlertTriangle, Lock, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';
import { validatePasswordStrength } from '../utils/securityValidators';

export default function PasswordExpiryModal() {
  const { user, setUser, showToast } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dismissedWarning, setDismissedWarning] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  if (!user) return null;

  const isExpired = !!user.password_expired;
  const isExpiringSoon = !isExpired && !!user.password_expiring_soon && !dismissedWarning;
  const daysUntilExpiry = user.days_until_expiry ?? Math.max(0, 90 - (user.password_age_days || 0));

  // Determine if the password update modal must be open
  const isModalOpen = isExpired || manualModalOpen;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    const check = validatePasswordStrength(newPassword, user.email, user.name);
    if (!check.isValid) {
      setError(check.error);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password update failed');
      }

      // Update local user state
      const updated = {
        ...user,
        password_expired: false,
        password_expiring_soon: false,
        days_until_expiry: 90,
        password_age_days: 0,
        password_updated_at: new Date().toISOString()
      };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));

      showToast('Password updated successfully! Valid for the next 90 days.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setManualModalOpen(false);
    } catch (err) {
      setError(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Expiring Soon Banner (Dismissible warning before 90-day cutoff) */}
      {isExpiringSoon && !isModalOpen && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          width: '92%',
          maxWidth: '820px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          boxShadow: '0 8px 30px rgba(217, 119, 6, 0.35)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          animation: 'fadeInSlide 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={22} style={{ flexShrink: 0, color: '#fef3c7' }} />
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.875rem', letterSpacing: '-0.01em' }}>
                Password Expiration Alert ({daysUntilExpiry} days remaining)
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.95, marginTop: '2px' }}>
                Nova Cloud policy requires password updates every 90 days. Please renew your password before access is restricted.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => setManualModalOpen(true)}
              style={{
                background: '#ffffff',
                color: '#b45309',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem 0.85rem',
                fontWeight: '800',
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            >
              Update Password Now
            </button>
            <button
              onClick={() => setDismissedWarning(true)}
              title="Dismiss warning for now"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Mandatory / Self-Service Password Expiry Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 10, 20, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            background: 'var(--bg-card)',
            border: isExpired ? '2px solid #ef4444' : '1px solid var(--border-color)',
            borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            padding: '2rem',
            position: 'relative'
          }}>
            {/* If voluntary / expiring soon, permit closing modal */}
            {!isExpired && (
              <button
                onClick={() => setManualModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: isExpired ? '#ef4444' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                {isExpired ? <ShieldAlert size={32} /> : <AlertTriangle size={32} />}
              </div>

              <span style={{
                display: 'inline-block',
                background: isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: isExpired ? '#ef4444' : '#f59e0b',
                fontSize: '0.72rem',
                fontWeight: '800',
                padding: '0.3rem 0.75rem',
                borderRadius: '100px',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {isExpired ? 'Mandatory Policy Enforcement' : 'Security Expiration Renewal'}
              </span>

              <h2 style={{ fontSize: '1.45rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                {isExpired ? 'Password Expired' : 'Update Your Password'}
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {isExpired
                  ? 'Your Nova Cloud password has reached the mandatory 90-day validity policy. You must create a new password to proceed.'
                  : 'Renew your password to maintain compliance with Nova Cloud 90-day corporate credentials standards.'}
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                fontWeight: '600'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="var(--primary)" /> Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
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
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="var(--primary)" /> New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min 8 chars with letters & numbers"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
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
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="var(--primary)" /> Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
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
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                {loading ? 'Updating Credentials...' : 'Save & Renew 90-Day Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
