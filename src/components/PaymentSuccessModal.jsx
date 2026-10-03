import React from 'react';
import { CheckCircle2, Copy, Download, X, ExternalLink, ShieldCheck, Wifi, Sparkles, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function PaymentSuccessModal() {
  const { paymentSuccessModal, closePaymentSuccessModal, showToast } = useApp();

  if (!paymentSuccessModal || !paymentSuccessModal.isOpen) return null;

  const data = paymentSuccessModal.data || {};
  const {
    reference = 'NV-SUB-8812',
    invoice_number = 'INV-2026-0042',
    amount = 0,
    currency = 'UGX',
    payment_method = 'Mobile Money',
    customer_name = 'Customer',
    customer_email = '',
    wifi_voucher_token = '',
    plan_name = '',
    items = []
  } = data;

  const copyToClipboard = (text, label = 'Copied') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      showToast(`${label} to clipboard!`, 'success');
    } catch (e) {
      showToast('Copy failed', 'error');
    }
  };

  const handleViewInvoice = () => {
    const invNum = invoice_number || reference;
    if (invNum) {
      // Use protected browser rendering URL without forced download or blob
      window.open(`/api/invoices/pdf/${invNum}`, '_blank', 'noopener,noreferrer');
    }
  };

  const formattedAmount = Number(amount || 0).toLocaleString();

  return (
    <div 
      className="modal-overlay" 
      onClick={closePaymentSuccessModal}
      style={{
        zIndex: 99999,
        background: 'rgba(10, 15, 29, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div 
        className="modal-content animate-scale-in glass-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '2rem 1.75rem',
          borderRadius: '24px',
          background: 'var(--bg-surface, #0f172a)',
          border: '1.5px solid rgba(16, 185, 129, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(16, 185, 129, 0.25), 0 0 40px rgba(16, 185, 129, 0.1)',
          position: 'relative',
          textAlign: 'center'
        }}
      >
        {/* Close Button */}
        <button
          onClick={closePaymentSuccessModal}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={18} />
        </button>

        {/* Animated Celebration Icon with Emerald Glow */}
        <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '1.25rem' }}>
          <div style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0) 70%)',
            animation: 'pulse 2s infinite'
          }} />
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.3) 100%)',
            border: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            boxShadow: '0 0 25px rgba(16,185,129,0.35)'
          }}>
            <CheckCircle2 size={44} strokeWidth={2.4} />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '0.25rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
          <Sparkles size={14} /> Payment Cleared & Verified
        </div>

        <h2 style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main, #ffffff)', marginBottom: '0.4rem', lineHeight: '1.25' }}>
          Payment Successful!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
          Thank you for choosing Nova Cloud Edges. Your payment has been authorized and recorded on Uganda's sovereign cloud infrastructure.
        </p>

        {/* WiFi Voucher Callout Card (If present) */}
        {wifi_voucher_token && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(2,132,199,0.12) 0%, rgba(14,165,233,0.18) 100%)',
            border: '2px solid #0284c7',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              <Wifi size={16} /> Instant WiFi Access Voucher Code
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: 'rgba(15,23,42,0.6)',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: '1px dashed #38bdf8',
              margin: '0 auto 0.65rem',
              maxWidth: '360px'
            }}>
              <span style={{ fontSize: '1.85rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
                {wifi_voucher_token}
              </span>
              <button
                onClick={() => copyToClipboard(wifi_voucher_token, 'WiFi Voucher Code copied')}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', gap: '4px', background: '#0284c7', color: '#fff', border: 'none' }}
                title="Copy WiFi Voucher Code"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
              Connect to <strong>Nova Cloud High-Speed WiFi</strong> and enter this voucher token to browse instantly.
            </p>
          </div>
        )}

        {/* Transaction Financial Details Card */}
        <div style={{
          background: 'var(--bg-main, #0b1120)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.15rem 1.25rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.65rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--accent-emerald, #10b981)' }}>
              {currency} {formattedAmount}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Reference</div>
              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{reference}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax Invoice #</div>
              <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{invoice_number}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Channel</div>
              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{payment_method}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
              <div style={{ fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {customer_name || 'Subscriber'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={handleViewInvoice}
            className="btn-primary"
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              gap: '0.5rem',
              background: '#0284c7',
              borderColor: '#0284c7'
            }}
          >
            <Printer size={16} /> View Official Invoice (PDF)
          </button>
          <button
            onClick={closePaymentSuccessModal}
            className="btn-secondary"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.88rem',
              fontWeight: '700'
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
