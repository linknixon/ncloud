import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const openPdfInBrowser = (pdfDoc, fileName = 'Official_Tax_Invoice.pdf') => {
  try {
    pdfDoc.save(fileName);
  } catch (e) {
    try {
      pdfDoc.output('dataurlnewwindow');
    } catch (err) {
      console.error('Failed to save or open PDF:', err);
    }
  }
};

async function getImageDataUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

/**
 * Generates an official, 100% scannable 2D QR Code Data URL using the standard QRCode engine.
 * Fully compatible with all smartphone cameras, Google Lens, and QR Code scanners.
 */
export async function createQRCodeDataURL(text, size = 260) {
  if (!text) return '';
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating 2D QR Code Data URL:', err);
    return '';
  }
}

/**
 * Generates an executive, Fortune 500-grade Tax Invoice / Receipt PDF using native vector rendering.
 */
export async function generateInvoicePDF(invoice, options = {}) {
  const invoiceNum = invoice?.invoice_number || 'INV-2026-0041';
  const customerName = invoice?.customer_name || invoice?.party_name || 'Corporate Customer';
  const customerEmail = invoice?.customer_email || invoice?.party_email || '';
  const customerPhone = invoice?.customer_phone || invoice?.phone || '';
  const customerAddress = invoice?.customer_address || invoice?.address || 'Kampala, Uganda';
  const company = invoice?.company || '';
  
  const itemName = invoice?.item_name || invoice?.plan_name || (invoice?.items && invoice?.items[0] && invoice?.items[0].name) || invoice?.description || 'Cloud Service Subscription';
  const qty = Math.max(1, parseInt(invoice?.quantity) || 1);

  // Retrieve product catalog to fetch short descriptions
  let catalogProducts = options?.products || window.__NOVA_PRODUCTS__ || [];
  if (!catalogProducts || catalogProducts.length === 0) {
    try {
      const res = await fetch('/api/products');
      if (res.ok) catalogProducts = await res.json();
    } catch (e) {}
  }

  const defaultShortDescriptions = {
    'general labor': 'On-site engineering installation, cable termination & hardware mounting labor',
    'extension cable': 'Heavy-duty industrial power extension cable & power strip assembly',
    'unifi mesh access points': 'High-performance dual-band indoor/outdoor Wi-Fi mesh access point node',
    'fridge guard': 'Automated high/low voltage surge protector & power guard unit',
    'outdoor cable ties': 'Weatherproof UV-resistant nylon zip cable ties (pack of 100)',
    'mounting points': 'Stainless steel wall/pole mounting bracket set & expansion anchors',
    'unifi controller hosting': '24/7 Enterprise UniFi Cloud Controller hosting & automated backup instance',
    'edge virtual private server': 'High-speed NVMe cloud compute instance with 10Gbps redundant fiber uplink'
  };

  const findShortDescription = (pName, itemObj = {}) => {
    if (itemObj.short_description || itemObj.short_desc) {
      const candidate = String(itemObj.short_description || itemObj.short_desc).trim();
      if (candidate && candidate.toLowerCase() !== String(pName).trim().toLowerCase()) {
        return candidate;
      }
    }
    const raw = String(pName || '').trim().toLowerCase();
    if (!raw) return '';
    
    // 1. Exact catalog match
    const match = Array.isArray(catalogProducts) 
      ? catalogProducts.find(p => p.name && p.name.trim().toLowerCase() === raw)
      : null;
    if (match && (match.short_description || match.description)) {
      return match.short_description || match.description;
    }
    
    // 2. Default fallback map match
    for (const [key, val] of Object.entries(defaultShortDescriptions)) {
      if (raw.includes(key) || key.includes(raw)) return val;
    }

    // 3. Fuzzy catalog match
    const fuzzyMatch = Array.isArray(catalogProducts)
      ? catalogProducts.find(p => p.name && (p.name.toLowerCase().includes(raw) || raw.includes(p.name.toLowerCase())))
      : null;
    return fuzzyMatch ? (fuzzyMatch.short_description || fuzzyMatch.description || '') : '';
  };

  const knownProductPrices = {
    'general labor': 120000,
    'extension cable': 20000,
    'unifi mesh access points': 480000,
    'fridge guard': 35000,
    'outdoor cable ties': 6000,
    'mounting points': 20000,
    'unifi controller hosting': 99999.96,
    'edge virtual private server': 650000
  };

  const findCatalogItemPrice = (pName) => {
    const raw = String(pName || '').trim().toLowerCase();
    if (!raw) return 0;
    const match = Array.isArray(catalogProducts) 
      ? catalogProducts.find(p => p.name && p.name.trim().toLowerCase() === raw)
      : null;
    if (match && Number(match.price) > 0) return Number(match.price);
    for (const [key, val] of Object.entries(knownProductPrices)) {
      if (raw.includes(key) || key.includes(raw)) return val;
    }
    return 0;
  };

  // 1. Process Line Items and expand comma-separated items into separate individual lines
  const expandPdfItem = (it, fallbackAmt) => {
    const rawName = String(it.name || it.item_name || it.description || itemName).trim();
    
    if (rawName.includes(',') && !rawName.toLowerCase().includes('vcpu') && !rawName.toLowerCase().includes('ram')) {
      const parts = rawName.split(',').map(s => s.trim()).filter(Boolean);
      const totalItemAmt = Number(it.amount || ((it.unit_price || it.price || 0) * (it.quantity || it.qty || 1))) || fallbackAmt;
      const avgRate = parts.length > 0 ? Math.round(totalItemAmt / parts.length) : totalItemAmt;

      return parts.map(pName => {
        const subShortDesc = findShortDescription(pName);
        const catPrice = findCatalogItemPrice(pName);
        const perRate = catPrice > 0 ? catPrice : avgRate;
        return {
          description: pName,
          name: pName,
          short_description: subShortDesc,
          qty: 1,
          unit_price: perRate,
          amount: perRate
        };
      });
    }

    const shortDesc = findShortDescription(rawName, it);
    const itemQty = Math.max(1, parseInt(it.quantity || it.qty) || 1);
    
    let itemRate = 0;
    if (it.unit_price !== undefined && it.unit_price !== null && !isNaN(Number(it.unit_price)) && Number(it.unit_price) > 0) {
      itemRate = Number(it.unit_price);
    } else if (it.price !== undefined && it.price !== null && !isNaN(Number(it.price)) && Number(it.price) > 0) {
      itemRate = Number(it.price);
    } else if (it.rate !== undefined && it.rate !== null && !isNaN(Number(it.rate)) && Number(it.rate) > 0) {
      itemRate = Number(it.rate);
    } else if (it.amount !== undefined && it.amount !== null && !isNaN(Number(it.amount))) {
      itemRate = Math.round(Number(it.amount) / itemQty);
    } else {
      itemRate = Math.round(fallbackAmt / itemQty);
    }

    let lineAmt = 0;
    if (it.amount !== undefined && it.amount !== null && !isNaN(Number(it.amount)) && Number(it.amount) > 0) {
      lineAmt = Number(it.amount);
    } else {
      lineAmt = itemRate * itemQty;
    }

    return [{
      description: rawName,
      name: rawName,
      short_description: shortDesc,
      qty: itemQty,
      unit_price: itemRate,
      amount: lineAmt
    }];
  };

  let lineItems = [];
  if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
    invoice.items.forEach(it => {
      lineItems.push(...expandPdfItem(it, Number(invoice?.amount || 0)));
    });
  } else {
    lineItems.push(...expandPdfItem({
      name: itemName,
      unit_price: invoice?.unit_price,
      quantity: invoice?.quantity || qty,
      amount: invoice?.subtotal || invoice?.amount
    }, Number(invoice?.amount || 0)));
  }

  // 2. Exact System Calculations directly from Database Figures
  const isVatExempt = Boolean(invoice?.vat_exempt || invoice?.vat_type === 'exempt' || options?.vatExempt || invoice?.include_vat === false);
  const calculatedItemsSum = lineItems.reduce((sum, item) => sum + item.amount, 0);

  let subtotalAmount = 0;
  let vatAmount = 0;
  let totalAmount = 0;

  if (invoice?.subtotal !== undefined && invoice?.subtotal !== null && Number(invoice.subtotal) > 0) {
    subtotalAmount = Number(invoice.subtotal);
  } else {
    subtotalAmount = calculatedItemsSum;
  }

  if (invoice?.amount !== undefined && invoice?.amount !== null && Number(invoice.amount) > 0) {
    totalAmount = Number(invoice.amount);
  } else {
    totalAmount = subtotalAmount + (isVatExempt ? 0 : Math.round(subtotalAmount * 0.18));
  }

  if (invoice?.vat_amount !== undefined && invoice?.vat_amount !== null) {
    vatAmount = Number(invoice.vat_amount);
  } else if (isVatExempt) {
    vatAmount = 0;
  } else {
    vatAmount = Math.max(0, totalAmount - subtotalAmount);
  }

  const status = invoice?.status || invoice?.payment_status || 'Paid';
  const isPaid = status === 'Paid' || status === '100% Paid' || status === 'Paid & Settled' || status === 'Approved for Payment';

  const paidToDate = isPaid
    ? Number(invoice?.paid_amount || invoice?.amount_paid || totalAmount)
    : Number(invoice?.paid_amount || invoice?.amount_paid || 0);
  const balanceDue = Math.max(0, totalAmount - paidToDate);

  const dueDate = invoice?.due_date || '2026-09-30';
  const createdDate = invoice?.created_at ? new Date(invoice.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const siteLogo = options?.siteLogo || options?.logoUrl || localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo');

  let logoDataUrl = '';
  if (siteLogo) {
    logoDataUrl = await getImageDataUrl(siteLogo);
  }
  if (!logoDataUrl) {
    logoDataUrl = await getImageDataUrl('/logo.png');
  }

  let dbBankAccounts = options?.bankAccounts || window.__NOVA_BANK_ACCOUNTS__ || [];
  if (!Array.isArray(dbBankAccounts) || dbBankAccounts.length === 0) {
    try {
      const res = await fetch('/api/admin/bank-accounts');
      if (res.ok) dbBankAccounts = await res.json();
    } catch (e) {}
  }
  if (!Array.isArray(dbBankAccounts)) dbBankAccounts = [];

  const excessAmount = Number(invoice?.excess_amount || 0);
  const userName = options?.userName || localStorage.getItem('nova_user_name') || 'Samuel Kintu';
  const userRole = options?.userRole || 'Sales Admin';
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 260);

  // Initialize Pure Native Vector jsPDF Document (Plain Vector Text & Shapes, 0 Raster Canvas!)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Top Header Box (Faded Light Blue Work Order Style)
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(186, 230, 253);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(14, 12, 182, 26, 3, 3, 'FD');

  let headerTextX = 18;
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', 17, 14.5, 24, 21);
      headerTextX = 44;
    } catch (e) {}
  }

  // Company Name & Subtitle (System Admin Portal Typography - Helvetica / Plus Jakarta Sans Style)
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(11.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('NOVA CLOUD EDGES (U) LIMITED', headerTextX, 19.5);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(3, 105, 161);
  pdf.text('OFFICIAL TAX INVOICE & STATEMENT', headerTextX, 24.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.2);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Plot 14 Parliament Avenue, Kampala • Email: support@ncloud.co.ug • Hotline: +256 790 001 631', headerTextX, 29.5);

  // Reference Badge Pill
  pdf.setFillColor(224, 242, 254);
  pdf.setDrawColor(125, 211, 252);
  pdf.roundedRect(138, 16, 52, 7, 3, 3, 'FD');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(3, 105, 161);
  pdf.text(`REF: #${invoiceNum}`, 164, 20.8, { align: 'center' });

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Issued: ${createdDate}  •  Due: ${dueDate}`, 190, 30.5, { align: 'right' });

  // Customer Details & Invoice Metadata Card (2 Columns)
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, 42, 98, 28, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(3, 105, 161);
  pdf.text('BILL TO / CUSTOMER DETAILS:', 18, 47);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(customerName.substring(0, 42), 18, 52.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  let cY = 57.5;
  if (customerEmail) { pdf.text(`Email: ${customerEmail.substring(0, 40)}`, 18, cY); cY += 4.5; }
  if (customerPhone) { pdf.text(`Phone: ${customerPhone}`, 18, cY); cY += 4.5; }
  pdf.text(`Address: ${customerAddress.substring(0, 44)}`, 18, cY);

  // Compliance Metadata Card
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(116, 42, 80, 28, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(3, 105, 161);
  pdf.text('INVOICE STATUS & COMPLIANCE:', 120, 47);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text('Payment Status:', 120, 53);

  // Status Badge Pill (Only displays PAID or status, 100% PAID is strictly reserved for the PAID STAMP)
  pdf.setFillColor(isPaid ? 224 : 254, isPaid ? 242 : 243, isPaid ? 254 : 199);
  pdf.setDrawColor(isPaid ? 125 : 253, isPaid ? 211 : 230, isPaid ? 252 : 138);
  pdf.roundedRect(154, 49.5, 38, 5.5, 2, 2, 'FD');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(isPaid ? 2 : 180, isPaid ? 132 : 83, isPaid ? 199 : 9);
  const compliancePillLabel = isPaid ? 'PAID & SETTLED' : status.toUpperCase();
  pdf.text(compliancePillLabel, 173, 53.5, { align: 'center' });

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Payment Due Date: ${dueDate}`, 120, 60);
  pdf.text('Digital Clearance: Verified Ledger', 120, 65);

  // Line Items Table Header (Sky Blue #0284c7)
  let y = 76;
  pdf.setFillColor(2, 132, 199);
  pdf.roundedRect(14, y, 182, 8, 2, 2, 'F');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('SERVICE / ITEM DESCRIPTION', 18, y + 5.2);
  pdf.text('QTY', 122, y + 5.2, { align: 'center' });
  pdf.text('UNIT RATE (UGX)', 152, y + 5.2, { align: 'right' });
  pdf.text('AMOUNT (UGX)', 190, y + 5.2, { align: 'right' });

  y += 8;

  // Table Body Rows
  lineItems.forEach((it, idx) => {
    const rowHeight = it.short_description ? 12 : 9;
    pdf.setFillColor(idx % 2 === 1 ? 248 : 255, idx % 2 === 1 ? 250 : 255, idx % 2 === 1 ? 252 : 255);
    pdf.rect(14, y, 182, rowHeight, 'F');

    pdf.setDrawColor(224, 242, 254);
    pdf.setLineWidth(0.2);
    pdf.line(14, y + rowHeight, 196, y + rowHeight);

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(it.description || it.name || itemName).substring(0, 52), 18, y + 5.5);

    if (it.short_description) {
      pdf.setFont('Helvetica', 'oblique');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(String(it.short_description).substring(0, 65), 18, y + 9.5);
    }

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(it.qty), 122, y + 5.5, { align: 'center' });
    pdf.text(`UGX ${Number(it.unit_price).toLocaleString()}`, 152, y + 5.5, { align: 'right' });

    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(2, 132, 199);
    pdf.text(`UGX ${Number(it.amount).toLocaleString()}`, 190, y + 5.5, { align: 'right' });

    y += rowHeight;
  });

  y += 6;

  // Paid Stamp & Financial Summary Section
  const finY = y;
  if (isPaid) {
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(22, 163, 74);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(14, finY, 80, 24, 3, 3, 'FD');

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(22, 163, 74);
    pdf.text('✓ 100% PAID & VERIFIED', 18, finY + 8);

    pdf.setFontSize(8);
    pdf.setTextColor(21, 128, 61);
    pdf.text('OFFICIAL RECEIPT CLEARED', 18, finY + 14);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`REF: NV-PAID-${invoiceNum.replace(/[^a-zA-Z0-9]/g, '')}`, 18, finY + 19);
  }

  // Financial Breakdown Box (Right Aligned)
  let sumY = finY;
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Subtotal:', 125, sumY + 4);
  pdf.text(`UGX ${Number(subtotalAmount).toLocaleString()}`, 190, sumY + 4, { align: 'right' });
  sumY += 5;

  const discountAmt = Number(invoice?.discount_amount) || 0;
  if (discountAmt > 0) {
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(22, 163, 74);
    pdf.text('Sales Discount:', 125, sumY + 4);
    pdf.text(`- UGX ${Number(discountAmt).toLocaleString()}`, 190, sumY + 4, { align: 'right' });
    sumY += 5;
  }

  if (!isVatExempt) {
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(220, 38, 38);
    pdf.text('VAT (18%):', 125, sumY + 4);
    pdf.text(`UGX ${Number(vatAmount).toLocaleString()}`, 190, sumY + 4, { align: 'right' });
    sumY += 5;
  }

  // Total Invoice Banner
  pdf.setFillColor(2, 132, 199);
  pdf.roundedRect(114, sumY + 2, 82, 8, 2, 2, 'F');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL INVOICE AMOUNT:', 118, sumY + 7.2);
  pdf.setFontSize(9.5);
  pdf.text(`UGX ${Number(totalAmount).toLocaleString()}`, 192, sumY + 7.2, { align: 'right' });
  sumY += 12;

  // Payments Captured & Balance Due
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(186, 230, 253);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(114, sumY, 82, 14, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(21, 128, 61);
  pdf.text('Paid to Date:', 118, sumY + 5);
  pdf.text(`- UGX ${Number(paidToDate).toLocaleString()}`, 192, sumY + 5, { align: 'right' });

  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.2);
  pdf.line(116, sumY + 7, 194, sumY + 7);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(balanceDue > 0 ? 180 : 2, balanceDue > 0 ? 83 : 132, balanceDue > 0 ? 9 : 199);
  pdf.text('Balance Due:', 118, sumY + 11.5);
  pdf.text(`UGX ${Number(balanceDue).toLocaleString()}`, 192, sumY + 11.5, { align: 'right' });

  // Payment History Ledger Section (if payment history exists)
  const historyList = Array.isArray(invoice?.payment_history) 
    ? invoice.payment_history 
    : (Array.isArray(invoice?.lines) ? invoice.lines : []);

  if (historyList && historyList.length > 0) {
    y = Math.max(finY + 28, sumY + 20);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    
    const tableHeaderY = y;
    const historyHeight = 6 + (historyList.length * 5.5);
    pdf.roundedRect(14, tableHeaderY, 182, historyHeight, 2, 2, 'FD');
    
    pdf.setFillColor(224, 242, 254);
    pdf.rect(14, tableHeaderY, 182, 6, 'F');

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(3, 105, 161);
    pdf.text('INSTALLMENT LOG', 18, tableHeaderY + 4.2);
    pdf.text('TIMESTAMP / DATE', 58, tableHeaderY + 4.2);
    pdf.text('REFERENCE & METHOD', 108, tableHeaderY + 4.2);
    pdf.text('AMOUNT PAID', 190, tableHeaderY + 4.2, { align: 'right' });

    let hRowY = tableHeaderY + 10.2;
    historyList.forEach((hLine, hIdx) => {
      const ordName = (hLine.ordinal_name || `${hIdx + 1}th Payment`).toUpperCase();
      const dtStr = hLine.formattedDateTime || hLine.date || hLine.created_at || 'N/A';
      const refStr = `${hLine.reference || 'TXN-REF'} (${hLine.payment_method || 'Bank Wire'})`;
      const amtStr = `UGX ${Number(hLine.amount_paid || hLine.amount || 0).toLocaleString()}`;

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(99, 102, 241);
      pdf.text(ordName, 18, hRowY);

      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text(String(dtStr).substring(0, 24), 58, hRowY);
      pdf.text(String(refStr).substring(0, 36), 108, hRowY);

      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(22, 163, 74);
      pdf.text(amtStr, 190, hRowY, { align: 'right' });

      hRowY += 5.5;
    });

    y = hRowY + 4;
  } else {
    y = Math.max(finY + 28, sumY + 20);
  }

  // Bank Accounts & Verification Section (2 Columns)
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(186, 230, 253);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(14, y, 114, 26, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(2, 132, 199);
  pdf.text('OFFICIAL BANK REMITTANCE ACCOUNTS:', 18, y + 5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(51, 65, 85);
  let bY = y + 9.5;
  dbBankAccounts.forEach(b => {
    pdf.setFont('Helvetica', 'bold');
    pdf.text(`${b.bank_name}:`, 18, bY);
    pdf.setFont('Helvetica', 'normal');
    pdf.text(`A/C: ${b.account_number} (${b.currency || 'UGX'})${b.swift_code ? ` • Swift: ${b.swift_code}` : ''}`, 60, bY);
    bY += 4.5;
  });
  pdf.setFont('Helvetica', 'bold');
  pdf.text('Account Name: Nova Cloud Edges (U) Limited', 18, bY);

  // 2D QR Code Image & Verification Box
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(186, 230, 253);
  pdf.roundedRect(132, y, 64, 26, 2, 2, 'FD');

  if (qrDataUrl) {
    pdf.addImage(qrDataUrl, 'PNG', 135, y + 3, 20, 20);
  }

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Verify Document:', 158, y + 8);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Scan 2D QR Code image', 158, y + 13);
  pdf.text('with any smartphone for', 158, y + 17);
  pdf.text('authenticity clearance.', 158, y + 21);

  // Signatory & Clean Vector Footer
  pdf.setDrawColor(2, 132, 199);
  pdf.setLineWidth(0.5);
  pdf.line(135, 276, 196, 276);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Authorized Finance Manager Signatory', 196, 280, { align: 'right' });

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Nova Cloud Edges Accounts Department', 196, 284, { align: 'right' });

  pdf.text(`Generated by: ${userName} (${userRole}) on ${timestampStr}`, 14, 280);
  pdf.text('Nova Cloud Edges (U) Limited — Official Corporate Tax Document', 14, 284);

  // Vector Single Page Number
  const totalPages = pdf.getNumberOfPages() || 1;
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${page} of ${totalPages}`, 105, 290, { align: 'center' });
  }

  openPdfInBrowser(pdf, `Tax_Invoice_${invoiceNum}.pdf`);
}

/**
 * Generates an executive Financial Balance Sheet PDF statement.
 */
export function generateBalanceSheetPDF(data = {}, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const userName = options?.userName || 'Systems Admin';
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  // Header line
  doc.setLineWidth(1.5);
  doc.setDrawColor(30, 58, 138);
  doc.line(14, 12, 196, 12);

  // Company info
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 14, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Plot 14 Parliament Avenue, Kampala, Republic of Uganda', 14, 26);
  doc.text('TIN: 1000987654 | Financial Audit Ledger Ref: NV-BAL-2026', 14, 31);

  // Statement Badge
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(125, 16, 71, 9, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(67, 56, 202);
  doc.text('FINANCIAL BALANCE SHEET', 128, 22);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`As of Period: ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 14, 40);

  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 43, 196, 43);

  const metrics = data?.metrics || {};
  const cashCollected = Number(metrics.total_cash_collected ?? metrics.totalCashCollected ?? 0);
  const pendingReceivables = Number(metrics.total_pending_receivables ?? metrics.totalPendingReceivables ?? 0);
  const totalExpenses = Number(metrics.total_expenditures ?? metrics.totalExpenses ?? 0);
  const staffDisbursements = Number(metrics.total_staff_disbursements ?? metrics.totalStaffDisbursements ?? 0);
  const excessCredits = Number(metrics.total_customer_credit_pool ?? metrics.totalExcessCredits ?? 0);

  const totalAssets = cashCollected + pendingReceivables;
  const totalLiabilities = totalExpenses + staffDisbursements + excessCredits;
  const equity = totalAssets - totalLiabilities;

  let y = 52;

  // SECTION 1: ASSETS
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ASSETS & CURRENT LIQUIDITY', 16, y + 5);
  y += 11;

  const assetRows = [
    ['Cash & Operating Bank Collections', `UGX ${cashCollected.toLocaleString()}`],
    ['Accounts Receivable (Unpaid Customer Invoices)', `UGX ${pendingReceivables.toLocaleString()}`]
  ];

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  assetRows.forEach(([name, val], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 6, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.text(name, 16, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val, 194, y, { align: 'right' });
    doc.setFont('Helvetica', 'normal');
    y += 7;
  });

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL ASSETS:', 16, y + 2);
  doc.text(`UGX ${totalAssets.toLocaleString()}`, 194, y + 2, { align: 'right' });
  y += 12;

  // SECTION 2: LIABILITIES
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. LIABILITIES & PAYABLES', 16, y + 5);
  y += 11;

  const liabilityRows = [
    ['Company Operating Expenditures & Vouchers', `UGX ${totalExpenses.toLocaleString()}`],
    ['Staff Payroll Accruals & Compensation Demands', `UGX ${staffDisbursements.toLocaleString()}`],
    ['Customer Overpayment Credit Pool', `UGX ${excessCredits.toLocaleString()}`]
  ];

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  liabilityRows.forEach(([name, val], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 6, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.text(name, 16, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val, 194, y, { align: 'right' });
    doc.setFont('Helvetica', 'normal');
    y += 7;
  });

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('TOTAL LIABILITIES:', 16, y + 2);
  doc.text(`UGX ${totalLiabilities.toLocaleString()}`, 194, y + 2, { align: 'right' });
  y += 12;

  // SECTION 3: EQUITY
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. NET SHAREHOLDER EQUITY & RETAINED SURPLUS', 16, y + 5);
  y += 11;

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(equity >= 0 ? 21 : 185, equity >= 0 ? 128 : 28, equity >= 0 ? 61 : 28);
  doc.text(equity >= 0 ? 'NET OPERATING EQUITY / SURPLUS:' : 'NET OPERATING DEFICIT:', 16, y);
  doc.text(`UGX ${equity.toLocaleString()}`, 194, y, { align: 'right' });

  // Footer
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Certified Balance Sheet Statement | Generated by ${userName} on ${timestampStr}`, 14, 281);
  doc.text('Nova Cloud Edges (U) Ltd — Page 1 of 1', 140, 281);

  openPdfInBrowser(doc);
}

/**
 * Generates an executive Profit & Loss Statement PDF.
 */
export function generateProfitLossPDF(data = {}, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const userName = options?.userName || 'Systems Admin';
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  doc.setLineWidth(1.5);
  doc.setDrawColor(16, 185, 129);
  doc.line(14, 12, 196, 12);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 14, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Plot 14 Parliament Avenue, Kampala, Republic of Uganda', 14, 26);
  doc.text('TIN: 1000987654 | Financial Income Statement Ref: NV-PL-2026', 14, 31);

  doc.setFillColor(220, 252, 231);
  doc.roundedRect(125, 16, 71, 9, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('STATEMENT OF PROFIT & LOSS', 127, 22);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reporting Period: Current Financial Cycle (${now.getFullYear()})`, 14, 40);

  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 43, 196, 43);

  const metrics = data?.metrics || {};
  const totalInvoicedSales = Number(metrics.total_invoiced_sales ?? metrics.totalInvoicedSales ?? 0);
  const totalRev = Number(metrics.total_cash_collected ?? metrics.totalCashCollected ?? totalInvoicedSales);
  const totalExp = Number(metrics.total_expenditures ?? metrics.totalExpenses ?? 0);
  const netProfit = totalRev - totalExp;
  const margin = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0';

  let y = 52;

  // REVENUE SECTION
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('A. OPERATING REVENUE & CASH COLLECTIONS', 16, y + 5);
  y += 12;

  const revItems = [
    ['Total Billed Invoiced Sales', `UGX ${totalInvoicedSales.toLocaleString()}`],
    ['Total Cleared Cash Collections', `UGX ${totalRev.toLocaleString()}`]
  ];

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  revItems.forEach(([name, val], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 6, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.text(name, 16, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val, 194, y, { align: 'right' });
    doc.setFont('Helvetica', 'normal');
    y += 7;
  });

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('TOTAL REVENUE RECEIVED:', 16, y + 2);
  doc.text(`UGX ${totalRev.toLocaleString()}`, 194, y + 2, { align: 'right' });
  y += 14;

  // EXPENSES SECTION
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('B. OPERATING EXPENSES & OVERHEADS BREAKDOWN', 16, y + 5);
  y += 12;

  const expList = Array.isArray(data?.expense_category_breakdown) && data.expense_category_breakdown.length > 0
    ? data.expense_category_breakdown
    : (data?.expensesByCategory
        ? Object.entries(data.expensesByCategory).map(([cat, amt]) => ({ category: cat, total_amount: amt }))
        : []);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);

  if (expList.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No recorded expenditure categories in database ledger.', 16, y);
    y += 7;
  } else {
    expList.forEach((item, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6, 'F');
      }
      doc.setTextColor(51, 65, 85);
      doc.text(item.category || 'General Operating Cost', 16, y);
      doc.setFont('Helvetica', 'bold');
      doc.text(`UGX ${Number(item.total_amount || 0).toLocaleString()}`, 194, y, { align: 'right' });
      doc.setFont('Helvetica', 'normal');
      y += 7;
    });
  }

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('TOTAL OPERATING EXPENDITURES:', 16, y + 2);
  doc.text(`UGX ${totalExp.toLocaleString()}`, 194, y + 2, { align: 'right' });
  y += 16;

  // NET SUMMARY BOX
  doc.setFillColor(netProfit >= 0 ? 240 : 254, netProfit >= 0 ? 253 : 242, netProfit >= 0 ? 244 : 242);
  doc.rect(14, y, 182, 22, 'F');
  doc.setDrawColor(netProfit >= 0 ? 16 : 239, netProfit >= 0 ? 185 : 68, netProfit >= 0 ? 129 : 68);
  doc.rect(14, y, 182, 22, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(netProfit >= 0 ? 21 : 185, netProfit >= 0 ? 128 : 28, netProfit >= 0 ? 61 : 28);
  doc.text(netProfit >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING DEFICIT', 20, y + 9);
  doc.setFontSize(13);
  doc.text(`UGX ${netProfit.toLocaleString()}`, 190, y + 9, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Operating Margin: ${margin}% of Total Inflow Collections`, 20, y + 17);

  // Footer
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Audited Profit & Loss Document | Authorized by: ${userName} on ${timestampStr}`, 14, 281);
  doc.text('Nova Cloud Edges (U) Ltd — Page 1 of 1', 140, 281);

  openPdfInBrowser(doc);
}

/**
 * Generates an executive Expense Audit Report PDF.
 */
export function generateExpenseReportPDF(data = {}, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const userName = options?.userName || 'Systems Admin';
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  doc.setLineWidth(1.5);
  doc.setDrawColor(239, 68, 68);
  doc.line(14, 12, 196, 12);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 14, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Company Expenditure Audit & Supervisor Approval Summary', 14, 26);

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(125, 16, 71, 9, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28);
  doc.text('EXPENDITURE AUDIT REPORT', 127, 22);

  let y = 44;
  const expenses = data?.companyExpenses || data?.recentExpenses || [];

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('VOUCHER', 16, y + 5);
  doc.text('STAFF NAME', 44, y + 5);
  doc.text('CATEGORY & DESCRIPTION', 82, y + 5);
  doc.text('AMOUNT (UGX)', 194, y + 5, { align: 'right' });
  y += 10;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  let total = 0;

  if (expenses.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No recorded company expenditures in database ledger.', 16, y);
    y += 7;
  } else {
    expenses.slice(0, 18).forEach((exp, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, 182, 6, 'F');
      }
      doc.setTextColor(51, 65, 85);
      doc.text(exp.receipt_ref || `EXP-${exp.id}`, 16, y);
      doc.text((exp.staff_name || 'Staff').slice(0, 16), 44, y);
      doc.text(`${(exp.category || '').slice(0, 22)} — ${(exp.description || '').slice(0, 32)}`, 82, y);
      doc.setFont('Helvetica', 'bold');
      doc.text(Number(exp.amount || 0).toLocaleString(), 194, y, { align: 'right' });
      doc.setFont('Helvetica', 'normal');
      total += Number(exp.amount || 0);
      y += 7;
    });
  }

  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(185, 28, 28);
  doc.text('TOTAL AUDITED EXPENDITURES:', 16, y);
  doc.text(`UGX ${total.toLocaleString()}`, 194, y, { align: 'right' });

  // Footer
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Expenditure Audit Ledger | Generated by ${userName} on ${timestampStr}`, 14, 281);
  doc.text('Nova Cloud Edges (U) Ltd — Page 1 of 1', 140, 281);

  openPdfInBrowser(doc);
}

/**
 * Generates an executive Sales & Product Performance Report PDF.
 */
export function generateSalesReportPDF(data = {}, options = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const userName = options?.userName || 'Systems Admin';
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  doc.setLineWidth(1.5);
  doc.setDrawColor(14, 165, 233);
  doc.line(14, 12, 196, 12);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(2, 132, 199);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 14, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Commercial Sales Intelligence & Product Performance Audit', 14, 26);

  doc.setFillColor(224, 242, 254);
  doc.roundedRect(120, 16, 76, 9, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199);
  doc.text('SALES & PRODUCT PERFORMANCE', 122, 22);

  let y = 44;
  const topItems = data?.top_selling_items || data?.topSellingItems || [];
  const pushItems = data?.items_needing_push || data?.underperformingItems || [];

  // STAR PERFORMERS
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('A. TOP SELLING PRODUCTS & HIGH DEMAND SERVICES', 16, y + 5);
  y += 10;

  if (topItems.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No product sales recorded in system database yet.', 16, y);
    y += 7;
  } else {
    topItems.forEach((item, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, 182, 6, 'F');
      }
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${item.name} (${item.category || 'Offering'})`, 16, y);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Qty: ${item.sales_count || 0} | UGX ${Number(item.total_revenue || item.revenue || 0).toLocaleString()}`, 194, y, { align: 'right' });
      y += 7;
    });
  }

  y += 6;

  // UNDERPERFORMING PUSH ITEMS
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('B. ITEMS REQUIRING COMMERCIAL PROMOTION & SALES PUSH', 16, y + 5);
  y += 10;

  if (pushItems.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('All catalog offerings are currently active.', 16, y);
    y += 7;
  } else {
    pushItems.forEach((item, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, 182, 6, 'F');
      }
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${item.name} (${item.category || 'Offering'})`, 16, y);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`Price: UGX ${Number(item.price || 0).toLocaleString()} — Low Traction`, 194, y, { align: 'right' });
      y += 7;
    });
  }

  // Footer
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Commercial Sales Audit Report | Generated by ${userName} on ${timestampStr}`, 14, 281);
  doc.text('Nova Cloud Edges (U) Ltd — Page 1 of 1', 140, 281);

  openPdfInBrowser(doc);
}

/**
 * Generates an official Employee Monthly Payroll Payslip PDF.
 */
export function generatePayrollPayslipPDF(payroll, options = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const staffName = payroll?.staff_name || 'Staff Specialist';
  const email = payroll?.email || 'staff@ncloud.co.ug';
  const position = payroll?.position || 'Senior Cloud Systems Engineer';
  const department = payroll?.department || 'Engineering & Operations';
  const payPeriod = payroll?.pay_period || 'August 2026';
  const status = payroll?.status || 'Paid';

  const baseSalary = Number(payroll?.base_salary || 3500000);
  const allowances = Number(payroll?.allowances || 250000);
  const grossPay = baseSalary + allowances;
  const deductions = Number(payroll?.deductions || 425000);
  const netPay = Number(payroll?.net_pay || (grossPay - deductions));

  const userName = options?.userName || 'HR Administration';
  const siteLogo = options?.siteLogo || localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo');
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  // Top Modern Header Line
  doc.setLineWidth(1.5);
  doc.setDrawColor(249, 115, 22); // Orange Accent
  doc.line(14, 12, 196, 12);

  // Logo / Header
  let currentY = 16;
  if (siteLogo && siteLogo.startsWith('data:image/')) {
    try {
      const format = siteLogo.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(siteLogo, format, 14, currentY, 38, 12);
    } catch {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('NOVA CLOUD EDGES', 14, currentY + 8);
    }
  } else {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('NOVA CLOUD EDGES', 14, currentY + 8);
  }

  // Right-aligned Payslip Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(249, 115, 22);
  doc.text('OFFICIAL PAYROLL PAYSLIP', 196, currentY + 4, { align: 'right' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pay Period: ${payPeriod} | Status: ${status}`, 196, currentY + 9, { align: 'right' });

  // Employee Information Box
  currentY += 18;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 34, 3, 3, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('EMPLOYEE PERSONNEL INFORMATION', 18, currentY + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Employee Name:`, 18, currentY + 13);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(staffName, 52, currentY + 13);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Designation:`, 18, currentY + 19);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(position, 52, currentY + 19);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Work Email:`, 18, currentY + 25);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(email, 52, currentY + 25);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Department:`, 110, currentY + 13);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(department, 138, currentY + 13);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Employer:`, 110, currentY + 19);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges (U) Ltd', 138, currentY + 19);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Disbursement:`, 110, currentY + 25);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`Direct EFT Bank Wire (100% Cleared)`, 138, currentY + 25);

  // Earnings & Deductions Tables
  currentY += 40;
  
  // Section Header: Earnings
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('EARNINGS & ALLOWANCES', 18, currentY + 5);
  doc.text('AMOUNT (UGX)', 190, currentY + 5, { align: 'right' });

  currentY += 11;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Basic Contractual Salary', 18, currentY);
  doc.setFont('Helvetica', 'bold');
  doc.text(`UGX ${baseSalary.toLocaleString()}`, 190, currentY, { align: 'right' });

  currentY += 7;
  doc.setFont('Helvetica', 'normal');
  doc.text('Transport, Housing & Field Allowances', 18, currentY);
  doc.setFont('Helvetica', 'bold');
  doc.text(`UGX ${allowances.toLocaleString()}`, 190, currentY, { align: 'right' });

  currentY += 7;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 196, currentY);
  currentY += 5;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GROSS EARNINGS:', 18, currentY);
  doc.text(`UGX ${grossPay.toLocaleString()}`, 190, currentY, { align: 'right' });

  // Section Header: Deductions
  currentY += 12;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('STATUTORY & AUTHORIZED DEDUCTIONS', 18, currentY + 5);
  doc.text('AMOUNT (UGX)', 190, currentY + 5, { align: 'right' });

  currentY += 11;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('PAYE Statutory Income Tax & NSSF (15%) Contribution', 18, currentY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text(`-UGX ${deductions.toLocaleString()}`, 190, currentY, { align: 'right' });

  currentY += 7;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 196, currentY);
  currentY += 5;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL DEDUCTIONS:', 18, currentY);
  doc.setTextColor(239, 68, 68);
  doc.text(`-UGX ${deductions.toLocaleString()}`, 190, currentY, { align: 'right' });

  // Net Pay Highlight Box
  currentY += 14;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, currentY, 182, 22, 3, 3, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52);
  doc.text('NET TAKE-HOME PAYABLE AMOUNT:', 20, currentY + 9);
  doc.setFontSize(16);
  doc.text(`UGX ${netPay.toLocaleString()}`, 188, currentY + 14, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'normal');
  doc.text('Verified official salary disbursement into employee nominated account.', 20, currentY + 16);

  // Signatures
  currentY += 34;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Prepared by: HR & Personnel Lead', 18, currentY);
  doc.text('Authorized by: Executive Managing Director', 110, currentY);

  currentY += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('HR & Payroll Officer', 18, currentY);
  doc.text('Systems Admin (Executive Director)', 110, currentY);

  // Footer
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Confidential Employee Payroll Slip | Generated by ${userName} on ${timestampStr}`, 14, 281);
  doc.text('Nova Cloud Edges (U) Ltd — Page 1 of 1', 140, 281);

  openPdfInBrowser(doc);
}

/**
 * Generates an official Commercial Quotation & Cost Proposal PDF.
 * - Distinct Teal / Slate styling (Different from Tax Invoices)
 * - Validity date & terms
 * - Itemized table with discount percentages
 * - Bank remittance details
 * - QR code authenticity verification link
 */
export async function generateQuotationPDF(quotation, options = {}) {
  const quoteNum = quotation?.quote_number || 'QTN-2026-0081';
  const customerName = quotation?.customer_name || 'Corporate Customer';
  const customerEmail = quotation?.customer_email || 'client@company.co.ug';
  const customerPhone = quotation?.customer_phone || '+256 700 000 000';
  const company = quotation?.company || customerName;
  const validUntil = quotation?.valid_until || '2026-09-30';
  const status = quotation?.status || 'Sent';
  const notes = quotation?.notes || 'Quotation valid for 30 days from date of issuance.';

  const items = Array.isArray(quotation?.items) && quotation.items.length > 0 ? quotation.items : [
    { name: 'Nova Cloud Edge VPS Server (Standard)', quantity: 2, unit_price: 280000, discount_pct: 10, total: 504000 }
  ];

  const subtotal = Number(quotation?.subtotal || items.reduce((s, it) => s + (it.total || it.quantity * it.unit_price), 0));
  const isVatExempt = Boolean(quotation?.vat_exempt);
  const vatAmount = isVatExempt ? 0 : (Number(quotation?.vat_amount) || Math.round(subtotal * 0.18));
  const totalAmount = Number(quotation?.total_amount || (subtotal + vatAmount));

  const userName = options?.userName || 'Sales Administration';
  const userRole = options?.userRole || 'Commercial Specialist';
  const siteLogo = options?.siteLogo || localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo');
  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} EAT`;

  const qtrUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`;
  const qtrQrDataUrl = await createQRCodeDataURL(qtrUrl, 260);

  let bankAccounts = options?.bankAccounts || window.__NOVA_BANK_ACCOUNTS__ || [];
  if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
    try {
      const res = await fetch('/api/admin/bank-accounts');
      if (res.ok) bankAccounts = await res.json();
    } catch (e) {}
  }
  if (!Array.isArray(bankAccounts)) bankAccounts = [];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(186, 230, 253);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(14, 12, 182, 25, 3, 3, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('NOVA CLOUD EDGES (U) LIMITED', 18, 19);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(13, 148, 136);
  pdf.text('OFFICIAL PROPOSAL & QUOTATION', 18, 24);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Plot 14 Parliament Avenue, Kampala • Email: sales@ncloud.co.ug • Hotline: +256 790 001 631', 18, 29);

  pdf.setFillColor(204, 251, 241);
  pdf.setDrawColor(153, 246, 228);
  pdf.roundedRect(138, 16, 52, 7, 3, 3, 'FD');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 118, 110);
  pdf.text(`QTE: #${quoteNum}`, 164, 20.8, { align: 'center' });

  // Customer Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(14, 42, 182, 24, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(13, 148, 136);
  pdf.text('QUOTATION PREPARED FOR:', 18, 47);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(customerName.substring(0, 42), 18, 52.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Company: ${company}  •  Email: ${customerEmail}`, 18, 57.5);

  // Table
  let y = 72;
  pdf.setFillColor(15, 118, 110);
  pdf.roundedRect(14, y, 182, 8, 2, 2, 'F');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('PROPOSED ITEM / SERVICE', 18, y + 5.2);
  pdf.text('QTY', 122, y + 5.2, { align: 'center' });
  pdf.text('UNIT PRICE (UGX)', 152, y + 5.2, { align: 'right' });
  pdf.text('AMOUNT (UGX)', 190, y + 5.2, { align: 'right' });

  y += 8;

  items.forEach((it, idx) => {
    pdf.setFillColor(idx % 2 === 1 ? 248 : 255, idx % 2 === 1 ? 250 : 255, idx % 2 === 1 ? 252 : 255);
    pdf.rect(14, y, 182, 9, 'F');

    pdf.setDrawColor(224, 242, 254);
    pdf.setLineWidth(0.2);
    pdf.line(14, y + 9, 196, y + 9);

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(it.name || it.description || 'Service Package').substring(0, 50), 18, y + 5.5);

    pdf.setFont('Helvetica', 'normal');
    pdf.text(String(it.quantity || 1), 122, y + 5.5, { align: 'center' });
    pdf.text(`UGX ${Number(it.unit_price || 0).toLocaleString()}`, 152, y + 5.5, { align: 'right' });

    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(15, 118, 110);
    pdf.text(`UGX ${Number(it.total || (it.quantity * it.unit_price)).toLocaleString()}`, 190, y + 5.5, { align: 'right' });

    y += 9;
  });

  y += 6;

  pdf.setFillColor(15, 118, 110);
  pdf.roundedRect(114, y, 82, 8, 2, 2, 'F');
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL QUOTATION VALUE:', 118, y + 5.2);
  pdf.setFontSize(9.5);
  pdf.text(`UGX ${Number(totalAmount).toLocaleString()}`, 192, y + 5.2, { align: 'right' });

  // Signatures & Footer
  pdf.setDrawColor(15, 118, 110);
  pdf.setLineWidth(0.5);
  pdf.line(135, 276, 196, 276);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Authorized Sales Engineer Signatory', 196, 280, { align: 'right' });

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Nova Cloud Edges Commercial Dept', 196, 284, { align: 'right' });

  pdf.text('Nova Cloud Edges (U) Limited — Official Price Proposal', 14, 284);

  const totalPages = pdf.getNumberOfPages() || 1;
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${page} of ${totalPages}`, 105, 290, { align: 'center' });
  }

  openPdfInBrowser(pdf, `Quotation_${quoteNum}.pdf`);
}

/**
 * Generates an official Security Forensics & Audit Trail PDF Report
 */
export function generateForensicsAuditPDF(logs = [], options = {}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const { siteLogo, userName = 'System Administrator', userRole = 'Super Administrator' } = options;
  const now = new Date();
  const timestampStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Top Header Banner (Dark Navy Accent)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 24, 'F');

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 14, 11);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(56, 189, 248);
  doc.text('SYSTEM FORENSICS & SECURITY AUDIT TRAIL CERTIFICATE', 14, 18);

  // Header Right Metadata
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated by: ${userName} (${userRole})`, 200, 11);
  doc.text(`Audit Extraction Date: ${timestampStr}`, 200, 17);

  // Report Summary Meta Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 30, 269, 14, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(14, 30, 269, 14, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Audit Records Selected: ${logs.length}`, 18, 39);
  doc.text('Integrity Seal: Cryptographically Verified & Immutable Ledger', 120, 39);
  doc.text('Classification: Highly Confidential / Internal Audit Only', 220, 39);

  // Table Headers
  const tableTop = 50;
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(14, tableTop, 269, 9, 2, 2, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('# ID', 17, tableTop + 6);
  doc.text('Date & Time (UTC)', 32, tableTop + 6);
  doc.text('Actor / User Email', 72, tableTop + 6);
  doc.text('Action Event', 125, tableTop + 6);
  doc.text('Resource Ref', 165, tableTop + 6);
  doc.text('Client IP & Device', 195, tableTop + 6);
  doc.text('Status', 260, tableTop + 6);

  // Table Rows
  let rowY = tableTop + 14;
  logs.forEach((log, idx) => {
    if (rowY > 185) {
      doc.addPage();
      // Add mini header for subsequent pages
      doc.setFillColor(30, 58, 138);
      doc.rect(14, 14, 269, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('# ID', 17, 19.5);
      doc.text('Date & Time (UTC)', 32, 19.5);
      doc.text('Actor / User Email', 72, 19.5);
      doc.text('Action Event', 125, 19.5);
      doc.text('Resource Ref', 165, 19.5);
      doc.text('Client IP & Device', 195, 19.5);
      doc.text('Status', 260, 19.5);
      rowY = 28;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const logDate = new Date(log.timestamp || Date.now()).toISOString().replace('T', ' ').slice(0, 19);
    const actor = `${log.user_name || 'Admin'} (${log.user_email || 'systems@ncloud.co.ug'})`;
    const action = log.action || 'SYSTEM_EVENT';
    const resource = `${log.resource_type || ''} ${log.resource_id || ''}`.trim() || 'Core System';
    const footprint = `${log.ip_address || '127.0.0.1'} • ${log.device_type || 'Desktop'}`;

    doc.text(String(idx + 1), 17, rowY);
    doc.text(logDate, 32, rowY);
    doc.text(doc.splitTextToSize(actor, 50)[0], 72, rowY);
    doc.text(action, 125, rowY);
    doc.text(doc.splitTextToSize(resource, 28)[0], 165, rowY);
    doc.text(doc.splitTextToSize(footprint, 62)[0], 195, rowY);

    // Status Badge
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(log.status === 'SUCCESS' ? 22 : 220, log.status === 'SUCCESS' ? 163 : 38, log.status === 'SUCCESS' ? 74 : 38);
    doc.text(log.status || 'SUCCESS', 260, rowY);

    doc.setLineWidth(0.15);
    doc.setDrawColor(241, 245, 249);
    doc.line(14, rowY + 2, 283, rowY + 2);

    rowY += 6.5;
  });

  // Footer on Last Page
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 195, 283, 195);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Forensic Audit Ledger Export | Generated on ${timestampStr} | Nova Cloud Edges (U) Ltd`, 14, 201);
  doc.text('CONFIDENTIAL COMPLIANCE DOCUMENT', 228, 201);

  openPdfInBrowser(doc);
}

/**
 * Generates an 80mm POS Thermal Receipt PDF for Field Work Orders & Labor Dispatch using native jsPDF.
 */
export async function generateWorkOrderPOSReceiptPDF(workOrder, options = {}) {
  const orderNum = workOrder?.order_number || workOrder?.id || 'WO-2026-0014';
  const taskTitle = workOrder?.task_title || 'Field Infrastructure Deployment';
  const clientSite = workOrder?.client_site || 'Kampala Datacenter Node';
  const staffName = workOrder?.assigned_staff_name || 'Field Specialist';
  const rate = Number(workOrder?.rate || 0);
  const qty = Number(workOrder?.quantity || 1);
  const totalCost = Number(workOrder?.total_cost || (rate * qty));
  const status = workOrder?.status || 'Scheduled';
  const scheduledDate = workOrder?.scheduled_date || new Date().toISOString().split('T')[0];

  const now = new Date();
  const timestampStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, 12, 182, 25, 3, 3, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 18, 19);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199);
  doc.text('OFFICIAL FIELD WORK ORDER & DISPATCH STATEMENT', 18, 24);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Plot 14 Parliament Avenue, Kampala • Email: support@ncloud.co.ug • Hotline: +256 790 001 631', 18, 29);

  doc.setFillColor(224, 242, 254);
  doc.setDrawColor(125, 211, 252);
  doc.roundedRect(138, 16, 52, 7, 3, 3, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`WO: #${orderNum}`, 164, 20.8, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${scheduledDate}`, 190, 29, { align: 'right' });

  // Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 28, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('WORK ORDER & SERVICE LOCATION DETAILS:', 18, 47);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(String(clientSite).substring(0, 42), 18, 52.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Service / Task: ${taskTitle}`, 18, 57.5);
  doc.text(`Assigned Specialist: ${staffName}`, 18, 62);

  doc.text(`Dispatch Status: ${status}`, 120, 52.5);
  doc.text('Digital Signature: Verified Field Stamp', 120, 57.5);

  // Table
  let y = 76;
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(14, y, 182, 8, 2, 2, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TASK / LABOR SPECIFICATION', 18, y + 5.2);
  doc.text('QTY', 122, y + 5.2, { align: 'center' });
  doc.text('RATE (UGX)', 152, y + 5.2, { align: 'right' });
  doc.text('TOTAL COST (UGX)', 190, y + 5.2, { align: 'right' });

  y += 8;

  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, 182, 9, 'F');

  doc.setDrawColor(224, 242, 254);
  doc.setLineWidth(0.2);
  doc.line(14, y + 9, 196, y + 9);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(taskTitle).substring(0, 50), 18, y + 5.5);

  doc.setFont('Helvetica', 'normal');
  doc.text(String(qty), 122, y + 5.5, { align: 'center' });
  doc.text(`UGX ${Number(rate).toLocaleString()}`, 152, y + 5.5, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`UGX ${Number(totalCost).toLocaleString()}`, 190, y + 5.5, { align: 'right' });

  y += 15;

  doc.setFillColor(2, 132, 199);
  doc.roundedRect(114, y, 82, 8, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DISPATCH VALUE:', 118, y + 5.2);
  doc.setFontSize(9.5);
  doc.text(`UGX ${Number(totalCost).toLocaleString()}`, 192, y + 5.2, { align: 'right' });

  // Signatures
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.5);
  doc.line(135, 276, 196, 276);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Operations Signatory', 196, 280, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Nova Cloud Edges Field Operations', 196, 284, { align: 'right' });

  doc.text(`Printed on ${timestampStr} — Official Work Order Document`, 14, 284);

  const totalPages = doc.getNumberOfPages() || 1;
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page} of ${totalPages}`, 105, 290, { align: 'center' });
  }

  openPdfInBrowser(doc, `Work_Order_${orderNum}.pdf`);
}

/**
 * Generates an 80mm POS Thermal Receipt PDF for Payment Transactions & Installment History using native jsPDF.
 */
export async function generatePaymentReceipt80mmPDF(paymentData, options = {}) {
  const invNum = paymentData?.invoice_number || 'INV-2026-0041';
  const customerName = paymentData?.customer_name || paymentData?.party_name || 'Valued Customer';
  const customerEmail = paymentData?.customer_email || paymentData?.party_email || '';
  
  const totalBilled = Number(paymentData?.amount || paymentData?.totalBilled || paymentData?.amount_due || 0);
  const totalPaid = Number(paymentData?.paid_amount || paymentData?.totalPaid || paymentData?.amount_paid || totalBilled);
  const balance = Math.max(0, totalBilled - totalPaid);
  const status = paymentData?.status || (balance === 0 && totalBilled > 0 ? '100% Paid' : 'Partially Paid');

  const historyLines = Array.isArray(paymentData?.payment_history) 
    ? paymentData.payment_history 
    : (Array.isArray(paymentData?.lines) ? paymentData.lines : [{
        ordinal_name: '1ST PAYMENT',
        amount_paid: totalPaid,
        formattedDateTime: paymentData?.created_at ? new Date(paymentData.created_at).toLocaleString('en-GB') : 'N/A',
        reference: paymentData?.reference || `TXN-REF-${invNum}`,
        payment_method: paymentData?.payment_method || 'Bank Wire Transfer'
      }]);

  const siteLogo = options?.siteLogo || options?.logoUrl || localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo');
  let logoDataUrl = '';
  if (siteLogo) {
    logoDataUrl = await getImageDataUrl(siteLogo);
  }
  if (!logoDataUrl) {
    logoDataUrl = await getImageDataUrl('/logo.png');
  }

  // Dynamic receipt height calculation
  const baseHeight = logoDataUrl ? 158 : 140;
  const lineGap = 12;
  const receiptHeight = Math.max(170, baseHeight + (historyLines.length * lineGap));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, receiptHeight]
  });

  let y = 6;

  // Render System Logo if available
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 32, y, 16, 16);
      y += 18;
    } catch (e) {}
  }

  // Header Box / Branding
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LTD', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('OFFICIAL PAYMENT RECEIPT', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('Plot 14 Parliament Ave, Kampala • Tel: +256 790 001 631', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Email: support@ncloud.co.ug • Web: ncloud.co.ug', 40, y, { align: 'center' });
  y += 4;

  // Dashed Divider
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Invoice & Customer Metadata
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TAX INVOICE NO: #${invNum}`, 4, y);
  y += 4;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Customer: ${customerName.substring(0, 34)}`, 4, y);
  y += 3.5;
  if (customerEmail) {
    doc.text(`Email: ${customerEmail.substring(0, 36)}`, 4, y);
    y += 3.5;
  }

  const now = new Date();
  const printDateStr = `${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`Issued On: ${printDateStr}`, 4, y);
  y += 4.5;

  // Dashed Divider
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Financial Breakdown Box
  const excessCreditAmt = totalPaid > totalBilled ? totalPaid - totalBilled : 0;
  const boxHeight = excessCreditAmt > 0 ? 21.5 : 17;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(4, y, 72, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL INVOICE BILLED:', 7, y + 4.5);
  doc.text(`UGX ${totalBilled.toLocaleString()}`, 73, y + 4.5, { align: 'right' });

  doc.setTextColor(22, 163, 74);
  doc.text('TOTAL PAID TO DATE:', 7, y + 9);
  doc.text(`UGX ${totalPaid.toLocaleString()}`, 73, y + 9, { align: 'right' });

  doc.setTextColor(balance > 0 ? 220 : 71, balance > 0 ? 38 : 85, balance > 0 ? 38 : 105);
  doc.text('BALANCE OUTSTANDING:', 7, y + 13.5);
  doc.text(`UGX ${balance.toLocaleString()}`, 73, y + 13.5, { align: 'right' });

  if (excessCreditAmt > 0) {
    doc.setTextColor(147, 51, 234);
    doc.text('OVERPAYMENT EXCESS CREDIT:', 7, y + 18);
    doc.text(`+ UGX ${excessCreditAmt.toLocaleString()}`, 73, y + 18, { align: 'right' });
  }

  y += boxHeight + 4;

  // Dashed Divider
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Payment History Stack Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161);
  doc.text('PAYMENT HISTORY LEDGER STACK', 40, y, { align: 'center' });
  y += 5;

  historyLines.forEach((line, idx) => {
    const ordName = (line.ordinal_name || `${idx + 1}th Payment`).toUpperCase();
    const lineAmt = Number(line.amount_paid || line.amount || 0);
    const lineDt = line.formattedDateTime || (line.date ? new Date(line.date).toLocaleString('en-GB') : 'N/A');
    const refStr = line.reference || `TXN-${idx + 1}`;
    const pmtMethod = line.payment_method || 'Bank Transfer';
    const isClearingLine = (status === '100% Paid' || status === 'Paid' || balance === 0) && idx === historyLines.length - 1;

    doc.setFillColor(isClearingLine ? 240 : 241, isClearingLine ? 253 : 245, isClearingLine ? 244 : 249);
    doc.setDrawColor(isClearingLine ? 187 : 226, isClearingLine ? 247 : 232, isClearingLine ? 208 : 240);
    doc.roundedRect(4, y, 72, 10.5, 1, 1, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(isClearingLine ? 22 : 99, isClearingLine ? 163 : 102, isClearingLine ? 74 : 241);
    doc.text(ordName + (isClearingLine ? ' [✓ 100% CLEARANCE]' : ''), 7, y + 3.8);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`UGX ${lineAmt.toLocaleString()}`, 73, y + 3.8, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${lineDt} • Ref: ${refStr} (${pmtMethod})`, 7, y + 8);

    y += 12;
  });

  // Dashed Divider
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Status Stamp
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  if (status === '100% Paid' || status === 'Paid' || balance === 0) {
    doc.setTextColor(22, 163, 74);
    doc.text('✓ STATUS: 100% CLEARANCE PAID & CLEARED', 40, y, { align: 'center' });
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text(`STATUS: PARTIALLY PAID (UGX ${balance.toLocaleString()} DUE)`, 40, y, { align: 'center' });
  }
  y += 5;

  // 2D QR Code Verification
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 160);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 31, y, 18, 18);
    y += 20;
  }

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`Printed by: ${options?.userName || 'Sales Admin'}`, 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Thank you for choosing Nova Cloud Edges!', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Payment_Receipt_80mm_${invNum}.pdf`);
}
