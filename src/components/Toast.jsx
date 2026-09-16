import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { notification } = useApp();

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error' || notification.type === 'warning';
  
  const borderColor = isSuccess ? 'var(--accent-emerald)' : (isError ? '#dc2626' : 'var(--primary)');
  const iconColor = isSuccess ? 'var(--accent-emerald)' : (isError ? '#dc2626' : 'var(--primary)');
  const bgColor = isError ? '#fef2f2' : 'var(--bg-card)';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999, // Extremely high z-index to stay above all modals
      background: bgColor,
      border: `1px solid ${borderColor}`,
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
      {isSuccess ? <CheckCircle size={22} color={iconColor} /> : (isError ? <AlertCircle size={22} color={iconColor} /> : <Info size={22} color={iconColor} />)}
      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: isError ? '#991b1b' : 'var(--text-main)', flex: 1 }}>
        {notification.message}
      </div>
    </div>
  );
}
