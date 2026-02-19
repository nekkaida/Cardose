// Migration 001: Add missing columns to invoices table
// These were previously applied ad-hoc in DatabaseService.runMigrations()

function columnExists(db, table, column) {
  const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
  return columns.some((col) => col.name === column);
}

module.exports = {
  up(db) {
    if (!columnExists(db, 'invoices', 'items')) {
      db.exec('ALTER TABLE invoices ADD COLUMN items TEXT');
    }
    if (!columnExists(db, 'invoices', 'paid_date')) {
      db.exec('ALTER TABLE invoices ADD COLUMN paid_date DATETIME');
    }
    if (!columnExists(db, 'invoices', 'payment_method')) {
      db.exec('ALTER TABLE invoices ADD COLUMN payment_method TEXT');
    }
  },
};
