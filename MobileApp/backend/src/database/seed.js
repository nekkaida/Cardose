// ULTRA COMPREHENSIVE Seed Data Script for Premium Gift Box
// Covers ALL edge cases, ALL scenarios for complete API testing
const DatabaseService = require('../services/DatabaseService');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Seed logger — silence with SEED_QUIET=1
const quiet = process.env.SEED_QUIET === '1';
const log = (...args) => { if (!quiet) log(...args); };

// Initialize database
const dbService = new DatabaseService();
dbService.initialize();
const db = dbService.db;

log('\n🌱 Starting ULTRA COMPREHENSIVE database seeding...\n');
log('📋 This seed covers ALL edge cases and scenarios\n');

// Clear all existing data first (disable foreign keys to avoid constraint issues)
log('🗑️ Clearing existing data...');
db.exec('PRAGMA foreign_keys = OFF');

const tablesToClear = [
  'communication_messages', 'quality_checks', 'purchase_order_items', 'purchase_orders',
  'inventory_movements', 'webhooks', 'webhook_configs', 'audit_logs', 'notifications',
  'settings', 'message_templates', 'budgets', 'production_logs', 'order_stages',
  'production_tasks', 'invoice_items', 'invoices', 'transactions', 'order_files',
  'files', 'orders', 'inventory', 'customers', 'users', 'backups'
];

tablesToClear.forEach(table => {
  try {
    db.exec(`DELETE FROM ${table}`);
  } catch (e) {
    // Table might not exist, ignore
  }
});

db.exec('PRAGMA foreign_keys = ON');
log('   ✅ Cleared all existing data\n');

// Helper functions
const hash = (password) => bcrypt.hashSync(password, 10);
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pickRandom = (arr) => arr[randomInt(0, arr.length - 1)];
const formatDate = (date) => date.toISOString().split('T')[0];
const formatDateTime = (date) => date.toISOString();

const now = new Date();
const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

// ==================== USERS (All roles, states, edge cases) ====================
log('👥 Seeding users (15 users - all roles and edge cases)...');
const users = [
  // OWNER - Full access
  { id: uuidv4(), username: 'owner', email: 'owner@premiumgiftbox.com', password_hash: hash('owner123'), role: 'owner', full_name: 'Budi Santoso', phone: '+62-812-1111-0001', is_active: 1 },

  // MANAGERS - Active
  { id: uuidv4(), username: 'manager', email: 'manager@premiumgiftbox.com', password_hash: hash('manager123'), role: 'manager', full_name: 'Siti Rahayu', phone: '+62-812-1111-0002', is_active: 1 },
  { id: uuidv4(), username: 'manager2', email: 'manager2@premiumgiftbox.com', password_hash: hash('manager123'), role: 'manager', full_name: 'Ahmad Fauzi', phone: '+62-812-1111-0003', is_active: 1 },

  // EMPLOYEES - Active (various roles)
  { id: uuidv4(), username: 'employee1', email: 'andi@premiumgiftbox.com', password_hash: hash('employee123'), role: 'employee', full_name: 'Andi Wijaya', phone: '+62-812-1111-0004', is_active: 1 },
  { id: uuidv4(), username: 'employee2', email: 'dewi@premiumgiftbox.com', password_hash: hash('employee123'), role: 'employee', full_name: 'Dewi Lestari', phone: '+62-812-1111-0005', is_active: 1 },
  { id: uuidv4(), username: 'employee3', email: 'rudi@premiumgiftbox.com', password_hash: hash('employee123'), role: 'employee', full_name: 'Rudi Hartono', phone: '+62-812-1111-0006', is_active: 1 },
  { id: uuidv4(), username: 'designer', email: 'maya@premiumgiftbox.com', password_hash: hash('designer123'), role: 'employee', full_name: 'Maya Sari', phone: '+62-812-1111-0007', is_active: 1 },
  { id: uuidv4(), username: 'qc_staff', email: 'qc@premiumgiftbox.com', password_hash: hash('qc123'), role: 'employee', full_name: 'Quality Control Staff', phone: '+62-812-1111-0008', is_active: 1 },

  // INACTIVE USERS (edge cases)
  { id: uuidv4(), username: 'inactive_employee', email: 'inactive@premiumgiftbox.com', password_hash: hash('inactive123'), role: 'employee', full_name: 'Inactive Employee', phone: '+62-812-1111-0009', is_active: 0 },
  { id: uuidv4(), username: 'resigned_manager', email: 'resigned@premiumgiftbox.com', password_hash: hash('resigned123'), role: 'manager', full_name: 'Resigned Manager', phone: '+62-812-1111-0010', is_active: 0 },

  // EDGE CASES
  { id: uuidv4(), username: 'test_user', email: 'test@premiumgiftbox.com', password_hash: hash('test123'), role: 'employee', full_name: 'Test User', phone: '+62-812-1111-0011', is_active: 1 },
  { id: uuidv4(), username: 'user_no_phone', email: 'nophone@premiumgiftbox.com', password_hash: hash('nophone123'), role: 'employee', full_name: 'User Without Phone', phone: null, is_active: 1 },
  { id: uuidv4(), username: 'long_username_user', email: 'longname@premiumgiftbox.com', password_hash: hash('longname123'), role: 'employee', full_name: 'User With A Very Long Full Name That Tests Character Limits', phone: '+62-812-1111-0012', is_active: 1 },
  { id: uuidv4(), username: 'special_chars', email: 'special.user+test@premiumgiftbox.com', password_hash: hash('special123'), role: 'employee', full_name: "User O'Brien-Smith", phone: '+62-812-1111-0013', is_active: 1 },
  { id: uuidv4(), username: 'new_hire', email: 'newhire@premiumgiftbox.com', password_hash: hash('newhire123'), role: 'employee', full_name: 'Brand New Employee', phone: '+62-812-1111-0014', is_active: 1 },
];

const insertUser = db.prepare(`INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
users.forEach(u => insertUser.run(u.id, u.username, u.email, u.password_hash, u.role, u.full_name, u.phone, u.is_active));
log(`   ✅ Created ${users.length} users`);

// Get user IDs for references
const ownerId = users[0].id;
const managerId = users[1].id;
const employeeIds = users.filter(u => u.role === 'employee' && u.is_active).map(u => u.id);

// ==================== CUSTOMERS (All types, statuses, edge cases) ====================
log('🏢 Seeding customers (50 diverse customers - all business types & loyalty statuses)...');
const customers = [
  // CORPORATE - VIP (High value)
  { id: uuidv4(), name: 'PT. Maju Bersama Indonesia', email: 'procurement@majubersama.co.id', phone: '+62-21-5551234', business_type: 'corporate', loyalty_status: 'vip', total_orders: 85, total_spent: 850000000 },
  { id: uuidv4(), name: 'PT. Bank Nasional Indonesia', email: 'corporate@bni.co.id', phone: '+62-21-5552345', business_type: 'corporate', loyalty_status: 'vip', total_orders: 120, total_spent: 1200000000 },
  { id: uuidv4(), name: 'PT. Telekomunikasi Indonesia', email: 'events@telkom.co.id', phone: '+62-21-5553456', business_type: 'corporate', loyalty_status: 'vip', total_orders: 95, total_spent: 950000000 },
  { id: uuidv4(), name: 'PT. Pertamina', email: 'procurement@pertamina.com', phone: '+62-21-5554567', business_type: 'corporate', loyalty_status: 'vip', total_orders: 78, total_spent: 780000000 },
  { id: uuidv4(), name: 'PT. Garuda Indonesia', email: 'corporate.gift@garuda.co.id', phone: '+62-21-5555678', business_type: 'corporate', loyalty_status: 'vip', total_orders: 65, total_spent: 650000000 },

  // CORPORATE - Regular
  { id: uuidv4(), name: 'PT. Startup Digital', email: 'hello@startupdigital.id', phone: '+62-21-5556789', business_type: 'corporate', loyalty_status: 'regular', total_orders: 12, total_spent: 48000000 },
  { id: uuidv4(), name: 'CV. Usaha Mandiri', email: 'admin@usahamandiri.co.id', phone: '+62-21-5557890', business_type: 'corporate', loyalty_status: 'regular', total_orders: 8, total_spent: 32000000 },
  { id: uuidv4(), name: 'PT. Konsultan Jaya', email: 'info@konsultanjaya.com', phone: '+62-21-5558901', business_type: 'corporate', loyalty_status: 'regular', total_orders: 15, total_spent: 60000000 },

  // CORPORATE - New
  { id: uuidv4(), name: 'PT. Baru Berdiri', email: 'info@baruberdiri.com', phone: '+62-21-5559012', business_type: 'corporate', loyalty_status: 'new', total_orders: 1, total_spent: 5000000 },
  { id: uuidv4(), name: 'CV. Fresh Start', email: 'contact@freshstart.id', phone: '+62-21-5550123', business_type: 'corporate', loyalty_status: 'new', total_orders: 0, total_spent: 0 },

  // WEDDING - VIP (Frequent wedding organizers)
  { id: uuidv4(), name: 'Wedding Organizer Bintang', email: 'info@weddingbintang.com', phone: '+62-21-8881234', business_type: 'wedding', loyalty_status: 'vip', total_orders: 150, total_spent: 1500000000 },
  { id: uuidv4(), name: 'Elegant Wedding Planner', email: 'contact@elegantwedding.id', phone: '+62-21-8882345', business_type: 'wedding', loyalty_status: 'vip', total_orders: 130, total_spent: 1300000000 },
  { id: uuidv4(), name: 'Royal Wedding Jakarta', email: 'royal@royalwedding.co.id', phone: '+62-21-8883456', business_type: 'wedding', loyalty_status: 'vip', total_orders: 110, total_spent: 1100000000 },

  // WEDDING - Regular
  { id: uuidv4(), name: 'Dream Wedding Jakarta', email: 'hello@dreamwedding.co.id', phone: '+62-21-8884567', business_type: 'wedding', loyalty_status: 'regular', total_orders: 25, total_spent: 125000000 },
  { id: uuidv4(), name: 'Simple Wedding Planner', email: 'simple@simplewedding.id', phone: '+62-21-8885678', business_type: 'wedding', loyalty_status: 'regular', total_orders: 18, total_spent: 90000000 },

  // EVENT - VIP
  { id: uuidv4(), name: 'Event Organizer Prima', email: 'info@eoprima.com', phone: '+62-21-7771234', business_type: 'event', loyalty_status: 'vip', total_orders: 88, total_spent: 440000000 },
  { id: uuidv4(), name: 'Corporate Event Solutions', email: 'events@ces.co.id', phone: '+62-21-7772345', business_type: 'event', loyalty_status: 'vip', total_orders: 72, total_spent: 360000000 },

  // EVENT - Regular & New
  { id: uuidv4(), name: 'Party Planner Jakarta', email: 'party@ppj.id', phone: '+62-21-7773456', business_type: 'event', loyalty_status: 'regular', total_orders: 20, total_spent: 100000000 },
  { id: uuidv4(), name: 'New Event Organizer', email: 'new@neweo.com', phone: '+62-21-7774567', business_type: 'event', loyalty_status: 'new', total_orders: 2, total_spent: 10000000 },

  // INDIVIDUAL - VIP (Frequent personal buyers)
  { id: uuidv4(), name: 'Keluarga Tanoto', email: 'tanoto.family@gmail.com', phone: '+62-812-5555-6666', business_type: 'individual', loyalty_status: 'vip', total_orders: 45, total_spent: 225000000 },
  { id: uuidv4(), name: 'Keluarga Wijaya', email: 'family.wijaya@gmail.com', phone: '+62-818-9876-5432', business_type: 'individual', loyalty_status: 'vip', total_orders: 38, total_spent: 190000000 },

  // INDIVIDUAL - Regular
  { id: uuidv4(), name: 'Bapak Hendro Susilo', email: 'hendro.s@outlook.com', phone: '+62-857-9999-8888', business_type: 'individual', loyalty_status: 'regular', total_orders: 8, total_spent: 40000000 },
  { id: uuidv4(), name: 'Ibu Sri Wahyuni', email: 'sri.wahyuni@yahoo.com', phone: '+62-812-3333-4444', business_type: 'individual', loyalty_status: 'regular', total_orders: 5, total_spent: 25000000 },
  { id: uuidv4(), name: 'Bapak Agus Setiawan', email: 'agus.setiawan@gmail.com', phone: '+62-813-7777-8888', business_type: 'individual', loyalty_status: 'regular', total_orders: 6, total_spent: 30000000 },

  // INDIVIDUAL - New
  { id: uuidv4(), name: 'Ibu Ratna Dewi', email: 'ratna.dewi88@gmail.com', phone: '+62-813-1234-5678', business_type: 'individual', loyalty_status: 'new', total_orders: 1, total_spent: 5000000 },
  { id: uuidv4(), name: 'First Time Buyer', email: 'newbuyer@gmail.com', phone: '+62-812-0000-0001', business_type: 'individual', loyalty_status: 'new', total_orders: 0, total_spent: 0 },
  { id: uuidv4(), name: 'Potential Customer', email: 'potential@gmail.com', phone: '+62-812-0000-0002', business_type: 'individual', loyalty_status: 'new', total_orders: 0, total_spent: 0 },

  // EDGE CASES
  { id: uuidv4(), name: 'Customer Without Email', email: null, phone: '+62-812-9999-0001', business_type: 'individual', loyalty_status: 'regular', total_orders: 3, total_spent: 15000000 },
  { id: uuidv4(), name: 'Customer Without Phone', email: 'nophone.customer@gmail.com', phone: null, business_type: 'individual', loyalty_status: 'regular', total_orders: 2, total_spent: 10000000 },
  { id: uuidv4(), name: 'Very Long Customer Name That Tests The Character Limits Of The Database Field', email: 'longname@test.com', phone: '+62-812-9999-0003', business_type: 'corporate', loyalty_status: 'new', total_orders: 1, total_spent: 5000000 },
  { id: uuidv4(), name: "Customer O'Brien & Sons, Ltd.", email: 'obrien@test.com', phone: '+62-812-9999-0004', business_type: 'corporate', loyalty_status: 'regular', total_orders: 4, total_spent: 20000000 },
  { id: uuidv4(), name: 'Customer With Unicode: 日本語テスト', email: 'unicode@test.com', phone: '+62-812-9999-0005', business_type: 'individual', loyalty_status: 'new', total_orders: 1, total_spent: 5000000 },

  // More variety for testing filters
  { id: uuidv4(), name: 'Yayasan Pendidikan Nusantara', email: 'admin@ypnusantara.org', phone: '+62-274-1234567', business_type: 'event', loyalty_status: 'regular', total_orders: 12, total_spent: 48000000 },
  { id: uuidv4(), name: 'Rumah Sakit Kasih Ibu', email: 'humas@rskasihibu.or.id', phone: '+62-21-6661234', business_type: 'corporate', loyalty_status: 'vip', total_orders: 35, total_spent: 175000000 },
  { id: uuidv4(), name: 'Gereja HKBP Jakarta', email: 'sekretariat@hkbpjakarta.or.id', phone: '+62-21-6662345', business_type: 'event', loyalty_status: 'regular', total_orders: 18, total_spent: 72000000 },
  { id: uuidv4(), name: 'Kementerian BUMN', email: 'protokol@bumn.go.id', phone: '+62-21-5001234', business_type: 'corporate', loyalty_status: 'vip', total_orders: 55, total_spent: 550000000 },

  // Additional for comprehensive testing
  { id: uuidv4(), name: 'Gift Shop Central', email: 'central.giftshop@yahoo.com', phone: '+62-31-9991234', business_type: 'corporate', loyalty_status: 'regular', total_orders: 22, total_spent: 88000000 },
  { id: uuidv4(), name: 'Hampers Jakarta Store', email: 'hampers@jakartastore.com', phone: '+62-21-9992345', business_type: 'corporate', loyalty_status: 'regular', total_orders: 19, total_spent: 76000000 },
  { id: uuidv4(), name: 'Souvenir Murah', email: 'souvenirmurah@gmail.com', phone: '+62-21-9993456', business_type: 'individual', loyalty_status: 'regular', total_orders: 7, total_spent: 28000000 },
  { id: uuidv4(), name: 'Toko Kado Indah', email: 'tokokadoindah@gmail.com', phone: '+62-22-7772345', business_type: 'individual', loyalty_status: 'regular', total_orders: 9, total_spent: 36000000 },

  // High-value single transactions
  { id: uuidv4(), name: 'Mega Corporation Order', email: 'mega@megacorp.com', phone: '+62-21-1111111', business_type: 'corporate', loyalty_status: 'vip', total_orders: 5, total_spent: 500000000 },

  // Zero activity customers
  { id: uuidv4(), name: 'Inactive Customer 1', email: 'inactive1@test.com', phone: '+62-812-0000-1001', business_type: 'individual', loyalty_status: 'new', total_orders: 0, total_spent: 0 },
  { id: uuidv4(), name: 'Inactive Customer 2', email: 'inactive2@test.com', phone: '+62-812-0000-1002', business_type: 'corporate', loyalty_status: 'new', total_orders: 0, total_spent: 0 },

  // International format phones
  { id: uuidv4(), name: 'International Customer', email: 'intl@customer.com', phone: '+1-555-123-4567', business_type: 'corporate', loyalty_status: 'regular', total_orders: 3, total_spent: 15000000 },
  { id: uuidv4(), name: 'Singapore Customer', email: 'sg@customer.com', phone: '+65-9123-4567', business_type: 'corporate', loyalty_status: 'regular', total_orders: 4, total_spent: 20000000 },

  // Additional wedding customers
  { id: uuidv4(), name: 'Budget Wedding Planner', email: 'budget@wedding.id', phone: '+62-21-8886789', business_type: 'wedding', loyalty_status: 'new', total_orders: 3, total_spent: 15000000 },
  { id: uuidv4(), name: 'Premium Wedding Service', email: 'premium@wedding.id', phone: '+62-21-8887890', business_type: 'wedding', loyalty_status: 'vip', total_orders: 60, total_spent: 600000000 },

  // More event organizers
  { id: uuidv4(), name: 'Birthday Party Specialist', email: 'birthday@party.id', phone: '+62-21-7775678', business_type: 'event', loyalty_status: 'regular', total_orders: 30, total_spent: 90000000 },
  { id: uuidv4(), name: 'Corporate Gathering Pro', email: 'gathering@pro.id', phone: '+62-21-7776789', business_type: 'event', loyalty_status: 'vip', total_orders: 50, total_spent: 250000000 },

  // Final customers
  { id: uuidv4(), name: 'Last Customer Entry', email: 'last@customer.com', phone: '+62-812-9999-9999', business_type: 'individual', loyalty_status: 'new', total_orders: 0, total_spent: 0 },
];

const insertCustomer = db.prepare(`INSERT INTO customers (id, name, email, phone, business_type, loyalty_status, total_orders, total_spent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
customers.forEach(c => insertCustomer.run(c.id, c.name, c.email, c.phone, c.business_type, c.loyalty_status, c.total_orders, c.total_spent));
log(`   ✅ Created ${customers.length} customers`);

// ==================== INVENTORY MATERIALS (All categories, stock levels) ====================
log('📦 Seeding inventory materials (60 items - all categories & stock scenarios)...');
const materials = [
  // PAPER - Various stock levels
  { id: uuidv4(), name: 'Art Paper 260gsm White', category: 'paper', supplier: 'PT. Kertas Nusantara', unit_cost: 1500, current_stock: 500, reorder_level: 100, unit: 'lembar' },
  { id: uuidv4(), name: 'Art Paper 260gsm Ivory', category: 'paper', supplier: 'PT. Kertas Nusantara', unit_cost: 1600, current_stock: 350, reorder_level: 80, unit: 'lembar' },
  { id: uuidv4(), name: 'Art Paper 310gsm White', category: 'paper', supplier: 'PT. Kertas Nusantara', unit_cost: 2000, current_stock: 400, reorder_level: 80, unit: 'lembar' },
  { id: uuidv4(), name: 'Duplex 300gsm', category: 'paper', supplier: 'CV. Paper Indo', unit_cost: 1200, current_stock: 800, reorder_level: 150, unit: 'lembar' },
  { id: uuidv4(), name: 'Kraft Paper Brown', category: 'paper', supplier: 'PT. Kertas Nusantara', unit_cost: 900, current_stock: 600, reorder_level: 120, unit: 'lembar' },
  { id: uuidv4(), name: 'Metallic Paper Gold', category: 'paper', supplier: 'PT. Kertas Premium', unit_cost: 4500, current_stock: 120, reorder_level: 30, unit: 'lembar' },
  { id: uuidv4(), name: 'Metallic Paper Silver', category: 'paper', supplier: 'PT. Kertas Premium', unit_cost: 4200, current_stock: 100, reorder_level: 25, unit: 'lembar' },
  { id: uuidv4(), name: 'Texture Paper Premium', category: 'paper', supplier: 'Special Effects Co', unit_cost: 5500, current_stock: 3, reorder_level: 10, unit: 'lembar' }, // LOW STOCK
  { id: uuidv4(), name: 'Recycled Paper Eco', category: 'paper', supplier: 'CV. Eco Paper', unit_cost: 800, current_stock: 0, reorder_level: 50, unit: 'lembar' }, // OUT OF STOCK

  // CARDBOARD
  { id: uuidv4(), name: 'Premium Cardboard 400gsm', category: 'cardboard', supplier: 'PT. Kertas Premium', unit_cost: 3500, current_stock: 200, reorder_level: 50, unit: 'lembar' },
  { id: uuidv4(), name: 'Recycled Cardboard', category: 'cardboard', supplier: 'CV. Eco Paper', unit_cost: 800, current_stock: 1000, reorder_level: 200, unit: 'lembar' },
  { id: uuidv4(), name: 'Black Cardboard 350gsm', category: 'cardboard', supplier: 'PT. Kertas Premium', unit_cost: 2800, current_stock: 180, reorder_level: 40, unit: 'lembar' },
  { id: uuidv4(), name: 'White Cardboard 350gsm', category: 'cardboard', supplier: 'PT. Kertas Premium', unit_cost: 2500, current_stock: 5, reorder_level: 40, unit: 'lembar' }, // LOW STOCK
  { id: uuidv4(), name: 'Navy Cardboard 350gsm', category: 'cardboard', supplier: 'PT. Kertas Premium', unit_cost: 2700, current_stock: 0, reorder_level: 30, unit: 'lembar' }, // OUT OF STOCK

  // RIBBON - Various colors and types
  { id: uuidv4(), name: 'Satin Ribbon Gold 2.5cm', category: 'ribbon', supplier: 'Ribbon House', unit_cost: 500, current_stock: 150, reorder_level: 30, unit: 'meter' },
  { id: uuidv4(), name: 'Satin Ribbon Red 2.5cm', category: 'ribbon', supplier: 'Ribbon House', unit_cost: 450, current_stock: 200, reorder_level: 40, unit: 'meter' },
  { id: uuidv4(), name: 'Satin Ribbon Navy 2.5cm', category: 'ribbon', supplier: 'Ribbon House', unit_cost: 450, current_stock: 180, reorder_level: 35, unit: 'meter' },
  { id: uuidv4(), name: 'Satin Ribbon White 2.5cm', category: 'ribbon', supplier: 'Ribbon House', unit_cost: 420, current_stock: 250, reorder_level: 50, unit: 'meter' },
  { id: uuidv4(), name: 'Satin Ribbon Black 2.5cm', category: 'ribbon', supplier: 'Ribbon House', unit_cost: 450, current_stock: 220, reorder_level: 45, unit: 'meter' },
  { id: uuidv4(), name: 'Velvet Ribbon Rose Gold 2cm', category: 'ribbon', supplier: 'Premium Ribbon Co', unit_cost: 850, current_stock: 80, reorder_level: 20, unit: 'meter' },
  { id: uuidv4(), name: 'Grosgrain Ribbon White 3cm', category: 'ribbon', supplier: 'Ribbon House', unit_cost: 400, current_stock: 250, reorder_level: 50, unit: 'meter' },
  { id: uuidv4(), name: 'Organza Ribbon Pink 4cm', category: 'ribbon', supplier: 'Premium Ribbon Co', unit_cost: 600, current_stock: 120, reorder_level: 25, unit: 'meter' },
  { id: uuidv4(), name: 'Metallic Ribbon Gold 2cm', category: 'ribbon', supplier: 'Premium Ribbon Co', unit_cost: 750, current_stock: 60, reorder_level: 15, unit: 'meter' },
  { id: uuidv4(), name: 'Lace Ribbon Cream 5cm', category: 'ribbon', supplier: 'Premium Ribbon Co', unit_cost: 1200, current_stock: 8, reorder_level: 10, unit: 'meter' }, // LOW STOCK
  { id: uuidv4(), name: 'Silk Ribbon Premium', category: 'ribbon', supplier: 'Premium Ribbon Co', unit_cost: 1500, current_stock: 0, reorder_level: 15, unit: 'meter' }, // OUT OF STOCK

  // FABRIC
  { id: uuidv4(), name: 'Velvet Fabric Black', category: 'fabric', supplier: 'Textile World', unit_cost: 5000, current_stock: 100, reorder_level: 25, unit: 'meter' },
  { id: uuidv4(), name: 'Velvet Fabric Navy', category: 'fabric', supplier: 'Textile World', unit_cost: 5000, current_stock: 80, reorder_level: 20, unit: 'meter' },
  { id: uuidv4(), name: 'Velvet Fabric Burgundy', category: 'fabric', supplier: 'Textile World', unit_cost: 5200, current_stock: 60, reorder_level: 15, unit: 'meter' },
  { id: uuidv4(), name: 'Satin Fabric Cream', category: 'fabric', supplier: 'Textile World', unit_cost: 3500, current_stock: 150, reorder_level: 30, unit: 'meter' },
  { id: uuidv4(), name: 'Satin Fabric White', category: 'fabric', supplier: 'Textile World', unit_cost: 3200, current_stock: 180, reorder_level: 35, unit: 'meter' },
  { id: uuidv4(), name: 'Silk Fabric Premium', category: 'fabric', supplier: 'Textile World', unit_cost: 15000, current_stock: 2, reorder_level: 5, unit: 'meter' }, // LOW STOCK

  // ACCESSORIES
  { id: uuidv4(), name: 'Cardboard Divider Set', category: 'accessories', supplier: 'Box Supplies Co', unit_cost: 2000, current_stock: 200, reorder_level: 40, unit: 'set' },
  { id: uuidv4(), name: 'Pearl Accent Beads', category: 'accessories', supplier: 'Bead Paradise', unit_cost: 150, current_stock: 500, reorder_level: 100, unit: 'pcs' },
  { id: uuidv4(), name: 'Crystal Accent Beads', category: 'accessories', supplier: 'Bead Paradise', unit_cost: 250, current_stock: 300, reorder_level: 60, unit: 'pcs' },
  { id: uuidv4(), name: 'Magnetic Closure Gold', category: 'accessories', supplier: 'Hardware Pro', unit_cost: 3000, current_stock: 80, reorder_level: 20, unit: 'set' },
  { id: uuidv4(), name: 'Magnetic Closure Silver', category: 'accessories', supplier: 'Hardware Pro', unit_cost: 2800, current_stock: 100, reorder_level: 25, unit: 'set' },
  { id: uuidv4(), name: 'Hinges Brass Small', category: 'accessories', supplier: 'Hardware Pro', unit_cost: 1500, current_stock: 150, reorder_level: 30, unit: 'pair' },
  { id: uuidv4(), name: 'Lock Clasp Premium', category: 'accessories', supplier: 'Hardware Pro', unit_cost: 5000, current_stock: 4, reorder_level: 10, unit: 'pcs' }, // LOW STOCK
  { id: uuidv4(), name: 'Decorative Corner Gold', category: 'accessories', supplier: 'Hardware Pro', unit_cost: 2000, current_stock: 0, reorder_level: 20, unit: 'set' }, // OUT OF STOCK

  // PACKAGING
  { id: uuidv4(), name: 'Gold Foil Roll', category: 'packaging', supplier: 'Foil Masters', unit_cost: 150000, current_stock: 15, reorder_level: 5, unit: 'roll' },
  { id: uuidv4(), name: 'Silver Foil Roll', category: 'packaging', supplier: 'Foil Masters', unit_cost: 120000, current_stock: 12, reorder_level: 4, unit: 'roll' },
  { id: uuidv4(), name: 'Rose Gold Foil Roll', category: 'packaging', supplier: 'Foil Masters', unit_cost: 180000, current_stock: 2, reorder_level: 5, unit: 'roll' }, // LOW STOCK
  { id: uuidv4(), name: 'UV Varnish', category: 'packaging', supplier: 'Print Supplies ID', unit_cost: 250000, current_stock: 8, reorder_level: 3, unit: 'liter' },
  { id: uuidv4(), name: 'Matte Lamination Film', category: 'packaging', supplier: 'Print Supplies ID', unit_cost: 85000, current_stock: 20, reorder_level: 5, unit: 'roll' },
  { id: uuidv4(), name: 'Gloss Lamination Film', category: 'packaging', supplier: 'Print Supplies ID', unit_cost: 75000, current_stock: 18, reorder_level: 5, unit: 'roll' },
  { id: uuidv4(), name: 'Holographic Film', category: 'packaging', supplier: 'Special Effects Co', unit_cost: 350000, current_stock: 0, reorder_level: 2, unit: 'roll' }, // OUT OF STOCK
  { id: uuidv4(), name: 'Soft Touch Lamination', category: 'packaging', supplier: 'Print Supplies ID', unit_cost: 120000, current_stock: 6, reorder_level: 3, unit: 'roll' },

  // TOOLS
  { id: uuidv4(), name: 'Embossing Die Custom', category: 'tools', supplier: 'Die Cut Pro', unit_cost: 500000, current_stock: 1, reorder_level: 3, unit: 'pcs' }, // LOW STOCK
  { id: uuidv4(), name: 'Cutting Blade Set', category: 'tools', supplier: 'Tools Pro', unit_cost: 25000, current_stock: 50, reorder_level: 10, unit: 'set' },
  { id: uuidv4(), name: 'Scoring Tool', category: 'tools', supplier: 'Tools Pro', unit_cost: 15000, current_stock: 30, reorder_level: 8, unit: 'pcs' },
  { id: uuidv4(), name: 'Bone Folder', category: 'tools', supplier: 'Tools Pro', unit_cost: 8000, current_stock: 45, reorder_level: 10, unit: 'pcs' },
  { id: uuidv4(), name: 'Corner Punch', category: 'tools', supplier: 'Tools Pro', unit_cost: 35000, current_stock: 12, reorder_level: 5, unit: 'pcs' },
  { id: uuidv4(), name: 'Hot Glue Gun Industrial', category: 'tools', supplier: 'Tools Pro', unit_cost: 150000, current_stock: 0, reorder_level: 2, unit: 'pcs' }, // OUT OF STOCK

  // HIGH VALUE ITEMS
  { id: uuidv4(), name: 'Leather Premium Italian', category: 'fabric', supplier: 'Leather Imports', unit_cost: 500000, current_stock: 10, reorder_level: 3, unit: 'sqm' },
  { id: uuidv4(), name: 'Crystal Swarovski Set', category: 'accessories', supplier: 'Crystal Imports', unit_cost: 250000, current_stock: 20, reorder_level: 5, unit: 'set' },
  { id: uuidv4(), name: '24K Gold Leaf', category: 'accessories', supplier: 'Gold Supplies', unit_cost: 1000000, current_stock: 5, reorder_level: 2, unit: 'book' },

  // VERY LOW COST ITEMS (for bulk testing)
  { id: uuidv4(), name: 'Tissue Paper White', category: 'packaging', supplier: 'Paper Supplies', unit_cost: 100, current_stock: 5000, reorder_level: 1000, unit: 'lembar' },
  { id: uuidv4(), name: 'Price Tag String', category: 'accessories', supplier: 'Supplies Co', unit_cost: 50, current_stock: 10000, reorder_level: 2000, unit: 'pcs' },
];

const insertMaterial = db.prepare(`INSERT INTO inventory_materials (id, name, category, supplier, unit_cost, current_stock, reorder_level, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
materials.forEach(m => insertMaterial.run(m.id, m.name, m.category, m.supplier, m.unit_cost, m.current_stock, m.reorder_level, m.unit));
log(`   ✅ Created ${materials.length} inventory materials`);

// ==================== ORDERS (All statuses, priorities, edge cases) ====================
log('📋 Seeding orders (100 orders - all statuses, priorities, edge cases)...');
const orderStatuses = ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled'];
const boxTypes = ['executive', 'luxury', 'premium', 'standard', 'custom'];
const priorities = ['low', 'normal', 'high', 'urgent'];
const orders = [];

// Create specific test orders first
const specificOrders = [
  // PENDING orders
  { status: 'pending', priority: 'urgent', due: tomorrow, created: now },
  { status: 'pending', priority: 'high', due: nextWeek, created: oneWeekAgo },
  { status: 'pending', priority: 'normal', due: nextMonth, created: oneMonthAgo },
  { status: 'pending', priority: 'low', due: nextMonth, created: sixMonthsAgo },

  // DESIGNING orders
  { status: 'designing', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
  { status: 'designing', priority: 'high', due: nextWeek, created: oneMonthAgo },
  { status: 'designing', priority: 'normal', due: nextMonth, created: oneMonthAgo },

  // APPROVED orders
  { status: 'approved', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
  { status: 'approved', priority: 'high', due: nextWeek, created: oneMonthAgo },
  { status: 'approved', priority: 'normal', due: nextMonth, created: sixMonthsAgo },

  // PRODUCTION orders
  { status: 'production', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
  { status: 'production', priority: 'high', due: nextWeek, created: oneMonthAgo },
  { status: 'production', priority: 'normal', due: nextMonth, created: oneMonthAgo },
  { status: 'production', priority: 'low', due: nextMonth, created: sixMonthsAgo },

  // QUALITY_CONTROL orders
  { status: 'quality_control', priority: 'urgent', due: tomorrow, created: oneWeekAgo },
  { status: 'quality_control', priority: 'high', due: nextWeek, created: oneMonthAgo },
  { status: 'quality_control', priority: 'normal', due: nextMonth, created: oneMonthAgo },

  // COMPLETED orders (various dates)
  { status: 'completed', priority: 'normal', due: oneWeekAgo, created: oneMonthAgo, completed: oneWeekAgo },
  { status: 'completed', priority: 'high', due: oneMonthAgo, created: sixMonthsAgo, completed: oneMonthAgo },
  { status: 'completed', priority: 'urgent', due: sixMonthsAgo, created: oneYearAgo, completed: sixMonthsAgo },

  // CANCELLED orders
  { status: 'cancelled', priority: 'normal', due: oneWeekAgo, created: oneMonthAgo },
  { status: 'cancelled', priority: 'high', due: oneMonthAgo, created: sixMonthsAgo },
];

let orderNum = 1;
specificOrders.forEach(spec => {
  const customer = pickRandom(customers);
  const totalAmount = randomInt(1000000, 100000000);
  orders.push({
    id: uuidv4(),
    order_number: `ORD-${String(orderNum++).padStart(4, '0')}`,
    customer_id: customer.id,
    status: spec.status,
    priority: spec.priority,
    total_amount: totalAmount,
    final_price: Math.round(totalAmount * 1.11),
    box_type: pickRandom(boxTypes),
    due_date: formatDateTime(spec.due),
    estimated_completion: formatDateTime(spec.due),
    actual_completion: spec.completed ? formatDateTime(spec.completed) : null,
    created_at: formatDateTime(spec.created)
  });
});

// Generate more random orders
for (let i = orderNum; i <= 100; i++) {
  const customer = pickRandom(customers);
  const status = pickRandom(orderStatuses);
  const createdDate = randomDate(oneYearAgo, now);
  const dueDate = new Date(createdDate.getTime() + randomInt(7, 60) * 24 * 60 * 60 * 1000);
  const totalAmount = randomInt(500000, 50000000);
  const isCompleted = status === 'completed';

  orders.push({
    id: uuidv4(),
    order_number: `ORD-${String(i).padStart(4, '0')}`,
    customer_id: customer.id,
    status: status,
    priority: pickRandom(priorities),
    total_amount: totalAmount,
    final_price: Math.round(totalAmount * 1.11),
    box_type: pickRandom(boxTypes),
    due_date: formatDateTime(dueDate),
    estimated_completion: formatDateTime(dueDate),
    actual_completion: isCompleted ? formatDateTime(new Date(dueDate.getTime() - randomInt(0, 7) * 24 * 60 * 60 * 1000)) : null,
    created_at: formatDateTime(createdDate)
  });
}

const insertOrder = db.prepare(`INSERT INTO orders (id, order_number, customer_id, status, priority, total_amount, final_price, box_type, due_date, estimated_completion, actual_completion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
orders.forEach(o => insertOrder.run(o.id, o.order_number, o.customer_id, o.status, o.priority, o.total_amount, o.final_price, o.box_type, o.due_date, o.estimated_completion, o.actual_completion, o.created_at));
log(`   ✅ Created ${orders.length} orders`);

// ==================== INVOICES (All statuses, edge cases) ====================
log('💰 Seeding invoices (80 invoices - all statuses, edge cases)...');
const invoiceStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
const invoices = [];

// Specific invoice scenarios
const invoiceScenarios = [
  // DRAFT invoices
  { status: 'draft', amount: 5000000, discount: 0 },
  { status: 'draft', amount: 15000000, discount: 1500000 },
  { status: 'draft', amount: 50000000, discount: 5000000 },

  // SENT invoices (not yet paid)
  { status: 'sent', amount: 8000000, discount: 0, daysUntilDue: 14 },
  { status: 'sent', amount: 25000000, discount: 2500000, daysUntilDue: 7 },
  { status: 'sent', amount: 100000000, discount: 10000000, daysUntilDue: 30 },

  // PAID invoices
  { status: 'paid', amount: 10000000, discount: 0, daysAgo: 7 },
  { status: 'paid', amount: 35000000, discount: 3500000, daysAgo: 30 },
  { status: 'paid', amount: 75000000, discount: 7500000, daysAgo: 90 },
  { status: 'paid', amount: 150000000, discount: 15000000, daysAgo: 180 },

  // PARTIAL payment
  { status: 'partial', amount: 20000000, discount: 0, partialPaid: 10000000 },
  { status: 'partial', amount: 50000000, discount: 5000000, partialPaid: 25000000 },

  // OVERDUE invoices
  { status: 'overdue', amount: 12000000, discount: 0, daysOverdue: 7 },
  { status: 'overdue', amount: 30000000, discount: 3000000, daysOverdue: 30 },
  { status: 'overdue', amount: 80000000, discount: 8000000, daysOverdue: 90 },

  // CANCELLED invoices
  { status: 'cancelled', amount: 5000000, discount: 0 },
  { status: 'cancelled', amount: 25000000, discount: 2500000 },
];

let invNum = 1;
invoiceScenarios.forEach(scenario => {
  const order = pickRandom(orders);
  const customer = customers.find(c => c.id === order.customer_id) || customers[0];
  const subtotal = scenario.amount;
  const discount = scenario.discount;
  const ppnRate = 0.11;
  const ppnAmount = Math.round((subtotal - discount) * ppnRate);
  const totalAmount = subtotal - discount + ppnAmount;

  let issueDate = new Date(now);
  let dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (scenario.daysAgo) {
    issueDate = new Date(now.getTime() - scenario.daysAgo * 24 * 60 * 60 * 1000);
    dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  if (scenario.daysOverdue) {
    issueDate = new Date(now.getTime() - (scenario.daysOverdue + 14) * 24 * 60 * 60 * 1000);
    dueDate = new Date(now.getTime() - scenario.daysOverdue * 24 * 60 * 60 * 1000);
  }
  if (scenario.daysUntilDue) {
    issueDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dueDate = new Date(now.getTime() + scenario.daysUntilDue * 24 * 60 * 60 * 1000);
  }

  invoices.push({
    id: uuidv4(),
    invoice_number: `INV-${String(invNum++).padStart(4, '0')}`,
    order_id: order.id,
    customer_id: customer.id,
    subtotal: subtotal,
    discount: discount,
    ppn_rate: ppnRate,
    ppn_amount: ppnAmount,
    total_amount: totalAmount,
    status: scenario.status,
    issue_date: formatDateTime(issueDate),
    due_date: formatDateTime(dueDate),
    notes: scenario.status === 'partial' ? `Partial payment received: Rp ${scenario.partialPaid?.toLocaleString()}` : null,
    created_by: ownerId
  });
});

// Generate more random invoices
for (let i = invNum; i <= 80; i++) {
  const order = orders[(i - 1) % orders.length];
  const customer = customers.find(c => c.id === order.customer_id) || customers[0];
  const subtotal = order.total_amount;
  const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0;
  const ppnRate = 0.11;
  const ppnAmount = Math.round((subtotal - discount) * ppnRate);
  const totalAmount = subtotal - discount + ppnAmount;
  const issueDate = new Date(order.created_at);
  const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  invoices.push({
    id: uuidv4(),
    invoice_number: `INV-${String(i).padStart(4, '0')}`,
    order_id: order.id,
    customer_id: customer.id,
    subtotal: subtotal,
    discount: discount,
    ppn_rate: ppnRate,
    ppn_amount: ppnAmount,
    total_amount: totalAmount,
    status: pickRandom(invoiceStatuses),
    issue_date: formatDateTime(issueDate),
    due_date: formatDateTime(dueDate),
    notes: null,
    created_by: ownerId
  });
}

const insertInvoice = db.prepare(`INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, discount, ppn_rate, ppn_amount, total_amount, status, issue_date, due_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
invoices.forEach(inv => insertInvoice.run(inv.id, inv.invoice_number, inv.order_id, inv.customer_id, inv.subtotal, inv.discount, inv.ppn_rate, inv.ppn_amount, inv.total_amount, inv.status, inv.issue_date, inv.due_date, inv.notes, inv.created_by));
log(`   ✅ Created ${invoices.length} invoices`);

// ==================== PRODUCTION TASKS (All statuses, assignments) ====================
log('🔧 Seeding production tasks (150 tasks - all statuses, assignments)...');
const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
const taskTitles = [
  'Design Layout', 'Print Materials', 'Cut Cardboard', 'Assemble Box Base',
  'Apply Foil Stamping', 'Quality Check - Materials', 'Apply Lamination',
  'Install Magnetic Closure', 'Add Interior Lining', 'Final Assembly',
  'Quality Check - Final', 'Packaging', 'Add Ribbon Decoration', 'Embossing',
  'Customer Review', 'Design Revision', 'Sample Creation', 'Bulk Production'
];
const tasks = [];

for (let i = 0; i < 150; i++) {
  const order = orders[i % orders.length];
  const status = pickRandom(taskStatuses);
  const createdDate = new Date(order.created_at);
  const dueDate = new Date(createdDate.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000);
  const isCompleted = status === 'completed';
  const assignedTo = Math.random() > 0.1 ? pickRandom(employeeIds) : null; // 10% unassigned

  tasks.push({
    id: uuidv4(),
    order_id: order.id,
    title: pickRandom(taskTitles),
    description: `Task ${i + 1} for order ${order.order_number}`,
    status: status,
    priority: pickRandom(priorities),
    assigned_to: assignedTo,
    estimated_hours: randomFloat(0.5, 8),
    actual_hours: isCompleted ? randomFloat(0.5, 10) : null,
    start_date: formatDateTime(createdDate),
    due_date: formatDateTime(dueDate),
    completed_at: isCompleted ? formatDateTime(new Date(dueDate.getTime() - randomInt(0, 3) * 24 * 60 * 60 * 1000)) : null,
    notes: Math.random() > 0.7 ? 'Task note: ' + pickRandom(['Priority item', 'Customer requested changes', 'Waiting for materials', 'In progress']) : null,
    created_by: ownerId
  });
}

const insertTask = db.prepare(`INSERT INTO production_tasks (id, order_id, title, description, status, priority, assigned_to, estimated_hours, actual_hours, start_date, due_date, completed_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
tasks.forEach(t => insertTask.run(t.id, t.order_id, t.title, t.description, t.status, t.priority, t.assigned_to, t.estimated_hours, t.actual_hours, t.start_date, t.due_date, t.completed_at, t.notes, t.created_by));
log(`   ✅ Created ${tasks.length} production tasks`);

// ==================== FINANCIAL TRANSACTIONS ====================
log('💵 Seeding financial transactions (120 transactions)...');
const transTypes = ['income', 'expense'];
const incomeCategories = ['sales', 'deposit', 'refund_reversal', 'other_income'];
const expenseCategories = ['materials', 'labor', 'utilities', 'rent', 'marketing', 'equipment', 'transport', 'maintenance', 'office', 'misc'];
const transactions = [];

for (let i = 0; i < 120; i++) {
  const type = pickRandom(transTypes);
  const category = type === 'income' ? pickRandom(incomeCategories) : pickRandom(expenseCategories);
  const order = Math.random() > 0.4 ? pickRandom(orders) : null;
  const transDate = randomDate(oneYearAgo, now);
  const amount = type === 'income' ? randomInt(1000000, 100000000) : randomInt(100000, 20000000);

  transactions.push({
    id: uuidv4(),
    type: type,
    amount: amount,
    category: category,
    order_id: order ? order.id : null,
    payment_date: formatDateTime(transDate),
    description: `${type === 'income' ? 'Payment received' : 'Payment for'} - ${category}`
  });
}

const insertTrans = db.prepare(`INSERT INTO financial_transactions (id, type, amount, category, order_id, payment_date, description) VALUES (?, ?, ?, ?, ?, ?, ?)`);
transactions.forEach(t => insertTrans.run(t.id, t.type, t.amount, t.category, t.order_id, t.payment_date, t.description));
log(`   ✅ Created ${transactions.length} financial transactions`);

// ==================== BUDGETS ====================
log('📊 Seeding budgets (24 budgets - monthly and quarterly)...');
const budgetCategories = ['materials', 'labor', 'utilities', 'rent', 'marketing', 'equipment', 'office', 'transport', 'maintenance', 'insurance', 'training', 'misc'];
const budgets = [];

// Monthly budgets for current year
for (let month = 0; month < 12; month++) {
  const startDate = new Date(now.getFullYear(), month, 1);
  const endDate = new Date(now.getFullYear(), month + 1, 0);

  budgets.push({
    id: uuidv4(),
    category: budgetCategories[month % budgetCategories.length],
    amount: randomInt(5000000, 50000000),
    period: 'monthly',
    start_date: formatDateTime(startDate),
    end_date: formatDateTime(endDate),
    notes: `Monthly budget for ${budgetCategories[month % budgetCategories.length]}`,
    created_by: ownerId
  });
}

// Quarterly budgets
for (let q = 0; q < 4; q++) {
  const startDate = new Date(now.getFullYear(), q * 3, 1);
  const endDate = new Date(now.getFullYear(), (q + 1) * 3, 0);

  budgets.push({
    id: uuidv4(),
    category: 'overall',
    amount: randomInt(100000000, 500000000),
    period: 'quarterly',
    start_date: formatDateTime(startDate),
    end_date: formatDateTime(endDate),
    notes: `Q${q + 1} overall budget`,
    created_by: ownerId
  });
}

// Yearly budgets
for (let i = 0; i < 4; i++) {
  budgets.push({
    id: uuidv4(),
    category: pickRandom(budgetCategories),
    amount: randomInt(200000000, 1000000000),
    period: 'yearly',
    start_date: formatDateTime(new Date(now.getFullYear(), 0, 1)),
    end_date: formatDateTime(new Date(now.getFullYear(), 11, 31)),
    notes: 'Annual budget',
    created_by: ownerId
  });
}

const insertBudget = db.prepare(`INSERT INTO budgets (id, category, amount, period, start_date, end_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
budgets.forEach(b => insertBudget.run(b.id, b.category, b.amount, b.period, b.start_date, b.end_date, b.notes, b.created_by));
log(`   ✅ Created ${budgets.length} budgets`);

// ==================== MESSAGE TEMPLATES ====================
log('📝 Seeding message templates (20 templates - all types)...');
const templates = [
  // WhatsApp templates
  { name: 'Order Confirmation WA', type: 'whatsapp', subject: null, content: 'Hi {{customer_name}}, pesanan Anda #{{order_number}} sudah kami terima. Total: Rp {{total_amount}}. Estimasi selesai: {{due_date}}', variables: 'customer_name,order_number,total_amount,due_date', is_active: 1 },
  { name: 'Payment Reminder WA', type: 'whatsapp', subject: null, content: 'Hi {{customer_name}}, pengingat pembayaran invoice #{{invoice_number}} sebesar Rp {{total_amount}}. Jatuh tempo: {{due_date}}', variables: 'customer_name,invoice_number,total_amount,due_date', is_active: 1 },
  { name: 'Order Ready WA', type: 'whatsapp', subject: null, content: 'Hi {{customer_name}}, pesanan #{{order_number}} sudah siap! Silakan hubungi kami untuk pengambilan/pengiriman.', variables: 'customer_name,order_number', is_active: 1 },
  { name: 'Production Update WA', type: 'whatsapp', subject: null, content: 'Hi {{customer_name}}, update pesanan #{{order_number}}: Status saat ini {{status}}. {{message}}', variables: 'customer_name,order_number,status,message', is_active: 1 },
  { name: 'Thank You WA', type: 'whatsapp', subject: null, content: 'Terima kasih {{customer_name}} atas pesanan Anda! Kami senang bisa melayani Anda. - Premium Gift Box', variables: 'customer_name', is_active: 1 },
  { name: 'Promotion WA', type: 'whatsapp', subject: null, content: 'Hi {{customer_name}}! Promo spesial {{promo_title}}: Diskon {{discount}}% untuk semua produk. Berlaku hingga {{valid_until}}', variables: 'customer_name,promo_title,discount,valid_until', is_active: 1 },
  { name: 'Delivery WA', type: 'whatsapp', subject: null, content: 'Pesanan #{{order_number}} sedang dalam perjalanan! Estimasi tiba: {{delivery_date}}. Kurir: {{courier_name}}', variables: 'order_number,delivery_date,courier_name', is_active: 1 },

  // Email templates
  { name: 'Order Confirmation Email', type: 'email', subject: 'Konfirmasi Pesanan #{{order_number}}', content: 'Dear {{customer_name}},\n\nTerima kasih atas pesanan Anda.\n\nDetail Pesanan:\n- Nomor: {{order_number}}\n- Total: Rp {{total_amount}}\n- Estimasi Selesai: {{due_date}}\n\nKami akan menghubungi Anda untuk konfirmasi desain.\n\nSalam,\nPremium Gift Box', variables: 'customer_name,order_number,total_amount,due_date', is_active: 1 },
  { name: 'Invoice Email', type: 'email', subject: 'Invoice #{{invoice_number}} - Premium Gift Box', content: 'Dear {{customer_name}},\n\nBerikut invoice untuk pesanan Anda:\n\nInvoice: #{{invoice_number}}\nTotal: Rp {{total_amount}}\nJatuh Tempo: {{due_date}}\n\nPembayaran dapat dilakukan ke:\nBank Mandiri\n1234567890\na.n. PT Premium Gift Box\n\nTerima kasih.', variables: 'customer_name,invoice_number,total_amount,due_date', is_active: 1 },
  { name: 'Payment Reminder Email', type: 'email', subject: 'Pengingat Pembayaran Invoice #{{invoice_number}}', content: 'Dear {{customer_name}},\n\nIni adalah pengingat untuk pembayaran invoice #{{invoice_number}} sebesar Rp {{total_amount}} yang jatuh tempo pada {{due_date}}.\n\nMohon abaikan jika sudah melakukan pembayaran.\n\nTerima kasih.', variables: 'customer_name,invoice_number,total_amount,due_date', is_active: 1 },
  { name: 'Thank You Email', type: 'email', subject: 'Terima Kasih - Premium Gift Box', content: 'Dear {{customer_name}},\n\nTerima kasih telah mempercayakan pesanan Anda kepada kami.\n\nKami berharap produk kami memenuhi harapan Anda. Jangan ragu untuk menghubungi kami jika ada pertanyaan.\n\nSalam hangat,\nTim Premium Gift Box', variables: 'customer_name', is_active: 1 },
  { name: 'Feedback Request Email', type: 'email', subject: 'Bagaimana Pengalaman Anda? - Pesanan #{{order_number}}', content: 'Dear {{customer_name}},\n\nKami ingin mendengar pendapat Anda tentang pesanan #{{order_number}}.\n\nFeedback Anda sangat berarti untuk peningkatan layanan kami.\n\nTerima kasih!', variables: 'customer_name,order_number', is_active: 1 },

  // SMS templates
  { name: 'Order Status SMS', type: 'sms', subject: null, content: 'PGB: Pesanan #{{order_number}} status: {{status}}. Info: {{phone}}', variables: 'order_number,status,phone', is_active: 1 },
  { name: 'Payment Received SMS', type: 'sms', subject: null, content: 'PGB: Pembayaran Rp {{amount}} untuk INV#{{invoice_number}} diterima. Terima kasih!', variables: 'amount,invoice_number', is_active: 1 },
  { name: 'Delivery SMS', type: 'sms', subject: null, content: 'PGB: Pesanan #{{order_number}} dlm pengiriman. Est: {{delivery_date}}', variables: 'order_number,delivery_date', is_active: 1 },

  // Inactive templates (for testing filter)
  { name: 'Old Promo Template', type: 'email', subject: 'Promo Lama', content: 'Template promo yang sudah tidak digunakan', variables: '', is_active: 0 },
  { name: 'Deprecated WA Template', type: 'whatsapp', subject: null, content: 'Template lama', variables: '', is_active: 0 },
  { name: 'Test Template', type: 'email', subject: 'Test', content: 'Template untuk testing saja', variables: 'test_var', is_active: 0 },
  { name: 'Empty Variables Template', type: 'whatsapp', subject: null, content: 'Template tanpa variabel', variables: '', is_active: 1 },
];

const insertTemplate = db.prepare(`INSERT INTO message_templates (id, name, type, subject, content, variables, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
templates.forEach(t => {
  insertTemplate.run(uuidv4(), t.name, t.type, t.subject, t.content, t.variables, t.is_active, ownerId);
});
log(`   ✅ Created ${templates.length} message templates`);

// ==================== SETTINGS ====================
log('⚙️ Seeding settings (30 settings - all categories)...');
const settings = [
  // General
  { key: 'company_name', value: 'Premium Gift Box', type: 'string', category: 'general', description: 'Company name' },
  { key: 'company_address', value: 'Jl. Kemang Raya No. 45, Jakarta Selatan 12730', type: 'string', category: 'general', description: 'Company address' },
  { key: 'company_phone', value: '+62-21-7891234', type: 'string', category: 'general', description: 'Company phone' },
  { key: 'company_email', value: 'info@premiumgiftbox.com', type: 'string', category: 'general', description: 'Company email' },
  { key: 'company_website', value: 'www.premiumgiftbox.com', type: 'string', category: 'general', description: 'Company website' },
  { key: 'order_prefix', value: 'ORD', type: 'string', category: 'general', description: 'Order number prefix' },

  // Financial
  { key: 'currency', value: 'IDR', type: 'string', category: 'financial', description: 'Default currency' },
  { key: 'tax_rate', value: '11', type: 'number', category: 'financial', description: 'PPN rate percentage' },
  { key: 'default_markup', value: '50', type: 'number', category: 'financial', description: 'Default markup percentage' },
  { key: 'default_due_days', value: '14', type: 'number', category: 'financial', description: 'Default invoice due days' },
  { key: 'bank_name', value: 'Bank Mandiri', type: 'string', category: 'financial', description: 'Bank name' },
  { key: 'bank_account', value: '1234567890', type: 'string', category: 'financial', description: 'Bank account number' },
  { key: 'bank_holder', value: 'PT Premium Gift Box', type: 'string', category: 'financial', description: 'Bank account holder' },
  { key: 'invoice_prefix', value: 'INV', type: 'string', category: 'financial', description: 'Invoice number prefix' },

  // Inventory
  { key: 'low_stock_threshold', value: '10', type: 'number', category: 'inventory', description: 'Low stock warning threshold' },
  { key: 'auto_reorder', value: 'false', type: 'boolean', category: 'inventory', description: 'Enable auto reorder' },
  { key: 'stock_alert_email', value: 'inventory@premiumgiftbox.com', type: 'string', category: 'inventory', description: 'Stock alert email' },

  // Notifications
  { key: 'email_notifications', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable email notifications' },
  { key: 'whatsapp_notifications', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable WhatsApp notifications' },
  { key: 'sms_notifications', value: 'false', type: 'boolean', category: 'notifications', description: 'Enable SMS notifications' },
  { key: 'notification_email', value: 'notifications@premiumgiftbox.com', type: 'string', category: 'notifications', description: 'Notification email address' },

  // System
  { key: 'auto_backup', value: 'true', type: 'boolean', category: 'system', description: 'Enable auto backup' },
  { key: 'backup_frequency', value: '24', type: 'number', category: 'system', description: 'Backup frequency in hours' },
  { key: 'timezone', value: 'Asia/Jakarta', type: 'string', category: 'system', description: 'System timezone' },
  { key: 'language', value: 'id', type: 'string', category: 'system', description: 'Default language' },
  { key: 'date_format', value: 'DD/MM/YYYY', type: 'string', category: 'system', description: 'Date format' },
  { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system', description: 'Maintenance mode' },

  // Production
  { key: 'default_production_days', value: '7', type: 'number', category: 'production', description: 'Default production time in days' },
  { key: 'working_hours_start', value: '08:00', type: 'string', category: 'production', description: 'Working hours start' },
  { key: 'working_hours_end', value: '17:00', type: 'string', category: 'production', description: 'Working hours end' },
];

const insertSetting = db.prepare(`INSERT INTO settings (id, key, value, type, category, description, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
settings.forEach(s => insertSetting.run(uuidv4(), s.key, s.value, s.type, s.category, s.description, ownerId));
log(`   ✅ Created ${settings.length} settings`);

// ==================== NOTIFICATIONS ====================
log('🔔 Seeding notifications (60 notifications - read and unread)...');
const notifTypes = ['order', 'invoice', 'inventory', 'system', 'task', 'payment', 'reminder'];
const notifications = [];

for (let i = 0; i < 60; i++) {
  const type = pickRandom(notifTypes);
  const userId = pickRandom(users.filter(u => u.is_active)).id;
  const isRead = Math.random() > 0.4 ? 1 : 0; // 60% read, 40% unread

  notifications.push({
    id: uuidv4(),
    user_id: userId,
    type: type,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification ${i + 1}`,
    message: `This is a ${type} notification message for testing. Created at ${new Date().toISOString()}`,
    data: JSON.stringify({ ref_id: uuidv4(), extra: `data_${i}` }),
    is_read: isRead
  });
}

const insertNotif = db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)`);
notifications.forEach(n => insertNotif.run(n.id, n.user_id, n.type, n.title, n.message, n.data, n.is_read));
log(`   ✅ Created ${notifications.length} notifications`);

// ==================== AUDIT LOGS ====================
log('📜 Seeding audit logs (100 logs - all action types)...');
const auditActions = ['create', 'update', 'delete', 'login', 'logout', 'view', 'export', 'import', 'approve', 'reject'];
const auditEntityTypes = ['order', 'customer', 'invoice', 'user', 'material', 'task', 'budget', 'template', 'webhook', 'setting'];
const auditLogs = [];

for (let i = 0; i < 100; i++) {
  const action = pickRandom(auditActions);
  const entityType = pickRandom(auditEntityTypes);
  const createdAt = randomDate(oneYearAgo, now);

  auditLogs.push({
    id: uuidv4(),
    user_id: pickRandom(users).id,
    action: action,
    entity_type: entityType,
    entity_id: uuidv4(),
    old_values: ['update', 'delete'].includes(action) ? JSON.stringify({ status: 'old_value', modified: true }) : null,
    new_values: ['create', 'update'].includes(action) ? JSON.stringify({ status: 'new_value', modified: true }) : null,
    ip_address: `192.168.1.${randomInt(1, 255)}`,
    created_at: formatDateTime(createdAt)
  });
}

const insertAudit = db.prepare(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
auditLogs.forEach(a => insertAudit.run(a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.old_values, a.new_values, a.ip_address));
log(`   ✅ Created ${auditLogs.length} audit logs`);

// ==================== WEBHOOKS ====================
log('🔗 Seeding webhooks (10 webhooks - active and inactive)...');
const webhooks = [
  { name: 'Slack Order Notifications', url: 'https://hooks.example.com/slack/orders', events: 'order.created,order.updated,order.completed', is_active: 1 },
  { name: 'CRM Integration', url: 'https://crm.example.com/webhook/orders', events: 'order.created,customer.created', is_active: 1 },
  { name: 'Inventory Alert System', url: 'https://inventory.example.com/alerts', events: 'inventory.low,inventory.out_of_stock', is_active: 1 },
  { name: 'Payment Gateway Callback', url: 'https://payment.example.com/callback', events: 'payment.received,invoice.paid', is_active: 1 },
  { name: 'Analytics Tracker', url: 'https://analytics.example.com/events', events: 'order.completed,invoice.paid', is_active: 1 },
  { name: 'Email Service', url: 'https://email.example.com/trigger', events: 'order.created,invoice.created,invoice.overdue', is_active: 1 },
  { name: 'Production Monitor', url: 'https://monitor.example.com/production', events: 'task.completed,order.production', is_active: 1 },
  // Inactive webhooks
  { name: 'Old Integration', url: 'https://old.example.com/webhook', events: 'order.created', is_active: 0 },
  { name: 'Deprecated Service', url: 'https://deprecated.example.com/api', events: 'all', is_active: 0 },
  { name: 'Test Webhook', url: 'https://test.example.com/hook', events: 'test.event', is_active: 0 },
];

const insertWebhook = db.prepare(`INSERT INTO webhooks (id, name, url, events, secret, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
webhooks.forEach(w => {
  insertWebhook.run(uuidv4(), w.name, w.url, w.events, 'whsec_' + uuidv4().replace(/-/g, ''), w.is_active, ownerId);
});
log(`   ✅ Created ${webhooks.length} webhooks`);

// ==================== INVENTORY MOVEMENTS ====================
log('📦 Seeding inventory movements (100 movements)...');
const movementTypes = ['purchase', 'usage', 'adjustment', 'waste', 'sale'];
const movements = [];

for (let i = 0; i < 100; i++) {
  const material = pickRandom(materials);
  const type = pickRandom(movementTypes);
  const quantity = type === 'purchase' ? randomInt(10, 200) : randomInt(1, 50);
  const order = ['usage', 'sale'].includes(type) && Math.random() > 0.3 ? pickRandom(orders) : null;

  movements.push({
    id: uuidv4(),
    type: type,
    item_id: material.id,
    item_type: 'material',
    quantity: quantity,
    unit_cost: material.unit_cost,
    total_cost: quantity * material.unit_cost,
    reason: `${type} - ${material.name}`,
    order_id: order ? order.id : null,
    notes: Math.random() > 0.7 ? `Note for movement ${i + 1}` : null,
    created_by: pickRandom(users.filter(u => u.is_active)).id
  });
}

const insertMovement = db.prepare(`INSERT INTO inventory_movements (id, type, item_id, item_type, quantity, unit_cost, total_cost, reason, order_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
movements.forEach(m => insertMovement.run(m.id, m.type, m.item_id, m.item_type, m.quantity, m.unit_cost, m.total_cost, m.reason, m.order_id, m.notes, m.created_by));
log(`   ✅ Created ${movements.length} inventory movements`);

// ==================== PURCHASE ORDERS ====================
log('🛒 Seeding purchase orders (30 purchase orders - all statuses)...');
const poStatuses = ['pending', 'ordered', 'received', 'cancelled'];
const purchaseOrders = [];

for (let i = 1; i <= 30; i++) {
  const items = [];
  const itemCount = randomInt(1, 8);
  let totalAmount = 0;

  for (let j = 0; j < itemCount; j++) {
    const material = pickRandom(materials);
    const qty = randomInt(10, 200);
    const cost = material.unit_cost * qty;
    totalAmount += cost;
    items.push({
      material_id: material.id,
      name: material.name,
      quantity: qty,
      unit_cost: material.unit_cost,
      total: cost
    });
  }

  const status = pickRandom(poStatuses);
  const createdDate = randomDate(sixMonthsAgo, now);
  const expectedDelivery = new Date(createdDate.getTime() + randomInt(7, 30) * 24 * 60 * 60 * 1000);

  purchaseOrders.push({
    id: uuidv4(),
    po_number: `PO-${String(i).padStart(4, '0')}`,
    supplier: pickRandom(['PT. Kertas Nusantara', 'Ribbon House', 'Textile World', 'Hardware Pro', 'Foil Masters', 'Box Supplies Co', 'Premium Ribbon Co']),
    items: JSON.stringify(items),
    total_amount: totalAmount,
    status: status,
    expected_delivery: formatDateTime(expectedDelivery),
    received_date: status === 'received' ? formatDateTime(new Date(expectedDelivery.getTime() + randomInt(-3, 5) * 24 * 60 * 60 * 1000)) : null,
    notes: Math.random() > 0.7 ? `PO Note ${i}` : null,
    created_by: ownerId
  });
}

const insertPO = db.prepare(`INSERT INTO purchase_orders (id, po_number, supplier, items, total_amount, status, expected_delivery, received_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
purchaseOrders.forEach(po => insertPO.run(po.id, po.po_number, po.supplier, po.items, po.total_amount, po.status, po.expected_delivery, po.received_date, po.notes, po.created_by));
log(`   ✅ Created ${purchaseOrders.length} purchase orders`);

// ==================== QUALITY CHECKS ====================
log('✅ Seeding quality checks (60 checks - all statuses)...');
const qcStatuses = ['pending', 'passed', 'failed'];
const qcTypes = ['visual', 'dimensional', 'material', 'finish', 'assembly', 'packaging', 'final'];
const qualityChecks = [];

for (let i = 0; i < 60; i++) {
  const order = pickRandom(orders);
  const status = pickRandom(qcStatuses);
  const checkDate = randomDate(sixMonthsAgo, now);

  qualityChecks.push({
    id: uuidv4(),
    order_id: order.id,
    check_type: pickRandom(qcTypes),
    status: status,
    checked_by: status !== 'pending' ? pickRandom(users.filter(u => u.is_active)).id : null,
    checked_at: status !== 'pending' ? formatDateTime(checkDate) : null,
    notes: status === 'failed' ? pickRandom(['Defect found', 'Color mismatch', 'Dimension incorrect', 'Material damage', 'Assembly issue']) : null
  });
}

const insertQC = db.prepare(`INSERT INTO quality_checks (id, order_id, check_type, status, checked_by, checked_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
qualityChecks.forEach(qc => insertQC.run(qc.id, qc.order_id, qc.check_type, qc.status, qc.checked_by, qc.checked_at, qc.notes));
log(`   ✅ Created ${qualityChecks.length} quality checks`);

// ==================== COMMUNICATION MESSAGES ====================
log('💬 Seeding communication messages (50 messages)...');
const msgTypes = ['email', 'whatsapp', 'sms'];
const msgStatuses = ['pending', 'sent', 'delivered', 'failed', 'read'];
const msgDirections = ['inbound', 'outbound'];
const commMessages = [];

for (let i = 0; i < 50; i++) {
  const customer = pickRandom(customers);
  const type = pickRandom(msgTypes);
  const status = pickRandom(msgStatuses);
  const direction = pickRandom(msgDirections);
  const sentDate = randomDate(sixMonthsAgo, now);

  commMessages.push({
    id: uuidv4(),
    customer_id: customer.id,
    type: type,
    direction: direction,
    subject: type === 'email' ? `Subject ${i + 1}: ${pickRandom(['Order Update', 'Invoice', 'Inquiry', 'Feedback', 'Promotion'])}` : null,
    content: `Message content ${i + 1} - ${direction === 'inbound' ? 'From' : 'To'} ${customer.name}. This is a ${type} message.`,
    status: status,
    sent_at: status !== 'pending' ? formatDateTime(sentDate) : null,
    created_by: pickRandom(users.filter(u => u.is_active)).id
  });
}

const insertMsg = db.prepare(`INSERT INTO communication_messages (id, customer_id, type, direction, subject, content, status, sent_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
commMessages.forEach(m => insertMsg.run(m.id, m.customer_id, m.type, m.direction, m.subject, m.content, m.status, m.sent_at, m.created_by));
log(`   ✅ Created ${commMessages.length} communication messages`);

// ==================== BACKUPS ====================
log('💾 Seeding backups (20 backups - all statuses)...');
const backupStatuses = ['pending', 'in_progress', 'completed', 'failed'];
const backupTypes = ['manual', 'automatic'];
const backups = [];

for (let i = 0; i < 20; i++) {
  const status = pickRandom(backupStatuses);
  const createdDate = randomDate(sixMonthsAgo, now);

  backups.push({
    id: uuidv4(),
    filename: `backup_${formatDate(createdDate)}_${String(i + 1).padStart(3, '0')}.db`,
    size: status === 'completed' ? randomInt(1000000, 100000000) : null,
    type: pickRandom(backupTypes),
    status: status,
    created_by: ownerId
  });
}

const insertBackup = db.prepare(`INSERT INTO backups (id, filename, size, type, status, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
backups.forEach(b => insertBackup.run(b.id, b.filename, b.size, b.type, b.status, b.created_by));
log(`   ✅ Created ${backups.length} backups`);

// ==================== ORDER STAGES ====================
log('📊 Seeding order stages (150 stages)...');
const stageNames = ['inquiry', 'quote', 'design', 'design_approval', 'material_prep', 'production', 'finishing', 'quality_check', 'packaging', 'ready', 'delivery', 'completed'];
const orderStages = [];

for (let i = 0; i < 150; i++) {
  const order = orders[i % orders.length];
  const stage = pickRandom(stageNames);
  const startDate = new Date(order.created_at);
  const hasEndDate = Math.random() > 0.3;

  orderStages.push({
    id: uuidv4(),
    order_id: order.id,
    stage: stage,
    start_date: formatDateTime(startDate),
    end_date: hasEndDate ? formatDateTime(new Date(startDate.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000)) : null,
    notes: Math.random() > 0.7 ? `Stage note: ${stage} for order ${order.order_number}` : null,
    created_by: pickRandom(users.filter(u => u.is_active)).id
  });
}

const insertStage = db.prepare(`INSERT INTO order_stages (id, order_id, stage, start_date, end_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
orderStages.forEach(s => insertStage.run(s.id, s.order_id, s.stage, s.start_date, s.end_date, s.notes, s.created_by));
log(`   ✅ Created ${orderStages.length} order stages`);

// ==================== PRODUCTION LOGS ====================
log('📝 Seeding production logs (80 logs)...');
const prodActions = ['started', 'paused', 'resumed', 'completed', 'note_added', 'issue_reported', 'issue_resolved'];
const prodLogs = [];

for (let i = 0; i < 80; i++) {
  const task = pickRandom(tasks);
  const action = pickRandom(prodActions);

  prodLogs.push({
    id: uuidv4(),
    task_id: task.id,
    action: action,
    description: `Production log: ${action} for task "${task.title}"`,
    hours_worked: ['completed', 'paused'].includes(action) ? randomFloat(0.5, 4) : null,
    created_by: pickRandom(users.filter(u => u.is_active)).id
  });
}

const insertProdLog = db.prepare(`INSERT INTO production_logs (id, task_id, action, description, hours_worked, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
prodLogs.forEach(l => insertProdLog.run(l.id, l.task_id, l.action, l.description, l.hours_worked, l.created_by));
log(`   ✅ Created ${prodLogs.length} production logs`);

// Close database
db.close();

// ==================== SUMMARY ====================
log('\n' + '='.repeat(60));
log('✨ ULTRA COMPREHENSIVE DATABASE SEEDING COMPLETED!');
log('='.repeat(60));
log('\n📊 DATA SUMMARY:');
log('─'.repeat(40));
log(`   Users:                 ${users.length}`);
log(`   Customers:             ${customers.length}`);
log(`   Materials:             ${materials.length}`);
log(`   Orders:                ${orders.length}`);
log(`   Invoices:              ${invoices.length}`);
log(`   Production Tasks:      ${tasks.length}`);
log(`   Financial Trans:       ${transactions.length}`);
log(`   Budgets:               ${budgets.length}`);
log(`   Message Templates:     ${templates.length}`);
log(`   Settings:              ${settings.length}`);
log(`   Notifications:         ${notifications.length}`);
log(`   Audit Logs:            ${auditLogs.length}`);
log(`   Webhooks:              ${webhooks.length}`);
log(`   Inventory Movements:   ${movements.length}`);
log(`   Purchase Orders:       ${purchaseOrders.length}`);
log(`   Quality Checks:        ${qualityChecks.length}`);
log(`   Comm. Messages:        ${commMessages.length}`);
log(`   Backups:               ${backups.length}`);
log(`   Order Stages:          ${orderStages.length}`);
log(`   Production Logs:       ${prodLogs.length}`);
log('─'.repeat(40));
const totalRecords = users.length + customers.length + materials.length + orders.length +
  invoices.length + tasks.length + transactions.length + budgets.length + templates.length +
  settings.length + notifications.length + auditLogs.length + webhooks.length + movements.length +
  purchaseOrders.length + qualityChecks.length + commMessages.length + backups.length +
  orderStages.length + prodLogs.length;
log(`   TOTAL RECORDS:         ${totalRecords}`);

log('\n🔑 TEST ACCOUNTS:');
log('─'.repeat(40));
log('   OWNER:    owner / owner123');
log('   MANAGER:  manager / manager123');
log('   EMPLOYEE: employee1 / employee123');
log('   DESIGNER: designer / designer123');
log('   QC STAFF: qc_staff / qc123');
log('   TEST:     test_user / test123');
log('   INACTIVE: inactive_employee / inactive123 (disabled)');

log('\n📋 EDGE CASES INCLUDED:');
log('─'.repeat(40));
log('   ✓ Users: active, inactive, all roles, special chars');
log('   ✓ Customers: all business types, loyalty statuses, null fields');
log('   ✓ Materials: all categories, low stock, out of stock, high value');
log('   ✓ Orders: all statuses, priorities, overdue, completed');
log('   ✓ Invoices: all statuses, partial payment, overdue');
log('   ✓ Tasks: assigned, unassigned, all statuses');
log('   ✓ Templates: all types, active/inactive, with/without variables');
log('   ✓ Webhooks: active/inactive, various event types');
log('   ✓ And much more...');

log('\n🚀 Ready for comprehensive API testing!');
log('='.repeat(60) + '\n');
