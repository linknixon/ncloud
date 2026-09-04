import React, { useState, useEffect, useRef } from 'react';
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
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Edit3
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { theme, toggleTheme, user, setUser, logout, cart, openAuthModal, setIsCartOpen, setIsEditProfileOpen, siteLogo, showToast } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleProfileMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setShowProfileDropdown(true);
  };

  const handleProfileMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowProfileDropdown(false);
    }, 250);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin': return { label: 'Super Admin', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' };
      case 'sales_admin': return { label: 'Sales Manager', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' };
      case 'it_support': return { label: 'IT Infrastructure', color: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' };
      case 'client_enterprise': return { label: 'Enterprise Client', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' };
      default: return { label: 'User Account', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' };
    }
  };



  const [showBanner, setShowBanner] = useState(() => {
    const dismissedUntil = localStorage.getItem('nova_banner_dismissed_until');
    return !(dismissedUntil && Number(dismissedUntil) > Date.now());
  });
  const [announcement, setAnnouncement] = useState({
    enabled: true,
    badge: 'NEW NOTICE',
    text: 'Major Datacenter Expansion: 20 New 1U/2U High-Density Colocation Server Racks now live with 10Gbps Cross-Connects!',
    link_text: 'Explore Datacenter Services',
    link_url: '/services',
    schedule_type: 'always',
    timing_seconds: 0,
    auto_dismiss_hours: 24,
    start_date: '',
    end_date: '',
    bg_gradient: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
  });

  useEffect(() => {
    // Check for custom banner settings from API or localStorage
    const savedCustomMsg = localStorage.getItem('nova_banner_custom_msg');
    const savedCustomGrad = localStorage.getItem('nova_banner_bg_gradient');

    fetch('/api/admin/banner-settings')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.enabled !== 'undefined') {
          setAnnouncement(prev => ({
            ...prev,
            enabled: data.enabled,
            text: data.message || prev.text,
            timing_seconds: data.timing_seconds || 0,
            auto_dismiss_hours: data.auto_dismiss_hours || 24,
            bg_gradient: data.bg_gradient || prev.bg_gradient
          }));
        }
      })
      .catch(() => {
        fetch('/api/announcement')
          .then(res => res.json())
          .then(data => {
            if (data && typeof data.enabled !== 'undefined') {
              setAnnouncement(prev => ({ ...prev, ...data }));
            }
          })
          .catch(() => {});
      });

    if (savedCustomMsg) {
      setAnnouncement(prev => ({ ...prev, text: savedCustomMsg, bg_gradient: savedCustomGrad || prev.bg_gradient }));
    }
  }, []);

  // Optional timing auto-dismiss timer if configured
  useEffect(() => {
    if (announcement?.timing_seconds > 0 && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, announcement.timing_seconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement?.timing_seconds, showBanner]);

  const handleDismissBanner = () => {
    setShowBanner(false);
    const durationHours = announcement?.auto_dismiss_hours || 24;
    localStorage.setItem('nova_banner_dismissed_until', String(Date.now() + (durationHours * 3600 * 1000)));
  };

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isAnnouncementVisible = () => {
    if (!showBanner || !announcement || !announcement.enabled) return false;
    const dismissedUntil = localStorage.getItem('nova_banner_dismissed_until');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) return false;
    if (announcement.schedule_type === 'scheduled') {
      const now = new Date();
      if (announcement.start_date && new Date(announcement.start_date) > now) return false;
      if (announcement.end_date && new Date(announcement.end_date) < now) return false;
    }
    return true;
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'shop', label: 'Shop' },
    { id: 'jobs', label: 'Careers' },
    { id: 'subscription', label: 'Hosting' },
    { id: 'contact', label: 'Contact' }
  ];

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 1000, width: '100%' }}>
      {/* Dynamic Announcement Top Banner */}
      {isAnnouncementVisible() && (
        <div style={{
          background: announcement.bg_gradient || 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '0.45rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          position: 'relative',
          zIndex: 1001,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        }}>
          {announcement.badge && (
            <span style={{
              background: '#ffffff',
              color: '#dc2626',
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.725rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {announcement.badge}
            </span>
          )}
          <span>
            {announcement.text}
          </span>
          {announcement.link_text && (
            <button
              onClick={() => {
                if (announcement.link_url && announcement.link_url.startsWith('/')) {
                  setActivePage(announcement.link_url.replace('/', ''));
                } else if (announcement.link_url) {
                  window.open(announcement.link_url, '_blank');
                } else {
                  setActivePage('news');
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
                padding: '0.15rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {announcement.link_text} →
            </button>
          )}
          <button
            onClick={handleDismissBanner}
            style={{
              background: 'none',
              color: '#ffffff',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              marginLeft: '0.5rem',
              cursor: 'pointer',
              opacity: 0.9
            }}
            title="Dismiss Announcement"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <header
        className={`glass-header ${isScrolled ? 'is-sticky-scrolled' : ''}`}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: isScrolled
            ? (theme === 'dark' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.94)')
            : 'var(--bg-glass)',
          boxShadow: isScrolled
            ? '0 10px 30px -10px rgba(0, 0, 0, 0.3), 0 4px 12px -2px rgba(0, 0, 0, 0.15)'
            : 'none',
          borderBottom: '1px solid var(--border-color)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        
        {/* Brand Logo */}
        <div 
          onClick={() => { setActivePage('home'); setMobileOpen(false); }}
          style={{ cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          {siteLogo ? (
            <img src={siteLogo} alt="Nova Cloud Edges Logo" style={{ height: '44px', maxWidth: '180px', objectFit: 'contain' }} />
          ) : (
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.03em' }}>
                NOVA <span style={{ color: 'var(--accent-cyan)' }}>CLOUD EDGES</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: '700', marginTop: '3px' }}>
                EMPOWERING TECHNOLOGY SOLUTIONS
              </div>
            </div>
          )}
        </div>

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }} className="desktop-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'admin' && !user) {
                  openAuthModal('login');
                } else {
                  setActivePage(item.id);
                }
              }}
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

          <button
            onClick={() => {
              if (!user) {
                openAuthModal('login');
              } else {
                setActivePage('admin');
              }
            }}
            style={{
              background: 'rgba(124, 58, 237, 0.1)',
              color: 'var(--primary)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <LayoutDashboard size={15} /> Portal
          </button>
        </nav>

        {/* Actions (Cart, Theme, Auth / Circular Profile) */}
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

          {/* Logged-In Circular Profile Box with Hover Selection Dropdown */}
          {user ? (
            <div 
              className="desktop-auth"
              style={{ position: 'relative' }}
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
            >
              {/* Circular Box Profile Trigger */}
              <div 
                onClick={() => setShowProfileDropdown(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.75rem 0.35rem 0.4rem',
                  background: showProfileDropdown ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  border: showProfileDropdown ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  boxShadow: showProfileDropdown ? '0 0 14px rgba(124, 58, 237, 0.25)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                {/* Circular Profile Avatar Box */}
                <div style={{ position: 'relative' }}>
                  <div 
                    className="profile-avatar-circle"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-card)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      overflow: 'hidden'
                    }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  {/* Online Status Dot */}
                  <span style={{
                    position: 'absolute',
                    bottom: '1px',
                    right: '1px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    border: '2px solid var(--bg-card)',
                    boxShadow: '0 0 4px rgba(16, 185, 129, 0.6)'
                  }} />
                </div>

                {/* Profile Name & Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {user.name}
                  </span>
                  <ChevronDown 
                    size={15} 
                    style={{ 
                      color: 'var(--text-muted)', 
                      transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Hover Floating Dropdown Menu */}
              {showProfileDropdown && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '290px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
                    zIndex: 1100,
                    padding: '0.85rem',
                    animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* Header User Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                      color: '#fff',
                      fontWeight: '800',
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                    }}>
                      {getInitials(user.name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      {(() => {
                        const badge = getRoleBadge(user.role);
                        return (
                          <span style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            color: badge.color,
                            background: badge.bg,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions List */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        if (!user) {
                          if (openAuthModal) openAuthModal('login');
                          return;
                        }
                        window.history.pushState({}, '', '/subscriptions?tab=invoices');
                        if (setActivePage) setActivePage('admin');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(37, 99, 235, 0.08)',
                        color: '#2563eb',
                        fontSize: '0.825rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <ShoppingBag size={15} /> My Orders
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setIsEditProfileOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(124, 58, 237, 0.08)',
                        color: 'var(--primary)',
                        fontSize: '0.825rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <Edit3 size={15} /> Edit Profile Settings
                    </button>



                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setActivePage('admin');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.825rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <LayoutDashboard size={15} color="var(--secondary)" /> Portal Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        logout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        fontSize: '0.825rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        marginTop: '0.2rem'
                      }}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              className="desktop-auth"
              onClick={() => openAuthModal('login')}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                padding: '0.5rem 1.1rem',
                borderRadius: '999px',
                fontWeight: '700',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)'
              }}
            >
              <User size={16} /> Sign In
            </button>
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
          {user && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '12px',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-color)',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getInitials(user.name)}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
              </div>



              <button
                onClick={() => {
                  setIsMobileMenuOpen ? setIsMobileMenuOpen(false) : setMobileOpen(false);
                  if (!user) {
                    if (openAuthModal) openAuthModal('login');
                    return;
                  }
                  window.history.pushState({}, '', '/subscriptions?tab=invoices');
                  if (setActivePage) setActivePage('admin');
                }}
                style={{
                  width: '100%',
                  marginTop: '0.65rem',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <ShoppingBag size={14} /> My Orders
              </button>

              <button
                onClick={() => {
                  setMobileOpen(false);
                  setIsEditProfileOpen(true);
                }}
                style={{
                  width: '100%',
                  marginTop: '0.4rem',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  color: 'var(--primary)',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={14} /> Edit Profile Settings
              </button>
            </div>
          )}

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
          
          <button
            onClick={() => {
              setMobileOpen(false);
              if (!user) {
                openAuthModal('login');
              } else {
                setActivePage('admin');
              }
            }}
            style={{
              textAlign: 'left',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(124, 58, 237, 0.1)',
              color: 'var(--primary)',
              fontWeight: '700'
            }}
          >
            Portal Dashboard
          </button>

          {user && (
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              style={{
                textAlign: 'left',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          )}
        </div>
      )}
    </header>
    </div>
  );
}
