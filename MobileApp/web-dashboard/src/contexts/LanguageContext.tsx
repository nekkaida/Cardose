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
    'inventory.lowStock': 'Low Stock Alert',
    'inventory.outOfStock': 'Out of Stock',
    'inventory.inStock': 'In Stock',
    
    // Financial
    'financial.title': 'Financial Management',
    'financial.income': 'Income',
    'financial.expense': 'Expense',
    'financial.profit': 'Profit',
    'financial.tax': 'Tax (PPN)',

    // Analytics
    'analytics.title': 'Business Analytics',

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
    'inventory.lowStock': 'Peringatan Stok Rendah',
    'inventory.outOfStock': 'Stok Habis',
    'inventory.inStock': 'Tersedia',
    
    // Financial
    'financial.title': 'Manajemen Keuangan',
    'financial.income': 'Pemasukan',
    'financial.expense': 'Pengeluaran',
    'financial.profit': 'Keuntungan',
    'financial.tax': 'Pajak (PPN)',

    // Analytics
    'analytics.title': 'Analitik Bisnis',

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