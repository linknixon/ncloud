import SEO from "../components/SEO";
import React, { useState } from 'react';
import { Download, Copy, Check, Sparkles, Palette, Shield, Layers, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BrandPage({ setActivePage }) {
  const { showToast } = useApp();
  const [copiedHex, setCopiedHex] = useState(null);

  const copyColor = (hex, label) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    showToast(`Copied ${label} (${hex}) to clipboard!`, 'success');
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const brandColors = [
    { name: 'Nova Indigo Primary', hex: '#6366f1', rgb: 'rgb(99, 102, 241)', role: 'Primary Brand, Hero CTA & Active Highlights' },
    { name: 'Deep Royal Navy', hex: '#1e1b4b', rgb: 'rgb(30, 27, 75)', role: 'Background Main, Deep Contrast Elements' },
    { name: 'Sky Cyan Edge', hex: '#0284c7', rgb: 'rgb(2, 132, 199)', role: 'Cloud Infrastructure & Secondary Buttons' },
    { name: 'Emerald Compliance', hex: '#10b981', rgb: 'rgb(16, 185, 129)', role: 'Digital Clearances, Success Badges' },
    { name: 'Amber Enterprise', hex: '#f59e0b', rgb: 'rgb(245, 158, 11)', role: 'System Advisories, Notice Banners' },
    { name: 'Rose Red Accent', hex: '#ef4444', rgb: 'rgb(239, 68, 68)', role: 'Expenditures, Critical Alerts & Security' }
  ];

  const brandAssets = [
    {
      title: 'Official Primary Vector Logo (SVG / PNG)',
      category: 'Primary Mark',
      format: 'Vector SVG • 4K PNG',
      dimensions: '2400 x 600 px',
      bgType: 'Dark / Transparent',
      preview: '/logo.svg',
      description: 'The canonical horizontal Nova Cloud Edges emblem with geometric edge cloud icon and bold corporate typography.'
    },
    {
      title: 'Sovereign Edge Cloud Emblem Icon',
      category: 'Symbol Icon',
      format: 'Vector SVG • Favicon ICO',
      dimensions: '512 x 512 px',
      bgType: 'App Icon / Favicon',
      preview: '/favicon.ico',
      description: 'Square isolated brand icon suitable for favicons, browser tabs, avatar profiles, and mobile app icons.'
    },
    {
      title: 'Monochrome White Reversed Logo',
      category: 'Print & Overlays',
      format: 'High-Res PNG',
      dimensions: '3000 x 800 px',
      bgType: 'Solid Color Overlays',
      preview: '/logo.svg',
      description: 'Pure white high-contrast vector silhouette designed for dark presentation slides, billboards, and staff badges.'
    },
    {
      title: 'Full Brand Guidelines & Press Kit (PDF)',
      category: 'Documentation',
      format: 'PDF Guide (v2.4)',
      dimensions: '24 Pages • 18MB',
      bgType: 'Corporate Guidelines',
      preview: null,
      description: 'Comprehensive brand standards manual covering typography hierarchy, clear space guidelines, and co-branding policies.'
    }
  ];

  return (
    <div className="container" style={{ padding: '3.5rem 1rem', maxWidth: '1200px' }}>
      <SEO title="Brand Assets | Nova Cloud" description="Download Nova Cloud brand assets and logos." keywords="Nova Cloud logo, brand guidelines, press kit" />
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '1rem' }}>
          <Sparkles size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.825rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Official Brand Assets & Identity Guidelines
          </span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          Nova Cloud Edges Brand Kit
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto', lineHeight: '1.6' }}>
          Download official high-resolution logos, access curated brand color palettes, typography specifications, and design guidelines for media and partner publications.
        </p>
      </div>

      {/* Brand Identity Cards Grid */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>Official Logo Packages</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vector and raster assets ready for digital and print production.</p>
          </div>
          <button
            onClick={() => showToast('Downloading complete Nova Brand Asset ZIP Package...', 'success')}
            className="btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem', gap: '0.5rem' }}
          >
            <Download size={16} /> Download All Assets (.ZIP)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
          {brandAssets.map((asset, idx) => (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div>
                {/* Visual Preview Box */}
                <div style={{
                  height: '140px',
                  background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, var(--bg-main) 70%)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  padding: '1rem'
                }}>
                  {asset.preview ? (
                    <img src={asset.preview} alt={asset.title} style={{ maxHeight: '60px', maxWidth: '80%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
                      <Layers size={40} />
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '4px' }}>PDF SPECIFICATION</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="badge-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', fontSize: '0.7rem' }}>
                    {asset.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>{asset.format}</span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--text-main)' }}>{asset.title}</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>{asset.description}</p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{asset.dimensions}</span>
                <button
                  onClick={() => showToast(`Downloaded ${asset.title}`, 'success')}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: '4px' }}
                >
                  <Download size={13} /> Get Asset
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Harmonious Color Palette Grid */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={20} color="var(--primary)" /> Curated Color Palette
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Click any color swatch to copy its Hexadecimal or RGB code to your clipboard.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {brandColors.map((color, idx) => (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Color Swatch */}
                <div
                  onClick={() => copyColor(color.hex, color.name)}
                  style={{
                    height: '80px',
                    borderRadius: '10px',
                    background: color.hex,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.85rem',
                    boxShadow: `0 8px 16px -4px ${color.hex}40`,
                    transition: 'transform 0.15s ease'
                  }}
                  title="Click to copy hex code"
                >
                  <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '0.25rem 0.6rem', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {copiedHex === color.hex ? <Check size={12} /> : <Copy size={12} />}
                    {color.hex}
                  </div>
                </div>

                <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{color.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{color.rgb}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{color.role}</div>
              </div>

              <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => copyColor(color.hex, color.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  {copiedHex === color.hex ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Hex</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography & Voice Guidelines */}
      <div className="glass-card" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Typography & Brand Voice</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Nova Cloud Edges communicates precision, enterprise sovereignty, and rock-solid reliability.
        </p>

        <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Primary Typeface</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem' }}>Plus Jakarta Sans / Inter</div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Used across headings, navigation titles, KPI counters, and button calls to action for crisp legibility on Retina screens.
            </p>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-emerald)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Monospace & Data</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.2rem', fontFamily: 'monospace' }}>JetBrains Mono</div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Used for invoice reference IDs, voucher tokens, IP addresses, SWIFT codes, and technical server node configurations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
