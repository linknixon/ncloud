import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Cloud, 
  Sun, 
  Moon, 
  ShoppingBag, 
  User, 
  Menu, 
  X, 
  ShieldAlert, 
  Briefcase, 
  CreditCard, 
  LayoutDashboard,
  LogOut
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { theme, toggleTheme, user, logout, cart, openAuthModal, setIsCartOpen } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'shop', label: 'Shop' },
    { id: 'jobs', label: 'Careers' },
    { id: 'subscription', label: 'Subscriptions' },
    { id: 'contact', label: 'Contact' }
  ];

  return (
    <>
      {/* Red Maintenance Updates Top Banner */}
      {showBanner && (
        <div style={{
          background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '0.45rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          position: 'relative',
          zIndex: 1001,
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
        }}>
          <span style={{
            background: '#ffffff',
            color: '#dc2626',
            padding: '0.15rem 0.55rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            New!!
          </span>
          <span>
            Scheduled Maintenance Update: Edge Cloud Server Upgrade & Maintenance scheduled Sunday 2:00 AM - 4:00 AM EAT. Hotline: <strong>0790001631</strong>
          </span>
          <button
            onClick={() => setShowBanner(false)}
            style={{
              background: 'none',
              color: '#ffffff',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              marginLeft: '0.5rem',
              opacity: 0.9
            }}
            title="Dismiss Announcement"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <header className="glass-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        
        {/* Brand Logo */}
        <div 
          onClick={() => { setActivePage('home'); setMobileOpen(false); }}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.03em' }}>
            NOVA <span style={{ color: 'var(--accent-cyan)' }}>CLOUD EDGES</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: '700', marginTop: '3px' }}>
            EMPOWERING TECHNOLOGY SOLUTIONS
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }} className="desktop-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                background: 'none',
                color: activePage === item.id ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: activePage === item.id ? '700' : '500',
                fontSize: '0.925rem',
                padding: '0.4rem 0.5rem',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                borderBottom: activePage === item.id ? '2px solid var(--primary)' : '2px solid transparent'
              }}
            >
              {item.label}
            </button>
          ))}

          {user && user.role === 'admin' && (
            <button
              onClick={() => setActivePage('admin')}
              style={{
                background: 'rgba(233, 30, 99, 0.1)',
                color: 'var(--secondary)',
                border: '1px solid rgba(233, 30, 99, 0.3)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <LayoutDashboard size={15} /> Admin Portal
            </button>
          )}
        </nav>

        {/* Actions (Cart, Theme, Auth) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          
          {/* Cart Icon */}
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              position: 'relative',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '0.6rem',
              borderRadius: '10px',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Shopping Cart"
          >
            <ShoppingBag size={20} />
            {cartTotalCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--secondary)',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: '800',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cartTotalCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '0.6rem',
              borderRadius: '10px',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#4f46e5" />}
          </button>

          {/* Auth Button */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <User size={16} color="var(--primary)" />
                {user.name.split(' ')[0]}
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  color: 'var(--text-muted)'
                }}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => openAuthModal('login')}
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  borderRadius: '10px',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <User size={15} /> Sign Up
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '0.6rem',
              borderRadius: '10px',
              color: 'var(--text-main)',
              display: 'none'
            }}
            className="mobile-toggle"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActivePage(item.id); setMobileOpen(false); }}
              style={{
                textAlign: 'left',
                padding: '0.75rem',
                borderRadius: '8px',
                background: activePage === item.id ? 'var(--bg-card-hover)' : 'transparent',
                color: activePage === item.id ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: '600'
              }}
            >
              {item.label}
            </button>
          ))}
          {user && user.role === 'admin' && (
            <button
              onClick={() => { setActivePage('admin'); setMobileOpen(false); }}
              style={{
                textAlign: 'left',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(233, 30, 99, 0.1)',
                color: 'var(--secondary)',
                fontWeight: '700'
              }}
            >
              Admin Portal
            </button>
          )}
          {!user && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => { openAuthModal('login'); setMobileOpen(false); }}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '0.6rem',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  fontWeight: '700',
                  borderRadius: '10px'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => { openAuthModal('register'); setMobileOpen(false); }}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.6rem' }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
    </>
  );
}
