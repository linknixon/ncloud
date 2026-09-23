import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ChevronLeft, ChevronRight, Info, X, Wifi, Share2 } from 'lucide-react';

export default function ShopPage({ setActivePage }) {
  const { cart, addToCart, openDirectCheckout, openSubscriptionCheckout, showToast } = useApp();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quantities, setQuantities] = useState({});
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  const itemsPerPage = 9;

  const isWifiVoucherItem = (prod) => {
    if (!prod) return false;
    const cat = (prod.category || '').toLowerCase();
    const name = (prod.name || '').toLowerCase();
    return cat.includes('voucher') || cat.includes('wifi') || name.includes('voucher') || name.includes('wifi voucher');
  };

  const isHostingCategoryItem = (prod) => {
    if (!prod) return false;
    if (isWifiVoucherItem(prod)) return false;
    if (prod.checkout_type === 'hosting' || prod.checkout_flow === 'hosting') return true;
    if (prod.checkout_type === 'shop' || prod.checkout_flow === 'shop') return false;

    const categoryStr = (prod.category || '').toLowerCase();
    const nameStr = (prod.name || '').toLowerCase();
    const badgeStr = (prod.badge || '').toLowerCase();
    const keywords = ['hosting', 'cloud', 'vps', 'virtual server', 'cpanel', 'dedicated server', 'unifi controller', 'cloud storage', 'subscription'];
    return keywords.some(kw => categoryStr.includes(kw) || nameStr.includes(kw) || badgeStr.includes(kw));
  };

  const getPriceSuffix = (prod) => {
    if (!prod) return '';
    if (isWifiVoucherItem(prod)) return '/ pass';
    if (isHostingCategoryItem(prod)) return '/ mo';
    return '';
  };

  const getPriceLabel = (prod) => {
    if (!prod) return 'Price:';
    if (isWifiVoucherItem(prod)) return 'Pass Price:';
    if (isHostingCategoryItem(prod)) return 'Monthly Subscription:';
    return 'Price:';
  };

  const handleBuyNow = (prod, qty = 1) => {
    addToCart(prod, qty);
    if (setActivePage) setActivePage('subscription');
  };

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const loadedProducts = data.filter(p => !p.is_hidden);
          setProducts(loadedProducts);
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const itemSlug = params.get('item');
            if (itemSlug) {
              setSearchTerm(itemSlug.replace(/-/g, ' '));
              const matchingProd = loadedProducts.find(p => (p.slug || '').includes(itemSlug) || (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === itemSlug);
              if (matchingProd) setSelectedProductModal(matchingProd);
            }
          }
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

  // Public category tabs dynamically aggregated and prioritized
  const rawCategories = Array.from(new Set([
    ...dbCategories.filter(c => !c.is_hidden && !c.hidden).map(c => c.name),
    ...products.map(p => p.category)
  ].filter(Boolean)));

  const priorityTabs = ['WiFi Vouchers', 'Hosting Services', 'Hardware & Security'];
  const categories = [
    'All',
    ...priorityTabs.filter(cat => rawCategories.includes(cat)),
    ...rawCategories.filter(cat => !priorityTabs.includes(cat)).sort()
  ];

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

  // Dynamic Google Search Schema.org ItemList for Nova Cloud Shop
  const shopSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Nova Cloud Shop Uganda",
    "description": "Official Nova Cloud online shop for Cloud VPS, Server Racks, Zimbra Mail, QuickBooks ERP Licenses, and Enterprise Networking Hardware in Uganda.",
    "url": "https://ncloud.co.ug/shop",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": filteredProducts.length,
      "itemListElement": (filteredProducts.length > 0 ? filteredProducts.slice(0, 20) : products.slice(0, 15)).map((p, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "item": {
          "@type": "Product",
          "name": `${p.name} - Nova Cloud Uganda`,
          "description": p.description || `${p.name} available at Nova Cloud Edges Kampala Uganda.`,
          "image": p.image_url || "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
          "category": p.category || "Cloud & IT Solutions",
          "brand": {
            "@type": "Brand",
            "name": "Nova Cloud"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "UGX",
            "price": p.price ? String(p.price) : "50000",
            "priceValidUntil": "2027-12-31",
            "availability": "https://schema.org/InStock",
            "itemCondition": "https://schema.org/NewCondition",
            "seller": {
              "@type": "Organization",
              "name": "Nova Cloud (U) Limited",
              "url": "https://ncloud.co.ug"
            }
          }
        }
      }))
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO 
        title="Nova Cloud Shop Uganda | Cloud VPS, Servers, Enterprise ERP, WiFi Vouchers & IT Hardware" 
        description="Shop official Nova Cloud infrastructure in Uganda. Buy Cloud VPS Hosting, Tier III Colocation, Zimbra Corporate Email, QuickBooks Enterprise ERP, WiFi Hotspot Vouchers, Routers & IT hardware with instant delivery in Kampala." 
        keywords="Nova Cloud, Nova Cloud Uganda, Nova Cloud shop, Nova Cloud store, Nova Cloud Edges, buy Nova Cloud, cloud provider Uganda, cloud hosting Kampala, buy VPS Uganda, enterprise server Uganda, MikroTik routers Kampala, Zimbra email Uganda, WiFi vouchers Kampala, IT hardware shop Uganda, QuickBooks ERP Uganda" 
        canonical="https://ncloud.co.ug/shop"
        ogTitle="Nova Cloud Shop Uganda | Cloud VPS, Enterprise ERP & Hardware"
        ogDescription="Official Nova Cloud store in Uganda. Instant deployment for Cloud VPS, Corporate Email, QuickBooks ERP, WiFi Passes, and Networking Hardware."
        schemaJson={shopSchema}
      />
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '999px', background: 'rgba(30, 58, 138, 0.12)', color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Official Nova Cloud Store • Kampala, Uganda
          </div>
          <h1 style={{ fontSize: '2.1rem', marginTop: '0.2rem' }}>Nova Cloud Shop: Infrastructure, Enterprise ERP & IT Solutions</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '680px', margin: '0.5rem auto 0' }}>
            Explore enterprise cloud hosting, high-speed WiFi vouchers, QuickBooks ERP licenses, and carrier-grade IT networking hardware with localized sovereign delivery in Uganda.
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
                        style={{ fontSize: '1.15rem', marginBottom: '0.5rem', lineHeight: '1.3', fontWeight: '800', cursor: 'pointer' }}
                      >
                        {prod.name}
                      </h3>

                      {isWifiVoucherItem(prod) && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: '8px',
                          padding: '0.35rem 0.6rem',
                          marginBottom: '0.65rem',
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: '700'
                        }}>
                          <Wifi size={13} />
                          <span>Instant Pass Token &bull; 1 Device &bull; High Speed</span>
                        </div>
                      )}

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
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getPriceLabel(prod)}</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--primary)' }}>
                          {prod.currency || 'UGX'} {Number(prod.price).toLocaleString()} {getPriceSuffix(prod) && <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>{getPriceSuffix(prod)}</span>}
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
                            <button
                              onClick={() => {
                                const slug = prod.slug || prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                const permalink = `${window.location.origin}/shop?item=${slug}`;
                                navigator.clipboard.writeText(permalink).then(() => {
                                  if (showToast) showToast('Product link copied to clipboard!', 'success');
                                });
                              }}
                              className="btn-secondary"
                              style={{ padding: '0.6rem 0.5rem', flexShrink: 0, title: 'Share Product' }}
                            >
                              <Share2 size={15} />
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{getPriceLabel(selectedProductModal)}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--primary)' }}>
                    {selectedProductModal.currency || 'UGX'} {Number(selectedProductModal.price).toLocaleString()} {getPriceSuffix(selectedProductModal) && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{getPriceSuffix(selectedProductModal)}</span>}
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
