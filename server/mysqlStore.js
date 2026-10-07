import { pool } from './db.js';

export const DEFAULT_CORP_BANK_ACCOUNTS = [];

// Safe JSON parser for columns that store JSON in MySQL
function parseJsonSafe(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function safeJson(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
}

function parseDateOnly(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function safeIsoDate(val, fallback = null) {
  if (!val) return fallback || new Date().toISOString();
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback || new Date().toISOString();
    return d.toISOString();
  } catch {
    return fallback || new Date().toISOString();
  }
}

/**
 * Loads ALL 27 tables and system settings directly from MySQL.
 * Returns a consolidated store object matching memoryStore structure.
 */
export async function loadFullStoreFromMysql() {
  try {
    const store = {
      users: [],
      roles: [],
      services: [],
      product_categories: [],
      products: [],
      invoices: [],
      payments: [],
      subscriptions: [],
      quotations: [],
      work_orders: [],
      delivery_notes: [],
      staff_expenses: [],
      expense_categories: [],
      customer_credits: [],
      bank_accounts: [],
      unifi_vouchers: [],
      audit_logs: [],
      jobs: [],
      job_applications: [],
      email_dispatches: [],
      schedules: [],
      partners: [],
      team: [],
      sliders: [],
      news: [],
      contacts: [],
      events: [],
      smtp_settings: {},
      topbar_settings: {},
      security_settings: {},
      notification_emails: {},
      paid_stamp: {},
      site_logo: '',
      site_favicon: '',
      announcement: {},
      banner_settings: {},
      api_integrations: []
    };

    // 1. Roles
    try {
      const [roles] = await pool.query('SELECT * FROM roles ORDER BY id ASC');
      store.roles = roles.map(r => ({ ...r, permissions: parseJsonSafe(r.permissions, {}) }));
    } catch (e) {
      console.warn('[MySQL Store] Roles query note:', e.message);
    }

    // Ensure security columns exist in users table
    try {
      await pool.query('ALTER TABLE users ADD COLUMN mfa_enabled TINYINT(1) DEFAULT 0');
    } catch {}
    try {
      await pool.query('ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255) NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE users ADD COLUMN password_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    } catch {}
    try {
      await pool.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE users ADD COLUMN reset_expires DATETIME NULL');
    } catch {}

    // 2. Users
    try {
      const [users] = await pool.query('SELECT * FROM users ORDER BY id ASC');
      store.users = users.map(u => ({
        ...u,
        passwordHash: u.password_hash,
        is_verified: Boolean(u.is_verified),
        mfa_enabled: Boolean(u.mfa_enabled),
        mfa_secret: u.mfa_secret || null,
        reset_token: u.reset_token || null,
        reset_expires: u.reset_expires ? new Date(u.reset_expires).toISOString() : null,
        password_updated_at: safeIsoDate(u.password_updated_at, safeIsoDate(u.created_at, new Date().toISOString()))
      }));
    } catch (e) {
      console.warn('[MySQL Store] Users query note:', e.message);
    }

    // 3. Services
    try {
      const [services] = await pool.query('SELECT * FROM services ORDER BY id ASC');
      store.services = services.map(s => ({
        ...s,
        features: parseJsonSafe(s.features, []),
        is_active: Boolean(s.is_active)
      }));
    } catch (e) {
      console.warn('[MySQL Store] Services query note:', e.message);
    }

    // 4. Product Categories
    try {
      const [cats] = await pool.query('SELECT * FROM product_categories ORDER BY id ASC');
      store.product_categories = cats;
    } catch (e) {
      console.warn('[MySQL Store] Product categories query note:', e.message);
    }

    // 5. Products
    try {
      const [products] = await pool.query('SELECT * FROM products ORDER BY id ASC');
      store.products = products.map(p => ({
        ...p,
        specs: parseJsonSafe(p.specs, {}),
        details: parseJsonSafe(p.details, {}),
        is_hidden: Boolean(p.is_hidden)
      }));
    } catch (e) {
      console.warn('[MySQL Store] Products query note:', e.message);
    }

    // 6. Invoices
    try {
      const [invoices] = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
      store.invoices = invoices.map(i => ({
        ...i,
        items: parseJsonSafe(i.items, []),
        include_vat: Boolean(i.include_vat),
        vat_exempt: Boolean(i.vat_exempt)
      }));
    } catch (e) {
      console.warn('[MySQL Store] Invoices query note:', e.message);
    }

    // 7. Payments
    try {
      const [payments] = await pool.query('SELECT * FROM payments ORDER BY id DESC');
      store.payments = payments;
    } catch (e) {
      console.warn('[MySQL Store] Payments query note:', e.message);
    }

    // 8. Subscriptions
    try {
      const [subs] = await pool.query('SELECT * FROM subscriptions ORDER BY id DESC');
      store.subscriptions = subs.map(s => ({
        ...s,
        reminders_sent: parseJsonSafe(s.reminders_sent, [])
      }));
    } catch (e) {
      console.warn('[MySQL Store] Subscriptions query note:', e.message);
    }

    // 9. Quotations
    try {
      const [quotes] = await pool.query('SELECT * FROM quotations ORDER BY id DESC');
      store.quotations = quotes.map(q => ({
        ...q,
        items: parseJsonSafe(q.items, []),
        vat_exempt: Boolean(q.vat_exempt)
      }));
    } catch (e) {
      console.warn('[MySQL Store] Quotations query note:', e.message);
    }

    // 10. Work Orders
    try {
      const [wo] = await pool.query('SELECT * FROM work_orders ORDER BY id DESC');
      store.work_orders = wo;
    } catch (e) {
      console.warn('[MySQL Store] Work orders query note:', e.message);
    }

    // 11. Delivery Notes
    try {
      const [dn] = await pool.query('SELECT * FROM delivery_notes ORDER BY id DESC');
      store.delivery_notes = dn.map(d => ({
        ...d,
        items: parseJsonSafe(d.items, [])
      }));
    } catch (e) {
      console.warn('[MySQL Store] Delivery notes query note:', e.message);
    }

    // 12. Staff Expenses
    try {
      const [exp] = await pool.query('SELECT * FROM staff_expenses ORDER BY id DESC');
      store.staff_expenses = exp;
    } catch (e) {
      console.warn('[MySQL Store] Staff expenses query note:', e.message);
    }

    // 13. Expense Categories
    try {
      const [ec] = await pool.query('SELECT * FROM expense_categories ORDER BY id ASC');
      store.expense_categories = ec;
    } catch (e) {
      console.warn('[MySQL Store] Expense categories query note:', e.message);
    }

    // 14. Customer Credits
    try {
      const [credits] = await pool.query('SELECT * FROM customer_credits ORDER BY id ASC');
      store.customer_credits = credits.map(c => ({
        ...c,
        history: parseJsonSafe(c.history, [])
      }));
    } catch (e) {
      console.warn('[MySQL Store] Customer credits query note:', e.message);
    }

    // 15. Bank Accounts
    try {
      let [ba] = await pool.query('SELECT * FROM bank_accounts ORDER BY id ASC');
      store.bank_accounts = (ba || []).map(b => ({ ...b, is_primary: Boolean(b.is_primary) }));
    } catch (e) {
      console.warn('[MySQL Store] Bank accounts query note:', e.message);
    }

    // 16. UniFi Vouchers
    try {
      const [vouchers] = await pool.query('SELECT * FROM unifi_vouchers ORDER BY id DESC');
      store.unifi_vouchers = vouchers;
    } catch (e) {
      console.warn('[MySQL Store] UniFi vouchers query note:', e.message);
    }

    // 17. Audit Logs
    try {
      const [logs] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 500');
      store.audit_logs = logs.map(l => ({
        ...l,
        details: typeof l.details === 'string' ? l.details : (l.details ? JSON.stringify(l.details) : '')
      }));
    } catch (e) {
      console.warn('[MySQL Store] Audit logs query note:', e.message);
    }

    // 18. Jobs
    try {
      const [jobs] = await pool.query('SELECT * FROM jobs ORDER BY id ASC');
      store.jobs = jobs.map(j => ({
        ...j,
        requirements: parseJsonSafe(j.requirements, []),
        responsibilities: parseJsonSafe(j.responsibilities, [])
      }));
    } catch (e) {
      console.warn('[MySQL Store] Jobs query note:', e.message);
    }

    // 19. Job Applications
    try {
      const [apps] = await pool.query('SELECT * FROM job_applications ORDER BY id DESC');
      store.job_applications = apps;
    } catch (e) {
      console.warn('[MySQL Store] Job applications query note:', e.message);
    }

    // 20. Email Dispatches
    try {
      const [ed] = await pool.query('SELECT * FROM email_dispatches ORDER BY id DESC');
      store.email_dispatches = ed;
    } catch (e) {
      console.warn('[MySQL Store] Email dispatches query note:', e.message);
    }

    // 21. Schedules
    try {
      const [schedules] = await pool.query('SELECT * FROM schedules ORDER BY id ASC');
      store.schedules = schedules.map(s => ({ ...s, enabled: Boolean(s.enabled) }));
    } catch (e) {
      console.warn('[MySQL Store] Schedules query note:', e.message);
    }

    // 22. Partners
    try {
      const [partners] = await pool.query('SELECT * FROM partners ORDER BY id ASC');
      store.partners = partners.map(p => ({ ...p, logo: p.logo_url, logoText: p.logo_text }));
    } catch (e) {
      console.warn('[MySQL Store] Partners query note:', e.message);
    }

    // 23. Team
    try {
      const [team] = await pool.query('SELECT * FROM team ORDER BY id ASC');
      store.team = team;
    } catch (e) {
      console.warn('[MySQL Store] Team query note:', e.message);
    }

    // 24. Sliders (Self-healing migration for columns and default slides)
    try {
      await pool.query('ALTER TABLE sliders ADD COLUMN btn1_text VARCHAR(100) DEFAULT "Explore Services"');
    } catch {}
    try {
      await pool.query('ALTER TABLE sliders ADD COLUMN btn1_link VARCHAR(255) DEFAULT "services"');
    } catch {}
    try {
      await pool.query('ALTER TABLE sliders ADD COLUMN btn2_text VARCHAR(100) DEFAULT "Colocation & Software"');
    } catch {}
    try {
      await pool.query('ALTER TABLE sliders ADD COLUMN btn2_link VARCHAR(255) DEFAULT "shop"');
    } catch {}

    try {
      const [sliders] = await pool.query('SELECT * FROM sliders ORDER BY id ASC');
      if (sliders && sliders.length > 1) {
        store.sliders = sliders.map(s => ({ ...s, active: Boolean(s.active) }));
      } else {
        const defaultSlides = [
          {
            id: 1,
            title: "Tier III Sovereign Cloud Edge Datacenter",
            subtitle: "Redundant power, precision cooling, and direct fiber interconnects in Kampala",
            image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80",
            btn1_text: "Explore Services",
            btn1_link: "services",
            btn2_text: "Colocation & Cloud",
            btn2_link: "shop",
            active: 1
          },
          {
            id: 2,
            title: "High-Density Server Rack Colocation",
            subtitle: "Dual A+B power feeds, 1Gbps unmetered bandwidth, and 99.99% uptime SLA",
            image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1400&q=80",
            btn1_text: "View Server Racks",
            btn1_link: "services",
            btn2_text: "Colocation Pricing",
            btn2_link: "shop",
            active: 1
          },
          {
            id: 3,
            title: "Zimbra & QuickBooks Cloud Cluster Nodes",
            subtitle: "Instant NVMe storage access with zero data sovereignty compliance risk",
            image: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=1400&q=80",
            btn1_text: "Cloud VPS & ERP",
            btn1_link: "shop",
            btn2_text: "Contact Sales",
            btn2_link: "contact",
            active: 1
          },
          {
            id: 4,
            title: "24/7 Threat Intelligence Operations Center",
            subtitle: "Expert Cyber Security Team monitoring enterprise defense round the clock",
            image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80",
            btn1_text: "Cyber Security",
            btn1_link: "services",
            btn2_text: "Security Audit",
            btn2_link: "contact",
            active: 1
          }
        ];
        for (const s of defaultSlides) {
          await pool.query(
            `INSERT INTO sliders (id, title, subtitle, image, btn1_text, btn1_link, btn2_text, btn2_link, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               title=VALUES(title), subtitle=VALUES(subtitle), image=VALUES(image), 
               btn1_text=VALUES(btn1_text), btn1_link=VALUES(btn1_link), 
               btn2_text=VALUES(btn2_text), btn2_link=VALUES(btn2_link), active=VALUES(active)`,
            [s.id, s.title, s.subtitle, s.image, s.btn1_text, s.btn1_link, s.btn2_text, s.btn2_link, s.active]
          );
        }
        const [reloadedSliders] = await pool.query('SELECT * FROM sliders ORDER BY id ASC');
        store.sliders = reloadedSliders.map(s => ({ ...s, active: Boolean(s.active) }));
      }
    } catch (e) {
      console.warn('[MySQL Store] Sliders query note:', e.message);
    }

    // 25. News
    try {
      const [news] = await pool.query('SELECT * FROM news ORDER BY id DESC');
      store.news = news;
    } catch (e) {
      console.warn('[MySQL Store] News query note:', e.message);
    }

    // 26. Contacts & Helpdesk Tickets
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN ticket_number VARCHAR(50) NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN priority VARCHAR(20) DEFAULT "medium"');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN category VARCHAR(100) DEFAULT "General Technical Support"');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN source VARCHAR(50) DEFAULT "website_contact_form"');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN assigned_to_id INT NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN assigned_to_name VARCHAR(255) NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN assigned_to_email VARCHAR(255) NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN assigned_at DATETIME NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN response TEXT NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN replied_at DATETIME NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN closed_at DATETIME NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN closed_by VARCHAR(255) NULL');
    } catch {}
    try {
      await pool.query('ALTER TABLE contacts ADD COLUMN history JSON NULL');
    } catch {}

    try {
      const [contacts] = await pool.query('SELECT * FROM contacts ORDER BY id DESC');
      store.contacts = (contacts || []).map(c => ({
        ...c,
        ticket_number: c.ticket_number || `TKT-2026-${String(c.id).padStart(4, '0')}`,
        priority: c.priority || 'medium',
        category: c.category || 'General Technical Support',
        status: c.status || 'open',
        timeline: parseJsonSafe(c.history || c.timeline, [
          {
            timestamp: c.created_at || new Date().toISOString(),
            action: 'CREATED',
            actor: c.name || 'Customer',
            note: 'Ticket logged'
          }
        ])
      }));
    } catch (e) {
      console.warn('[MySQL Store] Contacts query note:', e.message);
    }

    // 26b. Events
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS events (
        id BIGINT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date VARCHAR(100) NULL,
        time VARCHAR(100) NULL,
        location VARCHAR(255) NULL,
        event_link VARCHAR(500) NULL,
        is_paid TINYINT(1) DEFAULT 0,
        price DECIMAL(15,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'UGX',
        registration_deadline DATETIME NULL,
        capacity INT DEFAULT 0,
        description TEXT NULL,
        image LONGTEXT NULL,
        registrations JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN time VARCHAR(100) NULL'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN event_link VARCHAR(500) NULL'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN is_paid TINYINT(1) DEFAULT 0'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN price DECIMAL(15,2) DEFAULT 0.00'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN currency VARCHAR(10) DEFAULT "UGX"'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN registration_deadline DATETIME NULL'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN capacity INT DEFAULT 0'); } catch {}
    try { await pool.query('ALTER TABLE events ADD COLUMN registrations JSON NULL'); } catch {}

    try {
      const [events] = await pool.query('SELECT * FROM events ORDER BY id DESC');
      store.events = (events || []).map(e => ({
        ...e,
        is_paid: Boolean(e.is_paid),
        price: Number(e.price) || 0,
        registrations: parseJsonSafe(e.registrations, [])
      }));
    } catch (e) {
      console.warn('[MySQL Store] Events query note:', e.message);
    }

    // 27. Universal System Settings
    try {
      const [settings] = await pool.query('SELECT * FROM system_settings');
      for (const row of settings) {
        const key = row.setting_key;
        let val = row.setting_value;
        if (['smtp_settings', 'topbar_settings', 'security_settings', 'notification_emails', 'paid_stamp', 'announcement', 'banner_settings', 'wifi_voucher_prices'].includes(key)) {
          store[key] = parseJsonSafe(val, {});
        } else if (key === 'api_integrations') {
          store[key] = parseJsonSafe(val, []);
        } else {
          store[key] = val;
        }
      }
    } catch (e) {
      console.warn('[MySQL Store] System settings query note:', e.message);
    }

    console.log(`[MySQL Store] Successfully hydrated complete system state from MySQL (${store.invoices.length} invoices, ${store.payments.length} payments, ${store.users.length} users, ${store.products.length} products).`);
    return store;
  } catch (err) {
    console.error('[MySQL Store] Warning reading from MySQL:', err.message);
    return null;
  }
}

/**
 * Saves/Appends modified store data into MySQL with deduplication.
 */
export async function syncStoreToMysql(store) {
  if (!store || typeof store !== 'object') return;

  try {
    // 1. Invoices
    if (Array.isArray(store.invoices)) {
      for (const inv of store.invoices) {
        await pool.query(
          `INSERT INTO invoices (id, invoice_number, customer_name, customer_email, customer_phone, customer_address, company, item_name, plan_name, amount, paid_amount, balance, status, due_date, duration, reference, payment_method, include_vat, vat_exempt, vat_amount, items, shareable_url, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name), customer_email=VALUES(customer_email), amount=VALUES(amount), paid_amount=VALUES(paid_amount), balance=VALUES(balance), status=VALUES(status), items=VALUES(items)`,
          [
            inv.id || null, inv.invoice_number, inv.customer_name || 'Customer', inv.customer_email || '', inv.customer_phone || null, inv.customer_address || null,
            inv.company || null, inv.item_name || null, inv.plan_name || null, Number(inv.amount) || 0, Number(inv.paid_amount) || 0, Number(inv.balance) || 0,
            inv.status || 'Pending', parseDateOnly(inv.due_date), inv.duration || null, inv.reference || null, inv.payment_method || null,
            inv.include_vat ? 1 : 0, inv.vat_exempt ? 1 : 0, Number(inv.vat_amount) || 0, safeJson(inv.items), inv.shareable_url || null, inv.notes || null,
            parseDate(inv.created_at) || new Date()
          ]
        );
      }
    }

    // 2. Payments
    if (Array.isArray(store.payments)) {
      for (const pay of store.payments) {
        await pool.query(
          `INSERT INTO payments (id, payment_type, invoice_number, party_name, party_email, amount_due, amount_paid, excess_amount, payment_method, reference, status, date, payment_date, created_at_time, updated_by, total_refunded, refund_amount, refund_reason, refunded_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE amount_paid=VALUES(amount_paid), status=VALUES(status), reference=VALUES(reference)`,
          [
            pay.id || null, pay.payment_type || 'incoming', pay.invoice_number || null, pay.party_name || 'Customer', pay.party_email || null,
            Number(pay.amount_due) || 0, Number(pay.amount_paid) || 0, Number(pay.excess_amount) || 0, pay.payment_method || 'Cash', pay.reference || null,
            pay.status || 'Completed', parseDateOnly(pay.date), parseDateOnly(pay.payment_date), pay.created_at_time || null, pay.updated_by || null,
            Number(pay.total_refunded) || 0, Number(pay.refund_amount) || 0, pay.refund_reason || null, parseDate(pay.refunded_at), parseDate(pay.created_at) || new Date()
          ]
        );
      }
    }

    // 3. Subscriptions
    if (Array.isArray(store.subscriptions)) {
      for (const sub of store.subscriptions) {
        await pool.query(
          `INSERT INTO subscriptions (id, user_id, plan_name, customer_name, customer_email, customer_phone, customer_address, amount, currency, duration, billing_cycle, status, reference, invoice_number, start_date, expiry_date, reminders_sent, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE plan_name=VALUES(plan_name), amount=VALUES(amount), status=VALUES(status), expiry_date=VALUES(expiry_date), reminders_sent=VALUES(reminders_sent)`,
          [
            sub.id || null, sub.user_id || null, sub.plan_name || 'Plan', sub.customer_name || 'Customer', sub.customer_email || '', sub.customer_phone || null,
            sub.customer_address || null, Number(sub.amount) || 0, sub.currency || 'UGX', sub.duration || 'Monthly', sub.billing_cycle || 'Monthly',
            sub.status || 'active', sub.reference || null, sub.invoice_number || null, parseDateOnly(sub.start_date), parseDateOnly(sub.expiry_date),
            safeJson(sub.reminders_sent), parseDate(sub.created_at) || new Date()
          ]
        );
      }
    }

    // 4. Quotations
    if (Array.isArray(store.quotations)) {
      for (const q of store.quotations) {
        await pool.query(
          `INSERT INTO quotations (id, quote_number, customer_name, customer_email, customer_phone, company, valid_until, status, items, subtotal, vat_exempt, vat_amount, total_amount, notes, converted_invoice_number, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), items=VALUES(items), total_amount=VALUES(total_amount)`,
          [
            q.id || null, q.quote_number, q.customer_name || 'Client', q.customer_email || '', q.customer_phone || null, q.company || null,
            parseDateOnly(q.valid_until), q.status || 'Draft', safeJson(q.items), Number(q.subtotal) || 0, q.vat_exempt ? 1 : 0, Number(q.vat_amount) || 0,
            Number(q.total_amount) || 0, q.notes || null, q.converted_invoice_number || null, parseDate(q.created_at) || new Date()
          ]
        );
      }
    }

    // 5. Work Orders
    if (Array.isArray(store.work_orders)) {
      for (const wo of store.work_orders) {
        await pool.query(
          `INSERT INTO work_orders (id, order_number, task_title, client_site, assigned_staff_id, assigned_staff_name, assigned_staff_email, charging_mode, rate, quantity, total_cost, scheduled_date, completion_date, status, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), total_cost=VALUES(total_cost)`,
          [
            wo.id || null, wo.order_number, wo.task_title || 'Work Order', wo.client_site || null, wo.assigned_staff_id || null, wo.assigned_staff_name || null,
            wo.assigned_staff_email || null, wo.charging_mode || 'Fixed', Number(wo.rate) || 0, Number(wo.quantity) || 1, Number(wo.total_cost) || 0,
            parseDateOnly(wo.scheduled_date), parseDateOnly(wo.completion_date), wo.status || 'Pending', wo.description || null, parseDate(wo.created_at) || new Date()
          ]
        );
      }
    }

    // 6. Delivery Notes
    if (Array.isArray(store.delivery_notes)) {
      for (const dn of store.delivery_notes) {
        await pool.query(
          `INSERT INTO delivery_notes (id, dn_number, invoice_id, invoice_number, customer_name, customer_email, customer_phone, delivery_address, carrier, tracking_code, dispatch_officer, delivery_date, status, payment_status, items, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), items=VALUES(items)`,
          [
            dn.id || null, dn.dn_number, dn.invoice_id || null, dn.invoice_number || null, dn.customer_name || 'Recipient', dn.customer_email || null,
            dn.customer_phone || null, dn.delivery_address || null, dn.carrier || null, dn.tracking_code || null, dn.dispatch_officer || null,
            parseDateOnly(dn.delivery_date), dn.status || 'Dispatched', dn.payment_status || 'Paid', safeJson(dn.items), dn.notes || null,
            parseDate(dn.created_at) || new Date()
          ]
        );
      }
    }

    // 7. Users
    if (Array.isArray(store.users)) {
      for (const u of store.users) {
        const pass = u.password_hash || u.passwordHash || '';
        await pool.query(
          `INSERT INTO users (id, name, email, password_hash, role, position, title, phone, company, status, is_verified, verification_token, verification_expires, mfa_enabled, mfa_secret, password_updated_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role), phone=VALUES(phone), company=VALUES(company), status=VALUES(status), is_verified=VALUES(is_verified), mfa_enabled=VALUES(mfa_enabled), mfa_secret=VALUES(mfa_secret), password_updated_at=VALUES(password_updated_at)`,
          [
            u.id || null, u.name, u.email, pass, u.role || 'customer', u.position || null, u.title || null, u.phone || null, u.company || null,
            u.status || 'active', u.is_verified ? 1 : 0, u.verification_token || null, parseDate(u.verification_expires),
            u.mfa_enabled ? 1 : 0, u.mfa_secret || null, parseDate(u.password_updated_at) || new Date(), parseDate(u.created_at) || new Date()
          ]
        );
      }
    }

    // 8. Staff Expenses
    if (Array.isArray(store.staff_expenses)) {
      for (const exp of store.staff_expenses) {
        await pool.query(
          `INSERT INTO staff_expenses (id, staff_name, staff_email, supervisor_name, category, description, amount, receipt_ref, status, approved_by, approved_at, date, work_order_ref, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), amount=VALUES(amount)`,
          [
            exp.id || null, exp.staff_name || 'Staff Member', exp.staff_email || '', exp.supervisor_name || null, exp.category || 'General',
            exp.description || 'Staff Expense', Number(exp.amount) || 0, exp.receipt_ref || null, exp.status || 'Pending', exp.approved_by || null,
            parseDate(exp.approved_at), parseDateOnly(exp.date), exp.work_order_ref || null, parseDate(exp.created_at) || new Date()
          ]
        );
      }
    }

    // 9. Customer Credits
    if (Array.isArray(store.customer_credits)) {
      for (const cc of store.customer_credits) {
        await pool.query(
          `INSERT INTO customer_credits (id, customer_name, customer_email, company, available_credit, history)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE available_credit=VALUES(available_credit), history=VALUES(history)`,
          [cc.id || null, cc.customer_name, cc.customer_email, cc.company || null, Number(cc.available_credit) || 0, safeJson(cc.history)]
        );
      }
    }

    // 10. Audit Logs
    if (Array.isArray(store.audit_logs)) {
      for (const al of store.audit_logs.slice(0, 50)) { // sync recent audit logs
        await pool.query(
          `INSERT INTO audit_logs (id, user_email, user_name, user_role, action, resource_type, resource_id, details, ip_address, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE action=VALUES(action)`,
          [
            al.id || null, al.user_email || null, al.user_name || null, al.user_role || null, al.action || 'AUDIT_ACTION',
            al.resource_type || null, al.resource_id || null, safeJson(al.details), al.ip_address || null, parseDate(al.timestamp) || new Date()
          ]
        );
      }
    }

    // 11. System Settings
    const settingKeys = [
      'smtp_settings', 'topbar_settings', 'security_settings', 'notification_emails',
      'paid_stamp', 'site_logo', 'site_favicon', 'announcement', 'banner_settings', 'slider_settings',
      'api_integrations'
    ];
    for (const sk of settingKeys) {
      if (store[sk] !== undefined && store[sk] !== null) {
        const valStr = typeof store[sk] === 'object' ? JSON.stringify(store[sk]) : String(store[sk]);
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
          [sk, valStr]
        );
      }
    }

    // 12. Sliders
    if (Array.isArray(store.sliders)) {
      for (const sl of store.sliders) {
        await pool.query(
          `INSERT INTO sliders (id, title, subtitle, image, btn1_text, btn1_link, btn2_text, btn2_link, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             title=VALUES(title), subtitle=VALUES(subtitle), image=VALUES(image), 
             btn1_text=VALUES(btn1_text), btn1_link=VALUES(btn1_link), 
             btn2_text=VALUES(btn2_text), btn2_link=VALUES(btn2_link), active=VALUES(active)`,
          [
            sl.id || null, sl.title || '', sl.subtitle || '', sl.image || '',
            sl.btn1_text || 'Explore Services', sl.btn1_link || 'services',
            sl.btn2_text || 'Colocation & Software', sl.btn2_link || 'shop',
            sl.active !== false ? 1 : 0
          ]
        );
      }
    }

    // 13. Jobs / Careers Openings
    if (Array.isArray(store.jobs)) {
      for (const j of store.jobs) {
        const slug = j.slug || (j.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const reqJson = safeJson(Array.isArray(j.requirements) ? j.requirements : []);
        const respJson = safeJson(Array.isArray(j.responsibilities) ? j.responsibilities : []);
        const deadlineDate = parseDateOnly(j.deadline) || null;
        
        await pool.query(
          `INSERT INTO jobs (id, title, slug, department, location, type, vacancies, status, deadline, description, requirements, responsibilities)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             title=VALUES(title), slug=VALUES(slug), department=VALUES(department), location=VALUES(location), 
             type=VALUES(type), vacancies=VALUES(vacancies), status=VALUES(status), deadline=VALUES(deadline), 
             description=VALUES(description), requirements=VALUES(requirements), responsibilities=VALUES(responsibilities)`,
          [
            j.id || null, j.title, slug, j.department || 'Operations', j.location || 'Kampala, Uganda',
            j.type || 'Full-time', Number(j.vacancies) || 1, j.status || 'open', deadlineDate,
            j.description || '', reqJson, respJson
          ]
        );
      }
    }

    // 14. Contacts & Helpdesk Support Tickets
    if (store.contacts && Array.isArray(store.contacts)) {
      for (const c of store.contacts) {
        await pool.query(
          `INSERT INTO contacts (id, ticket_number, name, email, phone, subject, message, category, priority, status, source, assigned_to_id, assigned_to_name, assigned_to_email, assigned_at, response, replied_at, closed_at, closed_by, history, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             ticket_number=VALUES(ticket_number), name=VALUES(name), email=VALUES(email), phone=VALUES(phone), 
             subject=VALUES(subject), message=VALUES(message), category=VALUES(category), priority=VALUES(priority), 
             status=VALUES(status), source=VALUES(source), assigned_to_id=VALUES(assigned_to_id), 
             assigned_to_name=VALUES(assigned_to_name), assigned_to_email=VALUES(assigned_to_email), 
             assigned_at=VALUES(assigned_at), response=VALUES(response), replied_at=VALUES(replied_at), 
             closed_at=VALUES(closed_at), closed_by=VALUES(closed_by), history=VALUES(history)`,
          [
            c.id || null, c.ticket_number || null, c.name, c.email, c.phone || '',
            c.subject || 'General Inquiry', c.message || '', c.category || 'General Support',
            c.priority || 'medium', c.status || 'open', c.source || 'website_contact_form',
            c.assigned_to_id || null, c.assigned_to_name || null, c.assigned_to_email || null,
            parseDate(c.assigned_at) || null, c.response || null, parseDate(c.replied_at) || null,
            parseDate(c.closed_at) || null, c.closed_by || null, safeJson(c.timeline || c.history || []),
            parseDate(c.created_at) || new Date()
          ]
        ).catch(() => {});
      }
    }

    // 14b. Events & Attendee Registrations
    if (store.events && Array.isArray(store.events)) {
      for (const e of store.events) {
        await pool.query(
          `INSERT INTO events (id, title, date, time, location, event_link, is_paid, price, currency, registration_deadline, capacity, description, image, registrations, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             title=VALUES(title), date=VALUES(date), time=VALUES(time), location=VALUES(location), 
             event_link=VALUES(event_link), is_paid=VALUES(is_paid), price=VALUES(price), 
             currency=VALUES(currency), registration_deadline=VALUES(registration_deadline), 
             capacity=VALUES(capacity), description=VALUES(description), image=VALUES(image), 
             registrations=VALUES(registrations)`,
          [
            e.id, e.title, e.date || null, e.time || null, e.location || 'Virtual',
            e.event_link || null, e.is_paid ? 1 : 0, Number(e.price) || 0, e.currency || 'UGX',
            parseDate(e.registration_deadline) || null, Number(e.capacity) || 0,
            e.description || '', e.image || '', safeJson(e.registrations || []),
            parseDate(e.created_at) || new Date()
          ]
        ).catch(() => {});
      }
    }

    // 15. Universal System Settings (Including api_integrations, smtp, topbar, security)
    const systemSettingsKeys = [
      'api_integrations', 'smtp_settings', 'topbar_settings', 
      'security_settings', 'notification_emails', 'paid_stamp', 
      'announcement', 'banner_settings', 'wifi_voucher_prices'
    ];
    for (const key of systemSettingsKeys) {
      if (store[key] !== undefined && store[key] !== null) {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, safeJson(store[key])]
        );
      }
    }
  } catch (err) {
    console.error('[MySQL Store] Error synchronizing store to MySQL:', err.message);
  }
}
