import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Search, ChevronLeft, ChevronRight, Info, X, CheckCircle } from 'lucide-react';

export default function ShopPage({ setActivePage }) {
  const { addToCart, openDirectCheckout, openSubscriptionCheckout } = useApp();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quantities, setQuantities] = useState({});
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  const itemsPerPage = 9;

  const isHostingCategoryItem = (prod) => {
    if (!prod) return false;
    if (prod.checkout_type === 'hosting' || prod.checkout_flow === 'hosting') return true;
    if (prod.checkout_type === 'shop' || prod.checkout_flow === 'shop') return false;

    const categoryStr = (prod.category || '').toLowerCase();
    const nameStr = (prod.name || '').toLowerCase();
    const badgeStr = (prod.badge || '').toLowerCase();
    const keywords = ['hosting', 'cloud', 'vps', 'virtual server', 'cpanel', 'dedicated server', 'unifi controller', 'cloud storage', 'subscription'];
    return keywords.some(kw => categoryStr.includes(kw) || nameStr.includes(kw) || badgeStr.includes(kw));
  };

  const handleBuyNow = (prod, qty = 1) => {
    const isHosting = isHostingCategoryItem(prod);
    if (isHosting) {
      if (openSubscriptionCheckout) openSubscriptionCheckout([{ ...prod, quantity: qty }]);
      if (setActivePage) setActivePage('subscription');
    } else {
      if (openDirectCheckout) openDirectCheckout([{ ...prod, quantity: qty }]);
    }
  };

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.filter(p => !p.is_hidden));
        } else {
          setProducts([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });

    fetch('/api/admin/product-categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDbCategories(data);
        }
      })
      .catch(() => {});
  }, []);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, searchTerm]);

  // Public category tabs dynamically aggregated from Admin created categories & existing product categories
  const categories = ['All', ...Array.from(new Set([
    ...dbCategories.filter(c => !c.is_hidden && !c.hidden).map(c => c.name),
    ...products.map(p => p.category)
  ].filter(Boolean)))];

  const filteredProducts = products.filter(prod => {
    if (prod.is_hidden || prod.hidden) return false;

    const matchesCategory = category === 'All' || prod.category === category;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (prod.name || '').toLowerCase().includes(searchLower) ||
                          (prod.short_desc || prod.desc || '').toLowerCase().includes(searchLower) ||
                          (prod.description || prod.specs || prod.details || '').toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO title="IT Shop & Hardware | Nova Cloud" description="Shop for enterprise-grade IT hardware, networking equipment, and accessories." keywords="buy routers, switches, fiber cables, servers, UPS, IT equipment, Kampala" />
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.0rem', marginTop: '0.5rem' }}>Software Licenses & Cloud Hosting</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Explore enterprise software solutions, virtual private servers, digital licenses, and colocation infrastructure.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          padding: '1rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  background: category === cat ? 'var(--primary)' : 'var(--bg-main)',
                  color: category === cat ? '#fff' : 'var(--text-main)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading products catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            No products matching your search query.
          </div>
        ) : (
          <>
            <div className="shop-grid">
              {paginatedProducts.map(prod => {
                const isOutOfStock = (Number(prod.stock) || 0) <= 0;
                const shortDescription = prod.short_desc || prod.desc || 'No short description provided.';
                const fullSpecs = prod.description || prod.specs || prod.details || '';

                return (
                  <div key={prod.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: isOutOfStock ? 0.85 : 1 }}>
                    
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedProductModal(prod)}>
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        style={{ width: '100%', height: '200px', objectFit: 'cover', filter: isOutOfStock ? 'grayscale(30%)' : 'none' }}
                      />
                      {isOutOfStock && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', fontSize: '0.75rem', fontWeight: '800', padding: '0.3rem 0.65rem', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Out of Stock
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      
                      <div style={{ marginBottom: '0.65rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge-tag" style={{ fontSize: '0.7rem' }}>
                          {prod.badge || prod.category}
                        </span>
                        {isOutOfStock ? (
                          <span className="badge-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.7rem', fontWeight: '800' }}>
                            Unavailable (0 Units)
                          </span>
                        ) : (
                          <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: '700' }}>
                            In Stock ({prod.stock} Units)
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => setSelectedProductModal(prod)}
                        style={{ fontSize: '1.15rem', marginBottom: '0.65rem', lineHeight: '1.3', fontWeight: '800', cursor: 'pointer' }}
                      >
                        {prod.name}
                      </h3>

                      {/* Prominent Short Description Section */}
                      <div style={{ marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.725rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                          Short Description:
                        </div>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                          {shortDescription}
                        </p>
                      </div>

                      {/* Prominent Full Specifications Section */}
                      <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.75rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
                        <div style={{ fontSize: '0.725rem', fontWeight: '800', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                          Full Specifications:
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line', maxHeight: '95px', overflowY: 'auto' }}>
                          {fullSpecs || 'No full specifications provided.'}
                        </p>
                      </div>

                      {/* View Full Product Specifications Modal Trigger */}
                      <button
                        onClick={() => setSelectedProductModal(prod)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: 0,
                          marginBottom: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Info size={14} /> Expand Specs & Details Modal
                      </button>

                      {/* Dedicated Prominent Price Section */}
                      <div style={{
                        background: 'var(--bg-main)',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price:</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--primary)' }}>
                          {prod.currency || 'UGX'} {Number(prod.price).toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>/ mo</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max={prod.stock || 100}
                            disabled={isOutOfStock}
                            value={quantities[prod.id] || 1}
                            onChange={(e) => setQuantities({ ...quantities, [prod.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                            style={{
                              width: '52px',
                              padding: '0.4rem 0.3rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              textAlign: 'center',
                              opacity: isOutOfStock ? 0.5 : 1
                            }}
                          />
                        </div>

                        {isOutOfStock ? (
                          <button
                            disabled
                            className="btn-secondary"
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              padding: '0.65rem 0.85rem',
                              fontSize: '0.85rem',
                              opacity: 0.6,
                              cursor: 'not-allowed',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: '800'
                            }}
                          >
                            Out of Stock
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
                            <button
                              onClick={() => addToCart(prod, quantities[prod.id] || 1)}
                              className="btn-secondary"
                              style={{ flex: 1, justifyContent: 'center', padding: '0.6rem 0.5rem', fontSize: '0.8rem', fontWeight: '700' }}
                            >
                              + Cart
                            </button>
                            <button
                              onClick={() => handleBuyNow(prod, quantities[prod.id] || 1)}
                              className="btn-primary"
                              style={{ flex: 1, justifyContent: 'center', padding: '0.6rem 0.5rem', fontSize: '0.8rem', fontWeight: '800' }}
                            >
                              Buy Now
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (8 items per page) */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3.5rem' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '0.6rem 1.25rem' }}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '0.6rem 1.25rem' }}
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {/* FULL PRODUCT SPECIFICATIONS & DETAILS MODAL */}
        {selectedProductModal && (
          <div className="modal-overlay" onClick={() => setSelectedProductModal(null)}>
            <div
              className="modal-content animate-scale-in"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="badge-tag" style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                      {selectedProductModal.category}
                    </span>
                    {selectedProductModal.badge && (
                      <span className="badge-tag" style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                        {selectedProductModal.badge}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0, lineHeight: '1.3' }}>
                    {selectedProductModal.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProductModal(null)}
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem', height: '240px', background: 'var(--bg-main)' }}>
                <img
                  src={selectedProductModal.image_url}
                  alt={selectedProductModal.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Short Description Section */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Short Description
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                  {selectedProductModal.short_desc || selectedProductModal.desc || 'No short description provided.'}
                </p>
              </div>

              {/* Full Specifications Section */}
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Full Product Specifications & Licensing Terms
                </h4>
                {selectedProductModal.description || selectedProductModal.specs || selectedProductModal.details ? (
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: '1.75', whiteSpace: 'pre-line', margin: 0 }}>
                    {selectedProductModal.description || selectedProductModal.specs || selectedProductModal.details}
                  </p>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    No full specifications configured for this product.
                  </p>
                )}
              </div>

              {/* Pricing & Add to Cart Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Subscription Price:</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--primary)' }}>
                    {selectedProductModal.currency || 'UGX'} {Number(selectedProductModal.price).toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ mo</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {(Number(selectedProductModal.stock) || 0) <= 0 ? (
                    <button
                      disabled
                      className="btn-secondary"
                      style={{ padding: '0.75rem 1.25rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', cursor: 'not-allowed', fontWeight: '800' }}
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          addToCart(selectedProductModal, quantities[selectedProductModal.id] || 1);
                          setSelectedProductModal(null);
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.75rem 1.1rem', fontSize: '0.9rem' }}
                      >
                        + Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          const prod = selectedProductModal;
                          const qty = quantities[selectedProductModal.id] || 1;
                          setSelectedProductModal(null);
                          handleBuyNow(prod, qty);
                        }}
                        className="btn-primary"
                        style={{ padding: '0.75rem 1.35rem', fontSize: '0.95rem', fontWeight: '800' }}
                      >
                        Buy Now & Checkout
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
