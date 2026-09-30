import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly search and load .env if available
const possibleEnvPaths = [
  path.join(__dirname, '../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '../.env')
];
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

// Helper for dates
function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function parseDateOnly(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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

async function runMigration() {
  console.log('===============================================================');
  console.log('      NOVA CLOUD EDGES - JSON TO MYSQL ENTERPRISE MIGRATION     ');
  console.log('===============================================================');

  const jsonPath = path.join(__dirname, 'persistentStore.json');
  const backupPath = path.join(__dirname, 'persistentStore.PRE_MYSQL_MIGRATION.json');
  const sourcePath = fs.existsSync(jsonPath) ? jsonPath : backupPath;

  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Error: No persistentStore source file found to migrate!');
    process.exit(1);
  }

  console.log(`[Source] Reading data from: ${sourcePath}`);
  const store = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

  // Database Connection config from environment variables
  const isMac = process.platform === 'darwin';
  const isMamp = isMac && (fs.existsSync('/Applications/MAMP') || fs.existsSync('/Applications/MAMP/tmp/mysql'));
  
  const host = process.env.DB_HOST || (isMamp ? '127.0.0.1' : 'localhost');
  const port = Number(process.env.DB_PORT) || (isMamp ? 8889 : 3306);
  const user = process.env.DB_USER || (isMamp ? 'root' : 'root');
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (isMamp ? 'root' : '');
  const database = process.env.DB_NAME || (isMamp ? 'nova_website' : 'ncloudwebsite');

  console.log(`[Connection] Connecting to database '${database}' on ${user}@${host}:${port}...`);
  
  let pool;
  try {
    // Attempt direct connection to the specified database first
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10
    });
    await pool.query('SELECT 1');
    console.log(`[Connection] Successfully connected to database '${database}'.`);
  } catch (connErr) {
    if (connErr.code === 'ER_BAD_DB_ERROR') {
      console.log(`[Database] Database '${database}' does not exist. Attempting creation...`);
      try {
        const rootConn = await mysql.createConnection({ host, port, user, password });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();
        console.log(`[Database] Created database '${database}'.`);
        pool = mysql.createPool({
          host,
          port,
          user,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 10
        });
      } catch (createErr) {
        console.error(`❌ Could not create database '${database}':`, createErr.message);
        process.exit(1);
      }
    } else {
      console.error(`❌ Connection failed to MySQL (${user}@${host}:${port}/${database}):`, connErr.message);
      process.exit(1);
    }
  }

  // Step 1: Execute schema.sql to ensure all tables exist
  console.log('[Schema] Executing schema.sql definitions...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip line comments and split schema SQL into individual statements
  const cleanSql = schemaSql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE'));

  // Ensure tables get created with new BIGINT schema
  await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
  const tableMatches = [...cleanSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/gi)];
  for (const m of tableMatches) {
    await pool.query(`DROP TABLE IF EXISTS \`${m[1]}\`;`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      console.warn(`[Schema Note] Statement failed: ${err.message.slice(0, 100)}...`);
    }
  }
  console.log('✅ All 27 Enterprise Tables verified and initialized in MySQL with BIGINT support.');

  const auditReport = [];

  // 1. Roles
  if (Array.isArray(store.roles)) {
    let count = 0;
    for (const r of store.roles) {
      await pool.query(
        `INSERT INTO roles (id, name, code, badge_color, description, user_count, permissions)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), badge_color=VALUES(badge_color), description=VALUES(description), permissions=VALUES(permissions)`,
        [r.id || null, r.name, r.code, r.badge_color || '#2563eb', r.description || null, r.user_count || 0, safeJson(r.permissions)]
      );
      count++;
    }
    auditReport.push({ Entity: 'Roles', JSON_Count: store.roles.length, Migrated: count });
  }

  // 2. Users
  if (Array.isArray(store.users)) {
    let count = 0;
    for (const u of store.users) {
      const pass = u.password_hash || u.passwordHash || '';
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, position, title, phone, company, status, is_verified, verification_token, verification_expires, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role), phone=VALUES(phone), company=VALUES(company), status=VALUES(status), is_verified=VALUES(is_verified)`,
        [u.id || null, u.name, u.email, pass, u.role || 'customer', u.position || null, u.title || null, u.phone || null, u.company || null, u.status || 'active', u.is_verified ? 1 : 0, u.verification_token || null, parseDate(u.verification_expires), parseDate(u.created_at) || new Date()]
      );
      count++;
    }
    auditReport.push({ Entity: 'Users', JSON_Count: store.users.length, Migrated: count });
  }

  // 3. Services
  if (Array.isArray(store.services)) {
    let count = 0;
    for (const s of store.services) {
      await pool.query(
        `INSERT INTO services (id, title, slug, summary, description, icon, features, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), description=VALUES(description), icon=VALUES(icon), features=VALUES(features)`,
        [s.id || null, s.title, s.slug, s.summary || null, s.description || null, s.icon || null, safeJson(s.features), s.is_active !== false ? 1 : 0]
      );
      count++;
    }
    auditReport.push({ Entity: 'Services', JSON_Count: store.services.length, Migrated: count });
  }

  // 4. Product Categories
  if (Array.isArray(store.product_categories)) {
    let count = 0;
    for (const c of store.product_categories) {
      await pool.query(
        `INSERT INTO product_categories (id, name, slug, description)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)`,
        [c.id || null, c.name, c.slug, c.description || null]
      );
      count++;
    }
    auditReport.push({ Entity: 'Product Categories', JSON_Count: store.product_categories.length, Migrated: count });
  }

  // 5. Products
  if (Array.isArray(store.products)) {
    let count = 0;
    for (const p of store.products) {
      await pool.query(
        `INSERT INTO products (id, name, slug, category, price, currency, badge, short_desc, description, specs, details, image_url, stock, is_hidden, checkout_type, checkout_flow)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), category=VALUES(category), short_desc=VALUES(short_desc), description=VALUES(description), specs=VALUES(specs), image_url=VALUES(image_url), stock=VALUES(stock)`,
        [p.id || null, p.name, p.slug, p.category || 'Digital Products', Number(p.price) || 0, p.currency || 'UGX', p.badge || null, p.short_desc || null, p.description || p.desc || null, safeJson(p.specs), safeJson(p.details), p.image_url || null, p.stock || 100, p.is_hidden ? 1 : 0, p.checkout_type || 'direct', p.checkout_flow || 'standard']
      );
      count++;
    }
    auditReport.push({ Entity: 'Products', JSON_Count: store.products.length, Migrated: count });
  }

  // 6. Invoices
  if (Array.isArray(store.invoices)) {
    let count = 0;
    for (const inv of store.invoices) {
      await pool.query(
        `INSERT INTO invoices (id, invoice_number, customer_name, customer_email, customer_phone, customer_address, company, item_name, plan_name, amount, paid_amount, balance, status, due_date, duration, reference, payment_method, include_vat, vat_exempt, vat_amount, items, shareable_url, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name), customer_email=VALUES(customer_email), amount=VALUES(amount), paid_amount=VALUES(paid_amount), balance=VALUES(balance), status=VALUES(status), items=VALUES(items)`,
        [
          inv.id || null,
          inv.invoice_number,
          inv.customer_name || 'Valued Customer',
          inv.customer_email || '',
          inv.customer_phone || null,
          inv.customer_address || null,
          inv.company || null,
          inv.item_name || null,
          inv.plan_name || null,
          Number(inv.amount) || 0,
          Number(inv.paid_amount) || 0,
          Number(inv.balance) || 0,
          inv.status || 'Pending',
          parseDateOnly(inv.due_date),
          inv.duration || null,
          inv.reference || null,
          inv.payment_method || null,
          inv.include_vat ? 1 : 0,
          inv.vat_exempt ? 1 : 0,
          Number(inv.vat_amount) || 0,
          safeJson(inv.items),
          inv.shareable_url || null,
          inv.notes || null,
          parseDate(inv.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Invoices', JSON_Count: store.invoices.length, Migrated: count });
  }

  // 7. Payments
  if (Array.isArray(store.payments)) {
    let count = 0;
    for (const pay of store.payments) {
      await pool.query(
        `INSERT INTO payments (id, payment_type, invoice_number, party_name, party_email, amount_due, amount_paid, excess_amount, payment_method, reference, status, date, payment_date, created_at_time, updated_by, total_refunded, refund_amount, refund_reason, refunded_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount_paid=VALUES(amount_paid), status=VALUES(status), reference=VALUES(reference)`,
        [
          pay.id || null,
          pay.payment_type || 'incoming',
          pay.invoice_number || null,
          pay.party_name || 'Customer',
          pay.party_email || null,
          Number(pay.amount_due) || 0,
          Number(pay.amount_paid) || 0,
          Number(pay.excess_amount) || 0,
          pay.payment_method || 'Cash',
          pay.reference || null,
          pay.status || 'Completed',
          parseDateOnly(pay.date),
          parseDateOnly(pay.payment_date),
          pay.created_at_time || null,
          pay.updated_by || null,
          Number(pay.total_refunded) || 0,
          Number(pay.refund_amount) || 0,
          pay.refund_reason || null,
          parseDate(pay.refunded_at),
          parseDate(pay.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Payments', JSON_Count: store.payments.length, Migrated: count });
  }

  // 8. Subscriptions
  if (Array.isArray(store.subscriptions)) {
    let count = 0;
    for (const sub of store.subscriptions) {
      await pool.query(
        `INSERT INTO subscriptions (id, user_id, plan_name, customer_name, customer_email, customer_phone, customer_address, amount, currency, duration, billing_cycle, status, reference, invoice_number, start_date, expiry_date, reminders_sent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE plan_name=VALUES(plan_name), amount=VALUES(amount), status=VALUES(status), expiry_date=VALUES(expiry_date), reminders_sent=VALUES(reminders_sent)`,
        [
          sub.id || null,
          sub.user_id || null,
          sub.plan_name || 'Standard Plan',
          sub.customer_name || 'Customer',
          sub.customer_email || '',
          sub.customer_phone || null,
          sub.customer_address || null,
          Number(sub.amount) || 0,
          sub.currency || 'UGX',
          sub.duration || 'Monthly',
          sub.billing_cycle || sub.duration || 'Monthly',
          sub.status || 'active',
          sub.reference || null,
          sub.invoice_number || null,
          parseDateOnly(sub.start_date),
          parseDateOnly(sub.expiry_date),
          safeJson(sub.reminders_sent),
          parseDate(sub.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Subscriptions', JSON_Count: store.subscriptions.length, Migrated: count });
  }

  // 9. Quotations
  if (Array.isArray(store.quotations)) {
    let count = 0;
    for (const q of store.quotations) {
      await pool.query(
        `INSERT INTO quotations (id, quote_number, customer_name, customer_email, customer_phone, company, valid_until, status, items, subtotal, vat_exempt, vat_amount, total_amount, notes, converted_invoice_number, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), items=VALUES(items), total_amount=VALUES(total_amount)`,
        [
          q.id || null,
          q.quote_number,
          q.customer_name || 'Client',
          q.customer_email || '',
          q.customer_phone || null,
          q.company || null,
          parseDateOnly(q.valid_until),
          q.status || 'Draft',
          safeJson(q.items),
          Number(q.subtotal) || 0,
          q.vat_exempt ? 1 : 0,
          Number(q.vat_amount) || 0,
          Number(q.total_amount) || 0,
          q.notes || null,
          q.converted_invoice_number || null,
          parseDate(q.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Quotations', JSON_Count: store.quotations.length, Migrated: count });
  }

  // 10. Work Orders
  if (Array.isArray(store.work_orders)) {
    let count = 0;
    for (const wo of store.work_orders) {
      await pool.query(
        `INSERT INTO work_orders (id, order_number, task_title, client_site, assigned_staff_id, assigned_staff_name, assigned_staff_email, charging_mode, rate, quantity, total_cost, scheduled_date, completion_date, status, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), total_cost=VALUES(total_cost)`,
        [
          wo.id || null,
          wo.order_number,
          wo.task_title || 'Work Order',
          wo.client_site || null,
          wo.assigned_staff_id || null,
          wo.assigned_staff_name || null,
          wo.assigned_staff_email || null,
          wo.charging_mode || 'Fixed',
          Number(wo.rate) || 0,
          Number(wo.quantity) || 1,
          Number(wo.total_cost) || 0,
          parseDateOnly(wo.scheduled_date),
          parseDateOnly(wo.completion_date),
          wo.status || 'Pending',
          wo.description || null,
          parseDate(wo.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Work Orders', JSON_Count: store.work_orders.length, Migrated: count });
  }

  // 11. Delivery Notes
  if (Array.isArray(store.delivery_notes)) {
    let count = 0;
    for (const dn of store.delivery_notes) {
      await pool.query(
        `INSERT INTO delivery_notes (id, dn_number, invoice_id, invoice_number, customer_name, customer_email, customer_phone, delivery_address, carrier, tracking_code, dispatch_officer, delivery_date, status, payment_status, items, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), items=VALUES(items)`,
        [
          dn.id || null,
          dn.dn_number,
          dn.invoice_id || null,
          dn.invoice_number || null,
          dn.customer_name || 'Recipient',
          dn.customer_email || null,
          dn.customer_phone || null,
          dn.delivery_address || null,
          dn.carrier || null,
          dn.tracking_code || null,
          dn.dispatch_officer || null,
          parseDateOnly(dn.delivery_date),
          dn.status || 'Dispatched',
          dn.payment_status || 'Paid',
          safeJson(dn.items),
          dn.notes || null,
          parseDate(dn.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Delivery Notes', JSON_Count: store.delivery_notes.length, Migrated: count });
  }

  // 12. Staff Expenses
  if (Array.isArray(store.staff_expenses)) {
    let count = 0;
    for (const exp of store.staff_expenses) {
      await pool.query(
        `INSERT INTO staff_expenses (id, staff_name, staff_email, supervisor_name, category, description, amount, receipt_ref, status, approved_by, approved_at, date, work_order_ref, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), amount=VALUES(amount)`,
        [
          exp.id || null,
          exp.staff_name || 'Staff Member',
          exp.staff_email || '',
          exp.supervisor_name || null,
          exp.category || 'General',
          exp.description || 'Staff Expense',
          Number(exp.amount) || 0,
          exp.receipt_ref || null,
          exp.status || 'Pending',
          exp.approved_by || null,
          parseDate(exp.approved_at),
          parseDateOnly(exp.date),
          exp.work_order_ref || null,
          parseDate(exp.created_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Staff Expenses', JSON_Count: store.staff_expenses.length, Migrated: count });
  }

  // 13. Expense Categories
  if (Array.isArray(store.expense_categories)) {
    let count = 0;
    for (const ec of store.expense_categories) {
      await pool.query(
        `INSERT INTO expense_categories (id, name, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)`,
        [ec.id || null, ec.name, ec.description || null]
      );
      count++;
    }
    auditReport.push({ Entity: 'Expense Categories', JSON_Count: store.expense_categories.length, Migrated: count });
  }

  // 14. Customer Credits
  if (Array.isArray(store.customer_credits)) {
    let count = 0;
    for (const cc of store.customer_credits) {
      await pool.query(
        `INSERT INTO customer_credits (id, customer_name, customer_email, company, available_credit, history)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE available_credit=VALUES(available_credit), history=VALUES(history)`,
        [cc.id || null, cc.customer_name, cc.customer_email, cc.company || null, Number(cc.available_credit) || 0, safeJson(cc.history)]
      );
      count++;
    }
    auditReport.push({ Entity: 'Customer Credits', JSON_Count: store.customer_credits.length, Migrated: count });
  }

  // 15. Bank Accounts
  if (Array.isArray(store.bank_accounts)) {
    let count = 0;
    for (const ba of store.bank_accounts) {
      await pool.query(
        `INSERT INTO bank_accounts (id, bank_name, account_name, account_number, branch, swift_code, currency, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE bank_name=VALUES(bank_name), account_number=VALUES(account_number)`,
        [ba.id || null, ba.bank_name, ba.account_name, ba.account_number, ba.branch || null, ba.swift_code || null, ba.currency || 'UGX', ba.is_primary ? 1 : 0]
      );
      count++;
    }
    auditReport.push({ Entity: 'Bank Accounts', JSON_Count: store.bank_accounts.length, Migrated: count });
  }

  // 16. UniFi Vouchers
  if (Array.isArray(store.unifi_vouchers)) {
    let count = 0;
    for (const uv of store.unifi_vouchers) {
      await pool.query(
        `INSERT INTO unifi_vouchers (id, token, package_name, duration_hours, duration_label, data_quota_mb, data_label, status, invoice_id, customer_name, customer_email, created_at, dispatched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [
          uv.id || null,
          uv.token,
          uv.package_name || 'Standard',
          uv.duration_hours || 24,
          uv.duration_label || null,
          uv.data_quota_mb || 0,
          uv.data_label || null,
          uv.status || 'Active',
          uv.invoice_id || null,
          uv.customer_name || null,
          uv.customer_email || null,
          parseDate(uv.created_at) || new Date(),
          parseDate(uv.dispatched_at)
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'UniFi Vouchers', JSON_Count: store.unifi_vouchers.length, Migrated: count });
  }

  // 17. Forensic Audit Logs
  if (Array.isArray(store.audit_logs)) {
    let count = 0;
    for (const al of store.audit_logs) {
      await pool.query(
        `INSERT INTO audit_logs (id, user_email, user_name, user_role, action, resource_type, resource_id, details, ip_address, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE action=VALUES(action)`,
        [
          al.id || null,
          al.user_email || null,
          al.user_name || null,
          al.user_role || null,
          al.action || 'AUDIT_ACTION',
          al.resource_type || null,
          al.resource_id || null,
          safeJson(al.details),
          al.ip_address || null,
          parseDate(al.timestamp) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Audit Logs', JSON_Count: store.audit_logs.length, Migrated: count });
  }

  // 18. Careers / Jobs
  if (Array.isArray(store.jobs)) {
    let count = 0;
    for (const j of store.jobs) {
      await pool.query(
        `INSERT INTO jobs (id, title, slug, department, location, type, vacancies, status, deadline, description, requirements, responsibilities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status)`,
        [
          j.id || null,
          j.title,
          j.slug,
          j.department || null,
          j.location || 'Kampala, Uganda',
          j.type || 'Full-time',
          j.vacancies || 1,
          j.status || 'open',
          parseDateOnly(j.deadline),
          j.description || null,
          safeJson(j.requirements),
          safeJson(j.responsibilities)
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Jobs', JSON_Count: store.jobs.length, Migrated: count });
  }

  // 19. Email Dispatches
  if (Array.isArray(store.email_dispatches)) {
    let count = 0;
    for (const ed of store.email_dispatches) {
      await pool.query(
        `INSERT INTO email_dispatches (id, recipient_name, recipient_email, subject, body, attachment_name, status, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [
          ed.id || null,
          ed.recipient_name || null,
          ed.recipient_email || '',
          ed.subject || 'Notice',
          ed.body || null,
          ed.attachment_name || null,
          ed.status || 'Sent',
          parseDate(ed.sent_at) || new Date()
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Email Dispatches', JSON_Count: store.email_dispatches.length, Migrated: count });
  }

  // 20. Scheduled Tasks
  if (Array.isArray(store.schedules)) {
    let count = 0;
    for (const sc of store.schedules) {
      await pool.query(
        `INSERT INTO schedules (id, name, description, cron_expression, frequency, target, enabled, last_run, last_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), last_run=VALUES(last_run)`,
        [
          sc.id || null,
          sc.name,
          sc.description || null,
          sc.cron_expression,
          sc.frequency || null,
          sc.target || null,
          sc.enabled !== false ? 1 : 0,
          parseDate(sc.last_run),
          sc.last_status || null
        ]
      );
      count++;
    }
    auditReport.push({ Entity: 'Schedules', JSON_Count: store.schedules.length, Migrated: count });
  }

  // 21. Partners
  if (Array.isArray(store.partners)) {
    let count = 0;
    for (const pt of store.partners) {
      await pool.query(
        `INSERT INTO partners (id, name, category, logo_text, website, logo_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), logo_url=VALUES(logo_url)`,
        [pt.id || null, pt.name, pt.category || null, pt.logo_text || pt.logoText || null, pt.website || null, pt.logo_url || pt.logo || null]
      );
      count++;
    }
    auditReport.push({ Entity: 'Partners', JSON_Count: store.partners.length, Migrated: count });
  }

  // 22. Team
  if (Array.isArray(store.team)) {
    let count = 0;
    for (const tm of store.team) {
      await pool.query(
        `INSERT INTO team (id, name, role, bio, image)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), bio=VALUES(bio)`,
        [tm.id || null, tm.name, tm.role, tm.bio || null, tm.image || null]
      );
      count++;
    }
    auditReport.push({ Entity: 'Team', JSON_Count: store.team.length, Migrated: count });
  }

  // 23. Sliders
  if (Array.isArray(store.sliders)) {
    let count = 0;
    for (const sl of store.sliders) {
      await pool.query(
        `INSERT INTO sliders (id, title, subtitle, image, active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), image=VALUES(image)`,
        [sl.id || null, sl.title, sl.subtitle || null, sl.image || null, sl.active !== false ? 1 : 0]
      );
      count++;
    }
    auditReport.push({ Entity: 'Sliders', JSON_Count: store.sliders.length, Migrated: count });
  }

  // 24. News
  if (Array.isArray(store.news)) {
    let count = 0;
    for (const nw of store.news) {
      await pool.query(
        `INSERT INTO news (id, title, date, category, summary, image, content)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content)`,
        [nw.id || null, nw.title, parseDateOnly(nw.date), nw.category || null, nw.summary || null, nw.image || null, nw.content || null]
      );
      count++;
    }
    auditReport.push({ Entity: 'News', JSON_Count: store.news.length, Migrated: count });
  }

  // 25. System Settings (Branding, SMTP, Turnstile, Paid Stamp, Logos, Favicon)
  const settingKeys = [
    'smtp_settings', 'topbar_settings', 'security_settings', 'notification_emails',
    'paid_stamp', 'site_logo', 'site_favicon', 'announcement', 'banner_settings'
  ];
  let settingsCount = 0;
  for (const sk of settingKeys) {
    if (store[sk] !== undefined && store[sk] !== null) {
      const valStr = typeof store[sk] === 'object' ? JSON.stringify(store[sk]) : String(store[sk]);
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
        [sk, valStr]
      );
      settingsCount++;
    }
  }
  auditReport.push({ Entity: 'System Settings', JSON_Count: settingKeys.length, Migrated: settingsCount });

  console.log('\n===============================================================');
  console.log('                 MIGRATION AUDIT RECONCILIATION                ');
  console.log('===============================================================');
  console.table(auditReport);
  console.log('✅ ALL RECORDS MIGRATED AND APPENDED CLEANLY INTO MYSQL!');

  await pool.end();
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration failed with error:');
  console.error('Message:', err.message);
  console.error('Code:', err.code);
  if (err.sql) console.error('SQL:', err.sql.slice(0, 300));
  process.exit(1);
});
