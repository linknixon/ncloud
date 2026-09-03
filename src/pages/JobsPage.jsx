import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Briefcase, MapPin, Clock, Users, CheckCircle2, FileText, Send, X, AlertCircle } from 'lucide-react';

const defaultJobs = [
  {
    id: 1,
    title: "Assistant Office Attendant (1)",
    slug: "assistant-office-attendant",
    department: "Administration & Operations",
    location: "Kampala, Uganda",
    type: "Full-time",
    vacancies: 1,
    status: "open",
    deadline: "2026-09-30",
    description: "Nova Cloud Edges (U) Limited is looking for a dedicated and energetic Assistant Office Attendant to support our day-to-day office operations, client hospitality, document coordination, and administrative functions.",
    requirements: [
      "Uganda Certificate of Education (UCE) or Diploma in Business Administration/Office Management",
      "Minimum 1-2 years of relevant experience in a corporate or tech office setting",
      "Strong written and verbal communication skills in English and Luganda",
      "Punctual, organized, trustworthy, and proactive attitude",
      "Basic computer literacy (MS Word, Email, Web Browsing)"
    ],
    responsibilities: [
      "Welcome clients, visitors, and partners at the reception area",
      "Ensure office cleanliness, orderly meeting rooms, and refreshment management",
      "Receive and log incoming mail, packages, and office supplies deliveries",
      "Assist administrative officers with filing, photocopying, and scanning documents",
      "Run essential external errands for office operations when required"
    ]
  },
  {
    id: 2,
    title: "Cloud Systems & DevOps Engineer",
    slug: "cloud-systems-engineer",
    department: "Engineering & Cloud Infrastructure",
    location: "Kampala, Uganda",
    type: "Full-time",
    vacancies: 2,
    status: "open",
    deadline: "2026-10-15",
    description: "Join Nova Cloud Edges technical team to design, maintain, and automate our cloud hosting infrastructure, virtualized edge nodes, and Kubernetes clusters.",
    requirements: [
      "Bachelor's Degree in Computer Science, Software Engineering, or IT",
      "3+ years experience with Linux administration (Debian/Ubuntu/CentOS), Docker, and KVM/Proxmox",
      "Hands-on experience with MySQL/MariaDB replication and performance tuning",
      "Certifications in AWS, CKA, or RHCE are an added advantage"
    ],
    responsibilities: [
      "Manage cloud virtualization hosts and storage networks",
      "Implement CI/CD pipelines and automated backup strategies",
      "Monitor server performance and resolve escalation alerts 24/7"
    ]
  }
];

export default function JobsPage() {
  const { showToast } = useApp();
  const [jobs, setJobs] = useState(defaultJobs);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);

  const [applicantData, setApplicantData] = useState({
    applicant_name: '',
    email: '',
    phone: '',
    experience_years: '1-2 years',
    documents: []
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setJobs(data);
        else setJobs(defaultJobs);
        setLoading(false);
      })
      .catch(() => {
        setJobs(defaultJobs);
        setLoading(false);
      });
  }, []);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyModalJob) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isExpired = (applyModalJob.deadline && applyModalJob.deadline < todayStr) || (applyModalJob.status && (applyModalJob.status.toLowerCase() === 'closed' || applyModalJob.status.toLowerCase() === 'inactive'));

    if (isExpired) {
      showToast(`Applications for "${applyModalJob.title}" closed on ${applyModalJob.deadline}. No further applications are being accepted.`, 'error');
      setApplyModalJob(null);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: applyModalJob.id,
          ...applicantData
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit application');

      showToast(data.message, 'success');
      setApplyModalJob(null);
      setApplicantData({
        applicant_name: '',
        email: '',
        phone: '',
        experience_years: '1-2 years',
        cover_letter: '',
        resume_url: ''
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.0rem', marginTop: '0.5rem' }}>Current Job Openings</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '680px', margin: '0.5rem auto 0' }}>
            Discover rewarding career opportunities at Nova Cloud Edges (U) Limited. Build your career with our talented team of technology professionals in Kampala.
          </p>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading job openings...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            No open vacancies at the moment. Please check back soon!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '2rem' }}>
            {jobs.map(job => {
              const reqs = Array.isArray(job.requirements)
                ? job.requirements
                : (typeof job.requirements === 'string' ? JSON.parse(job.requirements || '[]') : []);
              const resps = Array.isArray(job.responsibilities)
                ? job.responsibilities
                : (typeof job.responsibilities === 'string' ? JSON.parse(job.responsibilities || '[]') : []);

              const todayStr = new Date().toISOString().split('T')[0];
              const isExpired = (job.deadline && job.deadline < todayStr) || (job.status && (job.status.toLowerCase() === 'closed' || job.status.toLowerCase() === 'inactive'));

              return (
                <div
                  key={job.id}
                  className="glass-card"
                  style={{
                    padding: '2rem',
                    borderRadius: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: isExpired ? 0.88 : 1
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <span className="badge-tag">{job.department}</span>
                        {isExpired && (
                          <span className="badge-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: '800', fontSize: '0.725rem' }}>
                            ● Application Deadline Passed
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: '1.45rem', fontWeight: '800', lineHeight: '1.3', margin: 0 }}>{job.title}</h2>
                    </div>

                    {/* Metadata Chips */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={15} color="var(--primary)" /> {job.location || 'Kampala, Uganda'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={15} color={isExpired ? '#ef4444' : 'var(--accent-cyan)'} /> 
                        {isExpired ? `Deadline Ended (${job.deadline})` : `Deadline: ${job.deadline || 'Open Until Filled'}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={15} color="var(--accent-emerald)" /> Vacancies: {job.vacancies || 1}
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                      {job.description}
                    </p>

                    {/* Requirements & Responsibilities Split */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1.25rem',
                      background: 'var(--bg-main)',
                      padding: '1.15rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      marginBottom: '1.5rem'
                    }}>
                      {/* Requirements */}
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                          Key Requirements:
                        </h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: 0, margin: 0 }}>
                          {reqs.slice(0, 4).map((req, rIdx) => (
                            <li key={rIdx} style={{ fontSize: '0.825rem', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                              <CheckCircle2 size={15} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Responsibilities */}
                      {resps.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--secondary)' }}>
                            Core Duties:
                          </h4>
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: 0, margin: 0 }}>
                            {resps.slice(0, 4).map((resp, pIdx) => (
                              <li key={pIdx} style={{ fontSize: '0.825rem', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                                <CheckCircle2 size={15} color="var(--accent-cyan)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>{resp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    {isExpired ? (
                      <button
                        type="button"
                        disabled
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1.5rem', opacity: 0.7, cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', fontWeight: '800' }}
                      >
                        Application Closed ({job.deadline})
                      </button>
                    ) : (
                      <button
                        onClick={() => setApplyModalJob(job)}
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1.5rem' }}
                      >
                        Apply for this Position <Send size={16} />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Application Modal */}
        {applyModalJob && (
          <div className="modal-overlay" onClick={() => setApplyModalJob(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
              
              <button
                onClick={() => setApplyModalJob(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>
                Job Application: {applyModalJob.title}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Submit your details directly to Nova Cloud Edges HR department. Data is securely saved to MySQL.
              </p>

              <form onSubmit={handleApplySubmit}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Grace Namuli"
                    value={applicantData.applicant_name}
                    onChange={e => setApplicantData({ ...applicantData, applicant_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="grace@example.com"
                      value={applicantData.email}
                      onChange={e => setApplicantData({ ...applicantData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+256 700 123 456"
                      value={applicantData.phone}
                      onChange={e => setApplicantData({ ...applicantData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Years of Relevant Experience</label>
                  <select
                    className="form-input"
                    value={applicantData.experience_years}
                    onChange={e => setApplicantData({ ...applicantData, experience_years: e.target.value })}
                  >
                    <option value="Entry Level (< 1 year)">Entry Level (&lt; 1 year)</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="3-5 years">3-5 years</option>
                    <option value="5+ years">5+ years</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Upload Documents (CV, Cover Letter, Certificates, Testimonials) *</label>
                  <input
                    type="file"
                    multiple
                    className="form-input"
                    onChange={e => {
                      const files = Array.from(e.target.files);
                      setApplicantData({ ...applicantData, documents: files });
                    }}
                    required
                  />
                  {applicantData.documents && applicantData.documents.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)' }}>
                      <strong>Attached ({applicantData.documents.length} files):</strong> {applicantData.documents.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Application...' : 'Submit Job Application'}
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
