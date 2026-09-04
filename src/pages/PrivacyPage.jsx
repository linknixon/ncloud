import SEO from "../components/SEO";
import React from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle2, Server, Database, Key, ServerOff, Cpu, RefreshCw, AlertTriangle, Layers, Building, Globe } from 'lucide-react';

export default function PrivacyPage({ setActivePage }) {
  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO title="Privacy Policy | Nova Cloud" description="Understand how we protect your data and privacy." keywords="data protection, privacy policy, GDPR" />
      <div className="container" style={{ maxWidth: '1020px' }}>

        {/* Document Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.1rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            Enterprise Data Privacy & Security Policy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '780px', margin: '0 auto', lineHeight: '1.65' }}>
            Effective Date: August 2026 | Document Ref: <strong>NCE-POL-PRIV-2026-V2</strong><br />
            Official Privacy & Security Governance Framework for Nova Cloud Edges (U) Limited in compliance with the <em>Uganda Data Protection and Privacy Act 2019</em>, <em>ISO/IEC 27001:2022</em>, and Global Enterprise Cloud Standards (AWS & Google Cloud Privacy Frameworks).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>

          {/* Section 1: Scope & Regulatory Framework */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Shield size={26} color="var(--primary)" />
              <h2 style={{ fontSize: '1.45rem' }}>1. Scope, Governance & Legal Framework</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1.25rem' }}>
              This Data Privacy and Security Policy governs all cloud edge services, virtual private servers (VPS), corporate mailboxes, enterprise ERP hostings, colocation rack infrastructure, and custom software solutions operated by <strong>Nova Cloud Edges (U) Limited</strong> ("Nova Cloud Edges", "We", "Us", or "Our").
            </p>
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.925rem', lineHeight: '1.7' }}>
              <div>• <strong>Data Controller Role:</strong> Nova Cloud Edges acts as a Data Controller for subscriber account details, direct customer communications, billing records, and candidate job applications.</div>
              <div>• <strong>Data Processor Role:</strong> For hosted virtual servers, customer databases, mailboxes, and enterprise backups, Nova Cloud Edges acts strictly as a Data Processor under your contractual direction.</div>
            </div>
          </div>

          {/* Section 2: Shared Responsibility Model */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Layers size={26} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.45rem' }}>2. Enterprise Shared Responsibility Model</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1.25rem' }}>
              Similar to global cloud hyperscalers (Amazon Web Services and Google Cloud Platform), security and compliance is a shared responsibility between Nova Cloud Edges and the customer:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.6rem' }}>
                  Nova Cloud Edges Responsibility
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <li>✓ Tier III Datacenter physical perimeter security & biometric access control.</li>
                  <li>✓ Hypervisor virtualization isolation & Host OS kernel security.</li>
                  <li>✓ Core network DDoS mitigation & Next-Gen Firewall protection.</li>
                  <li>✓ Redundant power, cooling, and fiber interconnect stability.</li>
                </ul>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--secondary)', marginBottom: '0.6rem' }}>
                  Customer Responsibility
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <li>✓ Guest Operating System patching & application configuration.</li>
                  <li>✓ User access credentials, strong passwords & Multi-Factor Authentication (MFA).</li>
                  <li>✓ Client-side application code encryption & web database security.</li>
                  <li>✓ Content classification, access control lists (ACL), and backup schedules.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3: Categories of Data Collected */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Database size={26} color="var(--secondary)" />
              <h2 style={{ fontSize: '1.45rem' }}>3. Categories of Data Collected & Processing Purposes</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1rem' }}>
              We process personal and technical data strictly for legitimate operational, security, and contractual requirements:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <strong>A. Subscriber Account & Billing Information:</strong> Full name, authorized representative details, corporate email (`support@ncloud.co.ug`), phone number (`0790001631`), billing address, subscription duration, and official tax invoice receipts.
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <strong>B. Recruitment Candidate Data:</strong> Applicant name, contact number, employment history, and attached documentation (CV, cover statement, certificates, testimonials) submitted via our Careers portal.
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <strong>C. Server System Telemetry:</strong> Anonymized network packet metrics, source IP addresses, API endpoint traffic logs, bandwidth usage, and firewall drop logs utilized exclusively for threat prevention and QoS monitoring.
              </div>
            </div>
          </div>

          {/* Section 4: Data Encryption & Security Architecture */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Lock size={26} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.45rem' }}>4. Security Architecture & Encryption Standards</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1.25rem' }}>
              Our infrastructure employs defense-in-depth security controls engineered to protect confidentiality, integrity, and availability:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--primary)' }}>Encryption in Transit:</strong> All web traffic, API transactions, and Webmail client sessions are enforced using <strong>TLS 1.3 / SSL 256-bit encryption</strong> with HTTP Strict Transport Security (HSTS).
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--primary)' }}>Encryption at Rest:</strong> Core database storage, automated cloud snapshots, and user backups are encrypted using hardware-accelerated <strong>AES-256 bit encryption</strong>.
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--primary)' }}>24/7 Managed SOC:</strong> Real-time threat detection powered by our dedicated Cyber Security Team (CISSP, CEH), monitoring endpoint intrusions and anomaly spikes.
              </div>
            </div>
          </div>

          {/* Section 5: Data Sovereignty & Sub-Processors */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Globe size={26} color="var(--primary)" />
              <h2 style={{ fontSize: '1.45rem' }}>5. Data Sovereignty & Strategic Sub-Processors</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1rem' }}>
              In accordance with local content regulations, customer data hosted on Nova Cloud Edges localized VPS and email infrastructure is stored on physical servers situated in <strong>Kampala, Uganda</strong> (Raxio Tier III Datacenter).
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1rem' }}>
              Where specialized hybrid integrations are required, Nova Cloud Edges interfaces with trusted sub-processors adhering to equivalent privacy safeguards:
            </p>
            <div style={{ background: 'var(--bg-main)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <div>• <strong>Infrastructure & Transit:</strong> Raxio Data Centre, RENU Uganda, Liquid Intelligent Technologies, MTN Uganda.</div>
              <div>• <strong>Enterprise Software Partners:</strong> Enterprise ERP Solutions, Corporate Email Infrastructure Providers, Network Security Providers, Global Cloud Integration Partners.</div>
            </div>
          </div>

          {/* Section 6: Data Subject Rights */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Key size={26} color="var(--secondary)" />
              <h2 style={{ fontSize: '1.45rem' }}>6. Rights of Data Subjects under Ugandan Law</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1rem' }}>
              Under the <em>Uganda Data Protection and Privacy Act 2019</em>, subscribers and website users possess statutory rights regarding their personal data:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Right to Information & Access:</strong> Request confirmation of what personal records are held in our database.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Right to Correction & Rectification:</strong> Request update of inaccurate or outdated contact information.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of personal data when contract period has terminated, subject to statutory tax retention laws.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Right to Data Portability:</strong> Receive exported machine-readable database files upon service migration.</span>
              </li>
            </ul>
          </div>

          {/* Section 7: Data Retention & Cryptographic Disposal */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <ServerOff size={26} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.45rem' }}>7. Data Retention & Cryptographic Disposal Protocols</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1rem' }}>
              Account information, financial ledger data, and transaction invoices are retained for a period of <strong>7 years</strong> to comply with statutory auditing requirements by the Uganda Revenue Authority (URA).
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75' }}>
              Upon account termination or explicit erasure request, virtual disk volumes undergo <strong>DoD 5220.22-M compliant multi-pass sanitization and cryptographic key destruction</strong>, rendering all residual data permanently unrecoverable.
            </p>
          </div>

          {/* Section 8: Data Protection Officer Contact */}
          <div className="glass-card" style={{ background: 'rgba(30, 58, 138, 0.06)', border: '1.5px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Building size={26} color="var(--primary)" />
              <h2 style={{ fontSize: '1.4rem' }}>8. Data Protection Officer (DPO) Contact & Incident Reporting</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.75', marginBottom: '1.25rem' }}>
              For data protection inquiries, security vulnerability reporting, or statutory rights requests, contact our Data Governance Office:
            </p>
            <div style={{
              background: 'var(--bg-card)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              fontSize: '0.925rem',
              lineHeight: '1.8'
            }}>
              <div><strong>Data Controller:</strong> Nova Cloud Edges (U) Limited</div>
              <div><strong>Data Protection Officer:</strong> Legal & Information Security Office</div>
              <div><strong>Official Email:</strong> <a href="mailto:support@ncloud.co.ug" style={{ color: 'var(--primary)', fontWeight: '700' }}>support@ncloud.co.ug</a></div>
              <div><strong>Direct Support Hotline:</strong> <strong style={{ color: 'var(--primary)' }}>0790001631</strong></div>
              <div><strong>Physical Address:</strong> Plot 14 Ndejje, Wakiso, Kampala Uganda</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
