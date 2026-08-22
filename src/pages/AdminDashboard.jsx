import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Mail, 
  Briefcase, 
  CreditCard, 
  User, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Database
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('applications');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = () => {
    setLoading(true);
    fetch('/api/admin/overview')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge-tag" style={{ background: 'rgba(233, 30, 99, 0.15)', color: 'var(--secondary)' }}>
                MySQL Database Admin
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Database size={14} /> Live Connection Active
              </span>
            </div>
            <h1 style={{ fontSize: '2.4rem' }}>Nova Management Portal</h1>
          </div>

          <button
            onClick={fetchAdminData}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} /> Refresh MySQL Records
          </button>
        </div>

        {/* Metrics Overview Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Job Applications</span>
              <Briefcase size={20} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800' }}>
              {data ? data.totalApplications : 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Candidates Applied</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Contact Inquiries</span>
              <Mail size={20} color="var(--secondary)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800' }}>
              {data ? data.totalContacts : 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Support & Sales Messages</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Subscriptions</span>
              <CreditCard size={20} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800' }}>
              {data ? data.totalSubscriptions : 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Renewals & Transactions</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2rem'
        }}>
          {[
            { id: 'applications', label: 'Job Applications', icon: Briefcase },
            { id: 'contacts', label: 'Contact Messages', icon: Mail },
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard }
          ].map(tab => {
            const IconC = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                  background: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <IconC size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Fetching live records from MySQL...
          </div>
        ) : (
          <div>
            {/* Job Applications Tab */}
            {activeTab === 'applications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.applications.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No job applications submitted yet.
                  </div>
                ) : (
                  data.applications.map(app => (
                    <div key={app.id} className="glass-card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem' }}>{app.applicant_name}</h3>
                          <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                            Applied for: {app.job_title || 'Assistant Office Attendant'}
                          </div>
                        </div>
                        <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
                          Status: {app.status || 'Pending Review'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        <span>Email: {app.email}</span>
                        <span>Phone: {app.phone}</span>
                        <span>Experience: {app.experience_years}</span>
                      </div>

                      {app.cover_letter && (
                        <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.5' }}>
                          <strong>Cover Note:</strong> "{app.cover_letter}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.contacts.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No contact messages found.
                  </div>
                ) : (
                  data.contacts.map(c => (
                    <div key={c.id} className="glass-card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem' }}>{c.name} ({c.email})</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(c.created_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        Subject: {c.subject}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                        "{c.message}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.subscriptions.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No subscriptions logged yet.
                  </div>
                ) : (
                  data.subscriptions.map(s => (
                    <div key={s.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{s.plan_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Ref: {s.reference} | Channel: {s.payment_method}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                          UGX {Number(s.amount).toLocaleString()}
                        </div>
                        <span className="badge-tag" style={{ marginTop: '0.25rem' }}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
