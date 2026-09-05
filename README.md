# Nova Cloud Edges (U) Limited Web Application

Official web application for **Nova Cloud Edges (U) Limited** — Uganda's premier provider of cloud infrastructure, edge server hosting, Intuit QuickBooks ERP, Zimbra Email server management, and cybersecurity defense.

Repository: `git@github.com:linknixon/ncloud.git`

---

## Key Features & Highlights

- **Dynamic Digital Shop**: Enterprise software licenses and cloud hosting packages (`QuickBooks Enterprise`, `Zimbra Email Experts`, `Colocation 1U Rack Space`, `Edge VPS`, `Sophos Firewalls`).
- **Subscription Renewal Portal**:
  - Multi-package checkbox selection for renewing multiple services simultaneously.
  - Flexible billing cycles (`6 Months`, `1 Year`, `2 Years`).
  - Optional **18% Value Added Tax (VAT)** calculation for official tax invoices.
- **Careers & Job Application Modal**: Vacancies portal with multi-document upload support (CV, Cover Letter, Academic Certificates).
- **Core Services Catalog**: 10-item pagination, search filtering, quote request form, and direct software ordering.
- **System Maintenance Banner**: Top alert banner with `New!!` feature badge for scheduled cloud infrastructure updates.
- **Corporate Transparency**: ISO 27001 / ISO 9001 compliance standards, Executive Leadership team gallery, and Expert Cyber Security Team spotlight.
- **Resilient Backend Architecture**: Express REST API backed by MySQL pool (`mysql2/promise`) with automatic zero-downtime fallback to JSON storage if MySQL is offline.

---

## Technology Stack

- **Frontend**: React 18, Vite 8, Vanilla CSS (Design Tokens & Glassmorphism), Lucide Icons, Google Sans Typography.
- **Backend**: Node.js, Express.js REST API.
- **Database**: MySQL 8.0 (schema in `server/database/schema.sql`).
- **Build System**: Vite Production Bundler (`npm run build`).

---

## Prerequisites

Make sure you have the following installed on your server:

- **Node.js**: `v18.x` or `v20.x` LTS
- **npm**: `v9.x` or higher
- **MySQL**: `v8.0` (Optional; app includes fallback memory storage)
- **Nginx** (For production reverse proxy and SSL termination)
- **PM2** (For Node.js process management)

---

## Local Development Setup

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:linknixon/ncloud.git
   cd ncloud
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Initialization (Optional)**:
   Import the schema and seed data into your local MySQL server:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nova_cloud_db;"
   mysql -u root -p nova_cloud_db < server/database/schema.sql
   mysql -u root -p nova_cloud_db < server/database/seed.sql
   ```

4. **Environment Variables**:
   Create a `.env` file in the root directory (optional, defaults provided):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=nova_cloud_db
   ```

5. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend**: `http://localhost:3000/`
   - **Backend API**: `http://localhost:5000/`

---

## Production Build & Hosting Guide

### Method 1: Nginx + PM2 Node Server (Recommended for Linux/Ubuntu VPS)

#### Step 1: Create Production Bundle
```bash
npm run build
```
This generates optimized static assets inside the `dist/` directory.

#### Step 2: Start Backend Server via PM2
```bash
npm install -g pm2
pm2 start server/server.js --name "nova-backend"
pm2 save
pm2 startup
```

#### Step 3: Configure Nginx Virtual Host
Create `/etc/nginx/sites-available/nova-cloud`:

```nginx
server {
    listen 80;
    server_name ncloud.co.ug www.ncloud.co.ug;

    # Static Frontend Files
    root /var/www/ncloud/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to Express Backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site & restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/nova-cloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 4: Install Free SSL Certificate (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ncloud.co.ug -d www.ncloud.co.ug
```

---

### Method 2: Systemd Service Deployment

Create `/etc/systemd/system/nova-cloud.service`:

```ini
[Unit]
Description=Nova Cloud Edges Express Backend Server
After=network.target mysql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/ncloud
ExecStart=/usr/bin/node server/server.js
Restart=always
Environment=NODE_ENV=production PORT=5000 DB_HOST=localhost DB_USER=root DB_NAME=nova_cloud_db

[Install]
WantedBy=multi-user.target
```

Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable nova-cloud
sudo systemctl start nova-cloud
```

---

## Support & Contacts

- **Email**: `support@ncloud.co.ug`
- **Phone**: `0790001631`
- **Address**: Lugga Zone, Ndejje, Wakiso, Uganda
- **Company**: Nova Cloud Edges (U) Limited
