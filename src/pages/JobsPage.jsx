import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Briefcase, MapPin, Clock, Users, CheckCircle2, FileText, Send, X, AlertCircle } from 'lucide-react';

export default function JobsPage() {
  const { showToast } = useApp();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
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
        setJobs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyModalJob) return;

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
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ fontSize: '2.6rem', marginTop: '0.5rem' }}>Current Job Openings</h1>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {jobs.map(job => {
              const reqs = Array.isArray(job.requirements)
                ? job.requirements
                : (typeof job.requirements === 'string' ? JSON.parse(job.requirements) : []);
              const resps = Array.isArray(job.responsibilities)
                ? job.responsibilities
                : (typeof job.responsibilities === 'string' ? JSON.parse(job.responsibilities) : []);

              return (
                <div key={job.id} className="glass-card" style={{ padding: '2rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <span className="badge-tag" style={{ marginBottom: '0.4rem' }}>{job.department}</span>
                      <h2 style={{ fontSize: '1.6rem', lineHeight: '1.2' }}>{job.title}</h2>
                    </div>

                    <button
                      onClick={() => setApplyModalJob(job)}
                      className="btn-primary"
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      Apply Now <Send size={18} />
                    </button>
                  </div>

                  {/* Metadata Chips */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={16} color="var(--primary)" /> {job.location || 'Kampala, Uganda'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} color="var(--accent-cyan)" /> {job.type || 'Full-time'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={16} color="var(--accent-emerald)" /> Vacancies: {job.vacancies || 1}
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    {job.description}
                  </p>

                  {/* Requirements & Responsibilities Split */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    background: 'var(--bg-main)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {/* Requirements */}
                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem', color: 'var(--primary)' }}>
                        Key Requirements:
                      </h4>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {reqs.map((req, rIdx) => (
                          <li key={rIdx} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Responsibilities */}
                    {resps.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem', color: 'var(--secondary)' }}>
                          Core Responsibilities:
                        </h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {resps.map((resp, pIdx) => (
                            <li key={pIdx} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <CheckCircle2 size={16} color="var(--accent-cyan)" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span>{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
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
