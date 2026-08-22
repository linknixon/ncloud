-- MySQL Seed Data Script for Nova Cloud Edges (U) Limited
USE nova_website;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE job_applications;
TRUNCATE TABLE jobs;
TRUNCATE TABLE products;
TRUNCATE TABLE services;
TRUNCATE TABLE subscriptions;
TRUNCATE TABLE contacts;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Admin User (Password: Admin@123456)
INSERT INTO users (id, name, email, password_hash, role, phone, company) VALUES
(1, 'Nova Admin', 'support@ncloud.co.ug', '$2a$10$wN9Q7Y5D8a9g.sXkK.L4c.0sQ1Kx1Y0gH0mH0mH0mH0mH0mH0mH0m', 'admin', '0790001631', 'Nova Cloud Edges (U) Ltd'),
(2, 'John Doe', 'john@example.com', '$2a$10$wN9Q7Y5D8a9g.sXkK.L4c.0sQ1Kx1Y0gH0mH0mH0mH0mH0mH0mH0m', 'customer', '+256 772 123 456', 'Acme Uganda');

-- Insert Services
INSERT INTO services (id, title, slug, summary, description, icon, features) VALUES
(1, 'Cloud Infrastructure & Hosting', 'cloud-infrastructure', 'Scalable, secure cloud edge servers and managed infrastructure tailored for modern enterprises.', 'Nova Cloud Edges delivers next-generation cloud infrastructure built for high performance, maximum uptime, and localized edge latency.', 'Cloud', '["99.99% Uptime SLA", "Automated backups", "Custom hybrid architecture", "24/7 Monitoring"]'),
(2, 'Enterprise Software & Accounting Solutions', 'enterprise-software', 'Official reseller and implementation partner for QuickBooks Enterprise and customized ERP systems.', 'We specialize in deploying, customizing, and training teams on world-class ERP software including Intuit QuickBooks Enterprise.', 'Cpu', '["Official QuickBooks License", "Custom financial workflows", "Localized tax compliance", "Staff training"]'),
(3, 'Zimbra Email Experts', 'zimbra-email', 'Enterprise Zimbra email server administration, migration, webmail, calendar, and high-deliverability anti-spam protection.', 'Take full control of your corporate communications with Zimbra Email Experts. Secure, fast, and feature-packed Zimbra email server management.', 'Mail', '["Zimbra Collaboration Suite administration", "ActiveSync mobile support", "Spam & virus filtering", "Shared calendars"]'),
(4, 'Cybersecurity & Edge Network Defense', 'cybersecurity', 'Proactive firewall protection, endpoint security, and compliance auditing for enterprise networks.', 'Safeguard your critical enterprise data against cyber threats with Nova Cloud Edges network defense services.', 'ShieldCheck', '["Next-Gen Firewall configuration", "Endpoint threat protection", "Vulnerability audits", "SOC monitoring"]'),
(5, 'Managed IT Services & Consultancy', 'managed-it-services', 'End-to-end IT support, network cabling, server management, and technology strategy.', 'Partner with Nova Cloud Edges as your dedicated IT department. We handle daily tech support and core infrastructure.', 'Server', '["On-site & remote 24/7 support", "Structured cabling & Wi-Fi", "Server administration", "IT Hardware procurement"]'),
(6, 'Internet of Things (IoT) & Local Edge Gateways', 'iot-edge-gateways', 'Deploy industrial IoT sensors, local edge gateway hardware, and real-time telemetry processing.', 'Nova Cloud Edges configures local edge gateway hardware to collect, process, and filter sensor data at the edge.', 'Radio', '["Industrial IoT sensor deployment", "Local Edge Gateway setup", "Real-time telemetry monitoring", "Low-latency MQTT/HTTP data streaming"]'),
(7, 'Data Analytics & Interactive Visualization', 'data-analytics-visualization', 'Transform raw enterprise data into actionable Business Intelligence dashboards and real-time charts.', 'We build custom BI dashboards, automated reporting pipelines, predictive models, and interactive charts.', 'BarChart3', '["Custom BI dashboard design", "Real-time data visualization", "ETL pipelines & data warehousing", "Predictive financial analytics"]'),
(8, 'Custom Software Development & Modern Tech Stacks', 'custom-software-development', 'Full-cycle custom web, mobile, and cloud software development using modern languages and frameworks.', 'Nova Cloud Edges builds scalable, high-performance web applications, enterprise microservices, REST/GraphQL APIs, and native mobile apps using modern technology stacks including React, TypeScript, Node.js, Python, Go, Rust.', 'Code2', '["Modern Full-Stack Web Development (React, Next.js, TypeScript)", "High-Performance Microservices & APIs (Python, Go, Rust)", "Cross-platform Mobile App Development", "Agile CI/CD & Cloud Containerization"]');

-- Insert Products
INSERT INTO products (id, name, slug, category, price, currency, badge, short_desc, description, image_url, stock) VALUES
(1, 'Intuit QuickBooks Enterprise Solutions v24.0', 'intuit-quickbooks-enterprise-solutions-v24-0', 'Digital Products', 3500000.00, 'UGX', 'Best Seller', 'Industry-leading ERP accounting software designed for growing businesses requiring up to 40 concurrent users.', 'Intuit QuickBooks Enterprise Solutions v24.0 gives you powerful control over financial management, inventory tracking, payroll processing, and custom reporting.', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', 50),
(2, 'Zimbra Enterprise Email Package (10 Users)', 'zimbra-email-package', 'Digital Products', 450000.00, 'UGX', 'Popular', 'Annual subscription for 10 corporate Zimbra mailboxes with 25GB storage per user, shared calendar and webmail.', 'Zimbra Enterprise Email Package includes 10 custom domain email accounts with 25GB quota each, Zimbra webmail suite, Microsoft Outlook & mobile sync.', 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800&q=80', 100),
(3, 'Nova Cloud Edge VPS Server (Standard)', 'cloud-vps-standard', 'Cloud Services', 280000.00, 'UGX', 'Featured', '4 vCPU, 8GB RAM, 100GB NVMe SSD Cloud Virtual Private Server hosted in Kampala Edge Datacenter.', 'High-performance Cloud VPS featuring ultra-fast NVMe storage, dedicated IPv4 address, automated daily snapshots, full root access.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80', 30),
(4, 'Sophos Next-Gen Firewall Appliance', 'sophos-firewall-appliance', 'Hardware & Security', 4200000.00, 'UGX', 'Enterprise', 'Hardware firewall appliance with Xstream Architecture, deep packet inspection, and web filtering.', 'Robust cybersecurity hardware for medium and large offices. Provides AI-powered threat detection, SSL/TLS inspection, SD-WAN site-to-site connectivity.', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', 12);

-- Insert Jobs
INSERT INTO jobs (id, title, slug, department, location, type, vacancies, status, deadline, description, requirements, responsibilities) VALUES
(1, 'Assistant Office Attendant (1)', 'assistant-office-attendant', 'Administration & Operations', 'Kampala, Uganda', 'Full-time', 1, 'open', '2026-09-30', 'Nova Cloud Edges (U) Limited is looking for a dedicated and energetic Assistant Office Attendant to support our day-to-day office operations, client hospitality, document coordination, and administrative functions.', '["UCE or Diploma in Office Management", "1-2 years corporate office experience", "Good communication in English and Luganda", "Computer literate"]', '["Welcome visitors and clients", "Maintain office cleanliness", "Manage mail and supply deliveries", "Assist with document scanning and filing"]'),
(2, 'Cloud Systems & DevOps Engineer', 'cloud-systems-engineer', 'Engineering & Cloud Infrastructure', 'Kampala, Uganda', 'Full-time', 2, 'open', '2026-10-15', 'Join Nova Cloud Edges technical team to design, maintain, and automate our cloud hosting infrastructure, virtualized edge nodes, and Kubernetes clusters.', '["BSc in CS or IT", "3+ years Linux admin experience", "Hands-on MySQL tuning & Docker", "Cloud certifications are a plus"]', '["Manage cloud hosts", "Implement CI/CD and backups", "Monitor infrastructure 24/7"]');

-- Insert Initial Contact Message
INSERT INTO contacts (id, name, email, phone, subject, message, status) VALUES
(1, 'Sarah Kaggwa', 'sarah@business.co.ug', '+256 782 999 111', 'Inquiry regarding QuickBooks Enterprise v24.0', 'Hello Nova Team, We are interested in purchasing 5 user licenses for QuickBooks Enterprise. Kindly send us a formal quote.', 'new');
