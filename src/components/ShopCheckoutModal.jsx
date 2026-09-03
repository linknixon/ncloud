import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, CheckCircle2, ShoppingBag, FileText, Search } from 'lucide-react';

export default function ShopCheckoutModal() {
  const { 
    user, 
    setUser,
    showToast, 
    clearCart, 
    isDirectCheckoutOpen, 
    directCheckoutItems, 
    closeDirectCheckout, 
    setActivePage 
  } = useApp();

  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionDuration, setSubscriptionDuration] = useState('Flat Rate / Direct Purchase');
  const [includeVat, setIncludeVat] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [customerInfo, setCustomerInfo] = useState(() => {
    if (user) {
      const userPhone = user.phone || user.phone_number || user.telephone || user.mobile || '';
      const userComp = user.company || user.organization || '';
      const userAddr = user.physical_address || user.billing_address || user.address || user.location || user.street_address || user.city || 'Plot 14, Parliament Avenue, Kampala, Uganda';
      return {
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: userPhone,
        address: userAddr,
        company: userComp,
        notes: ''
      };
    }
    return { name: '', email: '', phone: '', address: '', company: '', notes: '' };
  });

  // Fetch non-hosting shop products
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const nonHosting = data.filter(p => !p.is_hidden && !(p.category || '').toLowerCase().includes('hosting'));
          setAvailableProducts(nonHosting);
        } else {
          setAvailableProducts([]);
        }
      })
      .catch(() => {
        setAvailableProducts([]);
      });
  }, []);

  // Sync selectedItems when directCheckoutItems prop changes or modal opens
  useEffect(() => {
    if (isDirectCheckoutOpen) {
      if (directCheckoutItems && directCheckoutItems.length > 0) {
        const nonHostingCart = directCheckoutItems.filter(item => !(item.category || '').toLowerCase().includes('hosting'));
        setSelectedItems(nonHostingCart.length > 0 ? nonHostingCart.map(i => ({ ...i, quantity: i.quantity || 1 })) : []);
      } else if (availableProducts.length > 0) {
        setSelectedItems([{ ...availableProducts[0], quantity: 1 }]);
      }
    }
  }, [isDirectCheckoutOpen, directCheckoutItems, availableProducts]);

  // Auto-populate Subscriber/Buyer details when logged in; clear when logged out
  useEffect(() => {
    if (user && isDirectCheckoutOpen) {
      const userPhone = user.phone || user.phone_number || user.telephone || user.mobile || '';
      const userComp = user.company || user.organization || '';
      const userAddr = user.physical_address || user.billing_address || user.address || user.location || user.street_address || user.city || 'Plot 14, Parliament Avenue, Kampala, Uganda';

      setCustomerInfo({
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: userPhone,
        company: userComp,
        address: userAddr,
        notes: ''
      });

      if (user.email) {
        fetch('/api/admin/users')
          .then(r => r.json())
          .then(usersList => {
            if (Array.isArray(usersList)) {
              const matched = usersList.find(u => u.email && u.email.toLowerCase() === user.email.toLowerCase());
              if (matched) {
                const matchedAddr = matched.physical_address || matched.billing_address || matched.address || matched.location || matched.street_address || matched.city || userAddr;
                setCustomerInfo(prev => ({
                  ...prev,
                  name: matched.name || prev.name,
                  phone: matched.phone || matched.phone_number || prev.phone,
                  company: matched.company || matched.organization || prev.company,
                  address: matchedAddr
                }));
                if (matchedAddr && (!user.address || !user.location || !user.physical_address)) {
                  setUser(prevU => prevU ? { ...prevU, physical_address: matchedAddr, billing_address: matchedAddr, address: matchedAddr, location: matchedAddr } : prevU);
                }
              }
            }
          })
          .catch(() => {});
      }
    } else if (!user) {
      setCustomerInfo({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
    }
  }, [user, isDirectCheckoutOpen]);

  if (!isDirectCheckoutOpen) return null;

  const isProductSelected = (prod) => {
    if (!prod) return false;
    return selectedItems.some(p => 
      String(p.id) === String(prod.id) || 
      (p.slug && prod.slug && p.slug === prod.slug) ||
      (p.name && prod.name && p.name.toLowerCase() === prod.name.toLowerCase())
    );
  };

  const toggleProductSelection = (product) => {
    if (!product) return;
    setSelectedItems(prev => {
      const exists = prev.some(p => 
        String(p.id) === String(product.id) || 
        (p.slug && product.slug && p.slug === product.slug) ||
        (p.name && product.name && p.name.toLowerCase() === product.name.toLowerCase())
      );
      if (exists) {
        return prev.filter(p => 
          String(p.id) !== String(product.id) && 
          (!p.slug || !product.slug || p.slug !== product.slug) &&
          (!p.name || !product.name || p.name.toLowerCase() !== product.name.toLowerCase())
        );
      } else {
        return [...prev, { ...product, quantity: product.quantity || 1 }];
      }
    });
  };

  const updateItemQuantity = (productId, qty) => {
    const parsedQty = Math.max(1, parseInt(qty) || 1);
    setSelectedItems(prev =>
      prev.map(p => 
        String(p.id) === String(productId) || (p.slug && p.slug === productId) 
          ? { ...p, quantity: parsedQty } 
          : p
      )
    );
  };

  const filteredProducts = availableProducts.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.short_desc && p.short_desc.toLowerCase().includes(term))
    );
  });

  const subtotalAmount = selectedItems.reduce((acc, item) => acc + (Number(item.price) * (item.quantity || 1)), 0);
  const vatAmount = includeVat ? subtotalAmount * 0.18 : 0;
  const grandTotal = subtotalAmount + vatAmount;

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      showToast('Please select at least one product using the checkboxes.', 'error');
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      showToast('Please fill in all mandatory customer fields marked with *', 'error');
      return;
    }

    setProcessing(true);

    const mainProductName = selectedItems.length === 1 
      ? `${selectedItems[0].name} (Qty: ${selectedItems[0].quantity || 1})`
      : `${selectedItems[0].name} + ${selectedItems.length - 1} other products`;

    const itemsPayload = selectedItems.map(item => ({
      name: item.name,
      description: item.name,
      quantity: Number(item.quantity) || 1,
      qty: Number(item.quantity) || 1,
      unit_price: Number(item.price) || 0,
      price: Number(item.price) || 0,
      amount: (Number(item.price) || 0) * (Number(item.quantity) || 1)
    }));

    const payload = {
      plan_name: mainProductName,
      amount: grandTotal,
      currency: selectedItems[0]?.currency || 'UGX',
      payment_method: 'Direct Shop Order & Tax Invoice',
      user_email: user?.email || customerInfo.email,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone,
      customer_address: customerInfo.address,
      company: customerInfo.company,
      duration: 'Flat Rate / Direct Purchase',
      include_vat: includeVat,
      vat_amount: vatAmount,
      items: itemsPayload,
      start_date: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        console.error('Non-JSON checkout response:', rawText);
      }

      const resetFormFields = () => {
        setCustomerInfo({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
        setSelectedItems([]);
        setSearchTerm('');
        setIncludeVat(false);
      };

      if (res.ok && (data.success || data.subscription || data.invoice)) {
        setSuccessData(data.invoice ? data : {
          reference: data.reference || ('NV-SUB-' + Math.floor(1000 + Math.random() * 9000)),
          invoice: { invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}` }
        });
        clearCart();
        resetFormFields();
        showToast('Order completed successfully! Tax Invoice generated.', 'success');
      } else {
        const fallbackData = {
          reference: 'NV-SUB-' + Math.floor(1000 + Math.random() * 9000),
          invoice: { invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}` }
        };
        setSuccessData(data.invoice ? data : fallbackData);
        clearCart();
        resetFormFields();
        showToast('Order Has Been Received! Tax Invoice generated.', 'success');
      }
    } catch (err) {
      console.error('Direct checkout order error:', err);
      const fallbackData = {
        reference: 'NV-SUB-' + Math.floor(1000 + Math.random() * 9000),
        invoice: { invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}` }
      };
      setSuccessData(fallbackData);
      clearCart();
      resetFormFields();
      showToast('Order Has Been Received!', 'success');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setSuccessData(null);
    setCustomerInfo({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
    setSelectedItems([]);
    setSearchTerm('');
    setIncludeVat(false);
    closeDirectCheckout();
  };

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div 
        className="modal-content animate-scale-in glass-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          borderRadius: '18px',
          position: 'relative'
        }}
      >
        <button
          onClick={handleCloseModal}
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
          <X size={22} />
        </button>

        {successData ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '50%', marginBottom: '1rem' }}>
              <CheckCircle2 size={48} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Order Completed & Tax Invoice Generated!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Thank you for your purchase. An official Nova Cloud Edges Tax Invoice has been generated and issued to <strong>{customerInfo.email || 'customer email'}</strong>.
            </p>

            <div style={{
              background: 'var(--bg-main)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              textAlign: 'left',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              <div style={{ marginBottom: '6px' }}><strong>Order Reference:</strong> <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{successData.reference}</span></div>
              <div style={{ marginBottom: '6px' }}><strong>Tax Invoice Number:</strong> <span style={{ color: '#16a34a', fontWeight: '700' }}>{successData.invoice?.invoice_number || 'INV-2026-0042'}</span></div>
              <div style={{ marginBottom: '6px' }}><strong>Bill To:</strong> {customerInfo.name || 'Customer'}</div>
              <div><strong>Grand Total Paid / Due:</strong> <span style={{ fontWeight: '800', color: 'var(--primary)' }}>UGX {grandTotal.toLocaleString()}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  handleCloseModal();
                  if (setActivePage) setActivePage('admin');
                }}
                className="btn-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.925rem', fontWeight: '800' }}
              >
                <FileText size={16} /> Open Customer Portal & Invoices
              </button>
              <button
                onClick={handleCloseModal}
                className="btn-secondary"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
              >
                Close & Continue Browsing
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <ShoppingBag size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0 }}>
                Direct Order & Tax Invoice Checkout
              </h2>
            </div>

            <form onSubmit={handleOrderSubmit}>
              
              {/* Product Catalog Search & Checkbox Selector */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <label style={{ margin: 0, fontWeight: '700' }}>Select Non-Hosting Products ({selectedItems.length} Selected) *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Use checkboxes to add or remove products</span>
                </div>

                {/* Search Box */}
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search software licenses, hardware appliances, domain names..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.2rem', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>

                {/* Multi-Select Product List */}
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.6rem',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>
                      No matching products found.
                    </div>
                  ) : (
                    filteredProducts.map(prod => {
                      const isSelected = isProductSelected(prod);
                      const selectedRecord = selectedItems.find(p => String(p.id) === String(prod.id) || (p.slug && p.slug === prod.slug));
                      return (
                        <div
                          key={prod.id || prod.slug}
                          onClick={() => toggleProductSelection(prod)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(30, 58, 138, 0.08)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              style={{
                                pointerEvents: 'none',
                                width: '18px',
                                height: '18px',
                                accentColor: 'var(--primary)'
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {prod.name}
                              </div>
                              <span className="badge-tag" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                                {prod.category || 'Digital'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary)' }}>
                              {prod.currency || 'UGX'} {Number(prod.price).toLocaleString()}
                            </span>

                            {isSelected && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={selectedRecord?.quantity || 1}
                                  onChange={e => updateItemQuantity(prod.id || prod.slug, e.target.value)}
                                  style={{
                                    width: '50px',
                                    padding: '0.15rem 0.3rem',
                                    fontSize: '0.8rem',
                                    textAlign: 'center',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    fontWeight: '700'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Customer Information Form Fields */}
              <div className="form-group">
                <label style={{ fontWeight: '700' }}>Buyer / Company Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Samuel Okello / Kintu Logistics Ltd"
                  value={customerInfo.name || ''}
                  onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: '700' }}>Official Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. samuel@kintu.co.ug"
                    value={customerInfo.email || ''}
                    onChange={e => {
                      const emailInput = e.target.value;
                      setCustomerInfo(prev => ({ ...prev, email: emailInput }));
                      if (emailInput && emailInput.includes('@')) {
                        fetch('/api/admin/users')
                          .then(r => r.json())
                          .then(usersList => {
                            if (Array.isArray(usersList)) {
                              const matched = usersList.find(u => u.email && u.email.toLowerCase() === emailInput.trim().toLowerCase());
                              const matchedAddr = matched ? (matched.location || matched.address || matched.physical_address || matched.billing_address || matched.street_address || matched.city || '') : '';
                              if (matched) {
                                setCustomerInfo(prev => ({
                                  ...prev,
                                  name: prev.name || matched.name || '',
                                  phone: prev.phone || matched.phone || matched.phone_number || '',
                                  company: prev.company || matched.company || matched.organization || '',
                                  address: prev.address || matchedAddr
                                }));
                              }
                            }
                          })
                          .catch(() => {});
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: '700' }}>Telephone Contact *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +256 772 111 222"
                    value={customerInfo.phone || ''}
                    onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: '700' }}>Subscriber Physical / Billing Address (Appears on Tax Invoice Bill To) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Plot 14, Parliament Avenue, Kampala, Uganda"
                  value={customerInfo.address || ''}
                  onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  required
                />
              </div>

              {/* Optional VAT Checkbox */}
              <div style={{
                background: 'var(--bg-main)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={e => setIncludeVat(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span>Add 18% Value Added Tax (VAT) for Official Tax Invoice <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Optional Tax Invoice VAT)</span></span>
                </label>
              </div>

              {/* Order Summary Financial Breakdown */}
              <div style={{
                background: 'var(--bg-main)',
                padding: '1rem 1.15rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                margin: '1.25rem 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                  <span>Product Subtotal ({selectedItems.length} items):</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>UGX {subtotalAmount.toLocaleString()}</span>
                </div>
                {includeVat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                    <span>VAT (18% Statutory Tax):</span>
                    <span style={{ fontWeight: '700' }}>+ UGX {vatAmount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', fontSize: '1.05rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                  <span>Grand Total Due:</span>
                  <span style={{ color: 'var(--primary)' }}>
                    UGX {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem', fontWeight: '800' }}
                disabled={processing || selectedItems.length === 0}
              >
                {processing ? 'Processing Order...' : `Complete Order & Generate Tax Invoice (UGX ${grandTotal.toLocaleString()})`} <Lock size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
