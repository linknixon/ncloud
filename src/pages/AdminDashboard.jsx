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
  BellRing
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, showToast, setActivePage } = useApp();
  
  // Current Active Role state (Defaults to user's assigned role or 'super_admin')
  const [currentRole, setCurrentRole] = useState(user?.role || 'super_admin');
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form Modals State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSliderModal, setShowSliderModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Update role and set default appropriate tab
  const handleRoleSwitch = (newRole) => {
    setCurrentRole(newRole);
    if (newRole === 'web_admin') setActiveTab('cms');
    else if (newRole === 'sales_admin') setActiveTab('invoices');
    else if (newRole === 'customer') setActiveTab('customer_portal');
    else setActiveTab('overview');
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
      case 'super_admin': return 'Super Admin (Full System & Role Control)';
      case 'sales_admin': return 'Sales Admin (Products, Prices, Subscriptions & Invoices)';
      case 'web_admin': return 'Web Admin (CMS Graphics, Sliders, Contacts & Jobs)';
      case 'customer': return 'Customer Portal (My Subscriptions & Tax Invoices)';
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

  // Define tab navigation based on active role
  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'admin';
  const isSalesAdmin = isSuperAdmin || currentRole === 'sales_admin';
  const isWebAdmin = isSuperAdmin || currentRole === 'web_admin';
  const isCustomer = currentRole === 'customer';

  const roleTabs = [
    ...(isSuperAdmin || isSalesAdmin || isWebAdmin ? [{ id: 'overview', label: 'Overview & Metrics', icon: LayoutDashboard }] : []),
    ...(isSuperAdmin ? [{ id: 'users', label: 'User & Role Management', icon: ShieldCheck }] : []),
    ...(isWebAdmin ? [{ id: 'cms', label: 'CMS, Sliders & Banners', icon: Sliders }] : []),
    ...(isSalesAdmin ? [{ id: 'products', label: 'Products, Services & Prices', icon: Tag }] : []),
    ...(isSalesAdmin ? [{ id: 'invoices', label: 'Invoices & Reminders', icon: FileText }] : []),
    ...(isSalesAdmin ? [{ id: 'subscriptions', label: 'Subscriptions & Renewals', icon: CreditCard }] : []),
    ...(isWebAdmin ? [{ id: 'contacts', label: 'Contact Messages', icon: Mail }] : []),
    ...(isWebAdmin ? [{ id: 'applications', label: 'Job Applications', icon: Briefcase }] : []),
    ...(isCustomer ? [{ id: 'customer_portal', label: 'My Subscriptions & Invoices', icon: User }] : [])
  ];

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

          {/* Quick Role Switcher Bar */}
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

        {/* Metrics Counter Cards (Role-Specific Visibility) */}
        {!isCustomer && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.25rem'
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

        {/* Dynamic Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          {roleTabs.map(tab => {
            const IconC = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                  background: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                <IconC size={17} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '0.5rem' }} />
            <div>Fetching live management records...</div>
          </div>
        ) : (
          <div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <ShieldCheck size={26} color="var(--primary)" />
                    <div>
                      <h2 style={{ fontSize: '1.4rem' }}>{getRoleBadgeStyle(currentRole).label} Operations Workspace</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Scoped dashboard capabilities active for <strong>{user?.email || 'admin@ncloud.co.ug'}</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                    {isSuperAdmin && (
                      <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <ShieldCheck size={18} color="#8b5cf6" />
                          <h4 style={{ fontSize: '1.0rem', color: '#8b5cf6', margin: 0, fontWeight: '700' }}>Super Admin Authority</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                          Assign roles, control full user directory, manage pages, configure graphics, issue invoices, update prices, and perform all administrative operations.
                        </p>
                      </div>
                    )}
                    {isSalesAdmin && (
                      <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <DollarSign size={18} color="#10b981" />
                          <h4 style={{ fontSize: '1.0rem', color: '#10b981', margin: 0, fontWeight: '700' }}>Sales & Invoicing Scope</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                          Manage product catalog prices, issue customer tax invoices, dispatch email payment reminders, and process package renewals.
                        </p>
                      </div>
                    )}
                    {isWebAdmin && (
                      <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Sliders size={18} color="#06b6d4" />
                          <h4 style={{ fontSize: '1.0rem', color: '#06b6d4', margin: 0, fontWeight: '700' }}>Web Content Management</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                          Update website graphics, homepage sliders, hero banners, manage incoming customer contact messages, and review job applications.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* USER & ROLE MANAGEMENT TAB (Super Admin) */}
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

            {/* CMS, SLIDERS & BANNERS TAB (Web Admin & Super Admin) */}
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

            {/* PRODUCTS, SERVICES & PRICES TAB (Sales Admin & Super Admin) */}
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

            {/* INVOICES & REMINDERS TAB (Sales Admin & Super Admin) */}
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
                        <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Payment Reminder Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.invoices || []).map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--primary)' }}>{inv.invoice_number}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>{inv.customer_name}</td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>{inv.customer_email}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '800' }}>UGX {Number(inv.amount).toLocaleString()}</td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span className="badge-tag" style={{ background: inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: inv.status === 'Paid' ? 'var(--accent-emerald)' : '#f59e0b' }}>
                              {inv.status}
                            </span>
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

            {/* SUBSCRIPTIONS TAB */}
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

            {/* CONTACT MESSAGES TAB (Web Admin & Super Admin) */}
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

            {/* JOB APPLICATIONS TAB (Web Admin & Super Admin) */}
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

            {/* CUSTOMER PORTAL TAB (Customer Role) */}
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
                      <div style={{ fontWeight: '800', color: 'var(--primary)' }}>INV-2026-0041</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', marginTop: '0.2rem' }}>UGX 767,000 (Incl 18% VAT)</div>
                    </div>
                    <button onClick={() => showToast('Downloading Tax Invoice PDF receipt...', 'success')} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', gap: '0.5rem' }}>
                      <Download size={16} /> Download Tax Invoice
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

      </div>
    </div>
  );
}
