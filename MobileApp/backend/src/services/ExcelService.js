// Excel Generation Service using ExcelJS
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ExcelService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/excel');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate Invoice Excel
   */
  async generateInvoiceExcel(invoice, customer, order, items = []) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');

    // Set column widths
    worksheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 20 }
    ];

    // Header - Company Name
    worksheet.mergeCells('A1:D1');
    const headerRow = worksheet.getCell('A1');
    headerRow.value = 'PREMIUM GIFT BOX';
    headerRow.font = { size: 20, bold: true, color: { argb: 'FF2C5530' } };
    headerRow.alignment = { horizontal: 'center' };

    // Invoice Title
    worksheet.mergeCells('A2:D2');
    const titleRow = worksheet.getCell('A2');
    titleRow.value = 'INVOICE';
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Company Info
    worksheet.addRow(['Premium Gift Box', '', 'Bill To:', '']);
    worksheet.addRow(['Jl. Contoh No. 123', '', customer.name, '']);
    if (customer.company_name) {
      worksheet.addRow(['Jakarta, Indonesia', '', customer.company_name, '']);
    } else {
      worksheet.addRow(['Jakarta, Indonesia', '', '', '']);
    }
    worksheet.addRow(['NPWP: 01.234.567.8-901.000', '', customer.address || '', '']);
    worksheet.addRow(['Phone: +62 21 1234 5678', '', customer.phone ? `Phone: ${customer.phone}` : '', '']);

    worksheet.addRow([]);

    // Invoice Details
    worksheet.addRow(['Invoice Number:', invoice.invoice_number, 'Status:', invoice.status.toUpperCase()]);
    worksheet.addRow(['Issue Date:', this.formatDate(invoice.issue_date), '', '']);
    if (invoice.due_date) {
      worksheet.addRow(['Due Date:', this.formatDate(invoice.due_date), '', '']);
    }
    if (order) {
      worksheet.addRow(['Order Number:', order.order_number, '', '']);
    }

    worksheet.addRow([]);

    // Line Items Header
    const headerRowIndex = worksheet.rowCount + 1;
    const itemsHeader = worksheet.addRow(['Description', 'Quantity', 'Unit Price (IDR)', 'Amount (IDR)']);
    itemsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    itemsHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C5530' }
    };
    itemsHeader.alignment = { horizontal: 'center' };

    // Line Items
    if (items && items.length > 0) {
      items.forEach(item => {
        worksheet.addRow([
          item.description || item.name,
          item.quantity || 1,
          this.formatNumber(item.unit_price || 0),
          this.formatNumber(item.total || item.unit_price || 0)
        ]);
      });
    } else {
      worksheet.addRow([
        'Premium Gift Box Order',
        1,
        this.formatNumber(invoice.subtotal),
        this.formatNumber(invoice.subtotal)
      ]);
    }

    worksheet.addRow([]);

    // Summary
    worksheet.addRow(['', '', 'Subtotal:', this.formatNumber(invoice.subtotal)]);
    if (invoice.discount > 0) {
      worksheet.addRow(['', '', 'Discount:', `-${this.formatNumber(invoice.discount)}`]);
    }
    worksheet.addRow(['', '', `PPN (${invoice.ppn_rate}%):`, this.formatNumber(invoice.ppn_amount)]);

    const totalRow = worksheet.addRow(['', '', 'TOTAL:', this.formatNumber(invoice.total_amount)]);
    totalRow.font = { bold: true, size: 12 };
    totalRow.getCell(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' }
    };
    totalRow.getCell(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' }
    };

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Notes
    if (invoice.notes) {
      worksheet.addRow(['Notes:']);
      const notesRow = worksheet.addRow([invoice.notes]);
      worksheet.mergeCells(`A${notesRow.number}:D${notesRow.number}`);
      notesRow.alignment = { wrapText: true };
    }

    worksheet.addRow([]);

    // Payment Info
    worksheet.addRow(['Payment Information:']);
    worksheet.addRow(['Bank: Bank Mandiri']);
    worksheet.addRow(['Account Number: 1234567890']);
    worksheet.addRow(['Account Name: Premium Gift Box']);

    worksheet.addRow([]);
    const thankYouRow = worksheet.addRow(['Thank you for your business!']);
    worksheet.mergeCells(`A${thankYouRow.number}:D${thankYouRow.number}`);
    thankYouRow.alignment = { horizontal: 'center' };
    thankYouRow.font = { italic: true };

    // Save file
    const filename = `invoice_${invoice.invoice_number}_${Date.now()}.xlsx`;
    const filepath = path.join(this.outputDir, filename);
    await workbook.xlsx.writeFile(filepath);

    return { filepath, filename };
  }

  /**
   * Generate Financial Report Excel
   */
  async generateFinancialReportExcel(reportData, period) {
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.createSummarySheet(summarySheet, reportData, period);

    // Revenue Details Sheet
    const revenueSheet = workbook.addWorksheet('Revenue Details');
    this.createRevenueSheet(revenueSheet, reportData.revenue);

    // Orders Sheet
    const ordersSheet = workbook.addWorksheet('Orders');
    this.createOrdersSheet(ordersSheet, reportData.orders);

    // Inventory Sheet
    const inventorySheet = workbook.addWorksheet('Inventory');
    this.createInventorySheet(inventorySheet, reportData.inventory);

    // Save file
    const filename = `financial_report_${period.start}_${period.end}_${Date.now()}.xlsx`;
    const filepath = path.join(this.outputDir, filename);
    await workbook.xlsx.writeFile(filepath);

    return { filepath, filename };
  }

  /**
   * Create Summary Sheet
   */
  createSummarySheet(worksheet, reportData, period) {
    worksheet.columns = [
      { width: 30 },
      { width: 25 }
    ];

    // Header
    worksheet.mergeCells('A1:B1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'FINANCIAL REPORT';
    headerCell.font = { size: 18, bold: true, color: { argb: 'FF2C5530' } };
    headerCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow(['Period:', `${this.formatDate(period.start)} - ${this.formatDate(period.end)}`]);
    worksheet.addRow(['Generated:', this.formatDate(new Date().toISOString())]);
    worksheet.addRow([]);

    // Revenue Summary
    this.addSectionHeader(worksheet, 'REVENUE SUMMARY');
    worksheet.addRow(['Total Revenue:', this.formatCurrency(reportData.revenue.total_revenue)]);
    worksheet.addRow(['Paid Revenue:', this.formatCurrency(reportData.revenue.paid_revenue)]);
    worksheet.addRow(['Pending Revenue:', this.formatCurrency(reportData.revenue.pending_revenue)]);
    worksheet.addRow(['Invoice Count:', reportData.revenue.invoice_count]);
    worksheet.addRow([]);

    // Orders Summary
    this.addSectionHeader(worksheet, 'ORDERS SUMMARY');
    worksheet.addRow(['Total Orders:', reportData.orders.total_orders]);
    worksheet.addRow(['Completed Orders:', reportData.orders.completed_orders]);
    worksheet.addRow(['Active Orders:', reportData.orders.active_orders]);
    worksheet.addRow(['Completion Rate:', `${reportData.orders.completion_rate}%`]);
    worksheet.addRow([]);

    // Inventory Summary
    this.addSectionHeader(worksheet, 'INVENTORY SUMMARY');
    worksheet.addRow(['Total Materials:', reportData.inventory.total_materials]);
    worksheet.addRow(['Out of Stock:', reportData.inventory.out_of_stock]);
    worksheet.addRow(['Low Stock:', reportData.inventory.low_stock]);
    worksheet.addRow(['Total Inventory Value:', this.formatCurrency(reportData.inventory.total_value)]);
  }

  /**
   * Create Revenue Details Sheet
   */
  createRevenueSheet(worksheet, revenueData) {
    worksheet.columns = [
      { width: 30 },
      { width: 25 }
    ];

    this.addSectionHeader(worksheet, 'REVENUE BREAKDOWN');
    worksheet.addRow(['Metric', 'Value']);

    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C5530' }
    };

    worksheet.addRow(['Total Revenue', this.formatCurrency(revenueData.total_revenue)]);
    worksheet.addRow(['Paid Revenue', this.formatCurrency(revenueData.paid_revenue)]);
    worksheet.addRow(['Pending Revenue', this.formatCurrency(revenueData.pending_revenue)]);
    worksheet.addRow(['Invoice Count', revenueData.invoice_count]);
    worksheet.addRow(['Average Invoice Value', this.formatCurrency(revenueData.total_revenue / (revenueData.invoice_count || 1))]);
  }

  /**
   * Create Orders Sheet
   */
  createOrdersSheet(worksheet, ordersData) {
    worksheet.columns = [
      { width: 30 },
      { width: 25 }
    ];

    this.addSectionHeader(worksheet, 'ORDERS BREAKDOWN');
    worksheet.addRow(['Metric', 'Value']);

    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C5530' }
    };

    worksheet.addRow(['Total Orders', ordersData.total_orders]);
    worksheet.addRow(['Completed Orders', ordersData.completed_orders]);
    worksheet.addRow(['Active Orders', ordersData.active_orders]);
    worksheet.addRow(['Completion Rate', `${ordersData.completion_rate}%`]);
  }

  /**
   * Create Inventory Sheet
   */
  createInventorySheet(worksheet, inventoryData) {
    worksheet.columns = [
      { width: 30 },
      { width: 25 }
    ];

    this.addSectionHeader(worksheet, 'INVENTORY BREAKDOWN');
    worksheet.addRow(['Metric', 'Value']);

    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C5530' }
    };

    worksheet.addRow(['Total Materials', inventoryData.total_materials]);
    worksheet.addRow(['Out of Stock', inventoryData.out_of_stock]);
    worksheet.addRow(['Low Stock', inventoryData.low_stock]);
    worksheet.addRow(['Total Inventory Value', this.formatCurrency(inventoryData.total_value)]);
    worksheet.addRow(['Average Material Value', this.formatCurrency(inventoryData.total_value / (inventoryData.total_materials || 1))]);
  }

  /**
   * Add section header
   */
  addSectionHeader(worksheet, title) {
    const row = worksheet.addRow([title]);
    row.font = { bold: true, size: 14, color: { argb: 'FF2C5530' } };
    return row;
  }

  /**
   * Format currency in Indonesian Rupiah
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  /**
   * Format number
   */
  formatNumber(amount) {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Delete Excel file
   */
  async deleteExcel(filename) {
    const filepath = path.join(this.outputDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  }

  /**
   * Get Excel file path
   */
  getExcelPath(filename) {
    return path.join(this.outputDir, filename);
  }
}

module.exports = ExcelService;
