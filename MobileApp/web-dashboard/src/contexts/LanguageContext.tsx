import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Orders',
    'nav.customers': 'Customers',
    'nav.inventory': 'Inventory',
    'nav.financial': 'Financial',
    'nav.analytics': 'Analytics',
    'nav.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Premium Gift Box Dashboard',
    'dashboard.welcome': 'Welcome to your business management system',
    
    // Metrics
    'metrics.revenue': 'Total Revenue',
    'metrics.orders': 'Orders',
    'metrics.customers': 'Customers',
    'metrics.inventory': 'Items',
    'metrics.growth': 'Growth',
    'metrics.thisMonth': 'This Month',
    
    // Login
    'login.title': 'Welcome Back',
    'login.subtitle': 'Sign in to your Premium Gift Box account',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.signin': 'Sign In',
    'login.error': 'Invalid username or password',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    
    // Orders
    'orders.title': 'Order Management',
    'orders.new': 'New Order',
    'orders.pending': 'Pending',
    'orders.inProgress': 'In Progress',
    'orders.completed': 'Completed',
    'orders.cancelled': 'Cancelled',
    'orders.active': 'Active',
    'orders.overdue': 'Overdue',
    'orders.totalValue': 'Total Value',
    'orders.newOrder': 'New Order',
    'orders.editOrder': 'Edit Order',
    'orders.deleteOrder': 'Delete Order',
    'orders.updateStatus': 'Update Status',
    'orders.customer': 'Customer',
    'orders.boxType': 'Box Type',
    'orders.amount': 'Amount',
    'orders.dueDate': 'Due Date',
    'orders.specialRequests': 'Special Requests',
    'orders.noOrders': 'No orders found',
    'orders.createFirst': 'Create your first order to get started.',
    'orders.adjustFilters': 'Try adjusting your filters.',
    'orders.confirmDelete': 'Are you sure? This will permanently delete this order and its stage history.',
    'orders.allStatus': 'All Status',
    'orders.allPriority': 'All Priority',
    
    // Customers
    'customers.title': 'Customer Database',
    'customers.new': 'New Customer',
    'customers.editCustomer': 'Edit Customer',
    'customers.deleteCustomer': 'Delete Customer',
    'customers.corporate': 'Corporate',
    'customers.individual': 'Individual',
    'customers.wedding': 'Wedding',
    'customers.event': 'Event',
    'customers.allTypes': 'All Types',
    'customers.allLoyalty': 'All Loyalty',
    'customers.name': 'Name',
    'customers.email': 'Email',
    'customers.phone': 'Phone',
    'customers.address': 'Address',
    'customers.businessType': 'Business Type',
    'customers.loyaltyStatus': 'Loyalty Status',
    'customers.totalOrders': 'Total Orders',
    'customers.totalSpent': 'Total Spent',
    'customers.totalRevenue': 'Total Revenue',
    'customers.vipCustomers': 'VIP Customers',
    'customers.noCustomers': 'No customers found',
    'customers.createFirst': 'Add your first customer to get started.',
    'customers.adjustFilters': 'Try adjusting your filters.',
    'customers.confirmDelete': 'Are you sure? This will remove all customer data. Customers with existing orders cannot be deleted.',

    // Inventory
    'inventory.title': 'Inventory Management',
    'inventory.lowStock': 'Low Stock',
    'inventory.outOfStock': 'Out of Stock',
    'inventory.inStock': 'In Stock',
    'inventory.totalItems': 'Total Items',
    'inventory.totalValue': 'Total Value',
    'inventory.materialsTracked': 'materials tracked',
    'inventory.addMaterial': 'Add Material',
    'inventory.editMaterial': 'Edit Material',
    'inventory.deleteMaterial': 'Delete Material',
    'inventory.allCategories': 'All Categories',
    'inventory.name': 'Name',
    'inventory.category': 'Category',
    'inventory.unit': 'Unit',
    'inventory.unitCost': 'Unit Cost (IDR)',
    'inventory.reorderLevel': 'Reorder Level',
    'inventory.currentStock': 'Current Stock',
    'inventory.supplier': 'Supplier',
    'inventory.notes': 'Notes',
    'inventory.noItems': 'No materials found',
    'inventory.createFirst': 'Add your first material to get started.',
    'inventory.adjustFilters': 'Try adjusting your filters.',
    'inventory.confirmDelete': 'Are you sure? This will remove the material and all its movement history.',
    'inventory.stockMovement': 'Stock Movement',
    'inventory.movementType': 'Type',
    'inventory.quantity': 'Quantity',
    'inventory.record': 'Record',
    'inventory.current': 'current',
    'inventory.createSuccess': 'Material created successfully',
    'inventory.updateSuccess': 'Material updated successfully',
    'inventory.deleteSuccess': 'Material deleted successfully',
    'inventory.movementSuccess': 'Stock movement recorded successfully',
    
    // Financial
    'financial.title': 'Financial Management',
    'financial.subtitle': 'Financial overview and transactions',
    'financial.income': 'Income',
    'financial.expense': 'Expense',
    'financial.profit': 'Profit',
    'financial.tax': 'Tax (PPN)',
    'financial.totalRevenue': 'Total Revenue',
    'financial.totalExpenses': 'Total Expenses',
    'financial.netProfit': 'Net Profit',
    'financial.pendingInvoices': 'Pending Invoices',
    'financial.transactions': 'Transactions',
    'financial.invoices': 'Invoices',
    'financial.newTransaction': 'New Transaction',
    'financial.newInvoice': 'New Invoice',
    'financial.type': 'Type',
    'financial.category': 'Category',
    'financial.amount': 'Amount',
    'financial.description': 'Description',
    'financial.paymentMethod': 'Payment Method',
    'financial.invoiceNumber': 'Invoice #',
    'financial.customer': 'Customer',
    'financial.issueDate': 'Issue Date',
    'financial.dueDate': 'Due Date',
    'financial.status': 'Status',
    'financial.markPaid': 'Mark Paid',
    'financial.markOverdue': 'Overdue',
    'financial.lineItems': 'Line Items',
    'financial.addItem': '+ Add Item',
    'financial.subtotal': 'Subtotal',
    'financial.discount': 'Discount',
    'financial.ppn': 'PPN (11%)',
    'financial.total': 'Total',
    'financial.noTransactions': 'No transactions found',
    'financial.createFirstTx': 'Record your first transaction to get started.',
    'financial.adjustTxFilters': 'Try adjusting your filters.',
    'financial.noInvoices': 'No invoices found',
    'financial.createFirstInv': 'Create your first invoice to get started.',
    'financial.adjustInvFilters': 'Try adjusting your filters.',
    'financial.allTypes': 'All Types',
    'financial.allCategories': 'All Categories',
    'financial.allStatuses': 'All Statuses',
    'financial.chartTitle': 'Income vs Expenses by Category',
    'financial.txCreateSuccess': 'Transaction created successfully',
    'financial.invCreateSuccess': 'Invoice created successfully',
    'financial.invStatusSuccess': 'Invoice status updated successfully',
    'financial.notes': 'Notes',
    'financial.order': 'Order',
    'financial.exportCsv': 'Export CSV',

    // Analytics
    'analytics.title': 'Business Analytics',
    'analytics.subtitle': 'Detailed business insights and reports',
    'analytics.totalOrders': 'Total Orders',
    'analytics.revenue': 'Revenue',
    'analytics.customers': 'Customers',
    'analytics.avgOrder': 'Avg Order',
    'analytics.completed': 'completed',
    'analytics.paid': 'paid',
    'analytics.vip': 'VIP',
    'analytics.invoices': 'invoices',
    'analytics.orderStatus': 'Order Status Distribution',
    'analytics.customerSegments': 'Customer Segments',
    'analytics.revenueTrend': 'Revenue Trend',
    'analytics.topCustomers': 'Top Customers by Revenue',
    'analytics.productionPipeline': 'Production Pipeline',
    'analytics.inventoryOverview': 'Inventory Overview',
    'analytics.totalMaterials': 'Total Materials',
    'analytics.outOfStock': 'Out of Stock',
    'analytics.lowStock': 'Low Stock',
    'analytics.totalValue': 'Total Value',
    'analytics.noData': 'No data available',
    'analytics.loadError': 'Failed to load this section',
    'analytics.refresh': 'Refresh',
    'analytics.period': 'Period',
    'analytics.thisWeek': 'This Week',
    'analytics.thisMonth': 'This Month',
    'analytics.thisQuarter': 'This Quarter',
    'analytics.thisYear': 'This Year',
    'analytics.orders': 'Orders',
    'analytics.completionRate': 'Completion Rate',
    'analytics.designing': 'Designing',
    'analytics.production': 'Production',
    'analytics.qualityControl': 'QC',
    'analytics.pending': 'Pending',
    'analytics.cancelled': 'Cancelled',
    'analytics.active': 'Active',
    'analytics.urgentOrders': 'Urgent Orders',

    // Production
    'nav.production': 'Production',
    'production.title': 'Production Management',
    'production.board': 'Production Board',
    'production.tasks': 'Tasks',

    // Reports
    'nav.reports': 'Reports',
    'reports.title': 'Reports',

    // Users
    'nav.users': 'Users',
    'users.title': 'User Management',

    // Settings
    'nav.settings': 'Settings',
    'settings.title': 'Settings',
  },
  id: {
    // Navigation
    'nav.dashboard': 'Dasbor',
    'nav.orders': 'Pesanan',
    'nav.customers': 'Pelanggan',
    'nav.inventory': 'Inventori',
    'nav.financial': 'Keuangan',
    'nav.analytics': 'Analitik',
    'nav.logout': 'Keluar',
    
    // Dashboard
    'dashboard.title': 'Dasbor Premium Gift Box',
    'dashboard.welcome': 'Selamat datang di sistem manajemen bisnis Anda',
    
    // Metrics
    'metrics.revenue': 'Total Pendapatan',
    'metrics.orders': 'Pesanan',
    'metrics.customers': 'Pelanggan',
    'metrics.inventory': 'Item',
    'metrics.growth': 'Pertumbuhan',
    'metrics.thisMonth': 'Bulan Ini',
    
    // Login
    'login.title': 'Selamat Datang Kembali',
    'login.subtitle': 'Masuk ke akun Premium Gift Box Anda',
    'login.username': 'Nama Pengguna',
    'login.password': 'Kata Sandi',
    'login.signin': 'Masuk',
    'login.error': 'Nama pengguna atau kata sandi salah',
    
    // Common
    'common.loading': 'Memuat...',
    'common.error': 'Kesalahan',
    'common.success': 'Berhasil',
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.edit': 'Edit',
    'common.delete': 'Hapus',
    'common.add': 'Tambah',
    'common.search': 'Cari',
    'common.filter': 'Filter',
    'common.export': 'Ekspor',
    
    // Orders
    'orders.title': 'Manajemen Pesanan',
    'orders.new': 'Pesanan Baru',
    'orders.pending': 'Menunggu',
    'orders.inProgress': 'Sedang Proses',
    'orders.completed': 'Selesai',
    'orders.cancelled': 'Dibatalkan',
    'orders.active': 'Aktif',
    'orders.overdue': 'Terlambat',
    'orders.totalValue': 'Nilai Total',
    'orders.newOrder': 'Pesanan Baru',
    'orders.editOrder': 'Edit Pesanan',
    'orders.deleteOrder': 'Hapus Pesanan',
    'orders.updateStatus': 'Perbarui Status',
    'orders.customer': 'Pelanggan',
    'orders.boxType': 'Tipe Kotak',
    'orders.amount': 'Jumlah',
    'orders.dueDate': 'Tanggal Jatuh Tempo',
    'orders.specialRequests': 'Permintaan Khusus',
    'orders.noOrders': 'Tidak ada pesanan ditemukan',
    'orders.createFirst': 'Buat pesanan pertama Anda untuk memulai.',
    'orders.adjustFilters': 'Coba sesuaikan filter Anda.',
    'orders.confirmDelete': 'Apakah Anda yakin? Ini akan menghapus pesanan dan riwayat tahapnya secara permanen.',
    'orders.allStatus': 'Semua Status',
    'orders.allPriority': 'Semua Prioritas',
    
    // Customers
    'customers.title': 'Database Pelanggan',
    'customers.new': 'Pelanggan Baru',
    'customers.editCustomer': 'Edit Pelanggan',
    'customers.deleteCustomer': 'Hapus Pelanggan',
    'customers.corporate': 'Korporat',
    'customers.individual': 'Individu',
    'customers.wedding': 'Pernikahan',
    'customers.event': 'Acara',
    'customers.allTypes': 'Semua Tipe',
    'customers.allLoyalty': 'Semua Loyalitas',
    'customers.name': 'Nama',
    'customers.email': 'Email',
    'customers.phone': 'Telepon',
    'customers.address': 'Alamat',
    'customers.businessType': 'Tipe Bisnis',
    'customers.loyaltyStatus': 'Status Loyalitas',
    'customers.totalOrders': 'Total Pesanan',
    'customers.totalSpent': 'Total Belanja',
    'customers.totalRevenue': 'Total Pendapatan',
    'customers.vipCustomers': 'Pelanggan VIP',
    'customers.noCustomers': 'Tidak ada pelanggan ditemukan',
    'customers.createFirst': 'Tambahkan pelanggan pertama Anda untuk memulai.',
    'customers.adjustFilters': 'Coba sesuaikan filter Anda.',
    'customers.confirmDelete': 'Apakah Anda yakin? Ini akan menghapus semua data pelanggan. Pelanggan dengan pesanan yang ada tidak dapat dihapus.',

    // Inventory
    'inventory.title': 'Manajemen Inventori',
    'inventory.lowStock': 'Stok Rendah',
    'inventory.outOfStock': 'Stok Habis',
    'inventory.inStock': 'Tersedia',
    'inventory.totalItems': 'Total Item',
    'inventory.totalValue': 'Nilai Total',
    'inventory.materialsTracked': 'material terlacak',
    'inventory.addMaterial': 'Tambah Material',
    'inventory.editMaterial': 'Edit Material',
    'inventory.deleteMaterial': 'Hapus Material',
    'inventory.allCategories': 'Semua Kategori',
    'inventory.name': 'Nama',
    'inventory.category': 'Kategori',
    'inventory.unit': 'Satuan',
    'inventory.unitCost': 'Biaya Satuan (IDR)',
    'inventory.reorderLevel': 'Level Reorder',
    'inventory.currentStock': 'Stok Saat Ini',
    'inventory.supplier': 'Pemasok',
    'inventory.notes': 'Catatan',
    'inventory.noItems': 'Tidak ada material ditemukan',
    'inventory.createFirst': 'Tambahkan material pertama Anda untuk memulai.',
    'inventory.adjustFilters': 'Coba sesuaikan filter Anda.',
    'inventory.confirmDelete': 'Apakah Anda yakin? Ini akan menghapus material dan semua riwayat pergerakannya.',
    'inventory.stockMovement': 'Pergerakan Stok',
    'inventory.movementType': 'Tipe',
    'inventory.quantity': 'Kuantitas',
    'inventory.record': 'Catat',
    'inventory.current': 'saat ini',
    'inventory.createSuccess': 'Material berhasil dibuat',
    'inventory.updateSuccess': 'Material berhasil diperbarui',
    'inventory.deleteSuccess': 'Material berhasil dihapus',
    'inventory.movementSuccess': 'Pergerakan stok berhasil dicatat',
    
    // Financial
    'financial.title': 'Manajemen Keuangan',
    'financial.subtitle': 'Ringkasan keuangan dan transaksi',
    'financial.income': 'Pemasukan',
    'financial.expense': 'Pengeluaran',
    'financial.profit': 'Keuntungan',
    'financial.tax': 'Pajak (PPN)',
    'financial.totalRevenue': 'Total Pendapatan',
    'financial.totalExpenses': 'Total Pengeluaran',
    'financial.netProfit': 'Laba Bersih',
    'financial.pendingInvoices': 'Faktur Tertunda',
    'financial.transactions': 'Transaksi',
    'financial.invoices': 'Faktur',
    'financial.newTransaction': 'Transaksi Baru',
    'financial.newInvoice': 'Faktur Baru',
    'financial.type': 'Tipe',
    'financial.category': 'Kategori',
    'financial.amount': 'Jumlah',
    'financial.description': 'Deskripsi',
    'financial.paymentMethod': 'Metode Pembayaran',
    'financial.invoiceNumber': 'No. Faktur',
    'financial.customer': 'Pelanggan',
    'financial.issueDate': 'Tanggal Terbit',
    'financial.dueDate': 'Tanggal Jatuh Tempo',
    'financial.status': 'Status',
    'financial.markPaid': 'Tandai Lunas',
    'financial.markOverdue': 'Terlambat',
    'financial.lineItems': 'Item Baris',
    'financial.addItem': '+ Tambah Item',
    'financial.subtotal': 'Subtotal',
    'financial.discount': 'Diskon',
    'financial.ppn': 'PPN (11%)',
    'financial.total': 'Total',
    'financial.noTransactions': 'Tidak ada transaksi ditemukan',
    'financial.createFirstTx': 'Catat transaksi pertama Anda untuk memulai.',
    'financial.adjustTxFilters': 'Coba sesuaikan filter Anda.',
    'financial.noInvoices': 'Tidak ada faktur ditemukan',
    'financial.createFirstInv': 'Buat faktur pertama Anda untuk memulai.',
    'financial.adjustInvFilters': 'Coba sesuaikan filter Anda.',
    'financial.allTypes': 'Semua Tipe',
    'financial.allCategories': 'Semua Kategori',
    'financial.allStatuses': 'Semua Status',
    'financial.chartTitle': 'Pemasukan vs Pengeluaran per Kategori',
    'financial.txCreateSuccess': 'Transaksi berhasil dibuat',
    'financial.invCreateSuccess': 'Faktur berhasil dibuat',
    'financial.invStatusSuccess': 'Status faktur berhasil diperbarui',
    'financial.notes': 'Catatan',
    'financial.order': 'Pesanan',
    'financial.exportCsv': 'Ekspor CSV',

    // Analytics
    'analytics.title': 'Analitik Bisnis',
    'analytics.subtitle': 'Wawasan bisnis dan laporan terperinci',
    'analytics.totalOrders': 'Total Pesanan',
    'analytics.revenue': 'Pendapatan',
    'analytics.customers': 'Pelanggan',
    'analytics.avgOrder': 'Rata-rata Pesanan',
    'analytics.completed': 'selesai',
    'analytics.paid': 'terbayar',
    'analytics.vip': 'VIP',
    'analytics.invoices': 'faktur',
    'analytics.orderStatus': 'Distribusi Status Pesanan',
    'analytics.customerSegments': 'Segmen Pelanggan',
    'analytics.revenueTrend': 'Tren Pendapatan',
    'analytics.topCustomers': 'Pelanggan Teratas berdasarkan Pendapatan',
    'analytics.productionPipeline': 'Pipeline Produksi',
    'analytics.inventoryOverview': 'Ringkasan Inventori',
    'analytics.totalMaterials': 'Total Material',
    'analytics.outOfStock': 'Stok Habis',
    'analytics.lowStock': 'Stok Rendah',
    'analytics.totalValue': 'Nilai Total',
    'analytics.noData': 'Tidak ada data tersedia',
    'analytics.loadError': 'Gagal memuat bagian ini',
    'analytics.refresh': 'Segarkan',
    'analytics.period': 'Periode',
    'analytics.thisWeek': 'Minggu Ini',
    'analytics.thisMonth': 'Bulan Ini',
    'analytics.thisQuarter': 'Kuartal Ini',
    'analytics.thisYear': 'Tahun Ini',
    'analytics.orders': 'Pesanan',
    'analytics.completionRate': 'Tingkat Penyelesaian',
    'analytics.designing': 'Desain',
    'analytics.production': 'Produksi',
    'analytics.qualityControl': 'QC',
    'analytics.pending': 'Menunggu',
    'analytics.cancelled': 'Dibatalkan',
    'analytics.active': 'Aktif',
    'analytics.urgentOrders': 'Pesanan Mendesak',

    // Production
    'nav.production': 'Produksi',
    'production.title': 'Manajemen Produksi',
    'production.board': 'Papan Produksi',
    'production.tasks': 'Tugas',

    // Reports
    'nav.reports': 'Laporan',
    'reports.title': 'Laporan',

    // Users
    'nav.users': 'Pengguna',
    'users.title': 'Manajemen Pengguna',

    // Settings
    'nav.settings': 'Pengaturan',
    'settings.title': 'Pengaturan',
  },
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'en' || saved === 'id') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};