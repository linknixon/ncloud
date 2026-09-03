import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Download, CheckCircle, AlertCircle, FileText, Building, Calendar, Phone, Mail, ArrowLeft, Printer, ExternalLink } from 'lucide-react';
import { generateInvoicePDF, generateQuotationPDF } from '../utils/pdfGenerator';
import { useApp } from '../context/AppContext';

export default function VerifyDocumentPage({ setActivePage }) {
  const { siteLogo, showToast } = useApp();
  const [docQuery, setDocQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto-verify if query parameter is in URL (e.g. ?doc=INV-2026-0041 or ?type=invoice&ref=INV-2026-0041)
  // Auto-verify if query parameter is in URL (e.g. ?view=invoice&ref=INV-2026-0044 or ?doc=INV-2026-0041)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get('ref') || params.get('doc') || params.get('verify') || params.get('invoice') || params.get('payment') || params.get('quote');
    const viewType = params.get('view') || params.get('type') || (params.get('quote') ? 'quote' : params.get('payment') ? 'payment' : 'invoice');
    
    if (docParam) {
      setDocQuery(docParam);
      performVerification(viewType, docParam);
    }
  }, []);

  const performVerification = async (type = 'invoice', refId) => {
    if (!refId) return;
    setLoading(true);
    setError(null);
    try {
      let inferredType = type || 'invoice';
      if (refId.toUpperCase().startsWith('QTN') || refId.toUpperCase().startsWith('QUO')) {
        inferredType = 'quote';
      } else if (refId.toUpperCase().startsWith('TXN') || refId.toUpperCase().startsWith('PAY') || type === 'payment') {
        inferredType = 'payment';
      } else if (refId.toUpperCase().startsWith('INV')) {
        inferredType = 'invoice';
      }

      const res = await fetch(`/api/public/verify/${inferredType}/${encodeURIComponent(refId.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.error || 'Tax invoice or document clearance certificate not found.');
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
      showToast('Please enter an Invoice or Quotation reference number', 'warning');
      return;
    }
    performVerification('invoice', docQuery.trim());
  };

  return (
    <div style={{ minHeight: '85vh', background: 'var(--bg-main)', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Back navigation */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActivePage ? setActivePage('home') : window.history.back()}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Back to Website
          </button>
        </div>

        {/* Header Hero */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <ShieldCheck size={36} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Official Document Verification & Digital Clearance
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            Verify the authenticity, digital seal, and official record of Nova Cloud Edges Tax Invoices, Quotations, and Bank Remittance Records.
          </p>

          {/* Search form */}
          <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '0.5rem', maxWidth: '540px', margin: '0 auto', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Enter Invoice # (e.g. INV-2026-0041) or Quote #"
                value={docQuery}
                onChange={e => setDocQuery(e.target.value)}
                style={{ paddingLeft: '2.75rem', fontSize: '0.95rem' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: '800' }}>
              {loading ? 'Verifying...' : 'Verify Online'}
            </button>
          </form>
        </div>

        {/* Verification Result Card */}
        {verifyResult && (
          <div className="glass-card animate-fade-in" style={{ border: '2px solid #10b981', padding: '2rem', marginBottom: '2rem' }}>
            
            {/* Header Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#10b981', margin: 0 }}>
                    100% Genuine & Verified Document
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {verifyResult.efris_compliance || 'Cryptographically sealed by Nova Cloud Edges (U) Ltd'}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge-tag" style={{ background: verifyResult.status === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.2)', color: verifyResult.status === 'Paid' ? '#10b981' : '#2563eb', fontSize: '0.85rem', fontWeight: '800', padding: '0.35rem 0.85rem' }}>
                  ● {verifyResult.status || 'Active'}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Ref: <strong>{verifyResult.document_number}</strong>
                </div>
              </div>
            </div>

            {/* Document Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Document Type</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>{verifyResult.document_type}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Issued To / Customer</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {verifyResult.customer_name} {verifyResult.company ? `(${verifyResult.company})` : ''}
                </div>
                {verifyResult.customer_email && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{verifyResult.customer_email}</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Clearance Value</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)', marginTop: '2px' }}>
                  UGX {Number(verifyResult.total_amount).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Date of Issuance</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                  {new Date(verifyResult.issued_date || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Itemized Line Items Breakdown */}
            {((verifyResult.items && verifyResult.items.length > 0) || (verifyResult.invoice && verifyResult.invoice.items && verifyResult.invoice.items.length > 0)) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Itemized Clearance Breakdown:
                </div>
                <div style={{ background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  {((verifyResult.items || verifyResult.invoice?.items) || []).map((it, idx, arr) => {
                    const qty = Number(it.quantity || it.qty || 1);
                    const price = Number(it.unit_price || it.price || Math.round((it.amount || verifyResult.total_amount) / qty));
                    const itemTotal = Number(it.amount || (price * qty));
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: idx < arr.length - 1 ? '1px solid var(--border-color)' : 'none', fontSize: '0.85rem' }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)' }}>{it.name || it.description}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>(Qty: {qty})</span>
                        </div>
                        <div style={{ fontWeight: '800', color: 'var(--primary)' }}>
                          UGX {itemTotal.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons: Download PDF & Share */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
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
                  generateInvoicePDF(targetInv, siteLogo);
                }}
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Download Official PDF Invoice
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Official Document URL copied to clipboard!', 'success');
                }}
                className="btn-secondary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ExternalLink size={16} /> Share Official Verification Link
              </button>
            </div>

            {/* Official Remittance & Issuer Information */}
            <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Official Issuer Entity:
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong>Nova Cloud Edges (U) Limited</strong> • Plot 14/16 Jinja Road, Kampala, Uganda<br />
                Registered Corporate Entity • Support: billing@ncloud.co.ug • Tel: +256 790 001 631
              </div>
            </div>

            {/* Verification Security Note */}
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.8rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} />
              <span>This clearance is verified directly against our central immutable ledger. Any paper or digital copy matching this reference number is official and legally binding.</span>
            </div>

          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card animate-fade-in" style={{ border: '2px solid #ef4444', padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <AlertCircle size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ef4444', marginBottom: '0.35rem' }}>
              Document Verification Unsuccessful
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
              {error} Please check the reference number on your document and try again, or contact our finance department for assistance.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
