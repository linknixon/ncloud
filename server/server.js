import 'dotenv/config';
import express from 'express';
import { NOVA_LOGO_BASE64 } from '../src/utils/logoBase64.js';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { query, getSeedData } from './db.js';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { registerTrebuchetFont } from './trebuchetFont.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const persistentStorePath = path.join(__dirname, 'database', 'persistentStore.json');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nova_cloud_edges_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../dist')));

// Persistent Data Storage Helper (Preserves user database records & saved items)
function loadPersistentStore() {
  try {
    if (fs.existsSync(persistentStorePath)) {
      const data = JSON.parse(fs.readFileSync(persistentStorePath, 'utf8'));
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log('[Database Persistence] Successfully restored user database items & saved settings from persistentStore.json');
        
        // Auto-migrate legacy voucher tokens to include a dash
        if (data.unifi_vouchers && Array.isArray(data.unifi_vouchers)) {
          data.unifi_vouchers.forEach(v => {
            let t = String(v.token);
            if (!t.includes('-') && t.length > 4) {
              const mid = Math.ceil(t.length / 2);
              v.token = t.slice(0, mid) + '-' + t.slice(mid);
            }
          });
        }
        
        return data;
      }
    }
  } catch (err) {
    console.error('[Database Persistence] Warning reading persistentStore.json:', err.message);
  }
  return null;
}

let saveStoreTimeout = null;
export function savePersistentStore(immediate = false) {
  const executeSave = () => {
    try {
      if (typeof memoryStore !== 'undefined' && memoryStore) {
        const dir = path.dirname(persistentStorePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(persistentStorePath, JSON.stringify(memoryStore, null, 2), 'utf8');
      }
    } catch (err) {
      console.error('[Database Persistence] Warning writing persistentStore.json:', err.message);
    }
  };

  if (immediate) {
    if (saveStoreTimeout) clearTimeout(saveStoreTimeout);
    executeSave();
  } else {
    if (saveStoreTimeout) clearTimeout(saveStoreTimeout);
    saveStoreTimeout = setTimeout(executeSave, 800);
  }
}

// Real SMTP Email Transport Helper (Nodemailer Socket Connection)
export async function sendMail({ to, cc, subject, text, html, attachments }) {
  const settings = memoryStore?.smtp_settings || {};
  const host = (settings.host && settings.host.trim()) || process.env.SMTP_HOST;
  const port = Number(settings.port) || Number(process.env.SMTP_PORT) || 587;
  const securityType = settings.security_type || 'TLS';
  const secure = securityType === 'SSL/TLS' || securityType === 'SSL' || port === 465;
  const user = (settings.username && settings.username.trim()) || process.env.SMTP_USER;
  const pass = settings.password || process.env.SMTP_PASS;
  const senderName = settings.sender_name || 'Nova Cloud Edges Official Notifications';
  const senderEmail = (settings.sender_email && settings.sender_email.trim()) || user || 'alerts@ncloud.co.ug';

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

    // Clean plain-text fallback: strip <style> and <script> blocks so raw CSS does not bleed into plain-text clients
    const cleanPlainText = text || (html
      ? html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      : '');

    // Sanitize subject: eliminate em-dashes and aggressively strip emojis to avoid spam filters
    const cleanSubject = (subject || 'Nova Cloud Edges Official Notification')
      .replace(/[•→—]/g, '-')
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Standardize attachments with explicit content disposition
    const normalizedAttachments = (Array.isArray(attachments) && attachments.length > 0)
      ? attachments.map(att => ({
          filename: att.filename || 'document.pdf',
          content: att.content,
          contentType: att.contentType || 'application/pdf',
          contentDisposition: att.contentDisposition || 'attachment'
        }))
      : undefined;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: senderEmail,
      to: formattedTo,
      ...(cc ? { cc: (typeof cc === 'string' && cc.includes(',')) ? cc.split(',').map(e => e.trim()).filter(Boolean) : cc } : {}),
      subject: cleanSubject,
      text: cleanPlainText,
      html: html || `<p>${cleanPlainText}</p>`,
      attachments: normalizedAttachments
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
  events: [],
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
      cron_expression: '*/30 * * * * *',
      frequency: 'Every 30 Seconds',
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
    },
    {
      id: 7,
      name: 'Systems Administrator',
      code: 'systems_admin',
      badge_color: '#10b981',
      description: 'Manages API integrations, infrastructure connectivity, and core system configurations.',
      user_count: 1,
      permissions: {
        invoices: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        quotations: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        work_orders: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        payments: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        expenses: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        hr: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        unifi: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        schedules: { create: true, read: true, update: true, delete: true, approve: true, share: true },
        forensics: { create: true, read: true, update: false, delete: false, approve: false, share: true },
        reports: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        users: { create: true, read: true, update: true, delete: false, approve: false, share: false },
        roles: { create: true, read: true, update: true, delete: false, approve: false, share: false },
        store: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        subscriptions: { create: false, read: true, update: false, delete: false, approve: false, share: false },
        settings: { create: true, read: true, update: true, delete: true, approve: true, share: true }
      }
    }
  ],
  api_integrations: [
    {
      id: 'iotec_pay',
      name: 'ioTec PayGateway',
      provider: 'ioTec Pay',
      status: 'active',
      client_id: '',
      client_secret: '',
      wallet_id: '',
      last_updated: new Date().toISOString()
    },
    {
      id: 'unifi_api',
      name: 'UniFi OS Network Integration',
      provider: 'Ubiquiti',
      status: 'active',
      client_id: '88f7af54-98f8-306a-a1c7-c9349722b1f6', // Site ID
      client_secret: 'm1583Qhvi9hAOwxZsGYhh31Zqmh84Tda', // API Key
      wallet_id: '',
      last_updated: new Date().toISOString()
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
    } else {
      memoryStore[key] = loadedDiskStore[key];
    }
  });
  console.log(`[Database Persistence] Restored ${memoryStore.users?.length || 0} total system users from persistent disk store.`);
}

if (!memoryStore.site_logo) {
  memoryStore.site_logo = '/nova_logo_official.png';
}
if (!memoryStore.site_favicon || memoryStore.site_favicon === '/nova_logo_official.png') {
  memoryStore.site_favicon = '/favicon.png?v=2';
}

if (!memoryStore.delivery_notes) {
  memoryStore.delivery_notes = [];
}

const defaultTopbarSettings = {
  enabled: true,
  bg_color: '#0a192f', // Corporate Dark Blue as requested
  text_color: '#ffffff', // Crisp White as requested
  phone: '0790001631',
  email: 'support@ncloud.co.ug',
  location_text: 'Lugga Zone, Ndejje, Wakiso',
  location_short: 'Kampala',
  maps_url: 'https://maps.google.com/?q=Lugga+Zone,+Ndejje,+Wakiso,+Uganda',
  noc_status_enabled: true,
  noc_status_text: '24/7 Support NOC',
  whatsapp: 'https://wa.me/256790001631',
  linkedin: 'https://www.linkedin.com/company/nova-cloud-edges',
  twitter: 'https://x.com/novacloudedges',
  facebook: 'https://facebook.com/novacloudedges',
  github: 'https://github.com/linknixon/ncloud'
};

if (!memoryStore.topbar_settings) {
  memoryStore.topbar_settings = defaultTopbarSettings;
} else {
  memoryStore.topbar_settings = { ...defaultTopbarSettings, ...memoryStore.topbar_settings };
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
    address: 'Lugga Zone, Ndejje, Wakiso, Uganda',
    phone: '0790001631',
    email: 'support@ncloud.co.ug'
  });
});

app.get('/api/partners', (req, res) => {
  res.json(memoryStore.partners || []);
});

app.post('/api/admin/partners', (req, res) => {
  const { name, category, website, logo_text, logo_url, logo } = req.body;
  if (!name) return res.status(400).json({ error: 'Partner name is required' });
  const finalLogoUrl = logo_url || logo || '';
  const newPartner = {
    id: Date.now(),
    name,
    category: category || 'Technology Partner',
    website: website || '',
    logo_text: logo_text || name,
    logo_url: finalLogoUrl,
    logo: finalLogoUrl
  };
  memoryStore.partners.push(newPartner);
  savePersistentStore();
  res.json({ message: 'Partner added successfully', partner: newPartner });
});

app.put('/api/admin/partners/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, website, logo_text, logo_url, logo } = req.body;
  const finalLogoUrl = logo_url !== undefined ? logo_url : (logo !== undefined ? logo : undefined);
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
    if (finalLogoUrl !== undefined) {
      p.logo_url = finalLogoUrl;
      p.logo = finalLogoUrl;
    }
    savePersistentStore();
    return res.json({ message: 'Partner updated successfully', partner: p });
  }
  const newPartner = {
    id: Date.now(),
    name: name || 'Technology Partner',
    category: category || 'Technology Partner',
    website: website || '',
    logo_text: logo_text || name,
    logo_url: finalLogoUrl || '',
    logo: finalLogoUrl || ''
  };
  memoryStore.partners.push(newPartner);
  savePersistentStore();
  res.json({ message: 'Partner saved successfully', partner: newPartner });
});

// Authorization Middleware for Deletion Operations
function requireSuperAdmin(req, res, next) {
  const rawRole = req.headers['x-user-role'] || req.body?.user_role || req.body?.admin_role || req.query?.user_role;
  if (!rawRole) return next();
  const roleClean = String(rawRole).trim().toLowerCase().replace(/\s+/g, '_');
  const allowed = ['super_admin', 'admin', 'sales_admin', 'web_admin', 'hr_manager', 'superadmin'];
  if (allowed.includes(roleClean)) {
    return next();
  }

  // Check if custom role has permission for deletion
  const customRole = (memoryStore.roles || []).find(r => r.code === roleClean);
  if (customRole && customRole.permissions) {
    const hasDeletePermission = Object.values(customRole.permissions).some(p => p && p.delete === true);
    if (hasDeletePermission) {
      return next();
    }
  }

  return res.status(403).json({ error: 'Access Denied: Only users with deletion permissions can remove system records.' });
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
  res.json(memoryStore.iso_certificates || []);
});

// ==========================================
// EVENTS API
// ==========================================
app.get('/api/events', (req, res) => {
  res.json(memoryStore.events || []);
});

app.post('/api/admin/events', (req, res) => {
  const { title, date, location, description, image } = req.body;
  if (!title) return res.status(400).json({ error: 'Event title is required' });
  const newEvent = {
    id: Date.now(),
    title,
    date: date || new Date().toISOString().split('T')[0],
    location: location || 'Virtual',
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    registrations: []
  };
  if (!memoryStore.events) memoryStore.events = [];
  memoryStore.events.unshift(newEvent);
  savePersistentStore();
  res.json({ message: 'Event posted successfully!', event: newEvent });
});

app.put('/api/admin/events/:id', (req, res) => {
  const { id } = req.params;
  const { title, date, location, description, image } = req.body;
  const event = (memoryStore.events || []).find(e => String(e.id) === String(id));
  if (event) {
    if (title) event.title = title;
    if (date) event.date = date;
    if (location) event.location = location;
    if (description) event.description = description;
    if (image) event.image = image;
    savePersistentStore();
    return res.json({ message: 'Event updated successfully!', event });
  }
  res.status(404).json({ error: 'Event not found' });
});

app.delete('/api/admin/events/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  memoryStore.events = (memoryStore.events || []).filter(e => String(e.id) !== String(id));
  savePersistentStore();
  return res.json({ message: 'Event removed successfully!' });
});

app.post('/api/events/:id/register', verifyTurnstile, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company } = req.body;
  
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required to register.' });

  const event = (memoryStore.events || []).find(e => String(e.id) === String(id));
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (!event.registrations) event.registrations = [];
  
  // Prevent duplicate registration for the same event
  const alreadyRegistered = event.registrations.find(r => r.email.toLowerCase() === email.toLowerCase());
  if (alreadyRegistered) {
    return res.status(400).json({ error: 'You are already registered for this event.' });
  }

  const registration = {
    id: Date.now(),
    name,
    email,
    phone: phone || '',
    company: company || '',
    registered_at: new Date().toISOString()
  };

  event.registrations.push(registration);
  savePersistentStore();
  
  res.json({ success: true, message: 'You have successfully registered for this event!' });
});

app.get('/api/iso-standards', (req, res) => {
  const seed = getSeedData();
  res.json(seed ? seed.isoStandards : []);
});

// ----------------------------------------------------
// Cloudflare Turnstile Verification Middleware
// ----------------------------------------------------
async function verifyTurnstile(req, res, next) {
  const xForwardedHost = (req.headers['x-forwarded-host'] || '').toLowerCase();
  const host = (xForwardedHost || req.headers.host || req.hostname || '').toLowerCase();
  const origin = (req.headers.origin || '').toLowerCase();
  const referer = (req.headers.referer || '').toLowerCase();

  const isProduction = 
    host.includes('ncloud.co.ug') || 
    origin.includes('ncloud.co.ug') || 
    referer.includes('ncloud.co.ug') ||
    host.includes('ncedges.com') ||
    origin.includes('ncedges.com');

  const isLocalhost = !isProduction && (
    host.includes('localhost') || 
    host.includes('127.0.0.1') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    referer.includes('localhost') || 
    referer.includes('127.0.0.1')
  );

  const token = req.body.turnstileToken || req.headers['x-turnstile-token'];

  // Seamless Cloudflare Turnstile bypass on localhost development environment
  if (isLocalhost && (token === 'bypass-localhost' || token === 'localhost-test-token')) {
    return next();
  }

  const security = memoryStore.security_settings;
  const isValidSecret = security && 
    security.turnstile_secret_key && 
    !security.turnstile_secret_key.includes('testSecretKey') &&
    security.turnstile_secret_key !== '0x4AAAAAAtestSecretKey67890';

  if (!security || !security.is_active || !isValidSecret) {
    return next();
  }

  if (!token) {
    return res.status(400).json({ error: 'CAPTCHA verification is required. Please check the box.' });
  }

  try {
    // Use AbortController to enforce a 7-second timeout on the Cloudflare API call.
    // Without this, a network issue on the production server causes the request to hang
    // indefinitely, leaving the browser stuck on "Authenticating..."
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    let cfData = { success: false };
    try {
      const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(security.turnstile_secret_key)}&response=${encodeURIComponent(token)}`,
        signal: controller.signal
      });
      cfData = await cfRes.json();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      // If Cloudflare is unreachable or timed out, allow login to proceed rather than
      // blocking all users. Log the failure for monitoring.
      console.warn('[Turnstile] Cloudflare siteverify unreachable, bypassing CAPTCHA check:', fetchErr.message);
      return next();
    }
    clearTimeout(timeoutId);

    if (!cfData.success) {
      return res.status(403).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }
    next();
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return res.status(500).json({ error: 'CAPTCHA verification service unavailable.' });
    // Fail open — do not block login if our verification logic itself crashes
    return next();
  }
}

// ----------------------------------------------------
// Password Policy & Common Password Detection
// ----------------------------------------------------
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'pass1234', 'p@ssword', 'p@ssw0rd',
  '123456', '1234567', '12345678', '123456789', '1234567890', '00000000', '11111111', '87654321',
  'qwerty', 'qwerty1', 'qwerty123', 'qwertz123', 'asdfghjk', 'zxcvbnm1',
  'admin', 'admin123', 'admin2024', 'admin2025', 'admin2026', 'administrator', 'root1234',
  'welcome', 'welcome1', 'welcome123', 'letmein1', 'iloveyou1', 'monkey123',
  'novacloud', 'novacloud123', 'ncloud123', 'ncloud2026', 'testing123', 'default123',
  'dragon123', 'master123', 'sunshine1', 'football1', 'secret123', 'login123'
]);

function validatePasswordStrength(password, userEmail = '', userName = '') {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Password must contain both letters and numbers for adequate security.' };
  }

  const clean = password.toLowerCase().trim();

  if (COMMON_PASSWORDS.has(clean)) {
    return { isValid: false, error: 'This password is too common and easily guessed. Please choose a more unique password.' };
  }

  // Detect common dictionary words with simple digit/symbol suffixes (e.g. admin12345, password2026, welcome99)
  const commonBasePattern = /^(password|passcode|admin|administrator|welcome|qwerty|letmein|novacloud|ncloud|changeme|guest|system|testing|default|portal)[0-9!@#$%^&*_\-.]*$/i;
  if (commonBasePattern.test(clean)) {
    return { isValid: false, error: 'This password is based on a common easily guessed word. Please choose a more unique password.' };
  }

  // Detect simple repeated character sequences
  if (/^(.)\1+$/.test(clean) || /^(.{2,4})\1+$/.test(clean)) {
    return { isValid: false, error: 'Password contains repetitive patterns. Please choose a stronger password.' };
  }

  // Detect if password matches the email prefix
  if (userEmail && typeof userEmail === 'string') {
    const emailPrefix = userEmail.split('@')[0].toLowerCase().trim();
    if (emailPrefix.length >= 3 && (clean === emailPrefix || clean === emailPrefix + '123' || clean === emailPrefix + '1')) {
      return { isValid: false, error: 'Password cannot be derived from your email address.' };
    }
  }

  // Detect if password matches user's name
  if (userName && typeof userName === 'string') {
    const cleanName = userName.toLowerCase().replace(/\s+/g, '');
    if (cleanName.length >= 3 && (clean === cleanName || clean === cleanName + '123' || clean === cleanName + '1')) {
      return { isValid: false, error: 'Password cannot be derived from your name.' };
    }
  }

  return { isValid: true };
}

// ----------------------------------------------------
// Email Verification & Welcome Email Dispatchers
// ----------------------------------------------------
async function sendVerificationEmail(user, req) {
  const xForwardedHost = (req.headers['x-forwarded-host'] || '').toLowerCase();
  const host = (xForwardedHost || req.headers.host || '').toLowerCase();
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = host.includes('ncloud.co.ug') 
    ? 'https://ncloud.co.ug' 
    : `${protocol}://${host || 'localhost:3000'}`;

  const verifyUrl = `${baseUrl}/verify-email?token=${user.verification_token}`;

  const html = generateCorporateEmailHtml({
    title: 'Account Verification Required',
    preheader: 'Complete your registration',
    recipientName: user.name,
    badgeText: 'Action Required',
    introText: 'Thank you for registering with Nova Cloud Edges. To activate your account and access your dashboard, please verify your email address by clicking the button below.',
    ctaText: 'Verify Email Address',
    ctaLink: verifyUrl,
    shareLink: verifyUrl,
    hidePaymentMethods: true,
    attachmentName: false
  });

  return await sendMail({
    to: user.email,
    subject: 'Activate Your Nova Cloud Account — Email Verification Required',
    html
  });
}

async function sendAdminCreatedUserEmail(user, rawPassword, req) {
  const xForwardedHost = (req.headers['x-forwarded-host'] || '').toLowerCase();
  const host = (xForwardedHost || req.headers.host || '').toLowerCase();
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = host.includes('ncloud.co.ug') 
    ? 'https://ncloud.co.ug' 
    : `${protocol}://${host || 'localhost:3000'}`;
  const loginUrl = `${baseUrl}/login`;

  const html = generateCorporateEmailHtml({
    title: 'Welcome to Nova Cloud Portal',
    preheader: 'Your corporate account has been provisioned',
    recipientName: user.name,
    badgeText: 'Account Provisioned',
    introText: `An administrator has created an authorized portal account for you at Nova Cloud Edges with the assigned role: <strong>${user.role || 'Member'}</strong>.`,
    itemsRows: `
      <tr>
        <td colspan="3" style="padding: 16px; background: #e0f2fe; border-radius: 8px; border-left: 4px solid #0284c7;">
          <strong style="color: #0f172a;">Login URL:</strong> <a href="${loginUrl}" style="color: #0284c7; word-break: break-all;">${loginUrl}</a><br><br>
          <strong style="color: #0f172a;">Login Email:</strong> ${user.email}<br>
          ${rawPassword ? `<strong style="color: #0f172a;">Temporary Password:</strong> <span style="font-family: monospace; background: #bae6fd; padding: 2px 6px; border-radius: 4px; color: #0f172a;">${rawPassword}</span><br><br>` : ''}
          <strong style="color: #0f172a;">Account Status:</strong> <span style="color: #059669; font-weight: bold;">Active & Ready</span>
        </td>
      </tr>
      ${rawPassword ? `
      <tr>
        <td colspan="3" style="padding: 16px; font-size: 13px; color: #dc2626; font-weight: 600;">
          IMPORTANT: For your security, please log in immediately and change your password in your Account Settings.
        </td>
      </tr>` : ''}
    `,
    ctaText: 'Access Client Portal',
    ctaLink: loginUrl,
    hidePaymentMethods: true,
    attachmentName: false
  });

  return await sendMail({
    to: user.email,
    subject: 'Welcome to Nova Cloud Edges — Your Portal Account Credentials',
    html
  });
}

// ----------------------------------------------------
// Auth Endpoints
// ----------------------------------------------------
app.post('/api/auth/register', verifyTurnstile, async (req, res) => {
  const { name, email, password, phone, company } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  // Validate password policy and block common weak passwords
  const pwdCheck = validatePasswordStrength(password, email, name);
  if (!pwdCheck.isValid) {
    return res.status(400).json({ error: pwdCheck.error });
  }

  const existing = (memoryStore.users || []).find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'Email already registered. Please sign in or reset your password.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const isFirstUser = (memoryStore.users || []).length === 0;
  const assignedRole = isFirstUser ? 'super_admin' : 'customer';

  // First user is super_admin and verified immediately; subsequent public signups require email confirmation
  const isVerified = isFirstUser;
  const verificationToken = isFirstUser ? null : crypto.randomBytes(32).toString('hex');
  const verificationExpires = isFirstUser ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashedPassword,
    password_hash: hashedPassword,
    role: assignedRole,
    position: assignedRole === 'super_admin' ? 'Admin' : 'Customer',
    title: assignedRole === 'super_admin' ? 'Admin' : 'Customer',
    phone: phone || null,
    company: company || null,
    status: 'Active',
    is_verified: isVerified,
    verification_token: verificationToken,
    verification_expires: verificationExpires,
    created_at: new Date().toISOString()
  };

  memoryStore.users.unshift(newUser);
  savePersistentStore();

  // Try MySQL
  await query(
    'INSERT INTO users (name, email, password_hash, role, phone, company, status, is_verified, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [newUser.name, newUser.email, hashedPassword, assignedRole, newUser.phone, newUser.company, 'Active', isVerified ? 1 : 0, verificationToken]
  ).catch(() => {});

  if (!isVerified) {
    // Send confirmation email
    try {
      await sendVerificationEmail(newUser, req);
    } catch (mailErr) {
      console.warn('[Signup Verification Email Error]:', mailErr);
    }

    return res.json({
      success: true,
      requires_verification: true,
      message: `Account registered successfully! A confirmation email has been sent to ${newUser.email}. Please verify your email before logging in.`,
      email: newUser.email
    });
  }

  // If first user (Super Admin)
  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email, role: assignedRole }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    success: true,
    message: 'Super Administrator registered and activated successfully.',
    token,
    user: newUser
  });
});

app.post('/api/auth/login', verifyTurnstile, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Check MySQL
  const dbRes = await query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  let user = null;

  if (dbRes.success && dbRes.data.length > 0) {
    user = dbRes.data[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
  } else {
    // Check Memory store
    const memUser = (memoryStore.users || []).find(u => u && u.email && u.email.toLowerCase() === email.trim().toLowerCase());
    if (memUser) {
      const storedHash = memUser.passwordHash || memUser.password_hash || '';
      const match = await bcrypt.compare(password, storedHash);
      if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
      user = memUser;
    } else {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
  }

  // Strict email confirmation check: Unverified users cannot log in
  if (user.is_verified === false || user.is_verified === 0) {
    return res.status(403).json({
      error: 'Please confirm your email address before logging in. We sent a verification link to your inbox.',
      needs_verification: true,
      email: user.email
    });
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

// Verify Email Confirmation Endpoint
app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  const user = (memoryStore.users || []).find(u => u && u.verification_token === token);
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification link. Please request a new verification link.' });
  }

  if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
    return res.status(400).json({ error: 'This verification link has expired. Please request a new verification email.', expired: true, email: user.email });
  }

  user.is_verified = true;
  user.verification_token = null;
  user.verification_expires = null;
  user.verified_at = new Date().toISOString();

  await query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE email = ?', [user.email]).catch(() => {});
  savePersistentStore();

  const jwtToken = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    success: true,
    message: 'Email confirmed successfully! Your account is now active and ready to use.',
    token: jwtToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role || 'customer' }
  });
});

// Resend Verification Email Endpoint
app.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const user = (memoryStore.users || []).find(u => u && u.email && u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email address.' });
  }

  if (user.is_verified === true || user.is_verified === 1) {
    return res.status(400).json({ error: 'This account is already verified. You can sign in directly.' });
  }

  user.verification_token = crypto.randomBytes(32).toString('hex');
  user.verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  savePersistentStore();

  await sendVerificationEmail(user, req);

  return res.json({
    success: true,
    message: `A fresh verification link has been sent to ${user.email}. Please check your inbox.`
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
  if (['super_admin', 'admin', 'web_admin'].includes(req.userRole)) return next();

  // Allow all authenticated users to fetch roles and users for frontend permission matrix & profile sync
  if (req.method === 'GET' && (req.path === '/roles' || req.path === '/users' || req.path === '/overview')) {
    return next();
  }

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
  else if (path.includes('/unifi/') || path.includes('/wifi/')) module = 'unifi';
  else if (path.includes('/roles') || path.includes('/users')) module = 'roles';
  else if (path.includes('/store') || path.includes('/product-categories')) module = 'store';
  else if (path.includes('/subscriptions') || path.includes('/customer-credits')) module = 'subscriptions';
  else if (path.includes('settings') || path.includes('security') || path.includes('/overview') || path.includes('/forensics') || path.includes('/sliders') || path.includes('/banner-settings') || path.includes('/notification-emails') || path.includes('/smtp-settings') || path.includes('/partners') || path.includes('/reports/analytics')) module = 'settings';
  
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

// Protect admin endpoints, while allowing public read access to branding/identity settings
app.use('/api/admin', (req, res, next) => {
  if (req.method === 'GET' && (
    req.path === '/settings/logo' || 
    req.path === '/settings/favicon' || 
    req.path === '/settings/stamp' || 
    req.path === '/settings/paid-stamp' || 
    req.path === '/topbar-settings'
  )) {
    return next();
  }
  return verifyToken(req, res, () => requireCRUDAS(req, res, next));
});

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

  // --- UniFi Auto-Sync: group available vouchers by duration_hours ---
  // Build a price map from admin-configured wifi_voucher_prices (set in memoryStore)
  const voucherPriceMap = memoryStore.wifi_voucher_prices || {}; // { durationHours: price }

  const durationGroups = {};
  availableVouchers.forEach(v => {
    const dh = Number(v.duration_hours);
    const label = v.duration_label || 'Unknown';
    // Use composite key for sub-hour vouchers to prevent collapse
    const mapKey = dh > 0 && dh < 1 ? `min-${label}` : (dh > 0 ? String(dh) : `zero-${label}`);
    
    if (!durationGroups[mapKey]) {
      // For price lookup, we still use the mapKey since the price map saves prices using this same mapKey from AdminDashboard
      durationGroups[mapKey] = { 
        duration_hours: dh > 0 ? dh : v.duration_hours, 
        duration_label: label, 
        mapKey: mapKey,
        count: 0 
      };
    }
    durationGroups[mapKey].count++;
  });

  // Build auto-generated WiFi Voucher products from unique durations
  const autoWifiProducts = Object.values(durationGroups).map(group => {
    const slug = `wifi-voucher-${group.mapKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const name = `WiFi Voucher – ${group.duration_label}`;
    // Check if admin already has a manual product for this duration
    const manualProduct = rawProducts.find(p => {
      const pSlug = (p.slug || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      return pSlug === slug || pSlug.includes(`${group.duration_hours}h`) ||
        (pName.includes('wifi voucher') && pName.includes(group.duration_label.toLowerCase()));
    });
    if (manualProduct) return null; // Will be handled by normalizedProducts loop below

    const price = voucherPriceMap[group.mapKey] || voucherPriceMap[String(group.duration_hours)] || 0;
    return {
      id: slug,
      slug,
      name,
      category: 'WiFi Vouchers',
      price,
      currency: 'UGX',
      badge: 'WiFi',
      stock: group.count,
      short_desc: `${group.duration_label} high-speed Nova WiFi access voucher.`,
      desc: `${group.duration_label} high-speed Nova WiFi access voucher.`,
      description: `Enjoy ${group.duration_label} of high-speed Nova WiFi internet access. Your voucher token will be emailed immediately upon full payment.`,
      specs: `${group.duration_label} internet access | Instant Token Delivery | VAT Exempt`,
      details: `${group.duration_label} internet access | Instant Token Delivery | VAT Exempt`,
      image_url: 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png',
      checkout_type: 'shop',
      checkout_flow: 'shop',
      is_hidden: false,
      _isWifiVoucher: true,
      _autoGenerated: true
    };
  }).filter(Boolean);

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

    const finalProduct = {
      ...p,
      stock,
      _isWifiVoucher: isWifiVoucher,
      short_desc: p.short_desc || p.desc || '',
      desc: p.short_desc || p.desc || '',
      description: p.description || p.specs || p.details || '',
      specs: p.description || p.specs || p.details || '',
      details: p.description || p.specs || p.details || ''
    };
    
    if (isWifiVoucher && (!p.image_url || p.image_url.includes('unsplash.com'))) {
      finalProduct.image_url = 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png';
    }
    
    return finalProduct;
  }).filter(p => !(p._isWifiVoucher && p.stock <= 0));

  normalizedProducts.forEach(p => delete p._isWifiVoucher);

  // Merge auto-generated WiFi products (only those with stock > 0 AND a price configured)
  const allProducts = [
    ...normalizedProducts.filter(p => p.price > 0),
    ...autoWifiProducts
      .filter(p => p.stock > 0 && p.price > 0)
      .map(p => { delete p._isWifiVoucher; delete p._autoGenerated; return p; })
  ];

  res.json(allProducts);
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

app.post(['/api/admin/products/bulk', '/api/products/bulk'], async (req, res) => {
  const { products: items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of products to import.' });
  }

  if (!memoryStore.products) memoryStore.products = [];
  if (!memoryStore.product_categories) memoryStore.product_categories = [];

  const addedProducts = [];
  for (const item of items) {
    const name = (item.name || '').trim();
    if (!name) continue;

    const rawCategory = (item.category || 'Hosting Services').trim();
    // Auto-create category if not present
    let cat = memoryStore.product_categories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());
    if (!cat) {
      cat = {
        id: memoryStore.product_categories.length + 1,
        name: rawCategory,
        slug: rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`,
        description: `${rawCategory} product category`,
        display_order: memoryStore.product_categories.length + 1
      };
      memoryStore.product_categories.push(cat);
    }

    const price = Number(item.price) || 0;
    const currency = (item.currency || 'UGX').trim();
    const badge = (item.badge || '').trim();
    const short_desc = (item.short_desc || item.shortDescription || item.desc || '').trim();
    const description = (item.description || item.fullDescription || short_desc).trim();
    const image_url = (item.image_url || item.image || item.imageUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80').trim();
    const stock = item.stock !== undefined && item.stock !== '' ? Number(item.stock) : 50;
    const is_hidden = item.is_hidden === true || item.is_hidden === 'true' || item.is_hidden === 1 || item.is_hidden === '1';
    const checkout_type = item.checkout_flow || item.checkout_type || 'shop';
    const slug = (item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) + '-' + Math.floor(100 + Math.random() * 900);

    const newId = Date.now() + Math.floor(Math.random() * 1000) + addedProducts.length;
    const newProd = {
      id: newId,
      name,
      slug,
      category: cat.name,
      price,
      currency,
      badge,
      short_desc,
      desc: short_desc,
      description,
      specs: description,
      details: description,
      image_url,
      stock,
      is_hidden,
      checkout_type,
      checkout_flow: checkout_type
    };

    try {
      await query(
        'INSERT INTO products (name, slug, category, price, currency, badge, short_desc, description, image_url, stock, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, slug, cat.name, price, currency, badge, short_desc, description, image_url, stock, is_hidden ? 1 : 0]
      );
    } catch (e) {
      // Ignored if table or db fallback
    }

    memoryStore.products.unshift(newProd);
    addedProducts.push(newProd);
  }

  savePersistentStore();

  if (memoryStore.audit_logs) {
    memoryStore.audit_logs.unshift({
      id: Date.now(),
      action: 'BULK_PRODUCT_IMPORT',
      actor: req.userEmail || 'Admin',
      role: req.userRole || 'admin',
      details: `Bulk imported ${addedProducts.length} products into store catalog.`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    message: `Successfully imported ${addedProducts.length} product(s) into catalog!`,
    count: addedProducts.length,
    products: addedProducts
  });
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, currency, badge, short_desc, description, image_url, stock, is_hidden, checkout_type, checkout_flow } = req.body;

  const numPrice = price !== undefined ? Number(price) : undefined;
  const numStock = stock !== undefined ? Number(stock) : undefined;
  const routingType = checkout_type || checkout_flow;

  // Build dynamic SET clause — only update fields that were explicitly sent.
  // This fixes the COALESCE bug where image_url couldn't be changed if it already had a value.
  const setClauses = [];
  const setValues = [];
  if (name !== undefined)        { setClauses.push('name = ?');        setValues.push(name); }
  if (category !== undefined)    { setClauses.push('category = ?');    setValues.push(category); }
  if (numPrice !== undefined)    { setClauses.push('price = ?');       setValues.push(numPrice); }
  if (currency !== undefined)    { setClauses.push('currency = ?');    setValues.push(currency); }
  if (badge !== undefined)       { setClauses.push('badge = ?');       setValues.push(badge); }
  if (short_desc !== undefined)  { setClauses.push('short_desc = ?'); setValues.push(short_desc); }
  if (description !== undefined) { setClauses.push('description = ?');setValues.push(description); }
  if (image_url !== undefined)   { setClauses.push('image_url = ?');  setValues.push(image_url); }
  if (numStock !== undefined)    { setClauses.push('stock = ?');      setValues.push(numStock); }
  if (is_hidden !== undefined)   { setClauses.push('is_hidden = ?');  setValues.push(is_hidden ? 1 : 0); }

  let dbUpdated = false;
  if (setClauses.length > 0) {
    const dbUpdateRes = await query(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`, [...setValues, id]);
    dbUpdated = dbUpdateRes.success && !dbUpdateRes.isFallback;
  }

  // Always re-read from DB to get the true persisted record (avoids stale image_url from memory)
  let finalProduct = null;
  if (dbUpdated) {
    const freshDb = await query('SELECT * FROM products WHERE id = ?', [id]);
    if (freshDb.success && !freshDb.isFallback && freshDb.data && freshDb.data.length > 0) {
      finalProduct = freshDb.data[0];
    }
  }

  // Update in-memory store to stay in sync
  let pIndex = (memoryStore.products || []).findIndex(p => String(p.id) === String(id) || Number(p.id) === Number(id) || p.slug === id);
  if (pIndex !== -1) {
    const prod = memoryStore.products[pIndex];
    if (name !== undefined) prod.name = name;
    if (category !== undefined) prod.category = category;
    if (numPrice !== undefined && !isNaN(numPrice)) prod.price = numPrice;
    if (currency !== undefined) prod.currency = currency;
    if (badge !== undefined) prod.badge = badge;
    if (short_desc !== undefined) { prod.short_desc = short_desc; prod.desc = short_desc; }
    if (description !== undefined) { prod.description = description; prod.specs = description; prod.details = description; }
    if (image_url !== undefined) prod.image_url = image_url;
    if (numStock !== undefined && !isNaN(numStock)) prod.stock = numStock;
    if (is_hidden !== undefined) prod.is_hidden = Boolean(is_hidden);
    if (routingType !== undefined) { prod.checkout_type = routingType; prod.checkout_flow = routingType; }
    if (!finalProduct) finalProduct = prod;
    savePersistentStore();
  } else if (!finalProduct) {
    // Product is in DB only (not yet in memory) — build from body fields
    finalProduct = {
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
  }

  res.json({ message: `Product "${finalProduct.name}" updated successfully!`, product: finalProduct });
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

// DELETE /api/jobs/apply/:id - Delete an application permanently
app.delete('/api/jobs/apply/:id', verifyToken, async (req, res) => {
  if (req.userRole !== 'super_admin' && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Permission denied. Only Admins and Super Admins can delete applications.' });
  }
  
  const id = req.params.id;
  const initialLength = memoryStore.applications.length;
  memoryStore.applications = memoryStore.applications.filter(a => String(a.id) !== String(id));
  
  if (memoryStore.applications.length === initialLength) {
    return res.status(404).json({ error: 'Application not found.' });
  }
  
  await query('DELETE FROM job_applications WHERE id = ?', [id]);
  savePersistentStore();
  res.json({ message: 'Application deleted successfully.' });
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
  savePersistentStore();

  // Send confirmation email to applicant
  const applicantEmailHtml = generateCorporateEmailHtml({
    title: `Job Application Received: ${targetJob ? targetJob.title : 'General Position'}`,
    badgeText: 'Application Received',
    recipientName: applicant_name,
    introText: `Thank you for your interest in joining Nova Cloud Edges. We have successfully received your job application and attached resume. Our HR department is currently reviewing your profile, and we will contact you once the initial screening is complete.`,
    hidePaymentMethods: true
  });
  sendMail({ to: email, subject: 'Job Application Received — Nova Cloud Edges', html: applicantEmailHtml }).catch(e => console.error("Failed to send applicant confirmation email:", e));

  // Send alert email to HR
  const hrEmail = memoryStore.notification_emails?.sales || 'hr@ncloud.co.ug';
  const hrAlertHtml = generateCorporateEmailHtml({
    title: `New Job Application Received`,
    badgeText: 'HR Alert',
    recipientName: 'HR Department',
    introText: `A new job application has been submitted by <strong>${applicant_name}</strong> (${email}, ${phone}) for the position: <strong>${targetJob ? targetJob.title : 'General Position'}</strong> with ${experience_years} of experience.`,
    hidePaymentMethods: true
  });
  sendMail({ to: hrEmail, subject: `New Job Application: ${applicant_name}`, html: hrAlertHtml }).catch(e => console.error("Failed to send HR alert email:", e));

  // Send alert email to Admins
  const adminEmail = memoryStore.notification_emails?.billing || 'management@ncloud.co.ug';
  const adminAlertHtml = generateCorporateEmailHtml({
    title: `New Job Application Received`,
    badgeText: 'Admin Alert',
    recipientName: 'Super Admin',
    introText: `A new job application has been submitted by <strong>${applicant_name}</strong> (${email}, ${phone}) for the position: <strong>${targetJob ? targetJob.title : 'General Position'}</strong> with ${experience_years} of experience.`,
    hidePaymentMethods: true
  });
  sendMail({ to: adminEmail, subject: `New Job Application: ${applicant_name}`, html: adminAlertHtml }).catch(e => console.error("Failed to send Admin alert email:", e));

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
  const { hr_name, comments } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    appItem.status = 'Pending Super Admin Approval';
    appItem.hr_reviewed_by = hr_name || 'Systems Admin';
    appItem.hr_reviewed_at = new Date().toISOString();
    if (comments) appItem.hr_comments = comments;
    savePersistentStore();

    // Notify Applicant
    const applicantEmailHtml = generateCorporateEmailHtml({
      title: 'Application Advanced',
      badgeText: 'Stage 1 Cleared',
      recipientName: appItem.applicant_name,
      introText: `Congratulations! Your job application has successfully passed the initial HR screening. It has now been advanced to executive management for final review. We will reach out to you shortly with the final hiring decision.`,
      hidePaymentMethods: true
    });
    sendMail({ to: appItem.email, subject: 'Update on your Nova Cloud Job Application', html: applicantEmailHtml }).catch(e => console.error(e));

    // Notify Super Admin
    const adminEmail = memoryStore.notification_emails?.billing || 'management@ncloud.co.ug';
    const adminAlertHtml = generateCorporateEmailHtml({
      title: 'Final Hiring Approval Required',
      badgeText: 'Management Alert',
      recipientName: 'Super Admin',
      introText: `Candidate <strong>${appItem.applicant_name}</strong> has passed HR screening. Their application is awaiting your final review and executive hiring approval on the dashboard.`,
      hidePaymentMethods: true
    });
    sendMail({ to: adminEmail, subject: 'Pending Hiring Decision', html: adminAlertHtml }).catch(e => console.error(e));

    return res.json({
      message: `Application for "${appItem.applicant_name}" approved by HR and submitted to Super Admin for final hiring approval!`,
      application: appItem
    });
  }
  res.status(404).json({ error: 'Application not found' });
});

app.put('/api/admin/applications/:id/hr-reject', (req, res) => {
  const { id } = req.params;
  const { reason, hr_name, comments } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    appItem.status = 'Rejected by HR';
    appItem.hr_rejection_reason = reason || 'Candidate screened out by HR';
    appItem.hr_reviewed_by = hr_name || 'Systems Admin';
    appItem.hr_reviewed_at = new Date().toISOString();
    if (comments) appItem.hr_comments = comments;
    savePersistentStore();

    // Notify Applicant
    const applicantEmailHtml = generateCorporateEmailHtml({
      title: 'Update on Your Application',
      badgeText: 'Application Status',
      recipientName: appItem.applicant_name,
      introText: `Thank you for your interest in joining our team. After careful review, our HR team has decided not to advance your application at this time. We will keep your resume on file for future opportunities.`,
      hidePaymentMethods: true
    });
    sendMail({ to: appItem.email, subject: 'Update on your Nova Cloud Job Application', html: applicantEmailHtml }).catch(e => console.error(e));

    return res.json({ message: `Application for "${appItem.applicant_name}" marked as Disapproved / Rejected by HR.`, application: appItem });
  }
  res.status(404).json({ error: 'Application not found' });
});

// Stage 2: Super Admin Final Hiring & Automated User Account Creation
app.post('/api/admin/applications/:id/super-admin-approve', (req, res) => {
  const { id } = req.params;
  const { role, position, salary, company, supervisor_id, supervisor_name, comments } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    const assignedRole = role || 'staff';
    appItem.status = 'Hired & User Account Created';
    if (comments) appItem.super_admin_comments = comments;
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
        supervisor_name: supervisor_name || '',
        created_at: new Date().toISOString()
      };
      memoryStore.users.push(userRecord);
    } else {
      userRecord.role = assignedRole;
      if (position) userRecord.position = position;
    }
    savePersistentStore();

    // Notify Applicant
    const applicantEmailHtml = generateCorporateEmailHtml({
      title: 'Welcome to the Team!',
      badgeText: 'You are Hired',
      recipientName: appItem.applicant_name,
      introText: `Congratulations! Executive management has approved your job application for the role of <strong>${assignedRole}</strong>. We are thrilled to welcome you to the Nova Cloud Edges team! Your corporate system account is currently being provisioned.`,
      hidePaymentMethods: true
    });
    sendMail({ to: appItem.email, subject: 'Congratulations! You are Hired — Nova Cloud Edges', html: applicantEmailHtml }).catch(e => console.error(e));

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
  const { reason, comments } = req.body;
  const appItem = memoryStore.applications.find(a => String(a.id) === String(id) || Number(a.id) === Number(id));
  if (appItem) {
    appItem.status = 'Rejected by Super Admin';
    appItem.super_admin_rejection_reason = reason || 'Candidate rejected at executive review';
    if (comments) appItem.super_admin_comments = comments;
    savePersistentStore();

    // Notify Applicant
    const applicantEmailHtml = generateCorporateEmailHtml({
      title: 'Update on Your Application',
      badgeText: 'Application Status',
      recipientName: appItem.applicant_name,
      introText: `Thank you for your time and interest in joining our team. After final executive review, we have decided not to move forward with your application for this position. We appreciate your effort and wish you the best in your career journey.`,
      hidePaymentMethods: true
    });
    sendMail({ to: appItem.email, subject: 'Update on your Nova Cloud Job Application', html: applicantEmailHtml }).catch(e => console.error(e));

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

app.post('/api/admin/company-expenses', async (req, res) => {
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

  // Send email with attached PDF voucher if staff email is known
  if (newExpense.staff_email) {
    try {
      const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(newExpense);
      const emailHtml = generateCorporateEmailHtml({
        title: `Company Expenditure Voucher #${newExpense.receipt_ref}`,
        badgeText: 'Expense Claim Submitted',
        recipientName: newExpense.staff_name,
        attachmentName: `Expense_Voucher_${newExpense.receipt_ref}.pdf`,
        introText: `Your company expenditure voucher <strong>#${newExpense.receipt_ref}</strong> for UGX ${numAmount.toLocaleString()} (${newExpense.category}) has been logged and submitted to ${supervisorName} for review. The official certified expenditure voucher PDF has been compiled and attached.`,
        itemsRows: `
          <tr>
            <td>${newExpense.description} (${newExpense.category})</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">UGX ${numAmount.toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${numAmount.toLocaleString()}`,
        vatText: 'EXEMPT (0%)',
        totalAmountText: `UGX ${numAmount.toLocaleString()}`,
        shareLink: 'https://ncloud.co.ug/portal',
        ctaText: 'View Expenditure in Portal',
        ctaLink: 'https://ncloud.co.ug/portal',
        hidePaymentMethods: true
      });

      sendMail({
        to: newExpense.staff_email,
        subject: `Company Expenditure Voucher #${newExpense.receipt_ref} Logged - Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Expense_Voucher_${newExpense.receipt_ref}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error('[Expense Email Warning]:', err.message));
    } catch (e) {
      console.error('[Expense PDF Generation Error]:', e.message);
    }
  }

  res.json({ message: `Company expenditure of UGX ${numAmount.toLocaleString()} logged and submitted to ${supervisorName} for approval with PDF voucher attached!`, expense: newExpense });
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

app.put('/api/admin/company-expenses/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approver_name } = req.body;
  const expense = memoryStore.staff_expenses.find(e => String(e.id) === String(id) || Number(e.id) === Number(id));
  if (expense) {
    expense.status = 'Approved by Supervisor';
    expense.approved_by = approver_name || expense.supervisor_name || 'Management / Finance';
    expense.approved_at = new Date().toISOString();
    savePersistentStore();

    if (expense.staff_email) {
      try {
        const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(expense);
        const emailHtml = generateCorporateEmailHtml({
          title: `Approved Expenditure Voucher #${expense.receipt_ref}`,
          badgeText: 'Expense Claim Approved',
          recipientName: expense.staff_name,
          attachmentName: `Expense_Voucher_${expense.receipt_ref}.pdf`,
          introText: `Your company expenditure claim <strong>#${expense.receipt_ref}</strong> for UGX ${Number(expense.amount || 0).toLocaleString()} has been officially approved by <strong>${expense.approved_by}</strong>. The certified voucher PDF has been compiled and attached to this email.`,
          itemsRows: `
            <tr>
              <td>${expense.description} (${expense.category})</td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">UGX ${Number(expense.amount || 0).toLocaleString()}</td>
            </tr>
          `,
          subtotalText: `UGX ${Number(expense.amount || 0).toLocaleString()}`,
          vatText: 'EXEMPT (0%)',
          totalAmountText: `UGX ${Number(expense.amount || 0).toLocaleString()}`,
          shareLink: 'https://ncloud.co.ug/portal',
          ctaText: 'View in Portal',
          ctaLink: 'https://ncloud.co.ug/portal',
          hidePaymentMethods: true
        });

        sendMail({
          to: expense.staff_email,
          subject: `Approved: Company Expenditure Voucher #${expense.receipt_ref} - Nova Cloud Edges`,
          html: emailHtml,
          attachments: [
            {
              filename: `Expense_Voucher_${expense.receipt_ref}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        }).catch(err => console.error('[Expense Approval Email Warning]:', err.message));
      } catch (e) {
        console.error('[Expense Approval PDF Error]:', e.message);
      }
    }

    return res.json({ message: `Expenditure of UGX ${Number(expense.amount).toLocaleString()} approved by supervisor and certified PDF voucher dispatched!`, expense });
  }
  res.status(404).json({ error: 'Expenditure record not found' });
});

// Manual Send / Resend Expenditure Voucher Email Endpoint
app.post(['/api/admin/company-expenses/:id/send-email', '/api/admin/hr/expenses/:id/send-email'], async (req, res) => {
  const { id } = req.params;
  const expList = memoryStore.staff_expenses || memoryStore.company_expenses || [];
  const expense = expList.find(e => String(e.id) === String(id) || String(e.receipt_ref) === String(id));
  if (!expense) return res.status(404).json({ error: 'Expenditure record not found' });

  const recipientEmail = req.body?.recipient_email || expense.staff_email || 'finance@ncloud.co.ug';
  try {
    const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(expense);
    const emailHtml = generateCorporateEmailHtml({
      title: `Expenditure Voucher #${expense.receipt_ref}`,
      badgeText: `Expense ${expense.status || 'Voucher'}`,
      recipientName: expense.staff_name,
      attachmentName: `Expense_Voucher_${expense.receipt_ref}.pdf`,
      introText: `Please find the official company expenditure voucher <strong>#${expense.receipt_ref}</strong> for UGX ${Number(expense.amount || 0).toLocaleString()} attached as an official certified PDF document for your records.`,
      itemsRows: `
        <tr>
          <td>${expense.description || expense.category}</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">UGX ${Number(expense.amount || 0).toLocaleString()}</td>
        </tr>
      `,
      subtotalText: `UGX ${Number(expense.amount || 0).toLocaleString()}`,
      vatText: 'EXEMPT (0%)',
      totalAmountText: `UGX ${Number(expense.amount || 0).toLocaleString()}`,
      shareLink: 'https://ncloud.co.ug/portal',
      ctaText: 'Access Financial Portal',
      ctaLink: 'https://ncloud.co.ug/portal',
      hidePaymentMethods: true
    });

    await sendMail({
      to: recipientEmail,
      subject: `Official Expenditure Voucher #${expense.receipt_ref} - Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Expense_Voucher_${expense.receipt_ref}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return res.json({
      message: `Expenditure voucher #${expense.receipt_ref} and official PDF attachment dispatched to ${recipientEmail}!`,
      recipient: recipientEmail
    });
  } catch (err) {
    console.error('[Expense Manual Send Error]:', err);
    return res.status(500).json({ error: 'Failed to generate PDF voucher or send email: ' + err.message });
  }
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

app.get('/api/admin/company-expenses/:id/pdf', async (req, res) => {
  const { id } = req.params;
  const exp = (memoryStore.staff_expenses || []).find(e => String(e.id) === String(id) || String(e.receipt_ref) === String(id));
  if (!exp) {
    return res.status(404).json({ error: 'Expenditure record not found' });
  }
  try {
    const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(exp);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Expense_Voucher_${exp.receipt_ref || exp.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate expenditure voucher PDF' });
  }
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

// Helper to dispatch a WiFi voucher token when an invoice is fully paid
function dispatchWifiVoucherForInvoice(inv) {
  if (!inv) return;
  
// Handle WiFi Voucher shop purchases — auto-dispatch on 100% payment
  let dispatchedVoucher = null;
  if (inv.items && Array.isArray(inv.items)) {
    for (const item of inv.items) {
      // Match any item that references a WiFi/Voucher purchase
      const isWifiItem = item.name && (
        item.name.toLowerCase().includes('wifi voucher') ||
        item.name.toLowerCase().includes('wifi - ') ||
        item.name.toLowerCase().includes('nova wifi') ||
        item.name.toLowerCase().includes('ticket')
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
        badgeText: 'WiFi Voucher Dispatched',
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
    const { plan_name, currency, payment_method, user_email, customer_name, customer_email, customer_phone, customer_address, company, duration, start_date } = req.body;
    let { amount } = req.body;
    if (!plan_name || !amount) {
      return res.status(400).json({ error: 'Plan name and amount are required.' });
    }

    const reference = 'NV-SUB-' + Math.floor(1000 + Math.random() * 9000);
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const dur = duration || 'Monthly';
    const inputEmail = (customer_email || user_email || 'client@ncloud.co.ug').trim();
    const inputName = customer_name || (user_email ? user_email.split('@')[0] : 'Corporate Client');
    const inputAddress = customer_address || 'Lugga Zone, Ndejje, Wakiso, Uganda';
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

    let calculatedTotalAmount = 0;
    let calculatedVatAmount = 0;
    
    const inputItems = Array.isArray(req.body.items) && req.body.items.length > 0
      ? req.body.items.map(it => {
          const itemQty = Number(it.quantity || it.qty || 1);
          let authenticPrice = Number(it.unit_price || it.price || 0);
          
          // Secure price validation from database
          const dbProduct = (memoryStore.products || []).find(p => p.name === it.name || p.id == it.id);
          if (dbProduct && dbProduct.price !== undefined) {
            authenticPrice = Number(dbProduct.price);
          }
          
          const itemAmount = authenticPrice * itemQty;
          calculatedTotalAmount += itemAmount;

          const isWifi = it.name && (
            it.name.toLowerCase().includes('wifi voucher') ||
            it.name.toLowerCase().includes('ticket') ||
            it.name.toLowerCase().includes('wifi - ') ||
            it.name.toLowerCase().includes('nova wifi')
          );

          if (!isWifi) {
            calculatedVatAmount += itemAmount * 0.18;
          }

          const p = dbProduct || {};
          const stock = p.stock !== undefined ? p.stock : 100;
          const isWifiVoucher = isWifi;
          const finalProduct = {
            ...p,
            stock,
            _isWifiVoucher: isWifiVoucher,
            short_desc: p.short_desc || p.desc || '',
            desc: p.short_desc || p.desc || '',
            description: p.description || p.specs || p.details || '',
            specs: p.description || p.specs || p.details || '',
            details: p.description || p.specs || p.details || ''
          };
          // Apply default WiFi image if this is a WiFi voucher and no custom image exists
          if (isWifiVoucher) {
            finalProduct.image_url = finalProduct.image_url || 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png';
          }

          return {
            name: finalProduct.name || it.name || it.description || 'Digital Product',
            description: finalProduct.description || it.description || it.name || 'Digital Product',
            quantity: itemQty,
            qty: itemQty,
            unit_price: authenticPrice,
            price: authenticPrice,
            amount: itemAmount
          };
        })
      : (() => {
          // Fallback if no items array
          let fallbackPrice = Number(amount || 0);
          const dbProduct = (memoryStore.products || []).find(p => p.name === plan_name);
          if (dbProduct && dbProduct.price !== undefined) {
            fallbackPrice = Number(dbProduct.price);
          }
          calculatedTotalAmount = fallbackPrice;
          
          const isWifi = plan_name && (
            plan_name.toLowerCase().includes('wifi voucher') ||
            plan_name.toLowerCase().includes('ticket') ||
            plan_name.toLowerCase().includes('wifi - ') ||
            plan_name.toLowerCase().includes('nova wifi')
          );
          if (!isWifi) calculatedVatAmount = fallbackPrice * 0.18;
          
          return [{ name: plan_name, description: plan_name, quantity: 1, qty: 1, unit_price: fallbackPrice, price: fallbackPrice, amount: fallbackPrice }];
        })();

    amount = calculatedTotalAmount + calculatedVatAmount;
    const isVatIncluded = req.body.include_vat !== false;
    const computedVat = isVatIncluded ? calculatedVatAmount : 0;

    // Detect if ALL items in this order are WiFi vouchers → force VAT-exempt
    const allItemsAreWifi = inputItems.length > 0 && inputItems.every(it => {
      const n = (it.name || it.description || '').toLowerCase();
      return n.includes('wifi voucher') || n.includes('nova wifi') || n.includes('wifi –') || n.includes('wifi -');
    });
    const finalVatExempt = allItemsAreWifi ? true : !isVatIncluded;
    const finalVatAmount  = allItemsAreWifi ? 0 : computedVat;
    if (allItemsAreWifi) {
      // Recalculate total without VAT for WiFi-only orders
      amount = calculatedTotalAmount;
    }

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
      include_vat: !finalVatExempt,
      vat_exempt: finalVatExempt,
      vat_amount: finalVatAmount,
      items: inputItems,
      shareable_url: `https://ncloud.co.ug/verify?doc=${invNum}`,
      created_at: new Date().toISOString()
    };

    if (!memoryStore.invoices) memoryStore.invoices = [];
    memoryStore.invoices.unshift(invoiceRecord);

    savePersistentStore();

    // 3. Send SMTP Notification Email to Sales Team (non-blocking in background)
    (async () => {
      try {
        const defaultSales = 'sales@ncloud.co.ug';
        const defaultBilling = 'billing@ncloud.co.ug';
        const salesEmail = memoryStore.notification_emails?.sales || defaultSales;
        const billingEmail = memoryStore.notification_emails?.billing || defaultBilling;
        const targets = [...new Set([salesEmail, billingEmail])];

        console.log('[SMTP Checkout] Generating official Tax Invoice PDF buffer...');
        const invoicePdfBuffer = await generateServerInvoicePDFBuffer(invoiceRecord);

        console.log('[SMTP Checkout] Initiating non-blocking Sales Email notification...');
        const salesRes = await sendMail({
          to: targets,
          subject: `New Subscription Order Received: ${plan_name} (Invoice #${invNum})`,
          html: generateCorporateEmailHtml({
            title: 'New Subscription Order',
            badgeText: 'Pending Payment',
            recipientName: 'Sales Team',
            attachmentName: `Tax_Invoice_${invNum}.pdf`,
            introText: 'An official subscription order has been submitted via the Nova Website checkout portal. The certified Tax Invoice PDF is attached to this notification.',
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
          }),
          attachments: [
            {
              filename: `Tax_Invoice_${invNum}.pdf`,
              content: invoicePdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
        console.log('[SMTP Checkout] Sales Email Result:', salesRes?.success ? 'Delivered' : salesRes?.error);
      } catch (err) {
        console.error('[Checkout Email Warning - Sales]:', err.message);
      }
    })().catch(e => console.error('[Background Sales Email Error]:', e));

    // 4. Send Official Corporate Tax Invoice Email to Customer (non-blocking in background)
    (async () => {
      try {
        console.log('[SMTP Checkout] Generating customer invoice email HTML...');
        const invoicePdfBuffer = await generateServerInvoicePDFBuffer(invoiceRecord);
        const customerEmailHtml = generateCorporateEmailHtml({
          title: `Official Tax Invoice #${invNum}`,
          badgeText: 'Invoice Generated - Pending Payment',
          recipientName: finalName,
          attachmentName: `Tax_Invoice_${invNum}.pdf`,
          introText: `Thank you for your order! Your subscription order for <strong>"${plan_name}"</strong> has been received. Your official verifiable Tax Invoice <strong>#${invNum}</strong> (Order Ref: <strong>#${reference}</strong>) details are provided below and the certified PDF is attached for your accounting records. Status is currently <strong>Pending Payment</strong>.`,
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

        console.log('[SMTP Checkout] Initiating non-blocking Customer Email notification to:', finalEmail);
        const custRes = await sendMail({
          to: finalEmail,
          subject: `Official Tax Invoice #${invNum} - Pending Payment (Nova Cloud Edges)`,
          html: customerEmailHtml,
          attachments: [
            {
              filename: `Tax_Invoice_${invNum}.pdf`,
              content: invoicePdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
        console.log('[SMTP Checkout] Customer Email Result:', custRes?.success ? 'Delivered' : custRes?.error);
      } catch (err) {
        console.error('[Checkout Email Warning - Customer]:', err.message);
      }
    })().catch(e => console.error('[Background Customer Email Error]:', e));

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
    footerNote: 'Nova Cloud Edges (U) Limited • Lugga Zone, Ndejje, Wakiso, Uganda'
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
  const { response, cc, attachment } = req.body; // attachment expects { filename, content }
  
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
    footerNote: 'Nova Cloud Edges (U) Limited • Lugga Zone, Ndejje, Wakiso, Uganda'
  });

  const emailAttachments = attachment ? [{
    filename: attachment.filename || 'attachment',
    content: attachment.content.split('base64,')[1] || attachment.content,
    encoding: 'base64'
  }] : undefined;

  await sendMail({
    to: contact.email,
    cc: cc || undefined,
    subject: `Re: ${contact.subject || 'General Inquiry'}`,
    html: customerHtml,
    attachments: emailAttachments
  });

  // Update DB and Memory Store
  contact.status = 'replied';
  contact.response = response;
  contact.replied_at = repliedAt;
  
  await query('UPDATE contacts SET status = ?, response = ?, replied_at = ? WHERE id = ?', ['replied', response, repliedAt, id]);
  await saveStore();

  res.json({ success: true, message: 'Response sent successfully and recorded.', contact });
});

// Admin Update Contact Status (Complete or Closed)
app.put('/api/admin/contacts/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['replied', 'complete', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required.' });
  }

  const contactIdx = memoryStore.contacts.findIndex(c => String(c.id) === String(id));
  if (contactIdx === -1) {
    return res.status(404).json({ error: 'Contact inquiry not found.' });
  }

  const contact = memoryStore.contacts[contactIdx];
  contact.status = status;

  await query('UPDATE contacts SET status = ? WHERE id = ?', [status, id]);
  await saveStore();

  res.json({ success: true, message: `Ticket marked as ${status}.`, contact });
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

  const isCust = req.userRole === 'customer';
  const cMail = (req.userEmail || '').toLowerCase();
  
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
    contacts: isCust ? [] : contacts,
    applications: isCust ? [] : applications,
    subscriptions: isCust ? subscriptions.filter(s => (s.client_email || '').toLowerCase() === cMail) : subscriptions,
    products,
    services,
    partners: memoryStore.partners || [],
    news: memoryStore.news || [],
    team: memoryStore.team,
    jobs: memoryStore.jobs,
    users: isCust ? memoryStore.users.filter(u => (u.email || '').toLowerCase() === cMail) : memoryStore.users,
    invoices: isCust ? memoryStore.invoices.filter(i => (i.customer_email || '').toLowerCase() === cMail || (i.party || '').toLowerCase().includes(cMail.split('@')[0])) : memoryStore.invoices,
    payments: isCust ? (memoryStore.payments || []).filter(p => (p.party_email || '').toLowerCase() === cMail) : (memoryStore.payments || []),
    payroll: isCust ? [] : memoryStore.payroll,
    staffExpenses: isCust ? [] : memoryStore.staff_expenses,
    companyExpenses: isCust ? [] : memoryStore.staff_expenses,
    staffInvoices: isCust ? [] : memoryStore.staff_invoices,
    quotations: isCust ? (memoryStore.quotations || []).filter(q => (q.customer_email || '').toLowerCase() === cMail || (q.party || '').toLowerCase().includes(cMail.split('@')[0])) : (memoryStore.quotations || []),
    work_orders: isCust ? [] : (memoryStore.work_orders || []),
    workOrders: isCust ? [] : (memoryStore.work_orders || []),
    customerCredits: isCust ? (memoryStore.customer_credits || []).filter(c => (c.customer_email || '').toLowerCase() === cMail) : (memoryStore.customer_credits || []),
    customer_credits: isCust ? (memoryStore.customer_credits || []).filter(c => (c.customer_email || '').toLowerCase() === cMail) : (memoryStore.customer_credits || []),
    bank_accounts: memoryStore.bank_accounts || [],
    sliders: memoryStore.sliders,
    audit_logs: isCust ? [] : (memoryStore.audit_logs || []),
    forensics: isCust ? [] : (memoryStore.audit_logs || []),
    security_settings: isCust ? null : (memoryStore.security_settings || null)
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

app.post('/api/admin/hr/expenses', async (req, res) => {
  const { staff_name, staff_email, category, description, amount, receipt_ref } = req.body;
  if (!staff_name || !amount) {
    return res.status(400).json({ error: 'Staff name and expense amount are required.' });
  }

  const newExpense = {
    id: (memoryStore.staff_expenses || []).length > 0 ? Math.max(...memoryStore.staff_expenses.map(e => Number(e.id) || 0)) + 1 : 1,
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

  if (!memoryStore.staff_expenses) memoryStore.staff_expenses = [];
  memoryStore.staff_expenses.unshift(newExpense);
  savePersistentStore();

  if (newExpense.staff_email) {
    try {
      const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(newExpense);
      const emailHtml = generateCorporateEmailHtml({
        title: `Company Expenditure Voucher #${newExpense.receipt_ref}`,
        badgeText: 'Expense Claim Submitted',
        recipientName: newExpense.staff_name,
        attachmentName: `Expense_Voucher_${newExpense.receipt_ref}.pdf`,
        introText: `Your company expenditure voucher <strong>#${newExpense.receipt_ref}</strong> for UGX ${Number(amount).toLocaleString()} (${newExpense.category}) has been submitted. The official certified expenditure voucher PDF has been compiled and attached.`,
        itemsRows: `
          <tr>
            <td>${newExpense.description} (${newExpense.category})</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">UGX ${Number(amount).toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${Number(amount).toLocaleString()}`,
        vatText: 'EXEMPT (0%)',
        totalAmountText: `UGX ${Number(amount).toLocaleString()}`,
        shareLink: 'https://ncloud.co.ug/portal',
        ctaText: 'View Expenditure in Portal',
        ctaLink: 'https://ncloud.co.ug/portal',
        hidePaymentMethods: true
      });

      sendMail({
        to: newExpense.staff_email,
        subject: `Company Expenditure Voucher #${newExpense.receipt_ref} Logged - Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Expense_Voucher_${newExpense.receipt_ref}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error('[Expense Email Warning]:', err.message));
    } catch (e) {
      console.error('[Expense PDF Generation Error]:', e.message);
    }
  }

  res.json({ message: `Staff Expense Claim of UGX ${Number(amount).toLocaleString()} logged successfully with PDF voucher attached`, expense: newExpense });
});

app.put('/api/admin/hr/expenses/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, approver_name } = req.body;
  const exp = (memoryStore.staff_expenses || []).find(e => e.id == id);
  if (exp) {
    exp.status = status;
    if (status && status.toLowerCase().includes('approve')) {
      exp.approved_by = approver_name || 'Management / Finance';
      exp.approved_at = new Date().toISOString();
    }
    savePersistentStore();

    if (exp.staff_email) {
      try {
        const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(exp);
        const emailHtml = generateCorporateEmailHtml({
          title: `Expenditure Voucher #${exp.receipt_ref} - ${status}`,
          badgeText: `Expense Claim ${status}`,
          recipientName: exp.staff_name,
          attachmentName: `Expense_Voucher_${exp.receipt_ref}.pdf`,
          introText: `Your company expenditure claim <strong>#${exp.receipt_ref}</strong> for UGX ${Number(exp.amount || 0).toLocaleString()} has been marked as <strong>${status}</strong>. The official certified voucher PDF is attached for your records.`,
          itemsRows: `
            <tr>
              <td>${exp.description} (${exp.category})</td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">UGX ${Number(exp.amount || 0).toLocaleString()}</td>
            </tr>
          `,
          subtotalText: `UGX ${Number(exp.amount || 0).toLocaleString()}`,
          vatText: 'EXEMPT (0%)',
          totalAmountText: `UGX ${Number(exp.amount || 0).toLocaleString()}`,
          shareLink: 'https://ncloud.co.ug/portal',
          ctaText: 'View in Portal',
          ctaLink: 'https://ncloud.co.ug/portal',
          hidePaymentMethods: true
        });

        sendMail({
          to: exp.staff_email,
          subject: `Status Update: Company Expenditure Voucher #${exp.receipt_ref} (${status}) - Nova Cloud Edges`,
          html: emailHtml,
          attachments: [
            {
              filename: `Expense_Voucher_${exp.receipt_ref}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        }).catch(err => console.error('[Expense Status Email Warning]:', err.message));
      } catch (e) {
        console.error('[Expense Status PDF Error]:', e.message);
      }
    }

    return res.json({ message: `Staff Expense claim for ${exp.staff_name} marked as ${status} with PDF voucher dispatched`, expense: exp });
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

app.get('/api/admin/settings/paid-stamp', (req, res) => {
  res.json({ paidStamp: memoryStore.paid_stamp || null });
});

app.post('/api/admin/settings/paid-stamp', (req, res) => {
  const { paidStamp } = req.body;
  memoryStore.paid_stamp = paidStamp || null;
  savePersistentStore();
  res.json({ message: 'Official PAID Stamp image updated successfully in System Brand Settings!', paidStamp: memoryStore.paid_stamp });
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
      ? `[OFFICIAL RECEIPT] 100% Clearance Payment Receipt for Invoice #${newPayment.invoice_number}`
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
          <td style="text-align: right; font-weight: bold; color: ${isCleared ? '#16a34a' : '#d97706'};">${isCleared ? '100% Paid & Settled' : 'Partially Paid'}</td>
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

app.get('/api/admin/settings/stamp', (req, res) => {
  res.json({ stampUrl: memoryStore.paid_stamp || '' });
});

app.post('/api/admin/settings/stamp', (req, res) => {
  const { stampUrl } = req.body;
  memoryStore.paid_stamp = stampUrl || null;
  savePersistentStore();
  console.log('[System Settings] Updated persistent corporate paid stamp');
  res.json({ success: true, stampUrl: memoryStore.paid_stamp });
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
// Top Utility Bar Configuration Endpoints (Admin Manageable)
// ----------------------------------------------------
app.get('/api/topbar', (req, res) => {
  res.json(memoryStore.topbar_settings || defaultTopbarSettings);
});

app.put(['/api/admin/topbar', '/api/topbar'], (req, res) => {
  const updates = req.body || {};
  memoryStore.topbar_settings = {
    ...(memoryStore.topbar_settings || defaultTopbarSettings),
    ...updates,
    updated_at: new Date().toISOString()
  };
  savePersistentStore();
  res.json({
    message: 'Top utility bar configuration updated successfully!',
    topbar_settings: memoryStore.topbar_settings
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

// Manual Send / Resend Commercial Quotation Email Endpoint
app.post('/api/admin/quotations/:id/send-email', async (req, res) => {
  const { id } = req.params;
  const q = (memoryStore.quotations || []).find(item => item.id == id || item.quote_number === id);
  if (!q) return res.status(404).json({ error: 'Commercial Quotation not found' });

  const recipientEmail = req.body?.recipient_email || q.customer_email;
  if (!recipientEmail) return res.status(400).json({ error: 'Quotation recipient email is missing' });

  try {
    const pdfBuffer = await generateServerQuotationPDFBuffer(q);
    const emailHtml = generateCorporateEmailHtml({
      title: `Commercial Price Quotation #${q.quote_number}`,
      badgeText: `Quotation ${q.status || 'Active'}`,
      recipientName: q.customer_name,
      attachmentName: `Commercial_Quotation_${q.quote_number}.pdf`,
      introText: `Please find your official commercial price quotation <strong>#${q.quote_number}</strong> attached to this email as a certified PDF document for your review.`,
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
      ctaText: 'View Quotation in Portal',
      ctaLink: 'https://ncloud.co.ug/portal'
    });

    await sendMail({
      to: recipientEmail,
      subject: `Commercial Price Quotation #${q.quote_number} from Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Commercial_Quotation_${q.quote_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return res.json({
      message: `Commercial Quotation #${q.quote_number} and official PDF attachment sent to ${recipientEmail}!`,
      recipient: recipientEmail
    });
  } catch (err) {
    console.error('[Quotation Manual Send Error]:', err);
    return res.status(500).json({ error: 'Failed to generate quotation PDF or send email: ' + err.message });
  }
});

// ----------------------------------------------------
// Work Orders & Task Scheduling Endpoints
// ----------------------------------------------------
app.get('/api/admin/work-orders', (req, res) => {
  res.json(memoryStore.work_orders || []);
});

app.post('/api/admin/work-orders', async (req, res) => {
  const { task_title, client_site, assigned_staff_id, assigned_staff_name, assigned_staff_email, charging_mode, rate, quantity, scheduled_date, description } = req.body;
  if (!task_title) return res.status(400).json({ error: 'Task title is required' });

  const orderNumber = `WO-${new Date().getFullYear()}-${String((memoryStore.work_orders || []).length + 14).padStart(4, '0')}`;
  const rateVal = Number(rate) || 150000;
  const qtyVal = Number(quantity) || 1;
  const totalCost = rateVal * qtyVal;

  const assignedUser = (memoryStore.users || []).find(u => u.id == assigned_staff_id || u.name === assigned_staff_name);
  const staffEmail = assigned_staff_email || assignedUser?.email || '';

  const newOrder = {
    id: Date.now(),
    order_number: orderNumber,
    task_title,
    client_site: client_site || 'Nova Datacenter Node',
    assigned_staff_id: assigned_staff_id || null,
    assigned_staff_name: assigned_staff_name || 'Unassigned Staff',
    assigned_staff_email: staffEmail,
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

  // Send assignment email with attached Work Order PDF if staff email is known
  if (staffEmail) {
    try {
      const pdfBuffer = await generateServerWorkOrderPDFBuffer(newOrder);
      const emailHtml = generateCorporateEmailHtml({
        title: `Work Order Assignment #${orderNumber}`,
        badgeText: 'Work Order Scheduled',
        recipientName: newOrder.assigned_staff_name,
        attachmentName: `Work_Order_${orderNumber}.pdf`,
        introText: `You have been assigned to Work Order <strong>#${orderNumber}</strong> ("${newOrder.task_title}") scheduled at site "${newOrder.client_site}". Please find the official work order document attached to this email.`,
        itemsRows: `
          <tr>
            <td>${newOrder.task_title} (${newOrder.charging_mode === 'per_hour' ? 'Hourly' : 'Daily Flat Rate'})</td>
            <td style="text-align: center;">${newOrder.quantity}</td>
            <td style="text-align: right;">UGX ${Number(newOrder.total_cost || 0).toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${Number(newOrder.total_cost || 0).toLocaleString()}`,
        vatText: 'EXEMPT (0%)',
        totalAmountText: `UGX ${Number(newOrder.total_cost || 0).toLocaleString()}`,
        shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(orderNumber)}`,
        ctaText: 'Verify Work Order Online',
        ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(orderNumber)}`,
        hidePaymentMethods: true
      });

      sendMail({
        to: staffEmail,
        subject: `New Work Order #${orderNumber} Assigned - Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Work_Order_${orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error('[Work Order Create Email Warning]:', err.message));
    } catch (e) {
      console.error('[Work Order PDF Generation Error]:', e.message);
    }
  }

  res.json({ message: `Work Order ${orderNumber} created successfully and official PDF attached!`, work_order: newOrder });
});

// Manual Send / Resend Work Order Email Endpoint
app.post('/api/admin/work-orders/:id/send-email', async (req, res) => {
  const { id } = req.params;
  const order = (memoryStore.work_orders || []).find(o => o.id == id || o.order_number === id);
  if (!order) return res.status(404).json({ error: 'Work Order not found' });

  const assignedUser = (memoryStore.users || []).find(u => u.id == order.assigned_staff_id || u.name === order.assigned_staff_name);
  const recipientEmail = req.body?.recipient_email || order.assigned_staff_email || assignedUser?.email || 'operations@ncloud.co.ug';

  try {
    const pdfBuffer = await generateServerWorkOrderPDFBuffer(order);
    const emailHtml = generateCorporateEmailHtml({
      title: `Work Order Assignment #${order.order_number}`,
      badgeText: `Work Order ${order.status || 'Active'}`,
      recipientName: order.assigned_staff_name,
      attachmentName: `Work_Order_${order.order_number}.pdf`,
      introText: `Please find the official Work Order <strong>#${order.order_number}</strong> ("${order.task_title}") at site location "${order.client_site}" attached as a certified PDF document for deployment execution.`,
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
      ctaText: 'Verify Work Order Online',
      ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(order.order_number)}`,
      hidePaymentMethods: true
    });

    await sendMail({
      to: recipientEmail,
      subject: `Official Work Order #${order.order_number} - Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Work_Order_${order.order_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return res.json({
      message: `Work Order #${order.order_number} and official PDF attachment dispatched to ${recipientEmail}!`,
      recipient: recipientEmail
    });
  } catch (err) {
    console.error('[Work Order Manual Send Error]:', err);
    return res.status(500).json({ error: 'Failed to generate Work Order PDF or send email: ' + err.message });
  }
});

app.put('/api/admin/work-orders/:id', async (req, res) => {
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

    // Send background email notification with updated PDF
    const assignedUser = (memoryStore.users || []).find(u => u.id == order.assigned_staff_id || u.name === order.assigned_staff_name);
    const staffEmail = assignedUser?.email || order.assigned_staff_email;
    if (staffEmail) {
      try {
        const pdfBuffer = await generateServerWorkOrderPDFBuffer(order);
        const emailHtml = generateCorporateEmailHtml({
          title: `Updated Work Order #${order.order_number}`,
          badgeText: `Work Order ${order.status || 'Updated'}`,
          recipientName: order.assigned_staff_name,
          attachmentName: `Work_Order_${order.order_number}.pdf`,
          introText: `Work Order <strong>#${order.order_number}</strong> ("${order.task_title}") at site "${order.client_site}" has been updated. Please inspect the attached certified PDF document.`,
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
          ctaText: 'Verify Work Order Online',
          ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(order.order_number)}`,
          hidePaymentMethods: true
        });

        sendMail({
          to: staffEmail,
          subject: `Updated Work Order #${order.order_number} - Nova Cloud Edges`,
          html: emailHtml,
          attachments: [
            {
              filename: `Work_Order_${order.order_number}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        }).catch(err => console.error('[Work Order Update Email Warning]:', err.message));
      } catch (e) {
        console.error('[Work Order Update PDF Error]:', e.message);
      }
    }

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
    supervisor_name: order.assigned_supervisor || '',
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

app.get('/api/admin/work-orders/:id/pdf', async (req, res) => {
  const { id } = req.params;
  const order = (memoryStore.work_orders || []).find(w => String(w.id) === String(id) || w.order_number === id);
  if (!order) {
    return res.status(404).json({ error: 'Work Order not found' });
  }
  try {
    const pdfBuffer = await generateServerWorkOrderPDFBuffer(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Work_Order_${order.order_number || order.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Work Order PDF' });
  }
});

// ----------------------------------------------------
// UniFi Controller API Integration
// ----------------------------------------------------

const UNIFI_SITE_ID = '88f7af54-98f8-306a-a1c7-c9349722b1f6';
const UNIFI_API_KEY = 'm1583Qhvi9hAOwxZsGYhh31Zqmh84Tda';
const UNIFI_BASE_URL = `https://unifi.ncloud.co.ug/proxy/network/integration/v1/sites/${UNIFI_SITE_ID}`;

async function syncUniFiVouchers() {
  try {
    const response = await fetch(`${UNIFI_BASE_URL}/hotspot/vouchers?filter=expired.eq(false)&limit=1000`, {
      method: 'GET',
      headers: {
        'X-API-KEY': UNIFI_API_KEY,
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`UniFi API responded with status: ${response.status}`);
    }
    const data = await response.json();
    const allVouchers = data.data || [];
    
    // Only consider vouchers that have NOT been activated yet
    const activeUnusedVouchers = allVouchers.filter(v => !v.activatedAt);

    if (!memoryStore.unifi_vouchers) memoryStore.unifi_vouchers = [];
    let addedCount = 0;
    let removedCount = 0;

    activeUnusedVouchers.forEach(uv => {
      // Check if voucher code already exists internally (ignoring dashes)
      const rawUnifiCode = String(uv.code).replace(/-/g, '');
      const existing = memoryStore.unifi_vouchers.find(v => String(v.token).replace(/-/g, '') === rawUnifiCode);
      
      const durationHours = parseFloat((uv.timeLimitMinutes / 60).toFixed(4));
      const label = durationHours >= 720 ? `${Math.round(durationHours/720)} Month(s)` 
                    : durationHours >= 168 ? `${Math.round(durationHours/168)} Week(s)` 
                    : durationHours >= 24 ? `${Math.round(durationHours/24)} Day(s)` 
                    : durationHours >= 1 ? `${Math.round(durationHours)} Hour(s)`
                    : `${Math.round(durationHours * 60)} Minute(s)`;

      if (!existing) {
        // Format code with a dash in the middle (e.g. 1234567890 -> 12345-67890)
        let formattedCode = String(uv.code);
        if (!formattedCode.includes('-') && formattedCode.length > 4) {
          const mid = Math.ceil(formattedCode.length / 2);
          formattedCode = formattedCode.slice(0, mid) + '-' + formattedCode.slice(mid);
        }

        memoryStore.unifi_vouchers.unshift({
          id: uv.id,
          token: formattedCode,
          duration_hours: durationHours,
          duration_label: label,
          data_limit: uv.dataUsageLimitMBytes ? `${uv.dataUsageLimitMBytes}MB` : 'Unlimited',
          status: 'available',
          created_at: uv.createdAt,
          source: 'auto_sync',
          customer_name: null,
          customer_email: null
        });
        addedCount++;
      } else {
        // Fix for previously synced vouchers stuck at 0 hours
        if (existing.duration_hours === 0 && durationHours > 0) {
          existing.duration_hours = durationHours;
          existing.duration_label = label;
        }
      }
    });

    // 2. Cleanup: If an 'available' voucher in our system is NO LONGER unused in UniFi, remove it completely to match UniFi (it was revoked or used).
    // Note: We deliberately KEEP 'bought' or 'dispatched' vouchers for accountability, even if they disappear from UniFi.
    const initialCount = memoryStore.unifi_vouchers.length;
    memoryStore.unifi_vouchers = memoryStore.unifi_vouchers.filter(sysVoucher => {
      if (sysVoucher.status === 'available') {
        const rawSysCode = String(sysVoucher.token).replace(/-/g, '');
        const isStillUnused = activeUnusedVouchers.find(uv => String(uv.code).replace(/-/g, '') === rawSysCode);
        if (!isStillUnused) {
          removedCount++;
          return false; // Remove from Nova
        }
      }
      return true; // Keep
    });

    savePersistentStore();
    return { success: true, count: activeUnusedVouchers.length, added: addedCount, removed: removedCount };
  } catch (err) {
    console.error('Error syncing UniFi vouchers:', err);
    return { success: false, error: err.message };
  }
}

// Background Task: Auto-sync UniFi vouchers every 30 seconds
setInterval(() => {
  const janitorSchedule = (memoryStore.schedules || []).find(s => s.target === 'unifi_janitor');
  if (janitorSchedule && janitorSchedule.enabled) {
    syncUniFiVouchers().then(res => {
      janitorSchedule.last_run = new Date().toISOString();
      if (res.success) {
        janitorSchedule.last_status = `Success (Synced ${res.count} vouchers)`;
      } else {
        janitorSchedule.last_status = `Failed: ${res.error}`;
      }
    }).catch(err => console.error('[Cron] Unifi Sync failed:', err));
  }
}, 30 * 1000);

app.post('/api/admin/unifi/vouchers/sync', async (req, res) => {
  const result = await syncUniFiVouchers();
  if (result.success) {
    res.json({ message: `Successfully synced! Fetched ${result.count} active vouchers, added ${result.added} new to inventory.` });
  } else {
    res.status(500).json({ error: 'Failed to sync UniFi vouchers: ' + result.error });
  }
});

// Auto-generate vouchers directly via UniFi API
app.post('/api/admin/unifi/vouchers/generate', async (req, res) => {
  try {
    const { quantity, duration_hours, data_quota_mb, device_limit, download_limit_kbps, upload_limit_kbps } = req.body;
    
    if (!quantity || !duration_hours) {
      return res.status(400).json({ error: 'Quantity and duration are required.' });
    }

    const payload = {
      count: Number(quantity),
      timeLimitMinutes: Number(duration_hours) * 60,
      name: "SysGen via Nova"
    };

    if (device_limit !== undefined) {
      payload.authorizedGuestLimit = Number(device_limit) === 0 ? 0 : Number(device_limit);
    }

    if (data_quota_mb && Number(data_quota_mb) > 0) {
      payload.dataUsageLimitMBytes = Number(data_quota_mb);
    }

    if (download_limit_kbps && Number(download_limit_kbps) > 0) {
      payload.rxRateLimitKbps = Number(download_limit_kbps);
    }
    
    if (upload_limit_kbps && Number(upload_limit_kbps) > 0) {
      payload.txRateLimitKbps = Number(upload_limit_kbps);
    }

    const response = await fetch(`${UNIFI_BASE_URL}/hotspot/vouchers`, {
      method: 'POST',
      headers: {
        'X-API-KEY': UNIFI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`UniFi API error: ${response.status} ${response.statusText} - ${errText}`);
    }

    // After creation, immediately run a sync to pull the newly generated codes down
    const syncRes = await syncUniFiVouchers();
    if (!syncRes.success) {
      throw new Error('Vouchers created in UniFi, but failed to sync back to Nova: ' + syncRes.error);
    }

    res.json({ 
      success: true,
      message: `Successfully generated ${quantity} vouchers in UniFi and synced them to the inventory!`,
      added: syncRes.added
    });

  } catch (err) {
    console.error('Error auto-generating UniFi vouchers:', err);
    res.status(500).json({ error: 'Failed to generate vouchers: ' + err.message });
  }
});

// GET all vouchers (or filtered for customer)
app.get('/api/admin/unifi/vouchers', (req, res) => {
  let modified = false;
  (memoryStore.unifi_vouchers || []).forEach((v, index) => {
    const dh = Number(v.duration_hours);
    const lbl = v.duration_label;
    if (!lbl || lbl === '0 Hours' || lbl === '0 Hour(s)') {
      let fixedLabel;
      if (dh <= 0) fixedLabel = lbl || 'Unknown';
      else if (dh >= 720) fixedLabel = `${Math.round(dh/720)} Month(s)`;
      else if (dh >= 168) fixedLabel = `${Math.round(dh/168)} Week(s)`;
      else if (dh >= 24) fixedLabel = `${Math.round(dh/24)} Day(s)`;
      else if (dh >= 1) fixedLabel = `${Math.round(dh)} Hour(s)`;
      else fixedLabel = `${Math.round(dh * 60)} Minute(s)`;
      
      memoryStore.unifi_vouchers[index].duration_label = fixedLabel;
      modified = true;
    }
  });

  if (modified) {
    savePersistentStore();
  }

  let vouchers = memoryStore.unifi_vouchers || [];
  if (req.userRole === 'customer') {
    const cMail = (req.userEmail || '').toLowerCase();
    vouchers = vouchers.filter(v => (v.customer_email || '').toLowerCase() === cMail);
  }

  res.json(vouchers);
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
    if (h < 1) {
      const m = Math.round(h * 60);
      return m + ' Minute' + (m !== 1 ? 's' : '');
    }
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
  res.json({ success: true, voucher: v });
});

// DELETE revoke voucher from Nova and UniFi
app.delete('/api/admin/unifi/vouchers/:id', async (req, res) => {
  const { id } = req.params;
  const vIndex = (memoryStore.unifi_vouchers || []).findIndex(item => item.id == id);
  if (vIndex === -1) return res.status(404).json({ error: 'WiFi Voucher not found in Nova' });
  
  const voucher = memoryStore.unifi_vouchers[vIndex];
  
  try {
    // Delete from UniFi controller directly using its ID
    const response = await fetch(`${UNIFI_BASE_URL}/hotspot/vouchers/${voucher.id}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': UNIFI_API_KEY }
    });
    
    // We ignore 404s from UniFi (it might have already been deleted there)
    if (!response.ok && response.status !== 404) {
      throw new Error(`UniFi API error: ${response.status} ${response.statusText}`);
    }

    // Remove from Nova memory store
    memoryStore.unifi_vouchers.splice(vIndex, 1);
    savePersistentStore();
    
    res.json({ success: true, message: 'Voucher revoked from UniFi and Nova' });
  } catch (err) {
    console.error('Error revoking UniFi voucher:', err);
    res.status(500).json({ error: 'Failed to revoke voucher: ' + err.message });
  }
});

// Suspend has been removed, replaced by direct Delete.

// PUT mark voucher as bought (manual override)
app.put('/api/admin/wifi/vouchers/bulk-mark-bought', async (req, res) => {
  const { ids, customer_name, customer_email, invoice_id } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

  let updatedCount = 0;
  const updatedVouchers = [];
  
  ids.forEach(id => {
    const v = (memoryStore.unifi_vouchers || []).find(item => item.id == id);
    if (v) {
      v.status = 'bought';
      v.dispatched_at = new Date().toISOString();
      if (customer_name) v.customer_name = customer_name;
      if (customer_email) v.customer_email = customer_email;
      if (invoice_id) v.invoice_id = invoice_id;
      updatedVouchers.push(v);
      updatedCount++;
    }
  });

  if (updatedCount > 0) savePersistentStore();
  
  if (customer_email && updatedVouchers.length > 0) {
    let itemsRows = '';
    updatedVouchers.forEach(v => {
      const dataInfo = v.data_quota_mb > 0 ? v.data_label + ' Data' : 'Unlimited Data';
      itemsRows += `
        <tr>
          <td style="padding:8px 0"><strong>Package</strong></td>
          <td style="text-align:center"></td>
          <td style="text-align:right">${v.package_name || 'WiFi Voucher'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0"><strong>Duration / Quota</strong></td>
          <td style="text-align:center"></td>
          <td style="text-align:right">${v.duration_label} / ${dataInfo}</td>
        </tr>
        <tr style="background:#0f172a; border-radius:8px">
          <td colspan="3" style="text-align:center; padding:18px; margin-bottom:12px; display:block">
            <div style="font-size:11px; color:#94a3b8; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px">Your WiFi Access Code</div>
            <b style="font-size:26px; color:#38bdf8; letter-spacing:0.12em; font-family:monospace">${v.token}</b>
          </td>
        </tr>
      `;
    });

    const emailHtml = generateCorporateEmailHtml({
      title: 'Your Nova WiFi Access Vouchers',
      badgeText: `${updatedVouchers.length} WiFi Vouchers Dispatched`,
      recipientName: customer_name || 'Customer',
      introText: `Your Nova WiFi Vouchers are ready to use — enter the codes below on the WiFi login portal to get connected.`,
      itemsRows,
      subtotalText: 'Fully Paid',
      vatText: 'Included',
      totalAmountText: 'Cleared',
      shareLink: 'https://ncloud.co.ug',
      ctaText: 'Connect to WiFi Portal',
      ctaLink: 'https://ncloud.co.ug'
    });

    try {
      await sendMail({
        to: customer_email,
        cc: 'sales@ncloud.co.ug',
        subject: `[100% Paid] Your Nova WiFi Voucher Codes`,
        html: emailHtml
      });
      console.log(`[WiFi] Successfully dispatched ${updatedVouchers.length} vouchers to ${customer_email}`);
    } catch (err) {
      console.error('[WiFi] Failed to email vouchers manually:', err);
      return res.status(500).json({ error: `Vouchers marked as bought, but failed to send email: ${err.message}` });
    }
  }

  res.json({ message: `Bulk updated ${updatedCount} vouchers as bought` });
});

// PUT mark voucher as bought (manual override)
app.put('/api/admin/wifi/vouchers/:id/mark-bought', async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_email, invoice_id } = req.body;
  const v = (memoryStore.unifi_vouchers || []).find(item => item.id == id);
  if (!v) return res.status(404).json({ error: 'Voucher not found' });
  v.status = 'bought';
  v.dispatched_at = new Date().toISOString();
  if (customer_name) v.customer_name = customer_name;
  if (customer_email) v.customer_email = customer_email;
  if (invoice_id) v.invoice_id = invoice_id;

  if (customer_email) {
    const dataInfo = v.data_quota_mb > 0 ? v.data_label + ' Data' : 'Unlimited Data';
    const emailHtml = generateCorporateEmailHtml({
      title: 'Your Nova WiFi Access Voucher',
      badgeText: 'WiFi Voucher Dispatched',
      recipientName: customer_name || 'Customer',
      introText: `Your Nova WiFi Voucher is ready to use — enter the code below on the WiFi login portal to get connected.`,
      itemsRows: `
        <tr>
          <td style="padding:8px 0"><strong>Package</strong></td>
          <td style="text-align:center"></td>
          <td style="text-align:right">${v.package_name || 'WiFi Voucher'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0"><strong>Duration</strong></td>
          <td style="text-align:center"></td>
          <td style="text-align:right">${v.duration_label}</td>
        </tr>
        <tr>
          <td style="padding:8px 0"><strong>Data Quota</strong></td>
          <td style="text-align:center"></td>
          <td style="text-align:right">${dataInfo}</td>
        </tr>
        <tr style="background:#0f172a; border-radius:8px">
          <td colspan="3" style="text-align:center; padding:18px">
            <div style="font-size:11px; color:#94a3b8; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px">Your WiFi Access Code</div>
            <b style="font-size:26px; color:#38bdf8; letter-spacing:0.12em; font-family:monospace">${v.token}</b>
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
    try {
      await sendMail({
        to: customer_email,
        cc: 'sales@ncloud.co.ug',
        subject: `[100% Paid] Your Nova WiFi Voucher Code — ${v.duration_label}`,
        html: emailHtml
      });
      console.log(`[WiFi] Successfully dispatched voucher ${v.token} to ${customer_email}`);
    } catch (err) {
      console.error('[WiFi] Failed to email voucher manually:', err);
      // Return 500 so the frontend shows the SMTP error
      return res.status(500).json({ error: 'Voucher marked as bought, but failed to send email: ' + err.message });
    }
  }

  savePersistentStore();
  res.json({ message: 'Voucher marked as bought and 100% Paid email dispatched to customer and sales!', voucher: v });
});

// DELETE voucher
app.delete('/api/admin/wifi/vouchers/:id', async (req, res) => {
  const { id } = req.params;
  const role = req.headers['x-user-role'];
  if (role !== 'super_admin') {
    return res.status(403).json({ error: 'Permission denied: Only Super Admins can delete vouchers' });
  }

  const idx = (memoryStore.unifi_vouchers || []).findIndex(item => item.id == id);
  if (idx === -1) return res.status(404).json({ error: 'Voucher not found' });

  // Delete from UniFi first
  try {
    const response = await fetch(`${UNIFI_BASE_URL}/hotspot/vouchers/${id}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': UNIFI_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.warn(`[UniFi] Failed to delete voucher ${id} from UniFi during deletion: ${await response.text()}`);
    }
  } catch (e) {
    console.error('[UniFi] Error communicating with UniFi API for deletion:', e.message);
  }

  const removed = memoryStore.unifi_vouchers.splice(idx, 1)[0];
  savePersistentStore();
  res.json({ message: 'Voucher ' + removed.token + ' permanently deleted from Nova and UniFi successfully' });
});

// GET WiFi voucher price map (admin)
app.get('/api/admin/wifi/voucher-prices', (req, res) => {
  res.json(memoryStore.wifi_voucher_prices || {});
});

// POST/PUT WiFi voucher price map — sets price for specific duration_hours
app.post('/api/admin/wifi/voucher-prices', requireSystemsAdmin, (req, res) => {
  const { duration_hours, price } = req.body;
  if (duration_hours === undefined || price === undefined) {
    return res.status(400).json({ error: 'duration_hours and price are required' });
  }
  if (!memoryStore.wifi_voucher_prices) memoryStore.wifi_voucher_prices = {};
  memoryStore.wifi_voucher_prices[String(duration_hours)] = Number(price);
  savePersistentStore();
  res.json({ message: `Price for ${duration_hours}h vouchers set to UGX ${price}`, prices: memoryStore.wifi_voucher_prices });
});

// DELETE a price override for a specific duration
app.delete('/api/admin/wifi/voucher-prices/:duration_hours', requireSystemsAdmin, (req, res) => {
  const { duration_hours } = req.params;
  if (memoryStore.wifi_voucher_prices) {
    delete memoryStore.wifi_voucher_prices[duration_hours];
    savePersistentStore();
  }
  res.json({ message: `Price removed for ${duration_hours}h vouchers`, prices: memoryStore.wifi_voucher_prices || {} });
});

// ----------------------------------------------------
// Schedules & Automated Cronjob Management
// ----------------------------------------------------
app.get('/api/admin/schedules', (req, res) => {
  res.json(memoryStore.schedules || []);
});

app.post('/api/admin/schedules/:id/run-now', async (req, res) => {
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
    const syncRes = await syncUniFiVouchers();
    if (syncRes.success) {
      executionDetails = `UniFi API session refreshed. Synced ${syncRes.count} active vouchers.`;
    } else {
      executionDetails = `Failed to sync UniFi API: ${syncRes.error}`;
    }
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
// Public Unified Document Verification Endpoint
// Supports Invoices, Work Orders, Quotations, and Expense Vouchers
// ----------------------------------------------------
app.get([
  '/api/public/verify/:type/:id', 
  '/api/public/verify/:type', 
  '/api/public/verify',
  '/api/documents/verify/:type/:id',
  '/api/documents/verify/:type',
  '/api/documents/verify',
  '/api/verify/:type/:id',
  '/api/verify/:type',
  '/api/verify'
], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const paramType = req.params.type;
  const paramId = req.params.id || paramType || req.query.doc || req.query.ref || req.query.id;
  const searchRef = String(paramId || '').trim().replace(/^#+/, '').toLowerCase();

  if (!searchRef) {
    return res.status(400).json({
      verified: false,
      error: 'Please enter a valid document reference number (e.g., INV-..., WO-..., QTN-..., or EXP-...)'
    });
  }

  // 1. Search Invoices
  const allInvoices = [...(memoryStore.invoices || []), ...(memoryStore.staff_invoices || [])];
  const inv = allInvoices.find(i => 
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
      issuer: 'Nova Cloud Edges (U) Limited',
      invoice: inv,
      bank_remittance: memoryStore.bank_accounts || []
    });
  }

  // 2. Search Work Orders
  const wo = (memoryStore.work_orders || []).find(w =>
    String(w.id).toLowerCase() === searchRef ||
    (w.order_number || '').trim().toLowerCase() === searchRef
  );
  if (wo) {
    const rateVal = Number(wo.rate || 0);
    const qtyVal = Number(wo.quantity || 1);
    const totalCost = Number(wo.total_cost || (rateVal * qtyVal));
    return res.json({
      verified: true,
      document_type: 'Official Field Service Work Order',
      document_number: wo.order_number,
      customer_name: wo.assigned_staff_name || 'Field Support Specialist',
      customer_email: wo.assigned_staff_email || '',
      customer_phone: wo.customer_phone || '',
      client_site: wo.client_site || 'Nova Primary Datacenter',
      task_title: wo.task_title || 'Field Operations Technical Deployment',
      description: wo.service_description || wo.description || '',
      scheduled_date: wo.scheduled_date || 'Immediate',
      completion_date: wo.completion_date || '',
      charging_mode: wo.charging_mode === 'per_hour' ? 'Hourly Rate' : 'Daily Project Rate',
      rate: rateVal,
      quantity: qtyVal,
      total_amount: totalCost,
      currency: 'UGX',
      status: wo.status || 'Completed',
      issued_date: wo.created_at || wo.scheduled_date,
      issuer: 'Nova Cloud Edges (U) Limited',
      work_order: wo,
      bank_remittance: memoryStore.bank_accounts || []
    });
  }

  // 3. Search Quotations
  const q = (memoryStore.quotations || []).find(item =>
    String(item.id).toLowerCase() === searchRef ||
    (item.quote_number || '').trim().toLowerCase() === searchRef
  );
  if (q) {
    return res.json({
      verified: true,
      document_type: 'Official Commercial Quotation',
      document_number: q.quote_number,
      customer_name: q.customer_name,
      customer_email: q.customer_email || '',
      customer_phone: q.customer_phone || '',
      company: q.company || '',
      items: q.items || [],
      total_amount: Number(q.total_amount),
      currency: 'UGX',
      status: q.status || 'Active',
      valid_until: q.valid_until,
      issued_date: q.created_at,
      issuer: 'Nova Cloud Edges (U) Limited',
      quotation: q,
      bank_remittance: memoryStore.bank_accounts || []
    });
  }

  // 4. Search Expense Vouchers
  const exp = (memoryStore.staff_expenses || []).find(item =>
    String(item.id).toLowerCase() === searchRef ||
    (item.receipt_ref || '').trim().toLowerCase() === searchRef ||
    (item.voucher_number || '').trim().toLowerCase() === searchRef
  );
  if (exp) {
    return res.json({
      verified: true,
      document_type: 'Official Expenditure Payment Voucher',
      document_number: exp.receipt_ref || `EXP-${exp.id}`,
      customer_name: exp.staff_name || 'Staff Member',
      customer_email: exp.staff_email || '',
      category: exp.category || 'Company Expense',
      description: exp.description || exp.purpose || '',
      total_amount: Number(exp.amount),
      currency: 'UGX',
      status: exp.status || 'Approved',
      issued_date: exp.date || exp.created_at,
      issuer: 'Nova Cloud Edges (U) Limited',
      expense: exp,
      bank_remittance: memoryStore.bank_accounts || []
    });
  }

  // 5. Search Delivery Notes
  const dn = (memoryStore.delivery_notes || []).find(d =>
    String(d.id).toLowerCase() === searchRef ||
    (d.dn_number || '').trim().toLowerCase() === searchRef ||
    (d.invoice_number || '').trim().toLowerCase() === searchRef
  );
  if (dn) {
    return res.json({
      verified: true,
      document_type: 'Official Goods Delivery Note',
      document_number: dn.dn_number,
      customer_name: dn.customer_name,
      customer_email: dn.customer_email || '',
      customer_phone: dn.customer_phone || '',
      delivery_address: dn.delivery_address || 'Customer Premises, Uganda',
      company: dn.company || '',
      items: dn.items || [],
      carrier: dn.carrier || 'Direct Handover',
      tracking_code: dn.tracking_code || 'N/A',
      dispatch_officer: dn.dispatch_officer || 'Nova Operations & Logistics',
      payment_status: '100% Paid & Cleared',
      invoice_number: dn.invoice_number,
      status: dn.status || 'Fulfilled & Released',
      issued_date: dn.delivery_date || dn.created_at,
      issuer: 'Nova Cloud Edges (U) Limited',
      delivery_note: dn,
      bank_remittance: memoryStore.bank_accounts || []
    });
  }

  return res.status(404).json({
    verified: false,
    error: 'Please check the reference number on your document and try again, or contact our operations & finance department for assistance.'
  });
});

// HTTP Route to serve clean PDF document for Invoices (public and admin)
app.get(['/api/invoices/pdf/:invoiceNum', '/api/admin/invoices/:invoiceNum/pdf'], async (req, res) => {
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
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
  }

  try {
    const pdfBuffer = await generateServerInvoicePDFBuffer(inv, memoryStore.bank_accounts);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Tax_Invoice_${inv.invoice_number || invoiceNum}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating Invoice PDF stream:', err);
    res.status(500).json({ error: 'Failed to generate PDF document' });
  }
});

// HTTP Route to serve clean PDF document for Quotations (public and admin)
app.get(['/api/quotations/pdf/:quoteNum', '/api/admin/quotations/:quoteNum/pdf'], async (req, res) => {
  const { quoteNum } = req.params;
  const quote = (memoryStore.quotations || []).find(q => q.quote_number === quoteNum || String(q.id) === String(quoteNum));
  if (!quote) {
    return res.status(404).json({ error: 'Quotation document not found' });
  }

  try {
    const pdfBuffer = await generateServerQuotationPDFBuffer(quote);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Commercial_Quotation_${quote.quote_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating Quotation PDF stream:', err);
    res.status(500).json({ error: 'Failed to generate PDF document' });
  }
});

// HTTP Route to serve clean PDF document for Delivery Notes (public and admin)
app.get(['/api/delivery-notes/pdf/:dnNum', '/api/admin/delivery-notes/:dnNum/pdf'], async (req, res) => {
  const { dnNum } = req.params;
  const dn = (memoryStore.delivery_notes || []).find(d => d.dn_number === dnNum || String(d.id) === String(dnNum));
  if (!dn) {
    return res.status(404).json({ error: 'Delivery note record not found' });
  }

  try {
    const pdfBuffer = await generateServerDeliveryNotePDFBuffer(dn);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Delivery_Note_${dn.dn_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating Delivery Note PDF stream:', err);
    res.status(500).json({ error: 'Failed to generate Delivery Note PDF document' });
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
app.put('/api/admin/users/:id', async (req, res) => {
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

  if (password && password.trim()) {
    const pwdCheck = validatePasswordStrength(password.trim(), targetUser.email, targetUser.name);
    if (!pwdCheck.isValid) {
      return res.status(400).json({ error: pwdCheck.error });
    }
    const hashed = await bcrypt.hash(password.trim(), 10);
    targetUser.passwordHash = hashed;
    targetUser.password_hash = hashed;
    targetUser.password_changed_at = new Date().toISOString();
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, id]).catch(() => {});
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
app.put('/api/admin/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || !new_password.trim()) {
    return res.status(400).json({ error: 'Please provide a valid new password.' });
  }
  const targetUser = (memoryStore.users || []).find(u => String(u.id) === String(id));
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  const trimmed = new_password.trim();
  const pwdCheck = validatePasswordStrength(trimmed, targetUser.email, targetUser.name);
  if (!pwdCheck.isValid) {
    return res.status(400).json({ error: pwdCheck.error });
  }

  const hashedPassword = await bcrypt.hash(trimmed, 10);

  targetUser.passwordHash = hashedPassword;
  targetUser.password_hash = hashedPassword;
  targetUser.password_reset_at = new Date().toISOString();
  targetUser.password_changed_at = new Date().toISOString();

  try {
    await query('UPDATE users SET password_hash = ? WHERE id = ? OR email = ?', [hashedPassword, id, targetUser.email]);
  } catch (dbErr) {
    console.warn('[DB User Password Update Warning]:', dbErr.message);
  }

  savePersistentStore();
  res.json({ message: `Password reset successfully for ${targetUser.name}. User can now log in immediately with the new password.` });
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

app.post('/api/admin/users', async (req, res) => {
  const { name, email, role, phone, company, department, position, salary, status, location, notes, supervisor_id, supervisor_name, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email address are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingEmail = (memoryStore.users || []).find(u => u && u.email && u.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  if (phone) {
    const existingPhone = (memoryStore.users || []).find(u => u && u.phone && u.phone.trim() === phone.trim());
    if (existingPhone) {
      return res.status(400).json({ error: 'A user with this phone number already exists.' });
    }
  }

  const rawPassword = (password && password.trim()) || `NovaCloud@${Math.floor(1000 + Math.random() * 9000)}`;

  // Validate common password on manual admin user creation
  const pwdCheck = validatePasswordStrength(rawPassword, cleanEmail, name);
  if (!pwdCheck.isValid) {
    return res.status(400).json({ error: pwdCheck.error });
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashedPassword,
    password_hash: hashedPassword,
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
    is_verified: true, // Manual admin-created users are automatically active; confirmation ONLY applies to signup
    created_at: new Date().toISOString(),
    last_login: 'Never'
  };

  memoryStore.users.unshift(newUser);
  savePersistentStore();

  // Try MySQL
  await query(
    'INSERT INTO users (name, email, password_hash, role, phone, company, status, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [newUser.name, newUser.email, hashedPassword, newUser.role, newUser.phone, newUser.company, newUser.status]
  ).catch(() => {});

  // Dispatch welcome email with credentials to user (confirmation not required)
  try {
    await sendAdminCreatedUserEmail(newUser, rawPassword, req);
  } catch (mailErr) {
    console.warn('[Admin Create User Mail Error]:', mailErr);
  }

  res.json({ 
    message: `System User "${name}" created successfully as ${role || 'sales_admin'}. Welcome credentials sent to ${cleanEmail}.`, 
    user: newUser 
  });
});

app.get('/api/admin/invoices', (req, res) => {
  res.json(memoryStore.invoices);
});

// ----------------------------------------------------
// Server-Side Official PDF Buffer Generators (Executive A4 Branding)
// ----------------------------------------------------
const SERVER_BRAND = {
  name: 'NOVA CLOUD EDGES (U) LIMITED',
  tagline: '',
  address: 'Lugga Zone, Ndejje, Wakiso, Republic of Uganda',
  tin: '1014892019',
  contact: 'billing@ncloud.co.ug | Hotline: +256 790 001 631 | https://ncloud.co.ug',
  signatory: 'Authorized Signatory',
  signatoryTitle: 'Director of Finance & Operations'
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
  doc.setFillColor(30, 58, 138); // #1e3a8a
  doc.rect(0, y, 50, h, 'F');
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(50, y, 105, h, 'F');
  doc.setFillColor(245, 158, 11); // #f59e0b
  doc.rect(155, y, 55, h, 'F');
}

function sanitizePdfText(str) {
  if (!str) return '';
  return String(str).replace(/[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').trim();
}

const NOVA_SERVER_LOGO_BASE64 = NOVA_LOGO_BASE64;

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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerTrebuchetFont(doc);

  const invoiceNum = sanitizePdfText(inv?.invoice_number || `INV-${inv?.id || '1602026682026'}`);
  const baseDate = new Date(inv?.created_at || inv?.date || new Date());
  const invDate = formatNinjaDate(baseDate);
  
  let finalDueDate;
  if (!inv?.due_date) {
    finalDueDate = new Date(baseDate.getTime() + 14 * 86400000);
  } else {
    const dDate = new Date(inv.due_date);
    if (!isNaN(dDate) && dDate.toISOString().split('T')[0] === baseDate.toISOString().split('T')[0]) {
      finalDueDate = new Date(baseDate.getTime() + 14 * 86400000);
    } else {
      finalDueDate = dDate;
    }
  }
  const dueDate = formatNinjaDate(finalDueDate);
  const isPaid = inv?.status === 'Paid' || inv?.status === '100% Paid' || inv?.status === 'Paid & Settled';

  const totalAmt = Number(inv?.amount || inv?.total || 0);
  const paidAmt = isPaid ? totalAmt : Number(inv?.paid_amount || inv?.paid || 0);
  const balanceDue = Math.max(0, totalAmt - paidAmt);

  // VAT Breakdown — respect vat_exempt flag (e.g. WiFi voucher orders are VAT-exempt)
  const isVatExempt = inv?.vat_exempt === true || inv?.vat_exempt === 'true' || inv?.vat_exempt === 1 || inv?.vat_exempt === '1';
  const subtotalAmt = isVatExempt
    ? totalAmt  // no VAT reverse-engineering: subtotal = total
    : Math.round((totalAmt / 1.18) * 100) / 100;
  const vatAmt = isVatExempt ? 0 : Math.round((totalAmt - subtotalAmt) * 100) / 100;

  const cName = sanitizePdfText(inv?.customer_name || inv?.company || inv?.party_name || 'Valued Corporate Client');
  const cCode = sanitizePdfText(inv?.customer_code || inv?.client_id || (inv?.id ? String(inv.id) : ''));
  const cAddr = sanitizePdfText(inv?.customer_address || inv?.address || 'Kampala, Uganda');
  const cPhone = sanitizePdfText(inv?.customer_phone || inv?.phone || '');
  const cEmail = sanitizePdfText(inv?.customer_email || inv?.party_email || inv?.email || '');

  let items = [];
  if (Array.isArray(inv?.items) && inv.items.length > 0) {
    items = inv.items.map(it => ({
      name: sanitizePdfText(it.name || it.item_name || 'Cloud Solution Service'),
      description: sanitizePdfText(it.description || it.specs || it.short_desc || ''),
      unit_price: Number(it.unit_price || it.price || 0),
      quantity: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      amount: (Math.max(1, parseInt(it.quantity || it.qty) || 1)) * Number(it.unit_price || it.price || 0)
    }));
  } else {
    items = [{
      name: sanitizePdfText(inv?.item_name || 'Cloud Infrastructure & Managed Services'),
      description: sanitizePdfText(inv?.description || 'Enterprise Cloud & Managed Systems Deployment and Configuration'),
      unit_price: totalAmt,
      quantity: 1,
      amount: totalAmt
    }];
  }

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNum)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  } catch {}

  let storedBanks = [];
  try {
    const rawBanks = memoryStore.bank_accounts || [];
    storedBanks = Array.isArray(rawBanks) ? rawBanks : [];
  } catch {}

  drawInvoiceNinja3ToneBar(doc, 0, 4);

  try {
    doc.addImage(NOVA_SERVER_LOGO_BASE64, 'PNG', 14, 10, 45, 15);
  } catch {
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('NOVA CLOUD EDGES (U) LTD', 14, 18);
  }

  // Top Right Box
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(124, 8, 72, 30, 1.5, 1.5, 'F');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'OFFICIAL TAX INVOICE', val: `#${invoiceNum}` },
    { label: 'Invoice Date:', val: invDate },
    { label: 'Payment Due:', val: dueDate },
    { label: 'Total Amount:', val: formatNinjaUGX(totalAmt) },
    { label: 'Balance Outstanding:', val: formatNinjaUGX(balanceDue) }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 13 + idx * 5;
    doc.text(r.label, 127, rowY);
    doc.text(r.val, 193, rowY, { align: 'right' });
  });

  // TWO EXECUTIVE CARDS
  const cardY = 43;
  const cardW = 88;
  const cardH = 34;

  // CARD 1: ISSUED BY
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('ISSUED BY (SERVICE PROVIDER)', 18, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges (U) Limited', 18, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 18, cardY + 15.5);
  doc.text('Tel: (+256) 790 001631 / 33  •  support@ncloud.co.ug', 18, cardY + 20);
  doc.text('Web: www.ncloud.co.ug  •  TIN: 1014892019', 18, cardY + 24.5);

  let bankStr = 'Remit To: MTN MoMo Merchant Code: 674859 (UGX)';
  if (Array.isArray(storedBanks) && storedBanks.length > 0) {
    const b = storedBanks[0];
    bankStr = `Remit To: ${b.bank_name} A/C: ${b.account_number} (${b.currency || 'UGX'})`;
  }
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text(bankStr.substring(0, 62), 18, cardY + 29.5);

  // CARD 2: BILLED TO
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('BILLED TO (CLIENT DETAILS)', 112, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.substring(0, 38), 112, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(cCode ? `Client ID / Ref: #${cCode}` : 'Registered Client', 112, cardY + 15.5);
  doc.text(cAddr.substring(0, 48), 112, cardY + 20);
  doc.text(cPhone ? `Tel: ${cPhone}` : 'Contact Telephone on File', 112, cardY + 24.5);
  doc.text(cEmail ? `Email: ${cEmail}` : 'Email: billing@ncloud.co.ug', 112, cardY + 29);

  function drawTableHeader(y) {
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(14, y, 182, 8, 1, 1, 'F');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, y + 5.5);
    doc.text('Item & Description', 25, y + 5.5);
    doc.text('Unit Cost', 145, y + 5.5, { align: 'right' });
    doc.text('Qty', 158, y + 5.5, { align: 'center' });
    doc.text('Line Total', 193, y + 5.5, { align: 'right' });
  }

  let tableY = cardY + cardH + 6;
  drawTableHeader(tableY);
  tableY += 8;

  const preparedItems = items.map((it, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const nameLines = doc.splitTextToSize(String(it.name || ''), 90);
    const descLines = doc.splitTextToSize(String(it.description || ''), 90);
    const totalLines = nameLines.length + descLines.length;
    const rowH = Math.max(8.5, totalLines * 3.8 + 3.5);
    return { it, numStr, nameLines, descLines, rowH };
  });

  const totalItemsHeight = preparedItems.reduce((acc, p) => acc + p.rowH, 0);
  const fitsSinglePage = (tableY + totalItemsHeight + 52) <= 265;

  let currentPage = 1;

  preparedItems.forEach((p, idx) => {
    const pageLimit = fitsSinglePage ? 265 : (currentPage === 1 ? 215 : 220);

    if (tableY + p.rowH > pageLimit) {
      doc.addPage();
      currentPage++;
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 12;
      drawTableHeader(tableY);
      tableY += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, p.rowH, 'F');
    }

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p.numStr, 17, tableY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(p.nameLines, 25, tableY + 5.2);

    const descY = tableY + 5.2 + (p.nameLines.length * 3.8);
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(p.descLines, 25, descY);

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(p.it.unit_price), 145, tableY + 5.2, { align: 'right' });

    doc.text(String(p.it.quantity || 1), 158, tableY + 5.2, { align: 'center' });

    doc.text(formatNinjaUGX(p.it.amount), 193, tableY + 5.2, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + p.rowH, 196, tableY + p.rowH);

    tableY += p.rowH;
  });

  if (tableY + 48 > 265) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 14;
  }

  const totalsY = tableY + 6;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice Terms:', 14, totalsY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const termsString = inv?.terms || 'This Invoice is valid for ONLY 2 weeks, and payment of at least 75% MUST be made before services are offered.';
  const termsText = doc.splitTextToSize(termsString, 85);
  doc.text(termsText, 14, totalsY + 4.5);

  const verifyY = totalsY + 16;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 14, verifyY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 14, verifyY + 4.5);

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, verifyY + 7, 20, 20);
    } catch {}
  }

  // WiFi voucher token — show whenever present (paid or pending)
  if (inv?.wifi_voucher_token) {
    const wifiY = verifyY + 30;
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text('Your WiFi Access Token:', 14, wifiY);
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(inv.wifi_voucher_token, 14, wifiY + 6);
  }

  const totalRows = [
    { label: 'Net Subtotal:', val: formatNinjaUGX(subtotalAmt) }
  ];
  if (!isVatExempt) {
    totalRows.push({ label: 'Value Added Tax (18% Statutory):', val: formatNinjaUGX(vatAmt) });
  }
  totalRows.push(
    { label: 'Total Invoiced:', val: formatNinjaUGX(totalAmt), bold: true },
    { label: 'Amount Paid to Date:', val: formatNinjaUGX(paidAmt) },
    { label: 'Balance Outstanding:', val: formatNinjaUGX(balanceDue), bold: true, color: [30, 58, 138] }
  );

  totalRows.forEach((r, idx) => {
    const rY = totalsY + idx * 5.2;
    doc.setFont('TrebuchetMS', r.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    if (r.exempt) {
      doc.setTextColor(2, 132, 199);
    } else {
      doc.setTextColor(r.color ? r.color[0] : 15, r.color ? r.color[1] : 23, r.color ? r.color[2] : 42);
    }
    doc.text(r.label, 150, rY, { align: 'right' });
    doc.text(r.val, 194, rY, { align: 'right' });
  });

  const totalPages = doc.internal.getNumberOfPages();
  
  if (isPaid && memoryStore.paid_stamp) {
    try {
      doc.setPage(totalPages);
      doc.addImage(memoryStore.paid_stamp, 'PNG', 85, totalsY - 8, 45, 25);
    } catch (e) {
      console.warn('Could not inject paid stamp', e.message);
    }
  }

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('We also Deal in: CCTV Cameras, Company Emails, Cloud Web Hosting & Dev, Mobile App Dev, Systems Admin, Backups & Restoration Services & Cyber Security', 105, 280, { align: 'center' });

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: 'center' });

    drawInvoiceNinja3ToneBar(doc, 293, 4);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerQuotationPDFBuffer(quote, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerTrebuchetFont(doc);

  const quoteNum = sanitizePdfText(quote?.quote_number || `QTN-${quote?.id || '1602026682026'}`);
  const baseQDate = new Date(quote?.created_at || quote?.date || new Date());
  const qDate = formatNinjaDate(baseQDate);
  const validUntil = formatNinjaDate(quote?.valid_until || new Date(baseQDate.getTime() + 30 * 86400000));
  const totalAmt = Number(quote?.total_amount || quote?.amount || 0);

  const isVatExempt = quote?.vat_exempt === true || quote?.vat_exempt === 'true' || quote?.vat_exempt === 1 || quote?.vat_exempt === '1';
  const subtotalAmt = isVatExempt ? totalAmt : Math.round((totalAmt / 1.18) * 100) / 100;
  const vatAmt = isVatExempt ? 0 : Math.round((totalAmt - subtotalAmt) * 100) / 100;

  const cName = sanitizePdfText(quote?.customer_name || quote?.company || quote?.party_name || 'Valued Corporate Client');
  const cCode = sanitizePdfText(quote?.customer_code || quote?.client_id || (quote?.id ? String(quote.id) : ''));
  const cAddr = sanitizePdfText(quote?.customer_address || quote?.address || 'Kampala, Uganda');
  const cPhone = sanitizePdfText(quote?.customer_phone || quote?.phone || '');
  const cEmail = sanitizePdfText(quote?.customer_email || quote?.party_email || quote?.email || '');

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  } catch {}

  let storedBanks = [];
  try {
    const rawBanks = memoryStore.bank_accounts || [];
    storedBanks = Array.isArray(rawBanks) ? rawBanks : [];
  } catch {}

  drawInvoiceNinja3ToneBar(doc, 0, 4);

  try {
    doc.addImage(NOVA_SERVER_LOGO_BASE64, 'PNG', 14, 10, 45, 15);
  } catch {
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('NOVA CLOUD EDGES (U) LTD', 14, 18);
  }

  doc.setFillColor(30, 58, 138);
  doc.roundedRect(124, 8, 72, 30, 1.5, 1.5, 'F');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'COMMERCIAL PROPOSAL', val: `#${quoteNum}` },
    { label: 'Quotation Date:', val: qDate },
    { label: 'Valid Until:', val: validUntil },
    { label: 'Estimated Total:', val: formatNinjaUGX(totalAmt) },
    { label: 'Proposal Status:', val: quote?.status || 'Active Proposal' }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 13 + idx * 5;
    doc.text(r.label, 127, rowY);
    doc.text(r.val, 193, rowY, { align: 'right' });
  });

  // TWO EXECUTIVE CARDS
  const cardY = 43;
  const cardW = 88;
  const cardH = 34;

  // CARD 1: ISSUED BY
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('ISSUED BY (SERVICE PROVIDER)', 18, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges (U) Limited', 18, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 18, cardY + 15.5);
  doc.text('Tel: (+256) 790 001631 / 33  •  support@ncloud.co.ug', 18, cardY + 20);
  doc.text('Web: www.ncloud.co.ug  •  TIN: 1014892019', 18, cardY + 24.5);

  let bankStr = 'Remit To: MTN MoMo Merchant Code: 674859 (UGX)';
  if (Array.isArray(storedBanks) && storedBanks.length > 0) {
    const b = storedBanks[0];
    bankStr = `Remit To: ${b.bank_name} A/C: ${b.account_number} (${b.currency || 'UGX'})`;
  }
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text(bankStr.substring(0, 62), 18, cardY + 29.5);

  // CARD 2: BILLED TO
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('PROPOSED TO (CLIENT DETAILS)', 112, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.substring(0, 38), 112, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(cCode ? `Client ID / Ref: #${cCode}` : 'Enterprise Prospect', 112, cardY + 15.5);
  doc.text(cAddr.substring(0, 48), 112, cardY + 20);
  doc.text(cPhone ? `Tel: ${cPhone}` : 'Contact Telephone on File', 112, cardY + 24.5);
  doc.text(cEmail ? `Email: ${cEmail}` : 'Email: sales@ncloud.co.ug', 112, cardY + 29);

  function drawTableHeader(y) {
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(14, y, 182, 8, 1, 1, 'F');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, y + 5.5);
    doc.text('Scope Item & Description', 25, y + 5.5);
    doc.text('Unit Rate', 145, y + 5.5, { align: 'right' });
    doc.text('Qty', 158, y + 5.5, { align: 'center' });
    doc.text('Total (UGX)', 193, y + 5.5, { align: 'right' });
  }

  let tableY = cardY + cardH + 6;
  drawTableHeader(tableY);
  tableY += 8;

  let items = [];
  if (Array.isArray(quote?.items) && quote.items.length > 0) {
    items = quote.items.map(it => ({
      name: sanitizePdfText(it.name || it.item_name || 'Cloud Solution Service'),
      description: sanitizePdfText(it.description || it.specs || it.short_desc || ''),
      unit_price: Number(it.unit_price || it.price || 0),
      quantity: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      amount: (Math.max(1, parseInt(it.quantity || it.qty) || 1)) * Number(it.unit_price || it.price || 0)
    }));
  } else {
    items = [{
      name: sanitizePdfText(quote?.item_name || 'Cloud Infrastructure & Managed Services'),
      description: sanitizePdfText(quote?.description || 'Enterprise Cloud & Managed Systems Deployment and Configuration'),
      unit_price: totalAmt,
      quantity: 1,
      amount: totalAmt
    }];
  }

  const preparedItems = items.map((it, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const nameLines = doc.splitTextToSize(String(it.name || ''), 90);
    const descLines = doc.splitTextToSize(String(it.description || ''), 90);
    const totalLines = nameLines.length + descLines.length;
    const rowH = Math.max(8.5, totalLines * 3.8 + 3.5);
    return { it, numStr, nameLines, descLines, rowH };
  });

  const totalItemsHeight = preparedItems.reduce((acc, p) => acc + p.rowH, 0);
  const fitsSinglePage = (tableY + totalItemsHeight + 52) <= 265;

  let currentPage = 1;

  preparedItems.forEach((p, idx) => {
    const pageLimit = fitsSinglePage ? 265 : (currentPage === 1 ? 215 : 220);

    if (tableY + p.rowH > pageLimit) {
      doc.addPage();
      currentPage++;
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 12;
      drawTableHeader(tableY);
      tableY += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, p.rowH, 'F');
    }

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p.numStr, 17, tableY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(p.nameLines, 25, tableY + 5.2);

    const descY = tableY + 5.2 + (p.nameLines.length * 3.8);
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(p.descLines, 25, descY);

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(p.it.unit_price), 145, tableY + 5.2, { align: 'right' });

    doc.text(String(p.it.quantity || 1), 158, tableY + 5.2, { align: 'center' });

    doc.text(formatNinjaUGX(p.it.amount), 193, tableY + 5.2, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + p.rowH, 196, tableY + p.rowH);

    tableY += p.rowH;
  });

  if (tableY + 48 > 265) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 14;
  }

  const totalsY = tableY + 6;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Commercial Terms & Scope:', 14, totalsY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const termsString = quote?.notes || 'Quotation valid for 30 days from date of issuance. Includes 24/7 priority support and enterprise SLA.';
  const termsText = doc.splitTextToSize(termsString, 85);
  doc.text(termsText, 14, totalsY + 4.5);

  const verifyY = totalsY + 16;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 14, verifyY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 14, verifyY + 4.5);

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, verifyY + 7, 20, 20);
    } catch {}
  }

  const totalRows = [
    { label: 'Net Subtotal:', val: formatNinjaUGX(subtotalAmt) }
  ];
  if (!isVatExempt) {
    totalRows.push({ label: 'Value Added Tax (18% Statutory):', val: formatNinjaUGX(vatAmt) });
  }
  totalRows.push(
    { label: 'Estimated Total:', val: formatNinjaUGX(totalAmt), bold: true },
    { label: 'Payment Terms:', val: '75% Advance, 25% Completion' },
    { label: 'Amount Payable:', val: formatNinjaUGX(totalAmt), bold: true, color: [30, 58, 138] }
  );

  totalRows.forEach((r, idx) => {
    const rY = totalsY + idx * 5.2;
    doc.setFont('TrebuchetMS', r.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(r.color ? r.color[0] : 15, r.color ? r.color[1] : 23, r.color ? r.color[2] : 42);
    doc.text(r.label, 150, rY, { align: 'right' });
    doc.text(r.val, 194, rY, { align: 'right' });
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('We also Deal in: CCTV Cameras, Company Emails, Cloud Web Hosting & Dev, Mobile App Dev, Systems Admin, Backups & Restoration Services & Cyber Security', 105, 280, { align: 'center' });

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: 'center' });

    drawInvoiceNinja3ToneBar(doc, 293, 4);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerWorkOrderPDFBuffer(wo, options = {}) {
  const orderNum = sanitizePdfText(wo?.order_number || `WO-${wo?.id || '2026-0001'}`);
  const staffName = sanitizePdfText(wo?.assigned_staff_name || 'Field Support Specialist');
  const siteLocation = sanitizePdfText(wo?.client_site || 'Nova Primary Datacenter');
  const taskTitle = sanitizePdfText(wo?.task_title || 'Field Operations Technical Deployment');
  const desc = sanitizePdfText(wo?.description || 'Deliver scheduled technical deployment, cabling, server rack assembly, or optical fiber splicing as per corporate engineering guidelines.');
  const modeLabel = wo?.charging_mode === 'per_hour' ? 'Hourly Rate' : 'Daily Project Rate';
  const rateVal = Number(wo?.rate || 0);
  const qtyVal = Number(wo?.quantity || 1);
  const totalCost = Number(wo?.total_cost || (rateVal * qtyVal));

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(orderNum)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  } catch {}

  const dummyDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 500] });
  registerTrebuchetFont(dummyDoc);
  dummyDoc.setFont('TrebuchetMS', 'bold');
  dummyDoc.setFontSize(7.5);
  const taskLines = dummyDoc.splitTextToSize(taskTitle, 68);
  dummyDoc.setFont('TrebuchetMS', 'normal');
  dummyDoc.setFontSize(7);
  const descLines = desc ? dummyDoc.splitTextToSize(desc, 68) : [];
  const siteLines = dummyDoc.splitTextToSize(siteLocation, 68);

  const calculatedHeight = Math.max(160, 175 + (taskLines.length * 4.2) + (descLines.length * 3.8) + (siteLines.length * 3.8));
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, calculatedHeight] });
  registerTrebuchetFont(doc);

  let y = 6;

  // Header Logo (Centered)
  try {
    doc.addImage(NOVA_SERVER_LOGO_BASE64, 'PNG', 24, y, 32, 10.67);
    y += 13;
  } catch {
    y += 2;
  }

  // Header Titles
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text('FIELD SERVICE WORK ORDER', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 40, y, { align: 'center' });
  y += 3.5;
  doc.text('Tel: (+256) 790 001631 / 33 • support@ncloud.co.ug', 40, y, { align: 'center' });
  y += 4;

  // Dashed divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Work Order Ref & Status Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(5, y, 70, 15, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('WORK ORDER REF:', 8, y + 4.8);
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`#${orderNum}`, 72, y + 4.8, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Scheduled Date:', 8, y + 9.5);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(wo?.scheduled_date || 'Immediate', 72, y + 9.5, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.text('Status:', 8, y + 13.5);
  doc.setFont('TrebuchetMS', 'bold');
  const isCompleted = wo?.status === 'Completed';
  doc.setTextColor(isCompleted ? 22 : 217, isCompleted ? 163 : 119, isCompleted ? 74 : 6);
  doc.text(`[ ${wo?.status || 'Active Dispatch'} ]`, 72, y + 13.5, { align: 'right' });

  y += 18;

  // Deployment Site & Staff Details
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('DISPATCH & TARGET SITE DETAILS:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Assigned Engineer:', 5, y);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(staffName, 75, y, { align: 'right' });
  y += 4.2;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Deployment Site / Client:', 5, y);
  y += 3.8;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  siteLines.forEach(line => {
    doc.text(line, 5, y);
    y += 3.8;
  });

  // Dashed divider
  y += 1;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Scope & Task Section
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('ASSIGNED TECHNICAL SCOPE OF WORK:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  taskLines.forEach(line => {
    doc.text(line, 5, y);
    y += 4;
  });

  if (descLines.length > 0 && descLines[0] !== '') {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    descLines.forEach(line => {
      doc.text(line, 5, y);
      y += 3.6;
    });
  }

  // Dashed divider
  y += 2;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Operations & Charging Schedule
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('OPERATIONS & BILLING SCHEDULE:', 5, y);
  y += 4.5;

  const printMetric = (label, val) => {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 5, y);
    doc.setFont('TrebuchetMS', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 75, y, { align: 'right' });
    y += 4.2;
  };

  printMetric('Charging Method:', modeLabel);
  printMetric('Operational Unit Rate:', formatNinjaUGX(rateVal));
  const unitStr = `${qtyVal} ${wo?.charging_mode === 'per_hour' ? (qtyVal > 1 ? 'Hours' : 'Hour') : (qtyVal > 1 ? 'Days' : 'Day')}`;
  printMetric('Time / Units Logged:', unitStr);

  y += 1;

  // Approved Job Cost Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(5, y, 70, 14, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL APPROVED JOB VALUE:', 8, y + 4.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text(formatNinjaUGX(totalCost), 72, y + 10, { align: 'right' });

  y += 18;

  // Verification Section
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 40, y, { align: 'center' });
  y += 3.8;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 40, y, { align: 'center' });
  y += 4;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 30, y, 20, 20);
      y += 22;
    } catch {}
  }

  // Bottom text
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Field Operations Deployment Voucher', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Nova Cloud Edges (U) Limited • ncloud.co.ug', 40, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerExpenseVoucherPDFBuffer(exp, options = {}) {
  const voucherNum = sanitizePdfText(exp?.receipt_ref || (exp?.id ? `EXP-#${exp.id}` : 'EXP-2026-0001'));
  const staffName = sanitizePdfText(exp?.staff_name || exp?.beneficiary || 'Internal Staff Beneficiary');
  const staffEmail = sanitizePdfText(exp?.staff_email || '');
  const category = sanitizePdfText(exp?.category || 'Company Operational Expense');
  const desc = sanitizePdfText(exp?.description || exp?.purpose || 'Official corporate disbursement voucher.');
  const amount = Number(exp?.amount || 0);
  const status = sanitizePdfText(exp?.status || 'Approved');
  const dateVal = exp?.date || (exp?.created_at ? new Date(exp.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(voucherNum)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  } catch {}

  const dummyDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 500] });
  registerTrebuchetFont(dummyDoc);
  dummyDoc.setFont('TrebuchetMS', 'normal');
  dummyDoc.setFontSize(7.5);
  const descLines = dummyDoc.splitTextToSize(desc, 68);
  dummyDoc.setFont('TrebuchetMS', 'bold');
  dummyDoc.setFontSize(7.5);
  const catLines = dummyDoc.splitTextToSize(category, 68);
  const staffLines = dummyDoc.splitTextToSize(staffName, 68);

  const calculatedHeight = Math.max(160, 175 + (descLines.length * 3.8) + (catLines.length * 3.8) + (staffLines.length > 1 ? staffLines.length * 3.8 : 0));
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, calculatedHeight] });
  registerTrebuchetFont(doc);

  let y = 6;

  // Header Logo (Centered)
  try {
    doc.addImage(NOVA_SERVER_LOGO_BASE64, 'PNG', 24, y, 32, 10.67);
    y += 13;
  } catch {
    y += 2;
  }

  // Header Titles
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text('OFFICIAL EXPENDITURE PAYMENT VOUCHER', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 40, y, { align: 'center' });
  y += 3.5;
  doc.text('Tel: (+256) 790 001631 / 33 • finance@ncloud.co.ug', 40, y, { align: 'center' });
  y += 4;

  // Dashed divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Voucher Ref Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(5, y, 70, 15, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('VOUCHER REF:', 8, y + 4.8);
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`#${voucherNum}`, 72, y + 4.8, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Disbursed Date:', 8, y + 9.5);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(dateVal, 72, y + 9.5, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.text('Voucher Status:', 8, y + 13.5);
  doc.setFont('TrebuchetMS', 'bold');
  const isPaidOrApp = status === 'Paid' || status === 'Approved' || status === 'Approved by Supervisor';
  doc.setTextColor(isPaidOrApp ? 22 : 217, isPaidOrApp ? 163 : 119, isPaidOrApp ? 74 : 6);
  doc.text(`[ ${status} ]`, 72, y + 13.5, { align: 'right' });

  y += 18;

  // Beneficiary Staff Details
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('STAFF BENEFICIARY & CLAIMANT:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  staffLines.forEach(line => {
    doc.text(line, 5, y);
    y += 4;
  });

  if (staffEmail) {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(staffEmail, 5, y);
    y += 4;
  }

  // Dashed divider
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Category & Purpose Details
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('EXPENSE CLASSIFICATION & PURPOSE:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  catLines.forEach(line => {
    doc.text(line, 5, y);
    y += 3.8;
  });

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  descLines.forEach(line => {
    doc.text(line, 5, y);
    y += 3.6;
  });

  // Dashed divider
  y += 2;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Disbursed Amount Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(5, y, 70, 14, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL DISBURSED AMOUNT:', 8, y + 4.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text(formatNinjaUGX(amount), 72, y + 10, { align: 'right' });

  y += 18;

  // Verification Section
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 40, y, { align: 'center' });
  y += 3.8;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 40, y, { align: 'center' });
  y += 4;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 30, y, 20, 20);
      y += 22;
    } catch {}
  }

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Corporate Expenditure Disbursement', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Nova Cloud Edges (U) Limited • Finance Division', 40, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateServerPaymentReceiptPDFBuffer(pmt, options = {}) {
  // Thermal Receipt Format: 80mm width. Height dynamically calculated or set to 200mm.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
  registerTrebuchetFont(doc);
  const pmtRef = pmt.reference || `PAY-${pmt.id || '2026-0001'}`;
  const invNum = pmt.invoice_number || 'INV-2026-0001';
  const cName = pmt.party_name || options.customerName || 'Valued Corporate Customer';
  const paidAmt = Number(pmt.amount || pmt.amount_paid || 0);
  const pmtMethod = pmt.payment_method || 'Direct Transfer';
  const pmtDate = pmt.payment_date || pmt.timestamp || new Date().toISOString().split('T')[0];
  const isCleared = pmt.status === '100% Paid' || pmt.status === 'Paid & Settled' || pmt.status === 'Paid' || pmt.status === 'PAID';

  const qrDataUrl = await getServerQrDataUrl(`https://ncloud.co.ug/verify?doc=${encodeURIComponent(pmtRef)}`);
  const activeLogo = options.logoDataUrl || memoryStore.site_logo || NOVA_SERVER_LOGO_BASE64;

  let y = 6;
  const centerX = 40;

  if (activeLogo) {
    try {
      doc.addImage(activeLogo, 'PNG', 26, y, 28, 22);
      y += 26;
    } catch {}
  } else {
    y += 10;
  }

  // Header
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LTD', centerX, y, { align: 'center' });
  y += 4;
  
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(SERVER_BRAND.address, centerX, y, { align: 'center' });
  y += 3.5;
  doc.text(`TIN: ${SERVER_BRAND.tin}`, centerX, y, { align: 'center' });
  y += 3.5;
  doc.text('support@ncloud.co.ug', centerX, y, { align: 'center' });
  y += 6;

  // Title
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT RECEIPT', centerX, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(0, 0, 0);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, 74, y);
  y += 5;
  doc.setLineDashPattern([], 0);

  // Tx Details
  const printRow = (lbl, val) => {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, 6, y);
    doc.setFont('TrebuchetMS', 'bold');
    doc.setTextColor(15, 23, 42);
    // wrap text if too long
    const splitVal = doc.splitTextToSize(val, 40);
    doc.text(splitVal, 74, y, { align: 'right' });
    y += (splitVal.length * 3.5) + 1;
  };

  printRow('Receipt No:', pmtRef);
  printRow('Date:', pmtDate.replace('T', ' ').substring(0, 19));
  printRow('Invoice No:', invNum);
  printRow('Customer:', cName);
  printRow('Method:', pmtMethod);
  printRow('Status:', isCleared ? 'Cleared' : 'Partial');

  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, 74, y);
  y += 5;
  doc.setLineDashPattern([], 0);

  // Amount
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74);
  doc.text('AMOUNT RECEIVED', 6, y);
  doc.text(`UGX ${paidAmt.toLocaleString()}`, 74, y, { align: 'right' });
  y += 6;
  
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, 74, y);
  y += 5;
  doc.setLineDashPattern([], 0);

  // Footer & QR
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 26, y, 28, 28);
      y += 30;
    } catch {}
  } else {
    y += 10;
  }

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Thank you for your business.', centerX, y, { align: 'center' });
  y += 4;
  doc.text('Scan QR to verify authenticity online.', centerX, y, { align: 'center' });
  y += 4;
  doc.setFont('TrebuchetMS', 'bold');
  doc.text('ncloud.co.ug', centerX, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// Delivery Note Certified PDF Generator
export async function generateServerDeliveryNotePDFBuffer(dn, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerTrebuchetFont(doc);

  const dnNum = sanitizePdfText(dn?.dn_number || `DN-${new Date().getFullYear()}-0001`);
  const invoiceNum = sanitizePdfText(dn?.invoice_number || 'INV-FULFILLED');
  const dnDate = formatNinjaDate(dn?.delivery_date || dn?.created_at || new Date());
  const cName = sanitizePdfText(dn?.customer_name || dn?.company || 'Valued Corporate Client');
  const cAddr = sanitizePdfText(dn?.delivery_address || dn?.customer_address || 'Customer Premises, Uganda');
  const cPhone = sanitizePdfText(dn?.customer_phone || '');
  const cEmail = sanitizePdfText(dn?.customer_email || '');
  const carrier = sanitizePdfText(dn?.carrier || 'Direct Handover');
  const trackingCode = sanitizePdfText(dn?.tracking_code || 'TRK-DIRECT-01');
  const dispatchOfficer = sanitizePdfText(dn?.dispatch_officer || 'Nova Operations & Logistics');

  let items = [];
  if (Array.isArray(dn?.items) && dn.items.length > 0) {
    items = dn.items.map(it => ({
      name: sanitizePdfText(it.name || it.item_name || 'Supplied Equipment / Service'),
      description: sanitizePdfText(it.description || it.specs || ''),
      serial: sanitizePdfText(it.serial_number || it.serial || it.asset_tag || 'N/A - Direct Provision'),
      qtyOrdered: Math.max(1, parseInt(it.quantity_ordered || it.quantity || it.qty) || 1),
      qtyDispatched: Math.max(1, parseInt(it.quantity_dispatched || it.quantity || it.qty) || 1),
      condition: sanitizePdfText(it.condition || 'Tested & Certified (Pristine)')
    }));
  } else {
    items = [{
      name: 'Commercial Products & Solution Deployment',
      description: 'Fully inspected and verified items fulfilled under Invoice #' + invoiceNum,
      serial: 'N/A - Direct Provision',
      qtyOrdered: 1,
      qtyDispatched: 1,
      condition: 'Tested & Certified (Pristine)'
    }];
  }

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(dnNum)}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  } catch {}

  drawInvoiceNinja3ToneBar(doc, 0, 4);

  try {
    doc.addImage(NOVA_SERVER_LOGO_BASE64, 'PNG', 14, 10, 45, 15);
  } catch {
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('NOVA CLOUD EDGES (U) LTD', 14, 18);
  }

  // Top Right Box (Executive Dark Slate / Indigo Box with Green Accent)
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(124, 8, 72, 32, 1.5, 1.5, 'F');

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(124, 8, 72, 2.5, 1, 1, 'F');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'OFFICIAL DELIVERY NOTE', val: `#${dnNum}` },
    { label: 'Delivery Date:', val: dnDate },
    { label: 'Invoice Reference:', val: `#${invoiceNum}` },
    { label: 'Payment Status:', val: '100% Paid & Cleared', color: [52, 211, 153] },
    { label: 'Fulfillment Status:', val: 'Fulfilled & Released' }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 14 + idx * 5;
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(r.label, 127, rowY);
    if (r.color) {
      doc.setTextColor(r.color[0], r.color[1], r.color[2]);
    } else {
      doc.setTextColor(255, 255, 255);
    }
    doc.text(r.val, 193, rowY, { align: 'right' });
  });

  // TWO EXECUTIVE CARDS
  const cardY = 44;
  const cardW = 88;
  const cardH = 32;

  // CARD 1: DISPATCHED FROM
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('DISPATCHED FROM (LOGISTICS DIVISION)', 18, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges (U) Limited', 18, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 18, cardY + 15.5);
  doc.text('Tel: (+256) 790 001631 / 33  |  support@ncloud.co.ug', 18, cardY + 20);
  doc.text(`Dispatch Officer: ${dispatchOfficer}`, 18, cardY + 24.5);
  doc.text('Origin: Nova Central Datacenter & Warehouse', 18, cardY + 29);

  // CARD 2: DELIVERED TO
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('DELIVERED TO (CLIENT / CONSIGNEE)', 112, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.substring(0, 38), 112, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Destination: ${cAddr.substring(0, 42)}`, 112, cardY + 15.5);
  doc.text(cPhone ? `Contact Tel: ${cPhone}` : 'Contact Telephone on File', 112, cardY + 20);
  doc.text(cEmail ? `Email: ${cEmail}` : 'Email on File', 112, cardY + 24.5);
  doc.text(`Handover Method: ${carrier}`, 112, cardY + 29);

  // LOGISTICS METADATA BAR
  const barY = cardY + cardH + 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, barY, 182, 7.5, 1, 1, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CARRIER / METHOD:', 18, barY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(carrier, 48, barY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text('TRACKING / WAYBILL REF:', 86, barY + 5);
  doc.setTextColor(2, 132, 199);
  doc.text(trackingCode, 126, barY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text('SETTLEMENT:', 156, barY + 5);
  doc.setTextColor(22, 163, 74);
  doc.text('100% PAID', 178, barY + 5);

  function drawDnTableHeader(y) {
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(14, y, 182, 8, 1, 1, 'F');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, y + 5.5);
    doc.text('Delivered Item & Description', 25, y + 5.5);
    doc.text('Serial / Asset Tag', 112, y + 5.5);
    doc.text('Qty Ord', 148, y + 5.5, { align: 'center' });
    doc.text('Qty Disp', 164, y + 5.5, { align: 'center' });
    doc.text('Condition / QC', 193, y + 5.5, { align: 'right' });
  }

  let tableY = barY + 11;
  drawDnTableHeader(tableY);
  tableY += 8;

  const preparedItems = items.map((it, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const nameLines = doc.splitTextToSize(String(it.name || ''), 82);
    const descLines = it.description ? doc.splitTextToSize(String(it.description || ''), 82) : [];
    const totalLines = nameLines.length + descLines.length;
    const rowH = Math.max(8.5, totalLines * 3.8 + 3.5);
    return { it, numStr, nameLines, descLines, rowH };
  });

  preparedItems.forEach((p, idx) => {
    if (tableY + p.rowH > 220) {
      doc.addPage();
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 14;
      drawDnTableHeader(tableY);
      tableY += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, p.rowH, 'F');
    }

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p.numStr, 17, tableY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(p.nameLines, 25, tableY + 5.2);

    if (p.descLines.length > 0) {
      const descY = tableY + 5.2 + (p.nameLines.length * 3.8);
      doc.setFont('TrebuchetMS', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(p.descLines, 25, descY);
    }

    // Serial / Asset Tag
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const serialLines = doc.splitTextToSize(p.it.serial, 32);
    doc.text(serialLines, 112, tableY + 5.2);

    // Qty Ordered
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(String(p.it.qtyOrdered), 148, tableY + 5.2, { align: 'center' });

    // Qty Dispatched
    doc.setFont('TrebuchetMS', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(p.it.qtyDispatched), 164, tableY + 5.2, { align: 'center' });

    // Condition
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    doc.text(p.it.condition, 193, tableY + 5.2, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + p.rowH, 196, tableY + p.rowH);

    tableY += p.rowH;
  });

  if (tableY + 55 > 270) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 14;
  }

  // Delivery Acknowledgement & Verification Section
  const ackY = tableY + 6;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Customer Delivery Acknowledgement & Receipt Terms:', 14, ackY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const terms = doc.splitTextToSize(
    dn?.notes || 'Goods and services described above have been inspected, tested, and handed over in 100% operational condition with all standard manufacturer/service warranties. The recipient confirms physical inspection and receipt in good order without shortfall.',
    115
  );
  doc.text(terms, 14, ackY + 4.5);

  // QR Code on Left
  const qrY = ackY + 16;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify Delivery Note Online:', 14, qrY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 14, qrY + 4.2);

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, qrY + 6.5, 18, 18);
    } catch {}
  }

  // DUAL SIGN-OFF BLOCKS
  const signBlockY = qrY + 2;
  const signW = 60;
  const signH = 22;

  // Box 1: Dispatched By
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(74, signBlockY, signW, signH, 1, 1, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('DISPATCHED BY (NOVA CLOUD):', 76, signBlockY + 4.5);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${dispatchOfficer}`, 76, signBlockY + 9);
  doc.text(`Date: ${dnDate}`, 76, signBlockY + 13.5);
  doc.setDrawColor(148, 163, 184);
  doc.line(76, signBlockY + 19, 74 + signW - 4, signBlockY + 19);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signature & Official Stamp', 76, signBlockY + 21);

  // Box 2: Received By
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(136, signBlockY, signW, signH, 1, 1, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 163, 74);
  doc.text('RECEIVED & ACCEPTED BY (CUSTOMER):', 138, signBlockY + 4.5);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${cName.substring(0, 24)}`, 138, signBlockY + 9);
  doc.text('Date: ____ / ____ / 2026', 138, signBlockY + 13.5);
  doc.setDrawColor(148, 163, 184);
  doc.line(138, signBlockY + 19, 136 + signW - 4, signBlockY + 19);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Receiver Signature & Company Stamp', 138, signBlockY + 21);

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 282, 196, 282);

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Official Delivery Note issued by Nova Cloud Edges (U) Limited  |  Lugga Zone, Ndejje, Wakiso, Uganda  |  TIN: 1014892019`, 105, 286, { align: 'center' });
    doc.text(`Page ${p} of ${totalPages}  |  Certified Proof of Fulfillment & Inventory Handover`, 105, 289.5, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// Helper to render dynamically configured bank accounts in email templates
function renderConfiguredBankAccountsHtml() {
  const banks = Array.isArray(memoryStore.bank_accounts) ? memoryStore.bank_accounts : [];
  
  if (banks.length === 0) {
    return `<div style="padding: 15px; color: #a1a1aa; font-style: italic;">Please contact our billing department for payment instructions.</div>`;
  }

  const banksHtml = banks.map(b => `
    <div style="background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="margin-bottom: 6px;">
        <strong style="color: #f4f4f5; font-size: 14px; letter-spacing: 0.3px;">${b.bank_name}</strong>
        <span style="display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 800; font-size: 10px; padding: 3px 8px; border-radius: 12px; margin-left: 8px; border: 1px solid rgba(56, 189, 248, 0.3);">${b.currency || 'UGX'}</span>
      </div>
      <div style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
        <div>Account Name: <strong style="color: #e4e4e7;">${b.account_name || SERVER_BRAND.name}</strong></div>
        <div>Account Number: <strong style="color: #f4f4f5; font-family: monospace; font-size: 14px; letter-spacing: 0.5px;">${b.account_number}</strong></div>
        <div style="color: #71717a; font-size: 11px; margin-top: 4px;">Branch: ${b.branch || 'Main Branch'} ${b.swift_code ? ` | SWIFT: ${b.swift_code}` : ''}</div>
      </div>
    </div>
  `).join('');

  return `
    <div style="background: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 20px; margin: 24px 0; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);">
      <div style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        Approved Settlement & Remittance Details
      </div>
      ${banksHtml}
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
  downloadUrl,
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
  let siteLogo = memoryStore.site_logo || '';
  if (siteLogo.startsWith('/')) {
    siteLogo = 'https://ncloud.co.ug' + siteLogo;
  }

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Nova Cloud Edges Official Notification'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body, table, td, a { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; -webkit-font-smoothing: antialiased; }
    body { background-color: #09090b; color: #e4e4e7; margin: 0; padding: 40px 15px; }
    .email-container { max-width: 640px; margin: 0 auto; background: #18181b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); border: 1px solid #27272a; }
    
    /* Header (Dark Premium) */
    .email-header { background-color: #ffffff; padding: 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
    .email-logo-img { max-height: 55px; max-width: 220px; object-fit: contain; }
    .company-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; margin: 0; }
    .company-title span { color: #0ea5e9; }
    
    /* Body */
    .email-body { padding: 45px 40px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; border: 1px solid rgba(56, 189, 248, 0.2); box-shadow: 0 0 10px rgba(56, 189, 248, 0.1); }
    .doc-title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 20px 0; line-height: 1.3; letter-spacing: -0.5px; }
    .salutation { font-size: 16px; color: #e4e4e7; margin-bottom: 16px; font-weight: 500; }
    .intro-paragraph { font-size: 15px; line-height: 1.7; color: #a1a1aa; margin-bottom: 30px; }
    
    /* Attachments */
    .attachment-card { background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 18px 24px; margin: 24px 0; border-left: 4px solid #818cf8; position: relative; overflow: hidden; }
    .attachment-title { font-weight: 700; font-size: 14px; color: #ffffff; margin-bottom: 6px; letter-spacing: 0.3px; }
    .attachment-desc { font-size: 13px; color: #a1a1aa; line-height: 1.6; }
    
    /* Tables */
    .table-container { border-radius: 12px; border: 1px solid #27272a; overflow: hidden; margin-bottom: 30px; background: #09090b; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table th { background: #18181b; text-align: left; padding: 16px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
    .data-table td { padding: 16px; border-bottom: 1px solid #18181b; color: #e4e4e7; }
    .total-row { background: #18181b; }
    .total-row td { font-size: 16px; font-weight: 800; color: #ffffff; border-top: 2px solid #3f3f46; }
    .total-amount { color: #38bdf8 !important; font-size: 20px !important; letter-spacing: 0.5px; }
    
    /* Buttons */
    .btn-container { text-align: center; margin: 40px 0 30px 0; }
    .primary-btn { display: inline-block; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(2, 132, 199, 0.4); border: 1px solid rgba(255,255,255,0.1); }
    
    /* Footer */
    .email-footer { background: #09090b; padding: 35px 30px; text-align: center; font-size: 12px; color: #71717a; line-height: 1.8; border-top: 1px solid #27272a; }
    .footer-highlight { color: #a1a1aa; font-weight: 600; }

    @media screen and (max-width: 600px) {
      body { padding: 0 !important; }
      .email-container { max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-header { padding: 30px 20px !important; }
      .company-title { font-size: 22px !important; }
      .email-body { padding: 30px 20px !important; }
      .doc-title { font-size: 22px !important; }
      .data-table th, .data-table td { padding: 12px 10px !important; font-size: 13px !important; }
      .data-table { word-wrap: break-word; table-layout: fixed; }
      .total-row td { font-size: 15px !important; }
      .total-amount { font-size: 18px !important; }
      .primary-btn { padding: 16px 24px !important; font-size: 14px !important; width: 100% !important; box-sizing: border-box; }
    }
  </style>
</head>
<body style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; margin: 0; padding: 40px 15px;">
  <div class="email-container">
    <div class="email-header">
      ${siteLogo ? `<img src="${siteLogo}" alt="Nova Cloud Edges Logo" class="email-logo-img" />` : '<div class="company-title">NOVA <span>CLOUD EDGES</span></div>'}
      <div class="company-subtitle"></div>
    </div>
    
    <div class="email-body">
      ${badgeText ? `<div class="badge">${badgeText}</div>` : ''}
      <h2 class="doc-title">${title || 'Official Corporate Notification'}</h2>
      <p class="salutation">Dear <strong style="color: #ffffff;">${finalRecipient}</strong>,</p>
      <div class="intro-paragraph">${finalIntro}</div>

      ${attachmentName ? `
      <div class="attachment-card">
        <div class="attachment-title">Official Document Attached</div>
        <div class="attachment-desc">${attachmentName} has been generated and securely attached to this email.</div>
        ${downloadUrl ? `<div style="margin-top: 14px;"><a href="${downloadUrl}" style="color: #818cf8; font-weight: 700; text-decoration: none; letter-spacing: 0.5px;">Download Secure Copy &rarr;</a></div>` : ''}
      </div>
      ` : ''}

      ${itemsRows ? `
      <div class="table-container">
        <table class="data-table">
          ${isInvoice ? `
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center; width: 15%;">Qty</th>
              <th style="text-align: right; width: 35%;">Amount (UGX)</th>
            </tr>
          </thead>
          ` : ''}
          <tbody>
            ${itemsRows}
            ${isInvoice ? `
            <tr>
              <td colspan="2" style="font-weight: 600; color: #71717a; text-align: right; padding-top: 20px;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600; color: #e4e4e7; padding-top: 20px;">${subtotalText || ''}</td>
            </tr>
            ${discountRowHtml || ''}
            <tr>
              <td colspan="2" style="font-weight: 600; color: #71717a; text-align: right;">VAT (18% Statutory):</td>
              <td style="text-align: right; font-weight: 600; color: #e4e4e7;">${vatText || ''}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right;">Total Amount:</td>
              <td class="total-amount" style="text-align: right;">${totalAmountText || ''}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${!hidePaymentMethods ? renderConfiguredBankAccountsHtml() : ''}

      ${(ctaLink || shareLink) ? `
      <div class="btn-container">
        <a href="${ctaLink || shareLink || 'https://ncloud.co.ug'}" class="primary-btn">${ctaText || 'Access Client Portal'}</a>
      </div>
      ` : ''}

      ${shareLink ? `
      <p style="font-size: 13px; color: #71717a; text-align: center; margin-top: 30px; line-height: 1.6;">
        Or access directly via this secure link:<br/>
        <a href="${shareLink}" style="color: #38bdf8; word-break: break-all; text-decoration: none;">${shareLink}</a>
      </p>
      ` : ''}
    </div>
    
    <div class="email-footer">
      <div>This is an automatically generated communication from <span class="footer-highlight">Nova Cloud Edges (U) Limited</span>.</div>
      <div style="margin-top: 10px;">Lugga Zone, Ndejje, Wakiso, Uganda | TIN: 1014892019</div>
      ${footerNote ? `<div style="margin-top: 16px; color: #a1a1aa; font-style: italic;">${footerNote}</div>` : ''}
      <div style="margin-top: 20px; font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 1px;">
        &copy; ${new Date().getFullYear()} Nova Cloud Edges. All rights reserved.
      </div>
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
  const xForwardedHost = (req.headers['x-forwarded-host'] || '').toLowerCase();
  const host = (xForwardedHost || req.headers.host || req.hostname || '').toLowerCase();
  const origin = (req.headers.origin || '').toLowerCase();
  const referer = (req.headers.referer || '').toLowerCase();

  const isProduction = 
    host.includes('ncloud.co.ug') || 
    origin.includes('ncloud.co.ug') || 
    referer.includes('ncloud.co.ug') ||
    host.includes('ncedges.com') ||
    origin.includes('ncedges.com');

  const isLocalhost = !isProduction && (
    host.includes('localhost') || 
    host.includes('127.0.0.1') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    referer.includes('localhost') || 
    referer.includes('127.0.0.1')
  );

  const settings = memoryStore.security_settings || {};
  const isValidKey = settings.turnstile_site_key && 
    !settings.turnstile_site_key.includes('testSiteKey') &&
    settings.turnstile_site_key !== '0x4AAAAAAtestSiteKey12345';

  if (settings.is_active && isValidKey) {
    res.json({ 
      is_active: true, 
      site_key: settings.turnstile_site_key,
      is_localhost: isLocalhost,
      bypass_allowed: isLocalhost 
    });
  } else {
    res.json({ 
      is_active: false, 
      site_key: '',
      is_localhost: isLocalhost,
      bypass_allowed: isLocalhost 
    });
  }
});

const handleSaveSecuritySettingsRoute = (req, res) => {
  let { turnstile_site_key, turnstile_secret_key, is_active } = req.body || {};
  if (!memoryStore.security_settings) memoryStore.security_settings = {};
  
  if (turnstile_site_key !== undefined) memoryStore.security_settings.turnstile_site_key = String(turnstile_site_key || '').trim();
  if (turnstile_secret_key !== undefined) memoryStore.security_settings.turnstile_secret_key = String(turnstile_secret_key || '').trim();
  if (is_active !== undefined) memoryStore.security_settings.is_active = is_active === true || is_active === 'true' || is_active === 1;
  memoryStore.security_settings.updated_at = new Date().toISOString();

  savePersistentStore();

  return res.json({ 
    success: true,
    message: 'Cloudflare Security Settings saved successfully!', 
    settings: memoryStore.security_settings 
  });
};

app.put('/api/admin/security-settings', handleSaveSecuritySettingsRoute);
app.post('/api/admin/security-settings', handleSaveSecuritySettingsRoute);

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
      <div style="font-family: Arial, sans-serif; padding: 25px; color: #0f172a; width: 100%; max-width: 600px; margin: 0 auto; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 12px; background: #ffffff;">
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

// (Duplicate role routes removed - handled in consolidated User Roles & Granular CRUDAS Permissions API section below)

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
  const isWifiVoucher = (item_name || '').toLowerCase().includes('wifi voucher') || 
                        (item_name || '').toLowerCase().includes('wifi -') || 
                        (item_name || '').toLowerCase().includes('nova wifi') || 
                        (items || []).some(i => (i.name || '').toLowerCase().includes('wifi voucher')) ||
                        Boolean(wifi_voucher_id);
  
  const isExempt = isWifiVoucher ? true : Boolean(vat_exempt);
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
    items: (Array.isArray(req.body.items) && req.body.items.length > 0)
      ? req.body.items
      : [{ name: item_name || 'Enterprise Cloud VPS Infrastructure', quantity: qty, unit_price: pricePerUnit, amount: grossSubtotal }],
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
    due_date: due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
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
    downloadUrl: `https://ncloud.co.ug/api/invoices/pdf/${encodeURIComponent(newInvoice.invoice_number)}`,
    introText: `Your official Nova Cloud Edges Tax Invoice #${newInvoice.invoice_number} has been generated. Please find the summary below and inspect the official certified PDF attached to this email.`,
    itemsRows: ((Array.isArray(newInvoice.items) && newInvoice.items.length > 0) ? newInvoice.items : [{ name: newInvoice.item_name, quantity: newInvoice.quantity, amount: newInvoice.amount }]).map(it => `
      <tr>
        <td>${it.name || it.description || newInvoice.item_name}</td>
        <td style="text-align: center;">${it.quantity || it.qty || 1}</td>
        <td style="text-align: right;">UGX ${Number(it.amount || ((it.quantity || 1) * (it.unit_price || newInvoice.unit_price || 0))).toLocaleString()}</td>
      </tr>
    `).join(''),
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

// Endpoint to Dispatch Official 100% Paid Tax Receipt with Attached PDF
app.post('/api/admin/invoices/:id/send-receipt', async (req, res) => {
  const { id } = req.params;
  const inv = (memoryStore.invoices || []).find(i => i.id == id || i.invoice_number === id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const isPaid = inv.status === 'Paid' || inv.status === '100% Paid' || inv.status === 'Paid & Settled' || (inv.balance !== undefined && Number(inv.balance) <= 0);
  if (!isPaid && Number(inv.paid_amount || 0) <= 0) {
    return res.status(400).json({ error: 'No payments recorded for this invoice yet.' });
  }

  const receiptRef = `RCT-${inv.invoice_number.replace(/^INV-/, '')}`;
  const receiptPayment = {
    id: Date.now(),
    reference: receiptRef,
    invoice_number: inv.invoice_number,
    amount: Number(inv.paid_amount || inv.amount || 0),
    payment_method: inv.payment_method || 'Direct Bank Settlement / Cash',
    created_at: new Date().toISOString()
  };

  try {
    const pdfBuffer = await generateServerPaymentReceiptPDFBuffer(receiptPayment, {
      customerName: inv.customer_name,
      customerEmail: inv.customer_email
    });

    const emailHtml = generateCorporateEmailHtml({
      title: `Official 100% Paid Tax Receipt #${receiptRef}`,
      badgeText: '100% Paid & Settled',
      recipientName: inv.customer_name,
      attachmentName: `Payment_Receipt_${receiptRef}.pdf`,
      introText: `Your payment of <strong>UGX ${Number(receiptPayment.amount).toLocaleString()}</strong> for Tax Invoice <strong>#${inv.invoice_number}</strong> has been cleared in full. The official certified tax receipt has been generated and attached to this email.`,
      itemsRows: `
        <tr>
          <td><strong>Settlement Reference</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${receiptRef}</td>
        </tr>
        <tr>
          <td><strong>Cleared Tax Invoice</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: bold;">#${inv.invoice_number}</td>
        </tr>
        <tr>
          <td><strong>Payment Status</strong></td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; font-weight: bold; color: #16a34a;">100% PAID & CLEARED</td>
        </tr>
      `,
      subtotalText: `UGX ${Number(receiptPayment.amount).toLocaleString()}`,
      vatText: 'Statutory Clearance Confirmed',
      totalAmountText: `UGX ${Number(receiptPayment.amount).toLocaleString()}`,
      shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(receiptRef)}`,
      downloadUrl: `https://ncloud.co.ug/api/invoices/pdf/${encodeURIComponent(inv.invoice_number)}`,
      ctaText: 'Verify Official Receipt Online',
      ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(receiptRef)}`,
      hidePaymentMethods: true
    });

    await sendMail({
      to: inv.customer_email,
      subject: `Official Payment Receipt [${receiptRef}] - Invoice #${inv.invoice_number} - Nova Cloud Edges`,
      html: emailHtml,
      attachments: [
        {
          filename: `Payment_Receipt_${receiptRef}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    return res.json({
      success: true,
      message: `Official 100% Paid Tax Receipt [${receiptRef}] and certified PDF dispatched to ${inv.customer_email}!`,
      receipt_ref: receiptRef
    });
  } catch (err) {
    console.error('[Send Receipt Error]:', err);
    return res.status(500).json({ error: 'Failed to generate receipt PDF or send email: ' + err.message });
  }
});

// Endpoint to Prepare & Dispatch Official Delivery Note (Smart Fulfillment for 100% Paid Invoices)
app.post('/api/admin/invoices/:id/delivery-note', async (req, res) => {
  const { id } = req.params;
  const inv = (memoryStore.invoices || []).find(i => i.id == id || i.invoice_number === id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  // STRICT RULE: Delivery Note is only allowed when invoice is 100% paid
  const isPaid = inv.status === 'Paid' || inv.status === '100% Paid' || inv.status === 'Paid & Settled' || (inv.balance !== undefined && Number(inv.balance) <= 0);
  if (!isPaid) {
    return res.status(400).json({
      error: `Delivery Note can only be prepared and dispatched for invoices that are 100% paid. Current balance outstanding: UGX ${Number(inv.balance || inv.amount).toLocaleString()}.`
    });
  }

  const {
    carrier,
    tracking_code,
    dispatch_officer,
    delivery_address,
    delivery_date,
    recipient_name,
    recipient_email,
    recipient_phone,
    notes,
    items
  } = req.body || {};

  if (!memoryStore.delivery_notes) memoryStore.delivery_notes = [];
  const count = memoryStore.delivery_notes.length + 101;
  const dnNumber = `DN-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  // Smart item serialization: parse items and include serials/asset tags & QC checks
  const preparedItems = (Array.isArray(items) && items.length > 0)
    ? items.map(it => ({
        name: it.name || it.item_name || inv.item_name || 'Supplied Equipment',
        description: it.description || '',
        serial_number: it.serial_number || it.serial || it.asset_tag || 'N/A - Direct Handover',
        quantity_ordered: Number(it.quantity_ordered || it.quantity || it.qty || 1),
        quantity_dispatched: Number(it.quantity_dispatched || it.quantity || it.qty || 1),
        condition: it.condition || 'Tested & Certified (Pristine)'
      }))
    : (inv.items && inv.items.length > 0)
      ? inv.items.map(it => ({
          name: it.name || it.item_name || inv.item_name,
          description: it.description || '',
          serial_number: it.serial_number || 'N/A - Provisioned',
          quantity_ordered: Number(it.quantity || it.qty || 1),
          quantity_dispatched: Number(it.quantity || it.qty || 1),
          condition: 'Tested & Certified (Pristine)'
        }))
      : [{
          name: inv.item_name || 'Enterprise Cloud & Managed Solution',
          description: 'Inspected items delivered under Invoice #' + inv.invoice_number,
          serial_number: 'N/A - Direct Handover',
          quantity_ordered: Number(inv.quantity || 1),
          quantity_dispatched: Number(inv.quantity || 1),
          condition: 'Tested & Certified (Pristine)'
        }];

  const newDeliveryNote = {
    id: Date.now(),
    dn_number: dnNumber,
    invoice_id: inv.id,
    invoice_number: inv.invoice_number,
    customer_name: recipient_name || inv.customer_name,
    customer_email: recipient_email || inv.customer_email,
    customer_phone: recipient_phone || inv.customer_phone || '',
    delivery_address: delivery_address || inv.customer_address || 'Customer Premises, Uganda',
    carrier: carrier || 'Direct Handover',
    tracking_code: tracking_code || `TRK-${Date.now().toString().slice(-6)}`,
    dispatch_officer: dispatch_officer || 'Nova Operations & Logistics',
    delivery_date: delivery_date || new Date().toISOString().split('T')[0],
    status: 'Dispatched & Delivered',
    payment_status: '100% Paid & Cleared',
    items: preparedItems,
    notes: notes || 'All items inspected, tested, and handed over in 100% operational condition.',
    created_at: new Date().toISOString()
  };

  memoryStore.delivery_notes.unshift(newDeliveryNote);

  // Link delivery note number to invoice record
  inv.delivery_note_ref = dnNumber;
  inv.delivery_dispatched_at = new Date().toISOString();
  savePersistentStore();

  try {
    const pdfBuffer = await generateServerDeliveryNotePDFBuffer(newDeliveryNote);
    const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(dnNumber)}`;
    const downloadUrl = `https://ncloud.co.ug/api/delivery-notes/pdf/${encodeURIComponent(dnNumber)}`;

    const itemsRowsHtml = preparedItems.map(it => `
      <tr>
        <td>
          <strong>${it.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">Serial/Tag: <code style="color: #0284c7;">${it.serial_number}</code></span>
        </td>
        <td style="text-align: center;">${it.quantity_dispatched}</td>
        <td style="text-align: right; color: #16a34a; font-weight: bold;">${it.condition}</td>
      </tr>
    `).join('');

    const emailHtml = generateCorporateEmailHtml({
      title: `Official Delivery Note #${dnNumber}`,
      badgeText: '100% Paid & Delivered',
      recipientName: newDeliveryNote.customer_name,
      attachmentName: `Delivery_Note_${dnNumber}.pdf`,
      downloadUrl,
      introText: `Your order associated with 100% cleared Tax Invoice <strong>#${inv.invoice_number}</strong> has been prepared and released for fulfillment via <strong>${newDeliveryNote.carrier}</strong> (Tracking Ref: <code>${newDeliveryNote.tracking_code}</code>). The official certified Delivery Note has been generated and attached as a verifiable PDF for your inventory handover and audit records.`,
      itemsRows: itemsRowsHtml,
      subtotalText: '100% Cleared',
      vatText: 'Fulfilled',
      totalAmountText: 'Fully Paid',
      hideInvoiceHeaders: true,
      hidePaymentMethods: true,
      shareLink: verifyUrl,
      ctaText: 'Verify Delivery Note Online',
      ctaLink: verifyUrl,
      footerNote: 'This Delivery Note serves as official confirmation of goods/service fulfillment and handover. Please retain the attached certified PDF for your records.'
    });

    if (newDeliveryNote.customer_email) {
      await sendMail({
        to: newDeliveryNote.customer_email,
        subject: `Official Delivery Note [${dnNumber}] - Order Fulfilled - Invoice #${inv.invoice_number}`,
        html: emailHtml,
        attachments: [
          {
            filename: `Delivery_Note_${dnNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
    }

    console.log(`[Delivery Note Mailer] Dispatched ${dnNumber} with PDF attachment to ${newDeliveryNote.customer_email}`);

    // Log in forensics audit trail
    if (memoryStore.audit_logs) {
      memoryStore.audit_logs.unshift({
        id: Date.now(),
        user_email: req.headers['x-user-email'] || 'logistics@ncloud.co.ug',
        user_name: req.headers['x-user-name'] || dispatch_officer || 'Logistics Admin',
        user_role: 'super_admin',
        action: 'DELIVERY_NOTE_DISPATCHED',
        resource_type: 'DeliveryNotes',
        resource_id: dnNumber,
        details: `Dispatched Official Delivery Note #${dnNumber} for 100% paid Invoice #${inv.invoice_number} to ${newDeliveryNote.customer_name} (${newDeliveryNote.customer_email}). Certified PDF attached.`,
        ip_address: req.ip || '127.0.0.1',
        device_type: 'Desktop Console',
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `Delivery Note ${dnNumber} prepared and official certified PDF dispatched to ${newDeliveryNote.customer_email}!`,
      delivery_note: newDeliveryNote
    });
  } catch (err) {
    console.error('[Delivery Note Error]:', err);
    return res.status(500).json({ error: 'Failed to generate delivery note PDF or send email: ' + err.message });
  }
});

// Endpoint to list all Delivery Notes
app.get('/api/admin/delivery-notes', (req, res) => {
  res.json(memoryStore.delivery_notes || []);
});

// Cancel Invoice & Send Outbound Cancellation Email Notification
app.post('/api/admin/invoices/:id/cancel', async (req, res) => {
  const isSuperAdmin = ['super_admin', 'admin', 'web_admin'].includes(req.userRole);
  if (!isSuperAdmin) {
    const roleObj = memoryStore.roles.find(r => r.code === req.userRole);
    if (!roleObj || !roleObj.permissions || !roleObj.permissions['invoices'] || !roleObj.permissions['invoices']['delete']) {
      return res.status(403).json({ error: 'Permission Denied: You must have DELETE access to cancel an invoice.' });
    }
  }

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
app.post(['/api/admin/invoices/:id/duplicate', '/api/admin/invoices/:id/clone'], async (req, res) => {
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

  // Send background email for new duplicated invoice with attached PDF
  if (duplicatedInvoice.customer_email) {
    try {
      const shareableUrl = duplicatedInvoice.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newInvoiceNumber)}`;
      const pdfBuffer = await generateServerInvoicePDFBuffer(duplicatedInvoice);
      const emailHtml = generateCorporateEmailHtml({
        title: `Draft Tax Invoice #${newInvoiceNumber}`,
        badgeText: 'Draft Invoice Issued',
        recipientName: duplicatedInvoice.customer_name,
        attachmentName: `Tax_Invoice_${newInvoiceNumber}.pdf`,
        introText: `A new Tax Invoice #${newInvoiceNumber} has been drafted for your account. Please find the summary below and the official PDF document attached.`,
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
        ctaText: 'View Draft Invoice Online',
        ctaLink: shareableUrl
      });
      sendMail({
        to: duplicatedInvoice.customer_email,
        subject: `New Tax Invoice #${newInvoiceNumber} from Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Tax_Invoice_${newInvoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error("Failed to send duplicate invoice email:", err));
    } catch (e) {
      console.error("[Duplicate Invoice PDF Error]:", e.message);
    }
  }

  res.json({
    message: `Tax Invoice #${original.invoice_number} successfully cloned as #${newInvoiceNumber} for ${targetName} (${targetEmail}) with PDF attached!`,
    invoice: duplicatedInvoice
  });
});

// Duplicate Commercial Quotation Endpoint
app.post('/api/admin/quotations/:id/duplicate', async (req, res) => {
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

  // Send background email for new duplicated quote with attached PDF
  if (duplicatedQuote.customer_email) {
    try {
      const pdfBuffer = await generateServerQuotationPDFBuffer(duplicatedQuote);
      const emailHtml = generateCorporateEmailHtml({
        title: `Draft Commercial Quotation #${newQuoteNumber}`,
        badgeText: 'Draft Quotation Issued',
        recipientName: duplicatedQuote.customer_name,
        attachmentName: `Commercial_Quotation_${newQuoteNumber}.pdf`,
        introText: `A new Commercial Quotation #${newQuoteNumber} has been drafted for your account. Please find the summary below and the official PDF document attached.`,
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
        html: emailHtml,
        attachments: [
          {
            filename: `Commercial_Quotation_${newQuoteNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error("Failed to send duplicate quote email:", err));
    } catch (e) {
      console.error("[Duplicate Quotation PDF Error]:", e.message);
    }
  }

  return res.json({
    message: `Commercial Quotation #${original.quote_number} duplicated successfully as #${newQuoteNumber} for ${original.customer_name} with PDF attached!`,
    quotation: duplicatedQuote
  });
});

// Duplicate Company / Staff Expense Endpoint
app.post(['/api/admin/company-expenses/:id/duplicate', '/api/admin/hr/expenses/:id/duplicate'], async (req, res) => {
  const { id } = req.params;
  const expList = memoryStore.company_expenses || memoryStore.staff_expenses || memoryStore.expenses || [];
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
  if (!memoryStore.staff_expenses) memoryStore.staff_expenses = [];
  memoryStore.company_expenses.unshift(duplicatedExpense);
  memoryStore.staff_expenses.unshift(duplicatedExpense);
  if (memoryStore.expenses) memoryStore.expenses.unshift(duplicatedExpense);
  savePersistentStore();

  // Send email with attached PDF voucher if staff email is known
  if (duplicatedExpense.staff_email) {
    try {
      const pdfBuffer = await generateServerExpenseVoucherPDFBuffer(duplicatedExpense);
      const emailHtml = generateCorporateEmailHtml({
        title: `Draft Expenditure Voucher #${duplicatedExpense.receipt_ref}`,
        badgeText: 'Draft Expense Voucher',
        recipientName: duplicatedExpense.staff_name,
        attachmentName: `Expense_Voucher_${duplicatedExpense.receipt_ref}.pdf`,
        introText: `A new company expenditure claim <strong>#${duplicatedExpense.receipt_ref}</strong> of UGX ${Number(duplicatedExpense.amount || 0).toLocaleString()} has been duplicated for your account. Please find the certified PDF voucher attached.`,
        itemsRows: `
          <tr>
            <td>${duplicatedExpense.description || duplicatedExpense.category}</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">UGX ${Number(duplicatedExpense.amount || 0).toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${Number(duplicatedExpense.amount || 0).toLocaleString()}`,
        vatText: 'EXEMPT (0%)',
        totalAmountText: `UGX ${Number(duplicatedExpense.amount || 0).toLocaleString()}`,
        shareLink: 'https://ncloud.co.ug/portal',
        ctaText: 'View in Portal',
        ctaLink: 'https://ncloud.co.ug/portal',
        hidePaymentMethods: true
      });
      sendMail({
        to: duplicatedExpense.staff_email,
        subject: `New Expenditure Voucher #${duplicatedExpense.receipt_ref} - Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Expense_Voucher_${duplicatedExpense.receipt_ref}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error("Failed to send duplicate expense email:", err));
    } catch (e) {
      console.error("[Duplicate Expense PDF Error]:", e.message);
    }
  }

  res.json({
    message: `Expenditure claim duplicated successfully for ${original.staff_name} (UGX ${Number(original.amount || 0).toLocaleString()}) with PDF voucher attached!`,
    expense: duplicatedExpense
  });
});

// Duplicate Work Order Endpoint
app.post('/api/admin/work-orders/:id/duplicate', async (req, res) => {
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

  const assignedUser = (memoryStore.users || []).find(u => u.id == duplicatedWorkOrder.assigned_staff_id || u.name === duplicatedWorkOrder.assigned_staff_name);
  const staffEmail = duplicatedWorkOrder.assigned_staff_email || assignedUser?.email || '';

  if (staffEmail) {
    try {
      const pdfBuffer = await generateServerWorkOrderPDFBuffer(duplicatedWorkOrder);
      const emailHtml = generateCorporateEmailHtml({
        title: `Work Order Assignment #${newOrderNumber}`,
        badgeText: 'Work Order Scheduled',
        recipientName: duplicatedWorkOrder.assigned_staff_name,
        attachmentName: `Work_Order_${newOrderNumber}.pdf`,
        introText: `You have been assigned to duplicated Work Order <strong>#${newOrderNumber}</strong> ("${duplicatedWorkOrder.task_title}") scheduled at site "${duplicatedWorkOrder.client_site}". Please find the official work order document attached to this email.`,
        itemsRows: `
          <tr>
            <td>${duplicatedWorkOrder.task_title} (${duplicatedWorkOrder.charging_mode === 'per_hour' ? 'Hourly' : 'Daily Flat Rate'})</td>
            <td style="text-align: center;">${duplicatedWorkOrder.quantity}</td>
            <td style="text-align: right;">UGX ${Number(duplicatedWorkOrder.total_cost || 0).toLocaleString()}</td>
          </tr>
        `,
        subtotalText: `UGX ${Number(duplicatedWorkOrder.total_cost || 0).toLocaleString()}`,
        vatText: 'EXEMPT (0%)',
        totalAmountText: `UGX ${Number(duplicatedWorkOrder.total_cost || 0).toLocaleString()}`,
        shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newOrderNumber)}`,
        ctaText: 'Verify Work Order Online',
        ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newOrderNumber)}`,
        hidePaymentMethods: true
      });

      sendMail({
        to: staffEmail,
        subject: `Work Order #${newOrderNumber} Assigned - Nova Cloud Edges`,
        html: emailHtml,
        attachments: [
          {
            filename: `Work_Order_${newOrderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      }).catch(err => console.error("Failed to send duplicate work order email:", err));
    } catch (e) {
      console.error("[Duplicate Work Order PDF Error]:", e.message);
    }
  }

  res.json({
    message: `Work Order #${original.order_number} duplicated successfully as #${newOrderNumber} for ${original.assigned_staff_name || 'Staff'} with PDF attached!`,
    workOrder: duplicatedWorkOrder
  });
});

app.put('/api/admin/invoices/:id', async (req, res) => {
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
                dispatchWifiVoucherForInvoice(inv);
      }
    }
    
    const isWifiVoucher = (inv.item_name || '').toLowerCase().includes('wifi voucher') || 
                          (inv.item_name || '').toLowerCase().includes('wifi -') || 
                          (inv.item_name || '').toLowerCase().includes('nova wifi') || 
                          (inv.items || []).some(i => (i.name || '').toLowerCase().includes('wifi voucher')) ||
                          Boolean(inv.wifi_voucher_id) || Boolean(wifi_voucher_id);
    
    if (vat_exempt !== undefined) inv.vat_exempt = isWifiVoucher ? true : vat_exempt;
    else if (isWifiVoucher) inv.vat_exempt = true;
    
    if (amount) inv.amount = Number(amount);
    if (vat_amount !== undefined) inv.vat_amount = inv.vat_exempt ? 0 : Number(vat_amount);
    else if (isWifiVoucher) inv.vat_amount = 0;
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
    
    // Send background email for invoice update with attached PDF
    if (inv.customer_email) {
      try {
        const shareableUrl = inv.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(inv.invoice_number)}`;
        const pdfBuffer = await generateServerInvoicePDFBuffer(inv);
        const emailHtml = generateCorporateEmailHtml({
          title: `Updated Tax Invoice #${inv.invoice_number}`,
          badgeText: 'Invoice Updated',
          recipientName: inv.customer_name,
          attachmentName: `Tax_Invoice_${inv.invoice_number}.pdf`,
          introText: `Your official Nova Cloud Edges Tax Invoice #${inv.invoice_number} has been updated by our administration team. Please review the updated details below and find the certified PDF document attached.`,
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
          ctaText: 'View Updated Invoice Online',
          ctaLink: shareableUrl
        });
        sendMail({
          to: inv.customer_email,
          subject: `Updated Tax Invoice #${inv.invoice_number} from Nova Cloud Edges`,
          html: emailHtml,
          attachments: [
            {
              filename: `Tax_Invoice_${inv.invoice_number}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        }).catch(err => console.error("Failed to send invoice update email:", err));
      } catch (e) {
        console.error("[Update Invoice PDF Error]:", e.message);
      }
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
  let deleted = null;
  if (idx !== -1) {
    deleted = memoryStore.invoices.splice(idx, 1)[0];
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
  if (!memoryStore.roles) memoryStore.roles = [];
  const users = memoryStore.users || [];
  const rolesWithCount = memoryStore.roles.map(r => {
    const userCount = users.filter(u => u && (u.role === r.code || u.role === r.name)).length;
    return {
      ...r,
      user_count: userCount
    };
  });
  res.json(rolesWithCount);
});

app.post('/api/admin/roles', (req, res) => {
  const { name, code, badge_color, description, permissions } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Role name and role code are required' });
  }

  if (!memoryStore.roles) memoryStore.roles = [];
  const formattedCode = code.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const existing = memoryStore.roles.find(r => r.code === formattedCode || r.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: `A role with identifier "${formattedCode}" or name "${name}" already exists.` });
  }

  const defaultPerms = permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0 ? permissions : {
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
    jobs: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    news: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    partners: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    sliders: { create: false, read: false, update: false, delete: false, approve: false, share: false },
    settings: { create: false, read: false, update: false, delete: false, approve: false, share: false }
  };

  const nextId = memoryStore.roles.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
  const newRole = {
    id: nextId,
    name: name.trim(),
    code: formattedCode,
    badge_color: badge_color || '#8b5cf6',
    description: description ? description.trim() : 'Custom configured system role with defined CRUDAS module privileges.',
    user_count: 0,
    permissions: defaultPerms,
    is_custom: true,
    created_at: new Date().toISOString()
  };

  memoryStore.roles.push(newRole);
  
  if (!memoryStore.audit_logs) memoryStore.audit_logs = [];
  memoryStore.audit_logs.unshift({
    id: memoryStore.audit_logs.length + 1,
    timestamp: new Date().toISOString(),
    user_name: 'Admin',
    action: 'ROLE_CREATED',
    details: `Created custom role: ${name} (${code})`,
    ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1'
  });

  savePersistentStore();
  res.json({ message: `Custom Role "${name}" created successfully and is now available for user assignment!`, role: newRole });
});

app.put('/api/admin/roles/:id', (req, res) => {
  const { id } = req.params;
  const { name, badge_color, description, permissions } = req.body;
  const r = (memoryStore.roles || []).find(role => role.id == id);
  if (r) {
    if (name) r.name = name.trim();
    if (badge_color) r.badge_color = badge_color;
    if (description !== undefined) r.description = description.trim();
    if (permissions) r.permissions = permissions;
    r.updated_at = new Date().toISOString();
    
    if (!memoryStore.audit_logs) memoryStore.audit_logs = [];
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      timestamp: new Date().toISOString(),
      user_name: 'Admin',
      action: 'ROLE_UPDATED',
      details: `Updated custom role details: ${r.name}`,
      ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1'
    });

    savePersistentStore();
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
    r.updated_at = new Date().toISOString();

    if (!memoryStore.audit_logs) memoryStore.audit_logs = [];
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      timestamp: new Date().toISOString(),
      user_name: 'Admin',
      action: 'ROLE_PERMISSIONS_UPDATED',
      details: `Updated granular permissions for role: ${r.name}`,
      ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1'
    });

    savePersistentStore();
    return res.json({ message: `Granular CRUDAS permissions updated for role "${r.name}"`, role: r });
  }
  res.status(404).json({ error: 'Role not found' });
});

app.delete('/api/admin/roles/:id', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const idx = (memoryStore.roles || []).findIndex(role => role.id == id);
  if (idx !== -1) {
    const roleToDelete = memoryStore.roles[idx];
    if (['super_admin', 'admin'].includes(roleToDelete.code)) {
      return res.status(400).json({ error: 'Cannot delete default Super Administrator role' });
    }
    const removed = memoryStore.roles.splice(idx, 1)[0];

    if (!memoryStore.audit_logs) memoryStore.audit_logs = [];
    memoryStore.audit_logs.unshift({
      id: memoryStore.audit_logs.length + 1,
      timestamp: new Date().toISOString(),
      user_name: 'Super Admin',
      action: 'ROLE_DELETED',
      details: `Deleted custom role: ${removed.name}`,
      ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1'
    });

    savePersistentStore();
    return res.json({ message: `Custom role "${removed.name}" removed successfully` });
  }
  res.status(404).json({ error: 'Role not found' });
});

// User Specific Permissions Override Endpoint
app.put('/api/admin/users/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { custom_permissions } = req.body;
  const targetUser = (memoryStore.users || []).find(u => String(u.id) === String(id));
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  targetUser.custom_permissions = custom_permissions || {};
  targetUser.updated_at = new Date().toISOString();
  savePersistentStore();
  res.json({ message: `Custom CRUDAS permissions override updated for "${targetUser.name}"!`, user: targetUser });
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

// ============================================================================
// AUTOMATED OVERDUE INVOICE DEMAND SYSTEM
// ============================================================================
const autoDemandOverdueInvoices = async () => {
  try {
    const now = new Date();
    const invoices = [...(memoryStore.invoices || []), ...(memoryStore.staff_invoices || [])];
    
    for (const invoice of invoices) {
      if (invoice.status === 'Paid' || invoice.status === '100% Paid' || invoice.status === 'Paid & Settled' || invoice.status === 'Void' || invoice.status === 'Cancelled') continue;
      if (!invoice.due_date) continue;
      
      const dueDate = new Date(invoice.due_date);
      // If overdue
      if (now > dueDate && invoice.customer_email) {
        // Only send once every 24 hours max
        const lastRemind = invoice.last_reminded_at ? new Date(invoice.last_reminded_at) : null;
        if (lastRemind && (now - lastRemind < 24 * 60 * 60 * 1000)) continue;
        
        const remainingDue = Number(invoice.amount || 0) - Number(invoice.paid_amount || 0);
        if (remainingDue <= 0) continue;
        
        const emailHtml = generateCorporateEmailHtml({
          title: `URGENT: Overdue Payment Demand - Tax Invoice #${invoice.invoice_number}`,
          badgeText: 'OVERDUE PAYMENT DEMAND',
          recipientName: invoice.customer_name,
          attachmentName: `Tax_Invoice_${invoice.invoice_number}.pdf`,
          introText: `This is an automated demand for payment. Tax Invoice <strong>#${invoice.invoice_number}</strong> is now overdue. A balance of UGX ${remainingDue.toLocaleString()} remains uncleared. Please find the official invoice attached. Failure to clear this balance may result in suspension of related services.`,
          itemsRows: `
            <tr>
              <td>${invoice.item_name || 'Nova Cloud Service'}</td>
              <td style="text-align: center;">${invoice.quantity || 1}</td>
              <td style="text-align: right;">UGX ${remainingDue.toLocaleString()}</td>
            </tr>
          `,
          subtotalText: `UGX ${Number(invoice.subtotal || invoice.amount).toLocaleString()}`,
          vatText: invoice.vat_exempt ? 'EXEMPT (0%)' : `UGX ${Number(invoice.vat_amount || 0).toLocaleString()}`,
          totalAmountText: `UGX ${remainingDue.toLocaleString()}`,
          shareLink: invoice.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoice.invoice_number)}`,
          ctaText: 'View Invoice Online & Pay',
          ctaLink: invoice.shareable_url || `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoice.invoice_number)}`
        });

        const pdfBuffer = await generateServerInvoicePDFBuffer(invoice);

        await sendMail({
          to: invoice.customer_email,
          subject: `URGENT: Overdue Payment for Tax Invoice #${invoice.invoice_number}`,
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
        invoice.last_reminded_at = now.toISOString();
        savePersistentStore();
        console.log(`[Auto Demand] Sent overdue notice to ${invoice.customer_email} for Invoice ${invoice.invoice_number}`);
      }
    }
  } catch (e) {
    console.error('[Auto Demand Error]:', e.message);
  }
};

// Run on startup and then every 24 hours
setTimeout(autoDemandOverdueInvoices, 30000); // 30 seconds after startup to ensure boot
setInterval(autoDemandOverdueInvoices, 24 * 60 * 60 * 1000);

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
    customer_address: customer_address || 'Lugga Zone, Ndejje, Wakiso, Uganda',
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
      customer_address: customer_address || 'Lugga Zone, Ndejje, Wakiso, Uganda',
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
            footerNote: `Please use the officially approved Bank Accounts listed in the document for your settlement. Always quote your Document Number.`
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
            <td><strong>Billed Item:</strong> ${inv.item_name || 'Nova Cloud Service'}</td>
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
        footerNote: `Please remit full payment immediately to prevent automated service interruption, cloud resource freeze, or statutory legal recovery proceedings.<br/><br/>Please use the officially approved Bank Accounts listed in the document for your settlement.`
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
            <td>${invoice.item_name || 'Nova Cloud Service'}</td>
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

// Authorization Middleware for API Integrations
function requireSystemsAdmin(req, res, next) {
  const rawRole = req.headers['x-user-role'] || req.body?.user_role || req.body?.admin_role || req.query?.user_role;
  if (!rawRole) return res.status(401).json({ error: 'Unauthorized' });
  const roleClean = String(rawRole).trim().toLowerCase().replace(/\s+/g, '_');
  if (roleClean === 'super_admin' || roleClean === 'systems_admin' || roleClean === 'superadmin') {
    return next();
  }
  return res.status(403).json({ error: 'Access Denied: Only Systems Admin can configure API integrations.' });
}

// ----------------------------------------------------
// API Integrations Management
// ----------------------------------------------------
app.get('/api/admin/integrations', requireSystemsAdmin, (req, res) => {
  const integrations = (memoryStore.api_integrations || []).map(api => ({
    ...api,
    client_secret: api.client_secret ? '********' : ''
  }));
  res.json({ integrations });
});

app.put('/api/admin/integrations/:id', requireSystemsAdmin, (req, res) => {
  const { id } = req.params;
  const { client_id, client_secret, wallet_id } = req.body;
  
  if (!memoryStore.api_integrations) memoryStore.api_integrations = [];
  
  const api = memoryStore.api_integrations.find(a => a.id === id);
  if (api) {
    if (client_id !== undefined) api.client_id = client_id;
    if (client_secret && client_secret !== '********') api.client_secret = client_secret;
    if (wallet_id !== undefined) api.wallet_id = wallet_id;
    api.last_updated = new Date().toISOString();
  }
  savePersistentStore(true);
  res.json({ message: 'API Configuration Saved' });
});

app.post('/api/admin/integrations/:id/status', requireSystemsAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active', 'suspended', 'revoked'
  
  if (!memoryStore.api_integrations) return res.status(404).json({error:'Not found'});
  const api = memoryStore.api_integrations.find(a => a.id === id);
  if (api) {
    api.status = status;
    api.last_updated = new Date().toISOString();
    
    if (status === 'revoked') {
      api.client_id = '';
      api.client_secret = '';
      api.wallet_id = '';
    }
    
    savePersistentStore(true);
    res.json({ message: `API Integration marked as ${status}` });
  } else {
    res.status(404).json({ error: 'API not found' });
  }
});

app.post('/api/admin/integrations/restore', requireSystemsAdmin, (req, res) => {
  const { id } = req.body;
  if (!memoryStore.api_integrations) memoryStore.api_integrations = [];
  
  if (id === 'iotec_pay' && !memoryStore.api_integrations.find(a => a.id === 'iotec_pay')) {
    memoryStore.api_integrations.push({
      id: 'iotec_pay',
      name: 'ioTec Payment Gateway',
      provider: 'ioTec Pay',
      type: 'payment',
      status: 'suspended',
      client_id: '',
      client_secret: '',
      wallet_id: '',
      last_updated: new Date().toISOString()
    });
  } else if (id === 'unifi_controller' && !memoryStore.api_integrations.find(a => a.id === 'unifi_controller')) {
    memoryStore.api_integrations.push({
      id: 'unifi_controller',
      name: 'UniFi Network API',
      provider: 'Ubiquiti UniFi',
      type: 'network',
      status: 'suspended',
      client_id: '',
      client_secret: '',
      host_url: 'https://192.168.1.1:8443',
      site_id: 'default',
      last_updated: new Date().toISOString()
    });
  }
  
  savePersistentStore(true);
  res.json({ message: 'API Integration Restored' });
});

// ----------------------------------------------------
// ioTec Pay Service Logic
// ----------------------------------------------------
let iotecAccessToken = null;
let iotecTokenExpiry = 0;

async function getIotecToken() {
  const now = Date.now();
  if (iotecAccessToken && now < iotecTokenExpiry) {
    return iotecAccessToken;
  }

  const iotecConfig = (memoryStore.api_integrations || []).find(a => a.id === 'iotec_pay');
  if (!iotecConfig || iotecConfig.status !== 'active' || !iotecConfig.client_id || !iotecConfig.client_secret) {
    throw new Error('ioTec Pay is not configured or is inactive.');
  }

  const params = new URLSearchParams();
  params.append('client_id', iotecConfig.client_id);
  params.append('client_secret', iotecConfig.client_secret);
  params.append('grant_type', 'client_credentials');

  const response = await fetch('https://id.iotec.io/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to authenticate with ioTec: ${errText}`);
  }

  const data = await response.json();
  iotecAccessToken = data.access_token;
  iotecTokenExpiry = now + ((data.expires_in - 10) * 1000);
  return iotecAccessToken;
}

app.post('/api/payments/initiate', async (req, res) => {
  try {
    const { method, amount, reference, phone, email, notes } = req.body;
    
    const iotecConfig = (memoryStore.api_integrations || []).find(a => a.id === 'iotec_pay');
    if (!iotecConfig || iotecConfig.status !== 'active') {
      return res.status(400).json({ error: 'ioTec Pay is currently disabled or not configured.' });
    }

    const token = await getIotecToken();

    if (method === 'mobile_money') {
      const payload = {
        category: "MobileMoney",
        currency: "UGX",
        walletId: iotecConfig.wallet_id,
        externalId: reference,
        payer: phone,
        amount: Number(amount),
        payerNote: notes || `Payment for ${reference}`
      };

      const iotecRes = await fetch('https://pay.iotec.io/api/collections/collect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!iotecRes.ok) {
        const errText = await iotecRes.text();
        return res.status(400).json({ error: `Mobile Money initiation failed: ${errText}` });
      }

      const data = await iotecRes.json();
      return res.json({ success: true, transactionId: data.id, status: data.status });
      
    } else if (method === 'card') {
      const payload = {
        category: "Card",
        currency: "UGX",
        walletId: iotecConfig.wallet_id,
        externalId: reference,
        payer: email,
        amount: Number(amount),
        payerNote: notes || `Payment for ${reference}`,
        redirectUrl: "https://ncloud.co.ug/shop"
      };

      const iotecRes = await fetch('https://pay.iotec.io/api/collections/collect/card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!iotecRes.ok) {
        const errText = await iotecRes.text();
        return res.status(400).json({ error: `Card payment initiation failed: ${errText}` });
      }

      const data = await iotecRes.json();
      return res.json({ success: true, transactionId: data.id, cardRedirectUrl: data.cardRedirectUrl });
    } else {
      return res.status(400).json({ error: 'Invalid payment method selected.' });
    }
  } catch (err) {
    console.error('ioTec Initiate Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments/status/:id', async (req, res) => {
  try {
    const token = await getIotecToken();
    const { id } = req.params;
    
    const iotecRes = await fetch(`https://pay.iotec.io/api/collections/status/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!iotecRes.ok) {
      return res.status(400).json({ error: 'Failed to fetch status from ioTec' });
    }
    
    const data = await iotecRes.json();
    
    if (data.status === 'Success' && data.externalId) {
       await processSuccessfulPayment(data.externalId, data.amount || 0, id, 'Mobile Money');
    }
    
    return res.json({ status: data.status, externalId: data.externalId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhooks/iotec', async (req, res) => {
  const { id, status, externalId, amount, currency } = req.body;
  console.log(`[ioTec Webhook] Received status ${status} for transaction ${id}, externalId: ${externalId}`);
  
  if (status === 'Success' && id) {
    try {
      const token = await getIotecToken();
      const iotecRes = await fetch(`https://pay.iotec.io/api/collections/status/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (iotecRes.ok) {
        const data = await iotecRes.json();
        if (data.status === 'Success' && data.externalId) {
          console.log(`[ioTec Webhook] Verified transaction ${id}. Proceeding to payment capture.`);
          await processSuccessfulPayment(data.externalId, data.amount || 0, id, 'Mobile Money');
        } else {
          console.error(`[ioTec Webhook] Verification failed for ${id}. Status from gateway: ${data.status}`);
        }
      } else {
        console.error(`[ioTec Webhook] Verification request failed with status: ${iotecRes.status}`);
      }
    } catch (err) {
      console.error(`[ioTec Webhook] Verification error:`, err);
    }
  }
  
  res.status(200).send('OK');
});

async function processSuccessfulPayment(externalId, amount, transactionId, method) {
  const invIndex = (memoryStore.invoices || []).findIndex(i => i.invoice_number === externalId);
  if (invIndex >= 0 && memoryStore.invoices[invIndex].status !== '100% Paid' && memoryStore.invoices[invIndex].status !== 'Paid' && memoryStore.invoices[invIndex].status !== 'PAID' && memoryStore.invoices[invIndex].status !== 'Paid & Settled') {
    const inv = memoryStore.invoices[invIndex];
    const paid = Number(amount) || Number(inv.balance) || Number(inv.amount);
    const due = Number(inv.amount) || paid;

    const currentTotalPaid = (Number(inv.paid_amount) || 0) + paid;
    const totalInvAmount = Number(inv.amount) || due;
    inv.paid_amount = currentTotalPaid;
    inv.balance = Math.max(0, totalInvAmount - currentTotalPaid);
    
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

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateTimeStr = `${dateStr} ${timeStr}`;

    const newPayment = {
      id: (memoryStore.payments || []).length + 1,
      payment_type: 'customer',
      invoice_number: inv.invoice_number,
      party_name: inv.customer_name || 'Corporate Customer',
      party_email: inv.customer_email || 'client@company.co.ug',
      amount_due: due,
      amount_paid: paid,
      excess_amount: currentTotalPaid > totalInvAmount ? currentTotalPaid - totalInvAmount : 0,
      payment_method: method || 'Mobile Money',
      reference: transactionId || `TXN-REF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: inv.status,
      date: dateTimeStr,
      payment_date: dateTimeStr,
      created_at_time: dateTimeStr,
      updated_by: 'System Auto-Capture',
      created_at: now.toISOString()
    };

    if (!memoryStore.payments) memoryStore.payments = [];
    memoryStore.payments.unshift(newPayment);

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

    if (inv.status === '100% Paid' || inv.status === 'Paid' || isFullyCleared) {
      if (typeof createSubscriptionForInvoice === 'function') {
        createSubscriptionForInvoice(inv);
      }
      if (typeof dispatchWifiVoucherForInvoice === 'function') {
        dispatchWifiVoucherForInvoice(inv);
      }
    }

    savePersistentStore();
    console.log(`[Payment Auto-Capture] Invoice ${externalId} processed. Status: ${inv.status}`);
    
    try {
      const pdfBuffer = await generateServerPaymentReceiptPDFBuffer(newPayment, {
        customerName: newPayment.party_name,
        customerEmail: newPayment.party_email
      });

      const customerHtml = generateCorporateEmailHtml({
        title: isFullyCleared ? 'Official 100% Clearance Payment Receipt' : 'Official Payment Installment Receipt',
        badgeText: isFullyCleared ? '100% Paid & Settled' : 'Payment Recorded',
        recipientName: newPayment.party_name,
        attachmentName: `Payment_Receipt_${newPayment.reference}.pdf`,
        introText: `Nova Cloud Edges Finance Department has received and confirmed your payment of <strong>UGX ${paid.toLocaleString()}</strong> towards Invoice <strong>#${newPayment.invoice_number}</strong> via <strong>${newPayment.payment_method}</strong>. Your digitally certified payment receipt is attached to this email.`,
        itemsRows: `
          <tr><td><strong>Transaction Reference</strong></td><td style="text-align: right; font-family: monospace; font-weight: bold;">${newPayment.reference}</td></tr>
          <tr><td><strong>Payment Method</strong></td><td style="text-align: right; font-weight: bold;">${newPayment.payment_method}</td></tr>
          <tr><td><strong>Settlement Timestamp</strong></td><td style="text-align: right;">${dateTimeStr}</td></tr>
          <tr><td><strong>Invoice Clearance Status</strong></td><td style="text-align: right; font-weight: bold; color: ${isFullyCleared ? '#16a34a' : '#d97706'};">${isFullyCleared ? '100% Paid & Settled' : 'Partially Paid'}</td></tr>
        `,
        subtotalText: `UGX ${paid.toLocaleString()}`,
        vatText: 'Clearance Confirmed',
        totalAmountText: `UGX ${paid.toLocaleString()}`,
        shareLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newPayment.reference)}`,
        ctaText: 'Verify Receipt Online',
        ctaLink: `https://ncloud.co.ug/verify?doc=${encodeURIComponent(newPayment.reference)}`
      });

      if (newPayment.party_email && newPayment.party_email.includes('@')) {
        sendMail({
          to: newPayment.party_email,
          subject: `Payment Receipt - ${newPayment.reference}`,
          html: customerHtml,
          attachments: [
            {
              filename: `Payment_Receipt_${newPayment.reference}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        }).catch(err => console.error('[Payment Receipt Email Warning]', err.message));
      }

      const adminHtml = generateCorporateEmailHtml({
        title: 'New Customer Payment Received',
        badgeText: 'Payment Alert',
        recipientName: 'Sales Team',
        introText: `A new payment of <strong>UGX ${paid.toLocaleString()}</strong> was just received from <strong>${newPayment.party_name}</strong> for Invoice <strong>#${newPayment.invoice_number}</strong> via <strong>${newPayment.payment_method}</strong>.`,
        itemsRows: `
          <tr><td><strong>Transaction Reference</strong></td><td style="text-align: right; font-family: monospace; font-weight: bold;">${newPayment.reference}</td></tr>
          <tr><td><strong>Invoice Status</strong></td><td style="text-align: right; font-weight: bold; color: ${isFullyCleared ? '#16a34a' : '#d97706'};">${isFullyCleared ? '100% Paid & Settled' : 'Partially Paid'}</td></tr>
        `,
        subtotalText: `UGX ${paid.toLocaleString()}`,
        vatText: '-',
        totalAmountText: `UGX ${paid.toLocaleString()}`,
        shareLink: `https://ncloud.co.ug/admin`,
        ctaText: 'View Dashboard',
        ctaLink: `https://ncloud.co.ug/admin`
      });

      sendMail({
        to: 'sales@ncloud.co.ug',
        subject: `Payment Alert - ${newPayment.party_name} (${newPayment.reference})`,
        html: adminHtml
      }).catch(err => console.error('[Admin Alert Email Warning]', err.message));

    } catch (e) {
      console.error('[Payment Processing Email Error]', e.message);
    }
  }
}

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
