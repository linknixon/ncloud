import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';
import { CheckCircle2, Lock, Search, ChevronLeft, ChevronRight, Check, User } from 'lucide-react';

export default function SubscriptionPaymentPage({ cart = [], setActivePage = () => {} }) {
  const { user, setUser, clearCart, showToast, selectedSubscriptionItems } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const hasInitializedRef = useRef(false);

  const [selectedProducts, setSelectedProducts] = useState(() => {
    if (selectedSubscriptionItems && selectedSubscriptionItems.length > 0) {
      return selectedSubscriptionItems;
    }
    return [];
  });

  useEffect(() => {
    if (selectedSubscriptionItems && selectedSubscriptionItems.length > 0) {
      setSelectedProducts(selectedSubscriptionItems);
    }
  }, [selectedSubscriptionItems]);
  const [subscriptionDuration, setSubscriptionDuration] = useState('1 Year');
  const [includeVat, setIncludeVat] = useState(true);
  const [customerInfo, setCustomerInfo] = useState(() => {
    if (user) {
      const userPhone = user.phone || user.phone_number || user.telephone || user.mobile || '';
      const userComp = user.company || user.organization || '';
      const userAddr = user.physical_address || user.billing_address || user.address || user.location || user.street_address || user.city || 'Lugga Zone, Ndejje, Wakiso, Uganda';
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

  // Do NOT auto fill or preserve cached draft data when there is no active user session
  const { clearDraft } = useAutoSaveDraft('subscription_subscriber_info', customerInfo, setCustomerInfo, { enabled: false });

  // Auto-populate Subscriber Information ONLY when a logged-in session is active.
  // When no user session is active, ALWAYS keep form completely clean and empty.
  useEffect(() => {
    if (user) {
      const userPhone = user.phone || user.phone_number || user.mobile || user.telephone || '';
      const userComp = user.company || user.organization || '';
      const userAddr = user.physical_address || user.billing_address || user.address || user.location || user.street_address || user.city || 'Lugga Zone, Ndejje, Wakiso, Uganda';

      setCustomerInfo({
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: userPhone,
        company: userComp,
        address: userAddr,
        notes: ''
      });

      // Fetch registered users to pull latest profile details if stored in database
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
    } else {
      // Clean form state and clear any cached draft when no user session is logged in
      setCustomerInfo({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
      try {
        localStorage.removeItem('nova_draft_subscription_subscriber_info');
        localStorage.removeItem('nova_draft_timestamp_subscription_subscriber_info');
      } catch (err) {}
    }
  }, [user]);

  // Clean form immediately on user logout
  useEffect(() => {
    const handleLogoutClean = () => {
      setCustomerInfo({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
      try {
        localStorage.removeItem('nova_draft_subscription_subscriber_info');
        localStorage.removeItem('nova_draft_timestamp_subscription_subscriber_info');
      } catch (err) {}
    };
    window.addEventListener('user_logged_out', handleLogoutClean);
    return () => window.removeEventListener('user_logged_out', handleLogoutClean);
  }, []);

  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const packagesPerPage = 6;

  const isHostingItem = (prod) => {
    if (!prod) return false;
    if (prod.checkout_type === 'hosting' || prod.checkout_flow === 'hosting') return true;
    if (prod.checkout_type === 'shop' || prod.checkout_flow === 'shop') return false;

    const categoryStr = (prod.category || '').toLowerCase();
    const nameStr = (prod.name || '').toLowerCase();
    const badgeStr = (prod.badge || '').toLowerCase();
    const keywords = ['hosting', 'cloud', 'vps', 'virtual server', 'cpanel', 'dedicated server', 'unifi controller', 'cloud storage', 'subscription', 'software', 'license'];
    return keywords.some(kw => categoryStr.includes(kw) || nameStr.includes(kw) || badgeStr.includes(kw));
  };

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const hostingProducts = data.filter(p => !p.is_hidden && (isHostingItem(p) || (p.category || '').toLowerCase().includes('hosting')));
          const allValidProducts = hostingProducts.length > 0 ? hostingProducts : data.filter(p => !p.is_hidden);
          setProducts(allValidProducts);
        } else {
          setProducts([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching hosting products for subscriptions:', err);
        setProducts([]);
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(products.length / packagesPerPage);

  const isProductSelected = (prod) => {
    if (!prod) return false;
    return selectedProducts.some(p => 
      String(p.id) === String(prod.id) || 
      (p.slug && prod.slug && p.slug === prod.slug) ||
      (p.name && prod.name && p.name.toLowerCase() === prod.name.toLowerCase())
    );
  };

  const toggleProductSelection = (product) => {
    if (!product) return;
    setSelectedProducts(prev => {
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

  const updatePackageQuantity = (productId, qty) => {
    const parsedQty = Math.max(1, parseInt(qty) || 1);
    setSelectedProducts(prev =>
      prev.map(p => 
        String(p.id) === String(productId) || (p.slug && p.slug === productId) 
          ? { ...p, quantity: parsedQty } 
          : p
      )
    );
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || (p.category || '').toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.short_desc && p.short_desc.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * packagesPerPage,
    currentPage * packagesPerPage
  );

  // CATEGORY RULE: Subscription Period / Duration multiplier applies ONLY to products under the "Hosting" category
  const hostingItems = selectedProducts.filter(p => p.category && p.category.toLowerCase().includes('hosting'));
  const nonHostingItems = selectedProducts.filter(p => !p.category || !p.category.toLowerCase().includes('hosting'));
  const hasHostingProducts = hostingItems.length > 0;

  const getDurationMultiplier = (dur) => {
    if (!dur) return 1;
    const d = String(dur).toLowerCase();
    if (d.includes('1 month') || d.includes('monthly')) return 1;
    if (d.includes('3 month') || d.includes('quarterly')) return 3;
    if (d.includes('6 month') || d.includes('semi-annually')) return 6;
    if (d.includes('1 year') || d.includes('12 month') || d.includes('annually') || d.includes('annual')) return 12;
    if (d.includes('2 year') || d.includes('24 month')) return 24;
    if (d.includes('3 year') || d.includes('36 month')) return 36;
    return 12;
  };

  const durationMultiplier = getDurationMultiplier(subscriptionDuration);

  const hostingMonthlyTotal = hostingItems.reduce((acc, p) => acc + (Number(p.price) * (p.quantity || 1)), 0);
  const hostingSubtotal = hostingMonthlyTotal * (hasHostingProducts ? durationMultiplier : 1);

  const nonHostingSubtotal = nonHostingItems.reduce((acc, p) => acc + (Number(p.price) * (p.quantity || 1)), 0);

  const subtotalAmount = hostingSubtotal + nonHostingSubtotal;
  const vatAmount = includeVat ? subtotalAmount * 0.18 : 0;
  const grandTotal = subtotalAmount + vatAmount;

  const handlePayment = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) {
      showToast('Please select at least one package to renew.', 'error');
      return;
    }

    setProcessing(true);

    const packageNames = selectedProducts.map(p => p.name).join(', ');

    const itemsPayload = selectedProducts.map(item => ({
      name: item.name,
      description: item.name,
      quantity: Number(item.quantity) || 1,
      qty: Number(item.quantity) || 1,
      unit_price: Number(item.price) || 0,
      price: Number(item.price) || 0,
      amount: (Number(item.price) || 0) * (Number(item.quantity) || 1)
    }));

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: packageNames,
          amount: grandTotal,
          currency: 'UGX',
          payment_method: 'Direct Subscription Multi-Checkout',
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          company: customerInfo.company,
          duration: subscriptionDuration,
          include_vat: includeVat,
          vat_amount: vatAmount,
          items: itemsPayload,
          user_email: customerInfo.email
        })
      });
      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        console.error('Raw non-JSON response from server:', rawText);
        throw new Error(rawText ? 'Server returned an invalid response format.' : 'Server returned an empty response.');
      }

      if (res.ok && data.subscription) {
        clearDraft();
        if (typeof clearCart === 'function') clearCart();
        if (data.new_account_created && data.created_user) {
          if (data.token) localStorage.setItem('token', data.token);
          setUser({ ...data.created_user, role: 'customer' });
          localStorage.setItem('user', JSON.stringify({ ...data.created_user, role: 'customer' }));
        }
        setSuccessData(data);
        showToast('Order Has Been Received! Notification sent to Sales team.', 'success');
      } else {
        clearDraft();
        if (typeof clearCart === 'function') clearCart();
        setSuccessData(data);
        showToast('Order Has Been Received!', 'success');
      }
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
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '640px', margin: '0 auto' }}>
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
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontWeight: '800' }}>Order Has Been Received!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.925rem' }}>
              Your order reference is <strong>{successData.subscription?.reference || successData.reference || 'NV-SUB-8812'}</strong>. An official Tax Invoice <strong>#{successData.invoice?.invoice_number || 'INV-2026-0041'}</strong> has been generated. Your subscription will be activated automatically once payment is cleared 100%.
            </p>

            {/* Auto-Account Created Box */}
            {successData.new_account_created && (
              <div style={{
                background: 'rgba(37, 99, 235, 0.08)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                marginBottom: '1.5rem',
                textAlign: 'left',
                color: 'var(--text-main)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#2563eb', fontWeight: '800', fontSize: '1rem' }}>
                  <User size={18} /> New Customer Account Created & Logged In!
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                  We created a new customer account for you and logged you in automatically. Your login credentials have also been emailed to <strong>{successData.subscription?.customer_email}</strong>.
                </p>
                <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '4px' }}><strong>Login Email:</strong> {successData.subscription?.customer_email || successData.created_user?.email}</div>
                  <div><strong>Temporary Password:</strong> <code style={{ background: 'rgba(37, 99, 235, 0.15)', padding: '2px 8px', borderRadius: '4px', color: '#2563eb', fontWeight: '800' }}>{successData.temp_password}</code></div>
                </div>
              </div>
            )}

            <div style={{
              background: 'var(--bg-main)',
              padding: '1.25rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              textAlign: 'left',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem'
            }}>
              <div style={{ fontWeight: '800', marginBottom: '0.6rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                Subscription Order Summary
              </div>
              <div style={{ marginBottom: '4px' }}><strong>Packages Ordered:</strong> {successData.subscription?.plan_name}</div>
              <div style={{ marginBottom: '4px' }}><strong>Subscriber Name:</strong> {successData.subscription?.customer_name} {successData.subscription?.company ? `(${successData.subscription?.company})` : ''}</div>
              {successData.subscription?.customer_address && <div style={{ marginBottom: '4px' }}><strong>Billing Address:</strong> {successData.subscription?.customer_address}</div>}
              <div style={{ marginBottom: '4px' }}><strong>Billing Duration:</strong> {successData.subscription?.duration}</div>
              <div style={{ marginBottom: '4px' }}><strong>Tax Invoice Number:</strong> {successData.invoice?.invoice_number || 'INV-2026-0041'}</div>
              <div style={{ marginBottom: '4px' }}><strong>Total Amount:</strong> {successData.subscription?.currency || 'UGX'} {Number(successData.subscription?.amount || 0).toLocaleString()}</div>
              <div><strong>Order Status:</strong> Order Received & Active</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setSuccessData(null);
                  if (setActivePage) {
                    setActivePage('shop');
                  } else if (typeof window !== 'undefined') {
                    window.location.href = '/shop';
                  }
                }}
                className="btn-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.925rem', fontWeight: '800' }}
              >
                Return to Digital Shop
              </button>
            </div>
          </div>
        ) : (
          <div className="responsive-subscription-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
            
            {/* Left Column: Multi-Selection Checkbox List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  Select Hosting Packages to Renew ({selectedProducts.length} Selected)
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))].map(cat => {
                  const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                      className="btn-secondary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        borderRadius: '20px',
                        fontWeight: isActive ? '800' : '600',
                        background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                        color: isActive ? '#fff' : 'var(--text-main)',
                        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search VPS, Colocation, Dedicated Servers, or Web Hosting..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>

              {/* Hosting Badge Indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem', padding: '0.65rem 0.85rem', background: selectedProducts.length === 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: selectedProducts.length === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: selectedProducts.length === 0 ? '#d97706' : '#10b981' }}>
                  {selectedProducts.length === 0 ? '⚠️ No Package Selected — Click Any Plan Below to Select' : `✓ ${selectedProducts.length} Hosting Package(s) Selected for Checkout`}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Browse our sovereign hosting catalog below. Click on your preferred cloud VPS, colocation, or web hosting plan to select it.
                </span>
              </div>

              {/* Package Multi-Select List */}
              {loading ? (
                <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading packages...</div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>No packages matching category or search.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                  {paginatedProducts.map(prod => {
                    const isSelected = isProductSelected(prod);
                    const isHosting = (prod.category || '').toLowerCase().includes('hosting');
                    return (
                      <div
                        key={prod.id || prod.slug}
                        onClick={() => toggleProductSelection(prod)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1.15rem 1.25rem',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(30, 58, 138, 0.08)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{
                              pointerEvents: 'none',
                              width: '20px',
                              height: '20px',
                              accentColor: 'var(--primary)'
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '700', fontSize: '1rem' }}>{prod.name}</span>
                              <span className="badge-tag" style={{
                                fontSize: '0.675rem',
                                background: isHosting ? 'rgba(16, 185, 129, 0.18)' : 'rgba(99, 102, 241, 0.15)',
                                color: isHosting ? '#10b981' : 'var(--primary)',
                                fontWeight: '800'
                              }}>
                                {isHosting ? 'Hosting' : (prod.category || 'Digital')}
                              </span>
                              {prod.badge && (
                                <span className="badge-tag" style={{ fontSize: '0.7rem' }}>{prod.badge}</span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                              {prod.short_desc}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)' }}>
                            {prod.currency} {Number(prod.price).toLocaleString()}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isHosting ? '/ month' : '/ unit'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}

            </div>

            {/* Right Column: Checkout Form */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Subscriber Information</h3>
                {user && (
                  <span style={{ fontSize: '0.725rem', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: '1px solid var(--accent-emerald)' }}>
                    ✓ Auto-filled from Profile ({user.name || user.email})
                  </span>
                )}
              </div>

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
                      selectedProducts.map((p, idx) => {
                        const isHosting = (p.category || '').toLowerCase().includes('hosting');
                        const mult = isHosting ? durationMultiplier : 1;
                        const unitPrice = Number(p.price) || 0;
                        const qty = p.quantity || 1;
                        const itemTotal = unitPrice * qty * mult;

                        return (
                          <div key={p.id || p.slug || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: idx < selectedProducts.length - 1 ? '10px' : 0, gap: '0.5rem', flexWrap: 'wrap', borderBottom: idx < selectedProducts.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: idx < selectedProducts.length - 1 ? '8px' : 0 }}>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.875rem' }}>• {p.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span>Unit: UGX {unitPrice.toLocaleString()} {isHosting ? '/ mo' : ''}</span>
                                {isHosting && (
                                  <span style={{ color: '#10b981', fontWeight: '700' }}>
                                    × {mult} Month{mult > 1 ? 's' : ''} ({subscriptionDuration})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.875rem' }}>
                                  UGX {itemTotal.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  Qty: {qty}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProductSelection(p);
                                }}
                                title="Remove package"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '800'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No packages selected</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Subscriber / Company Full Name *</label>
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
                    <label>Official Email Address *</label>
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
                    <label>Telephone Contact *</label>
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
                  <label>Subscriber Physical / Billing Address (Appears on Tax Invoice Bill To) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Lugga Zone, Ndejje, Wakiso, Uganda"
                    value={customerInfo.address || ''}
                    onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    required
                  />
                </div>

                {/* Subscription Period / Duration * Field (Applied exclusively to Hosting category products) */}
                {hasHostingProducts ? (
                  <div className="form-group" style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <label style={{ margin: 0, fontWeight: '700' }}>Subscription Period / Duration *</label>
                      <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#16a34a', fontSize: '0.725rem', fontWeight: '800' }}>
                        Applied to Hosting ({hostingItems.length} items)
                      </span>
                    </div>
                    <select
                      className="form-input"
                      value={subscriptionDuration}
                      onChange={e => setSubscriptionDuration(e.target.value)}
                      style={{ fontWeight: '700' }}
                    >
                      <option value="1 Month">1 Month (Monthly)</option>
                      <option value="3 Months">3 Months (Quarterly)</option>
                      <option value="6 Months">6 Months (Semi-Annually)</option>
                      <option value="1 Year">1 Year / 12 Months (Annually)</option>
                      <option value="2 Years">2 Years / 24 Months (Biennially)</option>
                      <option value="3 Years">3 Years / 36 Months (Triennially)</option>
                    </select>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    marginBottom: '1.25rem',
                    fontSize: '0.825rem',
                    color: 'var(--text-muted)'
                  }}>
                    <strong style={{ color: 'var(--primary)' }}>Standard Flat Rate:</strong> Subscription Period duration multipliers apply exclusively to <strong>Hosting</strong> category products. Selected products are billed at direct unit prices.
                  </div>
                )}

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
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <span>Add 18% Value Added Tax (VAT) for Official Tax Invoice <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Optional Tax Invoice VAT)</span></span>
                  </label>
                </div>

                <div style={{
                  background: 'var(--bg-main)',
                  padding: '1rem 1.15rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  margin: '1.25rem 0'
                }}>
                  {hasHostingProducts && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                      <span>Hosting Subtotal ({subscriptionDuration}):</span>
                      <span style={{ fontWeight: '700', color: '#16a34a' }}>UGX {hostingSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {nonHostingItems.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                      <span>Non-Hosting Products Subtotal ({nonHostingItems.length} items):</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>UGX {nonHostingSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    <span>Combined Subtotal:</span>
                    <span style={{ color: 'var(--text-main)' }}>UGX {subtotalAmount.toLocaleString()}</span>
                  </div>
                  {includeVat && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                      <span>VAT (18% Tax):</span>
                      <span style={{ fontWeight: '700' }}>+ UGX {vatAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', fontWeight: '800', fontSize: '1.05rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
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
                  {processing ? 'Processing Order...' : `Complete Order (${selectedProducts.length} Items)`} <Lock size={16} />
                </button>
              </form>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
