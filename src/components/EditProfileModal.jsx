import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';
import { X, Lock, Mail, Phone, Building, User, Sparkles, Check, Camera, Briefcase, FileText, AlertCircle, ShoppingBag, MapPin } from 'lucide-react';

export default function EditProfileModal() {
  const { user, isEditProfileOpen, setIsEditProfileOpen, setUser, showToast } = useApp();

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    company: '',
    address: '',
    title: '',
    avatar: '',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { clearDraft } = useAutoSaveDraft('user_profile', formData, setFormData, { enabled: isEditProfileOpen });

  const gradients = [
    { name: 'Royal Purple', value: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)' },
    { name: 'Emerald Teal', value: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
    { name: 'Sunset Amber', value: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
    { name: 'Ocean Cyan', value: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)' },
    { name: 'Crimson Rose', value: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)' }
  ];

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        phone: user.phone || prev.phone || '+256 700 123 456',
        company: user.company || prev.company || 'Nova Cloud Edges',
        address: user.physical_address || user.billing_address || user.address || user.location || 'Plot 14, Parliament Avenue, Kampala, Uganda',
        title: user.role === 'customer' ? 'Customer' : (user.title || user.position || (user.role === 'super_admin' ? 'Super Administrator' : 'Account Manager')),
        avatar: prev.avatar || user.avatar || '',
        gradient: prev.gradient || user.gradient || 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
        bio: prev.bio || user.bio || 'Technology enthusiast & cloud infrastructure manager.'
      }));
    } else {
      setFormData({
        email: '',
        phone: '',
        company: '',
        address: '',
        title: '',
        avatar: '',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
        bio: ''
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  }, [user, isEditProfileOpen]);

  if (!isEditProfileOpen || !user) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // CRITICAL: Username, Email, and Title/Position are IMMUTABLE and cannot be changed by user
    const updatedUser = {
      ...user,
      name: user.name,     // Immutable Username/Name
      email: user.email,   // Immutable Email Address
      title: user.title || (user.role === 'super_admin' ? 'Super Administrator' : 'Account Manager'), // Immutable Title/Position
      phone: formData.phone,
      company: formData.company,
      address: formData.address,
      location: formData.address,
      physical_address: formData.address,
      billing_address: formData.address,
      avatar: formData.avatar,
      gradient: formData.gradient,
      bio: formData.bio
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // Sync updated physical/billing address to backend database store
    if (user && user.email) {
      fetch('/api/admin/users')
        .then(r => r.json())
        .then(usersList => {
          if (Array.isArray(usersList)) {
            const target = usersList.find(u => u.email && u.email.toLowerCase() === user.email.toLowerCase());
            if (target) {
              fetch(`/api/admin/users/${target.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: formData.phone,
                  company: formData.company,
                  location: formData.address,
                  address: formData.address,
                  physical_address: formData.address,
                  billing_address: formData.address
                })
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    if (passwordData.currentPassword || passwordData.newPassword) {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        showToast('New passwords do not match.', 'error');
        return;
      }
      setIsChangingPassword(true);
      const token = localStorage.getItem('token');
      try {
        const passRes = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          })
        });
        const passData = await passRes.json();
        if (!passRes.ok) throw new Error(passData.error || 'Password update failed');
      } catch (err) {
        showToast(err.message, 'error');
        setIsChangingPassword(false);
        return;
      }
      setIsChangingPassword(false);
    }

    clearDraft();
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    if (showToast) {
      showToast('Profile updated successfully!', 'success');
    }
    setIsEditProfileOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 10, 20, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          animation: 'fadeInSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-hover)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(124, 58, 237, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Edit Profile Settings
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                Update your personal details & contact preferences
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditProfileOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          
          {/* Avatar Preview & Gradient Selection */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            padding: '1rem',
            background: 'var(--bg-card-hover)',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}>
            {/* Circular Profile Avatar Box */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: formData.gradient,
                color: '#fff',
                fontWeight: '800',
                fontSize: '1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid var(--bg-card)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                overflow: 'hidden'
              }}>
                {formData.avatar ? (
                  <img src={formData.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(user.name)
                )}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                Profile Avatar Theme
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {gradients.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, gradient: g.value })}
                    title={g.name}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: g.value,
                      border: formData.gradient === g.value ? '2px solid var(--primary)' : '2px solid transparent',
                      boxShadow: formData.gradient === g.value ? '0 0 8px rgba(124,58,237,0.5)' : 'none',
                      cursor: 'pointer',
                      transform: formData.gradient === g.value ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            
            {/* LOCKED Username Field */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Username / Full Name
                </label>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Lock size={11} /> Read-only (Cannot be changed)
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={user.name}
                  disabled
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'not-allowed',
                    opacity: 0.85
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* LOCKED Email Address */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Email Address
                </label>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.45rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Lock size={10} /> Read-only
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.3rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    cursor: 'not-allowed',
                    opacity: 0.85
                  }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.3rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem'
                  }}
                />
                <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Company / Organization */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Company / Organization
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.3rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem'
                  }}
                />
                <Building size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Change Password Section */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} color="var(--primary)" /> Change Password
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Physical / Billing Address */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Physical / Billing Address (Appears on Tax Invoices)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Plot 14, Parliament Avenue, Kampala, Uganda"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.3rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem'
                  }}
                />
                <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* LOCKED Job Title / Position */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Job Title / Position
                </label>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.45rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Lock size={10} /> Read-only
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.title}
                  disabled
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.3rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    cursor: 'not-allowed',
                    opacity: 0.85
                  }}
                />
                <Briefcase size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Avatar Image URL */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/my-photo.jpg"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Bio / Description */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Bio / About
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Write a brief overview about your role or specialization..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={() => {
                setIsEditProfileOpen(false);
                if (!user) return;
                window.history.pushState({}, '', '/subscriptions?tab=invoices');
                window.location.href = '/subscriptions?tab=invoices';
              }}
              style={{
                marginRight: 'auto',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <ShoppingBag size={16} /> My Orders
            </button>
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              style={{
                background: 'var(--bg-card-hover)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isChangingPassword}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <Check size={16} /> {isChangingPassword ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
