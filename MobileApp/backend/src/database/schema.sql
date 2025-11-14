-- Premium Gift Box Business Database Schema
-- SQLite database for self-hosted business management

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table (business owners, managers, employees)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
    full_name TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    whatsapp TEXT,
    phone TEXT,
    address TEXT,
    business_type TEXT CHECK (business_type IN ('individual', 'corporate', 'wedding', 'event')),
    company_name TEXT,
    industry TEXT,
    preferred_contact TEXT CHECK (preferred_contact IN ('whatsapp', 'email', 'phone')),
    notes TEXT,
    loyalty_status TEXT DEFAULT 'new' CHECK (loyalty_status IN ('new', 'regular', 'vip')),
    referred_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES customers(id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled')),
    
    -- Specifications
    box_type TEXT CHECK (box_type IN ('executive', 'luxury', 'custom')),
    width REAL,
    height REAL,
    depth REAL,
    materials TEXT, -- JSON array of materials
    colors TEXT, -- JSON array of colors
    special_requests TEXT,
    design_files TEXT, -- JSON array of file paths
    
    -- Pricing
    material_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    markup_percentage REAL DEFAULT 0,
    total_price REAL NOT NULL,
    currency TEXT DEFAULT 'IDR',
    
    -- Workflow
    estimated_completion DATE,
    actual_completion DATE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Communication
    whatsapp_thread TEXT,
    last_contact DATE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Order stages tracking
CREATE TABLE IF NOT EXISTS order_stages (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    notes TEXT,
    created_by TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Inventory materials
CREATE TABLE IF NOT EXISTS inventory_materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('cardboard', 'fabric', 'ribbon', 'accessories', 'packaging', 'tools')),
    supplier TEXT,
    unit_cost REAL NOT NULL,
    current_stock REAL NOT NULL DEFAULT 0,
    reorder_level REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL, -- pcs, meters, kg, etc.
    last_restocked DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Finished products inventory
CREATE TABLE IF NOT EXISTS inventory_products (
    id TEXT PRIMARY KEY,
    product_type TEXT NOT NULL,
    description TEXT,
    in_stock INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0, -- For pending orders
    cost_per_unit REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory movements log
CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    type TEXT CHECK (type IN ('purchase', 'usage', 'sale', 'adjustment', 'waste')),
    item_id TEXT NOT NULL,
    item_type TEXT CHECK (item_type IN ('material', 'product')),
    quantity REAL NOT NULL,
    unit_cost REAL,
    total_cost REAL,
    reason TEXT,
    order_id TEXT, -- If related to an order
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Financial transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL, -- sales, materials, labor, overhead, etc.
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'IDR',
    description TEXT NOT NULL,
    order_id TEXT, -- If related to an order
    reference_number TEXT,
    payment_method TEXT,
    payment_date DATE,
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Customer communication log
CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_id TEXT,
    type TEXT CHECK (type IN ('whatsapp', 'email', 'phone', 'meeting', 'note')),
    subject TEXT,
    content TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('incoming', 'outgoing', 'internal')),
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Business settings and configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Data sync log (for backup synchronization)
CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    sync_type TEXT CHECK (sync_type IN ('backup', 'restore', 'sync')),
    target TEXT, -- backup computer IP or location
    status TEXT CHECK (status IN ('success', 'failed', 'in_progress')),
    records_count INTEGER,
    file_size INTEGER,
    checksum TEXT,
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Files table (for uploaded images, documents, etc.)
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    has_thumbnail INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Order files junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS order_files (
    order_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, file_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    order_id TEXT,
    customer_id TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    ppn_rate REAL NOT NULL,
    ppn_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Production tasks table
CREATE TABLE IF NOT EXISTS production_tasks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date DATE,
    completed_at DATETIME,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quality control checks table
CREATE TABLE IF NOT EXISTS quality_checks (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    checklist_items TEXT NOT NULL, -- JSON array of checklist items
    overall_status TEXT DEFAULT 'pending' CHECK (overall_status IN ('pending', 'passed', 'failed', 'needs_review')),
    notes TEXT,
    checked_by TEXT NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (checked_by) REFERENCES users(id)
);

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier TEXT NOT NULL,
    items TEXT NOT NULL, -- JSON array of purchase items
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')),
    expected_delivery DATE,
    received_date DATE,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_stages_order_id ON order_stages(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_order_id ON financial_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_communications_order_id ON communications(order_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_order_files_file_id ON order_files(file_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_assigned_to ON production_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_quality_checks_order_id ON quality_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier);

-- Communication logs table (WhatsApp, Email, SMS)
CREATE TABLE IF NOT EXISTS communication_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms')),
    recipient TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_type TEXT CHECK (reference_type IN ('order', 'invoice', 'customer', 'general')),
    reference_id TEXT,
    error_message TEXT,
    metadata TEXT, -- JSON data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_reference ON communication_logs(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_sent_at ON communication_logs(sent_at);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES
('business_name', 'Premium Gift Box', 'Business name'),
('currency', 'IDR', 'Default currency'),
('tax_rate', '11', 'Tax rate percentage (PPN)'),
('default_markup', '100', 'Default markup percentage'),
('backup_frequency', '4', 'Backup frequency in hours'),
('sync_enabled', '1', 'Enable automatic synchronization');

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, full_name) VALUES
('admin-001', 'admin', 'admin@premiumgiftbox.com', '$2a$10$rQZ4nQRz9.ZYBzJhw4rWBOF7GhVQBQjTJhFwZLhf4tRKlNYf4tYK6', 'owner', 'Administrator');