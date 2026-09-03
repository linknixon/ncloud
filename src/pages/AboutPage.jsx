import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Award, Server, Users, CheckCircle2, Lock, Cpu, Globe, ArrowRight } from 'lucide-react';

const defaultTeam = [
  {
    name: "Dr. Arthur Mukasa",
    role: "Chief Executive Officer & Founder",
    bio: "Over 18 years leading digital infrastructure, cloud migration, and telecom strategies across East Africa.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Florence Akello",
    role: "Chief Technology Officer",
    bio: "Former lead infrastructure architect specializing in edge computing, Kubernetes orchestration, and Zimbra mail clusters.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "David Tumusiime",
    role: "Head of Cyber Security & Threat Intelligence",
    bio: "CISSP & CEH certified security strategist leading Nova's 24/7 Threat Intelligence Security Operations Center (SOC).",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Grace Nsubuga",
    role: "Lead Cloud Operations & Colocation Manager",
    bio: "Manages server rack colocation, dual redundant power systems, and client SLA compliance.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80"
  }
];

const defaultIso = [
  {
    code: "ISO/IEC 27001:2022",
    title: "Information Security Management",
    desc: "Certified zero-trust security controls, data encryption, and risk management standards."
  },
  {
    code: "ISO 9001:2015",
    title: "Quality Management Systems",
    desc: "International benchmark for service reliability, customer satisfaction, and operational rigor."
  },
  {
    code: "SOC 2 Type II",
    title: "Data Center Security & Availability",
    desc: "Independent audit verification of system confidentiality, integrity, and hosting availability."
  }
];

export default function AboutPage({ setActivePage }) {
  const [team, setTeam] = useState(defaultTeam);
  const [isoStandards, setIsoStandards] = useState(defaultIso);

  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setTeam(data);
      })
      .catch(() => {});
    fetch('/api/iso')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setIsoStandards(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO title="About Us | Nova Cloud" description="Learn more about Nova Cloud, our mission, and our team." keywords="Nova Cloud team, ISP company profile, mission vision" />
      <div className="container">
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ fontSize: '2.1rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            Empowering Technology Solutions Across East Africa
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.0rem', maxWidth: '780px', margin: '0 auto', lineHeight: '1.65' }}>
            Nova Cloud Edges (U) Limited is Uganda's leading provider of sovereign cloud edge hosting, corporate email administration, enterprise ERP implementations, and ISO-certified zero-trust cybersecurity defense.
          </p>
        </div>

        {/* Corporate Vision & Data Center Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="badge-tag" style={{ marginBottom: '1rem', width: 'fit-content' }}>Our Mission</span>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Sovereign Cloud & Ultra-Low Latency</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              We bridge the gap between high-speed local data center connectivity and enterprise software management. By maintaining localized fiber interconnects with RENU, Liquid Telecom, and MTN Uganda, we offer sub-5ms latency and 99.99% uptime SLAs.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>✓ Tier III Certified Data Center</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>✓ Redundant Diesel Generators</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80"
              alt="Data Center Racks"
              style={{ width: '100%', height: '100%', minHeight: '300px', objectFit: 'cover' }}
            />
          </div>

        </div>

        {/* ISO Standards & Security Compliance Section */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: '800' }}>ISO Standards & Security Compliance</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0.5rem auto 0' }}>
              Our data centers and cloud hosting operations strictly comply with internationally recognized security and quality frameworks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
            {isoStandards.map((iso, idx) => (
              <div key={idx} className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(30, 58, 138, 0.12)',
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <Award size={28} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.4rem' }}>{iso.code}</h3>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{iso.title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>{iso.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Expert Cyber Security Team Section */}
        <section style={{
          background: 'var(--gradient-brand)',
          color: '#fff',
          padding: '4rem 3rem',
          borderRadius: '24px',
          marginBottom: '5rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem' }}>
              <ShieldCheck size={16} /> Elite Threat Hunters
            </div>
            <h2 style={{ fontSize: '1.9rem', color: '#fff', marginBottom: '0.85rem' }}>
              Expert Cyber Security Team
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: '1.0rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              Nova Cloud Edges houses a dedicated team of certified cybersecurity specialists (CISSP, CEH, CISM) providing 24/7 Security Operations Center (SOC) threat intelligence, penetration testing, endpoint isolation, and Next-Gen Firewall configuration.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => setActivePage('contact')} style={{ background: '#ffffff', color: 'var(--primary)', fontWeight: '800', padding: '0.9rem 1.75rem', borderRadius: '12px', fontSize: '0.95rem' }}>
                Consult Security Team
              </button>
            </div>
          </div>
        </section>

        {/* Leadership Team Gallery */}
        <section>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>Meet Our Executive Team</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0.5rem auto 0' }}>
              Experienced cloud architects, cybersecurity specialists, and enterprise software engineers based in Kampala.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            {team.map((m, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginBottom: '1.25rem',
                  border: '3.5px solid var(--primary)',
                  boxShadow: '0 8px 24px rgba(30, 58, 138, 0.25)',
                  flexShrink: 0
                }}>
                  <img
                    src={m.image}
                    alt={m.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{m.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', marginBottom: '0.75rem' }}>{m.role}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>{m.bio}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
