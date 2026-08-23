import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Mail, 
  Briefcase, 
  CreditCard, 
  User, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Database,
  ShieldCheck,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Sliders,
  Users,
  Send,
  Plus,
  Edit,
  Tag,
  Search,
  ChevronRight,
  TrendingUp,
  Download,
  BellRing,
  ArrowLeft,
  Grid,
  Printer,
  FileCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, openAuthModal, showToast, setActivePage } = useApp();
  
  // Current Active Role state (Defaults to user's assigned role or 'super_admin')
  const [currentRole, setCurrentRole] = useState(user?.role || 'super_admin');
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form Modals State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSliderModal, setShowSliderModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // New Invoice Form Data
  const [invoiceForm, setInvoiceForm] = useState({
    customer_name: '',
    customer_email: '',
    amount: '',
    vat_amount: '',
    due_date: ''
  });

  // New Slider Form Data
  const [sliderForm, setSliderForm] = useState({
    title: '',
    subtitle: '',
    image: ''
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      const resData = await res.json();
      setData(resData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update role and set default appropriate card view
  const handleRoleSwitch = (newRole) => {
    setCurrentRole(newRole);
    setActiveTab('overview');
    showToast(`Switched active portal view to: ${getRoleTitle(newRole)}`, 'info');
  };

  // Helper function for role badge colors & titles
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return { bg: 'rgba(124, 58, 237, 0.15)', color: '#8b5cf6', label: 'Super Admin' };
      case 'sales_admin':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Sales Admin' };
      case 'web_admin':
        return { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', label: 'Web Admin' };
      case 'customer':
      default:
        return { bg: 'rgba(30, 58, 138, 0.15)', color: '#3b82f6', label: 'Customer' };
    }
  };

  const getRoleTitle = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin Authority';
      case 'sales_admin': return 'Sales & Invoicing Scope';
      case 'web_admin': return 'Web Content Management';
      case 'customer': return 'Customer Portal';
      default: return 'User Portal';
    }
  };

  // Action handlers
  const handleRoleUpdate = async (userId, targetRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      showToast(resData.message, 'success');
      fetchDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSendReminder = async (invoiceId, invoiceNumber) => {
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/remind`, { method: 'POST' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      showToast(resData.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      showToast(resData.message, 'success');
      setShowInvoiceModal(false);
      setInvoiceForm({ customer_name: '', customer_email: '', amount: '', vat_amount: '', due_date: '' });
      fetchDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateSlider = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/sliders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sliderForm)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      showToast(resData.message, 'success');
      setShowSliderModal(false);
      setSliderForm({ title: '', subtitle: '', image: '' });
      fetchDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Define role access flags
  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'admin';
  const isSalesAdmin = isSuperAdmin || currentRole === 'sales_admin';
  const isWebAdmin = isSuperAdmin || currentRole === 'web_admin';
  const isCustomer = currentRole === 'customer';

  // Unauthenticated User Gate Card
  if (!user) {
    return (
      <div className="animate-fade-in" style={{ paddingTop: '4rem', paddingBottom: '6rem', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="container" style={{ maxWidth: '480px' }}>
          <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(124, 58, 237, 0.12)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <ShieldCheck size={30} />
            </div>
            <h2 style={{ fontSize: '1.65rem', marginBottom: '0.4rem', fontWeight: '800' }}>Sign In to Nova Customer Portal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
              Access your active cloud subscriptions, software licenses, tax invoices, and management tools.
            </p>

            <button
              onClick={() => openAuthModal('login')}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem', fontWeight: '800', marginBottom: '1.25rem' }}
            >
              Sign In to Nova Customer Portal
            </button>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Don't have a customer account yet?{' '}
              <button
                onClick={() => openAuthModal('register')}
                style={{ background: 'none', color: 'var(--primary)', fontWeight: '700', border: 'none', cursor: 'pointer' }}
              >
                Sign Up Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div className="container">
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge-tag" style={{ background: getRoleBadgeStyle(currentRole).bg, color: getRoleBadgeStyle(currentRole).color, fontSize: '0.85rem' }}>
                Role: {getRoleBadgeStyle(currentRole).label}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Database size={14} /> MySQL Live Connected
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem' }}>Nova Management Portal</h1>
          </div>

          {/* Role Switcher Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', paddingRight: '0.25rem' }}>Role View:</span>
            <button
              onClick={() => handleRoleSwitch('super_admin')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: currentRole === 'super_admin' ? 'var(--primary)' : 'transparent', color: currentRole === 'super_admin' ? '#fff' : 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              <ShieldCheck size={14} /> Super Admin
            </button>
            <button
              onClick={() => handleRoleSwitch('sales_admin')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: currentRole === 'sales_admin' ? 'var(--accent-emerald)' : 'transparent', color: currentRole === 'sales_admin' ? '#fff' : 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              <DollarSign size={14} /> Sales Admin
            </button>
            <button
              onClick={() => handleRoleSwitch('web_admin')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: currentRole === 'web_admin' ? 'var(--accent-cyan)' : 'transparent', color: currentRole === 'web_admin' ? '#fff' : 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              <Sliders size={14} /> Web Admin
            </button>
            <button
              onClick={() => handleRoleSwitch('customer')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: currentRole === 'customer' ? 'var(--secondary)' : 'transparent', color: currentRole === 'customer' ? '#fff' : 'var(--text-main)', border: 'none', cursor: 'pointer' }}
            >
              <User size={14} /> Customer
            </button>
          </div>
        </div>

        {/* Back to All Modules Navigation Breadcrumb */}
        {activeTab !== 'overview' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('overview')}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={16} /> Return to All Portal Modules
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '0.5rem' }} />
            <div>Fetching live management records...</div>
          </div>
        ) : (
          <div>

            {/* OVERVIEW / CARD NAVIGATION MODULES GRID */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Metrics Summary Banner */}
                {!isCustomer && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem'
                  }}>
                    {isSalesAdmin && (
                      <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Issued Invoices</span>
                          <FileText size={20} color="var(--primary)" />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                          {data ? data.totalInvoices || 2 : 2}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: '600', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <TrendingUp size={12} /> +18.4% Revenue Growth
                        </div>
                      </div>
                    )}

                    {isSalesAdmin && (
                      <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Subscriptions</span>
                          <CreditCard size={20} color="var(--accent-emerald)" />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                          {data ? data.totalSubscriptions : 0}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Package Renewals Logged</div>
                      </div>
                    )}

                    {isWebAdmin && (
                      <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Inquiries</span>
                          <Mail size={20} color="var(--accent-cyan)" />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                          {data ? data.totalContacts : 0}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Support & Sales Messages</div>
                      </div>
                    )}

                    {isSuperAdmin && (
                      <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>System Accounts</span>
                          <Users size={20} color="var(--secondary)" />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                          {data ? data.totalUsers || 4 : 4}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Assigned Portal Roles</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section Header */}
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.4rem', fontWeight: '800' }}>
                    {getRoleBadgeStyle(currentRole).label} Management Modules
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Select any module card below to open interactive controls and configuration tools.
                  </p>
                </div>

                {/* Interactive Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Module Card: User & Role Management (Super Admin) */}
                  {isSuperAdmin && (
                    <div
                      onClick={() => setActiveTab('users')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#8b5cf6' }}>
                            {data?.totalUsers || 4} Users
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>User & Role Management</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Assign Super Admin, Sales Admin, Web Admin, and Customer roles. Manage user accounts and permissions.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.875rem' }}>
                        Manage User Roles <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: CMS & Graphic Sliders (Web Admin & Super Admin) */}
                  {isWebAdmin && (
                    <div
                      onClick={() => setActiveTab('cms')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sliders size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                            {data?.sliders?.length || 1} Banners
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>CMS, Sliders & Graphics</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Upload website graphics, configure homepage hero banners, and edit public announcements.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontWeight: '700', fontSize: '0.875rem' }}>
                        Configure Banners & Content <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: Products & Pricing (Sales Admin & Super Admin) */}
                  {isSalesAdmin && (
                    <div
                      onClick={() => setActiveTab('products')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Tag size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            Catalog Active
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Products, Services & Prices</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Update package price lists, adjust service charges, and toggle catalog stock availability.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)', fontWeight: '700', fontSize: '0.875rem' }}>
                        Update Prices & Products <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: Tax Invoices & Reminders (Sales Admin & Super Admin) */}
                  {isSalesAdmin && (
                    <div
                      onClick={() => setActiveTab('invoices')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            {data?.totalInvoices || 2} Invoices
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Invoices & Reminders</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Issue official customer tax invoices, track payment status, and dispatch payment reminder notifications.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', fontWeight: '700', fontSize: '0.875rem' }}>
                        Manage Invoices & Reminders <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: Subscriptions & Renewals (Sales Admin & Super Admin) */}
                  {isSalesAdmin && (
                    <div
                      onClick={() => setActiveTab('subscriptions')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                            {data?.totalSubscriptions || 1} Subscriptions
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Subscriptions & Renewals</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Process customer package renewals, view active plans, and extend subscription expiry dates.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ec4899', fontWeight: '700', fontSize: '0.875rem' }}>
                        View Subscriptions <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: Contact Messages (Web Admin & Super Admin) */}
                  {isWebAdmin && (
                    <div
                      onClick={() => setActiveTab('contacts')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Mail size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                            {data?.totalContacts || 1} Messages
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Contact Messages</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Read and respond to incoming customer support tickets and business inquiries.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: '700', fontSize: '0.875rem' }}>
                        Open Contact Queue <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: Job Applications (Web Admin & Super Admin) */}
                  {isWebAdmin && (
                    <div
                      onClick={() => setActiveTab('applications')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Briefcase size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                            {data?.totalApplications || 0} Applicants
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Job Applications</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          Review candidate job applications, career resumes, and interview candidate status.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontWeight: '700', fontSize: '0.875rem' }}>
                        Review Applications <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Module Card: Customer Subscriptions & Invoices (Customer Role) */}
                  {isCustomer && (
                    <div
                      onClick={() => setActiveTab('customer_portal')}
                      className="glass-card"
                      style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(30, 58, 138, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={24} />
                          </div>
                          <span className="badge-tag" style={{ background: 'rgba(30, 58, 138, 0.15)', color: '#3b82f6' }}>
                            My Account
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>My Subscriptions & Invoices</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                          View active subscriptions, process quick renewals, and download tax invoices.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.875rem' }}>
                        Open Customer Portal <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* USER & ROLE MANAGEMENT MODULE (Super Admin) */}
            {activeTab === 'users' && isSuperAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem' }}>User Accounts & Role Assignments</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage system access levels for Super Admin, Sales Admin, Web Admin, and Customers.</p>
                  </div>
                  <button onClick={() => showToast('Create new user window opened', 'info')} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                    <Plus size={16} /> Add System User
                  </button>
                </div>

                <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem 1.25rem' }}>User Name</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Email Address</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Assigned Role</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Company</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Role Assignment Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.users || []).map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>{u.name}</td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span className="badge-tag" style={{ background: getRoleBadgeStyle(u.role).bg, color: getRoleBadgeStyle(u.role).color }}>
                              {getRoleBadgeStyle(u.role).label}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>{u.company || 'N/A'}</td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="super_admin">Assign Super Admin</option>
                              <option value="sales_admin">Assign Sales Admin</option>
                              <option value="web_admin">Assign Web Admin</option>
                              <option value="customer">Assign Customer</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CMS, SLIDERS & BANNERS MODULE (Web Admin & Super Admin) */}
            {activeTab === 'cms' && isWebAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem' }}>Homepage Hero Sliders & Graphic Content</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload graphic banners, manage hero slides, and edit website announcement text.</p>
                  </div>
                  <button onClick={() => setShowSliderModal(true)} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                    <Plus size={16} /> Add New Graphic Banner
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {(data?.sliders || []).map(slide => (
                    <div key={slide.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                      <img src={slide.image} alt={slide.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      <div style={{ padding: '1.25rem' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{slide.title}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1rem' }}>{slide.subtitle}</p>
                        <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
                          Status: Active Banner
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRODUCTS, SERVICES & PRICES MODULE (Sales Admin & Super Admin) */}
            {activeTab === 'products' && isSalesAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem' }}>Products, Services & Pricing Manager</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update product prices, set catalog availability, and manage service offerings.</p>
                  </div>
                  <button onClick={() => showToast('Navigated to Digital Shop Catalog', 'info')} className="btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                    <Edit size={16} /> Edit Catalog Items
                  </button>
                </div>

                <div className="glass-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { name: 'Enterprise ERP License (Per User)', price: 'UGX 2,500,000 / yr', category: 'Software' },
                      { name: 'Edge Virtual Private Server - Standard', price: 'UGX 650,000 / mo', category: 'Cloud Infrastructure' },
                      { name: 'Corporate Webmail Mailboxes (50 Users)', price: 'UGX 450,000 / mo', category: 'Email Collaboration' },
                      { name: 'Tier III Server Rack Space (1U Colocation)', price: 'UGX 1,200,000 / mo', category: 'Data Center Hosting' }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '1.0rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category: {item.category}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.05rem' }}>{item.price}</span>
                          <button onClick={() => showToast(`Price updated for ${item.name}`, 'success')} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Adjust Price
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INVOICES & REMINDERS MODULE (Sales Admin & Super Admin) */}
            {activeTab === 'invoices' && isSalesAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem' }}>Customer Tax Invoices & Payment Reminders</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Issue customer tax invoices, track status, and dispatch instant payment reminders.</p>
                  </div>
                  <button onClick={() => setShowInvoiceModal(true)} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                    <Plus size={16} /> Issue Customer Invoice
                  </button>
                </div>

                <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem 1.25rem' }}>Invoice #</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Customer Name</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Email Address</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Total Amount</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                        <th style={{ padding: '1rem 1.25rem' }}>Invoice Download</th>
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Payment Reminder Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.invoices || []).map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                              title="Click to view official Tax Invoice PDF"
                            >
                              {inv.invoice_number}
                            </button>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>{inv.customer_name}</td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>{inv.customer_email}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '800' }}>UGX {Number(inv.amount).toLocaleString()}</td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span className="badge-tag" style={{ background: inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: inv.status === 'Paid' ? 'var(--accent-emerald)' : '#f59e0b' }}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              title="Download official Tax Invoice PDF"
                            >
                              <Download size={14} color="var(--primary)" /> Download PDF
                            </button>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleSendReminder(inv.id, inv.invoice_number)}
                              className="btn-secondary"
                              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <BellRing size={14} color="var(--primary)" /> Send Reminder
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBSCRIPTIONS MODULE (Sales Admin & Super Admin) */}
            {activeTab === 'subscriptions' && isSalesAdmin && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem' }}>Subscriptions & Renewal Log</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Logged: {data?.subscriptions.length || 0}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(data?.subscriptions || []).map(s => (
                    <div key={s.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{s.plan_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Ref: {s.reference} | Payment Channel: {s.payment_method || 'Mobile Money / Bank'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>
                          UGX {Number(s.amount).toLocaleString()}
                        </div>
                        <button onClick={() => showToast(`Extended subscription renewal for ${s.plan_name}`, 'success')} className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                          Extend Expiry
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONTACT MESSAGES MODULE (Web Admin & Super Admin) */}
            {activeTab === 'contacts' && isWebAdmin && (
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Incoming Contact Messages</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(data?.contacts || []).map(c => (
                    <div key={c.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.1rem' }}>{c.name} ({c.email})</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(c.created_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        Subject: {c.subject}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                        "{c.message}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JOB APPLICATIONS MODULE (Web Admin & Super Admin) */}
            {activeTab === 'applications' && isWebAdmin && (
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Submitted Job Applications</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(data?.applications || []).map(app => (
                    <div key={app.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.1rem' }}>{app.applicant_name}</h4>
                        <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
                          {app.status || 'Pending Review'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', marginBottom: '0.5rem' }}>
                        Role: {app.job_title || 'Assistant Office Attendant'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Email: {app.email} | Phone: {app.phone} | Experience: {app.experience_years}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CUSTOMER PORTAL MODULE (Customer Role) */}
            {activeTab === 'customer_portal' && isCustomer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="glass-card" style={{ background: 'var(--gradient-brand)', color: '#fff', padding: '2rem' }}>
                  <h2 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.5rem' }}>Welcome to Your Nova Customer Portal</h2>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                    View active subscriptions, process quick package renewals, and access official tax invoices.
                  </p>
                </div>

                <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Subscriptions Card */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Current Subscriptions</h3>
                    <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '1.0rem', marginBottom: '0.2rem' }}>Edge VPS Server - Standard</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: Active | Expiry: Sept 30, 2026</div>
                    </div>
                    <button onClick={() => setActivePage('subscription')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                      Renew Package Now
                    </button>
                  </div>

                  {/* Tax Invoices Card */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Official Tax Invoices</h3>
                    <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                      <button
                        onClick={() => setSelectedInvoice({
                          id: 1,
                          invoice_number: 'INV-2026-0041',
                          customer_name: 'Kintu Logistics Uganda',
                          customer_email: 'samuel@kintu.co.ug',
                          amount: 767000.00,
                          vat_amount: 117000.00,
                          status: 'Paid',
                          due_date: '2026-09-01',
                          created_at: new Date().toISOString()
                        })}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        title="Click to view official Tax Invoice PDF"
                      >
                        INV-2026-0041
                      </button>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', marginTop: '0.2rem' }}>UGX 767,000 (Incl 18% VAT)</div>
                    </div>
                    <button
                      onClick={() => setSelectedInvoice({
                        id: 1,
                        invoice_number: 'INV-2026-0041',
                        customer_name: 'Kintu Logistics Uganda',
                        customer_email: 'samuel@kintu.co.ug',
                        amount: 767000.00,
                        vat_amount: 117000.00,
                        status: 'Paid',
                        due_date: '2026-09-01',
                        created_at: new Date().toISOString()
                      })}
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', gap: '0.5rem' }}
                    >
                      <Download size={16} /> Download Tax Invoice PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ISSUE INVOICE MODAL */}
        {showInvoiceModal && (
          <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Issue Official Customer Tax Invoice</h3>
              <form onSubmit={handleCreateInvoice}>
                <div className="form-group">
                  <label>Customer / Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Kampala Medical Supplies"
                    value={invoiceForm.customer_name}
                    onChange={e => setInvoiceForm({ ...invoiceForm, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Customer Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="finance@company.co.ug"
                    value={invoiceForm.customer_email}
                    onChange={e => setInvoiceForm({ ...invoiceForm, customer_email: e.target.value })}
                    required
                  />
                </div>
                <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Amount (UGX) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="1200000"
                      value={invoiceForm.amount}
                      onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={invoiceForm.due_date}
                      onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Generate Tax Invoice
                  </button>
                  <button type="button" onClick={() => setShowInvoiceModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD GRAPHIC BANNER MODAL */}
        {showSliderModal && (
          <div className="modal-overlay" onClick={() => setShowSliderModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Add Homepage Graphic Slider / Banner</h3>
              <form onSubmit={handleCreateSlider}>
                <div className="form-group">
                  <label>Banner Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Next-Gen Enterprise Infrastructure"
                    value={sliderForm.title}
                    onChange={e => setSliderForm({ ...sliderForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subtitle / Description *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description of promotion or announcement"
                    value={sliderForm.subtitle}
                    onChange={e => setSliderForm({ ...sliderForm, subtitle: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Graphic Image URL *</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={sliderForm.image}
                    onChange={e => setSliderForm({ ...sliderForm, image: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Save Graphic Banner
                  </button>
                  <button type="button" onClick={() => setShowSliderModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OFFICIAL TAX INVOICE PDF VIEWER MODAL */}
        {selectedInvoice && (
          <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', padding: '2.5rem', background: '#ffffff', color: '#0f172a' }}>
              
              {/* PDF Header & EFRIS Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e3a8a', letterSpacing: '-0.02em' }}>
                    NOVA CLOUD EDGES (U) LIMITED
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Plot 14 Parliament Avenue, Kampala, Republic of Uganda
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    TIN: 1000987654 | EFRIS Ref: NV-EFRIS-2026-9941
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    OFFICIAL TAX INVOICE
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e3a8a', marginTop: '0.5rem' }}>
                    {selectedInvoice.invoice_number}
                  </div>
                </div>
              </div>

              {/* Invoice Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Billed To:</div>
                  <div style={{ fontWeight: '800', fontSize: '1.0rem', color: '#0f172a' }}>{selectedInvoice.customer_name}</div>
                  <div style={{ color: '#475569' }}>{selectedInvoice.customer_email}</div>
                  <div style={{ color: '#475569' }}>Kampala, Uganda</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Invoice Details:</div>
                  <div><strong>Date Issued:</strong> {new Date(selectedInvoice.created_at || Date.now()).toLocaleDateString()}</div>
                  <div><strong>Payment Due Date:</strong> {selectedInvoice.due_date}</div>
                  <div><strong>Payment Status:</strong> <span style={{ color: selectedInvoice.status === 'Paid' ? '#16a34a' : '#d97706', fontWeight: '800' }}>{selectedInvoice.status}</span></div>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#0f172a' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Service / Package Description</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Unit Rate</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: '600' }}>
                      Enterprise Edge Cloud VPS Infrastructure & Technical Support Subscription
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                      UGX {Number(selectedInvoice.amount - (selectedInvoice.vat_amount || selectedInvoice.amount * 0.18)).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: '700' }}>
                      UGX {Number(selectedInvoice.amount - (selectedInvoice.vat_amount || selectedInvoice.amount * 0.18)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Total Calculation Breakdown */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ width: '280px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>UGX {Number(selectedInvoice.amount - (selectedInvoice.vat_amount || selectedInvoice.amount * 0.18)).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', color: '#dc2626', fontWeight: '700' }}>
                    <span>Mandatory Statutory VAT (18%):</span>
                    <span>UGX {Number(selectedInvoice.vat_amount || selectedInvoice.amount * 0.18).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid #0f172a', fontWeight: '900', fontSize: '1.1rem', color: '#1e3a8a' }}>
                    <span>Total Amount Due:</span>
                    <span>UGX {Number(selectedInvoice.amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => window.print()}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.25rem', gap: '0.5rem' }}
                >
                  <Printer size={18} /> Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.25rem' }}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
