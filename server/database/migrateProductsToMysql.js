import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Complete Master Products Catalog
export const MASTER_PRODUCTS = [
  // Hosting Services & Cloud
  {
    id: 4,
    name: 'Nova Cloud Edge VPS Server (Standard)',
    slug: 'cloud-vps-standard',
    category: 'Hosting Services',
    price: 250000.00,
    currency: 'UGX',
    badge: 'Featured',
    short_desc: '4 vCPU, 8GB RAM, 100GB NVMe SSD Cloud Virtual Private Server hosted in Kampala Edge Datacenter.',
    description: 'High-performance Sovereign Cloud VPS featuring ultra-fast NVMe storage, dedicated IPv4 address, automated daily snapshots, full root access, and low latency direct peering in Kampala.',
    specs: { vcpu: '4 vCPU Cores', ram: '8GB DDR4 RAM', storage: '100GB NVMe SSD', bandwidth: 'Unmetered 1Gbps Uplink', ip: '1 Dedicated IPv4' },
    details: { os: 'Ubuntu, Debian, AlmaLinux, Windows Server', backup: 'Automated Daily Snapshots', support: '24/7 NOC Monitoring' },
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    stock: 30,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },
  {
    id: 3,
    name: 'Data Center Colocation Management & Rack Hosting (1U Rack Unit)',
    slug: 'colocation-management-1u',
    category: 'Hosting Services',
    price: 650000.00,
    currency: 'UGX',
    badge: 'Infrastructure',
    short_desc: 'Secure 1U server colocation hosting in high-security Tier III Data Center with dual A+B power feeds and gigabit bandwidth.',
    description: 'Enterprise rack space in Tier III datacenter facility with 99.99% uptime guarantee, biometric access control, fire suppression, precision cooling, and direct BGP IP transit.',
    specs: { space: '1U Rack Unit Space', power: 'Dual A+B Redundant Power Feeds', cooling: 'N+1 Precision Climate Control', network: '100Mbps Dedicated Bandwidth' },
    details: { remote_hands: 'Basic Remote Hands Included', security: '24/7 CCTV & Biometric Access', sla: '99.99% Guaranteed SLA' },
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    stock: 20,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },
  {
    id: 21,
    name: 'Cloud Web Hosting - Starter Plan',
    slug: 'cloud-web-hosting-starter',
    category: 'Hosting Services',
    price: 45000.00,
    currency: 'UGX',
    badge: 'Starter',
    short_desc: '10GB NVMe SSD, cPanel, 5 Corporate Emails, Free SSL Certificate',
    description: 'Reliable cloud-hosted shared web hosting with cPanel control panel, 10GB high-speed NVMe storage, 5 business email mailboxes, automated weekly backups, and 99.9% uptime SLA.',
    specs: { storage: '10GB NVMe SSD', bandwidth: 'Unmetered', cpanel: 'cPanel Control Panel', emails: '5 Business Email Accounts', ssl: 'Free AutoSSL Certificate' },
    details: { php: 'PHP 7.4 - 8.3 Multi-Version', database: 'Unlimited MySQL Databases', backup: 'Weekly Automated Backups' },
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    stock: 100,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },
  {
    id: 22,
    name: 'Cloud Web Hosting - Professional Plan',
    slug: 'cloud-web-hosting-professional',
    category: 'Hosting Services',
    price: 95000.00,
    currency: 'UGX',
    badge: 'Popular',
    short_desc: '30GB NVMe SSD, cPanel, 25 Corporate Emails, Free SSL, Daily Backups',
    description: 'Designed for growing commercial websites and SMEs. Includes 30GB NVMe SSD storage, cPanel administration, 25 corporate email mailboxes, daily automated backups, and 24/7 technical monitoring.',
    specs: { storage: '30GB NVMe SSD', bandwidth: 'Unmetered', cpanel: 'cPanel Control Panel', emails: '25 Business Email Accounts', ssl: 'Free Wildcard SSL' },
    details: { php: 'PHP 7.4 - 8.3 Multi-Version', database: 'Unlimited MySQL Databases', backup: 'Daily Automated Backups' },
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    stock: 100,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },
  {
    id: 23,
    name: 'Cloud Web Hosting - Enterprise Plan',
    slug: 'cloud-web-hosting-enterprise',
    category: 'Hosting Services',
    price: 180000.00,
    currency: 'UGX',
    badge: 'Enterprise',
    short_desc: '100GB NVMe SSD, cPanel, Unlimited Emails, Dedicated IP, Priority Support',
    description: 'High-capacity web hosting for high-traffic enterprise portals. Includes 100GB NVMe SSD, dedicated IPv4 address, unlimited business email accounts, Redis caching, and priority 24/7 NOC support.',
    specs: { storage: '100GB NVMe SSD', bandwidth: 'Unmetered', cpanel: 'cPanel Control Panel', emails: 'Unlimited Accounts', ip: '1 Dedicated IPv4' },
    details: { caching: 'Redis & Memcached Support', security: 'WAF & DDoS Mitigation', support: 'Priority 24/7 Phone & Ticket NOC' },
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    stock: 100,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },
  {
    id: 12,
    name: 'Unifi Controller Cloud Hosting',
    slug: 'unifi-controller-managed',
    category: 'Hosting Services',
    price: 20000.00,
    currency: 'UGX',
    badge: 'Popular',
    short_desc: 'Cloud-based UniFi controller hosting for campus networks and hotspots.',
    description: 'Cloud-based Unifi controller hosting with mobile app access, multi-site management, automated backup snapshots, hotspot captive portal engine, and token usage analytics.',
    specs: { sites: 'Unlimited UniFi Access Points', captive_portal: 'Custom Voucher & Radius Engine', uptime: '99.99% Hosted SLA' },
    details: { app_access: 'iOS & Android UniFi App Compatible', alerts: 'Instant Device Disconnect Notifications' },
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpcyYqeV5xn8MVR0ALss9D2SLQDX3vY0XS7iCwpfNm9gJRdGYuIdzRFpGp&s=10',
    stock: 62,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },
  {
    id: 2,
    name: 'Zimbra Enterprise Email Package (10 Users)',
    slug: 'zimbra-email-package',
    category: 'Hosting Services',
    price: 6500.00,
    currency: 'UGX',
    badge: 'Popular',
    short_desc: 'Annual subscription for 10 corporate Zimbra mailboxes with 25GB storage per user.',
    description: 'Zimbra Enterprise Email Package includes 10 custom domain email accounts with 25GB quota each, Zimbra webmail suite, Microsoft Outlook & mobile sync, and anti-spam filtering.',
    specs: { accounts: '10 Corporate Mailboxes', quota: '25GB per Mailbox', protocol: 'IMAP / POP3 / ActiveSync' },
    details: { webmail: 'Modern Zimbra Web Client', antispam: 'Built-in SpamAssassin & ClamAV Engine' },
    image_url: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800&q=80',
    stock: 100,
    is_hidden: 0,
    checkout_type: 'hosting',
    checkout_flow: 'hosting'
  },

  // Domain Names
  {
    id: 17,
    name: 'Domain Name Registration',
    slug: 'domain-name-registration',
    category: 'Domain Names',
    price: 95000.00,
    currency: 'UGX',
    badge: 'Top Level',
    short_desc: 'Official .ug / .co.ug / .com / .org domain name registration and DNS hosting.',
    description: 'Secure your corporate digital identity. Includes full DNS zone management, WHOIS privacy protection where eligible, automated renewal reminders, and fast activation.',
    specs: { tlds: '.ug, .co.ug, .org.ug, .com, .org, .net', dns: 'Managed Anycast DNS Included' },
    details: { nameservers: 'ns1.ncloud.co.ug, ns2.ncloud.co.ug', renewal: 'Annual Renewal Notice' },
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    stock: 100,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },

  // WiFi Vouchers & Hotspot Passes
  {
    id: 101,
    name: 'WiFi Voucher - 12 Hours',
    slug: 'wifi-voucher-12-hours',
    category: 'WiFi Vouchers',
    price: 800.00,
    currency: 'UGX',
    badge: '12h Pass',
    short_desc: '12 hours of high-speed guest WiFi access.',
    description: 'Instant 12-hour high-speed guest WiFi token. Single-device access, low latency, unlimited data quota on Nova Hotspot Network.',
    specs: { duration: '12 Hours Uninterrupted', devices: '1 Device per Token', speed: 'Up to 20Mbps High Speed' },
    details: { delivery: 'Instant SMS & Email Token Delivery', support: '24/7 Hotspot Support' },
    image_url: 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 102,
    name: 'WiFi Voucher - 24 Hours',
    slug: 'wifi-voucher-24-hours',
    category: 'WiFi Vouchers',
    price: 1400.00,
    currency: 'UGX',
    badge: 'Daily Pass',
    short_desc: '24 hours of high-speed guest WiFi access.',
    description: 'Instant 24-hour high-speed guest WiFi token. Stay connected all day with zero data caps and rapid captive portal login.',
    specs: { duration: '24 Hours Uninterrupted', devices: '1 Device per Token', speed: 'Up to 25Mbps High Speed' },
    details: { delivery: 'Instant SMS & Email Token Delivery', support: '24/7 Hotspot Support' },
    image_url: 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 103,
    name: 'WiFi Voucher - 48 Hours',
    slug: 'wifi-voucher-48-hours',
    category: 'WiFi Vouchers',
    price: 2500.00,
    currency: 'UGX',
    badge: 'Weekend Pass',
    short_desc: '48 hours of high-speed guest WiFi access.',
    description: 'Best value for 2 full days of uninterrupted high-speed internet access on our campus network.',
    specs: { duration: '48 Hours Uninterrupted', devices: '1 Device per Token', speed: 'Up to 30Mbps High Speed' },
    details: { delivery: 'Instant SMS & Email Token Delivery', support: '24/7 Hotspot Support' },
    image_url: 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 104,
    name: 'WiFi Voucher - 7 Days',
    slug: 'wifi-voucher-7-days',
    category: 'WiFi Vouchers',
    price: 6000.00,
    currency: 'UGX',
    badge: 'Weekly Pass',
    short_desc: '7 days of high-speed guest WiFi access.',
    description: 'Perfect for weekly stays or extended visitors. Enjoy 7 days of unlimited high-speed guest WiFi access.',
    specs: { duration: '7 Days Uninterrupted', devices: '1 Device per Token', speed: 'Up to 30Mbps High Speed' },
    details: { delivery: 'Instant SMS & Email Token Delivery', support: '24/7 Hotspot Support' },
    image_url: 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 105,
    name: 'WiFi Voucher - 30 Days',
    slug: 'wifi-voucher-30-days',
    category: 'WiFi Vouchers',
    price: 25000.00,
    currency: 'UGX',
    badge: 'Monthly Pass',
    short_desc: '30 days of high-speed guest WiFi access.',
    description: 'Enjoy a full month of uninterrupted high-speed internet access on our corporate guest network.',
    specs: { duration: '30 Days Uninterrupted', devices: '1 Device per Token', speed: 'Up to 35Mbps High Speed' },
    details: { delivery: 'Instant SMS & Email Token Delivery', support: '24/7 Hotspot Support' },
    image_url: 'https://png.pngtree.com/recommend-works/png-clipart/20241002/ourmid/pngtree-free-wifi-zone-png-image_13999170.png',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },

  // Hardware & Security
  {
    id: 5,
    name: 'Sophos Next-Gen Firewall Appliance',
    slug: 'sophos-firewall-appliance',
    category: 'Hardware & Security',
    price: 4200000.00,
    currency: 'UGX',
    badge: 'Enterprise',
    short_desc: 'Hardware firewall appliance with Xstream Architecture, deep packet inspection, and web filtering.',
    description: 'Robust cybersecurity hardware for medium and large offices. Provides AI-powered threat detection, SSL/TLS inspection, SD-WAN site-to-site connectivity, and zero-day protection.',
    specs: { throughput: '10Gbps Firewall Throughput', ports: '8x GbE Copper + 2x SFP Fiber', form_factor: '1U Rackmount' },
    details: { warranty: '1 Year Manufacturer Warranty Included', support: 'Onsite Installation & Config by Nova Engineers' },
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
    stock: 12,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 6,
    name: 'Ubiquiti Unifi Mesh Access Point Pole-mountable wireless access point',
    slug: 'unifi-mesh-access-points',
    category: 'Hardware & Security',
    price: 580000.00,
    currency: 'UGX',
    badge: 'Popular',
    short_desc: 'High-performance outdoor/indoor UniFi Mesh Wi-Fi access point with 802.11ac dual-band technology.',
    description: 'Ubiquiti UniFi AC Mesh AP (UAP-AC-M) provides high-performance, outdoor/indoor dual-band 802.11AC Wi-Fi with adjustable dual-band omni-directional antennas and 2x2 MIMO technology.',
    specs: { standard: '802.11 a/b/g/n/ac Dual Band', coverage: 'Up to 183m Range', power: '24V Passive PoE or 802.3af' },
    details: { mounting: 'Wall, Pole, and Fast-Mount Included', environment: 'Indoor / Outdoor Weatherproof' },
    image_url: 'https://m.media-amazon.com/images/I/41KxZk3K8OL._AC_UF894,1000_QL80_.jpg',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 13,
    name: 'Network Cable Cat 6E',
    slug: 'network-cable-cat-6e',
    category: 'Hardware & Security',
    price: 995000.00,
    currency: 'UGX',
    badge: 'Popular',
    short_desc: 'Giganet Cable Category 6A Solid U/UTP LDPE 305m Drum for outdoor/indoor installations.',
    description: 'The Giganet Cable Category 6A Solid U/UTP LDPE is a premium networking solution built for both speed and reliability. Complies with Cat6A standards, supports data speeds of up to 10Gbps and bandwidth of 500MHz with LDPE jacket.',
    specs: { length: '305 Meters (1,000 ft)', gauge: '23 AWG Solid Bare Copper', frequency: '500MHz Bandwidth' },
    details: { jacket: 'Weatherproof LDPE Outdoor/Indoor Jacket', compliance: 'ANSI/TIA-568-C.2 Cat6A Certified' },
    image_url: 'https://starmount.co.ke/wp-content/uploads/2026/04/gn-coa-u-utp-ldde.webp',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },

  // Software & Licenses
  {
    id: 1,
    name: 'Intuit QuickBooks Enterprise Solutions v24.0',
    slug: 'intuit-quickbooks-enterprise-solutions-v24-0',
    category: 'Software & Licenses',
    price: 70000.00,
    currency: 'UGX',
    badge: 'Best Seller',
    short_desc: 'Industry-leading ERP accounting software designed for growing businesses requiring multi-user access.',
    description: 'Intuit QuickBooks Enterprise Solutions v24.0 gives you powerful control over financial management, inventory tracking, payroll processing, and custom reporting with local multi-user support.',
    specs: { edition: 'QuickBooks Enterprise v24.0', deployment: 'On-Premise or Hosted Cloud Edge Server' },
    details: { training: 'Free 2-Hour Administrator Onboarding', updates: '1-Year Product Updates Included' },
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  },
  {
    id: 16,
    name: 'Capacity Building and Trainings',
    slug: 'capacity-building-and-trainings',
    category: 'Software & Licenses',
    price: 1800000.00,
    currency: 'UGX',
    badge: 'Enterprise Training',
    short_desc: 'Corporate training modules on cloud systems administration, cybersecurity awareness, and ERP tools.',
    description: 'Tailored on-site and virtual training programs conducted by senior Nova Cloud Edges engineers for institutional IT staff and end-users.',
    specs: { format: 'Onsite / Virtual Interactive Workshops', duration: 'Full Day Intensive (8 Hours)' },
    details: { certification: 'Certificate of Completion Issued', materials: 'Full Course Handouts & Lab Access Provided' },
    image_url: 'https://clue4evidence.com/wp-content/uploads/2024/05/Daco_6119690-1200x1200.png',
    stock: 50,
    is_hidden: 0,
    checkout_type: 'shop',
    checkout_flow: 'shop'
  }
];

export const MASTER_CATEGORIES = [
  { id: 1, name: 'Hosting Services', slug: 'hosting-services', description: 'Cloud VPS, Dedicated Edge Servers, Web & Email Hosting' },
  { id: 2, name: 'Domain Names', slug: 'domain-names', description: 'Top-Level Domain Registrations (.ug, .co.ug, .com)' },
  { id: 3, name: 'WiFi Vouchers', slug: 'wifi-vouchers', description: 'High-speed guest WiFi passes and hotspot access tokens' },
  { id: 4, name: 'Hardware & Security', slug: 'hardware-security', description: 'UniFi Access Points, Firewalls, Cables, CCTV' },
  { id: 5, name: 'Software & Licenses', slug: 'software-licenses', description: 'Enterprise ERP, QuickBooks, Moodle, Trainings' }
];

export async function runProductMigration() {
  console.log('===============================================================');
  console.log('      NOVA CLOUD EDGES - MASTER PRODUCTS MYSQL MIGRATION        ');
  console.log('===============================================================');

  const isMac = process.platform === 'darwin';
  const isMamp = isMac && (fs.existsSync('/Applications/MAMP') || fs.existsSync('/Applications/MAMP/tmp/mysql'));
  
  const host = process.env.DB_HOST || (isMamp ? '127.0.0.1' : 'localhost');
  const port = Number(process.env.DB_PORT) || (isMamp ? 8889 : 3306);
  const user = process.env.DB_USER || (isMamp ? 'root' : 'root');
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (isMamp ? 'root' : '');
  const database = process.env.DB_NAME || (isMamp ? 'nova_website' : 'nova_website');

  console.log(`[Database] Connecting to ${user}@${host}:${port}/${database}...`);
  
  let pool;
  try {
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
    console.log(`[Database] Connected successfully!`);
  } catch (err) {
    console.error(`[Database Error] Could not connect to MySQL:`, err.message);
    process.exit(1);
  }

  // 1. Migrate Categories
  console.log('\n[1/3] Syncing Product Categories...');
  for (const cat of MASTER_CATEGORIES) {
    await pool.query(
      `INSERT INTO product_categories (name, slug, description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE description=VALUES(description), slug=VALUES(slug)`,
      [cat.name, cat.slug, cat.description]
    );
    console.log(`  ✓ Category: ${cat.name}`);
  }

  // 2. Migrate Products
  console.log('\n[2/3] Syncing Master Products (Web Hosting, VPS, Domains, WiFi Vouchers, Hardware)...');
  for (const p of MASTER_PRODUCTS) {
    await pool.query(
      `INSERT INTO products (name, slug, category, price, currency, badge, short_desc, description, specs, details, image_url, stock, is_hidden, checkout_type, checkout_flow)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name=VALUES(name),
         category=VALUES(category),
         price=VALUES(price),
         currency=VALUES(currency),
         badge=VALUES(badge),
         short_desc=VALUES(short_desc),
         description=VALUES(description),
         specs=VALUES(specs),
         details=VALUES(details),
         image_url=VALUES(image_url),
         stock=VALUES(stock),
         is_hidden=VALUES(is_hidden),
         checkout_type=VALUES(checkout_type),
         checkout_flow=VALUES(checkout_flow)`,
      [
        p.name,
        p.slug,
        p.category,
        p.price,
        p.currency || 'UGX',
        p.badge || null,
        p.short_desc || null,
        p.description || null,
        JSON.stringify(p.specs || {}),
        JSON.stringify(p.details || {}),
        p.image_url || null,
        p.stock !== undefined ? p.stock : 50,
        p.is_hidden ? 1 : 0,
        p.checkout_type || 'shop',
        p.checkout_flow || 'shop'
      ]
    );
    console.log(`  ✓ Product: [${p.category}] ${p.name} (UGX ${p.price.toLocaleString()})`);
  }

  // 3. Update persistentStore.json & seedData.json snapshots
  console.log('\n[3/3] Updating local disk snapshots (persistentStore.json and seedData.json)...');
  const storePath = path.join(__dirname, 'persistentStore.json');
  if (fs.existsSync(storePath)) {
    try {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      store.products = MASTER_PRODUCTS;
      store.product_categories = MASTER_CATEGORIES;
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
      console.log(`  ✓ Updated persistentStore.json with ${MASTER_PRODUCTS.length} products`);
    } catch (e) {
      console.warn('  ⚠️ Note updating persistentStore.json:', e.message);
    }
  }

  const seedPath = path.join(__dirname, 'seedData.json');
  if (fs.existsSync(seedPath)) {
    try {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      seed.products = MASTER_PRODUCTS;
      seed.product_categories = MASTER_CATEGORIES;
      fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), 'utf8');
      console.log(`  ✓ Updated seedData.json with ${MASTER_PRODUCTS.length} products`);
    } catch (e) {
      console.warn('  ⚠️ Note updating seedData.json:', e.message);
    }
  }

  await pool.end();
  console.log('\n===============================================================');
  console.log('✅ PRODUCT MIGRATION COMPLETE: All products are active in MySQL!');
  console.log('===============================================================');
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('migrateProductsToMysql.js')) {
  runProductMigration().catch(err => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  });
}
