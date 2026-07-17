const PDFDocument = require('pdfkit');

const formatCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const generateInvoicePdf = async (order, settings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const restaurantName = settings.name || 'RMS Restaurant';
      const restaurantPhone = settings.phone || '';
      const restaurantEmail = settings.email || '';
      const restaurantAddress = settings.address || '';
      const gstRate = settings.gstRate || 5;
      const gstin = settings.gstin || '';

      doc.fontSize(20).font('Helvetica-Bold').text(restaurantName, { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(10).font('Helvetica').fillColor('#4B5563').text(restaurantAddress);
      if (restaurantPhone) doc.text(`Phone: ${restaurantPhone}`);
      if (restaurantEmail) doc.text(`Email: ${restaurantEmail}`);
      if (gstin) doc.text(`GSTIN: ${gstin}`);

      doc.moveDown(0.75);
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Tax Invoice', { align: 'right' });
      doc.moveDown(0.5);

      const invoiceDate = new Date(order.paidAt || order.createdAt || Date.now()).toLocaleDateString();
      const invoiceTime = new Date(order.paidAt || order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const customerName = order.customerName || 'Guest';
      const customerPhone = order.customerPhone || 'N/A';

      doc.fontSize(10).font('Helvetica').text(`Invoice ID: ${order.orderId || order._id || 'N/A'}`);
      doc.text(`Order Date: ${invoiceDate} ${invoiceTime}`);
      doc.text(`Customer: ${customerName}`);
      doc.text(`Mobile: ${customerPhone}`);
      doc.text(`Table: ${order.table || 'N/A'}`);
      if (order.type) doc.text(`Order Type: ${order.type}`);

      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(11).text('Items', { underline: true });
      doc.moveDown(0.25);

      const tableTop = doc.y;
      const itemTableColumnWidths = { name: 250, qty: 55, price: 90, amount: 95 };

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Item', 40, tableTop, { width: itemTableColumnWidths.name, continued: true });
      doc.text('Qty', 40 + itemTableColumnWidths.name, tableTop, { width: itemTableColumnWidths.qty, align: 'right', continued: true });
      doc.text('Price', 40 + itemTableColumnWidths.name + itemTableColumnWidths.qty, tableTop, { width: itemTableColumnWidths.price, align: 'right', continued: true });
      doc.text('Amount', 40 + itemTableColumnWidths.name + itemTableColumnWidths.qty + itemTableColumnWidths.price, tableTop, { width: itemTableColumnWidths.amount, align: 'right' });
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(9);

      (order.items || []).forEach((item) => {
        const amount = (item.price || 0) * (item.qty || 0);
        doc.text(item.name || 'Item', 40, doc.y, { width: itemTableColumnWidths.name, continued: true });
        doc.text(`${item.qty || 0}`, 40 + itemTableColumnWidths.name, doc.y, { width: itemTableColumnWidths.qty, align: 'right', continued: true });
        doc.text(formatCurrency(item.price || 0), 40 + itemTableColumnWidths.name + itemTableColumnWidths.qty, doc.y, { width: itemTableColumnWidths.price, align: 'right', continued: true });
        doc.text(formatCurrency(amount), 40 + itemTableColumnWidths.name + itemTableColumnWidths.qty + itemTableColumnWidths.price, doc.y, { width: itemTableColumnWidths.amount, align: 'right' });
      });

      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(10).text('Summary', { underline: true });
      doc.moveDown(0.5);

      const summaryLines = [
        { label: 'Subtotal', value: formatCurrency(order.subtotal) },
        { label: `GST (${gstRate}%)`, value: formatCurrency(order.gst || 0) },
      ];

      if (order.discount > 0) {
        summaryLines.push({ label: 'Discount', value: `- ${formatCurrency(order.discount)}` });
      }
      summaryLines.push({ label: 'Total', value: formatCurrency(order.total) });

      summaryLines.forEach(line => {
        doc.font('Helvetica').fontSize(10).text(line.label, 340, doc.y, { width: 130, align: 'left' });
        doc.font('Helvetica-Bold').fontSize(10).text(line.value, 340, doc.y, { width: 130, align: 'right' });
      });

      doc.moveDown(1.2);
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text('Thank you for dining with us!', { align: 'center' });
      doc.moveDown(0.25);
      doc.fontSize(8).fillColor('#6B7280').text('Please keep this invoice for your records.', { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePdf };
