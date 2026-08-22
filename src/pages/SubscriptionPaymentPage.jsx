import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Lock, Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function SubscriptionPaymentPage() {
  const { cart, showToast } = useApp();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Multi-selection state for packages to renew
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [subscriptionDuration, setSubscriptionDuration] = useState('1 Year');
  const [includeVat, setIncludeVat] = useState(true);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: ''
  });
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const packagesPerPage = 4;

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProducts([{ ...data[0], quantity: 1 }]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.short_desc && p.short_desc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProducts.length / packagesPerPage) || 1;
  const startIndex = (currentPage - 1) * packagesPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + packagesPerPage);

  const toggleSelectProduct = (prod) => {
    const exists = selectedProducts.some(p => p.id === prod.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== prod.id));
    } else {
      setSelectedProducts([...selectedProducts, { ...prod, quantity: 1 }]);
    }
  };

  const updatePackageQuantity = (id, qty) => {
    const newQty = Math.max(1, parseInt(qty) || 1);
    setSelectedProducts(selectedProducts.map(p =>
      p.id === id ? { ...p, quantity: newQty } : p
    ));
  };

  const durationMultiplier = subscriptionDuration === '6 Months' ? 6 : (subscriptionDuration === '2 Years' ? 24 : 12);
  const monthlyTotal = selectedProducts.reduce((acc, p) => acc + (Number(p.price) * (p.quantity || 1)), 0);
  const subtotalAmount = monthlyTotal * durationMultiplier;
  const vatAmount = includeVat ? subtotalAmount * 0.18 : 0;
  const grandTotal = subtotalAmount + vatAmount;

  const handlePayment = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) {
      showToast('Please select at least one package to renew.', 'error');
      return;
    }

    if (!includeVat) {
      showToast('Value Added Tax (VAT 18%) selection is mandatory for official tax invoices.', 'error');
      return;
    }

    setProcessing(true);

    const packageNames = selectedProducts.map(p => p.name).join(', ');

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: packageNames,
          amount: grandTotal,
          currency: 'UGX',
          payment_method: 'Direct Subscription Multi-Checkout',
          user_email: customerInfo.email
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Payment failed');

      setSuccessData({
        ...data.subscription,
        packagesCount: selectedProducts.length,
        duration: subscriptionDuration
      });
      showToast('Subscription payment completed successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.0rem', marginTop: '0.5rem' }}>Subscription & Service Payment</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Select your enterprise packages using checkboxes and complete your cloud subscription renewal.
          </p>
        </div>

        {successData ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Payment Successful!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Your transaction reference is <strong>{successData.reference}</strong>. A receipt has been issued and stored in the MySQL database.
            </p>

            <div style={{
              background: 'var(--bg-main)',
              padding: '1.25rem',
              borderRadius: '12px',
              maxWidth: '520px',
              margin: '0 auto 2rem',
              textAlign: 'left',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem'
            }}>
              <div><strong>Packages ({successData.packagesCount}):</strong> {successData.plan_name}</div>
              <div><strong>Subscription Period:</strong> {successData.duration}</div>
              <div><strong>Amount Paid:</strong> {successData.currency} {Number(successData.amount).toLocaleString()}</div>
              <div><strong>Status:</strong> Active / Confirmed</div>
            </div>

            <button onClick={() => setSuccessData(null)} className="btn-primary">
              Renew Another Subscription
            </button>
          </div>
        ) : (
          <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
            
            {/* Left Column: Multi-Selection Checkbox List for Packages to Renew */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Select Packages to Renew ({selectedProducts.length} Selected)</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search subscription packages..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.4rem', width: '100%' }}
                />
              </div>

              {/* Multi-Selection Checkbox Package List */}
              {loading ? (
                <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading packages...</div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>No packages matching search.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                  {paginatedProducts.map(prod => {
                    const isSelected = selectedProducts.some(p => p.id === prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleSelectProduct(prod)}
                        className="glass-card subscription-package-card"
                        style={{
                          padding: '1.25rem',
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                          background: isSelected ? 'rgba(30, 58, 138, 0.08)' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}
                      >
                        {/* Checkbox Input */}
                        <div style={{ flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div onClick
                            style={{
                              width: '20px',
                              height: '20px',
                              accentColor: 'var(--primary)',
                              cursor: 'pointer'
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '1.0rem', marginBottom: '0.2rem' }}>
                            {prod.name}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {prod.short_desc || prod.description}
                          </div>
                        </div>

                        <div className="subscription-package-price" style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--primary)' }}>
                            {prod.currency || 'UGX'} {Number(prod.price).toLocaleString()} / mo
                          </div>
                          {isSelected && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              <Check size={14} /> Selected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls (4 packages per page) */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}

            </div>

            {/* Right Column: Checkout Form */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Subscriber Information</h3>

              <form onSubmit={handlePayment}>
                <div className="form-group">
                  <label>Selected Package(s) ({selectedProducts.length})</label>
                  <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--primary)',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    {selectedProducts.length > 0 ? (
                      selectedProducts.map((p, idx) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: idx < selectedProducts.length - 1 ? '8px' : 0, gap: '0.5rem' }}>
                          <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            • {p.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Qty:</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={p.quantity || 1}
                              onChange={e => updatePackageQuantity(p.id, e.target.value)}
                              style={{
                                width: '54px',
                                padding: '0.2rem 0.35rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                textAlign: 'center'
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No package selected</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Name / Authorized Rep *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Kintu"
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Company / Organization</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Company name"
                    value={customerInfo.company}
                    onChange={e => setCustomerInfo({ ...customerInfo, company: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address (For License Key & Invoice) *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="admin@company.co.ug"
                    value={customerInfo.email}
                    onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="0790001631"
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Subscription Period / Duration *</label>
                  <select
                    className="form-input"
                    value={subscriptionDuration}
                    onChange={e => setSubscriptionDuration(e.target.value)}
                    style={{ fontWeight: '600' }}
                  >
                    <option value="6 Months">6 Months (Billed Semi-Annually)</option>
                    <option value="1 Year">1 Year / 12 Months (Billed Annually)</option>
                    <option value="2 Years">2 Years / 24 Months (Billed Biennially)</option>
                  </select>
                </div>

                {/* Tax & VAT Option Checkbox (Mandatory Required Field) */}
                <div style={{
                  background: 'var(--bg-main)',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid var(--primary)',
                  marginBottom: '1.25rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={includeVat}
                      onChange={e => setIncludeVat(e.target.checked)}
                      required
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <span>Add 18% Value Added Tax (VAT) for Official Tax Invoice <span style={{ color: '#dc2626' }}>* (Mandatory Statutory Tax)</span></span>
                  </label>
                </div>

                <div style={{
                  background: 'var(--bg-main)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  margin: '1.25rem 0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                    <span>Monthly Subtotal ({selectedProducts.length} items):</span>
                    <span>UGX {monthlyTotal.toLocaleString()} / mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                    <span>Subtotal ({subscriptionDuration}):</span>
                    <span>UGX {subtotalAmount.toLocaleString()}</span>
                  </div>
                  {includeVat && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                      <span>VAT (18% Tax):</span>
                      <span>+ UGX {vatAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)', marginTop: '0.4rem' }}>
                    <span>Grand Total Due:</span>
                    <span style={{ color: 'var(--primary)' }}>
                      UGX {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.9rem' }}
                  disabled={processing || selectedProducts.length === 0}
                >
                  {processing ? 'Processing Payment...' : `Complete Payment (${selectedProducts.length} Items)`} <Lock size={16} />
                </button>
              </form>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
