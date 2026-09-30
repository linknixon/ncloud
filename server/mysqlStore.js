import { pool } from './db.js';

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
      smtp_settings: {},
      topbar_settings: {},
      security_settings: {},
      notification_emails: {},
      paid_stamp: {},
      site_logo: '',
      site_favicon: '',
      announcement: {},
      banner_settings: {}
    };

    // 1. Roles
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id ASC');
    store.roles = roles.map(r => ({ ...r, permissions: parseJsonSafe(r.permissions, {}) }));

    // 2. Users
    const [users] = await pool.query('SELECT * FROM users ORDER BY id ASC');
    store.users = users.map(u => ({
      ...u,
      passwordHash: u.password_hash,
      is_verified: Boolean(u.is_verified)
    }));

    // 3. Services
    const [services] = await pool.query('SELECT * FROM services ORDER BY id ASC');
    store.services = services.map(s => ({
      ...s,
      features: parseJsonSafe(s.features, []),
      is_active: Boolean(s.is_active)
    }));

    // 4. Product Categories
    const [cats] = await pool.query('SELECT * FROM product_categories ORDER BY id ASC');
    store.product_categories = cats;

    // 5. Products
    const [products] = await pool.query('SELECT * FROM products ORDER BY id ASC');
    store.products = products.map(p => ({
      ...p,
      specs: parseJsonSafe(p.specs, {}),
      details: parseJsonSafe(p.details, {}),
      is_hidden: Boolean(p.is_hidden)
    }));

    // 6. Invoices
    const [invoices] = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
    store.invoices = invoices.map(i => ({
      ...i,
      items: parseJsonSafe(i.items, []),
      include_vat: Boolean(i.include_vat),
      vat_exempt: Boolean(i.vat_exempt)
    }));

    // 7. Payments
    const [payments] = await pool.query('SELECT * FROM payments ORDER BY id DESC');
    store.payments = payments;

    // 8. Subscriptions
    const [subs] = await pool.query('SELECT * FROM subscriptions ORDER BY id DESC');
    store.subscriptions = subs.map(s => ({
      ...s,
      reminders_sent: parseJsonSafe(s.reminders_sent, [])
    }));

    // 9. Quotations
    const [quotes] = await pool.query('SELECT * FROM quotations ORDER BY id DESC');
    store.quotations = quotes.map(q => ({
      ...q,
      items: parseJsonSafe(q.items, []),
      vat_exempt: Boolean(q.vat_exempt)
    }));

    // 10. Work Orders
    const [wo] = await pool.query('SELECT * FROM work_orders ORDER BY id DESC');
    store.work_orders = wo;

    // 11. Delivery Notes
    const [dn] = await pool.query('SELECT * FROM delivery_notes ORDER BY id DESC');
    store.delivery_notes = dn.map(d => ({
      ...d,
      items: parseJsonSafe(d.items, [])
    }));

    // 12. Staff Expenses
    const [exp] = await pool.query('SELECT * FROM staff_expenses ORDER BY id DESC');
    store.staff_expenses = exp;

    // 13. Expense Categories
    const [ec] = await pool.query('SELECT * FROM expense_categories ORDER BY id ASC');
    store.expense_categories = ec;

    // 14. Customer Credits
    const [credits] = await pool.query('SELECT * FROM customer_credits ORDER BY id ASC');
    store.customer_credits = credits.map(c => ({
      ...c,
      history: parseJsonSafe(c.history, [])
    }));

    // 15. Bank Accounts
    const [ba] = await pool.query('SELECT * FROM bank_accounts ORDER BY id ASC');
    store.bank_accounts = ba.map(b => ({ ...b, is_primary: Boolean(b.is_primary) }));

    // 16. UniFi Vouchers
    const [vouchers] = await pool.query('SELECT * FROM unifi_vouchers ORDER BY id DESC');
    store.unifi_vouchers = vouchers;

    // 17. Audit Logs
    const [logs] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 500');
    store.audit_logs = logs.map(l => ({
      ...l,
      details: parseJsonSafe(l.details, {})
    }));

    // 18. Jobs
    const [jobs] = await pool.query('SELECT * FROM jobs ORDER BY id ASC');
    store.jobs = jobs.map(j => ({
      ...j,
      requirements: parseJsonSafe(j.requirements, []),
      responsibilities: parseJsonSafe(j.responsibilities, [])
    }));

    // 19. Job Applications
    const [apps] = await pool.query('SELECT * FROM job_applications ORDER BY id DESC');
    store.job_applications = apps;

    // 20. Email Dispatches
    const [ed] = await pool.query('SELECT * FROM email_dispatches ORDER BY id DESC');
    store.email_dispatches = ed;

    // 21. Schedules
    const [schedules] = await pool.query('SELECT * FROM schedules ORDER BY id ASC');
    store.schedules = schedules.map(s => ({ ...s, enabled: Boolean(s.enabled) }));

    // 22. Partners
    const [partners] = await pool.query('SELECT * FROM partners ORDER BY id ASC');
    store.partners = partners.map(p => ({ ...p, logo: p.logo_url, logoText: p.logo_text }));

    // 23. Team
    const [team] = await pool.query('SELECT * FROM team ORDER BY id ASC');
    store.team = team;

    // 24. Sliders
    const [sliders] = await pool.query('SELECT * FROM sliders ORDER BY id ASC');
    store.sliders = sliders.map(s => ({ ...s, active: Boolean(s.active) }));

    // 25. News
    const [news] = await pool.query('SELECT * FROM news ORDER BY id DESC');
    store.news = news;

    // 26. Contacts
    const [contacts] = await pool.query('SELECT * FROM contacts ORDER BY id DESC');
    store.contacts = contacts;

    // 27. Universal System Settings
    const [settings] = await pool.query('SELECT * FROM system_settings');
    for (const row of settings) {
      const key = row.setting_key;
      let val = row.setting_value;
      if (['smtp_settings', 'topbar_settings', 'security_settings', 'notification_emails', 'paid_stamp', 'announcement', 'banner_settings'].includes(key)) {
        store[key] = parseJsonSafe(val, {});
      } else {
        store[key] = val;
      }
    }

    console.log(`[MySQL Store] Successfully hydrated complete system state from MySQL (${invoices.length} invoices, ${payments.length} payments, ${users.length} users, ${products.length} products).`);
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
          `INSERT INTO users (id, name, email, password_hash, role, position, title, phone, company, status, is_verified, verification_token, verification_expires, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role), phone=VALUES(phone), company=VALUES(company), status=VALUES(status), is_verified=VALUES(is_verified)`,
          [
            u.id || null, u.name, u.email, pass, u.role || 'customer', u.position || null, u.title || null, u.phone || null, u.company || null,
            u.status || 'active', u.is_verified ? 1 : 0, u.verification_token || null, parseDate(u.verification_expires), parseDate(u.created_at) || new Date()
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
      'paid_stamp', 'site_logo', 'site_favicon', 'announcement', 'banner_settings'
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
  } catch (err) {
    console.error('[MySQL Store] Error synchronizing store to MySQL:', err.message);
  }
}
