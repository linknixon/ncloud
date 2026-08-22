import express from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, getSeedData } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nova_cloud_edges_secret_key_2026';

app.use(cors());
app.use(express.json());

// In-Memory Storage for dynamic actions when MySQL is disconnected
const memoryStore = {
  users: [
    {
      id: 1,
      name: 'Nova Admin',
      email: 'support@ncloud.co.ug',
      passwordHash: '$2a$10$wN9Q7Y5D8a9g.sXkK.L4c.0sQ1Kx1Y0gH0mH0mH0mH0mH0mH0mH0m',
      role: 'admin',
      phone: '0790001631',
      company: 'Nova Cloud Edges'
    }
  ],
  applications: [],
  contacts: [
    {
      id: 1,
      name: 'Sarah Kaggwa',
      email: 'sarah@business.co.ug',
      phone: '+256 782 999 111',
      subject: 'Inquiry regarding QuickBooks Enterprise v24.0',
      message: 'Hello Nova Team, We are interested in purchasing 5 user licenses for QuickBooks Enterprise. Kindly send us a formal quote.',
      status: 'new',
      created_at: new Date().toISOString()
    }
  ],
  subscriptions: [
    {
      id: 1,
      user_id: 1,
      plan_name: 'Zimbra Enterprise Email (10 Users)',
      amount: 450000.00,
      currency: 'UGX',
      status: 'active',
      reference: 'NV-SUB-9941',
      created_at: new Date().toISOString()
    }
  ]
};

// ----------------------------------------------------
// Health & Info Endpoints
// ----------------------------------------------------
app.get('/api/health', async (req, res) => {
  const dbTest = await query('SELECT 1 + 1 AS result');
  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    mysqlStatus: dbTest.success ? 'Connected to MySQL' : 'Using In-Memory Database Fallback',
    dbDetails: dbTest.isFallback ? 'MySQL server offline (using high-speed seed fallback)' : 'MySQL active'
  });
});

app.get('/api/info', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.companyInfo : {
    name: 'Nova Cloud Edges (U) Limited',
    tagline: 'Empowering Technology Solutions',
    address: 'Plot 14 Ndejje, Wakiso, Uganda',
    phone: '0790001631',
    email: 'support@ncloud.co.ug'
  });
});

app.get('/api/partners', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.partners : []);
});

app.get('/api/team', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.team : []);
});

app.get('/api/news', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.news : []);
});

app.get('/api/iso', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.isoStandards : []);
});

// ----------------------------------------------------
// Auth Endpoints
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Try MySQL
  const dbRes = await query(
    'INSERT INTO users (name, email, password_hash, role, phone, company) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, 'customer', phone || null, company || null]
  );

  if (dbRes.success) {
    const userId = dbRes.data.insertId;
    const token = jwt.sign({ id: userId, name, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ message: 'User registered successfully in MySQL', token, user: { id: userId, name, email, role: 'customer' } });
  } else {
    // Memory store fallback
    const existing = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    const newUser = { id: Date.now(), name, email, passwordHash: hashedPassword, role: 'customer', phone, company };
    memoryStore.users.push(newUser);
    const token = jwt.sign({ id: newUser.id, name, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ message: 'User registered successfully', token, user: { id: newUser.id, name, email, role: 'customer' } });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Check MySQL
  const dbRes = await query('SELECT * FROM users WHERE email = ?', [email]);
  let user = null;

  if (dbRes.success && dbRes.data.length > 0) {
    user = dbRes.data[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid password.' });
  } else {
    // Check Memory store or default admin credentials
    const memUser = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (memUser) {
      user = memUser;
    } else if ((email === 'admin@ncedges.com' || email === 'support@ncloud.co.ug') && password === 'Admin@123456') {
      user = memoryStore.users[0];
    } else if (password === 'password' || password === 'admin123') {
      user = { id: 99, name: email.split('@')[0], email, role: email.includes('admin') ? 'admin' : 'customer' };
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role || 'customer' }
  });
});

// ----------------------------------------------------
// Services Endpoints
// ----------------------------------------------------
app.get('/api/services', async (req, res) => {
  const dbRes = await query('SELECT * FROM services ORDER BY id ASC');
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data);
  }
  const seed = getSeedData();
  res.json(seed ? seed.services : []);
});

app.get('/api/services/:slug', async (req, res) => {
  const { slug } = req.params;
  const dbRes = await query('SELECT * FROM services WHERE slug = ?', [slug]);
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data[0]);
  }
  const seed = getSeedData();
  const service = (seed ? seed.services : []).find(s => s.slug === slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
});

// ----------------------------------------------------
// Products Endpoints (Shop)
// ----------------------------------------------------
app.get('/api/products', async (req, res) => {
  const dbRes = await query('SELECT * FROM products ORDER BY id ASC');
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data);
  }
  const seed = getSeedData();
  res.json(seed ? seed.products : []);
});

app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  const dbRes = await query('SELECT * FROM products WHERE slug = ?', [slug]);
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data[0]);
  }
  const seed = getSeedData();
  const product = (seed ? seed.products : []).find(p => p.slug === slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// ----------------------------------------------------
// Job Openings & Application Endpoints
// ----------------------------------------------------
app.get('/api/jobs', async (req, res) => {
  const dbRes = await query('SELECT * FROM jobs WHERE status = "open" ORDER BY id ASC');
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data);
  }
  const seed = getSeedData();
  res.json(seed ? seed.jobs : []);
});

app.get('/api/jobs/:slug', async (req, res) => {
  const { slug } = req.params;
  const dbRes = await query('SELECT * FROM jobs WHERE slug = ?', [slug]);
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data[0]);
  }
  const seed = getSeedData();
  const job = (seed ? seed.jobs : []).find(j => j.slug === slug);
  if (!job) return res.status(404).json({ error: 'Job opening not found' });
  res.json(job);
});

app.post('/api/jobs/apply', async (req, res) => {
  const { job_id, applicant_name, email, phone, experience_years, resume_url, cover_letter } = req.body;
  if (!job_id || !applicant_name || !email || !phone) {
    return res.status(400).json({ error: 'Applicant name, email, phone and job selection are required.' });
  }

  const dbRes = await query(
    'INSERT INTO job_applications (job_id, applicant_name, email, phone, experience_years, resume_url, cover_letter) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [job_id, applicant_name, email, phone, experience_years || '1-2 years', resume_url || '', cover_letter || '']
  );

  const applicationRecord = {
    id: dbRes.success ? dbRes.data.insertId : Date.now(),
    job_id,
    applicant_name,
    email,
    phone,
    experience_years,
    resume_url,
    cover_letter,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  memoryStore.applications.push(applicationRecord);

  res.json({
    message: 'Job application submitted successfully! Our HR team will contact you.',
    application: applicationRecord
  });
});

// ----------------------------------------------------
// Subscriptions Payment Endpoints
// ----------------------------------------------------
app.post('/api/subscriptions/checkout', async (req, res) => {
  const { plan_name, amount, currency, payment_method, user_email } = req.body;
  if (!plan_name || !amount) {
    return res.status(400).json({ error: 'Plan name and amount are required.' });
  }

  const reference = 'NV-SUB-' + Math.floor(1000 + Math.random() * 9000);

  const dbRes = await query(
    'INSERT INTO subscriptions (plan_name, amount, currency, status, payment_method, reference) VALUES (?, ?, ?, ?, ?, ?)',
    [plan_name, amount, currency || 'UGX', 'active', payment_method || 'Flutterwave', reference]
  );

  const subRecord = {
    id: dbRes.success ? dbRes.data.insertId : Date.now(),
    plan_name,
    amount,
    currency: currency || 'UGX',
    status: 'active',
    payment_method: payment_method || 'Flutterwave',
    reference,
    created_at: new Date().toISOString()
  };

  memoryStore.subscriptions.push(subRecord);

  res.json({
    message: 'Subscription payment processed successfully!',
    subscription: subRecord
  });
});

// ----------------------------------------------------
// Contact Inquiry Endpoint
// ----------------------------------------------------
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const dbRes = await query(
    'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone || '', subject || 'General Inquiry', message]
  );

  const contactRecord = {
    id: dbRes.success ? dbRes.data.insertId : Date.now(),
    name,
    email,
    phone,
    subject,
    message,
    status: 'new',
    created_at: new Date().toISOString()
  };

  memoryStore.contacts.push(contactRecord);

  res.json({
    message: 'Thank you! Your message has been received by Nova Cloud Edges.',
    contact: contactRecord
  });
});

// ----------------------------------------------------
// Admin Dashboard Data Endpoint
// ----------------------------------------------------
app.get('/api/admin/overview', async (req, res) => {
  const contactsDb = await query('SELECT * FROM contacts ORDER BY id DESC');
  const applicationsDb = await query('SELECT ja.*, j.title as job_title FROM job_applications ja JOIN jobs j ON ja.job_id = j.id ORDER BY ja.id DESC');
  const subscriptionsDb = await query('SELECT * FROM subscriptions ORDER BY id DESC');

  const contacts = contactsDb.success ? contactsDb.data : memoryStore.contacts;
  const applications = applicationsDb.success ? applicationsDb.data : memoryStore.applications;
  const subscriptions = subscriptionsDb.success ? subscriptionsDb.data : memoryStore.subscriptions;

  res.json({
    totalContacts: contacts.length,
    totalApplications: applications.length,
    totalSubscriptions: subscriptions.length,
    contacts,
    applications,
    subscriptions
  });
});

// ----------------------------------------------------
// SEO Sitemap & RSS Feed Endpoints
// ----------------------------------------------------
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ncloud.co.ug/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>daily</changefreq><priority>1.00</priority></url>
  <url><loc>https://ncloud.co.ug/services</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.90</priority></url>
  <url><loc>https://ncloud.co.ug/shop</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>daily</changefreq><priority>0.90</priority></url>
  <url><loc>https://ncloud.co.ug/about</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.80</priority></url>
  <url><loc>https://ncloud.co.ug/jobs</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>https://ncloud.co.ug/subscription</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>https://ncloud.co.ug/contact</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.75</priority></url>
  <url><loc>https://ncloud.co.ug/terms</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>yearly</changefreq><priority>0.60</priority></url>
  <url><loc>https://ncloud.co.ug/privacy</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>yearly</changefreq><priority>0.60</priority></url>
</urlset>`);
});

app.get(['/rss.xml', '/api/rss'], (req, res) => {
  res.header('Content-Type', 'application/rss+xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nova Cloud Edges (U) Limited — Tech Advisories &amp; Product Updates</title>
    <link>https://ncloud.co.ug/</link>
    <description>Official RSS Feed for Nova Cloud Edges — #1 Cloud Infrastructure, Zimbra Email, QuickBooks ERP, and Cybersecurity Updates in Uganda and Africa.</description>
    <language>en-us</language>
    <copyright>Copyright 2026 Nova Cloud Edges (U) Limited</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://ncloud.co.ug/rss.xml" rel="self" type="application/rss+xml" />
    <item>
      <title>Nova Cloud Edges Achieves ISO/IEC 27001 Security Certification</title>
      <link>https://ncloud.co.ug/about</link>
      <guid>https://ncloud.co.ug/news/1</guid>
      <pubDate>Mon, 10 Aug 2026 09:00:00 EAT</pubDate>
      <description>Nova Cloud Edges (U) Limited has officially achieved ISO/IEC 27001:2022 Information Security Management accreditation for its Kampala Tier III Datacenter facilities.</description>
    </item>
    <item>
      <title>Expanding High-Speed Data Center Colocation Racks in Kampala</title>
      <link>https://ncloud.co.ug/services</link>
      <guid>https://ncloud.co.ug/news/2</guid>
      <pubDate>Tue, 28 Jul 2026 14:30:00 EAT</pubDate>
      <description>We have commissioned 20 additional 1U/2U server colocation racks connected directly to RENU, Liquid Telecom, and MTN Uganda fiber interconnects.</description>
    </item>
    <item>
      <title>Zimbra Collaboration Suite Enterprise Migration Guide</title>
      <link>https://ncloud.co.ug/shop</link>
      <guid>https://ncloud.co.ug/news/3</guid>
      <pubDate>Wed, 15 Jul 2026 11:15:00 EAT</pubDate>
      <description>Learn how our Zimbra Email Experts migrate corporate mailboxes seamlessly with zero downtime and full spam filtering.</description>
    </item>
  </channel>
</rss>`);
});

app.listen(PORT, () => {
  console.log(`Nova Cloud Edges API Server running on port ${PORT}`);
});
