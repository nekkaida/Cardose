// Real Indonesian business sample data for Premium Gift Box

const sampleCustomers = [
  {
    id: 'cust_001',
    name: 'PT. Maju Bersama Indonesia',
    email: 'procurement@majubersama.co.id',
    phone: '+62-21-5551234',
    whatsapp: '+62-812-3456-7890',
    businessType: 'corporate',
    loyaltyStatus: 'VIP',
    address: {
      street: 'Jl. Jenderal Sudirman No. 45',
      kelurahan: 'Karet Tengsin',
      kecamatan: 'Tanah Abang',
      kabupaten: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
      postalCode: '10220'
    },
    contact: {
      person: 'Ibu Sarah Wijaya',
      position: 'Procurement Manager',
      department: 'Corporate Affairs'
    },
    businessInfo: {
      npwp: '01.234.567.8-901.000',
      siup: 'SIUP-001-JAKARTA-2020',
      establishedYear: 2015,
      industry: 'Manufacturing'
    },
    totalOrders: 25,
    totalSpent: 125000000,
    averageOrderValue: 5000000,
    lastOrderDate: '2024-08-10',
    preferences: {
      materials: ['premium_cardboard', 'satin_ribbon'],
      colors: ['gold', 'navy_blue', 'white'],
      budgetRange: '3000000-8000000',
      preferredDelivery: 'office'
    },
    createdAt: '2023-03-15',
    updatedAt: '2024-08-15'
  },
  {
    id: 'cust_002',
    name: 'CV. Sukses Mandiri',
    email: 'admin@suksesmandiri.com',
    phone: '+62-22-7771234',
    whatsapp: '+62-856-7890-1234',
    businessType: 'trading',
    loyaltyStatus: 'Regular',
    address: {
      street: 'Jl. Dago No. 123',
      kelurahan: 'Coblong',
      kecamatan: 'Coblong',
      kabupaten: 'Bandung',
      provinsi: 'Jawa Barat',
      postalCode: '40135'
    },
    contact: {
      person: 'Bapak Rudi Hartono',
      position: 'Owner',
      department: 'Management'
    },
    businessInfo: {
      npwp: '02.345.678.9-012.000',
      siup: 'SIUP-002-BANDUNG-2019',
      establishedYear: 2019,
      industry: 'Trading'
    },
    totalOrders: 12,
    totalSpent: 45000000,
    averageOrderValue: 3750000,
    lastOrderDate: '2024-08-12',
    preferences: {
      materials: ['duplex_paper', 'grosgrain_ribbon'],
      colors: ['red', 'gold', 'cream'],
      budgetRange: '2000000-5000000',
      preferredDelivery: 'pickup'
    },
    createdAt: '2023-07-20',
    updatedAt: '2024-08-12'
  },
  {
    id: 'cust_003',
    name: 'Wedding Organizer Bintang',
    email: 'info@weddingbintang.com',
    phone: '+62-21-8881234',
    whatsapp: '+62-813-5678-9012',
    businessType: 'wedding',
    loyaltyStatus: 'Premium',
    address: {
      street: 'Jl. Kemang Raya No. 78',
      kelurahan: 'Bangka',
      kecamatan: 'Mampang Prapatan',
      kabupaten: 'Jakarta Selatan',
      provinsi: 'DKI Jakarta',
      postalCode: '12560'
    },
    contact: {
      person: 'Ibu Maya Sari',
      position: 'Creative Director',
      department: 'Design'
    },
    businessInfo: {
      npwp: '03.456.789.0-123.000',
      siup: 'SIUP-003-JAKARTA-2018',
      establishedYear: 2018,
      industry: 'Event Services'
    },
    totalOrders: 35,
    totalSpent: 180000000,
    averageOrderValue: 5142857,
    lastOrderDate: '2024-08-14',
    preferences: {
      materials: ['premium_cardboard', 'velvet_ribbon', 'pearl_accent'],
      colors: ['rose_gold', 'blush_pink', 'ivory', 'gold'],
      budgetRange: '4000000-12000000',
      preferredDelivery: 'venue'
    },
    createdAt: '2023-01-10',
    updatedAt: '2024-08-14'
  },
  {
    id: 'cust_004',
    name: 'Yayasan Pendidikan Nusantara',
    email: 'admin@ypnusantara.org',
    phone: '+62-274-1234567',
    whatsapp: '+62-857-1234-5678',
    businessType: 'nonprofit',
    loyaltyStatus: 'Regular',
    address: {
      street: 'Jl. Malioboro No. 156',
      kelurahan: 'Sosromenduran',
      kecamatan: 'Gedongtengen',
      kabupaten: 'Yogyakarta',
      provinsi: 'Daerah Istimewa Yogyakarta',
      postalCode: '55271'
    },
    contact: {
      person: 'Bapak Dr. Ahmad Sutrisno',
      position: 'Ketua Yayasan',
      department: 'Executive'
    },
    businessInfo: {
      npwp: '04.567.890.1-234.000',
      siup: 'SIUP-004-YOGYA-2020',
      establishedYear: 2005,
      industry: 'Education'
    },
    totalOrders: 8,
    totalSpent: 24000000,
    averageOrderValue: 3000000,
    lastOrderDate: '2024-07-25',
    preferences: {
      materials: ['recycled_cardboard', 'cotton_ribbon'],
      colors: ['green', 'blue', 'white'],
      budgetRange: '1500000-4000000',
      preferredDelivery: 'office'
    },
    createdAt: '2023-09-05',
    updatedAt: '2024-07-25'
  },
  {
    id: 'cust_005',
    name: 'Keluarga Wijaya (Personal)',
    email: 'family.wijaya@gmail.com',
    phone: '+62-31-7654321',
    whatsapp: '+62-818-9876-5432',
    businessType: 'individual',
    loyaltyStatus: 'New',
    address: {
      street: 'Jl. Darmo Permai III No. 25',
      kelurahan: 'Sonokwijenan',
      kecamatan: 'Sukomanunggal',
      kabupaten: 'Surabaya',
      provinsi: 'Jawa Timur',
      postalCode: '60189'
    },
    contact: {
      person: 'Ibu Lina Wijaya',
      position: 'Customer',
      department: 'Personal'
    },
    businessInfo: {
      npwp: '05.678.901.2-345.000',
      siup: null,
      establishedYear: null,
      industry: 'Personal'
    },
    totalOrders: 2,
    totalSpent: 3500000,
    averageOrderValue: 1750000,
    lastOrderDate: '2024-08-08',
    preferences: {
      materials: ['art_paper', 'satin_ribbon'],
      colors: ['pink', 'purple', 'gold'],
      budgetRange: '1000000-3000000',
      preferredDelivery: 'home'
    },
    createdAt: '2024-07-15',
    updatedAt: '2024-08-08'
  }
];

const sampleOrders = [
  {
    id: 'order_001',
    orderNumber: 'PGB-2024-001',
    customerId: 'cust_001',
    customerName: 'PT. Maju Bersama Indonesia',
    status: 'in_progress',
    priority: 'high',
    items: [
      {
        id: 'item_001',
        name: 'Premium Corporate Gift Box',
        category: 'corporate_package',
        quantity: 100,
        unitPrice: 75000,
        specifications: {
          size: '25x20x8 cm',
          material: 'Premium Art Paper 310gsm',
          finish: 'Matte Lamination + Spot UV',
          ribbon: 'Satin Gold 2.5cm',
          insert: 'Velvet foam insert',
          printing: 'Full Color + Gold Foil Logo'
        }
      }
    ],
    pricing: {
      subtotal: 7500000,
      materialCost: 4500000,
      laborCost: 1500000,
      overheadCost: 750000,
      markup: 750000,
      ppnRate: 11,
      ppnAmount: 825000,
      finalPrice: 8325000,
      profitMargin: 45.8
    },
    delivery: {
      method: 'delivery',
      address: 'Jl. Jenderal Sudirman No. 45, Jakarta Pusat',
      scheduledDate: '2024-08-25',
      notes: 'Deliver to reception desk, contact Ms. Sarah before delivery'
    },
    production: {
      designApprovalDate: '2024-08-16',
      productionStartDate: '2024-08-18',
      estimatedCompletionDate: '2024-08-24',
      assignedTeam: 'Team A',
      specialInstructions: 'Quality control for logo alignment critical'
    },
    paymentInfo: {
      method: 'bank_transfer',
      terms: 'NET 30',
      downPayment: 4162500, // 50%
      remainingBalance: 4162500,
      dueDate: '2024-09-25',
      invoiceNumber: 'INV-PGB-2024-001'
    },
    createdAt: '2024-08-15',
    updatedAt: '2024-08-17',
    dueDate: '2024-08-25'
  },
  {
    id: 'order_002',
    orderNumber: 'PGB-2024-002',
    customerId: 'cust_003',
    customerName: 'Wedding Organizer Bintang',
    status: 'pending',
    priority: 'urgent',
    items: [
      {
        id: 'item_002',
        name: 'Wedding Favor Boxes',
        category: 'wedding_favor',
        quantity: 200,
        unitPrice: 45000,
        specifications: {
          size: '12x12x6 cm',
          material: 'Art Paper 260gsm',
          finish: 'Gloss Lamination',
          ribbon: 'Velvet Rose Gold 2cm',
          insert: 'Satin fabric lining',
          printing: 'Rose Gold Foil Names + Date'
        }
      }
    ],
    pricing: {
      subtotal: 9000000,
      materialCost: 5400000,
      laborCost: 1800000,
      overheadCost: 900000,
      markup: 900000,
      ppnRate: 11,
      ppnAmount: 990000,
      finalPrice: 9990000,
      profitMargin: 45.9
    },
    delivery: {
      method: 'venue_delivery',
      address: 'The Ritz-Carlton Jakarta, Jl. DR. Ide Anak Agung Gde Agung',
      scheduledDate: '2024-08-22',
      notes: 'Wedding on 23 Aug, deliver 1 day before. Contact wedding coordinator.'
    },
    production: {
      designApprovalDate: null,
      productionStartDate: null,
      estimatedCompletionDate: '2024-08-21',
      assignedTeam: 'Team B',
      specialInstructions: 'Rush order - priority production'
    },
    paymentInfo: {
      method: 'bank_transfer',
      terms: 'Full payment before production',
      downPayment: 9990000,
      remainingBalance: 0,
      dueDate: '2024-08-19',
      invoiceNumber: 'INV-PGB-2024-002'
    },
    createdAt: '2024-08-16',
    updatedAt: '2024-08-17',
    dueDate: '2024-08-22'
  },
  {
    id: 'order_003',
    orderNumber: 'PGB-2024-003',
    customerId: 'cust_002',
    customerName: 'CV. Sukses Mandiri',
    status: 'completed',
    priority: 'normal',
    items: [
      {
        id: 'item_003',
        name: 'Product Launch Gift Set',
        category: 'promotional',
        quantity: 50,
        unitPrice: 65000,
        specifications: {
          size: '20x15x10 cm',
          material: 'Duplex 300gsm',
          finish: 'Matte Lamination',
          ribbon: 'Grosgrain Red 3cm',
          insert: 'Cardboard divider',
          printing: 'Full Color CMYK'
        }
      }
    ],
    pricing: {
      subtotal: 3250000,
      materialCost: 1950000,
      laborCost: 650000,
      overheadCost: 325000,
      markup: 325000,
      ppnRate: 11,
      ppnAmount: 357500,
      finalPrice: 3607500,
      profitMargin: 46.0
    },
    delivery: {
      method: 'pickup',
      address: 'Premium Gift Box Workshop',
      scheduledDate: '2024-08-10',
      notes: 'Customer pickup - payment on delivery'
    },
    production: {
      designApprovalDate: '2024-08-05',
      productionStartDate: '2024-08-06',
      estimatedCompletionDate: '2024-08-09',
      assignedTeam: 'Team C',
      specialInstructions: 'Standard production schedule'
    },
    paymentInfo: {
      method: 'cash',
      terms: 'COD',
      downPayment: 0,
      remainingBalance: 0,
      dueDate: '2024-08-10',
      invoiceNumber: 'INV-PGB-2024-003',
      paidDate: '2024-08-10',
      paidAmount: 3607500
    },
    createdAt: '2024-08-02',
    updatedAt: '2024-08-10',
    dueDate: '2024-08-10',
    completedAt: '2024-08-10'
  }
];

const sampleInventory = [
  {
    id: 'inv_001',
    name: 'Art Paper 310gsm',
    category: 'paper',
    currentStock: 500,
    reorderLevel: 100,
    maxStock: 1000,
    unit: 'lembar',
    costPerUnit: 8500,
    supplier: 'PT. Indah Kiat Pulp & Paper',
    supplierContact: '+62-21-3927-8888',
    location: 'Gudang A - Rak 1',
    specifications: {
      thickness: '310gsm',
      size: '70x100cm',
      finish: 'Smooth',
      color: 'White',
      brand: 'Indah Kiat'
    },
    usage: 'Premium box printing',
    lastRestockDate: '2024-08-01',
    lastUsageDate: '2024-08-16',
    monthlyUsage: 150,
    notes: 'High quality untuk corporate clients',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-16'
  },
  {
    id: 'inv_002',
    name: 'Satin Ribbon Gold 2.5cm',
    category: 'ribbon',
    currentStock: 25,
    reorderLevel: 30,
    maxStock: 100,
    unit: 'roll',
    costPerUnit: 15000,
    supplier: 'CV. Ribbon Nusantara',
    supplierContact: '+62-21-5556789',
    location: 'Gudang B - Rak 3',
    specifications: {
      width: '2.5cm',
      length: '50m per roll',
      material: 'Polyester Satin',
      color: 'Gold',
      brand: 'Premium Ribbon'
    },
    usage: 'Corporate dan wedding packages',
    lastRestockDate: '2024-07-15',
    lastUsageDate: '2024-08-17',
    monthlyUsage: 20,
    notes: 'LOW STOCK - perlu reorder segera!',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-17'
  },
  {
    id: 'inv_003',
    name: 'Velvet Foam Insert',
    category: 'insert',
    currentStock: 200,
    reorderLevel: 50,
    maxStock: 500,
    unit: 'pcs',
    costPerUnit: 5000,
    supplier: 'PT. Foam Indonesia',
    supplierContact: '+62-21-7778888',
    location: 'Gudang C - Rak 2',
    specifications: {
      thickness: '20mm',
      density: 'Medium',
      color: 'Black Velvet',
      size: 'Custom cut',
      material: 'EVA Foam + Velvet'
    },
    usage: 'Premium box lining',
    lastRestockDate: '2024-07-20',
    lastUsageDate: '2024-08-15',
    monthlyUsage: 80,
    notes: 'Stock adequate',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-15'
  },
  {
    id: 'inv_004',
    name: 'Duplex Paper 300gsm',
    category: 'paper',
    currentStock: 300,
    reorderLevel: 100,
    maxStock: 800,
    unit: 'lembar',
    costPerUnit: 6500,
    supplier: 'PT. Fajar Surya Wisesa',
    supplierContact: '+62-21-4445678',
    location: 'Gudang A - Rak 2',
    specifications: {
      thickness: '300gsm',
      size: '70x100cm',
      finish: 'One side coated',
      color: 'White/Grey',
      brand: 'Fajar'
    },
    usage: 'Standard box production',
    lastRestockDate: '2024-07-25',
    lastUsageDate: '2024-08-10',
    monthlyUsage: 120,
    notes: 'Popular untuk mid-range products',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-10'
  },
  {
    id: 'inv_005',
    name: 'Grosgrain Ribbon Red 3cm',
    category: 'ribbon',
    currentStock: 45,
    reorderLevel: 20,
    maxStock: 80,
    unit: 'roll',
    costPerUnit: 12000,
    supplier: 'CV. Ribbon Nusantara',
    supplierContact: '+62-21-5556789',
    location: 'Gudang B - Rak 4',
    specifications: {
      width: '3cm',
      length: '50m per roll',
      material: 'Polyester Grosgrain',
      color: 'Red',
      pattern: 'Ribbed texture'
    },
    usage: 'Promotional dan gift packages',
    lastRestockDate: '2024-08-05',
    lastUsageDate: '2024-08-10',
    monthlyUsage: 15,
    notes: 'Stock mencukupi',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-10'
  },
  {
    id: 'inv_006',
    name: 'Gold Foil Roll',
    category: 'finishing',
    currentStock: 8,
    reorderLevel: 10,
    maxStock: 30,
    unit: 'roll',
    costPerUnit: 450000,
    supplier: 'PT. Foil Specialty Indonesia',
    supplierContact: '+62-21-9998877',
    location: 'Gudang D - Locker',
    specifications: {
      width: '30cm',
      length: '120m per roll',
      type: 'Hot stamping foil',
      color: 'Bright Gold',
      application: 'Heat transfer'
    },
    usage: 'Premium finishing untuk logo',
    lastRestockDate: '2024-07-10',
    lastUsageDate: '2024-08-16',
    monthlyUsage: 5,
    notes: 'CRITICAL STOCK - expensive item, perlu hati-hati',
    createdAt: '2024-01-01',
    updatedAt: '2024-08-16'
  }
];

const indonesianTaxRates = {
  ppn: {
    rate: 11,
    name: 'Pajak Pertambahan Nilai',
    description: 'VAT applicable to all goods and services',
    effectiveFrom: '2022-04-01'
  },
  pph21: {
    brackets: [
      { min: 0, max: 60000000, rate: 5 },
      { min: 60000000, max: 250000000, rate: 15 },
      { min: 250000000, max: 500000000, rate: 25 },
      { min: 500000000, max: Infinity, rate: 30 }
    ],
    ptkp: {
      single: 54000000,
      married: 58500000,
      dependentAllowance: 4500000
    }
  }
};

const businessSettings = {
  company: {
    name: 'Premium Gift Box Indonesia',
    address: 'Jl. Kemang Raya No. 123, Jakarta Selatan 12560',
    phone: '+62-21-7891234',
    email: 'info@premiumgiftbox.co.id',
    website: 'www.premiumgiftbox.co.id',
    npwp: '12.345.678.9-012.000',
    siup: 'SIUP-PGB-JAKARTA-2023'
  },
  banking: {
    primary: {
      bank: 'Bank Central Asia (BCA)',
      accountNumber: '1234567890',
      accountName: 'Premium Gift Box Indonesia',
      swift: 'CENAIDJA'
    },
    secondary: {
      bank: 'Bank Mandiri',
      accountNumber: '9876543210',
      accountName: 'Premium Gift Box Indonesia',
      swift: 'BMRIIDJA'
    }
  },
  operations: {
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    workingHours: '09:00-17:00',
    timeZone: 'Asia/Jakarta',
    currency: 'IDR',
    language: 'id'
  }
};

module.exports = {
  sampleCustomers,
  sampleOrders,
  sampleInventory,
  indonesianTaxRates,
  businessSettings
};