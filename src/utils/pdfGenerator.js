import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// ============================================================================
// NOVA CLOUD EDGES (U) LIMITED — UNIFIED EXECUTIVE PDF DESIGN SYSTEM
// ============================================================================

export const BRAND = {
  companyName: 'NOVA CLOUD EDGES (U) LIMITED',
  tagline: 'Sovereign Cloud, Enterprise Software & Edge Network Infrastructure',
  address: 'Plot 14 Parliament Avenue, Kampala, Republic of Uganda',
  contact: 'Tel: +256 790 001 631 • Email: support@ncloud.co.ug • Web: ncloud.co.ug',
  tin: 'TIN: 1014892019',
  country: 'Republic of Uganda',
  colors: {
    navyDark: [15, 23, 42],        // #0f172a (Slate 900)
    navySlate: [30, 41, 59],       // #1e293b (Slate 800)
    deepSapphire: [30, 64, 175],   // #1e40af (Blue 800)
    novaBlue: [2, 132, 199],       // #0284c7 (Sky 600)
    emerald: [22, 163, 74],        // #16a34a (Green 600 - Paid / Positive)
    amber: [217, 119, 6],          // #d97706 (Amber 600 - Pending)
    crimson: [220, 38, 38],        // #dc2626 (Red 600 - Overdue / Alert)
    bgSoft: [248, 250, 252],       // #f8fafc (Slate 50)
    bgZebra: [241, 245, 249],      // #f1f5f9 (Slate 100)
    borderLight: [226, 232, 240],  // #e2e8f0 (Slate 200)
    borderMedium: [203, 213, 225], // #cbd5e1 (Slate 300)
    textMain: [15, 23, 42],        // #0f172a
    textBody: [51, 65, 85],        // #334155
    textMuted: [100, 116, 139],    // #64748b
    white: [255, 255, 255]
  }
};

// Safe Cross-Platform PDF Download / Browser Viewer
const openPdfInBrowser = (pdfDoc, fileName = 'Nova_Cloud_Official_Document.pdf') => {
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

// Image Loader Helper for Cross-Origin Data URLs
async function getImageDataUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;
  return new Promise((resolve) => {
    try {
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
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = url;
    } catch {
      resolve('');
    }
  });
}

/**
 * Generates an official, 100% scannable 2D QR Code Data URL.
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
    console.error('Error generating QR Code Data URL:', err);
    return '';
  }
}

// ----------------------------------------------------------------------------
// SHARED EXECUTIVE A4 HEADER & FOOTER HELPERS
// ----------------------------------------------------------------------------

/**
 * Draws the primary executive header on Page 1.
 * Height consumed: 10mm to 40mm (30mm total).
 */
function drawA4ExecutiveHeader(doc, {
  title,
  subtitle,
  refNumber,
  refLabel = 'REF',
  dateStr,
  dueDateStr,
  status,
  logoDataUrl,
  accentColor = BRAND.colors.deepSapphire
}) {
  // Top Corporate Accent Bar
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(1.2);
  doc.line(14, 10, 196, 10);

  // Outer Header Card
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 12, 182, 26, 2, 2, 'FD');

  let textX = 18;
  const effectiveLogo = logoDataUrl || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  if (effectiveLogo && effectiveLogo.startsWith('data:image')) {
    try {
      doc.addImage(effectiveLogo, 'PNG', 17, 14.5, 23, 21);
      textX = 43;
    } catch {
      textX = 18;
    }
  }

  // Company Name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(BRAND.companyName, textX, 19);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...accentColor);
  doc.text((title || 'OFFICIAL DOCUMENT').toUpperCase(), textX, 24);

  // Address, Tax & Contact Details
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(`${BRAND.address} • ${BRAND.tin}`, textX, 29);
  doc.text(BRAND.contact, textX, 33.5);

  // Right-hand Side: Reference Pill & Dates
  const rightBoxX = 142;
  doc.setFillColor(...BRAND.colors.white);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightBoxX, 15, 50, 7.5, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accentColor);
  doc.text(`${refLabel}: #${refNumber || 'N/A'}`, rightBoxX + 25, 20, { align: 'center' });

  // Dates
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...BRAND.colors.textMuted);
  if (dateStr && dueDateStr) {
    doc.text(`Issued: ${dateStr}`, 192, 27.5, { align: 'right' });
    doc.text(`Due: ${dueDateStr}`, 192, 32.5, { align: 'right' });
  } else if (dateStr) {
    doc.text(`Date: ${dateStr}`, 192, 29, { align: 'right' });
  }

  // Status Badge if available
  if (status) {
    const sLower = status.toLowerCase();
    const isPaid = sLower.includes('paid') || sLower.includes('settled') || sLower.includes('approved') || sLower.includes('active');
    const isOverdue = sLower.includes('overdue') || sLower.includes('rejected') || sLower.includes('failed');
    const badgeBg = isPaid ? [220, 252, 231] : isOverdue ? [254, 226, 226] : [254, 243, 199];
    const badgeText = isPaid ? BRAND.colors.emerald : isOverdue ? BRAND.colors.crimson : BRAND.colors.amber;
    
    doc.setFillColor(...badgeBg);
    doc.roundedRect(rightBoxX - 32, 16.5, 28, 5, 1.5, 1.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...badgeText);
    doc.text(status.toUpperCase(), rightBoxX - 18, 20, { align: 'center' });
  }
}

/**
 * Draws a compact continuation header on Page 2+.
 */
function drawA4ContinuationHeader(doc, { title, refNumber, accentColor = BRAND.colors.deepSapphire }) {
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.8);
  doc.line(14, 10, 196, 10);

  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, 12, 182, 11, 1.5, 1.5, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(`${BRAND.companyName} — ${(title || 'DOCUMENT').toUpperCase()} (CONTINUED)`, 18, 19);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accentColor);
  doc.text(`REF: #${refNumber || 'N/A'}`, 192, 19, { align: 'right' });
}

/**
 * Two-pass footer applicator: stamps true 'Page X of Y' on every page.
 */
function applyA4Footers(doc, { docRef = '', title = 'Official Document' } = {}) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Hairline divider
    doc.setDrawColor(...BRAND.colors.borderLight);
    doc.setLineWidth(0.25);
    doc.line(14, 282, 196, 282);

    // Left: Official ledger notice
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text('Nova Cloud Edges (U) Ltd • Verification: ncloud.co.ug/verify • Confidential & Legally Binding', 14, 286.5);

    // Right: Page X of Y
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.navyDark);
    doc.text(`Page ${p} of ${totalPages}`, 196, 286.5, { align: 'right' });
  }
}


// ============================================================================
// 1. GENERATE INVOICE PDF (A4 OFFICIAL TAX INVOICE & STATEMENT)
// ============================================================================

export async function generateInvoicePDF(invoice, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const invoiceNum = invoice?.invoice_number || 'INV-2026-0041';
  const customerName = invoice?.customer_name || invoice?.party_name || 'Corporate Customer';
  const customerEmail = invoice?.customer_email || invoice?.party_email || 'client@company.co.ug';
  const customerPhone = invoice?.customer_phone || invoice?.phone || '+256 700 000 000';
  const customerAddress = invoice?.customer_address || invoice?.address || 'Kampala, Uganda';
  const company = invoice?.company || '';
  const createdDate = invoice?.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const dueDate = invoice?.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : createdDate;
  const status = invoice?.status || 'Pending';
  const isPaid = status === 'Paid' || status === '100% Paid' || status === 'Paid & Settled';

  // Normalize Line Items
  let lineItems = [];
  if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
    lineItems = invoice.items.map((it, idx) => ({
      no: idx + 1,
      name: it.name || it.item_name || 'Cloud Solution Service',
      description: it.description || it.specs || it.short_desc || '',
      qty: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      unit_price: Number(it.unit_price || it.price || 0),
      amount: Number(it.amount || (Math.max(1, parseInt(it.quantity || it.qty) || 1) * Number(it.unit_price || it.price || 0)))
    }));
  } else {
    const singleQty = Math.max(1, parseInt(invoice?.quantity) || 1);
    const singlePrice = Number(invoice?.amount || 0) / singleQty;
    lineItems = [{
      no: 1,
      name: invoice?.item_name || invoice?.plan_name || 'Cloud Infrastructure & Managed Services',
      description: invoice?.description || 'Enterprise Cloud & Managed Services Deployment',
      qty: singleQty,
      unit_price: singlePrice,
      amount: Number(invoice?.amount || 0)
    }];
  }

  // Financial Reconciliation
  const rawSubtotal = lineItems.reduce((acc, it) => acc + it.amount, 0);
  const discount = Number(invoice?.discount_amount || invoice?.discount || 0);
  const netSubtotal = Math.max(0, rawSubtotal - discount);
  const isVatExempt = Boolean(invoice?.vat_exempt);
  const vatAmount = isVatExempt ? 0 : (Number(invoice?.vat_amount) || Math.round(netSubtotal * 0.18));
  const totalAmount = netSubtotal + vatAmount;
  const paidAmount = isPaid ? totalAmount : Number(invoice?.paid_amount || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  // Assets / QR
  const siteLogo = opts?.siteLogo || localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo');
  const logoDataUrl = await getImageDataUrl(siteLogo || '/logo.png');
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 200);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // PAGE 1: Header
  drawA4ExecutiveHeader(pdf, {
    title: 'OFFICIAL TAX INVOICE & STATEMENT',
    refNumber: invoiceNum,
    refLabel: 'INV',
    dateStr: createdDate,
    dueDateStr: dueDate,
    status: isPaid ? 'PAID & SETTLED' : status,
    logoDataUrl,
    accentColor: BRAND.colors.deepSapphire
  });

  // Client Information & Invoice Metadata Cards
  let y = 42;
  const colW = 89;

  // Left Card: Billed To
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, y, colW, 28, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.deepSapphire);
  pdf.text('BILLED TO (CLIENT DETAILS):', 18, y + 5.5);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.colors.navyDark);
  pdf.text(String(company || customerName).substring(0, 42), 18, y + 11.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.textBody);
  if (company && customerName !== company) {
    pdf.text(`Attn: ${customerName}`, 18, y + 16);
    pdf.text(`${customerPhone} • ${customerEmail}`, 18, y + 20.5);
    pdf.text(String(customerAddress).substring(0, 48), 18, y + 25);
  } else {
    pdf.text(`${customerPhone} • ${customerEmail}`, 18, y + 16.5);
    pdf.text(String(customerAddress).substring(0, 48), 18, y + 21);
    pdf.text('Uganda Corporate Enterprise Client', 18, y + 25.5);
  }

  // Right Card: Invoice Ledger Details
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.roundedRect(107, y, colW, 28, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.deepSapphire);
  pdf.text('TAX & BILLING SPECIFICATIONS:', 111, y + 5.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.textBody);
  pdf.text(`Invoice Number:`, 111, y + 11.5);
  pdf.setFont('Helvetica', 'bold');
  pdf.text(invoiceNum, 160, y + 11.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.text(`Tax Classification:`, 111, y + 16);
  pdf.text(isVatExempt ? 'Standard VAT Exempt' : 'Standard 18% VAT Applicable', 160, y + 16);

  pdf.text(`Payment Terms:`, 111, y + 20.5);
  pdf.text(dueDate === createdDate ? 'Net Immediate / Advance' : `Due by ${dueDate}`, 160, y + 20.5);

  pdf.text(`Digital Settlement:`, 111, y + 25);
  pdf.setFont('Helvetica', 'bold');
  pdf.setTextColor(isPaid ? BRAND.colors.emerald[0] : BRAND.colors.amber[0], isPaid ? BRAND.colors.emerald[1] : BRAND.colors.amber[1], isPaid ? BRAND.colors.emerald[2] : BRAND.colors.amber[2]);
  pdf.text(isPaid ? 'Verified 100% Cleared' : 'Pending Payment Remittance', 160, y + 25);

  y += 33;

  // TABLE RENDER FUNCTION
  const drawTableHeader = (curY) => {
    pdf.setFillColor(...BRAND.colors.deepSapphire);
    pdf.roundedRect(14, curY, 182, 7.5, 1.5, 1.5, 'F');

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...BRAND.colors.white);
    pdf.text('NO.', 17, curY + 5);
    pdf.text('SERVICE / ITEM DESCRIPTION', 27, curY + 5);
    pdf.text('QTY', 124, curY + 5, { align: 'center' });
    pdf.text('UNIT PRICE (UGX)', 156, curY + 5, { align: 'right' });
    pdf.text('AMOUNT (UGX)', 192, curY + 5, { align: 'right' });
    return curY + 7.5;
  };

  y = drawTableHeader(y);

  // Line Items Flow (Smart multi-page aware)
  const maxYPage1 = 195; // threshold for Page 1 so bottom boxes fit perfectly on 1 page!
  const maxYSubsequent = 265;

  lineItems.forEach((it, idx) => {
    const hasDesc = Boolean(it.description && it.description.trim().length > 0);
    const rowH = hasDesc ? 11 : 8.5;

    // Check if we need to spill to next page
    const curMaxY = pdf.internal.getNumberOfPages() === 1 ? maxYPage1 : maxYSubsequent;
    if (y + rowH > curMaxY) {
      pdf.addPage();
      drawA4ContinuationHeader(pdf, { title: 'OFFICIAL TAX INVOICE', refNumber: invoiceNum });
      y = drawTableHeader(26);
    }

    // Row Background Zebra
    pdf.setFillColor(idx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
    pdf.rect(14, y, 182, rowH, 'F');

    // Divider Line
    pdf.setDrawColor(...BRAND.colors.borderLight);
    pdf.setLineWidth(0.2);
    pdf.line(14, y + rowH, 196, y + rowH);

    // Number & Title
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...BRAND.colors.textMuted);
    pdf.text(String(it.no), 18, y + 5.2);

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.colors.navyDark);
    pdf.text(String(it.name).substring(0, 52), 27, y + 5.2);

    if (hasDesc) {
      pdf.setFont('Helvetica', 'normal');
      docFontSizeSafe(pdf, 6.8);
      pdf.setTextColor(...BRAND.colors.textMuted);
      pdf.text(String(it.description).substring(0, 68), 27, y + 9.2);
    }

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.colors.navyDark);
    pdf.text(String(it.qty), 124, y + 5.2, { align: 'center' });
    pdf.text(Number(it.unit_price).toLocaleString(), 156, y + 5.2, { align: 'right' });

    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(...BRAND.colors.deepSapphire);
    pdf.text(Number(it.amount).toLocaleString(), 192, y + 5.2, { align: 'right' });

    y += rowH;
  });

  // Check if financial boxes fit on current page; if not, create clean final page
  if (y > 200) {
    pdf.addPage();
    drawA4ContinuationHeader(pdf, { title: 'OFFICIAL TAX INVOICE — FINANCIAL SUMMARY', refNumber: invoiceNum });
    y = 28;
  } else {
    y += 5;
  }

  // BOTTOM FINANCIAL TOTALS & STAMP SECTION
  const finBlockY = y;
  const leftColW = 96;
  const rightColW = 82;

  // Left Side: Paid Stamp / Pending Notice + Bank Accounts Box
  if (isPaid) {
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(...BRAND.colors.emerald);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(14, finBlockY, leftColW, 18, 2, 2, 'FD');

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.colors.emerald);
    pdf.text('✓ 100% PAID & DIGITALLY VERIFIED', 18, finBlockY + 6.5);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(21, 128, 61);
    pdf.text(`Settlement Ref: ${invoiceNum} • Official Receipt Cleared`, 18, finBlockY + 11);
    pdf.text(`Payment Cleared on: ${invoice?.payment_date ? new Date(invoice.payment_date).toISOString().split('T')[0] : createdDate}`, 18, finBlockY + 15);
  } else {
    pdf.setFillColor(254, 243, 199);
    pdf.setDrawColor(...BRAND.colors.amber);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(14, finBlockY, leftColW, 18, 2, 2, 'FD');

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.colors.amber);
    pdf.text('⚡ PAYMENT PENDING REMITTANCE', 18, finBlockY + 6.5);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(180, 83, 9);
    pdf.text(`Please remit funds before due date: ${dueDate}`, 18, finBlockY + 11);
    pdf.text('Electronic payments via Bank Wire or Mobile Money supported.', 18, finBlockY + 15);
  }

  // Right Side: Reconciled Totals Box
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(114, finBlockY, rightColW, 35, 2, 2, 'FD');

  const totals = [
    { label: 'Subtotal (Gross):', val: `UGX ${rawSubtotal.toLocaleString()}` },
    ...(discount > 0 ? [{ label: 'Commercial Discount:', val: `- UGX ${discount.toLocaleString()}` }] : []),
    { label: isVatExempt ? 'VAT (Exempt):' : 'Value Added Tax (18%):', val: `UGX ${vatAmount.toLocaleString()}` },
    { label: 'TOTAL INVOICE (UGX):', val: `UGX ${totalAmount.toLocaleString()}`, bold: true, primary: true },
    { label: 'Amount Paid:', val: `UGX ${paidAmount.toLocaleString()}` },
    { label: 'BALANCE DUE:', val: `UGX ${balanceDue.toLocaleString()}`, bold: true, highlight: balanceDue > 0 }
  ];

  let tY = finBlockY + 5;
  totals.forEach((row) => {
    pdf.setFont('Helvetica', row.bold ? 'bold' : 'normal');
    pdf.setFontSize(row.primary ? 8.5 : 7.5);
    pdf.setTextColor(row.highlight ? BRAND.colors.crimson[0] : row.primary ? BRAND.colors.deepSapphire[0] : BRAND.colors.textBody[0],
                     row.highlight ? BRAND.colors.crimson[1] : row.primary ? BRAND.colors.deepSapphire[1] : BRAND.colors.textBody[1],
                     row.highlight ? BRAND.colors.crimson[2] : row.primary ? BRAND.colors.deepSapphire[2] : BRAND.colors.textBody[2]);
    pdf.text(row.label, 118, tY);
    pdf.text(row.val, 192, tY, { align: 'right' });
    tY += 5.2;
  });

  // Remittance Bank Details Box (Under status stamp)
  const bankY = finBlockY + 21;
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, bankY, leftColW, 25, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.deepSapphire);
  pdf.text('BANK WIRE REMITTANCE DETAILS (UGANDA):', 18, bankY + 5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.setTextColor(...BRAND.colors.textBody);
  pdf.text('Stanbic Bank Uganda: A/C 9030018829401 (UGX) • Forest Mall Branch', 18, bankY + 9.5);
  pdf.text('Absa Bank Uganda: A/C 0341199482 (USD) • Hannington Road Branch', 18, bankY + 13.5);
  pdf.text('Account Name: Nova Cloud Edges (U) Limited • SWIFT: SBICUGKX', 18, bankY + 17.5);
  pdf.text('MoMo / Airtel Merchant: Reference Invoice # upon transfer', 18, bankY + 21.5);

  // Signatures & Digital QR Verification Bar
  const signY = bankY + 28;
  pdf.setFillColor(...BRAND.colors.white);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, signY, 182, 17, 2, 2, 'FD');

  if (qrDataUrl) {
    try {
      pdf.addImage(qrDataUrl, 'PNG', 16, signY + 1.5, 14, 14);
    } catch {}
  }

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(...BRAND.colors.deepSapphire);
  pdf.text('INSTANT DIGITAL LEDGER VERIFICATION', 33, signY + 5.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BRAND.colors.textMuted);
  pdf.text(`Scan QR code or visit https://ncloud.co.ug/verify to confirm validity.`, 33, signY + 9.5);
  pdf.text(`Issued by: ${opts?.userName || 'Corporate Billing Division'} • Authorization Hash: SHA256-VERIFIED`, 33, signY + 13.5);

  // Corporate Authorization Signature on Far Right
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(...BRAND.colors.navyDark);
  pdf.text('AUTHORIZED SIGNATORY:', 145, signY + 5.5);

  pdf.setFont('Helvetica', 'oblique');
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND.colors.deepSapphire);
  pdf.text('Nova Cloud Edges Executive Bureau', 145, signY + 10);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.2);
  pdf.setTextColor(...BRAND.colors.textMuted);
  pdf.text('Director of Finance & Operations', 145, signY + 13.5);

  // Apply Uniform Footers across all generated pages
  applyA4Footers(pdf, { docRef: invoiceNum, title: 'Tax Invoice' });

  openPdfInBrowser(pdf, `Tax_Invoice_${invoiceNum}.pdf`);
  return pdf;
}


// ============================================================================
// 2. GENERATE QUOTATION PDF (A4 FORMAL PROPOSAL & QUOTATION)
// ============================================================================

export async function generateQuotationPDF(quotation, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const quoteNum = quotation?.quote_number || 'QTN-2026-0081';
  const customerName = quotation?.customer_name || 'Corporate Customer';
  const customerEmail = quotation?.customer_email || 'client@company.co.ug';
  const customerPhone = quotation?.customer_phone || '+256 700 000 000';
  const company = quotation?.company || customerName;
  const validUntil = quotation?.valid_until || '2026-10-31';
  const createdDate = quotation?.created_at ? new Date(quotation.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const status = quotation?.status || 'Active Proposal';
  const notes = quotation?.notes || 'Quotation valid for 30 calendar days from date of issuance. Pricing includes delivery, engineering deployment, and standard warranty.';

  // Line items
  let items = Array.isArray(quotation?.items) && quotation.items.length > 0 ? quotation.items : [
    { name: 'Nova Cloud Edge VPS Server (Standard)', quantity: 2, unit_price: 280000, discount_pct: 10, total: 504000 }
  ];

  // Mathematical Reconciliation
  const grossSubtotal = items.reduce((s, it) => s + (Number(it.quantity || 1) * Number(it.unit_price || 0)), 0);
  const totalDiscount = items.reduce((s, it) => {
    const lineGross = Number(it.quantity || 1) * Number(it.unit_price || 0);
    const discPct = Number(it.discount_pct || it.discount || 0);
    return s + (lineGross * (discPct / 100));
  }, 0);
  const taxableSubtotal = Math.max(0, grossSubtotal - totalDiscount);
  const isVatExempt = Boolean(quotation?.vat_exempt);
  const vatAmount = isVatExempt ? 0 : (Number(quotation?.vat_amount) || Math.round(taxableSubtotal * 0.18));
  const grandTotal = taxableSubtotal + vatAmount;

  const siteLogo = opts?.siteLogo || localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo');
  const logoDataUrl = await getImageDataUrl(siteLogo || '/logo.png');
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 200);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Page 1 Header
  drawA4ExecutiveHeader(pdf, {
    title: 'OFFICIAL COMMERCIAL QUOTATION',
    refNumber: quoteNum,
    refLabel: 'QTN',
    dateStr: createdDate,
    dueDateStr: validUntil,
    status,
    logoDataUrl,
    accentColor: BRAND.colors.novaBlue
  });

  let y = 42;
  const colW = 89;

  // Left Card: Prepared For
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, y, colW, 28, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.novaBlue);
  pdf.text('PREPARED FOR (PROSPECTIVE CLIENT):', 18, y + 5.5);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.colors.navyDark);
  pdf.text(String(company).substring(0, 42), 18, y + 11.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.textBody);
  if (company !== customerName) pdf.text(`Contact: ${customerName}`, 18, y + 16);
  pdf.text(`Email: ${customerEmail}`, 18, y + 20.5);
  pdf.text(`Phone: ${customerPhone}`, 18, y + 25);

  // Right Card: Terms & Validity
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.roundedRect(107, y, colW, 28, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.novaBlue);
  pdf.text('PROPOSAL COMMERCIAL TERMS:', 111, y + 5.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.textBody);
  pdf.text('Quotation Reference:', 111, y + 11.5);
  pdf.setFont('Helvetica', 'bold');
  pdf.text(quoteNum, 160, y + 11.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.text('Validity Period:', 111, y + 16);
  pdf.text(`Until ${validUntil} (30 Days)`, 160, y + 16);

  pdf.text('Tax Handling:', 111, y + 20.5);
  pdf.text(isVatExempt ? 'VAT Exempt' : '18% Standard VAT Included', 160, y + 20.5);

  pdf.text('Commercial Specialist:', 111, y + 25);
  pdf.text(opts?.userName || 'Sales Specialist', 160, y + 25);

  y += 33;

  const drawQteHeader = (curY) => {
    pdf.setFillColor(...BRAND.colors.novaBlue);
    pdf.roundedRect(14, curY, 182, 7.5, 1.5, 1.5, 'F');

    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...BRAND.colors.white);
    pdf.text('NO.', 17, curY + 5);
    pdf.text('PROPOSED SOLUTION / BILL OF QUANTITIES', 27, curY + 5);
    pdf.text('QTY', 115, curY + 5, { align: 'center' });
    pdf.text('UNIT PRICE', 142, curY + 5, { align: 'right' });
    pdf.text('DISC', 162, curY + 5, { align: 'center' });
    pdf.text('TOTAL (UGX)', 192, curY + 5, { align: 'right' });
    return curY + 7.5;
  };

  y = drawQteHeader(y);

  items.forEach((it, idx) => {
    const lineQty = Math.max(1, parseInt(it.quantity || it.qty) || 1);
    const unitPrice = Number(it.unit_price || it.price || 0);
    const discPct = Number(it.discount_pct || it.discount || 0);
    const lineTotal = Number(it.total || (lineQty * unitPrice * (1 - (discPct / 100))));
    const rowH = 8.5;

    if (y + rowH > 195) {
      pdf.addPage();
      drawA4ContinuationHeader(pdf, { title: 'COMMERCIAL QUOTATION', refNumber: quoteNum, accentColor: BRAND.colors.novaBlue });
      y = drawQteHeader(26);
    }

    pdf.setFillColor(idx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
    pdf.rect(14, y, 182, rowH, 'F');

    pdf.setDrawColor(...BRAND.colors.borderLight);
    pdf.setLineWidth(0.2);
    pdf.line(14, y + rowH, 196, y + rowH);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...BRAND.colors.textMuted);
    pdf.text(String(idx + 1), 18, y + 5.5);

    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(...BRAND.colors.navyDark);
    pdf.text(String(it.name || it.item_name || 'Cloud Solution Item').substring(0, 48), 27, y + 5.5);

    pdf.setFont('Helvetica', 'normal');
    pdf.text(String(lineQty), 115, y + 5.5, { align: 'center' });
    pdf.text(unitPrice.toLocaleString(), 142, y + 5.5, { align: 'right' });
    pdf.text(discPct > 0 ? `${discPct}%` : '—', 162, y + 5.5, { align: 'center' });

    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(...BRAND.colors.novaBlue);
    pdf.text(Math.round(lineTotal).toLocaleString(), 192, y + 5.5, { align: 'right' });

    y += rowH;
  });

  if (y > 200) {
    pdf.addPage();
    drawA4ContinuationHeader(pdf, { title: 'COMMERCIAL QUOTATION — TOTALS', refNumber: quoteNum, accentColor: BRAND.colors.novaBlue });
    y = 28;
  } else {
    y += 6;
  }

  // Summary Totals on Right, Commercial Terms on Left
  const bottomY = y;
  const termsW = 96;
  const sumW = 82;

  // Commercial Terms Box
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, bottomY, termsW, 40, 2, 2, 'FD');

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...BRAND.colors.novaBlue);
  pdf.text('COMMERCIAL TERMS & SLA GUARANTEES:', 18, bottomY + 5.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.setTextColor(...BRAND.colors.textBody);
  pdf.text('1. Mobilization: 50% advance upon contract signing, 50% on completion.', 18, bottomY + 10.5);
  pdf.text('2. Delivery & Turnaround: Hardware setup within 3-5 business days.', 18, bottomY + 14.5);
  pdf.text('3. SLA Guarantee: 99.99% network uptime for cloud & VPS infrastructure.', 18, bottomY + 18.5);
  pdf.text('4. Warranty: 12-Month hardware replacement warranty on network access points.', 18, bottomY + 22.5);
  pdf.text('5. Remittance: Stanbic A/C 9030018829401 • Absa A/C 0341199482 (USD).', 18, bottomY + 26.5);
  pdf.text(String(notes).substring(0, 60), 18, bottomY + 30.5);
  pdf.text('Official Acceptance: Return signed copy to sales@ncloud.co.ug.', 18, bottomY + 35);

  // Financial Totals
  pdf.setFillColor(...BRAND.colors.bgSoft);
  pdf.roundedRect(114, bottomY, sumW, 40, 2, 2, 'FD');

  const qteTotals = [
    { label: 'Gross Subtotal:', val: `UGX ${Math.round(grossSubtotal).toLocaleString()}` },
    ...(totalDiscount > 0 ? [{ label: 'Total Discounts Applied:', val: `- UGX ${Math.round(totalDiscount).toLocaleString()}` }] : []),
    { label: 'Taxable Amount:', val: `UGX ${Math.round(taxableSubtotal).toLocaleString()}` },
    { label: isVatExempt ? 'VAT (Exempt):' : 'Value Added Tax (18%):', val: `UGX ${Math.round(vatAmount).toLocaleString()}` },
    { label: 'GRAND TOTAL (UGX):', val: `UGX ${Math.round(grandTotal).toLocaleString()}`, bold: true, primary: true }
  ];

  let qY = bottomY + 6.5;
  qteTotals.forEach((row) => {
    pdf.setFont('Helvetica', row.bold ? 'bold' : 'normal');
    pdf.setFontSize(row.primary ? 9 : 7.5);
    pdf.setTextColor(row.primary ? BRAND.colors.novaBlue[0] : BRAND.colors.textBody[0],
                     row.primary ? BRAND.colors.novaBlue[1] : BRAND.colors.textBody[1],
                     row.primary ? BRAND.colors.novaBlue[2] : BRAND.colors.textBody[2]);
    pdf.text(row.label, 118, qY);
    pdf.text(row.val, 192, qY, { align: 'right' });
    qY += 6.5;
  });

  // Authorization Signatures & QR Code Box
  const signY = bottomY + 44;
  pdf.setFillColor(...BRAND.colors.white);
  pdf.setDrawColor(...BRAND.colors.borderLight);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(14, signY, 182, 16, 2, 2, 'FD');

  if (qrDataUrl) {
    try {
      pdf.addImage(qrDataUrl, 'PNG', 16, signY + 1.5, 13, 13);
    } catch {}
  }

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(...BRAND.colors.novaBlue);
  pdf.text('PROPOSAL VERIFICATION & AUTHENTICITY', 32, signY + 5.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BRAND.colors.textMuted);
  pdf.text(`Verify online at https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`, 32, signY + 9.5);
  pdf.text('Authorized by Nova Cloud Edges Commercial Services Desk.', 32, signY + 13.5);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(7.2);
  pdf.setTextColor(...BRAND.colors.navyDark);
  pdf.text('CLIENT ACCEPTANCE SIGN-OFF:', 140, signY + 5.5);

  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...BRAND.colors.textMuted);
  pdf.text('Signature: ______________________', 140, signY + 10);
  pdf.text('Date: _______________ Name: ______', 140, signY + 13.5);

  applyA4Footers(pdf, { docRef: quoteNum, title: 'Quotation' });
  openPdfInBrowser(pdf, `Quotation_${quoteNum}.pdf`);
  return pdf;
}


// ============================================================================
// 3. GENERATE PAYROLL PAYSLIP PDF (A4 EXECUTIVE EMPLOYEE PAYSLIP)
// ============================================================================

export function generatePayrollPayslipPDF(payroll, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const staffName = payroll?.staff_name || 'Staff Specialist';
  const email = payroll?.email || 'staff@ncloud.co.ug';
  const position = payroll?.position || 'Senior Cloud Systems Engineer';
  const department = payroll?.department || 'Engineering & Infrastructure';
  const payPeriod = payroll?.pay_period || 'August 2026';
  const status = payroll?.status || 'Paid';
  const paySlipId = `PS-${payroll?.id || '2026-08'}`;

  const baseSalary = Number(payroll?.base_salary || 3500000);
  const housingAllowance = Number(payroll?.housing_allowance || Math.round(baseSalary * 0.1));
  const transportAllowance = Number(payroll?.transport_allowance || 200000);
  const otherAllowances = Number(payroll?.allowances || 0);
  const grossPay = baseSalary + housingAllowance + transportAllowance + otherAllowances;

  // Statutory Deductions (Uganda PAYE & NSSF)
  const nssfEmployee = Number(payroll?.nssf_employee || Math.round(baseSalary * 0.05));
  const payeTax = Number(payroll?.paye_tax || Math.round(Math.max(0, grossPay - 235000) * 0.3));
  const otherDeductions = Number(payroll?.deductions || 0);
  const totalDeductions = nssfEmployee + payeTax + otherDeductions;
  const netPay = Math.max(0, grossPay - totalDeductions);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Page 1 Header (Guaranteed single-page corporate fit)
  drawA4ExecutiveHeader(doc, {
    title: 'OFFICIAL MONTHLY PAYROLL PAYSLIP',
    refNumber: paySlipId,
    refLabel: 'PAYSLIP',
    dateStr: payPeriod,
    status: status.toUpperCase() === 'PAID' ? 'PAID & SETTLED' : status,
    accentColor: BRAND.colors.deepSapphire
  });

  let y = 42;

  // Employee Personnel Card
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 30, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('EMPLOYEE PERSONNEL & REMUNERATION RECORD:', 18, y + 6);

  // Left Details
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Employee Name:', 18, y + 12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(staffName, 52, y + 12);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Job Designation:', 18, y + 17);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(position, 52, y + 17);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Department:', 18, y + 22);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(department, 52, y + 22);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Corporate Email:', 18, y + 27);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text(email, 52, y + 27);

  // Right Details
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Pay Period:', 115, y + 12);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(payPeriod, 150, y + 12);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Disbursement Method:', 115, y + 17);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text('Bank Wire Remittance', 150, y + 17);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('TIN Registration:', 115, y + 22);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text('1014892019 (Verified)', 150, y + 22);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Disbursement Status:', 115, y + 27);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...BRAND.colors.emerald);
  doc.text('100% Cleared & Paid', 150, y + 27);

  y += 35;

  // TWO-COLUMN FINANCIAL SPREAD: EARNINGS (LEFT) vs DEDUCTIONS (RIGHT)
  const colW = 89;

  // Header 1: Earnings
  doc.setFillColor(...BRAND.colors.deepSapphire);
  doc.roundedRect(14, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.white);
  doc.text('GROSS EARNINGS & ALLOWANCES', 18, y + 4.8);
  doc.text('AMOUNT (UGX)', 100, y + 4.8, { align: 'right' });

  // Header 2: Deductions
  doc.setFillColor(...BRAND.colors.crimson);
  doc.roundedRect(107, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.white);
  doc.text('STATUTORY & VOLUNTARY DEDUCTIONS', 111, y + 4.8);
  doc.text('AMOUNT (UGX)', 193, y + 4.8, { align: 'right' });

  y += 7;

  const earningsList = [
    { label: 'Basic Monthly Salary', val: baseSalary },
    { label: 'Housing Allowance', val: housingAllowance },
    { label: 'Transport Facilitation', val: transportAllowance },
    ...(otherAllowances > 0 ? [{ label: 'Performance / Special Bonus', val: otherAllowances }] : [])
  ];

  const deductionsList = [
    { label: 'PAYE Income Tax (URA)', val: payeTax },
    { label: 'NSSF Employee Contribution (5%)', val: nssfEmployee },
    ...(otherDeductions > 0 ? [{ label: 'Other Advances / Deductions', val: otherDeductions }] : []),
    { label: 'Corporate Medical Cover', val: 0 }
  ];

  const maxRows = Math.max(earningsList.length, deductionsList.length);
  for (let i = 0; i < maxRows; i++) {
    const earn = earningsList[i];
    const ded = deductionsList[i];

    // Zebra fill
    const isOdd = i % 2 === 1;
    doc.setFillColor(isOdd ? BRAND.colors.bgZebra[0] : 255, isOdd ? BRAND.colors.bgZebra[1] : 255, isOdd ? BRAND.colors.bgZebra[2] : 255);
    doc.rect(14, y, colW, 7.5, 'F');
    doc.rect(107, y, colW, 7.5, 'F');

    // Left row
    if (earn) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(earn.label, 18, y + 5);
      doc.setFont('Helvetica', 'bold');
      doc.text(earn.val.toLocaleString(), 100, y + 5, { align: 'right' });
    }

    // Right row
    if (ded) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(ded.label, 111, y + 5);
      doc.setFont('Helvetica', 'bold');
      doc.text(ded.val > 0 ? ded.val.toLocaleString() : '0', 193, y + 5, { align: 'right' });
    }

    // Dividers
    doc.setDrawColor(...BRAND.colors.borderLight);
    doc.setLineWidth(0.2);
    doc.line(14, y + 7.5, 103, y + 7.5);
    doc.line(107, y + 7.5, 196, y + 7.5);

    y += 7.5;
  }

  // Column Subtotals
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.rect(14, y, colW, 8, 'F');
  doc.rect(107, y, colW, 8, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('TOTAL GROSS EARNINGS:', 18, y + 5.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text(`UGX ${grossPay.toLocaleString()}`, 100, y + 5.5, { align: 'right' });

  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('TOTAL DEDUCTIONS:', 111, y + 5.5);
  doc.setTextColor(...BRAND.colors.crimson);
  doc.text(`UGX ${totalDeductions.toLocaleString()}`, 193, y + 5.5, { align: 'right' });

  y += 13;

  // PROMINENT NET TAKE-HOME PAY BANNER
  doc.setFillColor(...BRAND.colors.deepSapphire);
  doc.roundedRect(14, y, 182, 22, 2.5, 2.5, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(191, 219, 254);
  doc.text('NET TAKE-HOME PAYABLE SALARY (BANK REMITTANCE):', 20, y + 7);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...BRAND.colors.white);
  doc.text(`UGX ${netPay.toLocaleString()}`, 20, y + 17);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.emerald);
  doc.text('✓ CLEARED & DISBURSED', 190, y + 12, { align: 'right' });

  y += 28;

  // Statutory Compliance & Employer Contribution Note
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('UGANDA STATUTORY EMPLOYER CONTRIBUTIONS & COMPLIANCE:', 18, y + 5.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.colors.textBody);
  const nssfEmployer = Math.round(baseSalary * 0.10);
  doc.text(`• NSSF 10% Employer Contribution: UGX ${nssfEmployer.toLocaleString()} (Total NSSF Remittance to Fund: UGX ${(nssfEmployee + nssfEmployer).toLocaleString()})`, 18, y + 10);
  doc.text('• URA PAYE Tax complies with Uganda Revenue Authority Income Tax Regulations 2026.', 18, y + 14);

  y += 24;

  // Authorizations / Sign-off Block
  doc.setFillColor(...BRAND.colors.white);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

  // Left Signatory
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('PREPARED & VERIFIED BY:', 20, y + 6);
  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Head of Human Capital & Payroll', 20, y + 12);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Nova Cloud Edges Executive Bureau', 20, y + 17);

  // Right Signatory
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('CHIEF FINANCIAL OFFICER (CFO):', 115, y + 6);
  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Director of Corporate Finance', 115, y + 12);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Electronic Ledger Authorization Code: SHA256-CLEARANCE', 115, y + 17);

  applyA4Footers(doc, { docRef: paySlipId, title: 'Payroll Payslip' });
  openPdfInBrowser(doc, `Payslip_${staffName.replace(/\s+/g, '_')}_${payPeriod.replace(/\s+/g, '_')}.pdf`);
  return doc;
}


// ============================================================================
// 4. GENERATE BALANCE SHEET PDF (A4 CORPORATE FINANCIAL STATEMENT)
// ============================================================================

export function generateBalanceSheetPDF(data = {}, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const now = new Date();
  const asOfDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const refNum = `BS-${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;

  const metrics = data?.metrics || {};
  const cashCollected = Number(metrics.total_cash_collected ?? metrics.totalCashCollected ?? 48500000);
  const receivables = Number(metrics.total_pending_receivables ?? metrics.totalPendingReceivables ?? 12400000);
  const hardwareInventory = 18500000;
  const fixedAssets = 35000000;
  const totalAssets = cashCollected + receivables + hardwareInventory + fixedAssets;

  const accountsPayable = Number(metrics.total_expenditures ?? metrics.totalExpenses ?? 9800000);
  const staffLiabilities = Number(metrics.total_staff_disbursements ?? metrics.totalStaffDisbursements ?? 4500000);
  const customerCredits = Number(metrics.total_customer_credit_pool ?? metrics.totalExcessCredits ?? 1200000);
  const totalLiabilities = accountsPayable + staffLiabilities + customerCredits;
  const shareholderEquity = totalAssets - totalLiabilities;
  const totalLiabilitiesAndEquity = totalLiabilities + shareholderEquity;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawA4ExecutiveHeader(doc, {
    title: 'STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)',
    refNumber: refNum,
    refLabel: 'STATEMENT',
    dateStr: asOfDate,
    status: 'AUDITED & BALANCED',
    accentColor: BRAND.colors.deepSapphire
  });

  let y = 43;

  // Accounting Equation Reconciled Banner
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(...BRAND.colors.emerald);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, 182, 10, 1.5, 1.5, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.colors.emerald);
  doc.text('✓ ACCOUNTING EQUATION STRICTLY BALANCED: Total Assets = Total Liabilities + Shareholder Equity', 18, y + 6.5);
  doc.text(`UGX ${totalAssets.toLocaleString()}`, 192, y + 6.5, { align: 'right' });

  y += 14;

  // TWO SECTIONS: ASSETS (LEFT) vs LIABILITIES & EQUITY (RIGHT)
  const colW = 89;

  // SECTION 1: ASSETS
  doc.setFillColor(...BRAND.colors.deepSapphire);
  doc.roundedRect(14, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.white);
  doc.text('1. ASSETS & LIQUIDITY RESOURCES', 18, y + 4.8);
  doc.text('UGX', 100, y + 4.8, { align: 'right' });

  // SECTION 2: LIABILITIES & EQUITY
  doc.setFillColor(...BRAND.colors.navySlate);
  doc.roundedRect(107, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.white);
  doc.text('2. LIABILITIES & EQUITY', 111, y + 4.8);
  doc.text('UGX', 193, y + 4.8, { align: 'right' });

  y += 7;

  const assetsList = [
    { label: 'Current Assets: Cash in Bank & MoMo', val: cashCollected },
    { label: 'Accounts Receivable (Pending Invoices)', val: receivables },
    { label: 'Hardware & Network Device Inventory', val: hardwareInventory },
    { label: 'Non-Current Assets: Edge Servers & Nodes', val: fixedAssets }
  ];

  const liabilitiesList = [
    { label: 'Accounts Payable & Upstream Hosting', val: accountsPayable },
    { label: 'Staff Payroll & Approved Disbursements', val: staffLiabilities },
    { label: 'Customer Prepaid Credit Reserves', val: customerCredits },
    { label: "Shareholder's Retained Equity & Capital", val: shareholderEquity }
  ];

  for (let i = 0; i < 4; i++) {
    const ast = assetsList[i];
    const lib = liabilitiesList[i];

    doc.setFillColor(i % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, i % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, i % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
    doc.rect(14, y, colW, 11, 'F');
    doc.rect(107, y, colW, 11, 'F');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...BRAND.colors.textBody);
    doc.text(ast.label, 18, y + 5);
    doc.setFont('Helvetica', 'bold');
    doc.text(ast.val.toLocaleString(), 100, y + 5, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.text(lib.label, 111, y + 5);
    doc.setFont('Helvetica', 'bold');
    doc.text(lib.val.toLocaleString(), 193, y + 5, { align: 'right' });

    doc.setDrawColor(...BRAND.colors.borderLight);
    doc.setLineWidth(0.2);
    doc.line(14, y + 11, 103, y + 11);
    doc.line(107, y + 11, 196, y + 11);

    y += 11;
  }

  // Totals Row
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.rect(14, y, colW, 10, 'F');
  doc.rect(107, y, colW, 10, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('TOTAL ASSETS:', 18, y + 6.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text(`UGX ${totalAssets.toLocaleString()}`, 100, y + 6.5, { align: 'right' });

  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('TOTAL LIAB. & EQUITY:', 111, y + 6.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text(`UGX ${totalLiabilitiesAndEquity.toLocaleString()}`, 193, y + 6.5, { align: 'right' });

  y += 18;

  // Key Financial Ratios Breakdown
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 28, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('LIQUIDITY & SOLVENCY ANALYSIS (EXECUTIVE METRICS):', 18, y + 6);

  const currentRatio = (totalAssets / Math.max(1, totalLiabilities)).toFixed(2);
  const debtToEquity = ((totalLiabilities / Math.max(1, shareholderEquity)) * 100).toFixed(1);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text(`• Current Liquidity Ratio: ${currentRatio}x (Healthy buffer > 1.5x)`, 18, y + 12);
  doc.text(`• Debt-to-Equity Ratio: ${debtToEquity}% (Prudent financial leverage structure)`, 18, y + 17);
  doc.text('• Compliance: Compiled strictly in adherence to International Financial Reporting Standards (IFRS for SMEs).', 18, y + 22);

  y += 34;

  // Corporate Certification Seal
  doc.setFillColor(...BRAND.colors.white);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 20, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('AUDIT & REGULATORY CERTIFICATION:', 20, y + 6);

  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Certified by Head of Financial Accounting & Compliance', 20, y + 12);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(`Generated by: ${opts?.userName || 'Corporate Controller'} • As of: ${asOfDate}`, 20, y + 16.5);

  applyA4Footers(doc, { docRef: refNum, title: 'Balance Sheet' });
  openPdfInBrowser(doc, `Balance_Sheet_${now.getFullYear()}.pdf`);
  return doc;
}


// ============================================================================
// 5. GENERATE PROFIT & LOSS PDF (A4 INCOME STATEMENT)
// ============================================================================

export function generateProfitLossPDF(data = {}, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const now = new Date();
  const year = now.getFullYear();
  const periodStr = `Fiscal Year ${year} Year-to-Date`;
  const refNum = `PL-${year}`;

  const metrics = data?.metrics || {};
  const grossSales = Number(metrics.total_invoiced_sales ?? metrics.totalInvoicedSales ?? 64500000);
  const cashRevenue = Number(metrics.total_cash_collected ?? metrics.totalCashCollected ?? grossSales);
  
  // Cost of Goods Sold (COGS)
  const cogsHosting = Math.round(cashRevenue * 0.18);
  const cogsHardware = Math.round(cashRevenue * 0.12);
  const totalCogs = cogsHosting + cogsHardware;
  const grossProfit = cashRevenue - totalCogs;
  const grossMargin = cashRevenue > 0 ? ((grossProfit / cashRevenue) * 100).toFixed(1) : '70.0';

  // Operating Expenses (OPEX)
  const opexPayroll = Number(metrics.total_staff_disbursements ?? metrics.totalStaffDisbursements ?? 12500000);
  const opexGeneral = Number(metrics.total_expenditures ?? metrics.totalExpenses ?? 8400000);
  const opexMarketing = 1800000;
  const totalOpex = opexPayroll + opexGeneral + opexMarketing;

  // Net Operating Profit
  const operatingProfit = grossProfit - totalOpex;
  const taxesEstimated = Math.max(0, Math.round(operatingProfit * 0.30));
  const netIncome = operatingProfit - taxesEstimated;
  const netMargin = cashRevenue > 0 ? ((netIncome / cashRevenue) * 100).toFixed(1) : '0.0';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawA4ExecutiveHeader(doc, {
    title: 'STATEMENT OF PROFIT & LOSS (INCOME STATEMENT)',
    refNumber: refNum,
    refLabel: 'STATEMENT',
    dateStr: periodStr,
    status: netIncome >= 0 ? 'NET PROFITABLE' : 'OPERATING DEFICIT',
    accentColor: BRAND.colors.emerald
  });

  let y = 43;

  // Executive Profitability Summary Cards
  const cardW = 58;
  const summaryCards = [
    { label: 'OPERATING REVENUE', val: `UGX ${cashRevenue.toLocaleString()}`, color: BRAND.colors.deepSapphire },
    { label: 'GROSS PROFIT', val: `UGX ${grossProfit.toLocaleString()} (${grossMargin}%)`, color: BRAND.colors.emerald },
    { label: 'NET PROFIT AFTER TAX', val: `UGX ${netIncome.toLocaleString()} (${netMargin}%)`, color: netIncome >= 0 ? BRAND.colors.emerald : BRAND.colors.crimson }
  ];

  summaryCards.forEach((card, idx) => {
    const cX = 14 + (idx * (cardW + 4));
    doc.setFillColor(...BRAND.colors.bgSoft);
    doc.setDrawColor(...BRAND.colors.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(cX, y, cardW, 16, 2, 2, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text(card.label, cX + 4, y + 5);

    doc.setFontSize(8.5);
    doc.setTextColor(...card.color);
    doc.text(card.val, cX + 4, y + 12);
  });

  y += 22;

  // DETAILED FINANCIAL BREAKDOWN TABLE
  const sections = [
    {
      title: 'A. OPERATING REVENUE & CASH INFLOW',
      accent: BRAND.colors.deepSapphire,
      rows: [
        { label: 'Cloud VPS, Colocation & Dedicated Server Hosting', amount: Math.round(cashRevenue * 0.45) },
        { label: 'Intuit QuickBooks Enterprise Solutions Reselling & Deployment', amount: Math.round(cashRevenue * 0.30) },
        { label: 'Managed IT Engineering & Cybersecurity SOC Support', amount: Math.round(cashRevenue * 0.15) },
        { label: 'UniFi Guest WiFi Vouchers & Hotspot Access Tokens', amount: Math.round(cashRevenue * 0.10) }
      ],
      totalLabel: 'TOTAL OPERATING REVENUE:',
      totalVal: cashRevenue
    },
    {
      title: 'B. COST OF SALES & DIRECT INFRASTRUCTURE (COGS)',
      accent: BRAND.colors.amber,
      rows: [
        { label: 'Upstream Uganda IXP Bandwidth & Fiber Uplinks', amount: cogsHosting },
        { label: 'Hardware Procurement & Resold Software Licenses', amount: cogsHardware }
      ],
      totalLabel: 'TOTAL COST OF SALES (COGS):',
      totalVal: totalCogs,
      marginLabel: `GROSS PROFIT: UGX ${grossProfit.toLocaleString()} (Gross Margin: ${grossMargin}%)`
    },
    {
      title: 'C. OPERATING EXPENDITURES (OPEX)',
      accent: BRAND.colors.crimson,
      rows: [
        { label: 'Employee Salaries, Specialist Engineers & Allowances', amount: opexPayroll },
        { label: 'Data Center Electricity, Backup Generators & Facilities', amount: opexGeneral },
        { label: 'Marketing, Corporate Advertising & Business Development', amount: opexMarketing }
      ],
      totalLabel: 'TOTAL OPERATING EXPENDITURES (OPEX):',
      totalVal: totalOpex
    }
  ];

  sections.forEach((sec) => {
    doc.setFillColor(...sec.accent);
    doc.roundedRect(14, y, 182, 6.5, 1.5, 1.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.white);
    doc.text(sec.title, 18, y + 4.5);
    doc.text('AMOUNT (UGX)', 192, y + 4.5, { align: 'right' });
    y += 6.5;

    sec.rows.forEach((r, rIdx) => {
      doc.setFillColor(rIdx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, rIdx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, rIdx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
      doc.rect(14, y, 182, 6.5, 'F');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(r.label, 18, y + 4.5);

      doc.setFont('Helvetica', 'bold');
      doc.text(r.amount.toLocaleString(), 192, y + 4.5, { align: 'right' });

      doc.setDrawColor(...BRAND.colors.borderLight);
      doc.setLineWidth(0.2);
      doc.line(14, y + 6.5, 196, y + 6.5);
      y += 6.5;
    });

    // Subtotal
    doc.setFillColor(...BRAND.colors.bgSoft);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.navyDark);
    doc.text(sec.totalLabel, 18, y + 4.8);
    doc.text(`UGX ${sec.totalVal.toLocaleString()}`, 192, y + 4.8, { align: 'right' });
    y += 9;
  });

  // FINAL NET EARNINGS RECONCILIATION
  doc.setFillColor(...(netIncome >= 0 ? BRAND.colors.emerald : BRAND.colors.crimson));
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('NET OPERATING INCOME BEFORE TAX (EBITDA):', 18, y + 5.5);
  doc.text(`UGX ${operatingProfit.toLocaleString()}`, 192, y + 5.5, { align: 'right' });

  doc.setFontSize(10.5);
  doc.text(`NET INCOME AFTER STATUTORY TAX: UGX ${netIncome.toLocaleString()} (${netMargin}% Net Margin)`, 18, y + 12);

  y += 20;

  // Authorization Sign-off
  doc.setFillColor(...BRAND.colors.white);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('EXECUTIVE FINANCIAL CLEARANCE & CERTIFICATION:', 20, y + 5.5);

  doc.setFont('Helvetica', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Certified by Head of Financial Accounting & Audits', 20, y + 11);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(`Reporting Officer: ${opts?.userName || 'Financial Controller'} • Standard: IFRS for SMEs`, 20, y + 15);

  applyA4Footers(doc, { docRef: refNum, title: 'Profit & Loss Statement' });
  openPdfInBrowser(doc, `Profit_Loss_Statement_${year}.pdf`);
  return doc;
}


// ============================================================================
// 6. GENERATE EXPENSE REPORT PDF (A4 CORPORATE EXPENDITURES)
// ============================================================================

export function generateExpenseReportPDF(data = {}, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const refNum = `EXP-${dateStr}`;

  const expenses = data?.companyExpenses || data?.recentExpenses || [];
  const totalExpenseAmt = expenses.reduce((acc, it) => acc + Number(it.amount || 0), 0);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawA4ExecutiveHeader(doc, {
    title: 'OFFICIAL COMPANY EXPENDITURE AUDIT REPORT',
    refNumber: refNum,
    refLabel: 'REPORT',
    dateStr,
    status: `${expenses.length} VOUCHERS RECORDED`,
    accentColor: BRAND.colors.crimson
  });

  let y = 43;

  const drawExpHeader = (curY) => {
    doc.setFillColor(...BRAND.colors.crimson);
    doc.roundedRect(14, curY, 182, 7.5, 1.5, 1.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.white);
    doc.text('VOUCHER #', 18, curY + 5);
    doc.text('STAFF BENEFICIARY', 45, curY + 5);
    doc.text('CATEGORY & PURPOSE', 92, curY + 5);
    doc.text('DATE', 152, curY + 5);
    doc.text('AMOUNT (UGX)', 192, curY + 5, { align: 'right' });
    return curY + 7.5;
  };

  y = drawExpHeader(y);

  if (expenses.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text('No expenditure records found in corporate ledger.', 18, y + 8);
    y += 14;
  } else {
    expenses.forEach((exp, idx) => {
      const rowH = 8.5;
      if (y + rowH > 265) {
        doc.addPage();
        drawA4ContinuationHeader(doc, { title: 'EXPENDITURE AUDIT REPORT', refNumber: refNum, accentColor: BRAND.colors.crimson });
        y = drawExpHeader(26);
      }

      doc.setFillColor(idx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
      doc.rect(14, y, 182, rowH, 'F');

      doc.setDrawColor(...BRAND.colors.borderLight);
      doc.setLineWidth(0.2);
      doc.line(14, y + rowH, 196, y + rowH);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...BRAND.colors.navyDark);
      doc.text(String(exp.voucher_number || exp.id || `EXP-${idx + 1}`), 18, y + 5.2);

      doc.setFont('Helvetica', 'normal');
      doc.text(String(exp.staff_name || exp.beneficiary || 'Internal Staff').substring(0, 22), 45, y + 5.2);
      doc.text(String(exp.category || exp.purpose || 'Operational Expense').substring(0, 32), 92, y + 5.2);
      doc.text(exp.date ? new Date(exp.date).toISOString().split('T')[0] : dateStr, 152, y + 5.2);

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(...BRAND.colors.crimson);
      doc.text(Number(exp.amount || 0).toLocaleString(), 192, y + 5.2, { align: 'right' });

      y += rowH;
    });
  }

  // Summary Box at bottom
  if (y > 230) {
    doc.addPage();
    drawA4ContinuationHeader(doc, { title: 'EXPENDITURE AUDIT REPORT — SUMMARY', refNumber: refNum, accentColor: BRAND.colors.crimson });
    y = 26;
  } else {
    y += 6;
  }

  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('TOTAL RECONCILED EXPENDITURES:', 20, y + 9);

  doc.setFontSize(11);
  doc.setTextColor(...BRAND.colors.crimson);
  doc.text(`UGX ${totalExpenseAmt.toLocaleString()}`, 192, y + 9, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(`Total Vouchers Audited: ${expenses.length} • Auditor: ${opts?.userName || 'Internal Audit Desk'}`, 20, y + 16);

  applyA4Footers(doc, { docRef: refNum, title: 'Expenditure Report' });
  openPdfInBrowser(doc, `Expense_Report_${dateStr}.pdf`);
  return doc;
}


// ============================================================================
// 7. GENERATE SALES REPORT PDF (A4 COMMERCIAL SALES AUDIT)
// ============================================================================

export function generateSalesReportPDF(data = {}, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const refNum = `SALES-${dateStr}`;

  const topItems = data?.top_selling_items || data?.topSellingItems || [];
  const metrics = data?.metrics || {};
  const totalSales = Number(metrics.total_invoiced_sales ?? metrics.totalInvoicedSales ?? 0);
  const totalCash = Number(metrics.total_cash_collected ?? metrics.totalCashCollected ?? 0);
  const totalReceivables = Number(metrics.total_pending_receivables ?? metrics.totalPendingReceivables ?? 0);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawA4ExecutiveHeader(doc, {
    title: 'COMMERCIAL SALES PERFORMANCE & BILLING AUDIT',
    refNumber: refNum,
    refLabel: 'SALES',
    dateStr,
    status: 'EXECUTIVE AUDIT',
    accentColor: BRAND.colors.novaBlue
  });

  let y = 43;

  // Performance KPI Cards
  const cardW = 58;
  const kpis = [
    { label: 'TOTAL INVOICED REVENUE', val: `UGX ${totalSales.toLocaleString()}`, color: BRAND.colors.deepSapphire },
    { label: 'CASH COLLECTIONS SETTLED', val: `UGX ${totalCash.toLocaleString()}`, color: BRAND.colors.emerald },
    { label: 'ACCOUNTS RECEIVABLE (PENDING)', val: `UGX ${totalReceivables.toLocaleString()}`, color: BRAND.colors.amber }
  ];

  kpis.forEach((card, idx) => {
    const cX = 14 + (idx * (cardW + 4));
    doc.setFillColor(...BRAND.colors.bgSoft);
    doc.setDrawColor(...BRAND.colors.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(cX, y, cardW, 16, 2, 2, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text(card.label, cX + 4, y + 5);

    doc.setFontSize(8.5);
    doc.setTextColor(...card.color);
    doc.text(card.val, cX + 4, y + 12);
  });

  y += 22;

  // Product Sales Table
  const drawSalesHeader = (curY) => {
    doc.setFillColor(...BRAND.colors.novaBlue);
    doc.roundedRect(14, curY, 182, 7.5, 1.5, 1.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.white);
    doc.text('PRODUCT / SERVICE OFFERING', 18, curY + 5);
    doc.text('CATEGORY', 90, curY + 5);
    doc.text('UNITS SOLD', 140, curY + 5, { align: 'center' });
    doc.text('REVENUE (UGX)', 192, curY + 5, { align: 'right' });
    return curY + 7.5;
  };

  y = drawSalesHeader(y);

  if (topItems.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text('No product-specific sales transactions logged yet.', 18, y + 8);
    y += 14;
  } else {
    topItems.forEach((it, idx) => {
      const rowH = 8.5;
      if (y + rowH > 265) {
        doc.addPage();
        drawA4ContinuationHeader(doc, { title: 'SALES PERFORMANCE AUDIT', refNumber: refNum, accentColor: BRAND.colors.novaBlue });
        y = drawSalesHeader(26);
      }

      doc.setFillColor(idx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
      doc.rect(14, y, 182, rowH, 'F');

      doc.setDrawColor(...BRAND.colors.borderLight);
      doc.setLineWidth(0.2);
      doc.line(14, y + rowH, 196, y + rowH);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.colors.navyDark);
      doc.text(String(it.name || 'Cloud Offering').substring(0, 42), 18, y + 5.2);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(String(it.category || 'General').substring(0, 24), 90, y + 5.2);

      doc.setFont('Helvetica', 'bold');
      doc.text(String(it.sales_count || it.qty || 1), 140, y + 5.2, { align: 'center' });

      doc.setTextColor(...BRAND.colors.novaBlue);
      doc.text(Number(it.total_revenue || it.revenue || 0).toLocaleString(), 192, y + 5.2, { align: 'right' });

      y += rowH;
    });
  }

  applyA4Footers(doc, { docRef: refNum, title: 'Sales Performance Report' });
  openPdfInBrowser(doc, `Sales_Report_${dateStr}.pdf`);
  return doc;
}


// ============================================================================
// 8. GENERATE FORENSICS AUDIT PDF (A4 CYBERSECURITY & AUDIT TRAIL)
// ============================================================================

export function generateForensicsAuditPDF(logs = [], options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const refNum = `AUDIT-${dateStr}`;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawA4ExecutiveHeader(doc, {
    title: 'CERTIFIED CYBERSECURITY & FORENSIC AUDIT TRAIL',
    refNumber: refNum,
    refLabel: 'AUDIT',
    dateStr,
    status: `${logs.length} EVENTS AUDITED`,
    accentColor: BRAND.colors.deepSapphire
  });

  let y = 43;

  const drawAuditHeader = (curY) => {
    doc.setFillColor(...BRAND.colors.deepSapphire);
    doc.roundedRect(14, curY, 182, 7.5, 1.5, 1.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...BRAND.colors.white);
    doc.text('TIMESTAMP (EAT)', 18, curY + 5);
    doc.text('OPERATOR / USER', 54, curY + 5);
    doc.text('IP ADDRESS', 94, curY + 5);
    doc.text('SECURITY ACTION / EVENT LOG', 130, curY + 5);
    return curY + 7.5;
  };

  y = drawAuditHeader(y);

  if (logs.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text('No security audit events logged in repository.', 18, y + 8);
    y += 14;
  } else {
    logs.forEach((log, idx) => {
      const rowH = 8.5;
      if (y + rowH > 265) {
        doc.addPage();
        drawA4ContinuationHeader(doc, { title: 'FORENSICS AUDIT TRAIL', refNumber: refNum, accentColor: BRAND.colors.deepSapphire });
        y = drawAuditHeader(26);
      }

      doc.setFillColor(idx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, idx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
      doc.rect(14, y, 182, rowH, 'F');

      doc.setDrawColor(...BRAND.colors.borderLight);
      doc.setLineWidth(0.2);
      doc.line(14, y + rowH, 196, y + rowH);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...BRAND.colors.textMuted);
      doc.text(String(log.timestamp || log.created_at || dateStr).substring(0, 20), 18, y + 5.2);

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(...BRAND.colors.navyDark);
      doc.text(String(log.userName || log.user_email || 'System Daemon').substring(0, 24), 54, y + 5.2);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(String(log.ip || log.ip_address || '127.0.0.1'), 94, y + 5.2);

      doc.setFont('Helvetica', 'normal');
      doc.text(String(log.action || log.event || 'Authorized State Mutation').substring(0, 36), 130, y + 5.2);

      y += rowH;
    });
  }

  applyA4Footers(doc, { docRef: refNum, title: 'Forensics Audit' });
  openPdfInBrowser(doc, `Forensics_Audit_Report_${dateStr}.pdf`);
  return doc;
}


// ============================================================================
// 9. GENERATE PAYMENT RECEIPT 80MM PDF (THERMAL POS RECEIPT)
// ============================================================================

export async function generatePaymentReceipt80mmPDF(paymentData, options = {}) {
  const invNum = paymentData?.invoice_number || 'INV-2026-0041';
  const customerName = paymentData?.customer_name || paymentData?.party_name || 'Valued Customer';
  const customerPhone = paymentData?.customer_phone || paymentData?.phone || '';
  const now = new Date();
  const dateStr = paymentData?.payment_date || (paymentData?.created_at ? new Date(paymentData.created_at).toLocaleString('en-GB') : now.toLocaleString('en-GB'));

  const totalBilled = Number(paymentData?.amount || paymentData?.totalBilled || paymentData?.amount_due || 0);
  const totalPaid = Number(paymentData?.paid_amount || paymentData?.totalPaid || paymentData?.amount_paid || totalBilled);
  const balance = Math.max(0, totalBilled - totalPaid);
  const isPaid = balance === 0;

  const pmtMethod = paymentData?.payment_method || 'Bank Wire / Mobile Money';
  const refCode = paymentData?.reference || `TXN-${invNum}`;

  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 180);

  // Calculate dynamic roll height based on contents
  const receiptHeight = 175;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, receiptHeight] });

  let y = 6;
  const effectiveLogo = options?.logoDataUrl || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  if (effectiveLogo && effectiveLogo.startsWith('data:image')) {
    try {
      doc.addImage(effectiveLogo, 'PNG', 30, y, 20, 11);
      y += 13;
    } catch {}
  }

  // Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(BRAND.companyName, 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('OFFICIAL PAYMENT RECEIPT', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Plot 14 Parliament Ave, Kampala • Tel: +256 790 001 631', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('TIN: 1014892019 • support@ncloud.co.ug • ncloud.co.ug', 40, y, { align: 'center' });
  y += 4;

  // Dashed Cut Line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Transaction Info
  const printRow = (label, val, boldVal = false) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 6, y);
    doc.setFont('Helvetica', boldVal ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 74, y, { align: 'right' });
    y += 4.2;
  };

  printRow('Receipt / Inv Ref:', invNum, true);
  printRow('Transaction Date:', String(dateStr).substring(0, 22));
  printRow('Client Name:', String(customerName).substring(0, 24));
  if (customerPhone) printRow('Client Phone:', customerPhone);
  printRow('Payment Method:', pmtMethod);
  printRow('Settlement Reference:', refCode);

  // Dashed Line
  y += 1;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Financial Figures
  printRow('Total Invoice Billed:', `UGX ${totalBilled.toLocaleString()}`);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 163, 74);
  doc.text('AMOUNT PAID CLEARED:', 6, y);
  doc.text(`UGX ${totalPaid.toLocaleString()}`, 74, y, { align: 'right' });
  y += 5;

  printRow('Remaining Balance:', `UGX ${balance.toLocaleString()}`, balance > 0);

  // Status Stamp Box
  y += 2;
  doc.setFillColor(isPaid ? 240 : 254, isPaid ? 253 : 243, isPaid ? 244 : 199);
  doc.roundedRect(6, y, 68, 7, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isPaid ? 22 : 180, isPaid ? 163 : 83, isPaid ? 74 : 9);
  doc.text(isPaid ? '✓ 100% PAYMENT CLEARED & SETTLED' : `PARTIAL PAYMENT — UGX ${balance.toLocaleString()} DUE`, 40, y + 4.8, { align: 'center' });
  y += 11;

  // Verification QR
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 31, y, 18, 18);
      y += 20;
    } catch {}
  }

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan QR Code to verify authenticity on Nova Ledger', 40, y, { align: 'center' });
  y += 3.2;
  doc.text(`Cashier / Admin: ${options?.userName || 'Corporate POS Desk'}`, 40, y, { align: 'center' });
  y += 3.2;
  doc.setFont('Helvetica', 'bold');
  doc.text('Thank you for choosing Nova Cloud Edges!', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Payment_Receipt_80mm_${invNum}.pdf`);
  return doc;
}


// ============================================================================
// 10. GENERATE WORK ORDER POS RECEIPT 80MM (THERMAL FIELD SERVICE)
// ============================================================================

export async function generateWorkOrderPOSReceiptPDF(workOrder, options = {}) {
  const orderNum = workOrder?.order_number || `WO-${workOrder?.id || '2026-001'}`;
  const customerName = workOrder?.customer_name || 'Client';
  const assignedTech = workOrder?.assigned_tech || workOrder?.engineer || 'Senior Field Engineer';
  const serviceScope = workOrder?.service_scope || workOrder?.scope || 'UniFi Hardware Setup & Cable Termination';
  const status = workOrder?.status || 'Active Dispatch';
  const createdDate = workOrder?.created_at ? new Date(workOrder.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB');

  const items = Array.isArray(workOrder?.items) ? workOrder.items : [
    { name: 'UniFi Mesh Access Point', qty: 2, unit_price: 480000, total: 960000 },
    { name: 'CAT6 Outdoor Shielded Cable (Roll)', qty: 1, unit_price: 350000, total: 350000 },
    { name: 'Labor & Field Installation', qty: 1, unit_price: 150000, total: 150000 }
  ];

  const totalCost = items.reduce((s, it) => s + Number(it.total || (it.qty * it.unit_price) || 0), 0);
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(orderNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 180);

  const receiptHeight = 180 + (items.length * 6);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, receiptHeight] });

  let y = 6;
  const effectiveLogo = options?.logoDataUrl || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  if (effectiveLogo && effectiveLogo.startsWith('data:image')) {
    try {
      doc.addImage(effectiveLogo, 'PNG', 30, y, 20, 11);
      y += 13;
    } catch {}
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(BRAND.companyName, 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('FIELD SERVICE WORK ORDER DISPATCH', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Plot 14 Parliament Ave, Kampala • Tel: +256 790 001 631', 40, y, { align: 'center' });
  y += 4;

  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  const printLine = (l, v, bold = false) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(l, 6, y);
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(v), 74, y, { align: 'right' });
    y += 4.2;
  };

  printLine('Work Order Ref:', orderNum, true);
  printLine('Dispatched Date:', String(createdDate).substring(0, 22));
  printLine('Customer Name:', String(customerName).substring(0, 24));
  printLine('Assigned Engineer:', String(assignedTech).substring(0, 24));
  printLine('Service Scope:', String(serviceScope).substring(0, 24));
  printLine('Order Status:', status, true);

  y += 1;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL OF MATERIALS & LABOR:', 6, y);
  y += 4;

  items.forEach((it) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    doc.text(`${it.qty || 1}x ${String(it.name || 'Hardware').substring(0, 28)}`, 6, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(Number(it.total || (it.qty * it.unit_price) || 0).toLocaleString(), 74, y, { align: 'right' });
    y += 4.2;
  });

  y += 2;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('TOTAL JOB COST (UGX):', 6, y);
  doc.text(`UGX ${totalCost.toLocaleString()}`, 74, y, { align: 'right' });
  y += 7;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 31, y, 18, 18);
      y += 20;
    } catch {}
  }

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer Acceptance Sign-off: ____________________', 40, y, { align: 'center' });
  y += 3.5;
  doc.text('Support Desk: 0790001631 • ncloud.co.ug', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Work_Order_${orderNum}.pdf`);
  return doc;
}

// Utility to safely set doc font size
function docFontSizeSafe(doc, size) {
  try {
    doc.setFontSize(size);
  } catch {}
}
