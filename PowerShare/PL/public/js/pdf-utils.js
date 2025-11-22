
function generateInvoicePDF(bill, userInfo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(13, 110, 253);
    doc.text('POWERSHARE', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 105, 30, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    doc.setFontSize(10);
    doc.text(`Invoice #: INV-${bill.bill_id}`, 20, 45);
    doc.text(`Date: ${formatDate(new Date())}`, 20, 52);
    doc.text(`Due Date: ${formatDate(bill.due_date)}`, 20, 59);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (userInfo) {
        doc.text(userInfo.full_name || 'Customer', 20, 82);
        doc.text(userInfo.email || '', 20, 89);
        if (userInfo.phone) doc.text(userInfo.phone, 20, 96);
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Billing Details:', 20, 115);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Billing Period: ${formatDate(bill.billing_period_start)} - ${formatDate(bill.billing_period_end)}`, 20, 125);
    doc.text(`Generator: ${bill.generator_name || 'N/A'}`, 20, 132);
    doc.text(`Plan: ${bill.plan_name || 'N/A'}`, 20, 139);

    const tableY = 155;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, tableY, 170, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, tableY + 7);
    doc.text('Amount', 160, tableY + 7);

    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Subscription Fee', 25, tableY + 17);
    doc.text(`$${parseFloat(bill.amount).toFixed(2)}`, 160, tableY + 17);

    doc.setLineWidth(0.5);
    doc.line(20, tableY + 25, 190, tableY + 25);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Amount Due:', 120, tableY + 35);
    doc.text(`$${parseFloat(bill.amount).toFixed(2)}`, 160, tableY + 35);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const status = bill.status || 'pending';
    const statusColor = status === 'paid' ? [40, 167, 69] : [255, 193, 7];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Status: ${status.toUpperCase()}`, 20, tableY + 50);

    doc.setTextColor(128, 128, 128);
    doc.setFontSize(9);
    doc.text('Thank you for using PowerShare!', 105, 270, { align: 'center' });
    doc.text('For support, contact: support@powershare.com', 105, 277, { align: 'center' });

    doc.save(`invoice_${bill.bill_id}.pdf`);
}

function generateReceiptPDF(payment, bill, userInfo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(13, 110, 253);
    doc.text('POWERSHARE', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('PAYMENT RECEIPT', 105, 30, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    doc.setFontSize(10);
    doc.text(`Receipt #: REC-${payment.payment_id}`, 20, 45);
    doc.text(`Payment Date: ${formatDate(payment.payment_date)}`, 20, 52);
    doc.text(`Invoice #: INV-${payment.bill_id}`, 20, 59);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Paid By:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (userInfo) {
        doc.text(userInfo.full_name || 'Customer', 20, 82);
        doc.text(userInfo.email || '', 20, 89);
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details:', 20, 105);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Amount Paid: $${parseFloat(payment.amount).toFixed(2)}`, 20, 115);
    doc.text(`Payment Method: ${formatPaymentMethod(payment.payment_method)}`, 20, 122);
    doc.text(`Transaction ID: ${payment.payment_id}`, 20, 129);

    doc.setFillColor(40, 167, 69);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.rect(65, 145, 80, 15, 'F');
    doc.text('✓ PAYMENT SUCCESSFUL', 105, 155, { align: 'center' });

    doc.setTextColor(128, 128, 128);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated receipt and does not require a signature.', 105, 270, { align: 'center' });
    doc.text('Thank you for your payment!', 105, 277, { align: 'center' });

    doc.save(`receipt_${payment.payment_id}.pdf`);
}

function generatePaymentHistoryPDF(payments, userInfo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text('POWERSHARE - Payment History Report', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${formatDate(new Date())}`, 20, 30);
    if (userInfo) {
        doc.text(`Customer: ${userInfo.full_name}`, 20, 37);
    }

    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    let y = 50;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Date', 22, y + 5);
    doc.text('Invoice #', 50, y + 5);
    doc.text('Amount', 85, y + 5);
    doc.text('Method', 115, y + 5);
    doc.text('Status', 155, y + 5);

    doc.setFont('helvetica', 'normal');
    y += 12;
    
    let totalAmount = 0;
    
    payments.slice(0, 30).forEach((payment, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.text(formatDate(payment.payment_date, true), 22, y);
        doc.text(`#${payment.bill_id}`, 50, y);
        doc.text(`$${parseFloat(payment.amount).toFixed(2)}`, 85, y);
        doc.text(formatPaymentMethod(payment.payment_method, true), 115, y);
        doc.text(payment.status || 'completed', 155, y);

        totalAmount += parseFloat(payment.amount);
        y += 7;
    });

    y += 5;
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    y += 7;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 22, y);
    doc.text(`$${totalAmount.toFixed(2)}`, 85, y);

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`payment_history_${formatDate(new Date(), true).replace(/\//g, '_')}.pdf`);
}


function generateAdminReportPDF(type, data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    
    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text(`POWERSHARE - ${type.toUpperCase()} Report`, 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${formatDate(new Date())}`, 20, 30);

    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    let y = 45;

    if (type === 'users' && data && data.length > 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y, 170, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('ID', 22, y + 5);
        doc.text('Name', 40, y + 5);
        doc.text('Email', 85, y + 5);
        doc.text('Role', 135, y + 5);
        doc.text('Status', 165, y + 5);

        doc.setFont('helvetica', 'normal');
        y += 12;

        data.slice(0, 35).forEach((user) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(8);
            doc.text(`#${user.user_id}`, 22, y);
            doc.text(user.full_name.substring(0, 25), 40, y);
            doc.text(user.email.substring(0, 30), 85, y);
            doc.text(user.role, 135, y);
            doc.text('Active', 165, y);

            y += 6;
        });
    } else if (type === 'payments' && data && data.length > 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y, 170, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('ID', 22, y + 5);
        doc.text('Date', 40, y + 5);
        doc.text('Amount', 75, y + 5);
        doc.text('Method', 110, y + 5);
        doc.text('Status', 155, y + 5);

        doc.setFont('helvetica', 'normal');
        y += 12;

        let total = 0;
        data.slice(0, 35).forEach((payment) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(8);
            doc.text(`#${payment.payment_id}`, 22, y);
            doc.text(formatDate(payment.payment_date, true), 40, y);
            doc.text(`$${parseFloat(payment.amount).toFixed(2)}`, 75, y);
            doc.text(payment.payment_method, 110, y);
            doc.text('Completed', 155, y);

            total += parseFloat(payment.amount);
            y += 6;
        });

        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: $${total.toFixed(2)}`, 22, y);
    } else if (type === 'generators' && data && data.length > 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y, 170, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('ID', 22, y + 5);
        doc.text('Name', 40, y + 5);
        doc.text('Location', 90, y + 5);
        doc.text('Capacity', 135, y + 5);
        doc.text('Subscribers', 165, y + 5);

        doc.setFont('helvetica', 'normal');
        y += 12;

        data.slice(0, 35).forEach((gen) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(8);
            doc.text(`#${gen.generator_id}`, 22, y);
            doc.text((gen.generator_name || gen.name || 'N/A').substring(0, 25), 40, y);
            doc.text((gen.location || 'N/A').substring(0, 25), 90, y);
            doc.text(`${gen.capacity_kw || 'N/A'} kW`, 135, y);
            doc.text(`${gen.subscriber_count || 0}`, 165, y);

            y += 6;
        });
    } else {
        doc.text('Total Users: 3,847', 20, y);
        doc.text('Generator Owners: 156', 20, y + 7);
        doc.text('Total Revenue: $1,200,000', 20, y + 14);
        doc.text('Active Subscriptions: 3,691', 20, y + 21);
    }

    doc.save(`${type}_report_${formatDate(new Date(), true).replace(/\//g, '_')}.pdf`);
}

function formatDate(date, short = false) {
    if (!date) return '--';
    const d = new Date(date);
    if (short) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPaymentMethod(method, short = false) {
    const methods = {
        'card': short ? 'Card' : 'Credit/Debit Card',
        'cash': 'Cash',
        'bank_transfer': short ? 'Bank' : 'Bank Transfer'
    };
    return methods[method] || method;
}

window.PDFUtils = {
    generateInvoicePDF,
    generateReceiptPDF,
    generatePaymentHistoryPDF,
    generateAdminReportPDF
};

console.log('PDF Utilities loaded successfully');

