import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { notification } = useApp();

  if (!notification) return null;

  const isSuccess = notification.type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 3000,
      background: 'var(--bg-card)',
      border: `1px solid ${isSuccess ? 'var(--accent-emerald)' : 'var(--primary)'}`,
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      minWidth: '280px',
      maxWidth: '420px',
      animation: 'fadeIn 0.3s ease'
    }}>
      {isSuccess ? <CheckCircle size={22} color="var(--accent-emerald)" /> : <Info size={22} color="var(--primary)" />}
      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', flex: 1 }}>
        {notification.message}
      </div>
    </div>
  );
}
