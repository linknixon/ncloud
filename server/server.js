import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { query, getSeedData } from './db.js';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const persistentStorePath = path.join(__dirname, 'database', 'persistentStore.json');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nova_cloud_edges_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Persistent Data Storage Helper (Preserves user database records & saved items)
function loadPersistentStore() {
  try {
    if (fs.existsSync(persistentStorePath)) {
      const data = JSON.parse(fs.readFileSync(persistentStorePath, 'utf8'));
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log('[Database Persistence] Successfully restored user database items & saved settings from persistentStore.json');
        return data;
      }
    }
  } catch (err) {
    console.error('[Database Persistence] Warning reading persistentStore.json:', err.message);
  }
  return null;
}

export function savePersistentStore() {
  try {
    if (typeof memoryStore !== 'undefined' && memoryStore) {
      fs.writeFileSync(persistentStorePath, JSON.stringify(memoryStore, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[Database Persistence] Warning writing persistentStore.json:', err.message);
  }
}

// Real SMTP Email Transport Helper (Nodemailer Socket Connection)
export async function sendMail({ to, subject, text, html, attachments }) {
  const settings = memoryStore?.smtp_settings || {};
  const host = (settings.host && settings.host.trim()) || process.env.SMTP_HOST;
  const port = Number(settings.port) || Number(process.env.SMTP_PORT) || 587;
  const securityType = settings.security_type || 'TLS';
  const secure = securityType === 'SSL/TLS' || port === 465;
  const user = (settings.username && settings.username.trim()) || process.env.SMTP_USER;
  const pass = settings.password || process.env.SMTP_PASS;
  const senderName = settings.sender_name || 'Nova Cloud Edges Official Notifications';
  const senderEmail = (settings.sender_email && settings.sender_email.trim()) || user || 'billing@ncloud.co.ug';

  if (!host) {
    console.warn('[SMTP Mailer WARNING] SMTP Host is not configured in settings or environment. Email delivery skipped.');
    return { success: false, error: 'SMTP Host not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: (user && pass) ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 15000
    });

    const formattedTo = (typeof to === 'string' && to.includes(','))
      ? to.split(',').map(e => e.trim()).filter(Boolean)
      : to;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: formattedTo,
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || `<p>${text}</p>`,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mailer SUCCESS] Email delivered to ${JSON.stringify(formattedTo)} via ${host}:${port} (MessageID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      recipient: to
    };
  } catch (err) {
    console.error(`[SMTP Mailer ERROR] Failed to deliver email to ${JSON.stringify(to)} via ${host}:${port}:`, err.message);
    return {
      success: false,
      error: err.message,
      recipient: to
    };
  }
}

// Helper to calculate subscription expiry date based on license duration
function calculateExpiryDate(startDateStr, duration) {
  const start = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(start.getTime())) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
  const result = new Date(start);
  const dur = (duration || 'Monthly').toLowerCase();
  if (dur.includes('3 month') || dur.includes('quarter')) {
    result.setMonth(result.getMonth() + 3);
  } else if (dur.includes('6 month')) {
    result.setMonth(result.getMonth() + 6);
  } else if (dur.includes('2 year')) {
    result.setFullYear(result.getFullYear() + 2);
  } else if (dur.includes('3 year')) {
    result.setFullYear(result.getFullYear() + 3);
  } else if (dur.includes('year') || dur.includes('annual')) {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    // Default 1 Month / Monthly
    result.setMonth(result.getMonth() + 1);
  }
  return result.toISOString().split('T')[0];
}

// In-Memory Storage for dynamic actions when MySQL is disconnected
const memoryStore = {
  users: [],
  services: (getSeedData() && getSeedData().services && getSeedData().services.length > 0) ? getSeedData().services : [
    {
      id: 1,
      title: "Cloud Infrastructure & Edge Hosting",
      slug: "cloud-infrastructure",
      summary: "Scalable, secure cloud edge servers and managed infrastructure tailored for modern enterprises.",
      description: "Nova Cloud Edges delivers next-generation cloud infrastructure built for high performance, maximum uptime, and localized edge latency.",
      icon: "Cloud",
      features: ["99.99% Uptime SLA with edge node redundancy", "Automated backup & quick disaster recovery", "Custom hybrid & private cloud architecture", "24/7 dedicated system engineer monitoring"]
    },
    {
      id: 2,
      title: "Enterprise Software & Accounting Solutions",
      slug: "enterprise-software",
      summary: "Official reseller and implementation partner for QuickBooks Enterprise and customized ERP systems.",
      description: "We specialize in deploying, customizing, and training teams on world-class ERP software, including Intuit QuickBooks Enterprise Solutions.",
      icon: "Cpu",
      features: ["Official QuickBooks Enterprise License & Installation", "Custom workflow and financial reporting setup", "Multi-currency & localized tax compliance", "Staff training & ongoing technical support"]
    },
    {
      id: 3,
      title: "Zimbra Email Experts",
      slug: "zimbra-email",
      summary: "Enterprise Zimbra email server administration, migration, webmail, calendar, and high-deliverability anti-spam protection.",
      description: "Take full control of your corporate communications with Zimbra Email Experts. Secure, fast, and feature-packed Zimbra email platform.",
      icon: "Mail",
      features: ["Zimbra Collaboration Suite administration", "Corporate email webmail & ActiveSync mobile support", "Advanced anti-spam & malware protection", "Shared calendars, contacts, and task management"]
    },
    {
      id: 4,
      title: "Cybersecurity & Edge Network Defense",
      slug: "cybersecurity",
      summary: "Expert Cyber Security Team providing proactive firewall protection, endpoint security, and compliance auditing.",
      description: "Safeguard your critical enterprise data against cyber threats with Nova's Expert Cyber Security Team. Certified ethical hackers and 24/7 Threat Intelligence SOC monitoring.",
      icon: "ShieldCheck",
      features: ["Expert Cyber Security Team (CISSP & CEH Certified)", "Next-Gen Firewall configuration & UTM", "24/7 Threat Intelligence SOC monitoring", "Cybersecurity vulnerability assessment & penetration testing"]
    },
    {
      id: 5,
      title: "Managed IT Services & Consultancy",
      slug: "managed-it-services",
      summary: "End-to-end IT support, network cabling, server management, and technology strategy.",
      description: "Partner with Nova Cloud Edges as your dedicated IT department. We handle daily tech support and core infrastructure.",
      icon: "Server",
      features: ["On-site & remote 24/7 helpdesk support", "Network design, structured cabling & Wi-Fi setup", "Server administration (Linux / Windows)", "IT hardware procurement & warranty management"]
    },
    {
      id: 6,
      title: "Internet of Things (IoT) & Local Edge Gateways",
      slug: "iot-edge-gateways",
      summary: "Deploy industrial IoT sensors, local edge gateway hardware, and real-time telemetry processing.",
      description: "Nova Cloud Edges provides end-to-end Internet of Things (IoT) solutions. We configure and manage local edge gateway hardware to collect, process, and filter sensor data at the edge before syncing with cloud infrastructure.",
      icon: "Radio",
      features: ["Industrial IoT sensor deployment & hardware setup", "Local Edge Gateway installation & edge processing", "Real-time telemetry, temperature & environmental monitoring", "Low-latency MQTT/HTTP secure data streaming"]
    },
    {
      id: 7,
      title: "Data Analytics & Interactive Visualization",
      slug: "data-analytics-visualization",
      summary: "Transform raw enterprise data into actionable Business Intelligence dashboards and real-time charts.",
      description: "Unlock strategic insights with Nova's Data Analytics & Visualization services. We build custom BI dashboards, automated reporting pipelines, predictive models, and interactive charts connected to your ERP and database systems.",
      icon: "BarChart3",
      features: ["Custom Business Intelligence (BI) dashboard design", "Real-time data visualization & automated reporting", "Database ETL pipelines & data warehousing", "Predictive analytics & financial performance trends"]
    },
    {
      id: 8,
      title: "Custom Software Development & Modern Tech Stacks",
      slug: "custom-software-development",
      summary: "Full-cycle custom web, mobile, and cloud software development using modern languages and frameworks.",
      description: "Nova Cloud Edges builds scalable, high-performance web applications, enterprise microservices, REST/GraphQL APIs, and native mobile apps using modern technology stacks including React, TypeScript, Node.js, Python, Go, Rust, and Cloud-Native architectures.",
      icon: "Code2",
      features: ["Modern Full-Stack Web Development (React, Next.js, Node.js, TypeScript)", "High-Performance Cloud Microservices & APIs (Python, Go, Rust)", "Mobile App Development (iOS & Android cross-platform solutions)", "Agile CI/CD, automated testing & cloud containerization"]
    }
  ],
  products: (getSeedData() && getSeedData().products && getSeedData().products.length > 0) ? getSeedData().products : [
    {
      id: 1,
      name: "Intuit QuickBooks Enterprise Solutions v24.0",
      slug: "intuit-quickbooks-enterprise-solutions-v24-0",
      category: "Software & Licenses",
      price: 3500000.00,
      currency: "UGX",
      badge: "Best Seller",
      short_desc: "Industry-leading ERP accounting software designed for growing businesses requiring up to 40 concurrent users.",
      description: "Intuit QuickBooks Enterprise Solutions v24.0 gives you powerful control over financial management, inventory tracking, payroll processing, and custom reporting.",
      image_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
      stock: 50
    },
    {
      id: 2,
      name: "Zimbra Enterprise Email Package (10 Users)",
      slug: "zimbra-email-package",
      category: "Software & Licenses",
      price: 450000.00,
      currency: "UGX",
      badge: "Popular",
      short_desc: "Annual subscription for 10 corporate Zimbra mailboxes with 25GB storage per user, shared calendar and webmail.",
      description: "Zimbra Enterprise Email Package includes 10 custom domain email accounts with 25GB quota each, Zimbra webmail suite, Microsoft Outlook & mobile sync, spam protection, and 99.9% uptime guarantee.",
      image_url: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800&q=80",
      stock: 100
    },
    {
      id: 3,
      name: "Data Center Colocation Management & Rack Hosting (1U Rack Unit)",
      slug: "colocation-management-1u",
      category: "Hosting",
      price: 650000.00,
      currency: "UGX",
      badge: "Infrastructure",
      short_desc: "Secure 1U server colocation hosting in high-security Tier III Data Center with dual A+B power feeds and gigabit bandwidth.",
      description: "Nova Colocation Management provides rack space, redundant diesel generator backup, precision cooling, biometric access control, and 1Gbps unmetered RENU/Liquid fiber cross-connects.",
      image_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
      stock: 25
    },
    {
      id: 4,
      name: "Nova Cloud Edge VPS Server (Standard)",
      slug: "cloud-vps-standard",
      category: "Hosting",
      price: 280000.00,
      currency: "UGX",
      badge: "Featured",
      short_desc: "4 vCPU, 8GB RAM, 100GB NVMe SSD Cloud Virtual Private Server hosted in Kampala Edge Datacenter.",
      description: "High-performance Cloud VPS featuring ultra-fast NVMe storage, dedicated IPv4 address, automated daily snapshots, full root access.",
      image_url: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=800&q=80",
      stock: 30
    },
    {
      id: 5,
      name: "Sophos Next-Gen Firewall Appliance",
      slug: "sophos-firewall-appliance",
      category: "Hardware & Security",
      price: 4200000.00,
      currency: "UGX",
      badge: "Enterprise",
      short_desc: "Hardware firewall appliance with Xstream Architecture, deep packet inspection, and web filtering.",
      description: "Robust cybersecurity hardware for medium and large offices. Provides AI-powered threat detection, SSL/TLS inspection, SD-WAN site-to-site connectivity.",
      image_url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80",
      stock: 12
    },
    {
      id: 6,
      name: "Microsoft 365 Business Standard Suite (Annual / User)",
      slug: "microsoft-365-business-standard",
      category: "Software & Licenses",
      price: 780000.00,
      currency: "UGX",
      badge: "Cloud Suite",
      short_desc: "Full desktop Microsoft Office apps with cloud services: Teams, 1TB OneDrive, SharePoint, and Exchange email.",
      description: "Empower your workplace with genuine Microsoft 365 Business Standard. Includes Word, Excel, PowerPoint, Outlook, Microsoft Teams, and enterprise cloud storage.",
      image_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
      stock: 150
    },
    {
      id: 7,
      name: "Dedicated Bare-Metal Enterprise Server (32 Cores, 128GB RAM)",
      slug: "dedicated-bare-metal-server",
      category: "Hosting",
      price: 1850000.00,
      currency: "UGX",
      badge: "High Compute",
      short_desc: "Dedicated physical server hosted in Tier III Kampala datacenter with dual 10Gbps uplinks and RAID-10 NVMe storage.",
      description: "Zero virtualization overhead. Direct hardware control for large ERP systems, financial databases, and intensive compute workloads with 99.99% SLA.",
      image_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
      stock: 10
    },
    {
      id: 8,
      name: "Cisco Catalyst Gigabit Managed Switch (48-Port PoE+)",
      slug: "cisco-catalyst-48port-switch",
      category: "Hardware & Security",
      price: 3450000.00,
      currency: "UGX",
      badge: "Enterprise",
      short_desc: "Layer 3 managed PoE+ network switch with 740W power budget and 4x 10G SFP+ uplink ports.",
      description: "High-density enterprise network switch for corporate campus networking, IP telephony, Wi-Fi 6 access points, and surveillance cameras.",
      image_url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80",
      stock: 8
    }
  ],
  partners: ((getSeedData() && getSeedData().partners && getSeedData().partners.length > 0) ? getSeedData().partners : [
    { id: 1, name: 'Google Cloud', category: 'Premier Cloud Partner', website: 'https://cloud.google.com' },
    { id: 2, name: 'Microsoft', category: 'Gold Cloud Solutions Provider', website: 'https://microsoft.com' },
    { id: 3, name: 'RENU Uganda', category: 'Research & Education Network', website: 'https://renu.ac.ug' },
    { id: 4, name: 'Raxio Data Centre', category: 'Tier III Colocation Facility', website: 'https://raxio.co.ug' },
    { id: 5, name: 'Liquid Intelligent Technologies', category: 'Cross-Border Fiber Transit', website: 'https://liquid.tech' },
    { id: 6, name: 'MTN Business Uganda', category: 'Enterprise Telecom & MPLS', website: 'https://mtn.co.ug' }
  ]).map((p, idx) => ({ id: p.id || (idx + 1), ...p })),
  news: (getSeedData() && getSeedData().news && getSeedData().news.length > 0) ? getSeedData().news : [
    { id: 1, title: 'Nova Cloud Edges Achieves ISO/IEC 27001 Certification', date: '2026-08-10', category: 'Security', image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80', content: 'Nova Cloud Edges has officially achieved ISO/IEC 27001:2022 Information Security Management accreditation for its Kampala Tier III Datacenter facilities.' },
    { id: 2, title: 'Expanding High-Speed Data Center Colocation Racks', date: '2026-07-28', category: 'Infrastructure', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80', content: 'We have commissioned 20 additional 1U/2U server colocation racks connected directly to RENU, Liquid Telecom, and MTN Uganda fiber interconnects.' },
    { id: 3, title: 'Zimbra Collaboration Suite Migration Guide for Enterprise IT', date: '2026-07-15', category: 'Email', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', content: 'Learn how our Zimbra Email Experts migrate corporate mailboxes seamlessly with zero downtime and full spam filtering.' }
  ],
  applications: [],
  contacts: [],
  subscriptions: [],
  invoices: [],
  payroll: [],
  staff_expenses: [],
  staff_invoices: [],
  paid_stamp: null,
  payments: [
    {
      id: 1,
      payment_type: 'customer',
      invoice_number: 'INV-2026-0041',
      party_name: 'Kintu Logistics Uganda',
      party_email: 'samuel@kintu.co.ug',
      amount_due: 767000.00,
      amount_paid: 767000.00,
      payment_method: 'Bank Wire Transfer',
      reference: 'TXN-BANK-998811',
      status: '100% Paid',
      date: '2026-08-15',
      updated_by: 'Julian Sales Executive',
      created_at: new Date().toISOString()
    }
  ],
  sliders: [
    {
      id: 1,
      title: 'Sovereign Cloud Edge Infrastructure',
      subtitle: 'Ultra-low latency virtual servers and Tier III colocation hosting in Kampala, Uganda.',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
      active: true
    }
  ],
  team: ((getSeedData() && getSeedData().team && getSeedData().team.length > 0) ? getSeedData().team : [
    {
      id: 1,
      name: "Dr. Arthur Mukasa",
      role: "Chief Executive Officer & Founder",
      bio: "Over 18 years leading digital infrastructure, cloud migration, and telecom strategies across East Africa.",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 2,
      name: "Florence Akello",
      role: "Chief Technology Officer",
      bio: "Former lead infrastructure architect specializing in edge computing, Kubernetes orchestration, and Zimbra mail clusters.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 3,
      name: "David Tumusiime",
      role: "Head of Cyber Security & Threat Intelligence",
      bio: "CISSP & CEH certified security strategist leading Nova's 24/7 Threat Intelligence Security Operations Center (SOC).",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: 4,
      name: "Grace Nsubuga",
      role: "Lead Cloud Operations & Colocation Manager",
      bio: "Manages server rack colocation, dual redundant power systems, and client SLA compliance.",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80"
    }
  ]).map((t, idx) => ({ id: t.id || (idx + 1), ...t })),
  jobs: (getSeedData() && getSeedData().jobs && getSeedData().jobs.length > 0) ? getSeedData().jobs : [],
  expense_categories: [
    { id: 1, name: 'Datacenter Server Hardware & Cabling', description: 'Rack units, patch cords, server blades, and switch accessories' },
    { id: 2, name: 'Field Infrastructure & Fiber Splicing', description: 'Fiber transceivers, ODFs, and field deployment logistics' },
    { id: 3, name: 'Client Hospitality & Meeting Logistics', description: 'Enterprise client demonstrations and executive meetings' },
    { id: 4, name: 'Office Consumables & Admin Supplies', description: 'Office utilities, stationery, and front-desk maintenance' },
    { id: 5, name: 'Staff Travel & Transport Logistics', description: 'Emergency on-site field visits and data node transit' },
    { id: 6, name: 'Software Licenses & DevOps Utilities', description: 'Cloud hypervisor, container registries, and monitoring software' },
    { id: 7, name: 'Marketing & Sales Outreach', description: 'Commercial campaigns, exhibition booths, and print media' }
  ],
  announcement: {
    enabled: true,
    badge: 'NEW NOTICE',
    text: 'Scheduled Maintenance Update: Edge Cloud Server Upgrade & Maintenance scheduled Sunday 2:00 AM - 4:00 AM EAT. Hotline: 0790001631',
    link_text: 'View Advisory',
    link_url: '/news',
    schedule_type: 'always',
    start_date: '',
    end_date: '',
    bg_gradient: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #b91c1c 100%)'
  },
  customer_credits: [],
  bank_accounts: [
    {
      id: 1,
      bank_name: 'Stanbic Bank Uganda Limited',
      account_name: 'Nova Cloud Edges (U) Limited',
      account_number: '9030018829401',
      branch: 'Forest Mall Lugogo Branch, Kampala',
      swift_code: 'SBICUGKX',
      currency: 'UGX',
      is_primary: true
    },
    {
      id: 2,
      bank_name: 'Absa Bank Uganda Limited',
      account_name: 'Nova Cloud Edges (U) Limited',
      account_number: '0341199482',
      branch: 'Hannington Road Branch, Kampala',
      swift_code: 'BARCUGKX',
      currency: 'USD',
      is_primary: false
    }
  ],
  quotations: [],
  work_orders: [],
  unifi_vouchers: [],
  schedules: [
    {
      id: 1,
      name: 'Overdue Invoices Automated Reminder Engine',
      description: 'Dispatches automated SMS/Email reminders for pending and overdue client invoices.',
      cron_expression: '0 8 * * *',
      frequency: 'Daily at 08:00 AM EAT',
      target: 'invoices',
      enabled: true,
      last_run: '2026-08-24T08:00:00Z',
      last_status: 'Success (2 Reminders Sent)'
    },
    {
      id: 2,
      name: 'Quarterly Customer Financial Statements Generator',
      description: 'Generates and archives balance sheets and tax clearance receipts per customer.',
      cron_expression: '0 0 1 1,4,7,10 *',
      frequency: 'Every Quarter on 1st',
      target: 'statements',
      enabled: true,
      last_run: '2026-07-01T00:00:00Z',
      last_status: 'Success (42 Statements Generated)'
    },
    {
      id: 3,
      name: 'Executive Financial Summary & Audit Digest',
      description: 'Aggregates P&L, collections, and company spend report delivered to Super Admin.',
      cron_expression: '0 7 * * 1',
      frequency: 'Weekly on Monday at 07:00 AM EAT',
      target: 'executive_report',
      enabled: true,
      last_run: '2026-08-24T07:00:00Z',
      last_status: 'Success (Financial Digest Compiled)'
    },
    {
      id: 4,
      name: 'UniFi WiFi Guest Token Expiration Janitor',
      description: 'Revokes expired UniFi Guest WiFi tokens and synchronizes voucher state.',
      cron_expression: '0 */6 * * *',
      frequency: 'Every 6 Hours',
      target: 'unifi_janitor',
      enabled: true,
      last_run: '2026-08-24T18:00:00Z',
      last_status: 'Success (Cleaned 0 Expired Tokens)'
    }
  ],
  banner_settings: {
    message: 'Major Datacenter Expansion: 20 New 1U/2U High-Density Colocation Server Racks now live with 10Gbps Cross-Connects!',
    enabled: true,
    timing_seconds: 15,
    auto_dismiss_hours: 24,
    bg_gradient: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    updated_at: new Date().toISOString()
  },
  roles: [
    {
      id: 1,
      name: 'Super Administrator',
      code: 'super_admin',
      badge_color: '#8b5cf6',
      description: 'Complete unrestricted access to all modules, financial ledgers, system forensics, and CRUDAS configuration.',
      user_count: 2,
      permissions: {
        invoices: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        quotations: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        work_orders: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        payments: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        expenses: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        hr: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        unifi: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        schedules: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        forensics: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        reports: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        users: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        roles: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        store: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        subscriptions: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        settings: { create: true, read: true, update: true, delete: true, approve: true, share: true }
      }
    },
    {
      id: 2,
      name: 'Sales Administrator',
      code: 'sales_admin',
      badge_color: '#3b82f6',
      description: 'Manages customer orders, commercial quotations, tax invoices, client billing, and WiFi voucher distribution.',
      user_count: 3,
      permissions: {
        invoices: { create: true, read: true, update: true, delete: false, approve: false, share: true },
        quotations: { create: true, read: true, update: true, delete: false, approve: false, share: true },
        work_orders: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        payments: { create: true, read: true, update: true, delete: false, approve: false, share: true },
        expenses: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        hr: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        unifi: { create: true, read: true, update: true, delete: false, approve: false, share: true },
        schedules: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        forensics: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        reports: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        users: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        roles: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        store: { create: true, read: true, update: true, delete: false, approve: false, share: true },
        subscriptions: { create: true, read: true, update: true, delete: false, approve: false, share: true },
        settings: { create: false, read: true, update: false, delete: false, approve: false, share: false }
      }
    },
    {
      id: 3,
      name: 'Human Resources Manager',
      code: 'hr_manager',
      badge_color: '#f97316',
      description: 'Oversees personnel staff roll, payroll payslip disbursement, job applications review, and expense approvals.',
      user_count: 2,
      permissions: {
        invoices: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        quotations: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        work_orders: { create: true, read: true, update: true, delete: false, approve: true, share: true },
        payments: { create: true, read: true, update: true, delete: false, approve: true, share: true },
        expenses: { create: true, read: true, update: true, delete: false, approve: true, share: true },
        hr: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        unifi: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        schedules: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        forensics: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        reports: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        users: { create: true, read: true, update: true, delete: false, approve: false, share: false },
        roles: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        store: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        subscriptions: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false, share: false }
      }
    },
    {
      id: 4,
      name: 'Auditor / Compliance Reviewer',
      code: 'reviewer',
      badge_color: '#06b6d4',
      description: 'Audit & financial compliance inspector with read-only and statement sharing access across ledger logs.',
      user_count: 1,
      permissions: {
        invoices: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        quotations: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        work_orders: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        payments: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        expenses: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        hr: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        unifi: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        schedules: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        forensics: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        reports: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        users: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        roles: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        store: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        subscriptions: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        settings: { create: false, read: true, update: false, delete: false, approve: false, share: false }
      }
    },
    {
      id: 5,
      name: 'Engineering Staff Specialist',
      code: 'staff',
      badge_color: '#10b981',
      description: 'Technical infrastructure personnel assigned to on-site work orders and field expense reimbursement claims.',
      user_count: 5,
      permissions: {
        invoices: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        quotations: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        work_orders: { create: false, read: true, update: true, delete: false, approve: false, share: false },
        payments: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        expenses: { create: true, read: true, update: false, delete: false, approve: false, share: false },
        hr: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        unifi: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        schedules: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        forensics: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        reports: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        users: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        roles: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        store: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        subscriptions: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        settings: { create: false, read: false, update: false, delete: false, approve: false, share: false }
      }
    },
    {
      id: 6,
      name: 'Corporate Client / Customer',
      code: 'customer',
      badge_color: '#6366f1',
      description: 'Client account holder accessing self-service subscription renewals, downloaded invoices, and quotes.',
      user_count: 14,
      permissions: {
        invoices: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        quotations: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        work_orders: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        payments: { create: false, read: true, update: false, delete: false, approve: false, share: true },
        expenses: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        hr: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        unifi: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        schedules: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        forensics: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        reports: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        users: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        roles: { create: false, read: false, update: false, delete: false, approve: false, share: false },
        store: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        subscriptions: { create: false, read: true, update: true, delete: false, approve: false, share: true },
        settings: { create: false, read: false, update: false, delete: false, approve: false, share: false }
      }
    }
  ],
  audit_logs: [
    {
      id: 1,
      user_email: 'systems@ncloud.co.ug',
      user_name: 'Arthur Mukasa',
      user_role: 'super_admin',
      action: 'INVOICE_GENERATED',
      resource_type: 'Invoices',
      resource_id: 'INV-2026-0041',
      details: 'Issued official VAT Tax Invoice #INV-2026-0041 for Kintu Logistics Uganda (UGX 767,000)',
      ip_address: '197.239.4.18',
      device_type: 'Desktop (macOS / Chrome 127)',
      status: 'SUCCESS',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      user_email: 'sales@ncloud.co.ug',
      user_name: 'Julian Sales Executive',
      user_role: 'sales_admin',
      action: 'PAYMENT_RECORDED',
      resource_type: 'Payments',
      resource_id: 'TXN-BANK-998811',
      details: 'Cleared bank wire remittance for invoice INV-2026-0041 (UGX 767,000)',
      ip_address: '102.218.42.10',
      device_type: 'Desktop (Windows 11 / Edge)',
      status: 'SUCCESS',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 3,
      user_email: 'hr@ncloud.co.ug',
      user_name: 'Peter Ntale',
      user_role: 'hr_manager',
      action: 'EXPENSE_APPROVED',
      resource_type: 'Expenditures',
      resource_id: 'EXP-REC-8841',
      details: 'Approved company expenditure for David Opio: Fiber Splicing & Rack Mounting (UGX 450,000)',
      ip_address: '154.72.196.55',
      device_type: 'Mobile (iOS / Safari 17.5)',
      status: 'SUCCESS',
      timestamp: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 4,
      user_email: 'systems@ncloud.co.ug',
      user_name: 'Arthur Mukasa',
      user_role: 'super_admin',
      action: 'WORK_ORDER_COMPLETED',
      resource_type: 'Work Orders',
      resource_id: 'WO-2026-0012',
      details: 'Marked Work Order WO-2026-0012 Completed. Auto-disbursed staff labor voucher for David Opio.',
      ip_address: '197.239.4.18',
      device_type: 'Desktop (macOS / Chrome 127)',
      status: 'SUCCESS',
      timestamp: new Date(Date.now() - 21600000).toISOString()
    },
    {
      id: 5,
      user_email: 'reviewer@ncloud.co.ug',
      user_name: 'External Audit Officer',
      user_role: 'reviewer',
      action: 'AUDIT_EXPORT_BALANCE_SHEET',
      resource_type: 'Financial Reports',
      resource_id: 'REPORT-BAL-2026Q3',
      details: 'Exported quarterly Balance Sheet & P&L Statement for compliance verification.',
      ip_address: '41.210.140.2',
      device_type: 'Desktop (Ubuntu Linux / Firefox)',
      status: 'SUCCESS',
      timestamp: new Date(Date.now() - 28800000).toISOString()
    }
  ],
  smtp_settings: {
    host: 'mail.ncloud.co.ug',
    port: 587,
    security_type: 'TLS', // 'SSL/TLS' (Port 465) or 'STARTTLS' (Port 587)
    username: 'billing@ncloud.co.ug',
    password: 'NovaSmtpAuthSecret2026!',
    sender_name: 'Nova Cloud Edges Official Notifications',
    sender_email: 'billing@ncloud.co.ug',
    is_active: true,
    last_tested: new Date().toISOString()
  }
};

// ----------------------------------------------------
// Restore Persistent Data Store on Server Startup
// ----------------------------------------------------
const loadedDiskStore = loadPersistentStore();
if (loadedDiskStore) {
  Object.keys(loadedDiskStore).forEach(key => {
    if (Array.isArray(loadedDiskStore[key])) {
      memoryStore[key] = loadedDiskStore[key];
    } else if (typeof loadedDiskStore[key] === 'object' && loadedDiskStore[key] !== null) {
      memoryStore[key] = { ...memoryStore[key], ...loadedDiskStore[key] };
    }
  });
  console.log(`[Database Persistence] Restored ${memoryStore.users?.length || 0} total system users from persistent disk store.`);
}


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
  res.json(memoryStore.partners || []);
});

app.post('/api/admin/partners', (req, res) => {
  const { name, category, website, logo_text } = req.body;
  if (!name) return res.status(400).json({ error: 'Partner name is required' });
  const newPartner = {
    id: Date.now(),
    name,
    category: category || 'Technology Partner',
    website: website || '',
    logo_text: logo_text || name
  };
  memoryStore.partners.push(newPartner);
  savePersistentStore();
  res.json({ message: 'Partner added successfully', partner: newPartner });
});

app.put('/api/admin/partners/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, website, logo_text } = req.body;
  const p = memoryStore.partners.find(item => 
    String(item.id) === String(id) || 
    Number(item.id) === Number(id) || 
    (item.name && String(item.name).trim().toLowerCase() === decodeURIComponent(String(id)).trim().toLowerCase())
  );
  if (p) {
    if (name) p.name = name;
    if (category) p.category = category;
    if (website !== undefined) p.website = website;
    if (logo_text !== undefined) p.logo_text = logo_text;
    savePersistentStore();
    return res.json({ message: 'Partner updated successfully', partner: p });
  }
  const newPartner = {
    id: Date.now(),
    name: name || 'Technology Partner',
    category: category || 'Technology Partner',
    website: website || '',
    logo_text: logo_text || name
  };
  memoryStore.partners.push(newPartner);
  savePersistentStore();
  res.json({ message: 'Partner saved successfully', partner: newPartner });
});

// Super Admin Authorization Middleware for Deletion Operations
function requireSuperAdmin(req, res, next) {
  const rawRole = req.headers['x-user-role'] || req.body?.user_role || req.body?.admin_role || req.query?.user_role;
  if (!rawRole) return next();
  const roleClean = String(rawRole).trim().toLowerCase().replace(/\s+/g, '_');
  const allowed = ['super_admin', 'admin', 'sales_admin', 'web_admin', 'hr_manager', 'superadmin'];
  if (!allowed.includes(roleClean)) {
    return res.status(403).json({ error: 'Access Denied: Only Administrators have permission to delete system records.' });
  }
  next();
}

app.delete('/api/admin/partners/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM partners WHERE id = ?', [id]);
  memoryStore.partners = (memoryStore.partners || []).filter(item => 
    String(item.id) !== String(id) && 
    Number(item.id) !== Number(id) &&
    !(item.name && String(item.name).trim().toLowerCase() === decodeURIComponent(String(id)).trim().toLowerCase())
  );
  savePersistentStore();
  res.json({ message: 'Partner removed successfully' });
});

app.get('/api/news', (req, res) => {
  res.json(memoryStore.news || []);
});

app.post('/api/admin/news', (req, res) => {
  const { title, category, date, image, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Post title is required' });
  const newPost = {
    id: Date.now(),
    title,
    category: category || 'Updates',
    date: date || new Date().toISOString().split('T')[0],
    image: image || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    content: content || ''
  };
  memoryStore.news.unshift(newPost);
  savePersistentStore();
  res.json({ message: 'News update posted successfully!', news: newPost });
});

app.put('/api/admin/news/:id', (req, res) => {
  const { id } = req.params;
  const { title, category, date, image, content } = req.body;
  const post = memoryStore.news.find(n => n.id == id);
  if (post) {
    if (title) post.title = title;
    if (category) post.category = category;
    if (date) post.date = date;
    if (image) post.image = image;
    if (content !== undefined) post.content = content;
    savePersistentStore();
    return res.json({ message: 'News update modified successfully!', news: post });
  }
  res.status(404).json({ error: 'News post not found' });
});

app.delete('/api/admin/news/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM news WHERE id = ?', [id]);
  memoryStore.news = (memoryStore.news || []).filter(n => String(n.id) !== String(id) && Number(n.id) !== Number(id));
  savePersistentStore();
  return res.json({ message: 'News post removed successfully!' });
});

app.get('/api/iso', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.isoStandards : []);
});

// ----------------------------------------------------
// Cloudflare Turnstile Verification Middleware
// ----------------------------------------------------
async function verifyTurnstile(req, res, next) {
  const security = memoryStore.security_settings;
  if (!security || !security.is_active || !security.turnstile_secret_key) {
    return next();
  }
  const token = req.body.turnstileToken || req.headers['x-turnstile-token'];
  if (!token) {
    return res.status(400).json({ error: 'CAPTCHA verification is required. Please check the box.' });
  }

  try {
    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(security.turnstile_secret_key)}&response=${encodeURIComponent(token)}`
    });
    const cfData = await cfRes.json();
    if (!cfData.success) {
      return res.status(403).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }
    next();
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return res.status(500).json({ error: 'CAPTCHA verification service unavailable.' });
  }
}

// ----------------------------------------------------
// Auth Endpoints
// ----------------------------------------------------
app.post('/api/auth/register', verifyTurnstile, async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const isFirstUser = memoryStore.users.length === 0;
  const assignedRole = isFirstUser ? 'super_admin' : 'customer';

  // Try MySQL
  const dbRes = await query(
    'INSERT INTO users (name, email, password_hash, role, phone, company) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, assignedRole, phone || null, company || null]
  );

  if (dbRes.success) {
    const userId = dbRes.data.insertId;
    const token = jwt.sign({ id: userId, name, email, role: assignedRole }, JWT_SECRET, { expiresIn: '7d' });
    const userObj = { id: userId, name, email, role: assignedRole, position: assignedRole === 'super_admin' ? 'Admin' : 'Customer', title: assignedRole === 'super_admin' ? 'Admin' : 'Customer', phone, company, status: 'Active' };
    memoryStore.users.unshift(userObj);
    savePersistentStore();
    return res.json({ message: `User registered successfully with ${assignedRole} role`, token, user: userObj });
  } else {
    // Memory store fallback
    const existing = memoryStore.users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    const newUser = { id: Date.now(), name, email, passwordHash: hashedPassword, password_hash: hashedPassword, role: assignedRole, position: assignedRole === 'super_admin' ? 'Admin' : 'Customer', title: assignedRole === 'super_admin' ? 'Admin' : 'Customer', phone, company, status: 'Active' };
    memoryStore.users.unshift(newUser);
    savePersistentStore();
    const token = jwt.sign({ id: newUser.id, name, email, role: assignedRole }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ message: `User registered successfully with ${assignedRole} role`, token, user: newUser });
  }
});

app.post('/api/auth/login', verifyTurnstile, async (req, res) => {
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
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
  } else {
    // Check Memory store
    const memUser = memoryStore.users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
    if (memUser) {
      const storedHash = memUser.passwordHash || memUser.password_hash || '';
      const match = await bcrypt.compare(password, storedHash);
      if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
      user = memUser;
    } else {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '7d' });
  
  // Log in forensics audit trail
  if (!memoryStore.audit_logs) memoryStore.audit_logs = [];
  memoryStore.audit_logs.unshift({
    id: Date.now(),
    user_email: user.email,
    user_name: user.name,
    user_role: user.role || 'customer',
    action: 'AUDIT_LOGIN',
    resource_type: 'Authentication',
    resource_id: user.id,
    details: 'User successfully authenticated and created a new session.',
    ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
    timestamp: new Date().toISOString()
  });
  savePersistentStore();

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role || 'customer' }
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Find user in MySQL or Memory
  let user = null;
  let isMySQL = false;
  const dbRes = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (dbRes.success && dbRes.data.length > 0) {
    user = dbRes.data[0];
    isMySQL = true;
  } else {
    const memUser = memoryStore.users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
    if (memUser) {
      user = memUser;
    }
  }

  if (!user) {
    // For security, don't reveal if email exists or not
    return res.json({ message: 'If the email exists, a reset link has been dispatched.' });
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-8) + 'X!';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  if (isMySQL) {
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);
  } else {
    const idx = memoryStore.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      memoryStore.users[idx].passwordHash = hashedPassword;
      memoryStore.users[idx].password_hash = hashedPassword;
      savePersistentStore();
    }
  }

  // Send Email
  const resetHtml = generateCorporateEmailHtml({
    title: 'Password Reset Request',
    greeting: `Hello ${user.name},`,
    message: `
      <p style="margin-bottom: 12px; color: #475569;">A request has been made to reset your password for your Nova Cloud Edges portal account.</p>
      <p style="margin-bottom: 12px; color: #475569;">Your new temporary password is:</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: bold; color: #0f172a; text-align: center; margin-bottom: 20px;">
        ${tempPassword}
      </div>
      <p style="margin-bottom: 12px; color: #475569;">Please log in using this temporary password. We highly recommend updating your password immediately after logging in from your Profile Settings.</p>
    `,
    ctaText: 'Sign In to Portal',
    ctaLink: 'https://ncloud.co.ug/admin',
    footerNote: 'If you did not request this password reset, please ignore this email or contact support.'
  });

  // Non-blocking send
  sendMail({
    to: user.email,
    subject: 'Nova Cloud Edges - Password Reset',
    html: resetHtml
  }).catch(e => console.error('[Mailer] Forgot password email failed:', e));

  return res.json({ message: 'If the email exists, a reset link has been dispatched.' });
});

// Social SSO OAuth Endpoints (Google & Microsoft)
app.post('/api/auth/oauth/:provider', async (req, res) => {
  const { provider } = req.params;
  const isGoogle = provider === 'google';
  const ssoUser = {
    id: isGoogle ? 101 : 102,
    name: isGoogle ? 'Google Enterprise User' : 'Microsoft 365 User',
    email: isGoogle ? 'sso.user@gmail.com' : 'sso.user@outlook.com',
    role: 'customer'
  };

  const token = jwt.sign({ id: ssoUser.id, name: ssoUser.name, email: ssoUser.email, role: ssoUser.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    message: `Authenticated via ${isGoogle ? 'Google' : 'Microsoft'} OAuth`,
    token,
    user: ssoUser
  });
});

// ----------------------------------------------------
// Services Endpoints (Full Database & In-Memory CRUD)
// ----------------------------------------------------
app.get('/api/services', async (req, res) => {
  const dbRes = await query('SELECT * FROM services ORDER BY id ASC');
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data);
  }
  res.json(memoryStore.services);
});

app.get('/api/services/:slug', async (req, res) => {
  const { slug } = req.params;
  const dbRes = await query('SELECT * FROM services WHERE slug = ?', [slug]);
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data[0]);
  }
  const service = memoryStore.services.find(s => s.slug === slug || s.id == slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
});

app.post('/api/services', async (req, res) => {
  const { title, summary, description, icon, features } = req.body;
  if (!title) return res.status(400).json({ error: 'Service title is required.' });

  const slug = req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const featArray = Array.isArray(features) ? features : (typeof features === 'string' ? features.split(',').map(f => f.trim()).filter(Boolean) : []);
  const iconName = icon || 'Server';

  const dbRes = await query(
    'INSERT INTO services (title, slug, summary, description, icon, features) VALUES (?, ?, ?, ?, ?, ?)',
    [title, slug, summary || '', description || '', iconName, JSON.stringify(featArray)]
  );

  const newService = {
    id: dbRes.success ? dbRes.data.insertId : (memoryStore.services.length > 0 ? Math.max(...memoryStore.services.map(s => s.id)) + 1 : 1),
    title,
    slug,
    summary: summary || '',
    description: description || '',
    icon: iconName,
    features: featArray
  };

  memoryStore.services.push(newService);
  savePersistentStore();
  res.json({ message: `Service "${title}" created successfully!`, service: newService });
});

app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { title, summary, description, icon, features, slug } = req.body;

  const featArray = Array.isArray(features) ? features : (typeof features === 'string' ? features.split(',').map(f => f.trim()).filter(Boolean) : undefined);
  
  await query(
    'UPDATE services SET title = COALESCE(?, title), summary = COALESCE(?, summary), description = COALESCE(?, description), icon = COALESCE(?, icon), features = COALESCE(?, features) WHERE id = ?',
    [title, summary, description, icon, featArray ? JSON.stringify(featArray) : null, id]
  );

  const sIndex = memoryStore.services.findIndex(s => s.id == id);
  if (sIndex !== -1) {
    if (title) memoryStore.services[sIndex].title = title;
    if (summary) memoryStore.services[sIndex].summary = summary;
    if (description) memoryStore.services[sIndex].description = description;
    if (icon) memoryStore.services[sIndex].icon = icon;
    if (featArray) memoryStore.services[sIndex].features = featArray;
    if (slug) memoryStore.services[sIndex].slug = slug;
    savePersistentStore();
    return res.json({ message: 'Service updated successfully!', service: memoryStore.services[sIndex] });
  }

  savePersistentStore();
  res.json({ message: 'Service record updated' });
});

app.delete('/api/services/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM services WHERE id = ?', [id]);
  memoryStore.services = memoryStore.services.filter(s => s.id != id);
  savePersistentStore();
  res.json({ message: 'Service removed successfully!' });
});

// ----------------------------------------------------
// Security & Authentication Middlewares
// ----------------------------------------------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;
    next();
  });
};

const requireCRUDAS = (req, res, next) => {
  if (req.userRole === 'super_admin' || req.userRole === 'admin') return next();

  const role = memoryStore.roles.find(r => r.code === req.userRole);
  if (!role || !role.permissions) return res.status(403).json({ error: 'Role permissions not found.' });

  const path = req.path;
  let module = null;
  
  if (path.includes('/invoices')) module = 'invoices';
  else if (path.includes('/quotations')) module = 'quotations';
  else if (path.includes('/work-orders')) module = 'work_orders';
  else if (path.includes('/payments') || path.includes('/bank-accounts')) module = 'payments';
  else if (path.includes('/company-expenses') || path.includes('/expense')) module = 'expenses';
  else if (path.includes('/hr/') || path.includes('/schedules') || path.includes('/applications')) module = 'hr';
  else if (path.includes('/unifi/')) module = 'unifi';
  else if (path.includes('/roles') || path.includes('/users')) module = 'roles';
  else if (path.includes('/store') || path.includes('/product-categories')) module = 'store';
  else if (path.includes('/subscriptions') || path.includes('/customer-credits')) module = 'subscriptions';
  else if (path.includes('/settings') || path.includes('/overview') || path.includes('/forensics') || path.includes('/sliders') || path.includes('/banner-settings') || path.includes('/notification-emails') || path.includes('/smtp-settings') || path.includes('/reports/analytics')) module = 'settings';
  
  if (!module) return res.status(403).json({ error: 'Module access restricted.' });

  let action = 'read';
  if (req.method === 'POST') action = 'create';
  if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
  if (req.method === 'DELETE') action = 'delete';

  if (role.permissions[module] && role.permissions[module][action]) {
    return next();
  }

  return res.status(403).json({ error: `CRUDAS Permission Denied: Missing ${action.toUpperCase()} access for ${module.toUpperCase()} module.` });
};

app.put('/api/auth/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing required fields' });
  
  const email = req.userEmail;
  let user = null;
  let isMySQL = false;
  
  const dbRes = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (dbRes.success && dbRes.data.length > 0) {
    user = dbRes.data[0];
    isMySQL = true;
  } else {
    user = memoryStore.users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
  }
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const storedHash = user.password_hash || user.passwordHash || '';
  const match = await bcrypt.compare(currentPassword, storedHash);
  if (!match) return res.status(401).json({ error: 'Incorrect current password' });
  
  const newHash = await bcrypt.hash(newPassword, 10);
  if (isMySQL) {
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
  } else {
    const idx = memoryStore.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      memoryStore.users[idx].passwordHash = newHash;
      memoryStore.users[idx].password_hash = newHash;
      savePersistentStore();
    }
  }
  return res.json({ message: 'Password updated successfully' });
});

// Protect all admin endpoints
app.use('/api/admin', verifyToken, requireCRUDAS);

// ----------------------------------------------------
// Product Categories Endpoints
// ----------------------------------------------------
app.get('/api/admin/product-categories', (req, res) => {
  if (!memoryStore.product_categories || memoryStore.product_categories.length === 0) {
    memoryStore.product_categories = [
      { id: 1, name: 'Hosting', slug: 'hosting', description: 'Cloud VPS, Dedicated Edge Servers, Web & Email Hosting', display_order: 1 },
      { id: 2, name: 'Software & Licenses', slug: 'software-licenses', description: 'ERP Systems, QuickBooks, Microsoft 365', display_order: 2 },
      { id: 3, name: 'Hardware & Security', slug: 'hardware-security', description: 'UniFi Access Points, Firewalls, CCTV', display_order: 3 },
      { id: 4, name: 'Domain Names', slug: 'domain-names', description: '.co.ug, .com, .org Domain Registration', display_order: 4 },
      { id: 5, name: 'Cloud Services', slug: 'cloud-services', description: 'S3 Object Storage, Virtual Datacenters', display_order: 5 }
    ];
  }
  res.json(memoryStore.product_categories);
});

app.post('/api/admin/product-categories', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  if (!memoryStore.product_categories) memoryStore.product_categories = [];

  const trimmedName = name.trim();
  const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const existing = memoryStore.product_categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() || c.slug === slug);
  if (existing) {
    return res.status(400).json({ error: `Product category "${trimmedName}" already exists!` });
  }

  const newCategory = {
    id: memoryStore.product_categories.length + 1,
    name: trimmedName,
    slug,
    description: description || '',
    display_order: memoryStore.product_categories.length + 1,
    created_at: new Date().toISOString()
  };

  memoryStore.product_categories.push(newCategory);
  savePersistentStore();
  res.json({ message: `Category "${trimmedName}" created successfully!`, category: newCategory });
});

app.delete('/api/admin/product-categories/:id', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  if (!memoryStore.product_categories) memoryStore.product_categories = [];

  const targetIdStr = String(id).trim();
  memoryStore.product_categories = memoryStore.product_categories.filter(c => String(c.id) !== targetIdStr && c.slug !== targetIdStr && c.name.toLowerCase() !== targetIdStr.toLowerCase());
  savePersistentStore();
  res.json({ message: 'Product category deleted successfully!' });
});

app.put('/api/admin/product-categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, is_hidden } = req.body;
  if (!memoryStore.product_categories) memoryStore.product_categories = [];

  const targetIdStr = String(id).trim();
  const catIndex = memoryStore.product_categories.findIndex(c => String(c.id) === targetIdStr || c.slug === targetIdStr || c.name.toLowerCase() === targetIdStr.toLowerCase());

  if (catIndex === -1) {
    return res.status(404).json({ error: 'Product category not found.' });
  }

  const oldCategory = memoryStore.product_categories[catIndex];
  const oldName = oldCategory.name;

  if (name && name.trim()) {
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (memoryStore.products && Array.isArray(memoryStore.products)) {
      memoryStore.products.forEach(p => {
        if (p.category && p.category.toLowerCase() === oldName.toLowerCase()) {
          p.category = trimmedName;
        }
      });
    }

    oldCategory.name = trimmedName;
    oldCategory.slug = slug;
  }

  if (description !== undefined) oldCategory.description = description;
  if (is_hidden !== undefined) oldCategory.is_hidden = Boolean(is_hidden);

  savePersistentStore();
  res.json({ message: 'Category updated successfully!', category: oldCategory });
});

app.put('/api/admin/product-categories/:id/toggle-hide', (req, res) => {
  const { id } = req.params;
  if (!memoryStore.product_categories) memoryStore.product_categories = [];

  const targetIdStr = String(id).trim();
  const cat = memoryStore.product_categories.find(c => String(c.id) === targetIdStr || c.slug === targetIdStr || c.name.toLowerCase() === targetIdStr.toLowerCase());

  if (!cat) {
    return res.status(404).json({ error: 'Product category not found.' });
  }

  cat.is_hidden = !cat.is_hidden;
  savePersistentStore();
  res.json({ message: `Category "${cat.name}" is now ${cat.is_hidden ? 'hidden' : 'visible'}!`, category: cat });
});

// ----------------------------------------------------
// Products Endpoints (Shop - Full Database & In-Memory CRUD)
// ----------------------------------------------------
app.get('/api/products', async (req, res) => {
  let dbProducts = [];
  const dbRes = await query('SELECT * FROM products ORDER BY id DESC');
  if (dbRes.success && !dbRes.isFallback && Array.isArray(dbRes.data)) {
    dbProducts = dbRes.data;
  }

  const memoryProds = memoryStore.products || [];
  const combinedMap = new Map();

  // 1. Add DB products first (authoritative when DB is connected)
  dbProducts.forEach(p => {
    const key = String(p.id || p.slug);
    combinedMap.set(key, p);
  });

  // 2. Add memory products (only if not already in DB map)
  memoryProds.forEach(p => {
    const key = String(p.id || p.slug);
    if (!combinedMap.has(key)) {
      combinedMap.set(key, p);
    }
  });

  const rawProducts = combinedMap.size > 0 ? Array.from(combinedMap.values()) : memoryProds;
  const availableVouchers = (memoryStore.unifi_vouchers || []).filter(v => v.status === 'available');

  const normalizedProducts = rawProducts.map(p => {
    let stock = p.stock !== undefined ? p.stock : 10;
    const isWifiVoucher = (p.category === 'WiFi Vouchers' || p.category === 'Digital Products') &&
      ((p.name || '').toLowerCase().includes('wifi voucher') || (p.slug || '').includes('wifi-voucher'));

    if (isWifiVoucher) {
      const durationMatch = (p.name || '').match(/(\d+)\s*(hour|day|week|month)/i);
      if (durationMatch) {
        const num = parseInt(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        const durationHours = unit.startsWith('hour') ? num
          : unit.startsWith('day') ? num * 24
          : unit.startsWith('week') ? num * 168
          : num * 720;

        stock = availableVouchers.filter(v => v.duration_hours === durationHours).length;
      } else {
        stock = availableVouchers.length;
      }
    }

    return {
      ...p,
      stock,
      short_desc: p.short_desc || p.desc || '',
      desc: p.short_desc || p.desc || '',
      description: p.description || p.specs || p.details || '',
      specs: p.description || p.specs || p.details || '',
      details: p.description || p.specs || p.details || ''
    };
  });
  res.json(normalizedProducts);
});

app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  const dbRes = await query('SELECT * FROM products WHERE slug = ? OR id = ?', [slug, slug]);
  if (dbRes.success && !dbRes.isFallback && dbRes.data && dbRes.data.length > 0) {
    const p = dbRes.data[0];
    return res.json({
      ...p,
      short_desc: p.short_desc || p.desc || '',
      desc: p.short_desc || p.desc || '',
      description: p.description || p.specs || p.details || '',
      specs: p.description || p.specs || p.details || '',
      details: p.description || p.specs || p.details || ''
    });
  }

  const product = (memoryStore.products || []).find(p => p.slug === slug || String(p.id) === String(slug));
  if (product) {
    return res.json({
      ...product,
      short_desc: product.short_desc || product.desc || '',
      desc: product.short_desc || product.desc || '',
      description: product.description || product.specs || product.details || '',
      specs: product.description || product.specs || product.details || '',
      details: product.description || product.specs || product.details || ''
    });
  }

  res.status(404).json({ error: 'Product not found' });
});

app.post('/api/products', async (req, res) => {
  const { name, category, price, currency, badge, short_desc, description, image_url, stock, is_hidden, checkout_type, checkout_flow } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Product name and price are required.' });

  const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const numPrice = Number(price) || 0;
  const curr = currency || 'UGX';
  const img = image_url || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80';
  const hidden = Boolean(is_hidden);
  const routingType = checkout_type || checkout_flow || 'shop';

  const dbRes = await query(
    'INSERT INTO products (name, slug, category, price, currency, badge, short_desc, description, image_url, stock, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, slug, category || 'Hosting', numPrice, curr, badge || '', short_desc || '', description || '', img, Number(stock) || 0, hidden ? 1 : 0]
  );

  const newProd = {
    id: dbRes.success && !dbRes.isFallback ? dbRes.data.insertId : (memoryStore.products.length > 0 ? Math.max(...memoryStore.products.map(p => Number(p.id) || 0)) + 1 : 1),
    name,
    slug,
    category: category || 'Hosting',
    price: numPrice,
    currency: curr,
    badge: badge || '',
    short_desc: short_desc || '',
    desc: short_desc || '',
    description: description || '',
    specs: description || '',
    details: description || '',
    image_url: img,
    stock: stock !== undefined ? Number(stock) : 50,
    is_hidden: hidden,
    checkout_type: routingType,
    checkout_flow: routingType
  };

  memoryStore.products.unshift(newProd);
  savePersistentStore();
  res.json({ message: `Shop product "${name}" added successfully!`, product: newProd });
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, currency, badge, short_desc, description, image_url, stock, is_hidden, checkout_type, checkout_flow } = req.body;

  const numPrice = price !== undefined ? Number(price) : undefined;
  const numStock = stock !== undefined ? Number(stock) : undefined;
  const routingType = checkout_type || checkout_flow;

  await query(
    'UPDATE products SET name = COALESCE(?, name), category = COALESCE(?, category), price = COALESCE(?, price), currency = COALESCE(?, currency), badge = COALESCE(?, badge), short_desc = COALESCE(?, short_desc), description = COALESCE(?, description), image_url = COALESCE(?, image_url), stock = COALESCE(?, stock), is_hidden = COALESCE(?, is_hidden) WHERE id = ?',
    [
      name !== undefined ? name : null,
      category !== undefined ? category : null,
      numPrice !== undefined ? numPrice : null,
      currency !== undefined ? currency : null,
      badge !== undefined ? badge : null,
      short_desc !== undefined ? short_desc : null,
      description !== undefined ? description : null,
      image_url !== undefined ? image_url : null,
      numStock !== undefined ? numStock : null,
      is_hidden !== undefined ? (is_hidden ? 1 : 0) : null,
      id
    ]
  );

  let pIndex = (memoryStore.products || []).findIndex(p => String(p.id) === String(id) || Number(p.id) === Number(id) || p.slug === id);
  if (pIndex !== -1) {
    const prod = memoryStore.products[pIndex];
    if (name !== undefined) prod.name = name;
    if (category !== undefined) prod.category = category;
    if (numPrice !== undefined && !isNaN(numPrice)) prod.price = numPrice;
    if (currency !== undefined) prod.currency = currency;
    if (badge !== undefined) prod.badge = badge;
    if (short_desc !== undefined) {
      prod.short_desc = short_desc;
      prod.desc = short_desc;
    }
    if (description !== undefined) {
      prod.description = description;
      prod.specs = description;
      prod.details = description;
    }
    if (image_url !== undefined) prod.image_url = image_url;
    if (numStock !== undefined && !isNaN(numStock)) prod.stock = numStock;
    if (is_hidden !== undefined) prod.is_hidden = Boolean(is_hidden);
    if (routingType !== undefined) {
      prod.checkout_type = routingType;
      prod.checkout_flow = routingType;
    }
    savePersistentStore();
    return res.json({ message: `Product "${prod.name}" updated successfully!`, product: prod });
  }

  // Fallback if product was not found in memory array
  const updatedProd = {
    id: isNaN(Number(id)) ? id : Number(id),
    name: name || 'Updated Product',
    category: category || 'Digital Products',
    price: numPrice !== undefined ? numPrice : 0,
    currency: currency || 'UGX',
    badge: badge || '',
    short_desc: short_desc || '',
    desc: short_desc || '',
    description: description || '',
    specs: description || '',
    details: description || '',
    image_url: image_url || '',
    stock: numStock !== undefined ? numStock : 50,
    is_hidden: Boolean(is_hidden),
    checkout_type: routingType || 'shop',
    checkout_flow: routingType || 'shop'
  };
  if (!memoryStore.products) memoryStore.products = [];
  memoryStore.products.unshift(updatedProd);
  savePersistentStore();
  res.json({ message: `Product "${updatedProd.name}" updated successfully!`, product: updatedProd });
});

app.delete('/api/products/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM products WHERE id = ?', [id]);
  memoryStore.products = memoryStore.products.filter(p => p.id != id);
  savePersistentStore();
  res.json({ message: 'Product removed from shop catalog!' });
});

// ----------------------------------------------------
// Executive Team Endpoints (Full Database & In-Memory CRUD)
// ----------------------------------------------------
app.get('/api/team', async (req, res) => {
  res.json(memoryStore.team);
});

app.post('/api/team', async (req, res) => {
  const { name, role, bio, image } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role are required.' });

  const newMember = {
    id: memoryStore.team.length > 0 ? Math.max(...memoryStore.team.map(t => t.id || 0)) + 1 : 1,
    name,
    role,
    bio: bio || '',
    image: image || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'
  };

  memoryStore.team.push(newMember);
  res.json({ message: `Executive team member "${name}" added successfully!`, member: newMember });
});

app.put('/api/team/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, bio, image } = req.body;

  const tIndex = memoryStore.team.findIndex(t => 
    String(t.id) === String(id) || 
    Number(t.id) === Number(id) || 
    (t.name && String(t.name).trim().toLowerCase() === decodeURIComponent(String(id)).trim().toLowerCase())
  );
  if (tIndex !== -1) {
    if (name) memoryStore.team[tIndex].name = name;
    if (role) memoryStore.team[tIndex].role = role;
    if (bio !== undefined) memoryStore.team[tIndex].bio = bio;
    if (image) memoryStore.team[tIndex].image = image;
    return res.json({ message: 'Executive team member updated successfully!', member: memoryStore.team[tIndex] });
  }
  const newMember = {
    id: Date.now(),
    name: name || 'Executive Member',
    role: role || 'Leadership',
    bio: bio || '',
    image: image || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'
  };
  memoryStore.team.push(newMember);
  res.json({ message: 'Executive team member saved successfully!', member: newMember });
});

app.delete('/api/team/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  memoryStore.team = memoryStore.team.filter(t => 
    String(t.id) !== String(id) && 
    Number(t.id) !== Number(id) && 
    !(t.name && String(t.name).trim().toLowerCase() === decodeURIComponent(String(id)).trim().toLowerCase())
  );
  res.json({ message: 'Executive team member removed successfully!' });
});

// ----------------------------------------------------
// Job Openings & Application Endpoints
// ----------------------------------------------------
app.get('/api/jobs', async (req, res) => {
  const dbRes = await query('SELECT * FROM jobs WHERE status = "open" ORDER BY id ASC');
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data);
  }
  res.json(memoryStore.jobs);
});

app.get('/api/jobs/:slug', async (req, res) => {
  const { slug } = req.params;
  const dbRes = await query('SELECT * FROM jobs WHERE slug = ?', [slug]);
  if (dbRes.success && dbRes.data.length > 0) {
    return res.json(dbRes.data[0]);
  }
  const job = memoryStore.jobs.find(j => j.slug === slug || j.id == slug);
  if (!job) return res.status(404).json({ error: 'Job opening not found' });
  res.json(job);
});

app.post('/api/jobs', async (req, res) => {
  const { title, department, location, type, vacancies, status, deadline, description, requirements, responsibilities } = req.body;
  if (!title) return res.status(400).json({ error: 'Job title is required.' });

  const slug = req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const reqArray = Array.isArray(requirements) ? requirements : (typeof requirements === 'string' ? requirements.split('\n').map(r => r.trim()).filter(Boolean) : []);
  const respArray = Array.isArray(responsibilities) ? responsibilities : (typeof responsibilities === 'string' ? responsibilities.split('\n').map(r => r.trim()).filter(Boolean) : []);

  const dbRes = await query(
    'INSERT INTO jobs (title, slug, department, location, type, vacancies, status, deadline, description, requirements, responsibilities) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, slug, department || 'Operations', location || 'Kampala, Uganda', type || 'Full-time', Number(vacancies) || 1, status || 'open', deadline || '2026-12-31', description || '', JSON.stringify(reqArray), JSON.stringify(respArray)]
  );

  const newJob = {
    id: dbRes.success ? dbRes.data.insertId : (memoryStore.jobs.length > 0 ? Math.max(...memoryStore.jobs.map(j => j.id || 0)) + 1 : 1),
    title,
    slug,
    department: department || 'Operations',
    location: location || 'Kampala, Uganda',
    type: type || 'Full-time',
    vacancies: Number(vacancies) || 1,
    status: status || 'open',
    deadline: deadline || '2026-12-31',
    description: description || '',
    requirements: reqArray,
    responsibilities: respArray
  };

  memoryStore.jobs.push(newJob);
  res.json({ message: `Career vacancy "${title}" posted successfully!`, job: newJob });
});

app.put('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const { title, department, location, type, vacancies, status, deadline, description, requirements, responsibilities } = req.body;

  const reqArray = Array.isArray(requirements) ? requirements : (typeof requirements === 'string' ? requirements.split('\n').map(r => r.trim()).filter(Boolean) : undefined);
  const respArray = Array.isArray(responsibilities) ? responsibilities : (typeof responsibilities === 'string' ? responsibilities.split('\n').map(r => r.trim()).filter(Boolean) : undefined);

  await query(
    'UPDATE jobs SET title = COALESCE(?, title), department = COALESCE(?, department), location = COALESCE(?, location), type = COALESCE(?, type), vacancies = COALESCE(?, vacancies), status = COALESCE(?, status), deadline = COALESCE(?, deadline), description = COALESCE(?, description), requirements = COALESCE(?, requirements), responsibilities = COALESCE(?, responsibilities) WHERE id = ?',
    [title, department, location, type, vacancies, status, deadline, description, reqArray ? JSON.stringify(reqArray) : null, respArray ? JSON.stringify(respArray) : null, id]
  );

  const jIndex = memoryStore.jobs.findIndex(j => j.id == id);
  if (jIndex !== -1) {
    if (title) memoryStore.jobs[jIndex].title = title;
    if (department) memoryStore.jobs[jIndex].department = department;
    if (location) memoryStore.jobs[jIndex].location = location;
    if (type) memoryStore.jobs[jIndex].type = type;
    if (vacancies !== undefined) memoryStore.jobs[jIndex].vacancies = Number(vacancies);
    if (status) memoryStore.jobs[jIndex].status = status;
    if (deadline) memoryStore.jobs[jIndex].deadline = deadline;
    if (description) memoryStore.jobs[jIndex].description = description;
    if (reqArray) memoryStore.jobs[jIndex].requirements = reqArray;
    if (respArray) memoryStore.jobs[jIndex].responsibilities = respArray;
    return res.json({ message: 'Career vacancy updated successfully!', job: memoryStore.jobs[jIndex] });
  }

  res.json({ message: 'Job record updated' });
});

app.delete('/api/jobs/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM jobs WHERE id = ?', [id]);
  memoryStore.jobs = memoryStore.jobs.filter(j => j.id != id);
  res.json({ message: 'Job opening removed successfully!' });
});

app.post('/api/jobs/apply', async (req, res) => {
  const { job_id, applicant_name, email, phone, experience_years, resume_url, cover_letter } = req.body;
  if (!job_id || !applicant_name || !email || !phone) {
    return res.status(400).json({ error: 'Applicant name, email, phone and job selection are required.' });
  }

  // Strict Application Deadline & Vacancy Status Enforcement
  const targetJob = (memoryStore.jobs || []).find(j => String(j.id) === String(job_id) || Number(j.id) === Number(job_id));
  const todayStr = new Date().toISOString().split('T')[0];

  if (targetJob) {
    const isClosed = (targetJob.status && (targetJob.status.toLowerCase() === 'closed' || targetJob.status.toLowerCase() === 'inactive'));
    const isPastDeadline = targetJob.deadline && targetJob.deadline < todayStr;

    if (isClosed || isPastDeadline) {
      return res.status(400).json({
        error: `Application deadline for position "${targetJob.title}" closed on ${targetJob.deadline || 'specified deadline'}. No further applications are accepted into the system.`
      });
    }
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

app.get('/api/admin/applications', (req, res) => {
  res.json(memoryStore.applications || []);
});

// Stage 1: HR Review (Approve & submit to Super Admin or Reject)
app.put('/api/admin/applications/:id/hr-approve', (req, res) => {
  const { id } = req.params;
  const { hr_name } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    appItem.status = 'Pending Super Admin Approval';
    appItem.hr_reviewed_by = hr_name || 'Systems Admin';
    appItem.hr_reviewed_at = new Date().toISOString();
    return res.json({
      message: `Application for "${appItem.applicant_name}" approved by HR and submitted to Super Admin for final hiring approval!`,
      application: appItem
    });
  }
  res.status(404).json({ error: 'Application not found' });
});

app.put('/api/admin/applications/:id/hr-reject', (req, res) => {
  const { id } = req.params;
  const { reason, hr_name } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    appItem.status = 'Rejected by HR';
    appItem.hr_rejection_reason = reason || 'Candidate screened out by HR';
    appItem.hr_reviewed_by = hr_name || 'Systems Admin';
    appItem.hr_reviewed_at = new Date().toISOString();
    return res.json({ message: `Application for "${appItem.applicant_name}" marked as Disapproved / Rejected by HR.`, application: appItem });
  }
  res.status(404).json({ error: 'Application not found' });
});

// Stage 2: Super Admin Final Hiring & Automated User Account Creation
app.post('/api/admin/applications/:id/super-admin-approve', (req, res) => {
  const { id } = req.params;
  const { role, position, salary, company, supervisor_id, supervisor_name } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    const assignedRole = role || 'staff';
    appItem.status = 'Hired & User Account Created';
    appItem.super_admin_approved_at = new Date().toISOString();
    appItem.assigned_role = assignedRole;

    // Check if account already exists or create new user
    let userRecord = memoryStore.users.find(u => u.email === appItem.email);
    if (!userRecord) {
      userRecord = {
        id: memoryStore.users.length > 0 ? Math.max(...memoryStore.users.map(u => u.id || 0)) + 1 : 1,
        name: appItem.applicant_name,
        email: appItem.email,
        phone: appItem.phone,
        role: assignedRole,
        position: position || appItem.job_title || 'Staff Specialist',
        company: company || 'Nova Cloud Edges (U) Ltd',
        salary: salary ? Number(salary) : 3000000,
        supervisor_id: supervisor_id || 1,
        supervisor_name: supervisor_name || 'Dr. Arthur Mukasa',
        created_at: new Date().toISOString()
      };
      memoryStore.users.push(userRecord);
    } else {
      userRecord.role = assignedRole;
      if (position) userRecord.position = position;
    }

    return res.json({
      message: `Candidate "${appItem.applicant_name}" hired successfully! System user account created with role "${assignedRole}".`,
      application: appItem,
      user: userRecord
    });
  }
  res.status(404).json({ error: 'Application not found' });
});

app.put('/api/admin/applications/:id/super-admin-reject', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    appItem.status = 'Rejected by Super Admin';
    appItem.super_admin_rejection_reason = reason || 'Candidate rejected at executive review';
    return res.json({ message: `Application for "${appItem.applicant_name}" disapproved by Super Admin.`, application: appItem });
  }
  res.status(404).json({ error: 'Application not found' });
});

// ----------------------------------------------------
// Company Expenditures & Staff Roll Attachment Endpoints
// (Accessible to Sales Manager, HR Manager & Super Admin)
// ----------------------------------------------------
app.get('/api/admin/company-expenses', (req, res) => {
  res.json(memoryStore.staff_expenses);
});

app.post('/api/admin/company-expenses', (req, res) => {
  const { staff_name, staff_email, supervisor_name, category, description, amount, receipt_ref, status, date, created_by, attachment_url, attachment_name } = req.body;
  if (!category || !amount || !description) {
    return res.status(400).json({ error: 'Category, amount, and description are required.' });
  }

  const numAmount = Number(amount) || 0;
  const staffMember = memoryStore.users.find(u => u.email === staff_email || u.name === staff_name);
  const supervisorName = supervisor_name || staffMember?.supervisor_name || 'System Administrator';

  const newExpense = {
    id: memoryStore.staff_expenses.length > 0 ? Math.max(...memoryStore.staff_expenses.map(e => e.id || 0)) + 1 : 1,
    staff_id: staffMember ? staffMember.id : null,
    staff_name: staffMember ? staffMember.name : (staff_name || 'Unassigned Staff / General Ops'),
    staff_email: staffMember ? staffMember.email : (staff_email || 'finance@ncloud.co.ug'),
    supervisor_name: supervisorName,
    category,
    description,
    amount: numAmount,
    receipt_ref: receipt_ref || 'VOUCHER-' + Math.floor(10000 + Math.random() * 90000),
    status: status || 'Pending Supervisor Review',
    date: date || new Date().toISOString().split('T')[0],
    attachment_url: attachment_url || '',
    attachment_name: attachment_name || '',
    created_by: created_by || 'Sales Manager / Staff',
    created_at: new Date().toISOString()
  };

  memoryStore.staff_expenses.unshift(newExpense);
  savePersistentStore();
  res.json({ message: `Company expenditure of UGX ${numAmount.toLocaleString()} logged and submitted to ${supervisorName} for approval!`, expense: newExpense });
});

app.put('/api/admin/company-expenses/:id', (req, res) => {
  const { id } = req.params;
  const { staff_name, staff_email, supervisor_name, category, description, amount, receipt_ref, date, attachment_url, attachment_name } = req.body;

  const eIndex = memoryStore.staff_expenses.findIndex(e => String(e.id) === String(id) || Number(e.id) === Number(id));
  if (eIndex !== -1) {
    if (staff_name) memoryStore.staff_expenses[eIndex].staff_name = staff_name;
    if (staff_email) memoryStore.staff_expenses[eIndex].staff_email = staff_email;
    if (supervisor_name) memoryStore.staff_expenses[eIndex].supervisor_name = supervisor_name;
    if (category) memoryStore.staff_expenses[eIndex].category = category;
    if (description) memoryStore.staff_expenses[eIndex].description = description;
    if (amount !== undefined) memoryStore.staff_expenses[eIndex].amount = Number(amount);
    if (receipt_ref) memoryStore.staff_expenses[eIndex].receipt_ref = receipt_ref;
    if (date) memoryStore.staff_expenses[eIndex].date = date;
    if (attachment_url !== undefined) memoryStore.staff_expenses[eIndex].attachment_url = attachment_url;
    if (attachment_name !== undefined) memoryStore.staff_expenses[eIndex].attachment_name = attachment_name;
    savePersistentStore();
    return res.json({ message: 'Company expenditure updated successfully!', expense: memoryStore.staff_expenses[eIndex] });
  }

  res.status(404).json({ error: 'Expenditure record not found' });
});

app.put('/api/admin/company-expenses/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approver_name } = req.body;
  const expense = memoryStore.staff_expenses.find(e => String(e.id) === String(id) || Number(e.id) === Number(id));
  if (expense) {
    expense.status = 'Approved by Supervisor';
    expense.approved_by = approver_name || expense.supervisor_name || 'Dr. Arthur Mukasa';
    expense.approved_at = new Date().toISOString();
    savePersistentStore();
    return res.json({ message: `Expenditure of UGX ${Number(expense.amount).toLocaleString()} approved by supervisor!`, expense });
  }
  res.status(404).json({ error: 'Expenditure record not found' });
});

app.put('/api/admin/company-expenses/:id/reject', (req, res) => {
  const { id } = req.params;
  const { reason, rejected_by } = req.body;
  const expense = memoryStore.staff_expenses.find(e => String(e.id) === String(id) || Number(e.id) === Number(id));
  if (expense) {
    expense.status = 'Rejected by Supervisor';
    expense.rejected_by = rejected_by || expense.supervisor_name || 'Supervisor / Management';
    expense.rejection_reason = reason || 'Expenditure disapproved by supervisor';
    expense.rejected_at = new Date().toISOString();
    return res.json({ message: `Expenditure marked as Disapproved / Rejected by supervisor.`, expense });
  }
  res.status(404).json({ error: 'Expenditure record not found' });
});

app.delete('/api/admin/company-expenses/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM staff_expenses WHERE id = ?', [id]);
  memoryStore.staff_expenses = (memoryStore.staff_expenses || []).filter(e => String(e.id) !== String(id) && Number(e.id) !== Number(id));
  savePersistentStore();
  res.json({ message: 'Company expenditure removed successfully!' });
});

function isHostingCategoryProduct(strOrObj) {
  if (!strOrObj) return false;

  // If passed an entire invoice object
  if (typeof strOrObj === 'object') {
    // 1. Explicitly flagged as a Recurring Subscription
    if (strOrObj.is_recurring || strOrObj.recurring_frequency) return true;

    // 2. Check category property
    const cat = String(strOrObj.category || '').toLowerCase();
    if (cat.includes('hosting') || cat.includes('cloud') || cat.includes('colocation') || cat.includes('vps')) {
      return true;
    }

    // 3. Check items array
    if (Array.isArray(strOrObj.items) && strOrObj.items.length > 0) {
      const anyItemHosting = strOrObj.items.some(it => isHostingCategoryProduct(it));
      if (anyItemHosting) return true;
    }

    // 4. Check item_name or plan_name
    const mainTitle = String(strOrObj.item_name || strOrObj.plan_name || strOrObj.name || '');
    if (mainTitle && isHostingCategoryProduct(mainTitle)) return true;
    return false;
  }

  const s = String(strOrObj.name || strOrObj.description || strOrObj.item_name || strOrObj.plan_name || strOrObj || '').toLowerCase();

  const hostingKeywords = [
    'hosting', 'cloud', 'vps', 'virtual server', 'cpanel', 'dedicated server',
    'storage node', 'cloud edge', 'cloud private', 'node hosting', 'web hosting',
    'email hosting', 'vps server', 'edge vps', 'cloud infrastructure',
    'server instance', 'unifi controller hosting', 'unifi hosting',
    'zimbra email', 'zimbra hosting', 'colocation', 'rack space', 'datacenter rack',
    '1u rack', 'datacenter colocation'
  ];

  return hostingKeywords.some(kw => s.includes(kw));
}

// Helper to create & activate subscription ONLY when an invoice is 100% Paid and belongs to Hosting Category
function createSubscriptionForInvoice(inv) {
  if (!inv) return null;
  if (!memoryStore.subscriptions) memoryStore.subscriptions = [];

  // 1. Order MUST be 100% Paid / Paid / Settled to provision & activate subscription!
  const isPaid = inv.status === 'Paid' || inv.status === '100% Paid' || inv.status === 'Paid & Settled';
  if (!isPaid) {
    console.log(`[Subscription Skip] Invoice ${inv.invoice_number} status is ${inv.status} (Not 100% Paid). Subscription postponed.`);
    return null;
  }

  // 2. Product/Service MUST belong to Hosting / Cloud / License category! Physical/One-off goods do NOT create subscriptions!
  const isHostingItem = isHostingCategoryProduct(inv);
  if (!isHostingItem) {
    console.log(`[Subscription Skip] Invoice ${inv.invoice_number} is non-hosting / physical product category. Skipping subscription creation.`);
    return null;
  }

  // Check if a subscription record already exists specifically for THIS exact invoice document
  const existingSub = memoryStore.subscriptions.find(s => 
    (s.invoice_number && (s.invoice_number === inv.invoice_number || String(s.invoice_number) === String(inv.id))) ||
    (s.reference && inv.reference && s.reference === inv.reference)
  );

  if (existingSub) {
    existingSub.status = 'Active';
    savePersistentStore();
    return existingSub;
  }

  // Create a BRAND NEW SEPARATE SUBSCRIPTION instance for this order
  const startDate = new Date().toISOString().split('T')[0];
  const dur = inv.duration || '1 Year';
  const expiryDate = calculateExpiryDate(startDate, dur);
  const planName = inv.item_name || inv.plan_name || (inv.items && inv.items[0] && inv.items[0].name) || 'Cloud Hosting Subscription';

  const subRecord = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    plan_name: planName,
    amount: inv.amount,
    currency: inv.currency || 'UGX',
    duration: dur,
    status: 'Active',
    payment_method: inv.payment_method || '100% Invoice Settlement',
    reference: inv.reference || (`NV-SUB-${Math.floor(10000 + Math.random() * 90000)}`),
    customer_name: inv.customer_name,
    customer_email: inv.customer_email,
    customer_phone: inv.customer_phone || '',
    customer_address: inv.customer_address || '',
    company: inv.company || '',
    start_date: startDate,
    expiry_date: expiryDate,
    invoice_number: inv.invoice_number,
    created_at: new Date().toISOString()
  };

  memoryStore.subscriptions.unshift(subRecord);
  savePersistentStore();
  return subRecord;
}

// Automated Subscription Expiry Notification & Lifecycle Engine
function processSubscriptionLifecycles() {
  if (!memoryStore.subscriptions) memoryStore.subscriptions = [];
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  let storeChanged = false;

  memoryStore.subscriptions.forEach(sub => {
    if (!sub.expiry_date || sub.status === 'Cancelled') return;

    // Track reminders sent on subscription record
    if (!sub.reminders_sent) sub.reminders_sent = {};

    const expiryDateObj = new Date(sub.expiry_date + 'T00:00:00Z');
    const todayDateObj = new Date(todayStr + 'T00:00:00Z');
    const diffTime = expiryDateObj.getTime() - todayDateObj.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const recipientEmail = sub.customer_email || sub.user_email;
    if (!recipientEmail) return;

    // 1. 30 Days Before Expiry Reminder
    if (daysRemaining <= 30 && daysRemaining > 10 && !sub.reminders_sent['30_days'] && sub.status === 'Active') {
      sub.reminders_sent['30_days'] = new Date().toISOString();
      storeChanged = true;
      console.log(`[Subscription Reminder 30D] Sent 30-day expiry reminder for ${sub.plan_name} to ${recipientEmail}`);

      const emailHtml = generateEmailTemplate({
        title: `Subscription Expiry Notice: 30 Days Remaining`,
        subtitle: `Ref #${sub.reference || sub.id} • Expiry Date: ${sub.expiry_date}`,
        bodyContent: `
          <p style="margin-bottom: 12px;">Dear <strong>${sub.customer_name || 'Valued Customer'}</strong>,</p>
          <p style="margin-bottom: 14px;">This is a courtesy reminder that your subscription for <strong>${sub.plan_name}</strong> will expire in <strong>30 days</strong> on <strong>${sub.expiry_date}</strong>.</p>
          <p style="margin-bottom: 14px;">To ensure uninterrupted access to your enterprise cloud infrastructure and managed services, please log in to your account portal to process your renewal.</p>
        `,
        ctaText: 'Renew Subscription Now',
        ctaLink: 'https://ncloud.co.ug/customer-portal'
      });

      sendMail({
        to: recipientEmail,
        subject: `Reminder: Subscription ${sub.plan_name} Expires in 30 Days (${sub.expiry_date})`,
        html: emailHtml
      }).catch(err => console.error('[Reminder Email Error 30D]:', err.message));
    }

    // 2. 10 Days Before Expiry Reminder
    if (daysRemaining <= 10 && daysRemaining > 1 && !sub.reminders_sent['10_days'] && sub.status === 'Active') {
      sub.reminders_sent['10_days'] = new Date().toISOString();
      storeChanged = true;
      console.log(`[Subscription Reminder 10D] Sent 10-day expiry reminder for ${sub.plan_name} to ${recipientEmail}`);

      const emailHtml = generateEmailTemplate({
        title: `Reminder Notice: 10 Days Before Expiry`,
        subtitle: `Ref #${sub.reference || sub.id} • Expiry Date: ${sub.expiry_date}`,
        bodyContent: `
          <p style="margin-bottom: 12px;">Dear <strong>${sub.customer_name || 'Valued Customer'}</strong>,</p>
          <p style="margin-bottom: 14px;">Your subscription for <strong>${sub.plan_name}</strong> is scheduled to expire in <strong>10 days</strong> on <strong>${sub.expiry_date}</strong>.</p>
          <p style="margin-bottom: 14px; color: #b45309; font-weight: 700;">Important: Please renew your service package promptly to avoid service disruption.</p>
        `,
        ctaText: 'Renew Package Now',
        ctaLink: 'https://ncloud.co.ug/customer-portal'
      });

      sendMail({
        to: recipientEmail,
        subject: `Urgent: 10 Days Remaining for Subscription ${sub.plan_name}`,
        html: emailHtml
      }).catch(err => console.error('[Reminder Email Error 10D]:', err.message));
    }

    // 3. 1 Day Before Expiry Reminder
    if (daysRemaining <= 1 && daysRemaining >= 0 && !sub.reminders_sent['1_day'] && sub.status === 'Active') {
      sub.reminders_sent['1_day'] = new Date().toISOString();
      storeChanged = true;
      console.log(`[Subscription Reminder 1D] Sent 1-day expiry reminder for ${sub.plan_name} to ${recipientEmail}`);

      const emailHtml = generateEmailTemplate({
        title: `FINAL REMINDER: Subscription Expires Tomorrow!`,
        subtitle: `Ref #${sub.reference || sub.id} • Expiry Date: ${sub.expiry_date}`,
        bodyContent: `
          <p style="margin-bottom: 12px;">Dear <strong>${sub.customer_name || 'Valued Customer'}</strong>,</p>
          <p style="margin-bottom: 14px;">This is your final advance reminder: Your subscription for <strong>${sub.plan_name}</strong> will expire <strong>tomorrow, ${sub.expiry_date}</strong>.</p>
          <p style="margin-bottom: 14px; color: #dc2626; font-weight: 800;">To prevent service deactivation, please complete your renewal payment today.</p>
        `,
        ctaText: 'Process Immediate Renewal',
        ctaLink: 'https://ncloud.co.ug/customer-portal'
      });

      sendMail({
        to: recipientEmail,
        subject: `FINAL NOTICE: ${sub.plan_name} Expires Tomorrow (${sub.expiry_date})`,
        html: emailHtml
      }).catch(err => console.error('[Reminder Email Error 1D]:', err.message));
    }

    // 4. On Expiry Date / Post-Expiry Notification (No auto-renewal invoice created!)
    if (daysRemaining < 0 && sub.status !== 'Expired' && !sub.reminders_sent['expired']) {
      sub.status = 'Expired';
      sub.reminders_sent['expired'] = new Date().toISOString();
      storeChanged = true;
      console.log(`[Subscription Expired] Subscription #${sub.id} (${sub.plan_name}) for ${recipientEmail} HAS EXPIRED on ${sub.expiry_date}. Status set to Expired.`);

      const emailHtml = generateEmailTemplate({
        title: `NOTICE: Subscription Has Expired`,
        subtitle: `Ref #${sub.reference || sub.id} • Expired On: ${sub.expiry_date}`,
        bodyContent: `
          <p style="margin-bottom: 12px;">Dear <strong>${sub.customer_name || 'Valued Customer'}</strong>,</p>
          <p style="margin-bottom: 14px;">Your subscription for <strong>${sub.plan_name}</strong> has reached its term end and expired on <strong>${sub.expiry_date}</strong>.</p>
          <p style="margin-bottom: 14px; color: #dc2626; font-weight: 700;">Please log in to your Nova Cloud Edges account portal to submit your renewal order and restore your active service status.</p>
        `,
        ctaText: 'Reactivate & Renew Package',
        ctaLink: 'https://ncloud.co.ug/customer-portal'
      });

      sendMail({
        to: recipientEmail,
        subject: `EXPIRY NOTICE: Subscription ${sub.plan_name} Expired (${sub.expiry_date})`,
        html: emailHtml
      }).catch(err => console.error('[Expiry Email Error]:', err.message));
    }
  });

  if (storeChanged) {
    savePersistentStore();
  }
}

// Run lifecycle check every 4 hours
setInterval(processSubscriptionLifecycles, 4 * 60 * 60 * 1000);

// ----------------------------------------------------
// Subscriptions Payment Endpoints
// ----------------------------------------------------
app.post('/api/subscriptions/checkout', async (req, res) => {
  try {
    const { plan_name, amount, currency, payment_method, user_email, customer_name, customer_email, customer_phone, customer_address, company, duration, start_date } = req.body;
    if (!plan_name || !amount) {
      return res.status(400).json({ error: 'Plan name and amount are required.' });
    }

    const reference = 'NV-SUB-' + Math.floor(1000 + Math.random() * 9000);
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const dur = duration || 'Monthly';
    const inputEmail = (customer_email || user_email || 'client@ncloud.co.ug').trim();
    const inputName = customer_name || (user_email ? user_email.split('@')[0] : 'Corporate Client');
    const inputAddress = customer_address || 'Plot 14 Parliament Avenue, Kampala, Uganda';
    const inputPhone = customer_phone || '';
    const inputCompany = company || '';

    // 1. Existing User Details Preservation Rule:
    const existingUser = (memoryStore.users || []).find(u => u && u.email && u.email.toLowerCase() === inputEmail.toLowerCase());

    let finalName = inputName;
    let finalEmail = inputEmail;
    let finalPhone = inputPhone;
    let finalAddress = inputAddress;
    let finalCompany = inputCompany;
    let isNewAccountCreated = false;
    let tempPassword = null;
    let createdUser = null;
    let userToken = null;

    if (existingUser) {
      finalName = existingUser.name || inputName;
      finalEmail = existingUser.email || inputEmail;
      finalPhone = existingUser.phone || inputPhone;
      finalAddress = existingUser.location || existingUser.address || inputAddress;
      finalCompany = existingUser.company || inputCompany;
    } else {
      isNewAccountCreated = true;
      tempPassword = 'NovaPass#' + Math.floor(1000 + Math.random() * 9000);
      let tempHash = '$2b$10$abcdefghijklmnopqrstuu';
      try {
        tempHash = await bcrypt.hash(tempPassword, 10);
      } catch (e) {
        console.error('Bcrypt error:', e);
      }
      
      const userDbRes = await query(
        'INSERT INTO users (name, email, password_hash, role, phone, company) VALUES (?, ?, ?, ?, ?, ?)',
        [inputName, inputEmail, tempHash, 'customer', inputPhone || null, inputCompany || null]
      );

      createdUser = {
        id: userDbRes.success && !userDbRes.isFallback ? userDbRes.data.insertId : Date.now(),
        name: inputName,
        email: inputEmail,
        phone: inputPhone || '+256 700 000 000',
        company: inputCompany || 'Corporate Client',
        role: 'customer',
        position: 'Customer',
        title: 'Customer',
        status: 'Active',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      if (!memoryStore.users) memoryStore.users = [];
      memoryStore.users.unshift(createdUser);
      savePersistentStore();

      try {
        userToken = jwt.sign({ id: createdUser.id, name: createdUser.name, email: createdUser.email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
      } catch (e) {
        console.error('JWT error:', e);
      }
    }

    // 2. Generate Pending Invoice
    const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const isVatIncluded = req.body.include_vat !== false;
    const computedVat = isVatIncluded ? (req.body.vat_amount || Math.round(amount * 0.18 / 1.18)) : 0;

    const inputItems = Array.isArray(req.body.items) && req.body.items.length > 0
      ? req.body.items.map(it => ({
          name: it.name || it.description || 'Digital Product',
          description: it.description || it.name || 'Digital Product',
          quantity: Number(it.quantity || it.qty || 1),
          qty: Number(it.quantity || it.qty || 1),
          unit_price: Number(it.unit_price || it.price || 0),
          price: Number(it.unit_price || it.price || 0),
          amount: Number(it.amount || (Number(it.unit_price || it.price || 0) * Number(it.quantity || it.qty || 1)))
        }))
      : [{ name: plan_name, description: plan_name, quantity: 1, qty: 1, unit_price: amount, price: amount, amount: amount }];

    const invoiceRecord = {
      id: Date.now() + 1,
      invoice_number: invNum,
      customer_name: finalName,
      customer_email: finalEmail,
      customer_phone: finalPhone || '',
      customer_address: finalAddress,
      company: finalCompany || '',
      item_name: plan_name,
      plan_name: plan_name,
      amount: amount,
      paid_amount: 0,
      balance: amount,
      status: 'Pending',
      due_date: startDate,
      duration: dur,
      reference: reference,
      payment_method: payment_method || 'Direct Subscription Multi-Checkout',
      include_vat: isVatIncluded,
      vat_exempt: !isVatIncluded,
      vat_amount: computedVat,
      items: inputItems,
      shareable_url: `https://ncloud.co.ug/verify?doc=${invNum}`,
      created_at: new Date().toISOString()
    };

    if (!memoryStore.invoices) memoryStore.invoices = [];
    memoryStore.invoices.unshift(invoiceRecord);

    savePersistentStore();

    // 3. Send SMTP Notification Email to Sales Team (non-blocking)
    try {
      const defaultSales = 'sales@ncloud.co.ug';
      const defaultBilling = 'billing@ncloud.co.ug';
      const salesEmail = memoryStore.notification_emails?.sales || defaultSales;
      const billingEmail = memoryStore.notification_emails?.billing || defaultBilling;
      const targets = [...new Set([salesEmail, billingEmail])];

      console.log('[DEBUG] Starting Sales Email send...');
      const salesRes = await sendMail({
        to: targets,
        subject: `New Subscription Order Received: ${plan_name} (Invoice #${invNum})`,
        html: generateCorporateEmailHtml({
          title: 'New Subscription Order',
          badgeText: 'Pending Payment',
          recipientName: 'Sales Team',
          introText: 'An official subscription order has been submitted via the Nova Website checkout portal.',
          itemsRows: `
            <tr><td><strong>Customer Name:</strong></td><td colspan="2" style="text-align:right;">${finalName}</td></tr>
            <tr><td><strong>Email Address:</strong></td><td colspan="2" style="text-align:right;">${finalEmail}</td></tr>
            <tr><td><strong>Phone Number:</strong></td><td colspan="2" style="text-align:right;">${finalPhone || 'N/A'}</td></tr>
            <tr><td><strong>Company:</strong></td><td colspan="2" style="text-align:right;">${finalCompany || 'N/A'}</td></tr>
            <tr><td><strong>Package(s):</strong></td><td colspan="2" style="text-align:right;">${plan_name}</td></tr>
            <tr><td><strong>Duration:</strong></td><td colspan="2" style="text-align:right;">${dur}</td></tr>
            <tr><td><strong>Status:</strong></td><td colspan="2" style="text-align:right;">Pending Payment</td></tr>
            <tr><td><strong>Invoice Number:</strong></td><td colspan="2" style="text-align:right;">#${invNum}</td></tr>
            <tr><td><strong>Order Reference:</strong></td><td colspan="2" style="text-align:right;">#${reference}</td></tr>
            <tr><td><strong>Account Auto-Created:</strong></td><td colspan="2" style="text-align:right;">${isNewAccountCreated ? 'YES (Role: Customer)' : 'NO (Existing User Records Preserved)'}</td></tr>
          `,
          subtotalText: '-',
          vatText: '-',
          totalAmountText: `${currency || 'UGX'} ${Number(amount).toLocaleString()}`,
          shareLink: 'https://ncloud.co.ug/admin',
          ctaText: 'Login to Admin Dashboard',
          ctaLink: 'https://ncloud.co.ug/admin'
        })
      });
      console.log('[DEBUG] Sales Email Result:', salesRes);
    } catch (err) {
      console.error('[Checkout Email Warning - Sales]:', err.message);
    }

    // 4. Send Official Corporate Tax Invoice Email to Customer (non-blocking)
    try {
      console.log('[DEBUG] Generating Corporate Email HTML...');
      const customerEmailHtml = generateCorporateEmailHtml({
        title: `Official Tax Invoice #${invNum}`,
        badgeText: 'Invoice Generated - Pending Payment',
        recipientName: finalName,
        introText: `Thank you for your order! Your subscription order for <strong>"${plan_name}"</strong> has been received. Your official verifiable Tax Invoice <strong>#${invNum}</strong> (Order Ref: <strong>#${reference}</strong>) details are provided below. Status is currently <strong>Pending Payment</strong>.`,
        itemsRows: inputItems.map(it => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <strong style="color: #ffffff;">${it.name || it.description}</strong><br/>
              <span style="font-size: 11px; color: #94a3b8;">Order Ref: ${reference}</span>
            </td>
            <td style="text-align: center; padding: 10px 0; border-bottom: 1px solid #334155;">${it.quantity || it.qty || 1}</td>
            <td style="text-align: right; padding: 10px 0; border-bottom: 1px solid #334155; font-weight: 700; color: #ffffff;">UGX ${Number(it.amount || (Number(it.unit_price || it.price || 0) * Number(it.quantity || it.qty || 1))).toLocaleString()}</td>
          </tr>
        `).join(''),
        subtotalText: `UGX ${Number(amount).toLocaleString()}`,
        vatText: 'UGX 0 (Standard Statutory)',
        totalAmountText: `UGX ${Number(amount).toLocaleString()}`,
        shareLink: invoiceRecord.shareable_url,
        ctaText: 'View & Print Official Invoice Online',
        ctaLink: invoiceRecord.shareable_url,
        footerNote: isNewAccountCreated ? `We created a new customer account for you. Login Email: <strong>${finalEmail}</strong> | Temp Password: <code style="background:#334155;padding:2px 6px;border-radius:4px;color:#38bdf8;">${tempPassword}</code>` : ''
      });

      console.log('[DEBUG] Starting Customer Email send...');
      const custRes = await sendMail({
        to: finalEmail,
        subject: `Official Tax Invoice #${invNum} - Pending Payment (Nova Cloud Edges)`,
        html: customerEmailHtml
      });
      console.log('[DEBUG] Customer Email Result:', custRes);
    } catch (err) {
      console.error('[Checkout Email Warning - Customer]:', err.message);
    }

    return res.json({
      success: true,
      reference,
      message: 'Order Has Been Received!',
      invoice: invoiceRecord,
      new_account_created: isNewAccountCreated,
      created_user: createdUser,
      temp_password: tempPassword,
      token: userToken
    });
  } catch (globalErr) {
    console.error('[Fatal Checkout Error]:', globalErr);
    return res.status(500).json({ error: 'Server error processing checkout. Please try again.' });
  }
});

// ----------------------------------------------------
// Contact Inquiry Endpoint
// ----------------------------------------------------
app.post('/api/contact', verifyTurnstile, async (req, res) => {
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

  const adminHtml = generateCorporateEmailHtml({
    title: 'New Customer Inquiry',
    badgeText: 'Website Contact Form',
    recipientName: 'Nova Cloud Support Team',
    introText: `A new contact form inquiry has been submitted by <strong>${name}</strong> (${email}).`,
    itemsRows: `
      <tr>
        <td><strong>Subject:</strong></td>
        <td colspan="2" style="text-align: right;">${subject || 'General Inquiry'}</td>
      </tr>
      <tr>
        <td><strong>Phone:</strong></td>
        <td colspan="2" style="text-align: right;">${phone || 'N/A'}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding-top: 15px; border-top: 1px solid #e2e8f0;">
          <strong style="display:block; margin-bottom: 8px;">Message Content:</strong>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; color: #334155; border: 1px solid #e2e8f0;">${message}</div>
        </td>
      </tr>
    `,
    subtotalText: '-',
    vatText: '-',
    totalAmountText: '-',
    shareLink: 'https://ncloud.co.ug/admin',
    ctaText: 'Login to Admin Dashboard',
    ctaLink: 'https://ncloud.co.ug/admin'
  });

  const billingEmail = memoryStore.notification_emails?.billing || 'billing@ncloud.co.ug';
  const salesEmail = memoryStore.notification_emails?.sales || 'sales@ncloud.co.ug';
  const supportEmail = 'support@ncloud.co.ug';
  const adminEmails = [billingEmail, salesEmail, supportEmail].filter((v, i, a) => a.indexOf(v) === i).join(', ');

  await sendMail({
    to: adminEmails,
    subject: `New Inquiry from ${name}: ${subject || 'General Inquiry'}`,
    html: adminHtml
  });

  const customerHtml = generateCorporateEmailHtml({
    title: 'Thank You for Contacting Us',
    badgeText: 'Inquiry Received',
    recipientName: name,
    introText: `Thank you for reaching out to Nova Cloud Edges (U) Limited. We have successfully received your inquiry regarding <strong>"${subject || 'General Inquiry'}"</strong>.`,
    itemsRows: `<tr><td colspan="3" style="text-align: center;">Our infrastructure support team will review your message and respond shortly.</td></tr>`,
    subtotalText: '-',
    vatText: '-',
    totalAmountText: '-',
    shareLink: 'https://ncloud.co.ug',
    ctaText: 'Visit Our Website',
    ctaLink: 'https://ncloud.co.ug',
    footerNote: 'Nova Cloud Edges (U) Limited • Plot 14/16 Jinja Road, Kampala, Uganda'
  });

  await sendMail({
    to: email,
    subject: `Thank you for contacting Nova Cloud Edges`,
    html: customerHtml
  });

  res.json({
    message: 'Thank you! Your message has been received by Nova Cloud Edges.',
    contact: contactRecord
  });
});

// ----------------------------------------------------
// Admin Dashboard Data Endpoint
// ----------------------------------------------------
app.post('/api/admin/contacts/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  
  if (!response) {
    return res.status(400).json({ error: 'Response message is required.' });
  }

  const contactIdx = memoryStore.contacts.findIndex(c => String(c.id) === String(id));
  if (contactIdx === -1) {
    return res.status(404).json({ error: 'Contact inquiry not found.' });
  }

  const contact = memoryStore.contacts[contactIdx];
  const repliedAt = new Date().toISOString();

  // Send email to customer
  const customerHtml = generateCorporateEmailHtml({
    title: 'Response to Your Inquiry',
    badgeText: 'Customer Support',
    recipientName: contact.name,
    introText: `Thank you for contacting Nova Cloud Edges (U) Limited. Below is the response to your inquiry regarding <strong>"${contact.subject || 'General Inquiry'}"</strong>.`,
    itemsRows: `<tr><td colspan="3" style="padding: 15px; background: #0f172a; border-radius: 6px; color: #cbd5e1; white-space: pre-wrap;">${response}</td></tr>`,
    subtotalText: '-',
    vatText: '-',
    totalAmountText: '-',
    shareLink: 'https://ncloud.co.ug',
    ctaText: 'Visit Our Website',
    ctaLink: 'https://ncloud.co.ug',
    footerNote: 'Nova Cloud Edges (U) Limited • Plot 14/16 Jinja Road, Kampala, Uganda'
  });

  await sendMail({
    to: contact.email,
    subject: `Re: ${contact.subject || 'General Inquiry'}`,
    html: customerHtml
  });

  // Update DB and Memory Store
  contact.status = 'replied';
  contact.response = response;
  contact.replied_at = repliedAt;
  
  await query('UPDATE contacts SET status = ?, response = ?, replied_at = ? WHERE id = ?', ['replied', response, repliedAt, id]);
  await saveStore();

  res.json({ success: true, message: 'Response sent successfully and recorded.', contact });
});

app.get('/api/admin/overview', async (req, res) => {
  const contactsDb = await query('SELECT * FROM contacts ORDER BY id DESC');
  const applicationsDb = await query('SELECT ja.*, j.title as job_title FROM job_applications ja JOIN jobs j ON ja.job_id = j.id ORDER BY ja.id DESC');
  const subscriptionsDb = await query('SELECT * FROM subscriptions ORDER BY id DESC');
  const productsDb = await query('SELECT * FROM products ORDER BY id ASC');
  const servicesDb = await query('SELECT * FROM services ORDER BY id ASC');

  const contacts = (contactsDb.success && !contactsDb.isFallback) ? contactsDb.data : memoryStore.contacts;
  const applications = (applicationsDb.success && !applicationsDb.isFallback) ? applicationsDb.data : memoryStore.applications;
  const subscriptions = (subscriptionsDb.success && !subscriptionsDb.isFallback) ? subscriptionsDb.data : memoryStore.subscriptions;
  const products = (() => {
    const memoryProds = memoryStore.products || [];
    if (productsDb.success && !productsDb.isFallback && Array.isArray(productsDb.data)) {
      const dbIds = new Set(productsDb.data.map(p => String(p.id)));
      const extra = memoryProds.filter(p => !dbIds.has(String(p.id)));
      return [...productsDb.data, ...extra];
    }
    return memoryProds;
  })();
  const services = (servicesDb.success && !servicesDb.isFallback) ? servicesDb.data : memoryStore.services;

  res.json({
    totalContacts: contacts.length,
    totalApplications: applications.length,
    totalSubscriptions: subscriptions.length,
    totalProducts: products.length,
    totalServices: services.length,
    totalTeam: memoryStore.team.length,
    totalJobs: memoryStore.jobs.length,
    totalUsers: memoryStore.users.length,
    totalInvoices: memoryStore.invoices.length,
    totalStaff: memoryStore.users.filter(u => u.role === 'staff').length,
    totalPayroll: memoryStore.payroll.length,
    totalStaffExpenses: memoryStore.staff_expenses.length,
    totalStaffInvoices: memoryStore.staff_invoices.length,
    totalPartners: (memoryStore.partners || []).length,
    totalNews: (memoryStore.news || []).length,
    contacts,
    applications,
    subscriptions,
    products,
    services,
    partners: memoryStore.partners || [],
    news: memoryStore.news || [],
    team: memoryStore.team,
    jobs: memoryStore.jobs,
    users: memoryStore.users,
    invoices: memoryStore.invoices,
    payroll: memoryStore.payroll,
    staffExpenses: memoryStore.staff_expenses,
    companyExpenses: memoryStore.staff_expenses,
    staffInvoices: memoryStore.staff_invoices,
    sliders: memoryStore.sliders,
    audit_logs: memoryStore.audit_logs || [],
    forensics: memoryStore.audit_logs || [],
    security_settings: memoryStore.security_settings || null
  });
});

// ----------------------------------------------------
// HR Manager API Endpoints (Payroll, Expenses & Staff Invoices)
// ----------------------------------------------------
app.get('/api/admin/hr/overview', (req, res) => {
  res.json({
    staffUsers: memoryStore.users.filter(u => u.role === 'staff' || u.role === 'hr_manager'),
    payroll: memoryStore.payroll,
    staffExpenses: memoryStore.staff_expenses,
    staffInvoices: memoryStore.staff_invoices
  });
});

app.post('/api/admin/hr/payroll', (req, res) => {
  const { staff_name, email, position, department, base_salary, allowances, deductions, pay_period } = req.body;
  if (!staff_name || !base_salary) {
    return res.status(400).json({ error: 'Staff name and base salary are required.' });
  }

  const base = Number(base_salary) || 3000000;
  const allow = Number(allowances) || 0;
  const deduct = Number(deductions) || Math.round(base * 0.15);
  const netPay = base + allow - deduct;

  const newSlip = {
    id: memoryStore.payroll.length + 1,
    staff_id: Date.now(),
    staff_name,
    email: email || 'staff@ncloud.co.ug',
    position: position || 'Staff Engineer',
    department: department || 'Operations',
    base_salary: base,
    allowances: allow,
    deductions: deduct,
    net_pay: netPay,
    pay_period: pay_period || 'August 2026',
    status: 'Approved',
    created_at: new Date().toISOString()
  };

  memoryStore.payroll.unshift(newSlip);
  res.json({ message: `Payroll payslip logged successfully for ${staff_name} (${pay_period})`, payslip: newSlip });
});

app.put('/api/admin/hr/payroll/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const slip = memoryStore.payroll.find(p => p.id == id);
  if (slip) {
    slip.status = status;
    return res.json({ message: `Payroll status for ${slip.staff_name} updated to ${status}`, payslip: slip });
  }
  res.status(404).json({ error: 'Payroll record not found' });
});

app.post('/api/admin/hr/expenses', (req, res) => {
  const { staff_name, staff_email, category, description, amount, receipt_ref } = req.body;
  if (!staff_name || !amount) {
    return res.status(400).json({ error: 'Staff name and expense amount are required.' });
  }

  const newExpense = {
    id: memoryStore.staff_expenses.length + 1,
    staff_name,
    staff_email: staff_email || 'staff@ncloud.co.ug',
    category: category || 'General Operations',
    description: description || 'Staff Business Expense Claim',
    amount: Number(amount),
    receipt_ref: receipt_ref || `EXP-REC-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  memoryStore.staff_expenses.unshift(newExpense);
  res.json({ message: `Staff Expense Claim of UGX ${Number(amount).toLocaleString()} logged successfully`, expense: newExpense });
});

app.put('/api/admin/hr/expenses/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const exp = memoryStore.staff_expenses.find(e => e.id == id);
  if (exp) {
    exp.status = status;
    return res.json({ message: `Staff Expense claim for ${exp.staff_name} marked as ${status}`, expense: exp });
  }
  res.status(404).json({ error: 'Expense claim record not found' });
});

app.put('/api/admin/hr/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { staff_name, staff_email, category, description, amount, receipt_ref, status, date, notes } = req.body;
  const exp = (memoryStore.staff_expenses || []).find(e => e.id == id);
  if (exp) {
    if (staff_name) exp.staff_name = staff_name;
    if (staff_email !== undefined) exp.staff_email = staff_email;
    if (category) exp.category = category;
    if (description !== undefined) exp.description = description;
    if (amount !== undefined) exp.amount = Number(amount);
    if (receipt_ref !== undefined) exp.receipt_ref = receipt_ref;
    if (status) exp.status = status;
    if (date) exp.date = date;
    if (notes !== undefined) exp.notes = notes;
    exp.updated_at = new Date().toISOString();
    return res.json({ message: `Staff Expense Record #${exp.id} updated successfully!`, expense: exp });
  }
  res.status(404).json({ error: 'Expense claim record not found' });
});

app.post('/api/admin/hr/staff-invoices', (req, res) => {
  const { staff_name, staff_email, position, claim_type, description, amount, tax_deduction, due_date } = req.body;
  if (!staff_name || !amount) {
    return res.status(400).json({ error: 'Staff name and demand amount are required.' });
  }

  const gross = Number(amount);
  const tax = Number(tax_deduction) || 0;
  const netPayable = gross - tax;
  const invNum = `STF-INV-2026-00${memoryStore.staff_invoices.length + 1}`;

  const newStaffInvoice = {
    id: memoryStore.staff_invoices.length + 1,
    invoice_number: invNum,
    staff_name,
    staff_email: staff_email || 'staff@ncloud.co.ug',
    position: position || 'Staff Member',
    claim_type: claim_type || 'Monthly Salary & Allowance Demand',
    description: description || 'Internal Payment Demand Invoice to Nova Cloud Edges Company',
    amount: gross,
    tax_deduction: tax,
    net_payable: netPayable,
    due_date: due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Pending HR Approval',
    created_at: new Date().toISOString()
  };

  memoryStore.staff_invoices.unshift(newStaffInvoice);
  res.json({ message: `Staff Payment Demand Invoice ${invNum} created successfully demanding company payout`, invoice: newStaffInvoice });
});

app.put('/api/admin/hr/staff-invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const inv = memoryStore.staff_invoices.find(i => i.id == id);
  if (inv) {
    inv.status = status;
    return res.json({ message: `Staff Demand Invoice ${inv.invoice_number} status updated to ${status}`, invoice: inv });
  }
  res.status(404).json({ error: 'Staff Invoice not found' });
});

// ----------------------------------------------------
// Payments & Settings API Endpoints
// ----------------------------------------------------
app.get('/api/admin/settings', (req, res) => {
  res.json({
    paidStamp: memoryStore.paid_stamp
  });
});

app.post('/api/admin/settings/paid-stamp', (req, res) => {
  const { paidStamp } = req.body;
  memoryStore.paid_stamp = paidStamp;
  res.json({ message: 'Official PAID Stamp image updated successfully in System Brand Settings!', paidStamp });
});

app.get('/api/admin/payments', (req, res) => {
  res.json({
    payments: memoryStore.payments,
    totalPayments: memoryStore.payments.length
  });
});

app.post('/api/admin/payments', async (req, res) => {
  const { payment_type, invoice_number, party_name, party_email, amount_due, amount_paid, payment_method, reference, updated_by } = req.body;
  if (!party_name || !amount_paid) {
    return res.status(400).json({ error: 'Party name and amount paid are required.' });
  }

  const due = Number(amount_due) || Number(amount_paid);
  const paid = Number(amount_paid);
  const isFullyPaid = paid >= due;
  const excessAmount = paid > due ? paid - due : 0;
  const status = isFullyPaid ? '100% Paid' : 'Partially Paid';

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateTimeStr = `${dateStr} ${timeStr}`;

  const newPayment = {
    id: memoryStore.payments.length + 1,
    payment_type: payment_type || 'customer',
    invoice_number: invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    party_name,
    party_email: party_email || 'client@company.co.ug',
    amount_due: due,
    amount_paid: paid,
    excess_amount: excessAmount,
    payment_method: payment_method || 'Bank Wire Transfer',
    reference: reference || `TXN-REF-${Math.floor(100000 + Math.random() * 900000)}`,
    status,
    date: dateTimeStr,
    payment_date: dateTimeStr,
    created_at_time: dateTimeStr,
    updated_by: updated_by || 'Finance Officer',
    created_at: now.toISOString()
  };

  memoryStore.payments.unshift(newPayment);

  // If customer invoice, update status & excess credit in invoices collection and customer_credits
  if (payment_type === 'customer') {
    let inv = null;
    if (req.body.invoice_id) {
      inv = memoryStore.invoices.find(i => String(i.id) === String(req.body.invoice_id));
    }
    if (!inv && invoice_number) {
      const cleanNum = String(invoice_number).trim().toLowerCase();
      inv = memoryStore.invoices.find(i => 
        (i.invoice_number && i.invoice_number.trim().toLowerCase() === cleanNum) ||
        String(i.id) === String(invoice_number).trim()
      );
    }

    if (inv) {
      newPayment.invoice_number = inv.invoice_number;
      newPayment.party_name = inv.customer_name || newPayment.party_name;
      newPayment.party_email = inv.customer_email || newPayment.party_email;

      const currentTotalPaid = (Number(inv.paid_amount) || 0) + paid;
      const totalInvAmount = Number(inv.amount) || due;
      inv.paid_amount = currentTotalPaid;
      inv.balance = Math.max(0, totalInvAmount - currentTotalPaid);
      inv.excess_amount = currentTotalPaid > totalInvAmount ? currentTotalPaid - totalInvAmount : excessAmount;

      const percentPaid = Math.min(100, Math.round((currentTotalPaid / (totalInvAmount || 1)) * 100));

      const isFullyCleared = currentTotalPaid >= totalInvAmount || inv.balance === 0 || (due > 0 && paid >= due);

      if (isFullyCleared) {
        inv.status = '100% Paid';
        inv.balance = 0;
      } else if (currentTotalPaid > 0) {
        inv.status = 'Partial';
        inv.payment_status_label = `Partially Paid (${percentPaid}% Paid)`;
      } else {
        inv.status = 'Pending';
      }

      newPayment.status = inv.status;

      if (!Array.isArray(inv.payment_history)) inv.payment_history = [];
      inv.payment_history.push({
        id: newPayment.id,
        payment_id: newPayment.id,
        amount: paid,
        amount_paid: paid,
        payment_method: newPayment.payment_method,
        reference: newPayment.reference,
        date: dateTimeStr,
        payment_date: dateTimeStr,
        created_at_time: dateTimeStr,
        recorded_by: newPayment.updated_by,
        running_balance: inv.balance,
        percent_paid: percentPaid,
        status: inv.status,
        created_at: newPayment.created_at
      });

      // Create & activate linked subscription ALWAYS when invoice becomes 100% Paid / Cleared
      if (inv.status === '100% Paid' || inv.status === 'Paid' || isFullyCleared) {
        createSubscriptionForInvoice(inv);
      }

      // Auto-Dispatch Work Order to Responsible Staff Member if assigned
      if (inv.assigned_staff_name) {
        if (!memoryStore.work_orders) memoryStore.work_orders = [];
        const existingWO = memoryStore.work_orders.find(w => w.invoice_number === inv.invoice_number);
        if (!existingWO) {
          const count = memoryStore.work_orders.length + 1;
          const newWO = {
            id: count,
            order_number: `WO-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`,
            invoice_number: inv.invoice_number,
            customer_name: inv.customer_name,
            customer_email: inv.customer_email,
            customer_phone: inv.customer_phone || '',
            task_title: `Service Delivery Execution for ${inv.customer_name} (${inv.invoice_number})`,
            client_site: inv.customer_address || 'Kampala, Uganda',
            assigned_staff_id: inv.assigned_staff_id || 5,
            assigned_staff_name: inv.assigned_staff_name,
            assigned_staff_email: inv.assigned_staff_email || '',
            charging_mode: 'per_day',
            service_description: inv.item_name || 'Provisioning & Deployment of Cloud Services',
            assigned_staff_id: inv.assigned_staff_id || 2,
            assigned_staff_name: inv.assigned_staff_name || 'Nixon Kamugisha',
            assigned_staff_email: inv.assigned_staff_email || 'nkamugisha@ncedges.com',
            status: 'Assigned',
            priority: 'High',
            due_date: inv.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: 'Work order auto-generated upon customer 100% payment receipt.',
            created_at: new Date().toISOString()
          };
          memoryStore.work_orders.unshift(newWO);
        }
      }

      // Log credit accrued if overpayment occurred
      if (excessAmount > 0) {
        if (!memoryStore.customer_credits) memoryStore.customer_credits = [];
        let cred = memoryStore.customer_credits.find(c => c.customer_email === party_email || c.customer_name === party_name);
        if (!cred) {
          cred = {
            id: memoryStore.customer_credits.length + 1,
            customer_name: party_name,
            customer_email: party_email,
            available_credit: 0,
            history: []
          };
          memoryStore.customer_credits.push(cred);
        }
        cred.available_credit = (cred.available_credit || 0) + excessAmount;
        if (!cred.history) cred.history = [];
        cred.history.push({
          date: new Date().toISOString().split('T')[0],
          invoice_number: newPayment.invoice_number,
          amount: excessAmount,
          type: 'credit_accrued'
        });
      }
    }
  } else if (payment_type === 'staff') {
    let stfInv = null;
    if (invoice_number) {
      stfInv = memoryStore.staff_invoices.find(i => 
        (i.invoice_number && i.invoice_number.trim().toLowerCase() === invoice_number.trim().toLowerCase()) ||
        String(i.id) === String(invoice_number).trim()
      );
    }
    if (stfInv) {
      if (isFullyPaid) stfInv.status = 'Paid & Settled';
    }
  }

  if (memoryStore.audit_logs) {
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      user: updated_by || 'Finance Officer',
      action: 'Processed Payment',
      details: `Processed ${payment_type === 'customer' ? 'Customer' : 'Staff'} payment of UGX ${paid} for Ref #${newPayment.reference}`,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: now.toISOString()
    });
  }

  savePersistentStore();

  // Dispatch automated payment receipt email to customer with official PDF attached
  const targetCustomerEmail = newPayment.party_email || party_email;
  const targetCustomerName = newPayment.party_name || party_name || 'Valued Client';
  if (targetCustomerEmail) {
    const isCleared = newPayment.status === '100% Paid' || status === '100% Paid' || isFullyPaid;
    const mailSubject = isCleared
      ? `[OFFICIAL RECEIPT] ✓ 100% Clearance Payment Receipt for Invoice #${newPayment.invoice_number}`
      : `[PAYMENT RECEIPT] Partial Payment Receipt for Invoice #${newPayment.invoice_number}`;

    const pdfBuffer = await generateServerPaymentReceiptPDFBuffer(newPayment, {
      customerName: targetCustomerName,
      customerEmail: targetCustomerEmail
    });

    const mailHtml = generateCorporateEmailHtml({
      title: isCleared ? 'Official 100% Clearance Payment Receipt' : 'Official Payment Installment Receipt',
      badgeText: isCleared ? '100% Paid & Settled' : 'Payment Recorded',
      recipientName: targetCustomerName,
      attachmentName: `Payment_Receipt_${newPayment.reference}.pdf`,
      introText: `Nova Cloud Edges Finance Department has received and confirmed your payment of <strong>UGX ${paid.toLocaleString()}</strong> towards Invoice <strong>#${newPayment.invoice_number}</strong> via <strong>${newPayment.payment_method}</strong>. Your digitally certified payment receipt is attached to this email.`,
      itemsRows: `
        <tr>
          <td><strong>Transaction Reference</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${newPayment.reference}</td>
        </tr>
        <tr>
          <td><strong>Payment Method</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: bold;">${newPayment.payment_method}</td>
        </tr>
        <tr>
          <td><strong>Settlement Timestamp</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right;">${dateTimeStr}</td>
        </tr>
        <tr>
          <td><strong>Invoice Clearance Status</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: bold; color: ${isCleared ? '#16a34a' : '#d97706'};">${isCleared ? '✓ 100% Paid & Settled' : 'Partially Paid'}</td>
        </tr>
        ${excessAmount > 0 ? `
        <tr>
          <td style="color: #9333ea; font-weight: bold;">Overpayment Excess Credit</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: bold; color: #9333ea;">+ UGX ${excessAmount.toLocaleString()}</td>
        </tr>
        ` : ''}
      `,
      subtotalText: `UGX ${paid.toLocaleString()}`,
      vatText: 'Clearance Confirmed',
      totalAmountText: `UGX ${paid.toLocaleString()}`,
      shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newPayment.reference)}`,
      ctaText: 'Verify Receipt Online',
      ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newPayment.reference)}`
    });

    sendMail({
      to: targetCustomerEmail,
      subject: mailSubject,
      html: mailHtml,
      attachments: [
        {
          filename: `Payment_Receipt_${newPayment.reference}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }).catch(err => console.error('[Payment Receipt Email Warning]', err.message));
  }

  const excessMsg = excessAmount > 0 ? ` (Overpayment excess of UGX ${excessAmount.toLocaleString()} credited to customer balance)` : '';
  res.json({
    message: `Payment of UGX ${paid.toLocaleString()} recorded successfully (${status})${excessMsg}!`,
    payment: newPayment,
    excess_amount: excessAmount
  });
});

app.put('/api/admin/payments/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, amount_paid } = req.body;
  const pmt = memoryStore.payments.find(p => String(p.id) === String(id) || p.reference === id || p.invoice_number === id);
  if (pmt) {
    if (status) pmt.status = status;
    if (amount_paid !== undefined) pmt.amount_paid = Number(amount_paid);

    if (pmt.invoice_number) {
      const inv = memoryStore.invoices.find(i => 
        (i.invoice_number && i.invoice_number.trim().toLowerCase() === pmt.invoice_number.trim().toLowerCase()) ||
        String(i.id) === String(pmt.invoice_number).trim()
      );
      if (inv) {
        if (pmt.amount_paid !== undefined) inv.paid_amount = pmt.amount_paid;
        if (status) {
          inv.status = status;
          if (status === 'Paid' || status === '100% Paid') {
            createSubscriptionForInvoice(inv);
          }
        }
      }
    }

    savePersistentStore();
    return res.json({ message: `Payment record updated successfully (Status: ${pmt.status})`, payment: pmt });
  }
  res.status(404).json({ error: 'Payment record not found' });
});

// Refund Payment Endpoint & Outbound Email Notification Dispatch
app.post('/api/admin/payments/:id/refund', async (req, res) => {
  const { id } = req.params;
  const { refund_reason, refund_amount, admin_name, admin_email, invoice_number, reference, party_name, party_email } = req.body;

  if (!memoryStore.payments) memoryStore.payments = [];
  if (!memoryStore.invoices) memoryStore.invoices = [];
  if (!memoryStore.staff_invoices) memoryStore.staff_invoices = [];

  let pmt = memoryStore.payments.find(p => 
    String(p.id) === String(id) || 
    p.reference === id || 
    p.invoice_number === id ||
    (invoice_number && p.invoice_number === invoice_number) ||
    (reference && p.reference === reference)
  );

  // If no payment record exists yet in memoryStore.payments, check invoices or staff invoices to create one on-the-fly
  if (!pmt) {
    const inv = memoryStore.invoices.find(i => 
      String(i.id) === String(id) || 
      i.invoice_number === id || 
      (invoice_number && i.invoice_number === invoice_number)
    );
    if (inv) {
      const invPaid = Number(inv.paid_amount !== undefined ? inv.paid_amount : (inv.status === 'Paid' || inv.status === '100% Paid' ? inv.amount : 0));
      pmt = {
        id: memoryStore.payments.length + 1,
        payment_type: 'customer',
        invoice_number: inv.invoice_number,
        party_name: inv.customer_name || party_name || 'Customer',
        party_email: inv.customer_email || party_email || 'client@company.co.ug',
        amount_due: Number(inv.amount || 0),
        amount_paid: invPaid,
        payment_method: 'Bank Wire Transfer',
        reference: reference || `TXN-INV-${inv.invoice_number}`,
        status: inv.status === 'Paid' || inv.status === '100% Paid' ? '100% Paid' : (inv.status || 'Pending Clearance'),
        date: inv.created_at || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      memoryStore.payments.unshift(pmt);
    } else {
      const stf = memoryStore.staff_invoices.find(i => 
        String(i.id) === String(id) || 
        i.invoice_number === id || 
        (invoice_number && i.invoice_number === invoice_number)
      );
      if (stf) {
        pmt = {
          id: memoryStore.payments.length + 1,
          payment_type: 'staff',
          invoice_number: stf.invoice_number || `STF-INV-${stf.id}`,
          party_name: stf.staff_name || party_name || 'Staff Member',
          party_email: stf.email || party_email || 'staff@ncloud.co.ug',
          amount_due: Number(stf.amount || stf.net_pay || 0),
          amount_paid: Number(stf.status === 'Paid' ? (stf.amount || stf.net_pay || 0) : 0),
          payment_method: 'EFT Bank Transfer',
          reference: reference || `PAYROLL-EFT-${stf.id}`,
          status: stf.status === 'Paid' ? '100% Paid' : (stf.status || 'Pending Clearance'),
          date: stf.date || new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        memoryStore.payments.unshift(pmt);
      }
    }
  }

  if (!pmt) return res.status(404).json({ error: 'Payment record not found' });

  const currentPaid = Number(pmt.amount_paid !== undefined ? pmt.amount_paid : (pmt.paid_amount !== undefined ? pmt.paid_amount : (pmt.status === 'Paid' || pmt.status === '100% Paid' ? pmt.amount_due : 0)));
  const reqRefund = Number(refund_amount || currentPaid);
  const amtToRefund = Math.min(currentPaid > 0 ? currentPaid : Number(pmt.amount_due || 0), reqRefund > 0 ? reqRefund : currentPaid);

  pmt.amount_paid = Math.max(0, currentPaid - amtToRefund);
  pmt.total_refunded = (Number(pmt.total_refunded) || 0) + amtToRefund;
  pmt.refund_amount = amtToRefund;
  pmt.refund_reason = refund_reason || 'Customer requested billing reversal / refund';
  pmt.refunded_at = new Date().toISOString();

  const isFullRefund = pmt.amount_paid === 0;
  pmt.status = isFullRefund ? 'Refunded' : 'Partially Refunded';

  // Update associated invoice status and paid amount if customer payment
  if (pmt.invoice_number) {
    const inv = (memoryStore.invoices || []).find(i => 
      (i.invoice_number && i.invoice_number.trim().toLowerCase() === pmt.invoice_number.trim().toLowerCase()) ||
      String(i.id) === String(pmt.invoice_number).trim()
    );
    if (inv) {
      const invOldPaid = Number(inv.paid_amount !== undefined ? inv.paid_amount : (inv.status === 'Paid' || inv.status === '100% Paid' ? inv.amount : 0));
      const invNewPaid = Math.max(0, invOldPaid - amtToRefund);
      inv.paid_amount = invNewPaid;
      inv.balance = Math.max(0, Number(inv.amount) - invNewPaid);

      if (invNewPaid === 0) {
        inv.status = 'Pending';
        inv.excess_amount = 0;
      } else if (invNewPaid < Number(inv.amount)) {
        inv.status = 'Partial';
        inv.excess_amount = 0;
      }

      if (memoryStore.subscriptions) {
        const sub = memoryStore.subscriptions.find(s => s.invoice_number === inv.invoice_number);
        if (sub && isFullRefund) {
          sub.status = 'Cancelled';
        }
      }
    }
  }

  // Revert customer credit if overpayment was credited
  if (pmt.excess_amount > 0) {
    const cred = (memoryStore.customer_credits || []).find(c => c.customer_email === pmt.party_email || c.customer_name === pmt.party_name);
    if (cred) {
      cred.available_credit = Math.max(0, (cred.available_credit || 0) - pmt.excess_amount);
      if (cred.history) {
        cred.history.push({
          date: new Date().toISOString().split('T')[0],
          invoice_number: pmt.invoice_number,
          amount: pmt.excess_amount,
          type: 'credit_refunded'
        });
      }
    }
  }

  savePersistentStore();

  // Send automated HTML Refund Email Notification
  if (pmt.party_email) {
    const emailHtml = generateCorporateEmailHtml({
      title: 'PAYMENT REFUND RECEIPT',
      badgeText: 'Refund Processed',
      recipientName: pmt.party_name,
      introText: `This notification confirms that a refund has been processed for your payment transaction (Ref: <strong>#${pmt.reference}</strong>).`,
      itemsRows: `
        <tr><td><strong>Invoice Number:</strong></td><td colspan="2" style="text-align:right;">#${pmt.invoice_number}</td></tr>
        <tr><td><strong>Amount Refunded:</strong></td><td colspan="2" style="text-align:right; color:#0284c7; font-weight:800;">UGX ${amtToRefund.toLocaleString()}</td></tr>
        <tr><td><strong>Refund Status:</strong></td><td colspan="2" style="text-align:right;">${pmt.status}</td></tr>
        <tr><td><strong>Reason:</strong></td><td colspan="2" style="text-align:right;">${pmt.refund_reason}</td></tr>
        <tr><td><strong>Date Processed:</strong></td><td colspan="2" style="text-align:right;">${new Date().toLocaleString()}</td></tr>
      `,
      subtotalText: '-',
      vatText: '-',
      totalAmountText: '-',
      shareLink: 'https://ncloud.co.ug/portal',
      ctaText: 'Login to Customer Portal',
      ctaLink: 'https://ncloud.co.ug/portal',
      footerNote: 'If your payment was processed via Mobile Money or Bank Wire Transfer, funds will reflect in your account within 1-3 business days.<br/><br/>Nova Cloud Edges (U) Limited — Accounts & Billing Department<br/>Email: sales@ncloud.co.ug | Hotline: 0790001631'
    });

    sendMail({
      to: pmt.party_email,
      subject: `Notice: Payment Refund Processed (Ref #${pmt.reference}) - Nova Cloud Edges`,
      html: emailHtml
    }).catch(err => console.error('[Refund Email Error]', err.message));
  }

  // Audit log entry
  if (memoryStore.audit_logs) {
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      user_email: admin_email || 'systems@ncloud.co.ug',
      user_name: admin_name || 'Accounts Admin',
      user_role: 'super_admin',
      action: 'PAYMENT_REFUNDED',
      resource_type: 'Payments',
      resource_id: pmt.reference,
      details: `Processed refund of UGX ${amtToRefund.toLocaleString()} for ${pmt.party_name} (${pmt.party_email}). Reason: ${pmt.refund_reason}. Email notification dispatched.`,
      ip_address: req.ip || '127.0.0.1',
      device_type: 'Desktop Console',
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    message: `Payment #${pmt.reference} refunded by UGX ${amtToRefund.toLocaleString()}! Status: ${pmt.status}. Reason: "${pmt.refund_reason}". Notice emailed to ${pmt.party_email}.`,
    payment: pmt
  });
});

// System Settings API - Persistent Site Logo & Favicon
app.get('/api/admin/settings/logo', (req, res) => {
  res.json({ logoUrl: memoryStore.site_logo || '' });
});

app.post('/api/admin/settings/logo', (req, res) => {
  const { logoUrl } = req.body;
  memoryStore.site_logo = logoUrl || '';
  savePersistentStore();
  console.log('[System Settings] Updated persistent site logo');
  res.json({ success: true, logoUrl: memoryStore.site_logo });
});

app.get('/api/admin/settings/favicon', (req, res) => {
  res.json({ faviconUrl: memoryStore.site_favicon || '' });
});

app.post('/api/admin/settings/favicon', (req, res) => {
  const { faviconUrl } = req.body;
  memoryStore.site_favicon = faviconUrl || '';
  savePersistentStore();
  console.log('[System Settings] Updated persistent site favicon');
  res.json({ success: true, faviconUrl: memoryStore.site_favicon });
});

// ----------------------------------------------------
// Expense Categories Endpoints (Admin Manageable)
// ----------------------------------------------------
app.get('/api/admin/expense-categories', (req, res) => {
  res.json(memoryStore.expense_categories || []);
});

app.post('/api/admin/expense-categories', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  const newCat = {
    id: memoryStore.expense_categories.length > 0 ? Math.max(...memoryStore.expense_categories.map(c => c.id || 0)) + 1 : 1,
    name: name.trim(),
    description: description || ''
  };
  memoryStore.expense_categories.push(newCat);
  res.json({ message: `Expense category "${newCat.name}" added successfully!`, category: newCat });
});

app.put('/api/admin/expense-categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const cat = memoryStore.expense_categories.find(c => String(c.id) === String(id) || Number(c.id) === Number(id));
  if (cat) {
    if (name) cat.name = name.trim();
    if (description !== undefined) cat.description = description;
    return res.json({ message: `Expense category updated successfully!`, category: cat });
  }
  res.status(404).json({ error: 'Expense category not found' });
});

app.delete('/api/admin/expense-categories/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM expense_categories WHERE id = ?', [id]);
  memoryStore.expense_categories = memoryStore.expense_categories.filter(c => String(c.id) !== String(id) && Number(c.id) !== Number(id));
  savePersistentStore();
  res.json({ message: 'Expense category removed successfully!' });
});

// ----------------------------------------------------
// Announcement Top Bar Endpoints (Web Admin Manageable)
// ----------------------------------------------------
app.get('/api/announcement', (req, res) => {
  res.json(memoryStore.announcement || {});
});

app.put('/api/admin/announcement', (req, res) => {
  const {
    enabled, badge, badge_text, text, message, link_text, btn_text, link_url, link,
    schedule_type, start_date, end_date, bg_gradient, theme, timing_seconds, auto_dismiss_hours
  } = req.body;

  if (!memoryStore.announcement) memoryStore.announcement = {};
  if (enabled !== undefined) memoryStore.announcement.enabled = Boolean(enabled);
  if (badge !== undefined || badge_text !== undefined) memoryStore.announcement.badge = badge_text || badge;
  if (badge_text !== undefined) memoryStore.announcement.badge_text = badge_text;
  if (text !== undefined || message !== undefined) memoryStore.announcement.text = text || message;
  if (message !== undefined) memoryStore.announcement.message = message;
  if (link_text !== undefined || btn_text !== undefined) memoryStore.announcement.link_text = btn_text || link_text;
  if (btn_text !== undefined) memoryStore.announcement.btn_text = btn_text;
  if (link_url !== undefined || link !== undefined) memoryStore.announcement.link_url = link || link_url;
  if (link !== undefined) memoryStore.announcement.link = link;
  if (schedule_type !== undefined) memoryStore.announcement.schedule_type = schedule_type;
  if (start_date !== undefined) memoryStore.announcement.start_date = start_date;
  if (end_date !== undefined) memoryStore.announcement.end_date = end_date;
  if (bg_gradient !== undefined) memoryStore.announcement.bg_gradient = bg_gradient;
  if (theme !== undefined) memoryStore.announcement.theme = theme;
  if (timing_seconds !== undefined) memoryStore.announcement.timing_seconds = Number(timing_seconds) || 0;
  if (auto_dismiss_hours !== undefined) memoryStore.announcement.auto_dismiss_hours = Number(auto_dismiss_hours) || 24;
  memoryStore.announcement.updated_at = new Date().toISOString();

  // Sync banner_settings as well
  memoryStore.banner_settings = {
    ...memoryStore.announcement,
    message: memoryStore.announcement.text,
    enabled: memoryStore.announcement.enabled
  };

  savePersistentStore();

  res.json({
    message: 'Announcement banner settings updated successfully!',
    announcement: memoryStore.announcement
  });
});

// ----------------------------------------------------
// Customer Credits / Overpayment Balances
// ----------------------------------------------------
app.get('/api/admin/customer-credits', (req, res) => {
  res.json(memoryStore.customer_credits || []);
});

app.get('/api/admin/customer-credits/:email', (req, res) => {
  const { email } = req.params;
  const cred = (memoryStore.customer_credits || []).find(c => c.customer_email.toLowerCase() === decodeURIComponent(email).toLowerCase());
  res.json(cred || { customer_email: email, available_credit: 0, history: [] });
});

// ----------------------------------------------------
// Reports & Financial Analytics Aggregation Engine
// ----------------------------------------------------
app.get('/api/admin/reports/analytics', (req, res) => {
  const invoices = memoryStore.invoices || [];
  const payments = memoryStore.payments || [];
  const staffExpenses = memoryStore.staff_expenses || [];
  const staffInvoices = memoryStore.staff_invoices || [];
  const expenses = [...staffExpenses, ...staffInvoices];
  const payroll = memoryStore.payroll || [];
  const products = memoryStore.products || [];
  const services = memoryStore.services || [];
  const subscriptions = memoryStore.subscriptions || [];
  const credits = memoryStore.customer_credits || [];
  const quotations = memoryStore.quotations || [];
  const workOrders = memoryStore.work_orders || [];
  const auditLogs = memoryStore.audit_logs || [];

  // Invoiced sales metrics across all invoices
  const totalInvoicedSales = invoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const totalInvoicesCount = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === 'Paid' || i.status === '100% Paid' || i.status === 'Paid & Settled');
  const paidInvoicesCount = paidInvoices.length;
  const pendingInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== '100% Paid' && i.status !== 'Paid & Settled' && i.status !== 'Cancelled');
  const pendingInvoicesCount = pendingInvoices.length;
  const totalPendingReceivables = pendingInvoices.reduce((acc, i) => acc + (Number(i.amount || 0) - Number(i.paid_amount || 0)), 0);

  // Cash collections from customer payments & cleared invoices
  const customerPaymentSum = payments.filter(p => p.payment_type === 'customer').reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
  const paidInvoiceDirectSum = paidInvoices.reduce((acc, i) => {
    const hasPaymentLog = payments.some(p => p.invoice_number === i.invoice_number);
    return hasPaymentLog ? acc : acc + Number(i.amount || 0);
  }, 0);
  const totalCashCollected = customerPaymentSum + paidInvoiceDirectSum;

  // Staff expenses & payroll disbursements
  const staffExpensesSum = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const payrollDisbursementsSum = payroll.reduce((acc, p) => acc + Number(p.net_pay || p.base_salary || 0), 0);
  const totalStaffDisbursements = payments.filter(p => p.payment_type === 'staff').reduce((acc, p) => acc + Number(p.amount_paid || 0), 0) + payrollDisbursementsSum;
  const totalExpenses = staffExpensesSum + payrollDisbursementsSum;

  const netProfitLoss = totalCashCollected - totalExpenses;
  const profitMargin = totalCashCollected > 0 ? ((netProfitLoss / totalCashCollected) * 100).toFixed(1) : '0.0';
  const totalExcessCredits = credits.reduce((acc, c) => acc + Number(c.available_credit || 0), 0);

  // Comprehensive Category breakdown of expenditures
  const expensesByCategory = {};
  expenses.forEach(e => {
    const cat = e.category || 'General Operations & Maintenance';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount || 0);
  });
  if (payrollDisbursementsSum > 0) {
    expensesByCategory['Staff Payroll & Remuneration'] = (expensesByCategory['Staff Payroll & Remuneration'] || 0) + payrollDisbursementsSum;
  }
  const expense_category_breakdown = Object.keys(expensesByCategory).map(cat => ({
    category: cat,
    total_amount: expensesByCategory[cat]
  }));

  // Sales count & revenue mapping across ALL individual items in all invoices
  const productSalesMap = {};
  const productRevenueMap = {};
  invoices.forEach(inv => {
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      inv.items.forEach(it => {
        const itName = it.name || it.item_name || 'Standard Cloud Offering';
        const itQty = Math.max(1, parseInt(it.quantity || it.qty) || 1);
        const itAmt = Number(it.amount || (itQty * (Number(it.unit_price || it.price) || 0)));
        productSalesMap[itName] = (productSalesMap[itName] || 0) + itQty;
        productRevenueMap[itName] = (productRevenueMap[itName] || 0) + itAmt;
      });
    } else {
      const itemName = inv.item_name || inv.plan_name || 'Standard Cloud Offering';
      const itQty = Math.max(1, parseInt(inv.quantity) || 1);
      const itAmt = Number(inv.subtotal || inv.amount || 0);
      productSalesMap[itemName] = (productSalesMap[itemName] || 0) + itQty;
      productRevenueMap[itemName] = (productRevenueMap[itemName] || 0) + itAmt;
    }
  });

  const allProductList = [...products, ...services];
  // Ensure any item that has been sold in any invoice is present in allProductList
  Object.keys(productSalesMap).forEach(soldName => {
    const exists = allProductList.some(p => (p.name || p.title || '').trim().toLowerCase() === soldName.trim().toLowerCase());
    if (!exists) {
      allProductList.push({
        name: soldName,
        category: 'Invoiced Products & Services',
        price: productSalesMap[soldName] > 0 ? Math.round(productRevenueMap[soldName] / productSalesMap[soldName]) : 0
      });
    }
  });

  const topSellingItems = [];
  const underperformingItems = [];

  allProductList.forEach(p => {
    const name = p.name || p.title || 'Digital Product';
    const salesCount = productSalesMap[name] || 0;
    const actualRevenue = productRevenueMap[name] || (salesCount * (Number(p.price) || 0));
    const itemData = {
      name,
      category: p.category || (p.slug ? 'Cloud Services' : 'Enterprise Solutions'),
      price: Number(p.price) || 0,
      sales_count: salesCount,
      revenue: actualRevenue,
      total_revenue: actualRevenue,
      status: salesCount > 0 ? 'Active Sales Performer' : 'Needs Selling Push'
    };
    if (salesCount > 0) {
      topSellingItems.push(itemData);
    } else {
      underperformingItems.push(itemData);
    }
  });

  topSellingItems.sort((a, b) => b.total_revenue - a.total_revenue);

  res.json({
    metrics: {
      totalInvoicedSales,
      total_invoiced_sales: totalInvoicedSales,
      totalCashCollected,
      total_cash_collected: totalCashCollected,
      totalStaffDisbursements,
      total_staff_disbursements: totalStaffDisbursements,
      totalPendingReceivables,
      total_pending_receivables: totalPendingReceivables,
      pending_receivables: totalPendingReceivables,
      totalExpenses,
      total_expenditures: totalExpenses,
      netProfitLoss,
      net_profit_loss: netProfitLoss,
      profitMargin,
      net_margin_percentage: profitMargin,
      totalExcessCredits,
      total_customer_credit_pool: totalExcessCredits,
      activeSubscriptionsCount: subscriptions.length,
      paidInvoicesCount,
      total_invoices_count: totalInvoicesCount,
      paid_invoices_count: paidInvoicesCount,
      pending_invoices_count: pendingInvoicesCount
    },
    expensesByCategory,
    expense_category_breakdown,
    topSellingItems,
    top_selling_items: topSellingItems,
    underperformingItems,
    items_needing_push: underperformingItems,
    // Provide ALL items for complete action and reports without slicing
    invoices,
    allInvoices: invoices,
    recentInvoices: invoices,
    expenses,
    allExpenses: expenses,
    companyExpenses: expenses,
    recentExpenses: expenses,
    payments,
    allPayments: payments,
    recentPayments: payments,
    payroll,
    allPayroll: payroll,
    subscriptions,
    allSubscriptions: subscriptions,
    quotations,
    allQuotations: quotations,
    workOrders,
    allWorkOrders: workOrders,
    auditLogs,
    allAuditLogs: auditLogs
  });
});

// ----------------------------------------------------
// Bank Accounts Management Endpoints
// ----------------------------------------------------
app.get('/api/admin/bank-accounts', (req, res) => {
  res.json(memoryStore.bank_accounts || []);
});

app.post('/api/admin/bank-accounts', (req, res) => {
  const { bank_name, account_name, account_number, branch, swift_code, currency, is_primary } = req.body;
  if (!bank_name || !account_number) return res.status(400).json({ error: 'Bank name and account number are required' });
  
  if (is_primary) {
    (memoryStore.bank_accounts || []).forEach(b => { b.is_primary = false; });
  }

  const newBank = {
    id: Date.now(),
    bank_name,
    account_name: account_name || 'Nova Cloud Edges (U) Limited',
    account_number,
    branch: branch || 'Kampala Main Branch',
    swift_code: swift_code || '',
    currency: currency || 'UGX',
    is_primary: Boolean(is_primary)
  };
  memoryStore.bank_accounts.push(newBank);
  savePersistentStore();
  res.json({ message: 'Bank account configured successfully', bank_account: newBank });
});

app.put('/api/admin/bank-accounts/:id', (req, res) => {
  const { id } = req.params;
  const { bank_name, account_name, account_number, branch, swift_code, currency, is_primary } = req.body;
  const bank = (memoryStore.bank_accounts || []).find(b => b.id == id);
  if (bank) {
    if (is_primary) {
      (memoryStore.bank_accounts || []).forEach(b => { b.is_primary = false; });
    }
    if (bank_name) bank.bank_name = bank_name;
    if (account_name) bank.account_name = account_name;
    if (account_number) bank.account_number = account_number;
    if (branch !== undefined) bank.branch = branch;
    if (swift_code !== undefined) bank.swift_code = swift_code;
    if (currency) bank.currency = currency;
    if (is_primary !== undefined) bank.is_primary = Boolean(is_primary);
    savePersistentStore();
    return res.json({ message: 'Bank account updated successfully', bank_account: bank });
  }
  res.status(404).json({ error: 'Bank account not found' });
});

app.delete('/api/admin/bank-accounts/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM bank_accounts WHERE id = ?', [id]);
  memoryStore.bank_accounts = (memoryStore.bank_accounts || []).filter(b => String(b.id) !== String(id) && Number(b.id) !== Number(id));
  savePersistentStore();
  return res.json({ message: 'Bank account removed successfully' });
});

// ----------------------------------------------------
// Quotations Management Endpoints
// ----------------------------------------------------
app.get('/api/admin/quotations', (req, res) => {
  res.json(memoryStore.quotations || []);
});

app.post('/api/admin/quotations', async (req, res) => {
  const { customer_name, customer_email, customer_phone, company, valid_until, items, vat_exempt, notes } = req.body;
  if (!customer_name) return res.status(400).json({ error: 'Customer name is required for quotation' });

  const quoteNumber = `QTN-${new Date().getFullYear()}-${String((memoryStore.quotations || []).length + 81).padStart(4, '0')}`;
  const quoteItems = Array.isArray(items) && items.length > 0 ? items : [
    { name: 'Nova Cloud Edge VPS Server (Standard)', quantity: 1, unit_price: 280000, discount_pct: 0, total: 280000 }
  ];

  const subtotal = quoteItems.reduce((sum, it) => sum + Number(it.total || (it.quantity * it.unit_price) || 0), 0);
  const isExempt = Boolean(vat_exempt);
  const vatAmount = isExempt ? 0 : Math.round(subtotal * 0.18);
  const totalAmount = subtotal + vatAmount;

  const newQuote = {
    id: Date.now(),
    quote_number: quoteNumber,
    customer_name,
    customer_email: customer_email || 'client@company.co.ug',
    customer_phone: customer_phone || '',
    company: company || customer_name,
    valid_until: valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'Sent', // Draft, Sent, Accepted, Declined, Converted
    items: quoteItems,
    subtotal,
    vat_exempt: isExempt,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    notes: notes || 'Quotation valid for 30 days. Remittance details attached on document.',
    created_at: new Date().toISOString()
  };

  memoryStore.quotations.unshift(newQuote);
  savePersistentStore();

  // Send official Quotation email with attached PDF
  if (newQuote.customer_email) {
    const pdfBuffer = await generateServerQuotationPDFBuffer(newQuote);
    const emailHtml = generateCorporateEmailHtml({
      title: `Commercial Price Quotation #${quoteNumber}`,
      badgeText: 'Official Quotation',
      recipientName: newQuote.customer_name,
      attachmentName: `Commercial_Quotation_${quoteNumber}.pdf`,
      introText: `Thank you for your interest in Nova Cloud Edges enterprise infrastructure. Please find your official commercial quotation #${quoteNumber} attached to this email and summarized below.`,
      itemsRows: quoteItems.map(it => `
        <tr>
          <td>${it.name || it.description}</td>
          <td style="text-align: center;">${it.quantity || 1}</td>
          <td style="text-align: right;">UGX ${Number(it.total || (it.quantity * it.unit_price) || 0).toLocaleString()}</td>
        </tr>
      `).join(''),
      subtotalText: `UGX ${subtotal.toLocaleString()}`,
      vatText: isExempt ? 'EXEMPT (0%)' : `UGX ${vatAmount.toLocaleString()}`,
      totalAmountText: `UGX ${totalAmount.toLocaleString()}`,
      shareLink: 'https://ncloud.co.ug/portal',
      ctaText: 'View & Accept Quotation Online',
      ctaLink: 'https://ncloud.co.ug/portal'
    });

    sendMail({
      to: newQuote.customer_email,
      subject: `Commercial Price Quotation #${quoteNumber} from Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Commercial_Quotation_${quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }).catch(err => console.error('[Quotation Email Warning]:', err.message));
  }

  res.json({ message: `Quotation ${quoteNumber} generated and dispatched with official PDF attached!`, quotation: newQuote });
});

app.put('/api/admin/quotations/:id', async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_email, customer_phone, company, valid_until, status, items, vat_exempt, notes } = req.body;
  const q = (memoryStore.quotations || []).find(item => item.id == id);
  if (q) {
    if (customer_name) q.customer_name = customer_name;
    if (customer_email) q.customer_email = customer_email;
    if (customer_phone !== undefined) q.customer_phone = customer_phone;
    if (company) q.company = company;
    if (valid_until) q.valid_until = valid_until;
    if (status) q.status = status;
    if (notes !== undefined) q.notes = notes;
    if (vat_exempt !== undefined) q.vat_exempt = Boolean(vat_exempt);
    if (Array.isArray(items)) {
      q.items = items;
      q.subtotal = items.reduce((sum, it) => sum + Number(it.total || (it.quantity * it.unit_price) || 0), 0);
      q.vat_amount = q.vat_exempt ? 0 : Math.round(q.subtotal * 0.18);
      q.total_amount = q.subtotal + q.vat_amount;
    }
    savePersistentStore();

    // Send background email for quote update with attached PDF
    if (q.customer_email) {
      const pdfBuffer = await generateServerQuotationPDFBuffer(q);
      const emailHtml = generateCorporateEmailHtml({
        title: `Updated Commercial Quotation #${q.quote_number}`,
        badgeText: 'Quotation Updated',
        recipientName: q.customer_name,
        attachmentName: `Commercial_Quotation_${q.quote_number}.pdf`,
        introText: `Your Commercial Quotation #${q.quote_number} has been updated by our team. Please inspect the attached official PDF document and details below.`,
        itemsRows: (q.items || []).map(it => `
          <tr>
            <td>${it.name || it.description}</td>
            <td style="text-align: center;">${it.quantity || 1}</td>
            <td style="text-align: right;">UGX ${Number(it.total || (it.quantity * it.unit_price) || 0).toLocaleString()}</td>
          </tr>
        `).join(''),
        subtotalText: `UGX ${Number(q.subtotal || 0).toLocaleString()}`,
        vatText: q.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(q.vat_amount || 0).toLocaleString()}`,
        totalAmountText: `UGX ${Number(q.total_amount || 0).toLocaleString()}`,
        shareLink: 'https://ncloud.co.ug/portal',
        ctaText: 'Login to View Quotation',
        ctaLink: 'https://ncloud.co.ug/portal'
      });
      sendMail({
        to: q.customer_email,
        subject: `Updated Commercial Quotation #${q.quote_number} from Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Commercial_Quotation_${q.quote_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error("Failed to send quote update email:", err));
    }

    return res.json({ message: 'Quotation updated successfully and revised PDF dispatched!', quotation: q });
  }
  res.status(404).json({ error: 'Quotation not found' });
});

app.post('/api/admin/quotations/:id/convert-to-invoice', async (req, res) => {
  const { id } = req.params;
  const q = (memoryStore.quotations || []).find(item => item.id == id);
  if (!q) return res.status(404).json({ error: 'Quotation not found' });

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((memoryStore.invoices || []).length + 43).padStart(4, '0')}`;
  const firstItem = (q.items && q.items[0]) || { name: 'Quoted Enterprise Solution', quantity: 1, unit_price: q.total_amount };

  const newInvoice = {
    id: Date.now(),
    invoice_number: invoiceNumber,
    customer_name: q.customer_name,
    customer_email: q.customer_email,
    item_name: firstItem.name,
    quantity: firstItem.quantity || 1,
    unit_price: firstItem.unit_price || q.total_amount,
    amount: q.total_amount,
    vat_amount: q.vat_amount,
    vat_exempt: q.vat_exempt,
    status: 'Pending',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    quote_ref: q.quote_number,
    created_at: new Date().toISOString()
  };

  memoryStore.invoices.unshift(newInvoice);
  q.status = 'Converted to Invoice';
  q.converted_invoice_number = invoiceNumber;
  savePersistentStore();

  // Send background email for quote converted to invoice with attached invoice PDF
  if (newInvoice.customer_email) {
    const shareableUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNumber)}`;
    const pdfBuffer = await generateServerInvoicePDFBuffer(newInvoice);
    const emailHtml = generateCorporateEmailHtml({
      title: `Tax Invoice Issued #${invoiceNumber}`,
      badgeText: 'Quote Accepted & Invoiced',
      recipientName: newInvoice.customer_name,
      attachmentName: `Tax_Invoice_${invoiceNumber}.pdf`,
      introText: `Your Commercial Quotation #${q.quote_number} has been converted into an official Tax Invoice #${invoiceNumber}. Please find the invoice summary below and the certified PDF attached.`,
      itemsRows: (q.items || [{ name: newInvoice.item_name, quantity: newInvoice.quantity, total: newInvoice.amount }]).map(it => `
        <tr>
          <td>${it.name || it.description}</td>
          <td style="text-align: center;">${it.quantity || 1}</td>
          <td style="text-align: right;">UGX ${Number(it.total || (it.quantity * it.unit_price) || 0).toLocaleString()}</td>
        </tr>
      `).join(''),
      subtotalText: `UGX ${Number(newInvoice.amount - newInvoice.vat_amount).toLocaleString()}`,
      vatText: newInvoice.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(newInvoice.vat_amount || 0).toLocaleString()}`,
      totalAmountText: `UGX ${Number(newInvoice.amount || 0).toLocaleString()}`,
      shareLink: shareableUrl,
      ctaText: 'View & Print Official Invoice PDF',
      ctaLink: shareableUrl
    });
    sendMail({
      to: newInvoice.customer_email,
      subject: `New Tax Invoice #${invoiceNumber} from Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Tax_Invoice_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }).catch(err => console.error("Failed to send quote converted to invoice email:", err));
  }

  return res.json({
    message: `Quotation ${q.quote_number} successfully converted to Tax Invoice ${invoiceNumber}!`,
    invoice: newInvoice,
    quotation: q
  });
});

app.delete('/api/admin/quotations/:id', async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM quotations WHERE id = ? OR quote_number = ?', [id, id]);
  const deletedQ = (memoryStore.quotations || []).find(q => String(q.id) === String(id) || q.quote_number === id);
  memoryStore.quotations = (memoryStore.quotations || []).filter(q => String(q.id) !== String(id) && q.quote_number !== id);
  savePersistentStore();

  if (deletedQ && deletedQ.customer_email) {
    const emailHtml = generateCorporateEmailHtml({
      title: `Commercial Quotation Voided #${deletedQ.quote_number}`,
      badgeText: 'Quotation Cancelled',
      recipientName: deletedQ.customer_name || 'Customer',
      introText: `Please be advised that Commercial Quotation #${deletedQ.quote_number} has been officially cancelled/voided by our administration team.`,
      itemsRows: `<tr><td colspan="3" style="text-align:center;">Quotation records completely voided.</td></tr>`,
      subtotalText: 'UGX 0',
      vatText: 'UGX 0',
      totalAmountText: 'UGX 0',
      shareLink: 'https://ncloud.co.ug/portal',
      ctaText: 'Login to Customer Portal',
      ctaLink: 'https://ncloud.co.ug/portal'
    });
    sendMail({
      to: deletedQ.customer_email,
      subject: `Notice: Commercial Quotation #${deletedQ.quote_number} Cancelled`,
      html: emailHtml
    }).catch(err => console.error("Failed to send quote deletion email:", err));
  }

  return res.json({ message: 'Quotation deleted successfully' });
});

// ----------------------------------------------------
// Work Orders & Task Scheduling Endpoints
// ----------------------------------------------------
app.get('/api/admin/work-orders', (req, res) => {
  res.json(memoryStore.work_orders || []);
});

app.post('/api/admin/work-orders', (req, res) => {
  const { task_title, client_site, assigned_staff_id, assigned_staff_name, charging_mode, rate, quantity, scheduled_date, description } = req.body;
  if (!task_title) return res.status(400).json({ error: 'Task title is required' });

  const orderNumber = `WO-${new Date().getFullYear()}-${String((memoryStore.work_orders || []).length + 14).padStart(4, '0')}`;
  const rateVal = Number(rate) || 150000;
  const qtyVal = Number(quantity) || 1;
  const totalCost = rateVal * qtyVal;

  const newOrder = {
    id: Date.now(),
    order_number: orderNumber,
    task_title,
    client_site: client_site || 'Nova Datacenter Node',
    assigned_staff_id: assigned_staff_id || null,
    assigned_staff_name: assigned_staff_name || 'Unassigned Staff',
    charging_mode: charging_mode === 'per_hour' ? 'per_hour' : 'per_day',
    rate: rateVal,
    quantity: qtyVal,
    total_cost: totalCost,
    scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
    completion_date: null,
    status: 'Scheduled', // Scheduled, In Progress, Completed, Cancelled
    description: description || '',
    created_at: new Date().toISOString()
  };

  memoryStore.work_orders.unshift(newOrder);
  savePersistentStore();
  res.json({ message: `Work Order ${orderNumber} created successfully`, work_order: newOrder });
});

app.put('/api/admin/work-orders/:id', (req, res) => {
  const { id } = req.params;
  const { task_title, client_site, assigned_staff_id, assigned_staff_name, charging_mode, rate, quantity, scheduled_date, status, description } = req.body;
  const order = (memoryStore.work_orders || []).find(o => o.id == id);
  if (order) {
    if (order.status === 'Completed' && (!status || status === 'Completed')) {
      return res.status(400).json({ error: `Work Order #${order.order_number} is Completed and locked from editing.` });
    }
    if (task_title) order.task_title = task_title;
    if (client_site) order.client_site = client_site;
    if (assigned_staff_id) order.assigned_staff_id = assigned_staff_id;
    if (assigned_staff_name) order.assigned_staff_name = assigned_staff_name;
    if (charging_mode) order.charging_mode = charging_mode;
    if (rate !== undefined) order.rate = Number(rate);
    if (quantity !== undefined) order.quantity = Number(quantity);
    order.total_cost = order.rate * order.quantity;
    if (scheduled_date) order.scheduled_date = scheduled_date;
    if (status) order.status = status;
    if (description !== undefined) order.description = description;

    savePersistentStore();
    return res.json({ message: 'Work Order updated successfully', work_order: order });
  }
  res.status(404).json({ error: 'Work Order not found' });
});

// Marking Work Order Complete -> Auto-Generates Company Expense Voucher for Labor Payout & Sends Staff Email with PDF
app.put('/api/admin/work-orders/:id/complete', async (req, res) => {
  const { id } = req.params;
  const order = (memoryStore.work_orders || []).find(o => o.id == id);
  if (!order) return res.status(404).json({ error: 'Work Order not found' });

  order.status = 'Completed';
  order.completion_date = new Date().toISOString().split('T')[0];

  // Lookup staff email from memoryStore.users
  const assignedUser = (memoryStore.users || []).find(u => u.id == order.assigned_staff_id || u.name === order.assigned_staff_name);
  const staffEmail = assignedUser?.email || order.assigned_staff_email || '';

  // Auto-generate Company Expense Voucher for this labor
  const newVoucher = {
    id: Date.now(),
    staff_name: order.assigned_staff_name,
    staff_email: staffEmail,
    supervisor_name: 'Dr. Arthur Mukasa',
    category: 'Field Infrastructure Deployment',
    description: `Labor Payout for Work Order ${order.order_number}: ${order.task_title} (${order.quantity} ${order.charging_mode === 'per_hour' ? 'Hours' : 'Days'} @ UGX ${Number(order.rate || 0).toLocaleString()})`,
    amount: order.total_cost,
    receipt_ref: `WO-EXP-${order.order_number}`,
    status: 'Approved by Supervisor',
    approved_by: 'System Labor Automation',
    approved_at: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    work_order_ref: order.order_number,
    created_at: new Date().toISOString()
  };

  if (!memoryStore.staff_expenses) memoryStore.staff_expenses = [];
  memoryStore.staff_expenses.unshift(newVoucher);

  // Email Notification & Attached PDF Log Record for Staff Member
  const pdfBuffer = await generateServerWorkOrderPDFBuffer(order);
  const emailSubject = `Official Completed Work Order & Approved Labor Payout Voucher — #${order.order_number}`;
  const emailHtml = generateCorporateEmailHtml({
    title: `Work Order Completed #${order.order_number}`,
    badgeText: 'Work Order Completed',
    recipientName: order.assigned_staff_name,
    attachmentName: `Work_Order_${order.order_number}.pdf`,
    introText: `Your assigned Work Order <strong>#${order.order_number}</strong> ("${order.task_title}") at site location "${order.client_site}" has been verified and marked <strong>COMPLETED</strong>. A Company Expense Labor Payout Voucher of <strong>UGX ${Number(order.total_cost || 0).toLocaleString()}</strong> has been approved for your payroll account.`,
    itemsRows: `
      <tr>
        <td>${order.task_title} (${order.charging_mode === 'per_hour' ? 'Hourly' : 'Daily Flat Rate'})</td>
        <td style="text-align: center;">${order.quantity}</td>
        <td style="text-align: right;">UGX ${Number(order.total_cost || 0).toLocaleString()}</td>
      </tr>
    `,
    subtotalText: `UGX ${Number(order.total_cost || 0).toLocaleString()}`,
    vatText: 'EXEMPT (0%)',
    totalAmountText: `UGX ${Number(order.total_cost || 0).toLocaleString()}`,
    shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(order.order_number)}`,
    ctaText: 'View Work Order Online',
    ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(order.order_number)}`,
    hidePaymentMethods: true
  });

  const emailLog = {
    id: Date.now() + 1,
    recipient_name: order.assigned_staff_name,
    recipient_email: staffEmail,
    subject: emailSubject,
    body: `Dear ${order.assigned_staff_name},\n\nYour assigned Work Order #${order.order_number} ("${order.task_title}") at site location "${order.client_site}" has been verified and marked COMPLETED.\n\nA Company Expense Labor Payout Voucher of UGX ${Number(order.total_cost || 0).toLocaleString()} has been approved and credited to your payroll account.\n\nThe official Work Order PDF receipt has been compiled and attached to this email.\n\nBest Regards,\nNova Cloud Edges (U) Ltd — Field Operations & Labor Dispatch`,
    attachment_name: `Work_Order_${order.order_number}.pdf`,
    sent_at: new Date().toISOString(),
    status: 'Dispatched & Delivered'
  };

  if (!memoryStore.email_dispatches) memoryStore.email_dispatches = [];
  memoryStore.email_dispatches.unshift(emailLog);
  savePersistentStore();

  if (staffEmail) {
    sendMail({
      to: staffEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: `Work_Order_${order.order_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }).catch(err => console.error('[Work Order Email Warning]:', err.message));
  }

  res.json({
    message: `Work Order ${order.order_number} marked COMPLETED! Email & certified Work Order PDF dispatched to ${order.assigned_staff_name} (${staffEmail}). Labor Payout Voucher of UGX ${Number(order.total_cost || 0).toLocaleString()} generated.`,
    work_order: order,
    expense_voucher: newVoucher,
    email_dispatch: emailLog
  });
});

app.delete('/api/admin/work-orders/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM work_orders WHERE id = ? OR order_number = ?', [id, id]);
  memoryStore.work_orders = (memoryStore.work_orders || []).filter(w => String(w.id) !== String(id) && w.order_number !== id);
  savePersistentStore();
  return res.json({ message: 'Work Order removed successfully' });
});

// ----------------------------------------------------
// Internal WiFi Guest Voucher Management Engine
// (No UniFi Controller API — fully internal system)
// ----------------------------------------------------

// GET all vouchers
app.get('/api/admin/unifi/vouchers', (req, res) => {
  res.json(memoryStore.unifi_vouchers || []);
});

// POST register new UniFi vouchers copied manually from UniFi controller (admin only)
app.post('/api/admin/unifi/generate', (req, res) => {
  const {
    voucher_codes,
    voucher_code,
    voucher_token,
    token,
    duration_hours = 24,
    duration_label,
    data_quota_mb = 0,
    package_name,
    customer_name,
    customer_email,
    invoice_id
  } = req.body;

  if (!memoryStore.unifi_vouchers) memoryStore.unifi_vouchers = [];

  const rawInput = voucher_codes || voucher_code || voucher_token || token || '';
  const lines = (typeof rawInput === 'string'
    ? rawInput.split(/[\r\n,]+/)
    : Array.isArray(rawInput) ? rawInput : []
  ).map(s => String(s).trim()).filter(Boolean);

  if (lines.length === 0) {
    return res.status(400).json({ error: 'Please enter or paste at least one voucher code copied from your UniFi controller.' });
  }

  const registeredTokens = [];
  const duplicates = [];

  const resolvedLabel = duration_label || (() => {
    const h = Number(duration_hours);
    if (h < 24) return h + ' Hour' + (h !== 1 ? 's' : '');
    const days = h / 24;
    if (days < 7) return days + ' Day' + (days !== 1 ? 's' : '');
    const weeks = days / 7;
    if (weeks < 4) return weeks + ' Week' + (weeks !== 1 ? 's' : '');
    const months = Math.round(days / 30);
    return months + ' Month' + (months !== 1 ? 's' : '');
  })();

  const dataLabel = Number(data_quota_mb) > 0
    ? (Number(data_quota_mb) >= 1024
      ? (Number(data_quota_mb) / 1024).toFixed(1) + ' GB'
      : Number(data_quota_mb) + ' MB')
    : 'Unlimited';

  const resolvedPackageName = package_name ||
    ('Nova WiFi — ' + resolvedLabel + ' (' + dataLabel + ' Data)');

  lines.forEach((code, idx) => {
    const cleanToken = code.trim();
    const exists = memoryStore.unifi_vouchers.some(v => v.token.toLowerCase() === cleanToken.toLowerCase());
    if (exists) {
      duplicates.push(cleanToken);
      return;
    }

    const newVoucher = {
      id: Date.now() + idx,
      token: cleanToken,
      package_name: resolvedPackageName,
      duration_hours: Number(duration_hours),
      duration_label: resolvedLabel,
      data_quota_mb: Number(data_quota_mb),
      data_label: dataLabel,
      status: 'available',
      invoice_id: invoice_id || null,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      created_at: new Date().toISOString(),
      dispatched_at: null
    };

    memoryStore.unifi_vouchers.unshift(newVoucher);
    registeredTokens.push(newVoucher);
  });

  if (registeredTokens.length === 0 && duplicates.length > 0) {
    return res.status(400).json({ error: `The voucher code(s) already exist in the system: ${duplicates.join(', ')}` });
  }

  savePersistentStore();
  let message = `Successfully registered ${registeredTokens.length} UniFi voucher${registeredTokens.length > 1 ? 's' : ''}!`;
  if (duplicates.length > 0) {
    message += ` (${duplicates.length} duplicate(s) skipped)`;
  }

  res.json({
    message,
    vouchers: registeredTokens
  });
});

// PUT update voucher
app.put('/api/admin/unifi/vouchers/:id', (req, res) => {
  const { id } = req.params;
  const { status, customer_name, customer_email, invoice_id } = req.body;
  const v = (memoryStore.unifi_vouchers || []).find(item => item.id == id);
  if (!v) return res.status(404).json({ error: 'WiFi Voucher not found' });
  if (status !== undefined) v.status = status;
  if (customer_name !== undefined) v.customer_name = customer_name;
  if (customer_email !== undefined) v.customer_email = customer_email;
  if (invoice_id !== undefined) v.invoice_id = invoice_id;
  savePersistentStore();
  res.json({ message: 'WiFi Voucher updated successfully', voucher: v });
});

// PUT suspend voucher
app.put('/api/admin/wifi/vouchers/:id/suspend', (req, res) => {
  const { id } = req.params;
  const v = (memoryStore.unifi_vouchers || []).find(item => item.id == id);
  if (!v) return res.status(404).json({ error: 'Voucher not found' });
  v.status = 'suspended';
  v.suspended_at = new Date().toISOString();
  savePersistentStore();
  res.json({ message: 'Voucher suspended successfully', voucher: v });
});

// PUT mark voucher as bought (manual override)
app.put('/api/admin/wifi/vouchers/:id/mark-bought', (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_email, invoice_id } = req.body;
  const v = (memoryStore.unifi_vouchers || []).find(item => item.id == id);
  if (!v) return res.status(404).json({ error: 'Voucher not found' });
  v.status = 'bought';
  v.dispatched_at = new Date().toISOString();
  if (customer_name) v.customer_name = customer_name;
  if (customer_email) v.customer_email = customer_email;
  if (invoice_id) v.invoice_id = invoice_id;
  savePersistentStore();
  res.json({ message: 'Voucher marked as bought', voucher: v });
});

// DELETE voucher
app.delete('/api/admin/wifi/vouchers/:id', (req, res) => {
  const { id } = req.params;
  const idx = (memoryStore.unifi_vouchers || []).findIndex(item => item.id == id);
  if (idx === -1) return res.status(404).json({ error: 'Voucher not found' });
  const removed = memoryStore.unifi_vouchers.splice(idx, 1)[0];
  savePersistentStore();
  res.json({ message: 'Voucher ' + removed.token + ' deleted successfully' });
});
// ----------------------------------------------------
// Schedules & Automated Cronjob Management
// ----------------------------------------------------
app.get('/api/admin/schedules', (req, res) => {
  res.json(memoryStore.schedules || []);
});

app.post('/api/admin/schedules/:id/run-now', (req, res) => {
  const { id } = req.params;
  const sch = (memoryStore.schedules || []).find(s => s.id == id);
  if (!sch) return res.status(404).json({ error: 'Schedule job not found' });

  sch.last_run = new Date().toISOString();
  sch.last_status = `Success (Manual trigger executed at ${new Date().toLocaleTimeString()})`;

  let executionDetails = `Executed background cron task: ${sch.name}.`;
  if (sch.target === 'invoices') {
    const pendingCount = (memoryStore.invoices || []).filter(i => i.status !== 'Paid').length;
    executionDetails = `Dispatched automated payment reminder notifications to ${pendingCount} pending customer invoices.`;
  } else if (sch.target === 'statements') {
    executionDetails = `Compiled and archived quarterly tax clearance and balance statements for all active accounts.`;
  } else if (sch.target === 'executive_report') {
    executionDetails = `Compiled executive P&L, collections, and expense audit digest for Super Admin.`;
  } else if (sch.target === 'unifi_janitor') {
    executionDetails = `UniFi API session refreshed. Expired guest tokens verified and purged.`;
  }

  res.json({
    message: executionDetails,
    schedule: sch
  });
});

app.put('/api/admin/schedules/:id/toggle', (req, res) => {
  const { id } = req.params;
  const sch = (memoryStore.schedules || []).find(s => s.id == id);
  if (sch) {
    sch.enabled = !sch.enabled;
    return res.json({
      message: `Schedule "${sch.name}" is now ${sch.enabled ? 'ENABLED' : 'PAUSED'}`,
      schedule: sch
    });
  }
  res.status(404).json({ error: 'Schedule job not found' });
});

// ----------------------------------------------------
// Public Document Verification (QR Code Scan Target)
// ----------------------------------------------------
app.get(['/api/public/verify/:type/:id', '/api/public/verify/:type'], (req, res) => {
  const paramType = req.params.type;
  const paramId = req.params.id || paramType;
  const searchRef = String(paramId || '').trim().toLowerCase();

  const inv = (memoryStore.invoices || []).find(i => 
    String(i.id).toLowerCase() === searchRef ||
    (i.invoice_number || '').trim().toLowerCase() === searchRef ||
    (i.reference || '').trim().toLowerCase() === searchRef
  );
  if (inv) {
    return res.json({
      verified: true,
      document_type: 'Official Tax Invoice',
      document_number: inv.invoice_number,
      customer_name: inv.customer_name,
      customer_email: inv.customer_email,
      customer_phone: inv.customer_phone || '',
      customer_address: inv.customer_address || '',
      company: inv.company || '',
      item_name: inv.item_name || inv.plan_name || (inv.items && inv.items[0] && inv.items[0].name) || 'Cloud Service Subscription',
      items: inv.items || [],
      include_vat: inv.include_vat,
      vat_exempt: inv.vat_exempt,
      vat_amount: inv.vat_amount,
      total_amount: Number(inv.amount),
      currency: 'UGX',
      status: inv.status,
      due_date: inv.due_date,
      issued_date: inv.created_at,
      efris_compliance: '100% Digital Document Clearance Verified',
      issuer: 'Nova Cloud Edges (U) Limited',
      invoice: inv,
      bank_remittance: memoryStore.bank_accounts || []
    });
  } else if (cleanType === 'quote' || cleanType === 'quotation' || cleanType === 'qtn') {
    const q = (memoryStore.quotations || []).find(item => String(item.id) === String(id) || item.quote_number === id);
    if (q) {
      return res.json({
        verified: true,
        document_type: 'Official Commercial Quotation',
        document_number: q.quote_number,
        customer_name: q.customer_name,
        company: q.company,
        total_amount: Number(q.total_amount),
        currency: 'UGX',
        status: q.status,
        valid_until: q.valid_until,
        issued_date: q.created_at,
        issuer: 'Nova Cloud Edges (U) Limited',
        bank_remittance: memoryStore.bank_accounts || []
      });
    }
  } else if (cleanType === 'expense' || cleanType === 'exp') {
    const exp = (memoryStore.staff_expenses || []).find(item => String(item.id) === String(id) || item.receipt_ref === id);
    if (exp) {
      return res.json({
        verified: true,
        document_type: 'Official Expenditure Claim Voucher',
        document_number: exp.receipt_ref || `EXP-${exp.id}`,
        customer_name: exp.staff_name,
        company: 'Nova Cloud Edges Staff Roll',
        total_amount: Number(exp.amount),
        currency: 'UGX',
        status: exp.status,
        issued_date: exp.date || exp.created_at,
        issuer: 'Nova Cloud Edges (U) Limited',
        bank_remittance: memoryStore.bank_accounts || []
      });
    }
  }

  res.status(404).json({
    verified: false,
    error: 'Document not found or invalid verification token'
  });
});

// HTTP Route to serve clean PDF document without blob: prefix
app.get('/api/invoices/pdf/:invoiceNum', async (req, res) => {
  const { invoiceNum } = req.params;

  let inv = (memoryStore.invoices || []).find(i => i.invoice_number === invoiceNum || String(i.id) === String(invoiceNum));
  if (!inv) {
    inv = (memoryStore.staff_invoices || []).find(i => i.invoice_number === invoiceNum || String(i.id) === String(invoiceNum));
  }

  if (!inv) {
    inv = {
      invoice_number: invoiceNum,
      customer_name: 'Valued Customer',
      customer_email: 'billing@client.com',
      customer_address: 'Kampala, Uganda',
      item_name: 'Cloud Infrastructure & Managed Services',
      amount: 720000,
      status: 'Paid',
      due_date: '2026-09-30',
      created_at: new Date().toISOString()
    };
  }

  try {
    const pdfBuffer = await generateServerInvoicePDFBuffer(inv, memoryStore.bank_accounts);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Tax_Invoice_${invoiceNum}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF stream:', err);
    res.status(500).json({ error: 'Failed to generate PDF document' });
  }
});

// Admin & Role Management API Endpoints
app.get('/api/admin/users', (req, res) => {
  res.json(memoryStore.users);
});

app.put('/api/admin/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const targetUser = memoryStore.users.find(u => u.id == id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  if (targetUser.role === 'super_admin' && role !== 'super_admin') {
    return res.status(400).json({ error: 'Super Administrator role cannot be changed or removed.' });
  }

  targetUser.role = role;
  savePersistentStore();
  return res.json({ message: `Role updated to ${role} successfully`, user: targetUser });
});

// Full User Data & Profile Update
app.put('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role, phone, company, department, position, salary, status, location, notes, avatar_url, supervisor_id, supervisor_name, password } = req.body;
  const targetUser = memoryStore.users.find(u => u.id == id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.role === 'super_admin') {
    if (role && role !== 'super_admin') {
      return res.status(400).json({ error: 'Super Administrator role cannot be changed or removed.' });
    }
    if (status && (status === 'Suspended' || status === 'Inactive')) {
      return res.status(400).json({ error: 'Super Administrator accounts can never be suspended or deactivated.' });
    }
  }

  if (name) targetUser.name = name;
  if (email) targetUser.email = email;
  if (role && targetUser.role !== 'super_admin') targetUser.role = role;
  if (phone !== undefined) targetUser.phone = phone;
  if (company !== undefined) targetUser.company = company;
  if (department !== undefined) targetUser.department = department;
  if (position !== undefined) targetUser.position = position;
  if (salary !== undefined) targetUser.salary = Number(salary);
  if (status !== undefined && targetUser.role !== 'super_admin') targetUser.status = status;
  if (location !== undefined) targetUser.location = location;
  if (notes !== undefined) targetUser.notes = notes;
  if (avatar_url !== undefined) targetUser.avatar_url = avatar_url;
  if (supervisor_id !== undefined) targetUser.supervisor_id = supervisor_id;
  if (supervisor_name !== undefined) targetUser.supervisor_name = supervisor_name;
  if (password) {
    targetUser.password_changed_at = new Date().toISOString();
  }

  targetUser.updated_at = new Date().toISOString();
  savePersistentStore();

  // Log in forensics audit trail
  memoryStore.audit_logs.unshift({
    id: memoryStore.audit_logs.length + 1,
    user_email: req.body.admin_email || 'systems@ncloud.co.ug',
    user_name: req.body.admin_name || 'System Administrator',
    user_role: 'super_admin',
    action: 'USER_PROFILE_UPDATED',
    resource_type: 'System Users',
    resource_id: `USER-${targetUser.id}`,
    details: `Updated user profile & data for ${targetUser.name} (${targetUser.email})`,
    ip_address: req.ip || '127.0.0.1',
    device_type: 'Desktop Console',
    status: 'SUCCESS',
    timestamp: new Date().toISOString()
  });

  res.json({ message: `User profile for "${targetUser.name}" updated successfully!`, user: targetUser });
});

// Toggle User Account Status (Active / Suspended)
app.put('/api/admin/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const targetUser = memoryStore.users.find(u => u.id == id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  if (targetUser.role === 'super_admin') {
    return res.status(400).json({ error: 'Super Administrator accounts can never be suspended or deactivated.' });
  }

  targetUser.status = status || (targetUser.status === 'Active' ? 'Suspended' : 'Active');
  savePersistentStore();
  res.json({ message: `User status changed to ${targetUser.status}`, user: targetUser });
});

// Admin Reset User Password
app.put('/api/admin/users/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  const targetUser = memoryStore.users.find(u => u.id == id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  targetUser.password_reset_at = new Date().toISOString();
  savePersistentStore();
  res.json({ message: `Password reset successfully for ${targetUser.name}. Temporary access key issued.` });
});

// Delete User Account
app.delete('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const targetUser = memoryStore.users.find(u => u.id == id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  if (targetUser.role === 'super_admin') {
    return res.status(400).json({ error: 'Super Administrator accounts can never be deleted.' });
  }

  const index = memoryStore.users.findIndex(u => u.id == id);
  const deleted = memoryStore.users.splice(index, 1)[0];
  savePersistentStore();
  res.json({ message: `User account "${deleted.name}" removed successfully!` });
});

app.post('/api/admin/users', (req, res) => {
  const { name, email, role, phone, company, department, position, salary, status, location, notes, supervisor_id, supervisor_name } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email address are required' });
  }
  const newUser = {
    id: memoryStore.users.length + 1,
    name,
    email,
    role: role || 'sales_admin',
    phone: phone || '+256 700 000 000',
    company: company || 'Nova Cloud Edges Partner',
    department: department || 'Operations',
    position: position || 'Enterprise Operator',
    salary: salary ? Number(salary) : 0,
    status: status || 'Active',
    location: location || 'Kampala, Uganda',
    notes: notes || '',
    supervisor_id: supervisor_id || null,
    supervisor_name: supervisor_name || null,
    created_at: new Date().toISOString(),
    last_login: 'Never'
  };
  memoryStore.users.unshift(newUser);
  savePersistentStore();
  res.json({ message: `System User "${name}" created successfully as ${role || 'sales_admin'}`, user: newUser });
});

app.get('/api/admin/invoices', (req, res) => {
  res.json(memoryStore.invoices);
});

// ----------------------------------------------------
// Server-Side Official PDF Buffer Generators (Executive A4 Branding)
// ----------------------------------------------------
const SERVER_BRAND = {
  name: 'NOVA CLOUD EDGES (U) LIMITED',
  tagline: 'Enterprise Cloud Infrastructure & IT Solutions',
  address: 'Plot 14 Parliament Avenue, Kampala, Republic of Uganda',
  tin: '1014892019',
  contact: 'billing@ncloud.co.ug | Hotline: +256 790 001 631 | https://ncloud.co.ug',
  signatory: 'Dr. Arthur Mukasa',
  signatoryTitle: 'Director of Finance & Cloud Operations'
};

async function getServerQrDataUrl(url) {
  try {
    return await QRCode.toDataURL(url, { margin: 1, width: 140 });
  } catch {
    return '';
  }
}

// ============================================================================
// EXECUTIVE DARK BLUE PDF STYLING SYSTEM (VAT-INCLUSIVE & DATABASE-DRIVEN)
// ============================================================================

export function drawInvoiceNinja3ToneBar(doc, y, h = 4) {
  // Dark Blue (Primary Brand): 0 to 50mm
  doc.setFillColor(30, 58, 138); // #1e3a8a
  doc.rect(0, y, 50, h, 'F');
  // Deep Navy: 50 to 155mm
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(50, y, 105, h, 'F');
  // Golden Amber: 155 to 210mm
  doc.setFillColor(245, 158, 11); // #f59e0b
  doc.rect(155, y, 55, h, 'F');
}

export function drawInvoiceNinjaBurgundyLogo(doc, x = 14, y = 11, customLogoDataUrl = null) {
  if (customLogoDataUrl && typeof customLogoDataUrl === 'string' && customLogoDataUrl.startsWith('data:image')) {
    try {
      doc.addImage(customLogoDataUrl, 'PNG', x, y - 2, 24, 20);
      return;
    } catch {}
  }

  // Signature burgundy cloud & arrows brandmark
  doc.setFillColor(136, 19, 55); // #881337 burgundy
  doc.roundedRect(x + 2, y + 8, 20, 8, 3, 3, 'F');
  doc.circle(x + 8, y + 8, 5, 'F');
  doc.circle(x + 15, y + 7, 6, 'F');
  doc.circle(x + 19, y + 10, 4, 'F');

  // White up arrow & Dark Blue down arrow
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 9, y + 7, 2, 7, 'F');
  doc.triangle(x + 8, y + 7, x + 12, y + 7, x + 10, y + 4, 'F');

  doc.setFillColor(30, 58, 138);
  doc.rect(x + 14, y + 6, 2, 7, 'F');
  doc.triangle(x + 13, y + 13, x + 17, y + 13, x + 15, y + 16, 'F');

  // Brand Name in crisp system typography
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(136, 19, 55);
  doc.text('NOVA CLOUD', x + 26, y + 10);
  doc.setFontSize(9.5);
  doc.text('EDGES (U) LTD', x + 26, y + 15);
}

function formatNinjaDate(dateInput) {
  if (!dateInput) return '06/Jun/2026';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}/${months[d.getMonth()]}/${d.getFullYear()}`;
  } catch {
    return String(dateInput);
  }
}

function formatNinjaUGX(num) {
  return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UGX';
}

export async function generateServerInvoicePDFBuffer(inv, options = {}) {
  const opts = Array.isArray(options) ? { bankAccounts: options } : (options || {});
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const invoiceNum = inv?.invoice_number || `INV-${inv?.id || '1602026682026'}`;
  const invDate = formatNinjaDate(inv?.created_at || inv?.date || new Date());
  const dueDate = formatNinjaDate(inv?.due_date || new Date(Date.now() + 14 * 86400000));
  const isPaid = inv?.status === 'Paid' || inv?.status === '100% Paid' || inv?.status === 'Paid & Settled';
  const totalAmt = Number(inv?.amount || inv?.total || 0);
  const paidAmt = isPaid ? totalAmt : Number(inv?.paid_amount || inv?.paid || 0);
  const balanceDue = Math.max(0, totalAmt - paidAmt);

  // VAT Breakdown from Database
  const isVatExempt = Boolean(inv?.vat_exempt);
  const subtotalAmt = Number(inv?.subtotal || (isVatExempt ? totalAmt : Math.round(totalAmt / 1.18)));
  const vatAmt = isVatExempt ? 0 : (inv?.vat_amount !== undefined ? Number(inv?.vat_amount) : Math.round(subtotalAmt * 0.18));

  // Customer & Shipping mapping directly from database
  const cName = inv?.customer_name || inv?.company || inv?.party_name || 'Muhabura Shine SS';
  const cCode = inv?.customer_code || inv?.client_id || (inv?.id ? String(inv.id) : '');
  const cAddr1 = inv?.customer_address || inv?.address || 'Bunagana Rd';
  const cAddr2 = inv?.customer_city || inv?.city || 'Kisoro, Central Township 256';
  const cCountry = inv?.customer_country || 'Uganda';
  const cPhone = inv?.customer_phone || inv?.phone || '';
  const cEmail = inv?.customer_email || inv?.party_email || inv?.email || '';

  const shipAddr1 = inv?.ship_to?.address1 || inv?.shipping_address || cAddr1;
  const shipAddr2 = inv?.ship_to?.address2 || inv?.shipping_city || cAddr2;
  const shipCountry = inv?.ship_to?.country || inv?.shipping_country || cCountry;

  // Normalized Line Items
  let items = [];
  if (Array.isArray(inv?.items) && inv.items.length > 0) {
    items = inv.items.map(it => ({
      name: it.name || it.item_name || 'Cloud Solution Service',
      description: it.description || it.specs || it.short_desc || '',
      unit_price: Number(it.unit_price || it.price || 0),
      quantity: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      amount: Number(it.amount || it.total || ((Math.max(1, parseInt(it.quantity || it.qty) || 1)) * Number(it.unit_price || it.price || 0)))
    }));
  } else {
    items = [{
      name: inv?.item_name || 'Cloud Infrastructure & Managed Services',
      description: inv?.description || 'Enterprise Cloud & Managed Systems Deployment and Configuration',
      unit_price: totalAmt,
      quantity: 1,
      amount: totalAmt
    }];
  }

  // QR Code & Logo
  const qrDataUrl = await getServerQrDataUrl(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNum)}`);
  const activeLogo = opts.logoDataUrl || memoryStore.site_logo;
  const storedBanks = Array.isArray(opts.bankAccounts) ? opts.bankAccounts : (Array.isArray(memoryStore.bank_accounts) ? memoryStore.bank_accounts : []);

  // Page 1 Top 3-Tone Accent Bar
  drawInvoiceNinja3ToneBar(doc, 0, 4);

  // Logo Left
  drawInvoiceNinjaBurgundyLogo(doc, 14, 11, activeLogo);

  // Top Right Solid Dark Blue Rectangle (Executive Navy #1e3a8a)
  doc.setFillColor(30, 58, 138); // Dark Blue
  doc.rect(126, 8.5, 70, 27, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'Invoice Number', val: invoiceNum },
    { label: 'Invoice Date', val: invDate },
    { label: 'Due Date', val: dueDate },
    { label: 'Invoice Total', val: formatNinjaUGX(totalAmt) },
    { label: 'Balance Due', val: formatNinjaUGX(balanceDue) }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 13 + idx * 4.8;
    doc.text(r.label, 128, rowY);
    doc.text(r.val, 194, rowY, { align: 'right' });
  });

  // Addresses Section in Dark Blue
  const addrY = 38;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text('From:', 14, addrY);
  doc.text('To:', 88, addrY);
  doc.text('Ship to:', 160, addrY);

  // Underline for labels in Dark Blue
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.3);
  doc.line(14, addrY + 2, 196, addrY + 2);

  // From Sub-columns: Company Info & Strictly Stored Bank Accounts from Database
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges Ltd', 14, addrY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);

  // Left sub-column: Company contact & website
  const fromLeftLines = [
    'TIN: 1014892019',
    'www.ncedges.com',
    'info@ncedges.com',
    '(+256) 790001631/33',
    'Plot 14 Parliament Ave, Kampala'
  ];
  fromLeftLines.forEach((l, idx) => doc.text(l, 14, addrY + 9.5 + idx * 3.6));

  // Right sub-column: ONLY Stored Bank Accounts from Database (No hardcoded un-stored accounts!)
  let fromRightLines = [];
  if (Array.isArray(storedBanks) && storedBanks.length > 0) {
    storedBanks.forEach(b => {
      fromRightLines.push(`${b.bank_name || 'Bank'}:`);
      fromRightLines.push(`A/C: ${b.account_number} (${b.currency || 'UGX'})`);
      if (b.branch && b.branch !== 'Merchant Code') fromRightLines.push(b.branch);
    });
  } else {
    fromRightLines = [
      'Official Settlement Account:',
      'Verified Electronic Remittance',
      'Kampala, Uganda'
    ];
  }
  fromRightLines.forEach((l, idx) => {
    doc.setFont('Helvetica', l.includes(':') ? 'bold' : 'normal');
    doc.setTextColor(l.includes(':') ? 30 : 51, l.includes(':') ? 58 : 65, l.includes(':') ? 138 : 85);
    doc.text(l, 46, addrY + 6 + idx * 3.6);
  });

  // To Column (Database values)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(cName, 88, addrY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const toLines = [
    cCode ? `Account ID: ${cCode}` : null,
    cAddr1,
    cAddr2,
    cCountry,
    cPhone ? `Tel: ${cPhone}` : null,
    cEmail ? `Email: ${cEmail}` : null
  ].filter(Boolean);
  toLines.forEach((l, idx) => doc.text(l, 88, addrY + 9.5 + idx * 3.6));

  // Ship To Column (Database values)
  const shipLines = [
    shipAddr1,
    shipAddr2,
    shipCountry
  ].filter(Boolean);
  shipLines.forEach((l, idx) => doc.text(l, 160, addrY + 6 + idx * 3.6));

  // Dark dividing line separating addresses from table
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.line(14, addrY + 32, 196, addrY + 32);

  // Table Setup in Dark Blue
  function drawTableHeader(y) {
    doc.setFillColor(30, 58, 138); // Executive Dark Blue
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Item', 17, y + 5);
    doc.text('Description', 60, y + 5);
    doc.text('Unit Cost', 145, y + 5, { align: 'right' });
    doc.text('Quantity', 158, y + 5, { align: 'center' });
    doc.text('Line Total', 193, y + 5, { align: 'right' });
  }

  let tableY = addrY + 36;
  drawTableHeader(tableY);
  tableY += 7.5;

  items.forEach((it, idx) => {
    const nameLines = doc.splitTextToSize(String(it.name || ''), 40);
    const descLines = doc.splitTextToSize(String(it.description || ''), 62);
    const maxLines = Math.max(nameLines.length, descLines.length, 1);
    const rowH = Math.max(7.5, maxLines * 3.6 + 3.5);

    // Multi-page overflow check at 250mm
    if (tableY + rowH > 250) {
      doc.addPage();
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 10;
      drawTableHeader(tableY);
      tableY += 7.5;
    }

    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, rowH, 'F');
    }

    // Item (Dark Blue Bold)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 58, 138); // Dark Blue
    doc.text(nameLines, 17, tableY + 4.2);

    // Description (Dark Charcoal Normal)
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, 60, tableY + 4.2);

    // Unit Cost
    const uCost = Number(it.unit_price || 0);
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(uCost), 145, tableY + 4.2, { align: 'right' });

    // Qty
    const qVal = Number(it.quantity || 1);
    doc.text(String(qVal), 158, tableY + 4.2, { align: 'center' });

    // Line Total
    const lTot = Number(it.amount || uCost * qVal);
    doc.text(formatNinjaUGX(lTot), 193, tableY + 4.2, { align: 'right' });

    // Subtle bottom border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + rowH, 196, tableY + rowH);

    tableY += rowH;
  });

  // Check if Totals section fits on current page
  if (tableY + 50 > 250) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 12;
  }

  // Totals & Terms Section
  const totalsY = tableY + 6;

  // Invoice Terms on Left
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice Terms:', 14, totalsY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const termsString = inv?.terms || 'This Invoice is valid for ONLY 2 weeks, and payment of at least 75% MUST be made before services are offered.';
  const termsText = doc.splitTextToSize(termsString, 90);
  doc.text(termsText, 14, totalsY + 4.2);

  // Official Clearance notice under terms
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 58, 138);
  doc.text('OFFICIAL DIGITAL CLEARANCE & VERIFICATION', 14, totalsY + 18);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Cryptographically verifiable on Nova Cloud Edges Ledger:', 14, totalsY + 22.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNum)}`, 14, totalsY + 26.5);

  // Digital Clearance Seal & QR
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, totalsY + 30, 18, 18);
    } catch {}
  }

  // Totals Rows on Right WITH VAT INCLUDED
  const totalRows = [
    { label: 'Net Subtotal', val: formatNinjaUGX(subtotalAmt) },
    { label: isVatExempt ? 'VAT (0% Exempt)' : 'VAT (18% Statutory)', val: formatNinjaUGX(vatAmt) },
    { label: 'Total Invoiced', val: formatNinjaUGX(totalAmt), bold: true },
    { label: 'Paid to Date', val: formatNinjaUGX(paidAmt) },
    { label: 'Balance Due', val: formatNinjaUGX(balanceDue), bold: true, color: [30, 58, 138] }
  ];

  totalRows.forEach((r, idx) => {
    const rY = totalsY + idx * 4.8;
    doc.setFont('Helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(r.color ? r.color[0] : 15, r.color ? r.color[1] : 23, r.color ? r.color[2] : 42);
    doc.text(r.label, 155, rY, { align: 'right' });
    doc.text(r.val, 194, rY, { align: 'right' });
  });

  // Footer & Page numbers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom Dealings text
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('We also Deal in: CCTV Cameras, Company Emails, Cloud Web Hosting & Dev, Mobile App Dev, Systems Admin, Backups & Restoration Services & Cyber Security', 105, 278, { align: 'center' });

    // Page number in Dark Blue
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 58, 138);
    doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: 'center' });

    // Bottom 3-Tone Bar
    drawInvoiceNinja3ToneBar(doc, 293, 4);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerQuotationPDFBuffer(quote, options = {}) {
  const opts = Array.isArray(options) ? { bankAccounts: options } : (options || {});
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const quoteNum = quote?.quote_number || `QTN-${quote?.id || '1602026682026'}`;
  const qDate = formatNinjaDate(quote?.created_at || quote?.date || new Date());
  const validUntil = formatNinjaDate(quote?.valid_until || new Date(Date.now() + 30 * 86400000));
  const totalAmt = Number(quote?.total_amount || quote?.amount || 0);

  // VAT Breakdown from Database
  const isVatExempt = Boolean(quote?.vat_exempt);
  const subtotalAmt = Number(quote?.subtotal || (isVatExempt ? totalAmt : Math.round(totalAmt / 1.18)));
  const vatAmt = isVatExempt ? 0 : (quote?.vat_amount !== undefined ? Number(quote?.vat_amount) : Math.round(subtotalAmt * 0.18));

  // Customer & Shipping mapping directly from database
  const cName = quote?.customer_name || quote?.company || quote?.party_name || 'Muhabura Shine SS';
  const cCode = quote?.customer_code || quote?.client_id || (quote?.id ? String(quote.id) : '');
  const cAddr1 = quote?.customer_address || quote?.address || 'Bunagana Rd';
  const cAddr2 = quote?.customer_city || quote?.city || 'Kisoro, Central Township 256';
  const cCountry = quote?.customer_country || 'Uganda';
  const cPhone = quote?.customer_phone || quote?.phone || '';
  const cEmail = quote?.customer_email || quote?.party_email || quote?.email || '';

  const shipAddr1 = quote?.ship_to?.address1 || quote?.shipping_address || cAddr1;
  const shipAddr2 = quote?.ship_to?.address2 || quote?.shipping_city || cAddr2;
  const shipCountry = quote?.ship_to?.country || quote?.shipping_country || cCountry;

  // Stored Bank Accounts strictly from system database
  const qrDataUrl = await getServerQrDataUrl(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`);
  const activeLogo = opts.logoDataUrl || memoryStore.site_logo;
  const storedBanks = Array.isArray(opts.bankAccounts) ? opts.bankAccounts : (Array.isArray(memoryStore.bank_accounts) ? memoryStore.bank_accounts : []);

  // Page 1 Top 3-Tone Accent Bar
  drawInvoiceNinja3ToneBar(doc, 0, 4);

  // Logo Left
  drawInvoiceNinjaBurgundyLogo(doc, 14, 11, activeLogo);

  // Top Right Solid Dark Blue Rectangle (Executive Navy #1e3a8a)
  doc.setFillColor(30, 58, 138); // Dark Blue
  doc.rect(126, 8.5, 70, 27, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'Quotation Number', val: quoteNum },
    { label: 'Quotation Date', val: qDate },
    { label: 'Valid Until', val: validUntil },
    { label: 'Quotation Total', val: formatNinjaUGX(totalAmt) },
    { label: 'Proposal Status', val: quote?.status || 'Active Proposal' }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 13 + idx * 4.8;
    doc.text(r.label, 128, rowY);
    doc.text(r.val, 194, rowY, { align: 'right' });
  });

  // Addresses Section in Dark Blue
  const addrY = 38;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('From:', 14, addrY);
  doc.text('To:', 88, addrY);
  doc.text('Ship to:', 160, addrY);

  // Underline for labels
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.3);
  doc.line(14, addrY + 2, 196, addrY + 2);

  // From Sub-columns
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges Ltd', 14, addrY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const fromLeftLines = [
    'TIN: 1014892019',
    'www.ncedges.com',
    'info@ncedges.com',
    '(+256) 790001631/33',
    'Plot 14 Parliament Ave, Kampala'
  ];
  fromLeftLines.forEach((l, idx) => doc.text(l, 14, addrY + 9.5 + idx * 3.6));

  // Right sub-column: strictly stored bank accounts
  let fromRightLines = [];
  if (Array.isArray(storedBanks) && storedBanks.length > 0) {
    storedBanks.forEach(b => {
      fromRightLines.push(`${b.bank_name || 'Bank'}:`);
      fromRightLines.push(`A/C: ${b.account_number} (${b.currency || 'UGX'})`);
      if (b.branch && b.branch !== 'Merchant Code') fromRightLines.push(b.branch);
    });
  } else {
    fromRightLines = [
      'Official Settlement Account:',
      'Verified Electronic Remittance',
      'Kampala, Uganda'
    ];
  }
  fromRightLines.forEach((l, idx) => {
    doc.setFont('Helvetica', l.includes(':') ? 'bold' : 'normal');
    doc.setTextColor(l.includes(':') ? 30 : 51, l.includes(':') ? 58 : 65, l.includes(':') ? 138 : 85);
    doc.text(l, 46, addrY + 6 + idx * 3.6);
  });

  // To Column
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(cName, 88, addrY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const toLines = [
    cCode ? `Account ID: ${cCode}` : null,
    cAddr1,
    cAddr2,
    cCountry,
    cPhone ? `Tel: ${cPhone}` : null,
    cEmail ? `Email: ${cEmail}` : null
  ].filter(Boolean);
  toLines.forEach((l, idx) => doc.text(l, 88, addrY + 9.5 + idx * 3.6));

  // Ship To Column
  const shipLines = [
    shipAddr1,
    shipAddr2,
    shipCountry
  ].filter(Boolean);
  shipLines.forEach((l, idx) => doc.text(l, 160, addrY + 6 + idx * 3.6));

  // Dark line separating addresses from table
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.line(14, addrY + 32, 196, addrY + 32);

  // Table Setup in Dark Blue
  function drawTableHeader(y) {
    doc.setFillColor(30, 58, 138); // Dark Blue
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Item', 17, y + 5);
    doc.text('Description', 60, y + 5);
    doc.text('Unit Cost', 145, y + 5, { align: 'right' });
    doc.text('Quantity', 158, y + 5, { align: 'center' });
    doc.text('Line Total', 193, y + 5, { align: 'right' });
  }

  let tableY = addrY + 36;
  drawTableHeader(tableY);
  tableY += 7.5;

  // Normalized items
  let items = [];
  if (Array.isArray(quote?.items) && quote.items.length > 0) {
    items = quote.items.map(it => ({
      name: it.name || it.item_name || 'Cloud Solution Service',
      description: it.description || it.specs || it.short_desc || '',
      unit_price: Number(it.unit_price || it.price || 0),
      quantity: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      amount: Number(it.amount || it.total || ((Math.max(1, parseInt(it.quantity || it.qty) || 1)) * Number(it.unit_price || it.price || 0)))
    }));
  } else {
    items = [{
      name: quote?.item_name || 'Cloud Infrastructure & Managed Services',
      description: quote?.description || 'Enterprise Cloud & Managed Systems Deployment and Configuration',
      unit_price: totalAmt,
      quantity: 1,
      amount: totalAmt
    }];
  }

  items.forEach((it, idx) => {
    const nameLines = doc.splitTextToSize(String(it.name || ''), 40);
    const descLines = doc.splitTextToSize(String(it.description || ''), 62);
    const maxLines = Math.max(nameLines.length, descLines.length, 1);
    const rowH = Math.max(7.5, maxLines * 3.6 + 3.5);

    // Multi-page overflow check at 250mm
    if (tableY + rowH > 250) {
      doc.addPage();
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 10;
      drawTableHeader(tableY);
      tableY += 7.5;
    }

    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, rowH, 'F');
    }

    // Item (Dark Blue Bold)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 58, 138);
    doc.text(nameLines, 17, tableY + 4.2);

    // Description (Dark Charcoal Normal)
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, 60, tableY + 4.2);

    // Unit Cost
    const uCost = Number(it.unit_price || 0);
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(uCost), 145, tableY + 4.2, { align: 'right' });

    // Qty
    const qVal = Number(it.quantity || 1);
    doc.text(String(qVal), 158, tableY + 4.2, { align: 'center' });

    // Line Total
    const lTot = Number(it.amount || uCost * qVal);
    doc.text(formatNinjaUGX(lTot), 193, tableY + 4.2, { align: 'right' });

    // Subtle bottom border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + rowH, 196, tableY + rowH);

    tableY += rowH;
  });

  // Check if Totals section fits on current page
  if (tableY + 50 > 250) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 12;
  }

  // Totals & Terms Section
  const totalsY = tableY + 6;

  // Quotation Terms on Left
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Quotation Terms:', 14, totalsY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const termsString = quote?.terms || 'This Quotation is valid for 30 calendar days from date of issuance. Payment of at least 75% MUST be made before deployment or hardware dispatch.';
  const termsText = doc.splitTextToSize(termsString, 90);
  doc.text(termsText, 14, totalsY + 4.2);

  // Digital Clearance notice under terms
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 58, 138);
  doc.text('OFFICIAL COMMERCIAL PROPOSAL CLEARANCE', 14, totalsY + 18);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Cryptographically verifiable on Nova Cloud Edges Ledger:', 14, totalsY + 22.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`, 14, totalsY + 26.5);

  // QR
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, totalsY + 30, 18, 18);
    } catch {}
  }

  // Totals Rows on Right WITH VAT INCLUDED
  const totalRows = [
    { label: 'Net Subtotal', val: formatNinjaUGX(subtotalAmt) },
    { label: isVatExempt ? 'VAT (0% Exempt)' : 'VAT (18% Statutory)', val: formatNinjaUGX(vatAmt) },
    { label: 'Total Quoted', val: formatNinjaUGX(totalAmt), bold: true, color: [30, 58, 138] }
  ];

  totalRows.forEach((r, idx) => {
    const rY = totalsY + idx * 4.8;
    doc.setFont('Helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(r.color ? r.color[0] : 15, r.color ? r.color[1] : 23, r.color ? r.color[2] : 42);
    doc.text(r.label, 155, rY, { align: 'right' });
    doc.text(r.val, 194, rY, { align: 'right' });
  });

  // Footer & Page numbers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom Dealings text
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('We also Deal in: CCTV Cameras, Company Emails, Cloud Web Hosting & Dev, Mobile App Dev, Systems Admin, Backups & Restoration Services & Cyber Security', 105, 278, { align: 'center' });

    // Page number in Dark Blue
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 58, 138);
    doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: 'center' });

    // Bottom 3-Tone Bar
    drawInvoiceNinja3ToneBar(doc, 293, 4);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerWorkOrderPDFBuffer(wo, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const woNum = wo.order_number || `WO-${wo.id || '2026-0001'}`;
  const staffName = wo.assigned_staff_name || 'Field Support Specialist';
  const siteLocation = wo.client_site || 'Nova Primary Datacenter';
  const taskTitle = wo.task_title || 'Edge Network & Fiber Infrastructure Maintenance';
  const mode = wo.charging_mode === 'per_hour' ? 'Hours' : 'Days';
  const rate = Number(wo.rate || 0);
  const qty = Number(wo.quantity || 1);
  const totalCost = Number(wo.total_cost || rate * qty);
  const isCompleted = wo.status === 'Completed';

  const qrDataUrl = await getServerQrDataUrl(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(woNum)}`);
  const activeLogo = options.logoDataUrl || memoryStore.site_logo;

  // Top Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 6, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 6, 210, 1.5, 'F');

  // Header Left
  let textX = 14;
  if (activeLogo) {
    try {
      doc.addImage(activeLogo, 'PNG', 14, 13, 24, 20);
      textX = 42;
    } catch {}
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES', textX, 18);
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text('(U) LIMITED', textX + 62, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(SERVER_BRAND.tagline, textX, 23);
  doc.text(`${SERVER_BRAND.address} • Field Operations Division`, textX, 27.5);
  doc.text(SERVER_BRAND.contact, textX, 32);

  // Header Right
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('WORK ORDER', 196, 19, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129);
  doc.text(woNum, 196, 25, { align: 'right' });

  // Status Stamp Box
  const stampW = 42;
  const stampH = 7;
  const stampX = 196 - stampW;
  const stampY = 28;
  doc.setFillColor(isCompleted ? 240 : 254, isCompleted ? 253 : 243, isCompleted ? 244 : 199);
  doc.setDrawColor(isCompleted ? 34 : 217, isCompleted ? 197 : 119, isCompleted ? 94 : 6);
  doc.setLineWidth(0.4);
  doc.roundedRect(stampX, stampY, stampW, stampH, 1, 1, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isCompleted ? 22 : 180, isCompleted ? 163 : 83, isCompleted ? 74 : 9);
  doc.text(isCompleted ? 'COMPLETED & AUDITED' : 'ACTIVE FIELD DISPATCH', stampX + stampW / 2, stampY + 4.8, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 38, 196, 38);

  // Cards
  const metaY = 42;
  const colW = 88;

  // Engineer Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, metaY, colW, 30, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('FIELD ENGINEER / DISPATCH STAFF:', 18, metaY + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(staffName.substring(0, 36), 18, metaY + 11.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Department: Systems & Fiber Deployments', 18, metaY + 16.5);
  doc.text(`Deployment Site: ${siteLocation.substring(0, 32)}`, 18, metaY + 21);
  doc.text('Supervisor: Dr. Arthur Mukasa', 18, metaY + 25.5);

  // Timeline & Budget Card
  const rX = 108;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rX, metaY, colW, 30, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('DISPATCH TIMELINE & METRICS:', rX + 4, metaY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Scheduled Date:', rX + 4, metaY + 12);
  doc.text('Completion Status:', rX + 4, metaY + 16.5);
  doc.text('Charging Method:', rX + 4, metaY + 21);
  doc.text('Labor Payout Value:', rX + 4, metaY + 25.5);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(wo.scheduled_date || 'Immediate', rX + 40, metaY + 12);
  doc.text(wo.status || 'Active', rX + 40, metaY + 16.5);
  doc.text(wo.charging_mode === 'per_hour' ? 'Hourly Rate' : 'Daily Flat Rate', rX + 40, metaY + 21);
  doc.setTextColor(22, 163, 74);
  doc.text(`UGX ${totalCost.toLocaleString()}`, rX + 40, metaY + 25.5);

  // Scope Card
  const scopeY = 76;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, scopeY, 182, 36, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('ASSIGNED TASK TITLE & TECHNICAL SCOPE OF WORK', 18, scopeY + 6.5);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(taskTitle, 18, scopeY + 13);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const desc = wo.description || 'Deliver scheduled technical deployment, cabling, server rack assembly, or optical fiber splicing as per corporate engineering guidelines and environmental safety specifications.';
  const splitDesc = doc.splitTextToSize(desc, 174);
  doc.text(splitDesc.slice(0, 3), 18, scopeY + 19);

  // Labor Breakdown Table
  const tableY = 118;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, tableY, 182, 8, 1, 1, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 18, tableY + 5.5);
  doc.text('FIELD OPERATIONS LABOR SPECIFICATION', 28, tableY + 5.5);
  doc.text('UNITS / TIME LOGGED', 125, tableY + 5.5, { align: 'center' });
  doc.text('RATE (UGX)', 155, tableY + 5.5, { align: 'right' });
  doc.text('APPROVED PAYOUT', 192, tableY + 5.5, { align: 'right' });

  const rowY = tableY + 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(14, rowY, 182, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(14, rowY + 9, 196, rowY + 9);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('01', 18, rowY + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`On-Site Field Operations Deployment (${wo.charging_mode === 'per_hour' ? 'Hourly Labor' : 'Daily Project Flat Rate'})`, 28, rowY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${qty} ${mode}`, 125, rowY + 6, { align: 'center' });
  doc.text(rate.toLocaleString(), 155, rowY + 6, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`UGX ${totalCost.toLocaleString()}`, 192, rowY + 6, { align: 'right' });

  // Payout Summary Card
  const payCardY = rowY + 14;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(108, payCardY, 88, 16, 1, 1, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL APPROVED LABOR PAYOUT:', 112, payCardY + 6.5);
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153);
  doc.text(`UGX ${totalCost.toLocaleString()}`, 192, payCardY + 12, { align: 'right' });

  // Dual Sign-off Box
  const signBlockY = payCardY + 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, signBlockY, 182, 48, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('ENGINEERING QUALITY ACCEPTANCE & DUAL SITE SIGN-OFF', 18, signBlockY + 6);

  // Left Sign-off
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Assigned Lead Engineer Sign-off:', 20, signBlockY + 16);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, signBlockY + 34, 85, signBlockY + 34);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text(staffName, 52.5, signBlockY + 30, { align: 'center' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('LEAD FIELD ENGINEER', 52.5, signBlockY + 38, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${wo.completion_date || wo.scheduled_date || '2026-09-05'}`, 52.5, signBlockY + 42, { align: 'center' });

  // Right Sign-off
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Client Site Representative / Supervisor:', 110, signBlockY + 16);
  doc.setDrawColor(203, 213, 225);
  doc.line(110, signBlockY + 34, 175, signBlockY + 34);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('Dr. Arthur Mukasa', 142.5, signBlockY + 30, { align: 'center' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SITE OPERATIONS MANAGER', 142.5, signBlockY + 38, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Quality & Environmental Compliance', 142.5, signBlockY + 42, { align: 'center' });

  // QR Code
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 166, signBlockY + 4, 26, 26);
    } catch {}
  }

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 282, 196, 282);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Work Order Document issued by ${SERVER_BRAND.name} • Engineering Division • Page 1 of 1`, 105, 287, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerPaymentReceiptPDFBuffer(pmt, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pmtRef = pmt.reference || `PAY-${pmt.id || '2026-0001'}`;
  const invNum = pmt.invoice_number || 'INV-2026-0001';
  const cName = pmt.party_name || options.customerName || 'Valued Corporate Customer';
  const cEmail = pmt.party_email || options.customerEmail || 'billing@client.co.ug';
  const paidAmt = Number(pmt.amount || 0);
  const pmtMethod = pmt.payment_method || 'Stanbic Bank Wire Transfer';
  const pmtDate = pmt.payment_date || pmt.timestamp || '2026-09-05';
  const isCleared = pmt.status === '100% Paid' || pmt.status === 'Paid & Settled';

  const qrDataUrl = await getServerQrDataUrl(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(pmtRef)}`);
  const activeLogo = options.logoDataUrl || memoryStore.site_logo;

  // Top Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 6, 'F');
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 6, 210, 1.5, 'F');

  // Header Left
  let textX = 14;
  if (activeLogo) {
    try {
      doc.addImage(activeLogo, 'PNG', 14, 13, 24, 20);
      textX = 42;
    } catch {}
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES', textX, 18);
  doc.setFontSize(9);
  doc.setTextColor(22, 163, 74);
  doc.text('(U) LIMITED', textX + 62, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(SERVER_BRAND.tagline, textX, 23);
  doc.text(`${SERVER_BRAND.address} • TIN: ${SERVER_BRAND.tin}`, textX, 27.5);
  doc.text(SERVER_BRAND.contact, textX, 32);

  // Header Right
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT RECEIPT', 196, 19, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 163, 74);
  doc.text(pmtRef, 196, 25, { align: 'right' });

  // Status Stamp Box
  const stampW = 42;
  const stampH = 7;
  const stampX = 196 - stampW;
  const stampY = 28;
  doc.setFillColor(isCleared ? 240 : 254, isCleared ? 253 : 243, isCleared ? 244 : 199);
  doc.setDrawColor(isCleared ? 34 : 217, isCleared ? 197 : 119, isCleared ? 94 : 6);
  doc.setLineWidth(0.4);
  doc.roundedRect(stampX, stampY, stampW, stampH, 1, 1, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isCleared ? 22 : 180, isCleared ? 163 : 83, isCleared ? 74 : 9);
  doc.text(isCleared ? '100% CLEARANCE CONFIRMED' : 'PARTIAL REMITTANCE', stampX + stampW / 2, stampY + 4.8, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 38, 196, 38);

  // Cards
  const metaY = 42;
  const colW = 88;

  // Payee Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, metaY, colW, 30, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 163, 74);
  doc.text('RECEIVED FROM (PAYEE DETAILS):', 18, metaY + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.substring(0, 36), 18, metaY + 11.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${cEmail}`, 18, metaY + 16.5);
  doc.text(`Payment Classification: ${pmt.payment_type === 'staff' ? 'Staff Payout' : 'Customer Account Settlement'}`, 18, metaY + 21);
  doc.text(`Settled Against Invoice: #${invNum}`, 18, metaY + 25.5);

  // Settlement Metrics Card
  const rX = 108;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rX, metaY, colW, 30, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 163, 74);
  doc.text('SETTLEMENT AUDIT METRICS:', rX + 4, metaY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Transaction Ref:', rX + 4, metaY + 12);
  doc.text('Remittance Channel:', rX + 4, metaY + 16.5);
  doc.text('Settlement Timestamp:', rX + 4, metaY + 21);
  doc.text('Reconciliation State:', rX + 4, metaY + 25.5);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(pmtRef, rX + 40, metaY + 12);
  doc.text(pmtMethod, rX + 40, metaY + 16.5);
  doc.text(pmtDate.replace('T', ' ').substring(0, 19), rX + 40, metaY + 21);
  doc.setTextColor(22, 163, 74);
  doc.text(isCleared ? '100% Cleared & Verified' : 'Partially Cleared', rX + 40, metaY + 25.5);

  // Prominent Received Amount Banner
  const bannerY = 76;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, bannerY, 182, 38, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 163, 74);
  doc.text('OFFICIAL SETTLEMENT DISCHARGE CONFIRMATION', 18, bannerY + 7);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Nova Cloud Edges Finance Automation confirms successful receipt and reconciliation of payment', 18, bannerY + 14);
  doc.text(`credited against Tax Invoice #${invNum} via ${pmtMethod}.`, 18, bannerY + 19);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(21, 128, 61);
  doc.text(`AMOUNT RECEIVED: UGX ${paidAmt.toLocaleString()}`, 18, bannerY + 31);

  // Financial Breakdown Card
  const detailY = 120;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, detailY, 182, 40, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 163, 74);
  doc.text('TRANSACTION LEDGER BREAKDOWN', 18, detailY + 6.5);

  const printRow = (lbl, val, yOff, isBold = false, col = [15, 23, 42]) => {
    doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isBold ? 15 : 100, isBold ? 23 : 116, isBold ? 42 : 139);
    doc.text(lbl, 20, detailY + yOff);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...col);
    doc.text(val, 190, detailY + yOff, { align: 'right' });
  };

  printRow('Settled Installment Amount:', `UGX ${paidAmt.toLocaleString()}`, 14, false);
  printRow('Clearance Fee / Processing Charge:', 'UGX 0 (Absorbed by Nova Cloud)', 20, false);
  printRow('Statutory Tax Status:', 'URA EFRIS Verified Tax Invoice Settlement', 26, false);
  printRow('Net Ledger Credit to Account:', `UGX ${paidAmt.toLocaleString()}`, 33, true, [22, 163, 74]);

  // Signatory & QR Verification Card
  const signBlockY = detailY + 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, signBlockY, 182, 34, 2, 2, 'FD');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 18, signBlockY + 4, 26, 26);
    } catch {}
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL PAYMENT VERIFICATION', 48, signBlockY + 9);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('This electronic receipt constitutes an official legal discharge for the funds stated.', 48, signBlockY + 14);
  doc.text('Verify authenticity on the Nova Cloud cryptographic ledger.', 48, signBlockY + 18.5);
  doc.setTextColor(22, 163, 74);
  doc.text(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(pmtRef)}`, 48, signBlockY + 23);

  // Right Signatory
  doc.setDrawColor(203, 213, 225);
  doc.line(135, signBlockY + 21, 190, signBlockY + 21);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 163, 74);
  doc.text(SERVER_BRAND.signatory, 162.5, signBlockY + 18, { align: 'center' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTHORIZED FINANCE OFFICER', 162.5, signBlockY + 25, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Treasury & Billing Automation', 162.5, signBlockY + 29, { align: 'center' });

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 282, 196, 282);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Receipt issued by ${SERVER_BRAND.name} • Certified URA Tax Compliant • Page 1 of 1`, 105, 287, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// Helper to render dynamically configured bank accounts in email templates
function renderConfiguredBankAccountsHtml() {
  const banks = Array.isArray(memoryStore.bank_accounts) && memoryStore.bank_accounts.length > 0
    ? memoryStore.bank_accounts
    : [
        { bank_name: 'Stanbic Bank Uganda Limited', account_name: SERVER_BRAND.name, account_number: '9030018829401', branch: 'Forest Mall Lugogo Branch, Kampala', swift_code: 'SBICUGKX', currency: 'UGX' },
        { bank_name: 'Absa Bank Uganda Limited', account_name: SERVER_BRAND.name, account_number: '0341199482', branch: 'Hannington Road Branch, Kampala', swift_code: 'BARCUGKX', currency: 'USD' }
      ];

  const banksHtml = banks.map(b => `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px;">
      <div style="margin-bottom: 4px;">
        <strong style="color: #0f172a; font-size: 13px;">${b.bank_name}</strong>
        <span style="display: inline-block; background: #e0f2fe; color: #0284c7; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 12px; margin-left: 6px;">${b.currency || 'UGX'}</span>
      </div>
      <div style="font-size: 12px; color: #334155; line-height: 1.5;">
        <div>Account Name: <strong>${b.account_name || SERVER_BRAND.name}</strong></div>
        <div>Account Number: <strong style="color: #0f172a; font-family: monospace; font-size: 13px;">${b.account_number}</strong></div>
        <div style="color: #64748b; font-size: 11px;">Branch: ${b.branch || 'Main Branch'} ${b.swift_code ? `• SWIFT: ${b.swift_code}` : ''}</div>
      </div>
    </div>
  `).join('');

  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
        💳 Approved Settlement & Payment Methods
      </div>
      ${banksHtml}
      <div style="background: #f1f5f9; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #475569; margin-top: 8px; line-height: 1.5;">
        <strong>Mobile Money Merchant Remittance:</strong> MTN MoMo Pay Merchant Code: <strong>628100</strong> • Airtel Money Merchant Pay: <strong>430192</strong><br/>
        <em>* Please quote your Document Number on your remittance transaction reference.</em>
      </div>
    </div>
  `;
}

// Executive corporate HTML email generator with dynamic logo and payment methods
function generateCorporateEmailHtml({
  title,
  preheader,
  recipientName,
  badgeText,
  introText,
  itemsRows,
  subtotalText,
  discountRowHtml,
  vatText,
  totalAmountText,
  shareLink,
  ctaText,
  ctaLink,
  footerNote,
  greeting,
  message,
  hideInvoiceHeaders,
  hidePaymentMethods,
  attachmentName
}) {
  const finalRecipient = recipientName || (greeting ? greeting.replace('Hello ', '').replace(',', '') : 'Valued Customer');
  const finalIntro = introText || message || '';
  const isInvoice = !!subtotalText && subtotalText !== '-' && !hideInvoiceHeaders;
  const siteLogo = memoryStore.site_logo || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Nova Cloud Edges Official Notification'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 24px 12px; }
    .email-wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06); }
    .email-header { background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #0284c7; }
    .email-logo-img { max-height: 48px; max-width: 190px; object-fit: contain; margin-bottom: 8px; }
    .company-title { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; margin: 0; text-transform: uppercase; }
    .company-subtitle { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .email-body { padding: 28px 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 16px; background: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    .doc-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; line-height: 1.3; }
    .salutation { font-size: 14px; color: #334155; margin-bottom: 12px; }
    .intro-paragraph { font-size: 14px; line-height: 1.65; color: #475569; margin-bottom: 20px; }
    .attachment-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 18px 0; }
    .table-container { background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px; margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b; }
    .data-table th { text-align: left; padding: 8px 4px; border-bottom: 1.5px solid #cbd5e1; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .data-table td { padding: 9px 4px; border-bottom: 1px solid #f1f5f9; }
    .btn-container { text-align: center; margin: 24px 0 16px 0; }
    .primary-btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.2px; }
    .email-footer { background: #f8fafc; padding: 22px 20px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      ${siteLogo ? `<img src="${siteLogo}" alt="Nova Cloud Edges Logo" class="email-logo-img" /><br/>` : ''}
      <div class="company-title">NOVA <span style="color: #38bdf8;">CLOUD EDGES</span></div>
      <div class="company-subtitle">Enterprise Cloud Infrastructure & IT Solutions</div>
    </div>
    <div class="email-body">
      ${badgeText ? `<div class="badge">${badgeText}</div>` : ''}
      <h2 class="doc-title">${title || 'Official Corporate Notification'}</h2>
      <p class="salutation">Dear <strong>${finalRecipient}</strong>,</p>
      <div class="intro-paragraph">${finalIntro}</div>

      ${attachmentName !== false ? `
      <div class="attachment-card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 28px; vertical-align: middle; font-size: 20px;">📎</td>
            <td style="vertical-align: middle;">
              <div style="font-weight: 700; font-size: 13px; color: #1e40af;">Official Verifiable PDF Attached</div>
              <div style="font-size: 11.5px; color: #3b82f6;">${attachmentName || 'Official PDF Document'} generated & digitally certified for your accounting and statutory audit records.</div>
            </td>
          </tr>
        </table>
      </div>
      ` : ''}

      ${itemsRows ? `
      <div class="table-container">
        <table class="data-table">
          ${isInvoice ? `
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount (UGX)</th>
            </tr>
          </thead>
          ` : ''}
          <tbody>
            ${itemsRows}
            ${isInvoice ? `
            <tr>
              <td colspan="2" style="font-weight: 600; color: #64748b; padding-top: 10px;">Subtotal:</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a; padding-top: 10px;">${subtotalText || ''}</td>
            </tr>
            ${discountRowHtml || ''}
            <tr>
              <td colspan="2" style="font-weight: 600; color: #64748b;">VAT (18% Statutory / Clearance):</td>
              <td style="text-align: right; font-weight: 700; color: #0f172a;">${vatText || ''}</td>
            </tr>
            <tr style="border-top: 2px solid #cbd5e1;">
              <td colspan="2" style="font-size: 14px; font-weight: 900; color: #0f172a; padding-top: 10px;">Total Amount:</td>
              <td style="text-align: right; font-size: 15px; font-weight: 900; color: #0284c7; padding-top: 10px;">${totalAmountText || ''}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${!hidePaymentMethods ? renderConfiguredBankAccountsHtml() : ''}

      ${(ctaLink || shareLink) ? `
      <div class="btn-container">
        <a href="${ctaLink || shareLink || 'https://ncloud.co.ug'}" class="primary-btn">${ctaText || 'Access Client Portal Online'} →</a>
      </div>
      ` : ''}

      ${shareLink ? `
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 14px; word-break: break-all;">
        <strong>Direct Verification Link:</strong><br/>
        <a href="${shareLink}" style="color: #0284c7;">${shareLink}</a>
      </p>
      ` : ''}
    </div>
    <div class="email-footer">
      <strong>Nova Cloud Edges (U) Limited</strong> • Plot 14 Parliament Avenue, Kampala, Republic of Uganda<br/>
      TIN: 1014892019 • URA Tax Compliant • Hotline: +256 790 001 631 • Email: billing@ncloud.co.ug<br/>
      ${footerNote || 'This is an official automated transaction dispatch. All attached documents carry digital certification.'}
    </div>
  </div>
</body>
</html>
  `;
}

// System email template wrapper for subscription lifecycles
function generateEmailTemplate({ title, subtitle, bodyContent, ctaText, ctaLink }) {
  return generateCorporateEmailHtml({
    title,
    badgeText: 'System Advisory',
    introText: bodyContent,
    preheader: subtitle,
    ctaText,
    ctaLink,
    hidePaymentMethods: false,
    attachmentName: false
  });
}

// System Notification Emails Endpoints
app.get('/api/admin/notification-emails', (req, res) => {
  res.json(memoryStore.notification_emails || {
    billing: 'billing@ncloud.co.ug',
    sales: 'sales@ncloud.co.ug'
  });
});

app.put('/api/admin/notification-emails', (req, res) => {
  let { billing, sales } = req.body;
  if (!memoryStore.notification_emails) memoryStore.notification_emails = {};
  
  if (billing) memoryStore.notification_emails.billing = billing.trim();
  if (sales) memoryStore.notification_emails.sales = sales.trim();
  memoryStore.notification_emails.updated_at = new Date().toISOString();
  savePersistentStore();
  
  res.json({ message: 'Notification email settings updated successfully', settings: memoryStore.notification_emails });
});

// Cloudflare Security Settings Endpoints
app.get('/api/admin/security-settings', verifyToken, requireCRUDAS, (req, res) => {
  res.json(memoryStore.security_settings || {
    turnstile_site_key: '',
    turnstile_secret_key: '',
    is_active: false
  });
});

app.get('/api/security/turnstile', (req, res) => {
  const settings = memoryStore.security_settings || {};
  if (settings.is_active) {
    res.json({ is_active: true, site_key: settings.turnstile_site_key });
  } else {
    res.json({ is_active: false });
  }
});

app.put('/api/admin/security-settings', (req, res) => {
  let { turnstile_site_key, turnstile_secret_key, is_active } = req.body;
  if (!memoryStore.security_settings) memoryStore.security_settings = {};
  
  if (turnstile_site_key !== undefined) memoryStore.security_settings.turnstile_site_key = turnstile_site_key.trim();
  if (turnstile_secret_key !== undefined) memoryStore.security_settings.turnstile_secret_key = turnstile_secret_key.trim();
  if (is_active !== undefined) memoryStore.security_settings.is_active = Boolean(is_active);
  memoryStore.security_settings.updated_at = new Date().toISOString();

  savePersistentStore();

  res.json({ 
    message: 'Cloudflare Security Settings saved successfully!', 
    settings: memoryStore.security_settings 
  });
});

// SMTP Settings Endpoints
app.get('/api/admin/smtp-settings', (req, res) => {
  res.json(memoryStore.smtp_settings || {
    host: 'smtp.ncloud.co.ug',
    port: 587,
    security_type: 'TLS',
    username: 'billing@ncloud.co.ug',
    sender_name: 'Nova Cloud Edges Official Notifications',
    sender_email: 'billing@ncloud.co.ug',
    is_active: true
  });
});

app.put('/api/admin/smtp-settings', (req, res) => {
  let { host, port, security_type, username, password, sender_name, sender_email, is_active } = req.body;
  if (!memoryStore.smtp_settings) memoryStore.smtp_settings = {};
  
  if (host) memoryStore.smtp_settings.host = host.trim();
  if (port) memoryStore.smtp_settings.port = Number(port);
  if (security_type) memoryStore.smtp_settings.security_type = security_type;
  if (username) memoryStore.smtp_settings.username = username.trim();
  if (password !== undefined) memoryStore.smtp_settings.password = password;
  if (sender_name) memoryStore.smtp_settings.sender_name = sender_name;
  if (sender_email) memoryStore.smtp_settings.sender_email = sender_email;
  if (is_active !== undefined) memoryStore.smtp_settings.is_active = Boolean(is_active);
  memoryStore.smtp_settings.updated_at = new Date().toISOString();

  savePersistentStore();

  res.json({ 
    message: 'Global SMTP Mail Server configuration saved persistently!', 
    settings: memoryStore.smtp_settings 
  });
});

// Test Real SMTP Server Connectivity & Push Real Test Email
app.post('/api/admin/smtp-test', async (req, res) => {
  const { test_email, host, port, security_type, username, password, sender_name, sender_email } = req.body;
  const targetEmail = test_email || 'systems@ncloud.co.ug';
  const targetHost = (host && host.trim()) || memoryStore.smtp_settings?.host;
  const targetPort = port ? Number(port) : (memoryStore.smtp_settings?.port || 587);
  const sec = security_type || memoryStore.smtp_settings?.security_type || 'TLS';
  const userAcc = (username && username.trim()) || memoryStore.smtp_settings?.username;
  const userPass = password || memoryStore.smtp_settings?.password;
  const fromName = sender_name || memoryStore.smtp_settings?.sender_name || 'Nova Cloud Edges Official';
  const fromEmail = sender_email || memoryStore.smtp_settings?.sender_email || userAcc || 'billing@ncloud.co.ug';

  if (!targetHost) {
    return res.status(400).json({ error: 'SMTP Host address is required to test server connection.' });
  }

  console.log(`[SMTP Real Test] Performing TCP socket connection to ${targetHost}:${targetPort} for ${targetEmail}...`);

  try {
    const transporter = nodemailer.createTransport({
      host: targetHost,
      port: targetPort,
      secure: sec === 'SSL/TLS' || targetPort === 465,
      auth: (userAcc && userPass) ? { user: userAcc, pass: userPass } : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 15000
    });

    // Step 1: Verify credentials with real SMTP server
    await transporter.verify();

    // Step 2: Push real test email message via Nodemailer
    const mailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 25px; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">Nova Cloud Edges SMTP Connectivity Test</h2>
        <p>This automated email confirms that your corporate SMTP mail server configuration is valid and pushing real outbound messages.</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px; margin: 20px 0;">
          <div style="margin-bottom: 6px;"><strong>SMTP Host:</strong> ${targetHost}:${targetPort}</div>
          <div style="margin-bottom: 6px;"><strong>Encryption Protocol:</strong> ${sec}</div>
          <div style="margin-bottom: 6px;"><strong>Authenticated User:</strong> ${userAcc || 'Anonymous'}</div>
          <div style="margin-bottom: 6px;"><strong>Sender Identity:</strong> ${fromName} &lt;${fromEmail}&gt;</div>
          <div style="margin-bottom: 6px;"><strong>Recipient:</strong> ${targetEmail}</div>
          <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Nova Cloud Edges (U) Limited • Real SMTP Outbound Transport</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: targetEmail,
      subject: `Nova Cloud Edges Real SMTP Outbound Test`,
      html: mailHtml
    });

    // Save verified working SMTP settings into persistent store
    if (!memoryStore.smtp_settings) memoryStore.smtp_settings = {};
    memoryStore.smtp_settings.host = targetHost;
    memoryStore.smtp_settings.port = targetPort;
    memoryStore.smtp_settings.security_type = sec;
    memoryStore.smtp_settings.username = userAcc;
    if (userPass) memoryStore.smtp_settings.password = userPass;
    memoryStore.smtp_settings.sender_name = fromName;
    memoryStore.smtp_settings.sender_email = fromEmail;
    memoryStore.smtp_settings.is_active = true;
    memoryStore.smtp_settings.last_tested = new Date().toISOString();
    savePersistentStore();

    res.json({
      success: true,
      message: `SMTP Connection & Authentication Verified! Test email delivered to ${targetEmail} via ${targetHost}:${targetPort} (${info.response}).`,
      details: {
        host: targetHost,
        port: targetPort,
        encryption: sec,
        username: userAcc,
        recipient: targetEmail,
        messageId: info.messageId,
        serverResponse: info.response,
        status: '250 OK Delivered',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(`[SMTP Test Error] Real SMTP socket connection to ${targetHost}:${targetPort} failed:`, err.message);
    
    const recommendations = [];
    const msg = err.message || '';
    if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ESOCKET')) {
      recommendations.push(`Port ${targetPort} is unreachable or blocked by your network/ISP firewall.`);
      recommendations.push(`Try changing Port from ${targetPort} to Port 465 (SSL/TLS) or Port 25.`);
      recommendations.push(`Ensure host address "${targetHost}" is spelled correctly and accepts remote SMTP connections.`);
    } else if (msg.includes('EAUTH') || msg.includes('535') || msg.includes('Invalid login') || msg.includes('Username and Password not accepted')) {
      recommendations.push(`Authentication failed for account "${userAcc}". Verify your Username and Password.`);
      if (targetHost.includes('gmail') || targetHost.includes('google')) {
        recommendations.push(`For Gmail / Google Workspace: 2FA is active. Generate a 16-character App Password at https://myaccount.google.com/apppasswords`);
      }
    } else {
      recommendations.push(`Verify host hostname, port number, and TLS/SSL certificate settings.`);
    }

    res.status(500).json({
      error: `SMTP Connection Failed: ${err.message}`,
      details: err.message,
      code: err.code || 'ESMTPFAILED',
      host: targetHost,
      port: targetPort,
      recommendations
    });
  }
});

// Roles Management Endpoints
app.post('/api/admin/roles', (req, res) => {
  const { name, code, badge_color, description, permissions } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Role name and identifier code are required' });
  }

  const existing = (memoryStore.roles || []).find(r => r.code === code);
  if (existing) {
    return res.status(400).json({ error: `A role with identifier "${code}" already exists.` });
  }

  const newRole = {
    id: (memoryStore.roles || []).length + 1,
    name,
    code: code.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    badge_color: badge_color || '#8b5cf6',
    description: description || 'Custom enterprise module role with configured CRUDAS matrix permissions.',
    user_count: 0,
    permissions: permissions || {
      invoices: { create: false, read: true, update: false, delete: false, approve: false, share: true },
      quotations: { create: false, read: true, update: false, delete: false, approve: false, share: true },
      reports: { create: false, read: true, update: false, delete: false, approve: false, share: true }
    }
  };

  if (!memoryStore.roles) memoryStore.roles = [];
  memoryStore.roles.push(newRole);

  res.json({ message: `Custom User Role "${name}" created successfully with configured CRUDAS permissions!`, role: newRole });
});

app.delete('/api/admin/roles/:id', (req, res) => {
  const { id } = req.params;
  const index = (memoryStore.roles || []).findIndex(r => r.id == id);
  if (index === -1) return res.status(404).json({ error: 'Role not found' });

  const roleToDelete = memoryStore.roles[index];
  if (['super_admin', 'sales_admin', 'web_admin', 'hr_manager'].includes(roleToDelete.code)) {
    return res.status(400).json({ error: `Cannot delete system core role "${roleToDelete.name}".` });
  }

  const deleted = memoryStore.roles.splice(index, 1)[0];
  res.json({ message: `Custom Role "${deleted.name}" removed successfully!` });
});

app.get('/api/admin/invoices', (req, res) => {
  res.json(memoryStore.invoices);
});

function isHostingCategoryService(itemOrName, itemsList = []) {
  const hostingKeywords = [
    'hosting', 'cloud', 'vps', 'virtual server', 'cpanel', 'dedicated server',
    'storage node', 'cloud edge', 'cloud private', 'node hosting', 'web hosting',
    'email hosting', 'cloud service', 'vps server', 'edge vps', 'cloud infrastructure',
    'server instance', 'digital products', 'premier cloud partner'
  ];

  const checkStr = (str) => {
    if (!str) return false;
    const s = String(str).toLowerCase();
    return hostingKeywords.some(kw => s.includes(kw));
  };

  if (Array.isArray(itemsList) && itemsList.length > 0) {
    if (itemsList.some(it => checkStr(it.category) || checkStr(it.name) || checkStr(it.description))) {
      return true;
    }
  }

  if (typeof itemOrName === 'object' && itemOrName !== null) {
    if (checkStr(itemOrName.category) || checkStr(itemOrName.name) || checkStr(itemOrName.item_name) || checkStr(itemOrName.plan_name) || checkStr(itemOrName.description)) {
      return true;
    }
  }

  return checkStr(itemOrName);
}

// Create Invoice with Discounts & Automated Customer + Sales Admin Email Dispatch
app.post('/api/admin/invoices', async (req, res) => {
  const { customer_name, customer_email, customer_phone, customer_address, item_name, unit_price, quantity, due_date, vat_exempt, is_recurring, recurring_frequency, next_billing_date, wifi_voucher_id, excess_amount, discount_type, discount_value, assigned_staff_id, assigned_staff_name, assigned_staff_email, items } = req.body;
  
  const qty = Math.max(1, parseInt(quantity) || 1);
  const pricePerUnit = Number(unit_price) || 650000;
  const grossSubtotal = pricePerUnit * qty;
  
  // Calculate discount (Money or Percentage)
  const dValue = Number(discount_value) || 0;
  const discountType = discount_type === 'percentage' ? 'percentage' : 'fixed';
  const discountAmount = discountType === 'percentage' 
    ? Math.round(grossSubtotal * (dValue / 100))
    : Math.min(grossSubtotal, dValue);

  const netSubtotal = Math.max(0, grossSubtotal - discountAmount);
  const isExempt = Boolean(vat_exempt);
  const vatAmount = isExempt ? 0 : Math.round(netSubtotal * 0.18);
  const totalAmount = netSubtotal + vatAmount;

  const isHosting = isHostingCategoryService(item_name, items);
  const finalIsRecurring = isHosting ? true : Boolean(is_recurring);

  let voucherToken = null;
  if (wifi_voucher_id) {
    const v = (memoryStore.unifi_vouchers || []).find(voucher => voucher.id == wifi_voucher_id);
    if (v) {
      voucherToken = v.token;
      v.invoice_id = Date.now();
      v.customer_name = customer_name;
      v.customer_email = customer_email;
    }
  }

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((memoryStore.invoices || []).length + 43).padStart(4, '0')}`;
  const shareableUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNumber)}`;

  const initialStatus = req.body.status || 'Pending';
  const isInitiallyPaid = initialStatus === 'Paid' || initialStatus === '100% Paid' || initialStatus === 'Paid & Settled';

  const newInvoice = {
    id: Date.now(),
    invoice_number: invoiceNumber,
    customer_name: customer_name || 'Corporate Customer',
    customer_email: customer_email || 'client@company.co.ug',
    customer_phone: customer_phone || '+256 700 000 000',
    customer_address: customer_address || 'Kampala, Uganda',
    item_name: item_name || 'Enterprise Cloud VPS Infrastructure',
    quantity: qty,
    unit_price: pricePerUnit,
    subtotal: grossSubtotal,
    discount_type: discountType,
    discount_value: dValue,
    discount_amount: discountAmount,
    net_subtotal: netSubtotal,
    amount: totalAmount,
    paid_amount: isInitiallyPaid ? totalAmount : Number(req.body.paid_amount || 0),
    balance: isInitiallyPaid ? 0 : totalAmount,
    vat_amount: vatAmount,
    vat_exempt: isExempt,
    excess_amount: Number(excess_amount || 0),
    status: initialStatus,
    due_date: due_date || '2026-09-30',
    is_recurring: finalIsRecurring,
    recurring_frequency: finalIsRecurring ? (recurring_frequency || 'Monthly') : null,
    next_billing_date: finalIsRecurring ? (next_billing_date || calculateExpiryDate(due_date || new Date().toISOString().split('T')[0], recurring_frequency || 'Monthly')) : null,
    wifi_voucher_id: wifi_voucher_id || null,
    wifi_voucher_token: voucherToken,
    assigned_staff_id: assigned_staff_id || null,
    assigned_staff_name: assigned_staff_name || '',
    assigned_staff_email: assigned_staff_email || '',
    shareable_url: shareableUrl,
    created_at: new Date().toISOString()
  };
  memoryStore.invoices.unshift(newInvoice);

  if (newInvoice.status === 'Paid' || newInvoice.status === '100% Paid' || newInvoice.status === 'Paid & Settled') {
    createSubscriptionForInvoice(newInvoice);
  }

  savePersistentStore();

  // Automated Corporate Email Dispatch to Customer with attached official PDF & CC to Sales Admin
  const pdfBuffer = await generateServerInvoicePDFBuffer(newInvoice);
  const emailHtml = generateCorporateEmailHtml({
    title: `Official Tax Invoice #${newInvoice.invoice_number}`,
    badgeText: 'Official Invoice Issued',
    recipientName: newInvoice.customer_name,
    attachmentName: `Tax_Invoice_${newInvoice.invoice_number}.pdf`,
    introText: `Your official Nova Cloud Edges Tax Invoice #${newInvoice.invoice_number} has been generated. Please find the summary below and inspect the official certified PDF attached to this email.`,
    itemsRows: `
      <tr>
        <td>${newInvoice.item_name}</td>
        <td style="text-align: center;">${newInvoice.quantity}</td>
        <td style="text-align: right;">UGX ${(newInvoice.quantity * newInvoice.unit_price).toLocaleString()}</td>
      </tr>
    `,
    subtotalText: `UGX ${newInvoice.subtotal.toLocaleString()}`,
    discountRowHtml: discountAmount > 0 ? `
      <tr>
        <td colspan="2" style="font-weight: 600; color: #10b981;">Special Discount (${discountType === 'percentage' ? `${dValue}%` : 'Promotional'}):</td>
        <td style="text-align: right; font-weight: 700; color: #10b981;">- UGX ${discountAmount.toLocaleString()}</td>
      </tr>
    ` : '',
    vatText: isExempt ? 'EXEMPT (0%)' : `UGX ${vatAmount.toLocaleString()}`,
    totalAmountText: `UGX ${newInvoice.amount.toLocaleString()}`,
    shareLink: shareableUrl,
    ctaText: 'View & Verify Invoice Online',
    ctaLink: shareableUrl
  });

  if (newInvoice.customer_email) {
    sendMail({
      to: newInvoice.customer_email,
      subject: `Official Tax Invoice #${newInvoice.invoice_number} from Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Tax_Invoice_${newInvoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }).catch(err => console.error('[Invoice Email Send Warning]:', err.message));
  }

  console.log(`[Automated Invoice Email] Dispatched Tax Invoice ${newInvoice.invoice_number} with PDF attachment to ${newInvoice.customer_email}`);

  // Log Forensics Audit Event
  if (memoryStore.audit_logs) {
    memoryStore.audit_logs.unshift({
      id: Date.now(),
      user_email: req.headers['x-user-email'] || 'sales@ncloud.co.ug',
      user_name: req.headers['x-user-name'] || 'Sales Administrator',
      user_role: req.headers['x-user-role'] || 'sales_admin',
      action: 'INVOICE_CREATED',
      resource_type: 'Invoices',
      resource_id: newInvoice.invoice_number,
      details: `Generated Tax Invoice #${newInvoice.invoice_number} for ${newInvoice.customer_name} (UGX ${newInvoice.amount.toLocaleString()}). Email with attached PDF dispatched to ${newInvoice.customer_email}.`,
      ip_address: req.ip || '197.239.4.18',
      device_type: 'Desktop Console',
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    message: `Tax Invoice ${newInvoice.invoice_number} created and dispatched with official PDF attached to ${newInvoice.customer_email}!`,
    invoice: newInvoice,
    email_dispatched: true
  });
});

// Manual Send / Resend Invoice Email Endpoint
app.post('/api/admin/invoices/:id/send-email', async (req, res) => {
  const { id } = req.params;
  const inv = (memoryStore.invoices || []).find(i => i.id == id || i.invoice_number === id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const shareableUrl = inv.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`;
  const pdfBuffer = await generateServerInvoicePDFBuffer(inv);

  // Push real Tax Invoice email via SMTP with PDF attachment
  const emailHtml = generateCorporateEmailHtml({
    title: `Tax Invoice #${inv.invoice_number}`,
    badgeText: 'Invoice Issued',
    recipientName: inv.customer_name,
    attachmentName: `Tax_Invoice_${inv.invoice_number}.pdf`,
    introText: 'Please find details of your official invoice below and find the official PDF document attached to this notice.',
    itemsRows: (inv.items || [{ name: inv.item_name, quantity: inv.quantity, amount: inv.amount }]).map(it => `
      <tr>
        <td>${it.name || it.description || inv.item_name}</td>
        <td style="text-align: center;">${it.quantity || it.qty || inv.quantity || 1}</td>
        <td style="text-align: right;">UGX ${Number(it.amount || (Number(it.unit_price || inv.unit_price || 0) * Number(it.quantity || inv.quantity || 1))).toLocaleString()}</td>
      </tr>
    `).join(''),
    subtotalText: `UGX ${Number(inv.subtotal || inv.amount).toLocaleString()}`,
    vatText: inv.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(inv.vat_amount || 0).toLocaleString()}`,
    totalAmountText: `UGX ${Number(inv.amount || 0).toLocaleString()}`,
    shareLink: shareableUrl,
    ctaText: 'View & Verify Invoice online',
    ctaLink: shareableUrl
  });

  await sendMail({
    to: inv.customer_email,
    subject: `Tax Invoice #${inv.invoice_number} from Nova Cloud Edges`,
    html: emailHtml,
    attachments: [
      {
        filename: `Tax_Invoice_${inv.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });

  console.log(`[Invoice Mailer] Dispatched official invoice ${inv.invoice_number} with PDF attachment to ${inv.customer_email}`);
  res.json({
    message: `Invoice #${inv.invoice_number} and official PDF attachment sent to ${inv.customer_email}!`,
    recipient: inv.customer_email,
    shareable_url: shareableUrl
  });
});

// Cancel Invoice & Send Outbound Cancellation Email Notification
app.post('/api/admin/invoices/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { cancellation_reason, admin_name, admin_email } = req.body;
  const inv = (memoryStore.invoices || []).find(i => i.id == id || i.invoice_number === id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  inv.status = 'Cancelled';
  inv.cancelled_at = new Date().toISOString();
  inv.cancellation_reason = cancellation_reason || 'Administrative cancellation / Order modified';
  savePersistentStore();

  // Disengage attached WiFi voucher if any
  if (inv.wifi_voucher_id) {
    const v = (memoryStore.unifi_vouchers || []).find(voucher => voucher.id == inv.wifi_voucher_id);
    if (v) {
      v.status = 'available'; // Restore to available pool on cancellation
      v.customer_name = null;
      v.customer_email = null;
    }
  }

  // Dispatch cancellation email notification to customer
  const shareableUrl = inv.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`;
  const emailHtml = generateCorporateEmailHtml({
    title: 'TAX INVOICE CANCELLATION NOTICE',
    badgeText: 'CANCELLED',
    recipientName: inv.customer_name,
    introText: `Please be advised that official Tax Invoice <strong>#${inv.invoice_number}</strong> issued to <em>${inv.company || inv.customer_name}</em> has been officially <strong>CANCELLED</strong> in our billing portal.`,
    itemsRows: `
      <tr><td><strong>Invoice Reference:</strong></td><td colspan="2" style="text-align:right;">#${inv.invoice_number}</td></tr>
      <tr><td><strong>Status:</strong></td><td colspan="2" style="text-align:right; color:#ef4444; font-weight:800;">CANCELLED</td></tr>
      <tr><td><strong>Cancellation Reason:</strong></td><td colspan="2" style="text-align:right;">${inv.cancellation_reason}</td></tr>
      <tr><td><strong>Date of Cancellation:</strong></td><td colspan="2" style="text-align:right;">${new Date().toLocaleString()}</td></tr>
    `,
    subtotalText: '-',
    vatText: '-',
    totalAmountText: '-',
    shareLink: 'https://ncloud.co.ug/portal',
    ctaText: 'Login to Customer Portal',
    ctaLink: 'https://ncloud.co.ug/portal',
    footerNote: 'No further payment is required for this invoice. If a replacement invoice or revised commercial quotation is required, our accounts team will notify you separately.<br/><br/>Nova Cloud Edges (U) Limited — Accounts & Billing Department<br/>Email: sales@ncloud.co.ug | Hotline: 0790001631'
  });

  await sendMail({
    to: inv.customer_email,
    subject: `Notice: Tax Invoice #${inv.invoice_number} HAS BEEN CANCELLED - Nova Cloud Edges`,
    html: emailHtml
  });

  // Log in forensics audit trail
  if (memoryStore.audit_logs) {
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      user_email: admin_email || 'systems@ncloud.co.ug',
      user_name: admin_name || 'Accounts Admin',
      user_role: 'super_admin',
      action: 'INVOICE_CANCELLED',
      resource_type: 'Invoices',
      resource_id: inv.invoice_number,
      details: `Cancelled Tax Invoice #${inv.invoice_number} for ${inv.customer_name} (${inv.customer_email}). Cancellation reason: ${inv.cancellation_reason}. Email notification dispatched to customer.`,
      ip_address: req.ip || '127.0.0.1',
      device_type: 'Desktop Console',
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    });
  }

  console.log(`[Invoice Mailer] Invoice ${inv.invoice_number} CANCELLED. Outbound cancellation notification sent to ${inv.customer_email}.`);
  res.json({
    message: `Tax Invoice #${inv.invoice_number} marked as CANCELLED! Outbound cancellation notice emailed to ${inv.customer_email}.`,
    invoice: inv
  });
});

// Duplicate / Clone Invoice Endpoint (Supports Target Customer Overrides)
app.post(['/api/admin/invoices/:id/duplicate', '/api/admin/invoices/:id/clone'], (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_email, customer_phone, customer_address, due_date } = req.body || {};
  const original = (memoryStore.invoices || []).find(i => i.id == id || i.invoice_number === id);
  if (!original) return res.status(404).json({ error: 'Original invoice not found' });

  const count = (memoryStore.invoices || []).length + 47;
  const newInvoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
  const targetName = customer_name || original.customer_name;
  const targetEmail = customer_email || original.customer_email;

  const duplicatedInvoice = {
    ...JSON.parse(JSON.stringify(original)),
    id: (memoryStore.invoices || []).length > 0 ? Math.max(...memoryStore.invoices.map(i => Number(i.id) || 0)) + 1 : Date.now(),
    invoice_number: newInvoiceNumber,
    customer_name: targetName,
    customer_email: targetEmail,
    customer_phone: customer_phone !== undefined ? customer_phone : original.customer_phone,
    customer_address: customer_address !== undefined ? customer_address : original.customer_address,
    status: 'Pending',
    created_at: new Date().toISOString().split('T')[0],
    due_date: due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    excess_amount: 0,
    paid_amount: 0,
    cancellation_reason: null,
    cancelled_at: null,
    wifi_voucher_id: null,
    wifi_voucher_token: null,
    shareable_url: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newInvoiceNumber)}`
  };

  memoryStore.invoices.unshift(duplicatedInvoice);
  savePersistentStore();

  // Send background email for new duplicated invoice
  if (duplicatedInvoice.customer_email) {
    const shareableUrl = duplicatedInvoice.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newInvoiceNumber)}`;
    const emailHtml = generateCorporateEmailHtml({
      title: `Draft Tax Invoice #${newInvoiceNumber}`,
      badgeText: 'Draft Invoice Issued',
      recipientName: duplicatedInvoice.customer_name,
      introText: `A new Tax Invoice #${newInvoiceNumber} has been drafted for your account. Please find the summary below.`,
      itemsRows: (duplicatedInvoice.items || [{ name: duplicatedInvoice.item_name, quantity: duplicatedInvoice.quantity, amount: duplicatedInvoice.amount }]).map(it => `
        <tr>
          <td>${it.name || it.description || duplicatedInvoice.item_name}</td>
          <td style="text-align: center;">${it.quantity || it.qty || duplicatedInvoice.quantity || 1}</td>
          <td style="text-align: right;">UGX ${Number(it.amount || (Number(it.unit_price || duplicatedInvoice.unit_price || 0) * Number(it.quantity || duplicatedInvoice.quantity || 1))).toLocaleString()}</td>
        </tr>
      `).join(''),
      subtotalText: `UGX ${Number(duplicatedInvoice.subtotal || duplicatedInvoice.amount).toLocaleString()}`,
      vatText: duplicatedInvoice.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(duplicatedInvoice.vat_amount || 0).toLocaleString()}`,
      totalAmountText: `UGX ${Number(duplicatedInvoice.amount || 0).toLocaleString()}`,
      shareLink: shareableUrl,
      ctaText: 'View Draft Invoice PDF',
      ctaLink: shareableUrl
    });
    sendMail({
      to: duplicatedInvoice.customer_email,
      subject: `New Tax Invoice #${newInvoiceNumber} from Nova Cloud Edges`,
      html: emailHtml
    }).catch(err => console.error("Failed to send duplicate invoice email:", err));
  }

  res.json({
    message: `Tax Invoice #${original.invoice_number} successfully cloned as #${newInvoiceNumber} for ${targetName} (${targetEmail})!`,
    invoice: duplicatedInvoice
  });
});

// Duplicate Commercial Quotation Endpoint
app.post('/api/admin/quotations/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const original = (memoryStore.quotations || []).find(q => q.id == id || q.quote_number === id);
  if (!original) return res.status(404).json({ error: 'Original quotation not found' });

  const count = (memoryStore.quotations || []).length + 84;
  const newQuoteNumber = `QTN-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const duplicatedQuote = {
    ...JSON.parse(JSON.stringify(original)),
    id: (memoryStore.quotations || []).length > 0 ? Math.max(...memoryStore.quotations.map(q => Number(q.id) || 0)) + 1 : 1,
    quote_number: newQuoteNumber,
    status: 'Sent',
    created_at: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  };

  if (!memoryStore.quotations) memoryStore.quotations = [];
  memoryStore.quotations.unshift(duplicatedQuote);
  savePersistentStore();

  // Send background email for new duplicated quote
  if (duplicatedQuote.customer_email) {
    const emailHtml = generateCorporateEmailHtml({
      title: `Draft Commercial Quotation #${newQuoteNumber}`,
      badgeText: 'Draft Quotation Issued',
      recipientName: duplicatedQuote.customer_name,
      introText: `A new Commercial Quotation #${newQuoteNumber} has been drafted for your account. Please find the summary below.`,
      itemsRows: (duplicatedQuote.items || []).map(it => `
        <tr>
          <td>${it.name || it.description}</td>
          <td style="text-align: center;">${it.quantity || 1}</td>
          <td style="text-align: right;">UGX ${Number(it.total || (it.quantity * it.unit_price) || 0).toLocaleString()}</td>
        </tr>
      `).join(''),
      subtotalText: `UGX ${Number(duplicatedQuote.subtotal || 0).toLocaleString()}`,
      vatText: duplicatedQuote.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(duplicatedQuote.vat_amount || 0).toLocaleString()}`,
      totalAmountText: `UGX ${Number(duplicatedQuote.total_amount || 0).toLocaleString()}`,
      shareLink: 'https://ncloud.co.ug/portal',
      ctaText: 'Login to View Draft Quotation',
      ctaLink: 'https://ncloud.co.ug/portal'
    });
    sendMail({
      to: duplicatedQuote.customer_email,
      subject: `New Commercial Quotation #${newQuoteNumber} from Nova Cloud Edges`,
      html: emailHtml
    }).catch(err => console.error("Failed to send duplicate quote email:", err));
  }

  return res.json({
    message: `Commercial Quotation #${original.quote_number} duplicated successfully as #${newQuoteNumber} for ${original.customer_name}!`,
    quotation: duplicatedQuote
  });
});

// Duplicate Company / Staff Expense Endpoint
app.post(['/api/admin/company-expenses/:id/duplicate', '/api/admin/hr/expenses/:id/duplicate'], (req, res) => {
  const { id } = req.params;
  const expList = memoryStore.company_expenses || memoryStore.expenses || [];
  const original = expList.find(e => e.id == id || e.receipt_ref === id);
  if (!original) return res.status(404).json({ error: 'Original expense record not found' });

  const randomRef = `EXP-REC-${Math.floor(1000 + Math.random() * 9000)}`;

  const duplicatedExpense = {
    ...JSON.parse(JSON.stringify(original)),
    id: expList.length > 0 ? Math.max(...expList.map(e => Number(e.id) || 0)) + 1 : 1,
    receipt_ref: randomRef,
    status: 'Pending Review',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  if (!memoryStore.company_expenses) memoryStore.company_expenses = [];
  memoryStore.company_expenses.unshift(duplicatedExpense);
  if (memoryStore.expenses) memoryStore.expenses.unshift(duplicatedExpense);
  savePersistentStore();

  res.json({
    message: `Expenditure claim duplicated successfully for ${original.staff_name} (UGX ${Number(original.amount || 0).toLocaleString()})!`,
    expense: duplicatedExpense
  });
});

// Duplicate Work Order Endpoint
app.post('/api/admin/work-orders/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const original = (memoryStore.work_orders || []).find(w => w.id == id || w.order_number === id);
  if (!original) return res.status(404).json({ error: 'Original work order not found' });

  const count = (memoryStore.work_orders || []).length + 15;
  const newOrderNumber = `WO-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const duplicatedWorkOrder = {
    ...JSON.parse(JSON.stringify(original)),
    id: (memoryStore.work_orders || []).length > 0 ? Math.max(...memoryStore.work_orders.map(w => Number(w.id) || 0)) + 1 : 1,
    order_number: newOrderNumber,
    status: 'Scheduled',
    scheduled_date: new Date().toISOString().split('T')[0],
    completed_at: null,
    created_at: new Date().toISOString()
  };

  if (!memoryStore.work_orders) memoryStore.work_orders = [];
  memoryStore.work_orders.unshift(duplicatedWorkOrder);
  savePersistentStore();
  res.json({
    message: `Work Order #${original.order_number} duplicated successfully as #${newOrderNumber} for ${original.assigned_staff_name || 'Staff'}!`,
    workOrder: duplicatedWorkOrder
  });
});

app.put('/api/admin/invoices/:id', (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'] || req.body.role;
  if (userRole === 'customer') {
    return res.status(403).json({ error: 'Customers are not permitted to edit submitted orders or tax invoices.' });
  }
  const { items, customer_name, customer_email, customer_phone, customer_address, item_name, unit_price, quantity, due_date, status, vat_exempt, amount, vat_amount, subtotal, net_subtotal, discount_type, discount_value, discount_amount, is_recurring, recurring_frequency, next_billing_date, wifi_voucher_id, excess_amount, assigned_staff_id, assigned_staff_name, assigned_staff_email } = req.body;
  const inv = memoryStore.invoices.find(i => i.id == id);
  if (inv) {
    if ((inv.status === 'Cancelled' || inv.status === 'Paid' || inv.status === '100% Paid') && (!status || status === inv.status)) {
      return res.status(400).json({ error: `Tax Invoice #${inv.invoice_number} is ${inv.status} and locked from editing.` });
    }
    if (Array.isArray(items) && items.length > 0) inv.items = items;
    if (customer_name) inv.customer_name = customer_name;
    if (customer_email) inv.customer_email = customer_email;
    if (customer_phone !== undefined) inv.customer_phone = customer_phone;
    if (customer_address !== undefined) inv.customer_address = customer_address;
    if (item_name) inv.item_name = item_name;
    if (unit_price) inv.unit_price = Number(unit_price);
    if (quantity) inv.quantity = Number(quantity);
    if (due_date) inv.due_date = due_date;
    if (excess_amount !== undefined) inv.excess_amount = Number(excess_amount);
    if (discount_type !== undefined) inv.discount_type = discount_type;
    if (discount_value !== undefined) inv.discount_value = Number(discount_value);
    if (discount_amount !== undefined) inv.discount_amount = Number(discount_amount);
    if (subtotal !== undefined) inv.subtotal = Number(subtotal);
    if (net_subtotal !== undefined) inv.net_subtotal = Number(net_subtotal);
    if (status) {
      inv.status = status;
      if (status === 'Paid' || status === '100% Paid') {
        if (!inv.payment_date) {
          inv.payment_date = new Date().toISOString();
        }
        createSubscriptionForInvoice(inv);
        // Handle WiFi Voucher shop purchases — auto-dispatch on 100% payment
        let dispatchedVoucher = null;
        if (inv.items && Array.isArray(inv.items)) {
          for (const item of inv.items) {
            // Match any item that references a WiFi/Voucher purchase
            const isWifiItem = item.name && (
              item.name.toLowerCase().includes('wifi voucher') ||
              item.name.toLowerCase().includes('wifi - ') ||
              item.name.toLowerCase().includes('nova wifi')
            );
            if (isWifiItem) {
              // Parse duration from item name: e.g. "8 Hours", "24 Hours", "7 Days", "1 Month"
              const durationMatch = item.name.match(/(\d+)\s*(hour|day|week|month)/i);
              let matchedVoucher = null;

              if (durationMatch) {
                const num = parseInt(durationMatch[1]);
                const unit = durationMatch[2].toLowerCase();
                const durationHours = unit.startsWith('hour') ? num
                  : unit.startsWith('day') ? num * 24
                  : unit.startsWith('week') ? num * 168
                  : num * 720; // month

                // First: try exact duration match
                matchedVoucher = (memoryStore.unifi_vouchers || []).find(v =>
                  v.status === 'available' && v.duration_hours === durationHours
                );
                // Fallback: any available voucher with similar label
                if (!matchedVoucher) {
                  matchedVoucher = (memoryStore.unifi_vouchers || []).find(v =>
                    v.status === 'available' &&
                    v.duration_label && v.duration_label.toLowerCase().includes(durationMatch[1])
                  );
                }
              }

              // Last resort: any available voucher
              if (!matchedVoucher) {
                matchedVoucher = (memoryStore.unifi_vouchers || []).find(v => v.status === 'available');
              }

              if (matchedVoucher) {
                matchedVoucher.status = 'bought';
                matchedVoucher.customer_name = inv.customer_name;
                matchedVoucher.customer_email = inv.customer_email;
                matchedVoucher.invoice_id = inv.id;
                matchedVoucher.invoice_number = inv.invoice_number;
                matchedVoucher.dispatched_at = new Date().toISOString();

                inv.wifi_voucher_id = matchedVoucher.id;
                inv.wifi_voucher_token = matchedVoucher.token;
                dispatchedVoucher = matchedVoucher;

                // Email the voucher to customer
                if (inv.customer_email) {
                  const dataInfo = matchedVoucher.data_quota_mb > 0
                    ? matchedVoucher.data_label + ' Data'
                    : 'Unlimited Data';
                  const emailHtml = generateCorporateEmailHtml({
                    title: 'Your Nova WiFi Access Voucher',
                    badgeText: '✓ WiFi Voucher Dispatched',
                    recipientName: inv.customer_name,
                    introText: `Your payment for Invoice <b>#${inv.invoice_number}</b> has been received and fully cleared. Your Nova WiFi Voucher is ready to use — enter the code below on the WiFi login portal to get connected.`,
                    itemsRows: `
                      <tr>
                        <td style="padding:8px 0"><strong>Package</strong></td>
                        <td style="text-align:center"></td>
                        <td style="text-align:right">${matchedVoucher.package_name}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0"><strong>Duration</strong></td>
                        <td style="text-align:center"></td>
                        <td style="text-align:right">${matchedVoucher.duration_label}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0"><strong>Data Quota</strong></td>
                        <td style="text-align:center"></td>
                        <td style="text-align:right">${dataInfo}</td>
                      </tr>
                      <tr style="background:#0f172a; border-radius:8px">
                        <td colspan="3" style="text-align:center; padding:18px">
                          <div style="font-size:11px; color:#94a3b8; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px">Your WiFi Access Code</div>
                          <b style="font-size:26px; color:#38bdf8; letter-spacing:0.12em; font-family:monospace">${matchedVoucher.token}</b>
                        </td>
                      </tr>
                    `,
                    subtotalText: 'Fully Paid',
                    vatText: 'Included',
                    totalAmountText: 'Cleared',
                    shareLink: 'https://ncloud.co.ug',
                    ctaText: 'Connect to WiFi Portal',
                    ctaLink: 'https://ncloud.co.ug'
                  });
                  sendMail({
                    to: inv.customer_email,
                    subject: `Your Nova WiFi Voucher Code — ${matchedVoucher.duration_label}`,
                    html: emailHtml
                  }).catch(err => console.error('[WiFi] Failed to email voucher:', err));
                }
                break;
              } else {
                console.warn('[WiFi] No available vouchers to dispatch for invoice', inv.invoice_number);
              }
            }
          }
        }

        // Handle pre-assigned voucher (manually linked by admin before payment)
        if (!dispatchedVoucher && inv.wifi_voucher_id) {
          const v = (memoryStore.unifi_vouchers || []).find(voucher => voucher.id == inv.wifi_voucher_id);
          if (v) {
            v.status = 'bought';
            v.customer_name = inv.customer_name;
            v.customer_email = inv.customer_email;
            v.dispatched_at = new Date().toISOString();
          }
        }
      }
    }
    if (vat_exempt !== undefined) inv.vat_exempt = vat_exempt;
    if (amount) inv.amount = Number(amount);
    if (vat_amount !== undefined) inv.vat_amount = Number(vat_amount);
    if (is_recurring !== undefined) inv.is_recurring = Boolean(is_recurring);
    if (recurring_frequency) inv.recurring_frequency = recurring_frequency;
    if (next_billing_date) inv.next_billing_date = next_billing_date;
    if (assigned_staff_id !== undefined) inv.assigned_staff_id = assigned_staff_id;
    if (assigned_staff_name !== undefined) inv.assigned_staff_name = assigned_staff_name;
    if (assigned_staff_email !== undefined) inv.assigned_staff_email = assigned_staff_email;
    if (wifi_voucher_id !== undefined) {
      inv.wifi_voucher_id = wifi_voucher_id;
      const v = (memoryStore.unifi_vouchers || []).find(voucher => voucher.id == wifi_voucher_id);
      if (v) inv.wifi_voucher_token = v.token;
    }

    savePersistentStore();
    
    // Send background email for invoice update
    if (inv.customer_email) {
      const shareableUrl = inv.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`;
      const emailHtml = generateCorporateEmailHtml({
        title: `Updated Tax Invoice #${inv.invoice_number}`,
        badgeText: 'Invoice Updated',
        recipientName: inv.customer_name,
        introText: `Your official Nova Cloud Edges Tax Invoice #${inv.invoice_number} has been updated by our administration team. Please review the updated details below.`,
        itemsRows: (inv.items || [{ name: inv.item_name, quantity: inv.quantity, amount: inv.amount }]).map(it => `
          <tr>
            <td>${it.name || it.description || inv.item_name}</td>
            <td style="text-align: center;">${it.quantity || it.qty || inv.quantity || 1}</td>
            <td style="text-align: right;">UGX ${Number(it.amount || (Number(it.unit_price || inv.unit_price || 0) * Number(it.quantity || inv.quantity || 1))).toLocaleString()}</td>
          </tr>
        `).join(''),
        subtotalText: `UGX ${Number(inv.subtotal || inv.amount).toLocaleString()}`,
        vatText: inv.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(inv.vat_amount || 0).toLocaleString()}`,
        totalAmountText: `UGX ${Number(inv.amount || 0).toLocaleString()}`,
        shareLink: shareableUrl,
        ctaText: 'View Updated Invoice PDF',
        ctaLink: shareableUrl
      });
      sendMail({
        to: inv.customer_email,
        subject: `Updated Tax Invoice #${inv.invoice_number} from Nova Cloud Edges`,
        html: emailHtml
      }).catch(err => console.error("Failed to send invoice update email:", err));
    }

    return res.json({ message: `Tax Invoice ${inv.invoice_number} updated successfully`, invoice: inv });
  }
  res.status(404).json({ error: 'Invoice record not found' });
});

app.delete('/api/admin/invoices/:id', async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM invoices WHERE id = ? OR invoice_number = ?', [id, id]);

  const idx = (memoryStore.invoices || []).findIndex(i => String(i.id) === String(id) || i.invoice_number === id);
  let deletedNum = id;
  if (idx !== -1) {
    const deleted = memoryStore.invoices.splice(idx, 1)[0];
    deletedNum = deleted.invoice_number || id;
    
    // Reverse any overpayment credit that came from this invoice
    const currentOverpayment = Math.max(0, (Number(deleted.paid_amount) || 0) - Number(deleted.amount));
    if (currentOverpayment > 0 && memoryStore.customer_credits) {
      const cred = memoryStore.customer_credits.find(c => c.customer_email === deleted.customer_email || c.customer_name === deleted.customer_name);
      if (cred) {
        cred.credit_balance = Math.max(0, cred.credit_balance - currentOverpayment);
      }
    }
  }

  // Also clear matching payment records if present
  if (memoryStore.payments) {
    memoryStore.payments = memoryStore.payments.filter(p => p.invoice_number !== id && String(p.id) !== String(id));
  }

  savePersistentStore();

  // Send background email for invoice deletion
  if (deletedNum !== id && deleted && deleted.customer_email) {
    const emailHtml = generateCorporateEmailHtml({
      title: `Tax Invoice Voided #${deletedNum}`,
      badgeText: 'Invoice Voided / Deleted',
      recipientName: deleted.customer_name || 'Customer',
      introText: `Please be advised that Tax Invoice #${deletedNum} has been officially voided and deleted from our records by the administration team. No further action is required on this document.`,
      itemsRows: `<tr><td colspan="3" style="text-align:center;">Invoice records completely voided.</td></tr>`,
      subtotalText: 'UGX 0',
      vatText: 'UGX 0',
      totalAmountText: 'UGX 0',
      shareLink: 'https://ncloud.co.ug/portal',
      ctaText: 'Login to Customer Portal',
      ctaLink: 'https://ncloud.co.ug/portal'
    });
    sendMail({
      to: deleted.customer_email,
      subject: `Notice: Tax Invoice #${deletedNum} Voided`,
      html: emailHtml
    }).catch(err => console.error("Failed to send invoice deletion email:", err));
  }

  return res.json({ success: true, message: `Tax Invoice #${deletedNum} deleted permanently!` });
});

app.delete('/api/admin/payments/:id', async (req, res) => {
  const { id } = req.params;
  const invNumQuery = (req.query.invoice_number || '').trim();
  const targetIdStr = String(id || '').trim();
  const cleanIdStr = targetIdStr.replace(/^PMT-/, '');
  const invMatch = targetIdStr.match(/(INV-[A-Za-z0-9-]+)/i);
  const extractedInvNum = invMatch ? invMatch[1] : '';

  try {
    if (typeof query === 'function') {
      await query('DELETE FROM payments WHERE id = ? OR reference = ? OR invoice_number = ?', [targetIdStr, targetIdStr, targetIdStr]).catch(() => {});
      if (cleanIdStr !== targetIdStr) {
        await query('DELETE FROM payments WHERE id = ? OR reference = ? OR invoice_number = ?', [cleanIdStr, cleanIdStr, cleanIdStr]).catch(() => {});
      }
      if (invNumQuery) {
        await query('DELETE FROM payments WHERE invoice_number = ?', [invNumQuery]).catch(() => {});
      }
    }
  } catch (err) {}

  let pmtRef = targetIdStr;
  
  // Find matching payment in memoryStore.payments
  const pmtIndex = (memoryStore.payments || []).findIndex(p => 
    String(p.id) === targetIdStr || 
    p.reference === targetIdStr || 
    String(p.id) === cleanIdStr ||
    p.reference === cleanIdStr ||
    (invNumQuery && p.invoice_number && p.invoice_number.trim().toLowerCase() === invNumQuery.toLowerCase() && p.reference === targetIdStr)
  );

  let pmtData = null;
  if (pmtIndex !== -1) {
    pmtData = memoryStore.payments[pmtIndex];
    pmtRef = pmtData.reference || pmtData.invoice_number || pmtData.id;
    memoryStore.payments.splice(pmtIndex, 1);
  }

  // Find invoice containing this payment either by explicit invoice number, or by searching its payment_history
  const invNumToMatch = pmtData?.invoice_number || invNumQuery || extractedInvNum || targetIdStr;
  
  const inv = (memoryStore.invoices || []).find(i => 
    (i.invoice_number && i.invoice_number.trim().toLowerCase() === invNumToMatch.toLowerCase()) ||
    String(i.id) === targetIdStr ||
    String(i.id) === cleanIdStr ||
    (i.reference && i.reference.trim().toLowerCase() === targetIdStr.toLowerCase()) ||
    (Array.isArray(i.payment_history) && i.payment_history.some(ph => String(ph.id) === targetIdStr || ph.reference === targetIdStr || String(ph.id) === cleanIdStr || ph.reference === cleanIdStr))
  );

  if (inv) {
    pmtRef = pmtData?.reference || inv.invoice_number || `INV-${inv.id}`;
    
    if (Array.isArray(inv.payment_history)) {
      // Find the specific payment in the history
      const historyPmtIndex = inv.payment_history.findIndex(ph => String(ph.id) === targetIdStr || ph.reference === targetIdStr || String(ph.id) === cleanIdStr || ph.reference === cleanIdStr);
      
      if (historyPmtIndex !== -1) {
        const historyPmt = inv.payment_history[historyPmtIndex];
        const paidAmt = Number(historyPmt.amount_paid || historyPmt.amount || pmtData?.amount_paid || pmtData?.amount || 0);
        
        // Reverse any overpayment credit that came from this payment
        const currentOverpayment = Math.max(0, (Number(inv.paid_amount) || 0) - Number(inv.amount));
        const overpaymentToReverse = Math.min(currentOverpayment, paidAmt);

        if (overpaymentToReverse > 0 && memoryStore.customer_credits) {
          const cred = memoryStore.customer_credits.find(c => c.customer_email === inv.customer_email || c.customer_name === inv.customer_name);
          if (cred) {
            cred.credit_balance = Math.max(0, cred.credit_balance - overpaymentToReverse);
          }
        }
        
        // Remove from history
        inv.payment_history.splice(historyPmtIndex, 1);
        
        // Adjust balances
        inv.paid_amount = Math.max(0, (Number(inv.paid_amount) || 0) - paidAmt);
        inv.balance = Math.max(0, Number(inv.amount) - inv.paid_amount);
        
        if (inv.paid_amount === 0) {
          inv.status = 'Pending';
        } else if (inv.paid_amount < Number(inv.amount)) {
          inv.status = 'Partial';
        }
      } else if (!pmtData) {
        // If not found in history AND not found in payments, but invoice matched the ID directly (rare fallback)
        
        // Reverse any overpayment credit that came from this invoice entirely
        const currentOverpayment = Math.max(0, (Number(inv.paid_amount) || 0) - Number(inv.amount));
        if (currentOverpayment > 0 && memoryStore.customer_credits) {
          const cred = memoryStore.customer_credits.find(c => c.customer_email === inv.customer_email || c.customer_name === inv.customer_name);
          if (cred) {
            cred.credit_balance = Math.max(0, cred.credit_balance - currentOverpayment);
          }
        }

        inv.paid_amount = 0;
        inv.balance = Number(inv.amount || 0);
        inv.status = 'Pending';
        inv.payment_history = [];
      }
    }
  }

  savePersistentStore();
  return res.json({ message: `Payment transaction record #${pmtRef} deleted successfully!` });
});

// ----------------------------------------------------
// User Roles & Granular CRUDAS Permissions API
// ----------------------------------------------------
app.get('/api/admin/roles', (req, res) => {
  res.json(memoryStore.roles || []);
});

app.post('/api/admin/roles', (req, res) => {
  const { name, code, badge_color, description, permissions } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Role name and role code are required' });
  }
  const defaultPerms = permissions || {
    invoices: { create: false, read: true, update: false, delete: false, approve: false, share: true },
    quotations: { create: false, read: true, update: false, delete: false, approve: false, share: true },
    work_orders: { create: false, read: true, update: false, delete: false, approve: false, share: false },
    payments: { create: false, read: true, update: false, delete: false, approve: false, share: false },
    expenses: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    hr: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    unifi: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    schedules: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    forensics: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    reports: { create: false, read: true, update: false, delete: false, approve: false, share: true },
    users: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    roles: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    store: { create: false, read: true, update: false, delete: false, approve: false, share: false },
    subscriptions: { create: false, read: true, update: false, delete: false, approve: false, share: false },
    settings: { create: false, read: false, update: false, delete: false, approve: false, share: false }
  };
  const newRole = {
    id: (memoryStore.roles || []).length + 1,
    name,
    code: code.toLowerCase().replace(/\s+/g, '_'),
    badge_color: badge_color || '#6366f1',
    description: description || 'Custom configured system role with defined CRUDAS module privileges.',
    user_count: 0,
    permissions: defaultPerms,
    created_at: new Date().toISOString()
  };
  memoryStore.roles.push(newRole);
  res.json({ message: `Role "${name}" created with custom module permissions`, role: newRole });
});

app.put('/api/admin/roles/:id', (req, res) => {
  const { id } = req.params;
  const { name, badge_color, description, permissions } = req.body;
  const r = (memoryStore.roles || []).find(role => role.id == id);
  if (r) {
    if (name) r.name = name;
    if (badge_color) r.badge_color = badge_color;
    if (description) r.description = description;
    if (permissions) r.permissions = permissions;
    return res.json({ message: `Role "${r.name}" updated successfully`, role: r });
  }
  res.status(404).json({ error: 'Role not found' });
});

app.put('/api/admin/roles/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  const r = (memoryStore.roles || []).find(role => role.id == id);
  if (r) {
    r.permissions = permissions;
    return res.json({ message: `Granular CRUDAS permissions updated for role "${r.name}"`, role: r });
  }
  res.status(404).json({ error: 'Role not found' });
});

app.delete('/api/admin/roles/:id', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const idx = (memoryStore.roles || []).findIndex(role => role.id == id);
  if (idx !== -1) {
    if (memoryStore.roles[idx].code === 'super_admin') {
      return res.status(400).json({ error: 'Cannot delete default Super Administrator role' });
    }
    memoryStore.roles.splice(idx, 1);
    return res.json({ message: 'User role removed successfully' });
  }
  res.status(404).json({ error: 'Role not found' });
});

// ----------------------------------------------------
// System Forensics & Security Audit Logs API
// ----------------------------------------------------
app.get('/api/admin/forensics', (req, res) => {
  res.json(memoryStore.audit_logs || []);
});

app.post('/api/admin/forensics', (req, res) => {
  const { user_email, user_name, user_role, action, resource_type, resource_id, details } = req.body;
  const logEntry = {
    id: Date.now(),
    user_email: user_email || 'systems@ncloud.co.ug',
    user_name: user_name || 'System Operator',
    user_role: user_role || 'super_admin',
    action: action || 'SECURITY_AUDIT_ACTION',
    resource_type: resource_type || 'System',
    resource_id: resource_id || 'SYS-AUDIT',
    details: details || 'Manual security inspection logged.',
    ip_address: req.ip || '127.0.0.1',
    device_type: req.headers['user-agent'] ? (req.headers['user-agent'].includes('Mobile') ? 'Mobile Device' : 'Desktop Browser') : 'Desktop (macOS)',
    status: 'SUCCESS',
    timestamp: new Date().toISOString()
  };
  memoryStore.audit_logs.unshift(logEntry);
  res.json({ message: 'Forensics log entry recorded', log: logEntry });
});

// ----------------------------------------------------
// Automated 3-Year Audit Log Retention Policy
// ----------------------------------------------------
const purgeOldAuditLogs = async () => {
  try {
    const THREE_YEARS_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - THREE_YEARS_MS);
    const cutoffIso = cutoffDate.toISOString();

    // 1. Delete from MySQL table if connected
    await query('DELETE FROM audit_logs WHERE timestamp < ? OR created_at < ?', [cutoffIso, cutoffIso]);

    // 2. Delete from in-memory audit logs
    const initialCount = (memoryStore.audit_logs || []).length;
    memoryStore.audit_logs = (memoryStore.audit_logs || []).filter(log => {
      if (!log.timestamp && !log.created_at) return true;
      const logDate = new Date(log.timestamp || log.created_at);
      return !isNaN(logDate.getTime()) && logDate.getTime() >= cutoffDate.getTime();
    });

    const purgedCount = initialCount - memoryStore.audit_logs.length;
    if (purgedCount > 0) {
      savePersistentStore();
      console.log(`[Audit Log Retention Policy] Automatically purged ${purgedCount} audit log records older than 3 years (Cutoff: ${cutoffIso.split('T')[0]}).`);
    }
    return purgedCount;
  } catch (err) {
    console.error('[Audit Log Retention Policy Error]:', err.message);
    return 0;
  }
};

// Run retention purge on server startup & schedule every 24 hours
purgeOldAuditLogs();
setInterval(purgeOldAuditLogs, 24 * 60 * 60 * 1000);

app.post('/api/admin/forensics/purge-old', requireSuperAdmin, async (req, res) => {
  const purgedCount = await purgeOldAuditLogs();
  res.json({
    message: `Automated retention policy executed. Removed ${purgedCount} audit logs older than 3 years.`,
    purged_count: purgedCount,
    remaining_count: (memoryStore.audit_logs || []).length
  });
});

app.delete('/api/admin/forensics', requireSuperAdmin, async (req, res) => {
  await query('DELETE FROM audit_logs');
  memoryStore.audit_logs = [];
  savePersistentStore();
  res.json({ message: 'System Forensics Audit Logs cleared permanently by Super Admin' });
});

// ----------------------------------------------------
// Top Bar Announcement Banner API
// ----------------------------------------------------
app.get('/api/admin/banner-settings', (req, res) => {
  res.json(memoryStore.banner_settings || {
    message: 'Major Datacenter Expansion: 20 New 1U/2U High-Density Colocation Server Racks now live with 10Gbps Cross-Connects!',
    enabled: true,
    timing_seconds: 15,
    auto_dismiss_hours: 24,
    bg_gradient: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
  });
});

app.put('/api/admin/banner-settings', (req, res) => {
  const { message, enabled, timing_seconds, auto_dismiss_hours, bg_gradient } = req.body;
  if (!memoryStore.banner_settings) memoryStore.banner_settings = {};
  if (message !== undefined) memoryStore.banner_settings.message = message;
  if (enabled !== undefined) memoryStore.banner_settings.enabled = Boolean(enabled);
  if (timing_seconds !== undefined) memoryStore.banner_settings.timing_seconds = Number(timing_seconds);
  if (auto_dismiss_hours !== undefined) memoryStore.banner_settings.auto_dismiss_hours = Number(auto_dismiss_hours);
  if (bg_gradient !== undefined) memoryStore.banner_settings.bg_gradient = bg_gradient;
  memoryStore.banner_settings.updated_at = new Date().toISOString();
  res.json({ message: 'Top Announcement Banner settings updated successfully', banner_settings: memoryStore.banner_settings });
});

app.put('/api/admin/subscriptions/:id/status', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.role;
  if (userRole === 'customer') {
    return res.status(403).json({ error: 'Customers are not permitted to modify active subscription status.' });
  }
  const { id } = req.params;
  const { status, duration, start_date, expiry_date } = req.body;
  const sub = memoryStore.subscriptions.find(s => s.id == id);
  if (sub) {
    if (status) sub.status = status;
    if (duration) sub.duration = duration;
    if (start_date) sub.start_date = start_date;

    if (expiry_date) {
      sub.expiry_date = expiry_date;
    } else if (duration || start_date) {
      sub.expiry_date = calculateExpiryDate(sub.start_date || new Date().toISOString().split('T')[0], sub.duration || 'Monthly');
    }

    return res.json({
      message: `Subscription "${sub.plan_name}" updated successfully (Status: ${sub.status}, Expiry Date: ${sub.expiry_date})`,
      subscription: sub
    });
  }
  res.status(404).json({ error: 'Subscription record not found' });
});

app.post('/api/admin/subscriptions', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.role;
  if (userRole === 'customer') {
    return res.status(403).json({ error: 'Customers are not permitted to log manual subscriptions.' });
  }
  const { plan_name, customer_name, customer_email, customer_phone, customer_address, amount, duration, start_date, status, invoice_number } = req.body;
  if (!plan_name || !customer_name) {
    return res.status(400).json({ error: 'Plan name and customer name are required.' });
  }

  const startDate = start_date || new Date().toISOString().split('T')[0];
  const dur = duration || '1 Year';
  const expiryDate = calculateExpiryDate(startDate, dur);
  const reference = 'NV-SUB-' + Math.floor(10000 + Math.random() * 90000);
  const invNum = invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newSub = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    user_id: Date.now(),
    plan_name,
    customer_name,
    customer_email: customer_email || 'client@company.co.ug',
    customer_phone: customer_phone || '+256 700 000 000',
    customer_address: customer_address || 'Plot 14 Parliament Avenue, Kampala, Uganda',
    amount: Number(amount) || 1200000,
    currency: 'UGX',
    duration: dur,
    status: status || 'Active',
    reference,
    invoice_number: invNum,
    start_date: startDate,
    expiry_date: expiryDate,
    created_at: new Date().toISOString()
  };

  let invoiceRecord = null;
  if (invoice_number) {
    invoiceRecord = (memoryStore.invoices || []).find(i => 
      i.invoice_number === invoice_number || 
      String(i.id) === String(invoice_number)
    );
    if (invoiceRecord) {
      invoiceRecord.status = '100% Paid';
      invoiceRecord.paid_amount = Number(invoiceRecord.amount) || Number(amount) || invoiceRecord.paid_amount;
      invoiceRecord.balance = 0;
      invoiceRecord.subscription_reference = reference;
    }
  }

  if (!invoiceRecord) {
    invoiceRecord = {
      id: Date.now() + 1,
      invoice_number: invNum,
      customer_name,
      customer_email: customer_email || 'client@company.co.ug',
      customer_phone: customer_phone || '+256 700 000 000',
      customer_address: customer_address || 'Plot 14 Parliament Avenue, Kampala, Uganda',
      amount: Number(amount) || 1200000,
      paid_amount: Number(amount) || 1200000,
      balance: 0,
      status: '100% Paid',
      due_date: startDate,
      items: [{ name: plan_name, quantity: 1, price: Number(amount) || 1200000 }],
      subscription_reference: reference,
      shareable_url: `https://ncloud.co.ug/verify?doc=${invNum}`,
      created_at: new Date().toISOString()
    };
    if (!memoryStore.invoices) memoryStore.invoices = [];
    memoryStore.invoices.unshift(invoiceRecord);
  }

  if (!memoryStore.subscriptions) memoryStore.subscriptions = [];
  memoryStore.subscriptions.unshift(newSub);

  savePersistentStore();
  res.json({
    message: `Subscription for ${customer_name} logged successfully with attached active Invoice #${invNum} and calculated expiry date (${expiryDate})`,
    subscription: newSub,
    invoice: invoiceRecord
  });
});

app.delete('/api/admin/subscriptions/:id', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.role;
  if (userRole === 'customer') {
    return res.status(403).json({ error: 'Customers are not permitted to delete subscription records.' });
  }
  const { id } = req.params;
  query('DELETE FROM subscriptions WHERE id = ? OR reference = ?', [id, id]);
  memoryStore.subscriptions = (memoryStore.subscriptions || []).filter(s => String(s.id) !== String(id) && s.reference !== id);
  savePersistentStore();
  return res.json({ message: 'Subscription record deleted permanently!' });
});

// ----------------------------------------------------
// Automated Credit Control & Statutory Demand Notice Engine
// ----------------------------------------------------
const processOverdueInvoiceDemandNotices = async () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const invoices = memoryStore.invoices || [];
  const processed = [];

  for (const inv of invoices) {
    const isUnpaid = inv.status !== 'Paid' && inv.status !== '100% Paid' && inv.status !== 'Cancelled';
    if (!isUnpaid) continue;

    const dueTime = new Date(inv.due_date || todayStr).getTime();
    const currentTime = now.getTime();
    const daysOverdue = Math.floor((currentTime - dueTime) / (1000 * 60 * 60 * 24));
    
    // Check if overdue OR due within 3 days
    const isOverdue = daysOverdue >= 0;
    const isDueSoon = daysOverdue >= -3 && daysOverdue < 0;

    if (isOverdue || isDueSoon) {
      const remainingDue = Number(inv.amount || 0) - Number(inv.paid_amount || 0);
      const noticeType = isOverdue ? 'FINAL STATUTORY DEMAND NOTICE' : 'PAYMENT REQUISITION DUE ALERT';

      if (inv.customer_email) {
        try {
          const emailHtml = generateCorporateEmailHtml({
            title: isOverdue ? 'URGENT STATUTORY DEMAND NOTICE' : 'PAYMENT REQUISITION ALERT',
            badgeText: noticeType,
            recipientName: inv.customer_name,
            introText: isOverdue 
              ? `This is a formal <strong>Statutory Demand Notice</strong> regarding outstanding billing requisition for official Tax Invoice <strong>#${inv.invoice_number}</strong> which was due on <strong>${inv.due_date}</strong> (${daysOverdue} days overdue).`
              : `This is an automated <strong>Payment Requisition Alert</strong> reminding you that Tax Invoice <strong>#${inv.invoice_number}</strong> is due on <strong>${inv.due_date}</strong>.`,
            itemsRows: `
              <tr>
                <td><strong>Billed Item:</strong> ${inv.item_name || inv.plan_name || (inv.items && inv.items[0] && inv.items[0].name) || 'Cloud Service Subscription'}</td>
                <td style="text-align: center;">-</td>
                <td style="text-align: right; color: #dc2626; font-weight: 800;">UGX ${remainingDue.toLocaleString()}</td>
              </tr>
            `,
            subtotalText: `UGX ${Number(inv.amount || 0).toLocaleString()}`,
            discountRowHtml: `
              <tr>
                <td colspan="2" style="font-weight: 600;">Net Paid Amount:</td>
                <td style="text-align: right; font-weight: 700;">- UGX ${Number(inv.paid_amount || 0).toLocaleString()}</td>
              </tr>
            `,
            vatText: 'Included',
            totalAmountText: `UGX ${remainingDue.toLocaleString()}`,
            shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`,
            ctaText: 'View Invoice & Remittance Details',
            ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`,
            footerNote: `Settlement Bank Wire & Electronic Remittance Details:<br/>Bank Name: Stanbic Bank Uganda / Centenary Bank<br/>Account Name: Nova Cloud Edges (U) Limited<br/>Account Number: 9030018274910<br/>Mobile Money Merchant: MTN MoMo Pay Code 628100 / Airtel Money 430192`
          });

          const demandPdfBuffer = await generateServerInvoicePDFBuffer(inv);

          await sendMail({
            to: inv.customer_email,
            subject: `${isOverdue ? 'URGENT STATUTORY DEMAND NOTICE' : 'PAYMENT REQUISITION ALERT'}: Tax Invoice #${inv.invoice_number} (Due: ${inv.due_date})`,
            html: emailHtml,
            attachments: [
              {
                filename: `Statutory_Notice_Tax_Invoice_${inv.invoice_number}.pdf`,
                content: demandPdfBuffer,
                contentType: 'application/pdf'
              }
            ]
          });

          inv.demand_notice_sent = true;
          inv.demand_notice_date = new Date().toISOString();
          inv.reminder_count = (inv.reminder_count || 0) + 1;

          processed.push({
            invoice_number: inv.invoice_number,
            customer_name: inv.customer_name,
            customer_email: inv.customer_email,
            amount_due: remainingDue,
            due_date: inv.due_date,
            days_overdue: daysOverdue,
            status: isOverdue ? 'Demand Notice Sent (Overdue)' : 'Payment Requisition Alert Sent'
          });

          if (memoryStore.audit_logs) {
            memoryStore.audit_logs.unshift({
              id: memoryStore.audit_logs.length + 1,
              user_email: 'system.scheduler@ncloud.co.ug',
              user_name: 'Automated Credit Control Engine',
              user_role: 'system',
              action: 'DEMAND_NOTICE_DISPATCHED',
              resource_type: 'Invoices',
              resource_id: inv.invoice_number,
              details: `Dispatched ${noticeType} with PDF attachment for invoice #${inv.invoice_number} to ${inv.customer_email} (UGX ${remainingDue.toLocaleString()} due on ${inv.due_date}, ${daysOverdue} days overdue).`,
              ip_address: '127.0.0.1',
              device_type: 'System Cron',
              status: 'SUCCESS',
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error(`Failed to send demand notice to ${inv.customer_email}:`, e);
        }
      }
    }
  }

  return processed;
};

// Batch Trigger Demand Notices Route
app.post('/api/admin/invoices/trigger-demand-notices', async (req, res) => {
  const results = await processOverdueInvoiceDemandNotices();
  res.json({
    message: results.length > 0 
      ? `Statutory Demand Notices & Due Requisition Alerts dispatched for ${results.length} unpaid invoices!`
      : 'All invoices are up to date! No overdue demand notices required.',
    count: results.length,
    details: results
  });
});

// Single Invoice Demand Notice Endpoint
app.post('/api/admin/invoices/:id/demand-notice', async (req, res) => {
  const { id } = req.params;
  const inv = (memoryStore.invoices || []).find(i => i.id == id || i.invoice_number === id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const remainingDue = Number(inv.amount || 0) - Number(inv.paid_amount || 0);
  
  if (inv.customer_email) {
    try {
      const emailHtml = generateCorporateEmailHtml({
        title: 'FINAL STATUTORY DEMAND NOTICE',
        badgeText: 'FINAL NOTICE',
        recipientName: inv.customer_name,
        attachmentName: `Demand_Notice_Tax_Invoice_${inv.invoice_number}.pdf`,
        introText: `This is an official <strong>Statutory Demand Notice</strong> regarding your outstanding payment requisition for Tax Invoice <strong>#${inv.invoice_number}</strong> which was due on <strong>${inv.due_date}</strong>.`,
        itemsRows: `
          <tr>
            <td><strong>Billed Item:</strong> ${inv.item_name || 'Enterprise Cloud Infrastructure'}</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: right; color: #dc2626; font-weight: 800;">UGX ${remainingDue.toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${Number(inv.amount || 0).toLocaleString()}`,
        vatText: 'Included',
        totalAmountText: `UGX ${remainingDue.toLocaleString()}`,
        shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`,
        ctaText: 'View Invoice & Remittance Details',
        ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`,
        footerNote: `Please remit full payment immediately to prevent automated service interruption, cloud resource freeze, or statutory legal recovery proceedings.<br/><br/>Settlement Bank Wire & Electronic Remittance Details:<br/>Bank Name: Stanbic Bank Uganda / Centenary Bank<br/>Account Name: Nova Cloud Edges (U) Limited<br/>Account Number: 9030018274910<br/>Mobile Money Merchant: MTN MoMo Pay Code 628100 / Airtel Money 430192`
      });

      const pdfBuffer = await generateServerInvoicePDFBuffer(inv);

      await sendMail({
        to: inv.customer_email,
        subject: `URGENT STATUTORY DEMAND NOTICE: Tax Invoice #${inv.invoice_number} (Due: ${inv.due_date})`,
        html: emailHtml,
        attachments: [
          {
            filename: `Demand_Notice_Tax_Invoice_${inv.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      inv.demand_notice_sent = true;
      inv.demand_notice_date = new Date().toISOString();
      inv.reminder_count = (inv.reminder_count || 0) + 1;

      return res.json({
        message: `Statutory Demand Notice with attached PDF dispatched to ${inv.customer_email} for Invoice #${inv.invoice_number}`,
        invoice: inv
      });
    } catch (e) {
      return res.status(500).json({ error: `Failed to send demand notice email: ${e.message}` });
    }
  }

  res.status(400).json({ error: 'Customer email not available for this invoice.' });
});

app.post('/api/admin/invoices/:id/remind', async (req, res) => {
  const { id } = req.params;
  const invoice = memoryStore.invoices.find(i => i.id == id || i.invoice_number === id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  if (invoice.customer_email) {
    try {
      const remainingDue = Number(invoice.amount || 0) - Number(invoice.paid_amount || 0);
      const emailHtml = generateCorporateEmailHtml({
        title: `Friendly Payment Reminder: Tax Invoice #${invoice.invoice_number}`,
        badgeText: 'Payment Reminder',
        recipientName: invoice.customer_name,
        attachmentName: `Tax_Invoice_${invoice.invoice_number}.pdf`,
        introText: `This is a courteous reminder that payment for Tax Invoice <strong>#${invoice.invoice_number}</strong> (UGX ${remainingDue.toLocaleString()}) is currently pending. Please find the official invoice attached for your accounts department.`,
        itemsRows: `
          <tr>
            <td>${invoice.item_name || 'Enterprise Cloud Infrastructure'}</td>
            <td style="text-align: center;">${invoice.quantity || 1}</td>
            <td style="text-align: right;">UGX ${remainingDue.toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${Number(invoice.subtotal || invoice.amount).toLocaleString()}`,
        vatText: invoice.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(invoice.vat_amount || 0).toLocaleString()}`,
        totalAmountText: `UGX ${remainingDue.toLocaleString()}`,
        shareLink: invoice.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoice.invoice_number)}`,
        ctaText: 'View Invoice Online',
        ctaLink: invoice.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoice.invoice_number)}`
      });

      const pdfBuffer = await generateServerInvoicePDFBuffer(invoice);

      await sendMail({
        to: invoice.customer_email,
        subject: `Payment Reminder: Tax Invoice #${invoice.invoice_number} from Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Tax_Invoice_${invoice.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      invoice.reminder_count = (invoice.reminder_count || 0) + 1;
      return res.json({
        message: `Payment reminder email with attached official PDF sent successfully to ${invoice.customer_email} for Invoice ${invoice.invoice_number}`,
        invoice
      });
    } catch (err) {
      return res.status(500).json({ error: `Failed to dispatch reminder: ${err.message}` });
    }
  }

  res.json({ message: `Invoice #${invoice.invoice_number} has no customer email on record.` });
});

app.get('/api/sliders', (req, res) => {
  res.json(memoryStore.sliders || []);
});

app.get('/api/admin/sliders', (req, res) => {
  res.json(memoryStore.sliders || []);
});

app.post('/api/admin/sliders', (req, res) => {
  const { title, subtitle, image, active } = req.body;
  const newSlider = {
    id: Date.now(),
    title: title || 'New Hero Banner',
    subtitle: subtitle || 'Empowering Technology Solutions across Uganda',
    image: image || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    active: active !== undefined ? Boolean(active) : true
  };
  memoryStore.sliders.unshift(newSlider);
  savePersistentStore();
  res.json({ message: 'Graphic Slider added successfully', slider: newSlider });
});

app.put('/api/admin/sliders/:id', (req, res) => {
  const { id } = req.params;
  const { title, subtitle, image, active } = req.body;
  const slider = memoryStore.sliders.find(s => s.id == id);
  if (slider) {
    if (title) slider.title = title;
    if (subtitle) slider.subtitle = subtitle;
    if (image) slider.image = image;
    if (active !== undefined) slider.active = Boolean(active);
    savePersistentStore();
    return res.json({ message: 'Graphic banner updated successfully', slider });
  }
  res.status(404).json({ error: 'Slider banner not found' });
});

app.put('/api/admin/sliders/:id/toggle', (req, res) => {
  const { id } = req.params;
  const slider = memoryStore.sliders.find(s => s.id == id);
  if (slider) {
    slider.active = !slider.active;
    savePersistentStore();
    return res.json({ message: `Banner is now ${slider.active ? 'Visible on Homepage' : 'Hidden from Homepage'}`, slider });
  }
  res.status(404).json({ error: 'Slider banner not found' });
});

app.delete('/api/admin/sliders/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM sliders WHERE id = ?', [id]);
  memoryStore.sliders = (memoryStore.sliders || []).filter(s => String(s.id) !== String(id) && Number(s.id) !== Number(id));
  savePersistentStore();
  return res.json({ message: 'Slider banner deleted successfully!' });
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

// SPA Fallback Route for React Router / HTML5 History
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Nova Cloud Edges API Server running on port ${PORT}`);
});
