// PDF Generation Service using PDFKit
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/pdfs');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoice, customer, order, items = []) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `invoice_${invoice.invoice_number}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        this.addInvoiceHeader(doc, invoice);

        // Company Info (left side)
        doc.fontSize(10);
        doc.text('Premium Gift Box', 50, 120);
        doc.text('Jl. Contoh No. 123', 50, 135);
        doc.text('Jakarta, Indonesia', 50, 150);
        doc.text('NPWP: 01.234.567.8-901.000', 50, 165);
        doc.text('Phone: +62 21 1234 5678', 50, 180);

        // Customer Info (right side)
        doc.text('Bill To:', 320, 120, { bold: true });
        doc.text(customer.name, 320, 135);
        if (customer.company_name) {
          doc.text(customer.company_name, 320, 150);
        }
        if (customer.address) {
          doc.text(customer.address, 320, 165, { width: 200 });
        }
        if (customer.phone) {
          doc.text(`Phone: ${customer.phone}`, 320, 195);
        }

        // Invoice Details
        doc.moveDown(2);
        const detailsY = 220;
        doc.fontSize(9);
        doc.text(`Invoice Number: ${invoice.invoice_number}`, 50, detailsY);
        doc.text(`Issue Date: ${this.formatDate(invoice.issue_date)}`, 50, detailsY + 15);
        if (invoice.due_date) {
          doc.text(`Due Date: ${this.formatDate(invoice.due_date)}`, 50, detailsY + 30);
        }
        if (order) {
          doc.text(`Order Number: ${order.order_number}`, 50, detailsY + 45);
        }

        // Status badge
        const statusX = 450;
        doc.fontSize(10).fillColor(this.getStatusColor(invoice.status));
        doc.text(invoice.status.toUpperCase(), statusX, detailsY, { align: 'right' });
        doc.fillColor('#000000');

        // Line items table
        const tableTop = 300;
        this.generateInvoiceTable(doc, invoice, items, tableTop);

        // Footer with notes
        if (invoice.notes) {
          doc.fontSize(9);
          doc.text('Notes:', 50, doc.y + 20);
          doc.fontSize(8);
          doc.text(invoice.notes, 50, doc.y + 5, { width: 500 });
        }

        // Payment info
        doc.fontSize(9);
        const footerY = doc.y + 40;
        doc.text('Payment Information:', 50, footerY);
        doc.fontSize(8);
        doc.text('Bank: Bank Mandiri', 50, footerY + 15);
        doc.text('Account Number: 1234567890', 50, footerY + 28);
        doc.text('Account Name: Premium Gift Box', 50, footerY + 41);

        // Thank you note
        doc.fontSize(10);
        doc.text('Thank you for your business!', 50, footerY + 70, { align: 'center' });

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add invoice header with logo space
   */
  addInvoiceHeader(doc, invoice) {
    doc.fontSize(24).fillColor('#2C5530');
    doc.text('INVOICE', 50, 50);
    doc.fillColor('#000000');

    // Horizontal line
    doc.strokeColor('#2C5530')
       .lineWidth(2)
       .moveTo(50, 90)
       .lineTo(550, 90)
       .stroke();
  }

  /**
   * Generate invoice line items table
   */
  generateInvoiceTable(doc, invoice, items, tableTop) {
    const tableHeaders = ['Description', 'Quantity', 'Unit Price', 'Amount'];
    const columnWidths = [240, 80, 100, 100];
    const startX = 50;

    // Table header
    doc.fontSize(10).fillColor('#2C5530');
    let xPos = startX;
    tableHeaders.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: columnWidths[i], align: i === 0 ? 'left' : 'right' });
      xPos += columnWidths[i];
    });
    doc.fillColor('#000000');

    // Header underline
    doc.strokeColor('#cccccc')
       .lineWidth(1)
       .moveTo(startX, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    // Table rows
    let yPos = tableTop + 25;
    doc.fontSize(9);

    if (items && items.length > 0) {
      items.forEach(item => {
        xPos = startX;
        doc.text(item.description || item.name, xPos, yPos, { width: columnWidths[0] });
        xPos += columnWidths[0];
        doc.text(item.quantity || '1', xPos, yPos, { width: columnWidths[1], align: 'right' });
        xPos += columnWidths[1];
        doc.text(this.formatCurrency(item.unit_price || 0), xPos, yPos, { width: columnWidths[2], align: 'right' });
        xPos += columnWidths[2];
        doc.text(this.formatCurrency(item.total || item.unit_price || 0), xPos, yPos, { width: columnWidths[3], align: 'right' });
        yPos += 20;
      });
    } else {
      // Default single item
      xPos = startX;
      doc.text('Premium Gift Box Order', xPos, yPos, { width: columnWidths[0] });
      xPos += columnWidths[0];
      doc.text('1', xPos, yPos, { width: columnWidths[1], align: 'right' });
      xPos += columnWidths[1];
      doc.text(this.formatCurrency(invoice.subtotal), xPos, yPos, { width: columnWidths[2], align: 'right' });
      xPos += columnWidths[2];
      doc.text(this.formatCurrency(invoice.subtotal), xPos, yPos, { width: columnWidths[3], align: 'right' });
      yPos += 20;
    }

    // Subtotal line
    yPos += 10;
    doc.strokeColor('#cccccc')
       .lineWidth(1)
       .moveTo(startX, yPos)
       .lineTo(550, yPos)
       .stroke();

    // Summary section
    yPos += 15;
    const summaryX = 370;

    doc.fontSize(9);
    doc.text('Subtotal:', summaryX, yPos);
    doc.text(this.formatCurrency(invoice.subtotal), 470, yPos, { width: 80, align: 'right' });

    if (invoice.discount > 0) {
      yPos += 20;
      doc.text('Discount:', summaryX, yPos);
      doc.text(`-${this.formatCurrency(invoice.discount)}`, 470, yPos, { width: 80, align: 'right' });
    }

    yPos += 20;
    doc.text(`PPN (${invoice.ppn_rate}%):`, summaryX, yPos);
    doc.text(this.formatCurrency(invoice.ppn_amount), 470, yPos, { width: 80, align: 'right' });

    // Total line
    yPos += 10;
    doc.strokeColor('#2C5530')
       .lineWidth(2)
       .moveTo(summaryX, yPos)
       .lineTo(550, yPos)
       .stroke();

    // Total amount
    yPos += 15;
    doc.fontSize(12).fillColor('#2C5530');
    doc.text('TOTAL:', summaryX, yPos);
    doc.text(this.formatCurrency(invoice.total_amount), 470, yPos, { width: 80, align: 'right' });
    doc.fillColor('#000000');
    doc.fontSize(9);

    // Update doc.y for footer positioning
    doc.y = yPos + 30;
  }

  /**
   * Generate financial report PDF
   */
  async generateFinancialReportPDF(reportData, period) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `financial_report_${period.start}_${period.end}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).fillColor('#2C5530');
        doc.text('Financial Report', 50, 50);
        doc.fillColor('#000000');
        doc.fontSize(10);
        doc.text(`Period: ${this.formatDate(period.start)} - ${this.formatDate(period.end)}`, 50, 80);
        doc.text(`Generated: ${this.formatDate(new Date().toISOString())}`, 50, 95);

        // Revenue section
        let yPos = 130;
        doc.fontSize(14).fillColor('#2C5530');
        doc.text('Revenue Summary', 50, yPos);
        doc.fillColor('#000000').fontSize(10);
        yPos += 25;

        doc.text('Total Revenue:', 50, yPos);
        doc.text(this.formatCurrency(reportData.revenue.total_revenue), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Paid Revenue:', 50, yPos);
        doc.text(this.formatCurrency(reportData.revenue.paid_revenue), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Pending Revenue:', 50, yPos);
        doc.text(this.formatCurrency(reportData.revenue.pending_revenue), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Invoice Count:', 50, yPos);
        doc.text(reportData.revenue.invoice_count.toString(), 400, yPos, { align: 'right' });

        // Orders section
        yPos += 40;
        doc.fontSize(14).fillColor('#2C5530');
        doc.text('Orders Summary', 50, yPos);
        doc.fillColor('#000000').fontSize(10);
        yPos += 25;

        doc.text('Total Orders:', 50, yPos);
        doc.text(reportData.orders.total_orders.toString(), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Completed Orders:', 50, yPos);
        doc.text(reportData.orders.completed_orders.toString(), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Active Orders:', 50, yPos);
        doc.text(reportData.orders.active_orders.toString(), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Completion Rate:', 50, yPos);
        doc.text(`${reportData.orders.completion_rate}%`, 400, yPos, { align: 'right' });

        // Inventory section
        yPos += 40;
        doc.fontSize(14).fillColor('#2C5530');
        doc.text('Inventory Summary', 50, yPos);
        doc.fillColor('#000000').fontSize(10);
        yPos += 25;

        doc.text('Total Materials:', 50, yPos);
        doc.text(reportData.inventory.total_materials.toString(), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Out of Stock:', 50, yPos);
        doc.text(reportData.inventory.out_of_stock.toString(), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Low Stock:', 50, yPos);
        doc.text(reportData.inventory.low_stock.toString(), 400, yPos, { align: 'right' });
        yPos += 20;

        doc.text('Total Inventory Value:', 50, yPos);
        doc.text(this.formatCurrency(reportData.inventory.total_value), 400, yPos, { align: 'right' });

        doc.end();

        stream.on('finish', () => {
          resolve({ filepath, filename });
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
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
   * Get status color
   */
  getStatusColor(status) {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'unpaid':
        return '#FF9800';
      case 'overdue':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#000000';
    }
  }

  /**
   * Delete PDF file
   */
  async deletePDF(filename) {
    const filepath = path.join(this.outputDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  }

  /**
   * Get PDF file path
   */
  getPDFPath(filename) {
    return path.join(this.outputDir, filename);
  }
}

module.exports = PDFService;
