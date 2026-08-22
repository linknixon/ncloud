import React from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle2, Server, Database } from 'lucide-react';

export default function PrivacyPage({ setActivePage }) {
  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ fontSize: '2.6rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            Data Privacy & Security Policy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '720px', margin: '0 auto' }}>
            Official Privacy Policy outlining how Nova Cloud Edges (U) Limited collects, protects, stores, and processes enterprise data, email mailboxes, and customer records in accordance with the Data Protection and Privacy Act of Uganda and ISO/IEC 27001 standards.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Principles */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Shield size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.4rem' }}>1. Data Protection & Sovereign Cloud Principles</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              Nova Cloud Edges respects customer confidentiality and operates under strict sovereign cloud hosting guidelines. All data hosted within Kampala Edge Datacenters remains strictly within the Republic of Uganda.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Zero Unauthorized Sharing:</strong> We never sell, rent, or trade your personal information, server logs, or email contents to third parties.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>ISO 27001 Security Controls:</strong> Administrative access is protected with zero-trust multi-factor authentication (MFA) and encrypted session tokens.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Information Collection */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Database size={24} color="var(--secondary)" />
              <h2 style={{ fontSize: '1.4rem' }}>2. Information Collection & Usage</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              We collect minimal necessary information to fulfill cloud infrastructure provision, software license provisioning, and customer support:
            </p>
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <div>• <strong>Subscriber Records:</strong> Name, business name, corporate email address (`support@ncloud.co.ug`), phone number (`0790001631`), and tax details.</div>
              <div>• <strong>Job Application Data:</strong> Candidate names, contact phone, experience level, and uploaded attachments (CV, Certificates).</div>
              <div>• <strong>Technical Telemetry:</strong> Anonymized server traffic logs, IP addresses, and session duration for DDoS protection and network performance optimization.</div>
            </div>
          </div>

          {/* Section 3: Data Encryption & Retention */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Lock size={24} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.4rem' }}>3. Data Encryption & Storage Retention</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              All customer database records, billing transactions, and email server backups are secured using **AES-256 bit encryption** at rest and **TLS 1.3** in transit.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7' }}>
              For legal compliance and financial auditing, billing records are retained for a minimum of 7 years, after which they are purged using secure cryptographic wiping standards.
            </p>
          </div>

          {/* Section 4: Contact Information */}
          <div className="glass-card" style={{ background: 'rgba(30, 58, 138, 0.05)', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Eye size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.3rem' }}>4. Privacy Inquiries & Data Officer</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1rem' }}>
              For data access requests, account deletion, or security privacy inquiries, please contact our Data Protection Officer:
            </p>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
              <div>Email: <strong>support@ncloud.co.ug</strong></div>
              <div>Phone: <strong>0790001631</strong></div>
              <div>Headquarters: Plot 14 Parliament Avenue, Kampala, Uganda</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
