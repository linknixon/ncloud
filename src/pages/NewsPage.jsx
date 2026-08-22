import React, { useState, useEffect } from 'react';
import { Newspaper, Calendar, ArrowRight, Tag, Search } from 'lucide-react';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredNews = news.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container">
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span className="badge-tag">Latest Feeds & News</span>
          <h1 style={{ fontSize: '2.6rem', marginTop: '0.5rem' }}>Technology Insights & Announcements</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            Stay updated with enterprise cloud developments, ISO security compliance announcements, and Zimbra mail server advisories.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: '400px', margin: '0 auto 3rem', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search news & feeds..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.4rem', width: '100%' }}
          />
        </div>

        {/* News Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading latest news feeds...
          </div>
        ) : filteredNews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            No news articles matching your search query.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.25rem' }}>
            {filteredNews.map(item => (
              <div key={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                />
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                    <span className="badge-tag" style={{ fontSize: '0.7rem' }}>{item.category}</span>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} /> {item.date}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', marginBottom: '0.65rem', lineHeight: '1.35' }}>
                    {item.title}
                  </h2>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    {item.summary}
                  </p>

                  <button
                    style={{
                      background: 'none',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginTop: 'auto'
                    }}
                  >
                    Read Full Article <ArrowRight size={16} />
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
