-- ==============================================================================
-- MySQL Enterprise Database Schema for Nova Cloud Edges (U) Limited
-- Database: nova_website
-- Supports: Localhost MAMP & Remote Production Enterprise Datacenter
-- ==============================================================================

-- 1. Roles & Permissions Table
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    badge_color VARCHAR(50) DEFAULT '#2563eb',
    description TEXT NULL,
    user_count INT DEFAULT 0,
    permissions JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    position VARCHAR(100) NULL,
    title VARCHAR(100) NULL,
    phone VARCHAR(50) NULL,
    company VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'active',
    is_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(255) NULL,
    verification_expires DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Services Table
CREATE TABLE IF NOT EXISTS services (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary TEXT NULL,
    description LONGTEXT NULL,
    icon VARCHAR(100) NULL,
    features JSON NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Products Table (Shop)
CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) DEFAULT 'Digital Products',
    price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'UGX',
    badge VARCHAR(50) NULL,
    short_desc TEXT NULL,
    description LONGTEXT NULL,
    specs JSON NULL,
    details JSON NULL,
    image_url LONGTEXT NULL,
    stock INT DEFAULT 100,
    is_hidden TINYINT(1) DEFAULT 0,
    checkout_type VARCHAR(50) DEFAULT 'direct',
    checkout_flow VARCHAR(50) DEFAULT 'standard',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_category (category),
    INDEX idx_product_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NULL,
    customer_address TEXT NULL,
    company VARCHAR(255) NULL,
    item_name TEXT NULL,
    plan_name TEXT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending',
    due_date DATE NULL,
    duration VARCHAR(100) NULL,
    reference VARCHAR(255) NULL,
    payment_method VARCHAR(100) NULL,
    include_vat TINYINT(1) DEFAULT 0,
    vat_exempt TINYINT(1) DEFAULT 0,
    vat_amount DECIMAL(15, 2) DEFAULT 0.00,
    items JSON NULL,
    shareable_url TEXT NULL,
    notes LONGTEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_invoice_num (invoice_number),
    INDEX idx_invoice_email (customer_email),
    INDEX idx_invoice_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Payments Table (Receipts & Transactions)
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_type VARCHAR(50) DEFAULT 'incoming',
    invoice_number VARCHAR(100) NULL,
    party_name VARCHAR(255) NOT NULL,
    party_email VARCHAR(255) NULL,
    amount_due DECIMAL(15, 2) DEFAULT 0.00,
    amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    excess_amount DECIMAL(15, 2) DEFAULT 0.00,
    payment_method VARCHAR(100) DEFAULT 'Cash',
    reference VARCHAR(150) NULL,
    status VARCHAR(50) DEFAULT 'Completed',
    date DATE NULL,
    payment_date DATE NULL,
    created_at_time VARCHAR(50) NULL,
    updated_by VARCHAR(255) NULL,
    total_refunded DECIMAL(15, 2) DEFAULT 0.00,
    refund_amount DECIMAL(15, 2) DEFAULT 0.00,
    refund_reason TEXT NULL,
    refunded_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pay_invoice (invoice_number),
    INDEX idx_pay_ref (reference),
    INDEX idx_pay_email (party_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    plan_name TEXT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NULL,
    customer_address TEXT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'UGX',
    duration VARCHAR(50) DEFAULT 'Monthly',
    billing_cycle VARCHAR(50) DEFAULT 'Monthly',
    status VARCHAR(50) DEFAULT 'active',
    reference VARCHAR(255) NULL,
    invoice_number VARCHAR(100) NULL,
    start_date DATE NULL,
    expiry_date DATE NULL,
    reminders_sent JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sub_email (customer_email),
    INDEX idx_sub_status (status),
    INDEX idx_sub_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quote_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NULL,
    company VARCHAR(255) NULL,
    valid_until DATE NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    items JSON NULL,
    subtotal DECIMAL(15, 2) DEFAULT 0.00,
    vat_exempt TINYINT(1) DEFAULT 0,
    vat_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    notes TEXT NULL,
    converted_invoice_number VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quote_num (quote_number),
    INDEX idx_quote_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Work Orders Table
CREATE TABLE IF NOT EXISTS work_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    task_title VARCHAR(255) NOT NULL,
    client_site VARCHAR(255) NULL,
    assigned_staff_id BIGINT NULL,
    assigned_staff_name VARCHAR(255) NULL,
    assigned_staff_email VARCHAR(255) NULL,
    charging_mode VARCHAR(50) DEFAULT 'Fixed',
    rate DECIMAL(15, 2) DEFAULT 0.00,
    quantity INT DEFAULT 1,
    total_cost DECIMAL(15, 2) DEFAULT 0.00,
    scheduled_date DATE NULL,
    completion_date DATE NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wo_num (order_number),
    INDEX idx_wo_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Delivery Notes Table
CREATE TABLE IF NOT EXISTS delivery_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dn_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_id BIGINT NULL,
    invoice_number VARCHAR(100) NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(50) NULL,
    delivery_address TEXT NULL,
    carrier VARCHAR(100) NULL,
    tracking_code VARCHAR(100) NULL,
    dispatch_officer VARCHAR(255) NULL,
    delivery_date DATE NULL,
    status VARCHAR(50) DEFAULT 'Dispatched',
    payment_status VARCHAR(50) DEFAULT 'Paid',
    items JSON NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dn_num (dn_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Staff Expenses Table
CREATE TABLE IF NOT EXISTS staff_expenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(255) NOT NULL,
    staff_email VARCHAR(255) NOT NULL,
    supervisor_name VARCHAR(255) NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    receipt_ref VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    approved_by VARCHAR(255) NULL,
    approved_at DATETIME NULL,
    date DATE NULL,
    work_order_ref VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_exp_staff (staff_email),
    INDEX idx_exp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Customer Credits Table
CREATE TABLE IF NOT EXISTS customer_credits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL UNIQUE,
    company VARCHAR(255) NULL,
    available_credit DECIMAL(15, 2) DEFAULT 0.00,
    history JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_credit_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    branch VARCHAR(255) NULL,
    swift_code VARCHAR(100) NULL,
    currency VARCHAR(10) DEFAULT 'UGX',
    is_primary TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. UniFi Wi-Fi Vouchers Table
CREATE TABLE IF NOT EXISTS unifi_vouchers (
    id VARCHAR(100) NOT NULL PRIMARY KEY,
    token VARCHAR(100) NOT NULL UNIQUE,
    package_name VARCHAR(100) NULL,
    duration_hours INT DEFAULT 24,
    duration_label VARCHAR(100) NULL,
    data_quota_mb INT DEFAULT 0,
    data_label VARCHAR(100) NULL,
    data_limit VARCHAR(100) NULL,
    status VARCHAR(50) DEFAULT 'Active',
    source VARCHAR(50) DEFAULT 'manual',
    invoice_id VARCHAR(100) NULL,
    customer_name VARCHAR(255) NULL,
    customer_email VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    dispatched_at DATETIME NULL,
    INDEX idx_voucher_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Forensic Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NULL,
    user_name VARCHAR(255) NULL,
    user_role VARCHAR(50) NULL,
    action VARCHAR(150) NOT NULL,
    resource_type VARCHAR(100) NULL,
    resource_id VARCHAR(150) NULL,
    details JSON NULL,
    ip_address VARCHAR(100) NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_action (action),
    INDEX idx_audit_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Careers / Jobs Openings Table
CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100) NULL,
    location VARCHAR(100) DEFAULT 'Kampala, Uganda',
    type VARCHAR(50) DEFAULT 'Full-time',
    vacancies INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'open',
    deadline DATE NULL,
    description LONGTEXT NULL,
    requirements JSON NULL,
    responsibilities JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    experience_years VARCHAR(50) NULL,
    resume_url TEXT NULL,
    cover_letter TEXT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    stage VARCHAR(50) DEFAULT 'level1',
    comments TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_app_job (job_id),
    INDEX idx_app_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Automated Email Dispatches Log
CREATE TABLE IF NOT EXISTS email_dispatches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_name VARCHAR(255) NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body LONGTEXT NULL,
    attachment_name VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Sent',
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_recipient (recipient_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Scheduled Background Tasks Table
CREATE TABLE IF NOT EXISTS schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NULL,
    target VARCHAR(255) NULL,
    enabled TINYINT(1) DEFAULT 1,
    last_run DATETIME NULL,
    last_status VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Technology Partners Table
CREATE TABLE IF NOT EXISTS partners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL,
    logo_text VARCHAR(255) NULL,
    website TEXT NULL,
    logo_url LONGTEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Leadership & Expert Team Table
CREATE TABLE IF NOT EXISTS team (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    bio TEXT NULL,
    image LONGTEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Homepage Sliders Table
CREATE TABLE IF NOT EXISTS sliders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT NULL,
    image LONGTEXT NULL,
    btn1_text VARCHAR(100) DEFAULT 'Explore Services',
    btn1_link VARCHAR(255) DEFAULT 'services',
    btn2_text VARCHAR(100) DEFAULT 'Colocation & Software',
    btn2_link VARCHAR(255) DEFAULT 'shop',
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Tech Advisories & News Table
CREATE TABLE IF NOT EXISTS news (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NULL,
    category VARCHAR(100) NULL,
    summary TEXT NULL,
    image LONGTEXT NULL,
    content LONGTEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Contact Inquiries Table
CREATE TABLE IF NOT EXISTS contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    subject VARCHAR(255) NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    response TEXT NULL,
    replied_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Universal System Settings (Key-Value configuration for SMTP, Branding, Paid Stamp, Turnstile, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
