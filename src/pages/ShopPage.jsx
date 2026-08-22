import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ShopPage({ setActivePage }) {
  const { addToCart } = useApp();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, searchTerm]);

  const categories = ['All', 'Digital Products', 'Cloud Services', 'Hardware & Security'];

  const filteredProducts = products.filter(prod => {
    const matchesCategory = category === 'All' || prod.category === category;
    const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prod.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.0rem', marginTop: '0.5rem' }}>Software Licenses & Cloud Hosting</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Official Intuit QuickBooks Enterprise v24.0, Zimbra Enterprise Email Mailboxes, Cloud Edge VPS Servers, and Network Firewalls.
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
            <div className="responsive-grid-shop" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.75rem'
            }}>
              {paginatedProducts.map(prod => (
                <div key={prod.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                  />

                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="badge-tag" style={{ fontSize: '0.7rem' }}>
                        {prod.badge || prod.category}
                      </span>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)' }}>
                        {prod.currency} {Number(prod.price).toLocaleString()} / mo
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                      {prod.name}
                    </h3>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1, marginBottom: '1.5rem', lineHeight: '1.5' }}>
                      {prod.short_desc || prod.description}
                    </p>

                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        onClick={() => addToCart(prod)}
                        className="btn-primary"
                        style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
                      >
                        <ShoppingBag size={16} /> Add to Cart
                      </button>
                    </div>

                  </div>

                </div>
              ))}
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

      </div>
    </div>
  );
}
