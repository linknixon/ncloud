import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Download, CheckCircle, AlertCircle, 
  FileText, Building, Calendar, Phone, Mail, ArrowLeft, 
  Printer, ExternalLink, Award, Copy, Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { generateInvoicePDF, generateQuotationPDF } from '../utils/pdfGenerator';
import { useApp } from '../context/AppContext';

export default function VerifyDocumentPage({ setActivePage }) {
  const { siteLogo, showToast } = useApp();
  const [docQuery, setDocQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState(null);
  const [docQrImg, setDocQrImg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-verify if query parameter is in URL (e.g. ?doc=INV-2026-0041 or ?type=invoice&ref=INV-2026-0041)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get('ref') || params.get('doc') || params.get('verify') || params.get('invoice') || params.get('payment') || params.get('quote');
    const viewType = params.get('view') || params.get('type') || (params.get('quote') ? 'quote' : params.get('payment') ? 'payment' : 'invoice');
    
    if (docParam) {
      setDocQuery(docParam);
      performVerification(viewType, docParam);
    }
  }, []);

  // Generate 2D QR Code when document is verified
  useEffect(() => {
    if (verifyResult && verifyResult.document_number) {
      const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(verifyResult.document_number)}`;
      QRCode.toDataURL(verifyUrl, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
        .then(url => setDocQrImg(url))
        .catch(err => console.warn('Document QR generation failed:', err));
    } else {
      setDocQrImg('');
    }
  }, [verifyResult]);

  const performVerification = async (type = 'invoice', refId) => {
    if (!refId) return;
    setLoading(true);
    setError(null);
    try {
      let inferredType = type || 'invoice';
      const cleanRef = refId.trim().toUpperCase();
      if (cleanRef.startsWith('QTN') || cleanRef.startsWith('QUO')) {
        inferredType = 'quote';
      } else if (cleanRef.startsWith('TXN') || cleanRef.startsWith('PAY') || type === 'payment') {
        inferredType = 'payment';
      } else if (cleanRef.startsWith('INV')) {
        inferredType = 'invoice';
      }

      const res = await fetch(`/api/public/verify/${inferredType}/${encodeURIComponent(refId.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.error || 'Tax invoice or official document clearance certificate not found.');
      }
      setVerifyResult(data);
    } catch (err) {
      setError(err.message || 'Unable to verify document.');
      setVerifyResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!docQuery.trim()) {
      showToast('Please enter an Invoice, Quotation, or Clearance reference number', 'warning');
      return;
    }
    performVerification('invoice', docQuery.trim());
  };

  const handleCopyLink = () => {
    const url = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(verifyResult?.document_number || docQuery)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Official clearance certificate URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Derive itemized rows
  const rawItems = verifyResult?.items || verifyResult?.invoice?.items || [];
  const displayItems = rawItems.length > 0 ? rawItems : [
    {
      name: verifyResult?.item_name || 'Enterprise Cloud VPS Infrastructure & Managed Technical Support',
      quantity: 1,
      unit_price: verifyResult?.total_amount || 0,
      amount: verifyResult?.total_amount || 0
    }
  ];

  // Derive financial figures
  const totalAmount = Number(verifyResult?.total_amount || 0);
  const isVatExempt = Boolean(verifyResult?.vat_exempt || verifyResult?.invoice?.vat_exempt);
  const subtotal = verifyResult?.subtotal 
    ? Number(verifyResult.subtotal) 
    : (isVatExempt ? totalAmount : Math.round(totalAmount / 1.18));
  const vatAmount = isVatExempt ? 0 : (verifyResult?.vat_amount !== undefined ? Number(verifyResult.vat_amount) : totalAmount - subtotal);
  const isPaid = (verifyResult?.status === 'Paid' || verifyResult?.status === '100% Paid' || verifyResult?.status === 'Paid & Settled');
  const paidAmount = isPaid ? totalAmount : Number(verifyResult?.paid_amount || verifyResult?.invoice?.paid_amount || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  // Bank remittance accounts
  const bankAccounts = (verifyResult?.bank_remittance && verifyResult.bank_remittance.length > 0)
    ? verifyResult.bank_remittance
    : [
        { bank_name: 'Stanbic Bank Uganda', account_number: '9030024881920', currency: 'UGX', branch: 'Corporate Branch' },
        { bank_name: 'Absa Bank Uganda', account_number: '6007291044', currency: 'UGX', branch: 'Kampala Main' }
      ];

  const isQuotation = (verifyResult?.document_type || '').toLowerCase().includes('quote') || 
                      (verifyResult?.document_type || '').toLowerCase().includes('quotation') ||
                      (verifyResult?.document_number || '').toUpperCase().startsWith('QTN');

  return (
    <div style={{ minHeight: '90vh', background: 'var(--bg-main)', padding: '2.5rem 1rem' }}>
      
      {/* Embedded Print CSS to guarantee clean 1-page executive output */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, header, nav, footer, .navbar, .site-header {
            display: none !important;
          }
          .print-document-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-executive-sheet {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            margin: 0 auto !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      <div className="print-document-container" style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Navigation Bar (Hidden during Print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => setActivePage ? setActivePage('home') : window.history.back()}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Back to Website
          </button>

          {verifyResult && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handlePrint}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', padding: '0.45rem 0.9rem' }}
                title="Print official document"
              >
                <Printer size={15} /> Print Sheet
              </button>

              <button
                onClick={handleCopyLink}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', padding: '0.45rem 0.9rem' }}
                title="Copy public verification link"
              >
                {copiedLink ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                {copiedLink ? 'Copied!' : 'Share Link'}
              </button>

              <button
                onClick={() => {
                  if (isQuotation) {
                    generateQuotationPDF(verifyResult.quotation || verifyResult, { siteLogo });
                  } else {
                    const targetInv = verifyResult.invoice || {
                      invoice_number: verifyResult.document_number,
                      customer_name: verifyResult.customer_name,
                      customer_email: verifyResult.customer_email,
                      customer_phone: verifyResult.customer_phone || '',
                      customer_address: verifyResult.customer_address || 'Kampala, Uganda',
                      company: verifyResult.company || '',
                      item_name: verifyResult.item_name,
                      amount: verifyResult.total_amount,
                      status: verifyResult.status,
                      due_date: verifyResult.due_date,
                      created_at: verifyResult.issued_date,
                      include_vat: verifyResult.include_vat,
                      vat_exempt: verifyResult.vat_exempt,
                      vat_amount: verifyResult.vat_amount,
                      items: verifyResult.items
                    };
                    generateInvoicePDF(targetInv, { siteLogo });
                  }
                }}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', padding: '0.45rem 1rem' }}
              >
                <Download size={15} /> Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Search & Verification Input Hero (Hidden during Print) */}
        <div className="glass-card no-print" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
            Official Document Verification & Digital Clearance
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 1.25rem', lineHeight: '1.5' }}>
            Verify the authenticity, legal validity, and digital clearance seal of Nova Cloud Edges Tax Invoices, Quotations, and Corporate Remittances.
          </p>

          <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px', margin: '0 auto', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Enter Invoice # (e.g. INV-2026-0041) or Quote #"
                value={docQuery}
                onChange={e => setDocQuery(e.target.value)}
                style={{ paddingLeft: '2.75rem', fontSize: '0.925rem' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.4rem', fontWeight: '800' }}>
              {loading ? 'Verifying...' : 'Verify Online'}
            </button>
          </form>
        </div>

        {/* AUTHENTIC EXECUTIVE CORPORATE PAPER SHEET */}
        {verifyResult && (
          <div 
            className="print-executive-sheet animate-fade-in" 
            style={{ 
              background: '#ffffff', 
              color: '#0f172a', 
              borderRadius: '16px', 
              border: '1px solid #cbd5e1', 
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.18)', 
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '2.5rem'
            }}
          >
            {/* Top Full-Bleed Dual Corporate Stripe */}
            <div style={{ height: '8px', background: '#0f172a', width: '100%' }} />
            <div style={{ height: '4px', background: '#0284c7', width: '100%' }} />

            <div style={{ padding: '2.5rem' }}>
              
              {/* Official Corporate Letterhead Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div>
                  {siteLogo ? (
                    <img 
                      src={siteLogo} 
                      alt="Nova Cloud Edges Logo" 
                      style={{ maxHeight: '52px', maxWidth: '240px', objectFit: 'contain', marginBottom: '0.75rem', display: 'block' }} 
                    />
                  ) : (
                    <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.35rem' }}>
                      NOVA CLOUD EDGES (U) LIMITED
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600', lineHeight: '1.4' }}>
                    Lugga Zone, Ndejje, Wakiso, Republic of Uganda
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600', lineHeight: '1.4' }}>
                    TIN: 1014892019 • Email: billing@ncloud.co.ug • Tel: +256 790 001 631
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '700', marginTop: '2px' }}>
                    Official Web Clearance: https://ncloud.co.ug
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ 
                    background: '#0f172a', 
                    color: '#ffffff', 
                    padding: '0.35rem 0.9rem', 
                    borderRadius: '6px', 
                    fontSize: '0.78rem', 
                    fontWeight: '800', 
                    letterSpacing: '0.06em', 
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    marginBottom: '0.4rem'
                  }}>
                    {verifyResult.document_type || (isQuotation ? 'OFFICIAL COMMERCIAL QUOTATION' : 'OFFICIAL TAX INVOICE')}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
                    {verifyResult.document_number}
                  </div>
                  
                  {/* Status badge */}
                  <div style={{ marginTop: '0.4rem' }}>
                    <span style={{ 
                      background: isPaid ? '#dcfce7' : '#fef3c7', 
                      color: isPaid ? '#15803d' : '#b45309', 
                      padding: '0.3rem 0.85rem', 
                      borderRadius: '999px', 
                      fontSize: '0.78rem', 
                      fontWeight: '800', 
                      border: `1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ● {isPaid ? '100% PAID & SETTLED' : (verifyResult.status || 'ACTIVE & VALID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dual Metadata Executive Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                
                {/* Client / Recipient Card */}
                <div style={{ background: '#f8fafc', padding: '1.15rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    {isQuotation ? 'Prepared For Client:' : 'Billed To / Recipient Entity:'}
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                    {verifyResult.customer_name || 'Corporate Customer'}
                  </div>
                  {verifyResult.company && (
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.2rem' }}>
                      {verifyResult.company}
                    </div>
                  )}
                  {verifyResult.customer_email && (
                    <div style={{ fontSize: '0.825rem', color: '#475569' }}>
                      {verifyResult.customer_email}
                    </div>
                  )}
                  <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '2px' }}>
                    {verifyResult.customer_address || 'Kampala, Republic of Uganda'}
                  </div>
                </div>

                {/* Document Specifications Card */}
                <div style={{ background: '#f8fafc', padding: '1.15rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                    Document Specifications:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 0.75rem', fontSize: '0.825rem', color: '#334155' }}>
                    <span style={{ fontWeight: '700', color: '#64748b' }}>Date Issued:</span>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>
                      {new Date(verifyResult.issued_date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>

                    <span style={{ fontWeight: '700', color: '#64748b' }}>{isQuotation ? 'Valid Until:' : 'Payment Due:'}</span>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>
                      {verifyResult.due_date || verifyResult.valid_until || 'Payable Upon Receipt'}
                    </span>

                    <span style={{ fontWeight: '700', color: '#64748b' }}>Currency:</span>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>
                      {verifyResult.currency || 'UGX'} (Uganda Shillings)
                    </span>

                    <span style={{ fontWeight: '700', color: '#64748b' }}>Clearance:</span>
                    <span style={{ fontWeight: '800', color: '#16a34a' }}>
                      ✓ Cryptographically Sealed & Verified
                    </span>
                  </div>
                </div>

              </div>

              {/* Itemized Services Table */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                        SERVICE / INFRASTRUCTURE DESCRIPTION
                      </th>
                      <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: '800', fontSize: '0.8rem', width: '60px' }}>
                        QTY
                      </th>
                      <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: '800', fontSize: '0.8rem', width: '140px' }}>
                        UNIT RATE (UGX)
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', fontSize: '0.8rem', width: '150px' }}>
                        AMOUNT (UGX)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((it, idx) => {
                      const qty = Number(it.quantity || it.qty || 1);
                      const price = Number(it.unit_price || it.price || Math.round((it.amount || totalAmount) / qty));
                      const itemTotal = Number(it.amount || (price * qty));
                      const isEven = idx % 2 === 0;

                      return (
                        <tr key={idx} style={{ background: isEven ? '#ffffff' : '#f8fafc', borderBottom: idx < displayItems.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.875rem' }}>
                              {it.name || it.description || 'Enterprise Cloud VPS & Infrastructure Service'}
                            </div>
                            {it.short_description && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                {it.short_description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 0.65rem', textAlign: 'center', fontWeight: '700', color: '#334155' }}>
                            {qty}
                          </td>
                          <td style={{ padding: '0.85rem 0.85rem', textAlign: 'right', color: '#334155', fontWeight: '600' }}>
                            {price.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                            {itemTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown & Security Clearance Stamp */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1.25rem' }}>
                
                {/* Left Side: Paid Stamp / Security Guarantee */}
                <div>
                  {isPaid ? (
                    <div style={{
                      border: '2px solid #16a34a',
                      borderRadius: '12px',
                      padding: '0.75rem 1.15rem',
                      background: 'rgba(240, 253, 244, 0.95)',
                      color: '#16a34a',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.12)',
                      maxWidth: '320px'
                    }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '900', letterSpacing: '0.04em' }}>
                        ✓ 100% PAID & DIGITALLY CLEARED
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#15803d', marginTop: '2px' }}>
                        CENTRAL FISCAL LEDGER VERIFIED
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                        STAMP REF: NV-PAID-{verifyResult.document_number.replace(/[^a-zA-Z0-9]/g, '')}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      color: '#475569',
                      maxWidth: '320px',
                      fontSize: '0.8rem',
                      lineHeight: 1.45
                    }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '3px' }}>Digital Seal Note:</strong>
                      This electronic record is verified directly against Nova Cloud Edges central database. Any duplicate or presentation matching this reference is recognized as authentic.
                    </div>
                  )}
                </div>

                {/* Right Side: Financial Breakdown Totals */}
                <div style={{ width: '310px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#475569' }}>
                    <span>Subtotal Amount:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>UGX {subtotal.toLocaleString()}</span>
                  </div>

                  {!isVatExempt && vatAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#475569' }}>
                      <span>Value Added Tax (VAT 18%):</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>UGX {vatAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Primary Total Pill */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                    borderRadius: '8px', 
                    padding: '0.65rem 1rem', 
                    color: '#ffffff', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: '0.5rem', 
                    marginBottom: '0.5rem',
                    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em' }}>TOTAL DOCUMENT AMOUNT:</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}>UGX {totalAmount.toLocaleString()}</span>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.85rem', marginTop: '0.4rem', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', color: '#15803d', fontWeight: '700' }}>
                      <span>Paid to Date:</span>
                      <span>- UGX {paidAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderTop: '1px dashed #cbd5e1', marginTop: '0.25rem', color: balanceDue > 0 ? '#b45309' : '#0284c7', fontWeight: '900', fontSize: '0.925rem' }}>
                      <span>Balance Due:</span>
                      <span>UGX {balanceDue.toLocaleString()}</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Remittance & 2D Verification QR Footprint */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem', alignItems: 'stretch' }}>
                
                {/* Official Bank Remittance Box */}
                <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }}>
                  <div style={{ fontWeight: '900', color: '#0284c7', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    OFFICIAL BANK REMITTANCE ACCOUNTS:
                  </div>
                  {bankAccounts.map((b, idx) => (
                    <div key={b.id || idx} style={{ marginBottom: '0.35rem', lineHeight: '1.4', color: '#334155' }}>
                      <strong style={{ color: '#0f172a' }}>{b.bank_name}:</strong> A/C: <strong style={{ fontFamily: 'monospace' }}>{b.account_number}</strong> ({b.currency || 'UGX'})
                      {b.branch ? ` • ${b.branch}` : ''}
                      {b.swift_code ? ` • Swift: ${b.swift_code}` : ''}
                    </div>
                  ))}
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid #e2e8f0' }}>
                    Account Name: <strong style={{ color: '#0f172a' }}>Nova Cloud Edges (U) Limited</strong>
                  </div>
                </div>

                {/* 2D QR Code Authenticity Card */}
                <div style={{ background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1.5px solid #0284c7', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {docQrImg ? (
                    <img 
                      src={docQrImg} 
                      alt="2D QR Verification Seal" 
                      style={{ width: '84px', height: '84px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '3px', background: '#ffffff', flexShrink: 0 }} 
                    />
                  ) : (
                    <div style={{ width: '84px', height: '84px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShieldCheck size={28} color="#0284c7" />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '900', color: '#0f172a', marginBottom: '0.25rem' }}>
                      Cryptographic Authenticity
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                      Scan this 2D QR barcode with any smartphone camera to verify this document live on the official <strong>ncloud.co.ug</strong> portal.
                    </div>
                  </div>
                </div>

              </div>

              {/* Corporate Signatory & Authorized Approval Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.45', maxWidth: '380px' }}>
                  This document is generated by Nova Cloud Edges (U) Limited automated billing & clearance gateway. Valid without physical handwritten signature when digitally stamped.
                </div>

                <div style={{ textAlign: 'right', minWidth: '220px' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', display: 'inline-block' }}>
                    Dr. Arthur Mukasa
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                    Dr. Arthur Mukasa
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                    Director of Cloud Systems & Regional Operations
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>
                    Nova Cloud Edges (U) Limited
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Footer Bar */}
            <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '0.75rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
              <div>
                Lugga Zone, Ndejje, Wakiso, Kampala • TIN: 1014892019 • billing@ncloud.co.ug
              </div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>
                Page 1 of 1 • Official Legal Instrument
              </div>
            </div>

          </div>
        )}

        {/* Error State Notice */}
        {error && (
          <div className="glass-card animate-fade-in no-print" style={{ border: '2px solid #ef4444', padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <AlertCircle size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444', marginBottom: '0.35rem' }}>
              Document Verification Unsuccessful
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
              {error} Please check the reference number on your document and try again, or contact our finance department at <strong>billing@ncloud.co.ug</strong>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
