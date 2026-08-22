import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, Clock, Lock, Server, Mail } from 'lucide-react';

export default function TermsPage({ setActivePage }) {
  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ fontSize: '2.6rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            Terms of Reference & Hosting Service Agreement
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '720px', margin: '0 auto' }}>
            Official Terms of Reference (ToR), Service Level Agreement (SLA), and Operational Guidelines for Nova Cloud Edges Hosting, Zimbra Email, and Enterprise Software deployments.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Scope of Services */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Server size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.4rem' }}>1. Scope of Cloud Hosting & Managed Services</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              Nova Cloud Edges (U) Limited provides sovereign cloud infrastructure hosting, edge server virtualization, Zimbra Email server management, and QuickBooks Enterprise software deployment for clients across East Africa.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Edge Server Hosting:</strong> Provisioning of high-availability Cloud Virtual Private Servers (VPS) with NVMe storage and localized IXP connectivity.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Zimbra Email Services:</strong> Management, spam/virus filtering, mailbox quotas, and active synchronization for enterprise mail clients.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Software Reselling:</strong> Implementation, user licensing, and financial workflow configuration for QuickBooks Enterprise Solutions v24.0.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: SLA & Uptime Guarantee */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Clock size={24} color="var(--secondary)" />
              <h2 style={{ fontSize: '1.4rem' }}>2. Service Level Agreement (SLA) & Uptime Guarantee</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              We guarantee a <strong>99.99% Network and Server Uptime</strong> for core cloud infrastructure and Zimbra Mail servers.
            </p>
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <strong>Scheduled Maintenance:</strong> Maintenance windows are communicated at least 48 hours in advance and executed during off-peak hours (11:00 PM – 4:00 AM EAT). Emergency security patches may be deployed immediately to defend against active cybersecurity exploits.
            </div>
          </div>

          {/* Section 3: Data Security & Backups */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Lock size={24} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.4rem' }}>3. Data Privacy, Backups & Sovereignty</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              All customer data stored on Nova Cloud Edges hosts remains the sole property of the client. Nova Cloud Edges adheres strictly to Ugandan Data Protection regulations.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Automated daily off-site server snapshots with 30-day retention policies.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>End-to-end TLS/SSL encryption for email transit and web portal access.</span>
              </li>
            </ul>
          </div>

          {/* Section 4: Technical Support & Escalation */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Mail size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.4rem' }}>4. Technical Support & SLA Escalation</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              Our Kampala technical support desk operates 24/7. Critical service outages receive guaranteed response times under 15 minutes.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Support Phone</div>
                <div style={{ color: 'var(--primary)', fontWeight: '800', marginTop: '0.2rem' }}>0790001631</div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Support Email</div>
                <div style={{ color: 'var(--secondary)', fontWeight: '800', marginTop: '0.2rem' }}>support@ncloud.co.ug</div>
              </div>
            </div>
          </div>

        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button onClick={() => setActivePage('contact')} className="btn-primary">
            Contact Support Desk
          </button>
        </div>

      </div>
    </div>
  );
}
