import SEO from "../components/SEO";
import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, Clock, Lock, Server, Mail, Wifi, AlertTriangle, Scale, ShieldAlert } from 'lucide-react';

export default function TermsPage({ setActivePage }) {
  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO title="Terms of Service | Nova Cloud" description="Read our terms of service and acceptable use policies." keywords="service terms, ISP agreement, terms of use" />
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.0rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            Terms of Reference & Hosting Service Agreement
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '720px', margin: '0 auto' }}>
            Official Terms of Reference (ToR), Service Level Agreement (SLA), and Operational Guidelines for Nova Cloud Edges Hosting, Corporate Email, and Enterprise Software deployments.
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
              Nova Cloud Edges (U) Limited provides sovereign cloud infrastructure hosting, edge server virtualization, corporate email server management, and enterprise ERP software deployment for clients across East Africa.
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

          {/* Section 5: WiFi & Guest Internet Acceptable Use Policy */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Wifi size={24} color="var(--primary)" />
              <h2 style={{ fontSize: '1.4rem' }}>5. WiFi Vouchers & Guest Internet Acceptable Use Policy (AUP)</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              By purchasing, activating, or connecting with any Nova Cloud Edges WiFi Voucher or public hotspot pass, the user enters into a legally binding agreement under these Terms of Service.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Single-Device Authentication:</strong> Each voucher token authorizes a single simultaneous device connection unless explicitly marked as a multi-user corporate pass. MAC address binding occurs upon initial login.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Validity & Expiration:</strong> The voucher lifespan timer initiates upon the first captive portal authentication and runs continuously until elapsed (12h, 24h, 48h, 7d, or 30d). Expired tokens cannot be paused, transferred, or refunded.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Hotspot Service Availability:</strong> While we deploy carrier-grade UniFi hardware with automatic channel optimization, wireless performance may vary depending on device proximity, physical building obstructions, and radio interference.</span>
              </li>
            </ul>
          </div>

          {/* Section 6: Uganda Statutory Compliance & Legal Framework */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Scale size={24} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.4rem' }}>6. Uganda Statutory Compliance & Regulatory Framework</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              All network traffic, hosting provisions, and voucher utilization are strictly governed by and enforceable under the laws of the Republic of Uganda:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.35rem' }}>Computer Misuse Act (2011 & 2022)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Prohibits unauthorized access, data alteration, denial-of-service, intercepting communications, offensive communication, and cyber harassment. Violations carry immediate legal prosecution.
                </div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--accent-emerald)', marginBottom: '0.35rem' }}>Data Protection & Privacy Act (2019)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Ensures personal identification, customer phone numbers, and payment records are processed lawfully, transparently, and protected from unauthorized disclosure.
                </div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>Uganda Communications Commission (UCC)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Operated in strict conformity with UCC guidelines for telecommunications operators, public data networks, and cyber-incident escalation protocols.
                </div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.35rem' }}>RICA Act (2010)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Regulation of Interception of Communications Act compliance requiring lawful interception only upon receipt of authorized warrants issued by competent courts.
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Prohibited Network Activities & Zero-Tolerance Policy */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <ShieldAlert size={24} color="#ef4444" />
              <h2 style={{ fontSize: '1.4rem' }}>7. Prohibited Network Activities & Zero-Tolerance Misuse</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              Nova Cloud Edges enforces a strict zero-tolerance policy against network misuse. Users are prohibited from engaging in:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Cyberattacks & Network Probing:</strong> Port scanning, vulnerability probing, brute-force cracking, packet sniffing, or initiating Denial of Service (DoS/DDoS) attacks.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Malicious Distribution:</strong> Dissemination of ransomware, viruses, worms, phishing portals, or operating unauthorized botnet nodes.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Intellectual Property & Piracy:</strong> Running high-bandwidth BitTorrent trackers or unauthorized peer-to-peer distribution of copyrighted media.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Unlawful Content & Fraud:</strong> Transmission of Child Sexual Abuse Material (CSAM), defamatory material, terrorist recruitment, or digital financial fraud.</span>
              </li>
            </ul>
          </div>

          {/* Section 8: Fair Usage Policy, Session Logging & Immediate Sanctions */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <ShieldCheck size={24} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.4rem' }}>8. Fair Usage Policy (FUP), Session Logging & Immediate Sanctions</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
              To guarantee equitable access, low latency, and high service quality across our subscriber base:
            </p>
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                <strong>Automated Gateway Logging:</strong> In compliance with national cybersecurity standards, gateways log session timestamps, assigned local IP addresses, and device MAC addresses. Payload inspection is never conducted without a lawful court warrant.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Immediate Disconnection & Forfeiture:</strong> Any attempt to compromise network integrity or violate Ugandan penal laws will result in immediate session revocation, voucher forfeiture without refund, hardware MAC blacklist, and referral to the Uganda Police Cyber Crime Unit and CERT-UG.
              </p>
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
