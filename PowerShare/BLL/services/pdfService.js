const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
    /**
     * Generate payment receipt PDF
     */
    async generatePaymentReceipt(payment, bill, user) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks = [];

                // Collect PDF data
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });

                // Header - PowerShare Logo and Title
                doc.fontSize(28)
                   .fillColor('#0d6efd')
                   .text('POWERSHARE', { align: 'center' })
                   .moveDown(0.3);

                doc.fontSize(20)
                   .fillColor('#000000')
                   .text('PAYMENT RECEIPT', { align: 'center' })
                   .moveDown(0.5);

                // Horizontal line
                doc.strokeColor('#cccccc')
                   .lineWidth(1)
                   .moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke()
                   .moveDown(1);

                // Receipt Details - Left Column
                const startY = doc.y;
                doc.fontSize(10)
                   .fillColor('#000000')
                   .text(`Receipt #: REC-${payment.payment_id}`, 50, startY)
                   .text(`Payment Date: ${this.formatDate(payment.payment_date)}`, 50, startY + 15)
                   .text(`Invoice #: INV-${payment.bill_id}`, 50, startY + 30);

                doc.moveDown(2);

                // Customer Information
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Paid By:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.3)
                   .text(user.full_name || 'Customer', 50)
                   .text(user.email || '', 50)
                   .text(user.phone || '', 50);

                doc.moveDown(2);

                // Payment Details Section
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Payment Details:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.5);

                // Payment info table
                const paymentY = doc.y;
                doc.text(`Amount Paid:`, 50, paymentY)
                   .text(`$${parseFloat(payment.amount).toFixed(2)}`, 300, paymentY);

                doc.text(`Payment Method:`, 50, paymentY + 20)
                   .text(this.formatPaymentMethod(payment.payment_method), 300, paymentY + 20);

                doc.text(`Transaction ID:`, 50, paymentY + 40)
                   .text(`${payment.payment_id}`, 300, paymentY + 40);

                if (bill) {
                    doc.text(`Billing Period:`, 50, paymentY + 60)
                       .text(`${this.formatDate(bill.billing_period_start)} - ${this.formatDate(bill.billing_period_end)}`, 300, paymentY + 60);
                }

                doc.moveDown(4);

                // Success Badge
                doc.rect(165, doc.y, 280, 50)
                   .fillAndStroke('#28a745', '#28a745');

                doc.fontSize(16)
                   .fillColor('#ffffff')
                   .font('Helvetica-Bold')
                   .text('✓ PAYMENT SUCCESSFUL', 0, doc.y + 18, { align: 'center', width: 612 });

                // Footer
                doc.fontSize(9)
                   .fillColor('#999999')
                   .font('Helvetica')
                   .text('This is a computer-generated receipt and does not require a signature.', 50, 720, { align: 'center', width: 500 })
                   .text('Thank you for your payment!', 50, 735, { align: 'center', width: 500 })
                   .text(`© ${new Date().getFullYear()} PowerShare. All rights reserved.`, 50, 750, { align: 'center', width: 500 });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate wallet top-up receipt PDF
     */
    async generateWalletTopUpReceipt(transaction, user) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });

                // Header
                doc.fontSize(28)
                   .fillColor('#0d6efd')
                   .text('POWERSHARE', { align: 'center' })
                   .moveDown(0.3);

                doc.fontSize(20)
                   .fillColor('#000000')
                   .text('WALLET TOP-UP RECEIPT', { align: 'center' })
                   .moveDown(0.5);

                // Line
                doc.strokeColor('#cccccc')
                   .lineWidth(1)
                   .moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke()
                   .moveDown(1);

                // Receipt Details
                const startY = doc.y;
                doc.fontSize(10)
                   .fillColor('#000000')
                   .text(`Receipt #: TOP-${transaction.transaction_id}`, 50, startY)
                   .text(`Transaction Date: ${this.formatDate(transaction.created_at)}`, 50, startY + 15)
                   .text(`Transaction ID: ${transaction.transaction_id}`, 50, startY + 30);

                doc.moveDown(2);

                // Customer Information
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Customer:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.3)
                   .text(user.full_name || 'Customer', 50)
                   .text(user.email || '', 50);

                doc.moveDown(2);

                // Top-up Details
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Top-Up Details:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.5);

                const detailsY = doc.y;
                doc.text(`Amount:`, 50, detailsY)
                   .text(`${transaction.amount} ${transaction.currency}`, 300, detailsY);

                doc.text(`Payment Method:`, 50, detailsY + 20)
                   .text(transaction.metadata?.payment_method || 'N/A', 300, detailsY + 20);

                doc.text(`Balance Before:`, 50, detailsY + 40)
                   .text(`${transaction.balance_before} ${transaction.currency}`, 300, detailsY + 40);

                doc.text(`Balance After:`, 50, detailsY + 60)
                   .font('Helvetica-Bold')
                   .text(`${transaction.balance_after} ${transaction.currency}`, 300, detailsY + 60)
                   .font('Helvetica');

                doc.moveDown(4);

                // Success Badge
                doc.rect(165, doc.y, 280, 50)
                   .fillAndStroke('#10b981', '#10b981');

                doc.fontSize(16)
                   .fillColor('#ffffff')
                   .font('Helvetica-Bold')
                   .text('✓ TOP-UP SUCCESSFUL', 0, doc.y + 18, { align: 'center', width: 612 });

                // Footer
                doc.fontSize(9)
                   .fillColor('#999999')
                   .font('Helvetica')
                   .text('This is a computer-generated receipt and does not require a signature.', 50, 720, { align: 'center', width: 500 })
                   .text('Your wallet has been credited successfully!', 50, 735, { align: 'center', width: 500 })
                   .text(`© ${new Date().getFullYear()} PowerShare. All rights reserved.`, 50, 750, { align: 'center', width: 500 });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate bill payment receipt PDF (when paid from wallet)
     */
    async generateBillPaymentReceipt(transaction, bill, user) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });

                // Header
                doc.fontSize(28)
                   .fillColor('#0d6efd')
                   .text('POWERSHARE', { align: 'center' })
                   .moveDown(0.3);

                doc.fontSize(20)
                   .fillColor('#000000')
                   .text('BILL PAYMENT RECEIPT', { align: 'center' })
                   .moveDown(0.5);

                // Line
                doc.strokeColor('#cccccc')
                   .lineWidth(1)
                   .moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke()
                   .moveDown(1);

                // Receipt Details
                const startY = doc.y;
                doc.fontSize(10)
                   .fillColor('#000000')
                   .text(`Receipt #: BILL-${transaction.transaction_id}`, 50, startY)
                   .text(`Payment Date: ${this.formatDate(transaction.created_at)}`, 50, startY + 15)
                   .text(`Bill ID: ${bill.bill_id}`, 50, startY + 30);

                doc.moveDown(2);

                // Customer Information
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Customer:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.3)
                   .text(user.full_name || 'Customer', 50)
                   .text(user.email || '', 50);

                doc.moveDown(2);

                // Bill Details
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Bill Details:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.5);

                const billY = doc.y;
                if (bill.generator_name) {
                    doc.text(`Generator:`, 50, billY)
                       .text(bill.generator_name, 300, billY);
                }

                if (bill.plan_name) {
                    doc.text(`Plan:`, 50, billY + 20)
                       .text(bill.plan_name, 300, billY + 20);
                }

                if (bill.billing_period_start && bill.billing_period_end) {
                    doc.text(`Billing Period:`, 50, billY + 40)
                       .text(`${this.formatDate(bill.billing_period_start)} - ${this.formatDate(bill.billing_period_end)}`, 300, billY + 40);
                }

                doc.moveDown(3);

                // Payment Details
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .text('Payment Details:', 50, doc.y)
                   .font('Helvetica')
                   .fontSize(10)
                   .moveDown(0.5);

                const paymentY = doc.y;
                doc.text(`Amount Paid:`, 50, paymentY)
                   .font('Helvetica-Bold')
                   .fontSize(14)
                   .text(`${transaction.amount} ${transaction.currency}`, 300, paymentY)
                   .font('Helvetica')
                   .fontSize(10);

                doc.text(`Payment Method:`, 50, paymentY + 25)
                   .text('Digital Wallet', 300, paymentY + 25);

                doc.text(`Wallet Balance After:`, 50, paymentY + 45)
                   .text(`${transaction.balance_after} ${transaction.currency}`, 300, paymentY + 45);

                doc.moveDown(4);

                // Success Badge
                doc.rect(165, doc.y, 280, 50)
                   .fillAndStroke('#6366f1', '#6366f1');

                doc.fontSize(16)
                   .fillColor('#ffffff')
                   .font('Helvetica-Bold')
                   .text('✓ BILL PAID SUCCESSFULLY', 0, doc.y + 18, { align: 'center', width: 612 });

                // Footer
                doc.fontSize(9)
                   .fillColor('#999999')
                   .font('Helvetica')
                   .text('This is a computer-generated receipt and does not require a signature.', 50, 720, { align: 'center', width: 500 })
                   .text('Thank you for your payment!', 50, 735, { align: 'center', width: 500 })
                   .text(`© ${new Date().getFullYear()} PowerShare. All rights reserved.`, 50, 750, { align: 'center', width: 500 });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Format payment method
     */
    formatPaymentMethod(method) {
        const methods = {
            'card': 'Credit/Debit Card',
            'credit_card': 'Credit Card',
            'cash': 'Cash',
            'bank_transfer': 'Bank Transfer',
            'wallet': 'Digital Wallet',
            'omt': 'OMT',
            'whish': 'Whish Money'
        };
        return methods[method] || method || 'N/A';
    }

    /**
     * Save PDF to file system (for testing/debugging)
     */
    async savePDFToFile(pdfBuffer, filename) {
        const uploadDir = path.join(__dirname, '../../uploads/receipts');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        return filePath;
    }
}

module.exports = new PDFService();
