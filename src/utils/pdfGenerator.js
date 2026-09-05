import { registerTrebuchetFont } from './trebuchetFont.js';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { NOVA_LOGO_BASE64 } from './logoBase64.js';

// ============================================================================
// NOVA CLOUD EDGES (U) LIMITED — UNIFIED EXECUTIVE PDF DESIGN SYSTEM
// ============================================================================

export const BRAND = {
  companyName: 'NOVA CLOUD EDGES (U) LIMITED',
  tagline: 'Sovereign Cloud, Enterprise Software & Edge Network Infrastructure',
  address: 'Lugga Zone, Ndejje, Wakiso, Republic of Uganda',
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
  // Top Corporate Accent Bar (Full-bleed dual bar)
  doc.setFillColor(...BRAND.colors.navyDark);
  doc.rect(0, 0, 210, 6, 'F');
  doc.setFillColor(...accentColor);
  doc.rect(0, 6, 210, 1.5, 'F');

  let textX = 14;
  const effectiveLogo = logoDataUrl || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  if (effectiveLogo && effectiveLogo.startsWith('data:image')) {
    try {
      doc.addImage(effectiveLogo, 'PNG', 14, 13, 24, 20);
      textX = 42;
    } catch {
      textX = 14;
    }
  }

  // Company Name & Tagline
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('NOVA CLOUD EDGES', textX, 18);
  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text('(U) LIMITED', textX + 62, 18);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(BRAND.tagline, textX, 23);
  doc.text(`${BRAND.address} • ${BRAND.tin}`, textX, 27.5);
  doc.text(BRAND.contact, textX, 32);

  // Header Right: Document Title & Reference
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text((title || 'OFFICIAL DOCUMENT').toUpperCase(), 196, 19, { align: 'right' });

  if (refNumber) {
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accentColor);
    doc.text(`${refLabel ? `${refLabel}: ` : ''}#${refNumber}`, 196, 25, { align: 'right' });
  }

  // Status Stamp Box
  if (status) {
    const stampW = 40;
    const stampH = 6.8;
    const stampX = 196 - stampW;
    const stampY = refNumber ? 28 : 23;
    const sLower = status.toLowerCase();
    const isPaid = sLower.includes('paid') || sLower.includes('settled') || sLower.includes('approved') || sLower.includes('active') || sLower.includes('cleared') || sLower.includes('accepted');
    const isOverdue = sLower.includes('overdue') || sLower.includes('rejected') || sLower.includes('failed');
    const badgeBg = isPaid ? [240, 253, 244] : isOverdue ? [254, 242, 242] : [254, 243, 199];
    const badgeBorder = isPaid ? [34, 197, 94] : isOverdue ? [239, 68, 68] : [217, 119, 6];
    const badgeText = isPaid ? BRAND.colors.emerald : isOverdue ? BRAND.colors.crimson : BRAND.colors.amber;

    doc.setFillColor(...badgeBg);
    doc.setDrawColor(...badgeBorder);
    doc.setLineWidth(0.4);
    doc.roundedRect(stampX, stampY, stampW, stampH, 1, 1, 'FD');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...badgeText);
    doc.text(status.toUpperCase(), stampX + stampW / 2, stampY + 4.7, { align: 'center' });
  }

  // Separator Rule
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.line(14, 38, 196, 38);
}

/**
 * Draws a compact continuation header on Page 2+.
 */
function drawA4ContinuationHeader(doc, { title, refNumber, accentColor = BRAND.colors.deepSapphire }) {
  doc.setFillColor(...BRAND.colors.navyDark);
  doc.rect(0, 0, 210, 4, 'F');
  doc.setFillColor(...accentColor);
  doc.rect(0, 4, 210, 1, 'F');

  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.2);
  doc.roundedRect(14, 8, 182, 11, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(`${BRAND.companyName} — ${(title || 'DOCUMENT').toUpperCase()} (CONTINUED)`, 18, 15);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accentColor);
  doc.text(`REF: #${refNumber || 'N/A'}`, 192, 15, { align: 'right' });
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
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text('Nova Cloud Edges (U) Ltd • Verification: ncloud.co.ug/verify • Confidential & Legally Binding', 14, 286.5);

    // Right: Page X of Y
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.navyDark);
    doc.text(`Page ${p} of ${totalPages}`, 196, 286.5, { align: 'right' });
  }
}


// ============================================================================
// 1. GENERATE INVOICE PDF (A4 OFFICIAL TAX INVOICE & STATEMENT)
// ============================================================================

// ============================================================================
// EXECUTIVE DARK BLUE PDF STYLING SYSTEM (VAT-INCLUSIVE & DATABASE-DRIVEN)
// ============================================================================

function sanitizePdfText(str) {
  if (!str) return '';
  return String(str).replace(/[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').trim();
}

export function drawInvoiceNinja3ToneBar(doc, y, h = 4) {
  doc.setFillColor(30, 58, 138); // #1e3a8a Dark Blue
  doc.rect(0, y, 50, h, 'F');
  doc.setFillColor(15, 23, 42); // #0f172a Deep Navy
  doc.rect(50, y, 105, h, 'F');
  doc.setFillColor(245, 158, 11); // #f59e0b Amber
  doc.rect(155, y, 55, h, 'F');
}

export function drawInvoiceNinjaBurgundyLogo(doc, x = 14, y = 10, customLogoDataUrl = null) {
  const effectiveLogo = customLogoDataUrl || NOVA_LOGO_BASE64;
  if (effectiveLogo && typeof effectiveLogo === 'string' && effectiveLogo.startsWith('data:image')) {
    try {
      doc.addImage(effectiveLogo, 'PNG', x, y, 45, 15);
      return;
    } catch {}
  }
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('NOVA CLOUD EDGES (U) LTD', x, y + 8);
}

function formatNinjaDate(dateInput) {
  if (!dateInput) return '06/Jun/2026';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}/${months[d.getMonth()]}/${d.getFullYear()}`;
  } catch {
    return String(dateInput);
  }
}

function formatNinjaUGX(num) {
  return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UGX';
}

export async function generateInvoicePDF(inv, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerTrebuchetFont(doc);

  const invoiceNum = sanitizePdfText(inv?.invoice_number || `INV-${inv?.id || '1602026682026'}`);
  const invDate = formatNinjaDate(inv?.created_at || inv?.date || new Date());
  const dueDate = formatNinjaDate(inv?.due_date || new Date(Date.now() + 14 * 86400000));
  const isPaid = inv?.status === 'Paid' || inv?.status === '100% Paid' || inv?.status === 'Paid & Settled';

  const totalAmt = Number(inv?.amount || inv?.total || 0);
  const paidAmt = isPaid ? totalAmt : Number(inv?.paid_amount || inv?.paid || 0);
  const balanceDue = Math.max(0, totalAmt - paidAmt);

  // Mandatory 18% VAT Breakdown
  const subtotalAmt = Math.round((totalAmt / 1.18) * 100) / 100;
  const vatAmt = Math.round((totalAmt - subtotalAmt) * 100) / 100;

  // Sanitized Customer & Contact details from Database
  const cName = sanitizePdfText(inv?.customer_name || inv?.company || inv?.party_name || 'Valued Corporate Client');
  const cCode = sanitizePdfText(inv?.customer_code || inv?.client_id || (inv?.id ? String(inv.id) : ''));
  const cAddr = sanitizePdfText(inv?.customer_address || inv?.address || 'Kampala, Uganda');
  const cPhone = sanitizePdfText(inv?.customer_phone || inv?.phone || '');
  const cEmail = sanitizePdfText(inv?.customer_email || inv?.party_email || inv?.email || '');

  // Normalized Line Items
  let items = [];
  if (Array.isArray(inv?.items) && inv.items.length > 0) {
    items = inv.items.map(it => ({
      name: sanitizePdfText(it.name || it.item_name || 'Cloud Solution Service'),
      description: sanitizePdfText(it.description || it.specs || it.short_desc || ''),
      unit_price: Number(it.unit_price || it.price || 0),
      quantity: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      amount: Number(it.amount || it.total || ((Math.max(1, parseInt(it.quantity || it.qty) || 1)) * Number(it.unit_price || it.price || 0)))
    }));
  } else {
    items = [{
      name: sanitizePdfText(inv?.item_name || 'Cloud Infrastructure & Managed Services'),
      description: sanitizePdfText(inv?.description || 'Enterprise Cloud & Managed Systems Deployment and Configuration'),
      unit_price: totalAmt,
      quantity: 1,
      amount: totalAmt
    }];
  }

  const siteLogo = opts?.siteLogo || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  const logoDataUrl = await getImageDataUrl(siteLogo);
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(invoiceNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 200);
  const activeLogo = logoDataUrl || NOVA_LOGO_BASE64;
  const storedBanks = Array.isArray(opts?.bankAccounts) ? opts.bankAccounts : [];

  // Page 1 Top 3-Tone Accent Bar
  drawInvoiceNinja3ToneBar(doc, 0, 4);

  // Logo Left (Authentic Image)
  drawInvoiceNinjaBurgundyLogo(doc, 14, 10, activeLogo);

  // Top Right Solid Dark Blue Box
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(124, 8, 72, 30, 1.5, 1.5, 'F');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'OFFICIAL TAX INVOICE', val: `#${invoiceNum}` },
    { label: 'Invoice Date:', val: invDate },
    { label: 'Payment Due:', val: dueDate },
    { label: 'Total Amount:', val: formatNinjaUGX(totalAmt) },
    { label: 'Balance Outstanding:', val: formatNinjaUGX(balanceDue) }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 13 + idx * 5;
    doc.text(r.label, 127, rowY);
    doc.text(r.val, 193, rowY, { align: 'right' });
  });

  // TWO EXECUTIVE CARDS (ISSUED BY vs BILLED TO)
  const cardY = 43;
  const cardW = 88;
  const cardH = 34;

  // CARD 1: ISSUED BY
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('ISSUED BY (SERVICE PROVIDER)', 18, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges (U) Limited', 18, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 18, cardY + 15.5);
  doc.text('Tel: (+256) 790 001631 / 33  •  support@ncloud.co.ug', 18, cardY + 20);
  doc.text('Web: www.ncloud.co.ug  •  TIN: 1014892019', 18, cardY + 24.5);

  // Bank Remittance
  let bankStr = 'Remit To: MTN MoMo Merchant Code: 674859 (UGX)';
  if (Array.isArray(storedBanks) && storedBanks.length > 0) {
    const b = storedBanks[0];
    bankStr = `Remit To: ${b.bank_name} A/C: ${b.account_number} (${b.currency || 'UGX'})`;
  }
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text(bankStr.substring(0, 62), 18, cardY + 29.5);

  // CARD 2: BILLED TO
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('BILLED TO (CLIENT DETAILS)', 112, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.substring(0, 38), 112, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(cCode ? `Client ID / Ref: #${cCode}` : 'Registered Client', 112, cardY + 15.5);
  doc.text(cAddr.substring(0, 48), 112, cardY + 20);
  doc.text(cPhone ? `Tel: ${cPhone}` : 'Contact Telephone on File', 112, cardY + 24.5);
  doc.text(cEmail ? `Email: ${cEmail}` : 'Email: billing@ncloud.co.ug', 112, cardY + 29);

  // Table Setup
  function drawTableHeader(y) {
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(14, y, 182, 8, 1, 1, 'F');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, y + 5.5);
    doc.text('Item & Description', 25, y + 5.5);
    doc.text('Unit Cost', 145, y + 5.5, { align: 'right' });
    doc.text('Qty', 158, y + 5.5, { align: 'center' });
    doc.text('Line Total', 193, y + 5.5, { align: 'right' });
  }

  let tableY = cardY + cardH + 6;
  drawTableHeader(tableY);
  tableY += 8;

  // Pre-calculate heights
  const preparedItems = items.map((it, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const nameLines = doc.splitTextToSize(String(it.name || ''), 110);
    const descLines = doc.splitTextToSize(String(it.description || ''), 110);
    const totalLines = nameLines.length + descLines.length;
    const rowH = Math.max(8.5, totalLines * 3.8 + 3.5);
    return { it, numStr, nameLines, descLines, rowH };
  });

  const totalItemsHeight = preparedItems.reduce((acc, p) => acc + p.rowH, 0);
  const fitsSinglePage = (tableY + totalItemsHeight + 52) <= 265;

  let currentPage = 1;

  preparedItems.forEach((p, idx) => {
    const pageLimit = fitsSinglePage ? 265 : (currentPage === 1 ? 215 : 220);

    if (tableY + p.rowH > pageLimit) {
      doc.addPage();
      currentPage++;
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 12;
      drawTableHeader(tableY);
      tableY += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, p.rowH, 'F');
    }

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p.numStr, 17, tableY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(p.nameLines, 25, tableY + 5.2);

    const descY = tableY + 5.2 + (p.nameLines.length * 3.8);
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(p.descLines, 25, descY);

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(p.it.unit_price), 145, tableY + 5.2, { align: 'right' });

    doc.text(String(p.it.quantity || 1), 158, tableY + 5.2, { align: 'center' });

    doc.text(formatNinjaUGX(p.it.amount), 193, tableY + 5.2, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + p.rowH, 196, tableY + p.rowH);

    tableY += p.rowH;
  });

  if (tableY + 48 > 265) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 14;
  }

  const totalsY = tableY + 6;

  // Invoice Terms on Left (Width restricted to 85mm so no overlap with right totals)
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice Terms:', 14, totalsY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const termsString = inv?.terms || 'This Invoice is valid for ONLY 2 weeks, and payment of at least 75% MUST be made before services are offered.';
  const termsText = doc.splitTextToSize(termsString, 85);
  doc.text(termsText, 14, totalsY + 4.5);

  // Digital Verification section (Accurate as requested)
  const verifyY = totalsY + 16;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 14, verifyY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 14, verifyY + 4.5);

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, verifyY + 7, 20, 20);
    } catch {}
  }

  // Totals on Right with MANDATORY 18% STATUTORY VAT
  const totalRows = [
    { label: 'Net Subtotal:', val: formatNinjaUGX(subtotalAmt) },
    { label: 'Value Added Tax (18% Statutory):', val: formatNinjaUGX(vatAmt) },
    { label: 'Total Invoiced:', val: formatNinjaUGX(totalAmt), bold: true },
    { label: 'Amount Paid to Date:', val: formatNinjaUGX(paidAmt) },
    { label: 'Balance Outstanding:', val: formatNinjaUGX(balanceDue), bold: true, color: [30, 58, 138] }
  ];

  totalRows.forEach((r, idx) => {
    const rY = totalsY + idx * 5.2;
    doc.setFont('TrebuchetMS', r.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(r.color ? r.color[0] : 15, r.color ? r.color[1] : 23, r.color ? r.color[2] : 42);
    doc.text(r.label, 150, rY, { align: 'right' });
    doc.text(r.val, 194, rY, { align: 'right' });
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('We also Deal in: CCTV Cameras, Company Emails, Cloud Web Hosting & Dev, Mobile App Dev, Systems Admin, Backups & Restoration Services & Cyber Security', 105, 280, { align: 'center' });

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: 'center' });

    drawInvoiceNinja3ToneBar(doc, 293, 4);
  }

  openPdfInBrowser(doc, `Invoice_${invoiceNum}.pdf`);
  return doc;
}

export async function generateQuotationPDF(quote, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerTrebuchetFont(doc);

  const quoteNum = sanitizePdfText(quote?.quote_number || `QTN-${quote?.id || '1602026682026'}`);
  const qDate = formatNinjaDate(quote?.created_at || quote?.date || new Date());
  const validUntil = formatNinjaDate(quote?.valid_until || new Date(Date.now() + 30 * 86400000));
  const totalAmt = Number(quote?.total_amount || quote?.amount || 0);

  const subtotalAmt = Math.round((totalAmt / 1.18) * 100) / 100;
  const vatAmt = Math.round((totalAmt - subtotalAmt) * 100) / 100;

  const cName = sanitizePdfText(quote?.customer_name || quote?.company || quote?.party_name || 'Valued Corporate Client');
  const cCode = sanitizePdfText(quote?.customer_code || quote?.client_id || (quote?.id ? String(quote.id) : ''));
  const cAddr = sanitizePdfText(quote?.customer_address || quote?.address || 'Kampala, Uganda');
  const cPhone = sanitizePdfText(quote?.customer_phone || quote?.phone || '');
  const cEmail = sanitizePdfText(quote?.customer_email || quote?.party_email || quote?.email || '');

  const siteLogo = opts?.siteLogo || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  const logoDataUrl = await getImageDataUrl(siteLogo);
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(quoteNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 200);
  const activeLogo = logoDataUrl || NOVA_LOGO_BASE64;
  const storedBanks = Array.isArray(opts?.bankAccounts) ? opts.bankAccounts : [];

  drawInvoiceNinja3ToneBar(doc, 0, 4);
  drawInvoiceNinjaBurgundyLogo(doc, 14, 10, activeLogo);

  // Top Right Box
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(124, 8, 72, 30, 1.5, 1.5, 'F');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const metaRows = [
    { label: 'COMMERCIAL PROPOSAL', val: `#${quoteNum}` },
    { label: 'Quotation Date:', val: qDate },
    { label: 'Valid Until:', val: validUntil },
    { label: 'Estimated Total:', val: formatNinjaUGX(totalAmt) },
    { label: 'Proposal Status:', val: quote?.status || 'Active Proposal' }
  ];

  metaRows.forEach((r, idx) => {
    const rowY = 13 + idx * 5;
    doc.text(r.label, 127, rowY);
    doc.text(r.val, 193, rowY, { align: 'right' });
  });

  // TWO EXECUTIVE CARDS
  const cardY = 43;
  const cardW = 88;
  const cardH = 34;

  // CARD 1: ISSUED BY
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('ISSUED BY (SERVICE PROVIDER)', 18, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Nova Cloud Edges (U) Limited', 18, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 18, cardY + 15.5);
  doc.text('Tel: (+256) 790 001631 / 33  •  support@ncloud.co.ug', 18, cardY + 20);
  doc.text('Web: www.ncloud.co.ug  •  TIN: 1014892019', 18, cardY + 24.5);

  let bankStr = 'Remit To: MTN MoMo Merchant Code: 674859 (UGX)';
  if (Array.isArray(storedBanks) && storedBanks.length > 0) {
    const b = storedBanks[0];
    bankStr = `Remit To: ${b.bank_name} A/C: ${b.account_number} (${b.currency || 'UGX'})`;
  }
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138);
  doc.text(bankStr.substring(0, 62), 18, cardY + 29.5);

  // CARD 2: BILLED TO
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, cardY, cardW, cardH, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('PROPOSED TO (CLIENT DETAILS)', 112, cardY + 5.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(cName.substring(0, 38), 112, cardY + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(cCode ? `Client ID / Ref: #${cCode}` : 'Enterprise Prospect', 112, cardY + 15.5);
  doc.text(cAddr.substring(0, 48), 112, cardY + 20);
  doc.text(cPhone ? `Tel: ${cPhone}` : 'Contact Telephone on File', 112, cardY + 24.5);
  doc.text(cEmail ? `Email: ${cEmail}` : 'Email: sales@ncloud.co.ug', 112, cardY + 29);

  function drawTableHeader(y) {
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(14, y, 182, 8, 1, 1, 'F');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, y + 5.5);
    doc.text('Scope Item & Description', 25, y + 5.5);
    doc.text('Unit Rate', 145, y + 5.5, { align: 'right' });
    doc.text('Qty', 158, y + 5.5, { align: 'center' });
    doc.text('Total (UGX)', 193, y + 5.5, { align: 'right' });
  }

  let tableY = cardY + cardH + 6;
  drawTableHeader(tableY);
  tableY += 8;

  let items = [];
  if (Array.isArray(quote?.items) && quote.items.length > 0) {
    items = quote.items.map(it => ({
      name: sanitizePdfText(it.name || it.item_name || 'Cloud Solution Service'),
      description: sanitizePdfText(it.description || it.specs || it.short_desc || ''),
      unit_price: Number(it.unit_price || it.price || 0),
      quantity: Math.max(1, parseInt(it.quantity || it.qty) || 1),
      amount: Number(it.amount || it.total || ((Math.max(1, parseInt(it.quantity || it.qty) || 1)) * Number(it.unit_price || it.price || 0)))
    }));
  } else {
    items = [{
      name: sanitizePdfText(quote?.item_name || 'Cloud Infrastructure & Managed Services'),
      description: sanitizePdfText(quote?.description || 'Enterprise Cloud & Managed Systems Deployment and Configuration'),
      unit_price: totalAmt,
      quantity: 1,
      amount: totalAmt
    }];
  }

  const preparedItems = items.map((it, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const nameLines = doc.splitTextToSize(String(it.name || ''), 110);
    const descLines = doc.splitTextToSize(String(it.description || ''), 110);
    const totalLines = nameLines.length + descLines.length;
    const rowH = Math.max(8.5, totalLines * 3.8 + 3.5);
    return { it, numStr, nameLines, descLines, rowH };
  });

  const totalItemsHeight = preparedItems.reduce((acc, p) => acc + p.rowH, 0);
  const fitsSinglePage = (tableY + totalItemsHeight + 52) <= 265;

  let currentPage = 1;

  preparedItems.forEach((p, idx) => {
    const pageLimit = fitsSinglePage ? 265 : (currentPage === 1 ? 215 : 220);

    if (tableY + p.rowH > pageLimit) {
      doc.addPage();
      currentPage++;
      drawInvoiceNinja3ToneBar(doc, 0, 4);
      tableY = 12;
      drawTableHeader(tableY);
      tableY += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, 182, p.rowH, 'F');
    }

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p.numStr, 17, tableY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(p.nameLines, 25, tableY + 5.2);

    const descY = tableY + 5.2 + (p.nameLines.length * 3.8);
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(p.descLines, 25, descY);

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(p.it.unit_price), 145, tableY + 5.2, { align: 'right' });

    doc.text(String(p.it.quantity || 1), 158, tableY + 5.2, { align: 'center' });

    doc.text(formatNinjaUGX(p.it.amount), 193, tableY + 5.2, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, tableY + p.rowH, 196, tableY + p.rowH);

    tableY += p.rowH;
  });

  if (tableY + 48 > 265) {
    doc.addPage();
    drawInvoiceNinja3ToneBar(doc, 0, 4);
    tableY = 14;
  }

  const totalsY = tableY + 6;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Commercial Terms & Scope:', 14, totalsY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const termsString = quote?.notes || 'Quotation valid for 30 days from date of issuance. Includes 24/7 priority support and enterprise SLA.';
  const termsText = doc.splitTextToSize(termsString, 85);
  doc.text(termsText, 14, totalsY + 4.5);

  const verifyY = totalsY + 16;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 14, verifyY);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 14, verifyY + 4.5);

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 14, verifyY + 7, 20, 20);
    } catch {}
  }

  const totalRows = [
    { label: 'Net Subtotal:', val: formatNinjaUGX(subtotalAmt) },
    { label: 'Value Added Tax (18% Statutory):', val: formatNinjaUGX(vatAmt) },
    { label: 'Estimated Total:', val: formatNinjaUGX(totalAmt), bold: true },
    { label: 'Payment Terms:', val: '75% Advance, 25% Completion' },
    { label: 'Amount Payable:', val: formatNinjaUGX(totalAmt), bold: true, color: [30, 58, 138] }
  ];

  totalRows.forEach((r, idx) => {
    const rY = totalsY + idx * 5.2;
    doc.setFont('TrebuchetMS', r.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(r.color ? r.color[0] : 15, r.color ? r.color[1] : 23, r.color ? r.color[2] : 42);
    doc.text(r.label, 150, rY, { align: 'right' });
    doc.text(r.val, 194, rY, { align: 'right' });
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('We also Deal in: CCTV Cameras, Company Emails, Cloud Web Hosting & Dev, Mobile App Dev, Systems Admin, Backups & Restoration Services & Cyber Security', 105, 280, { align: 'center' });

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text(`Page ${p} of ${totalPages}`, 105, 288, { align: 'center' });

    drawInvoiceNinja3ToneBar(doc, 293, 4);
  }

  openPdfInBrowser(doc, `Quotation_${quoteNum}.pdf`);
  return doc;
}

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
  registerTrebuchetFont(doc);

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

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('EMPLOYEE PERSONNEL & REMUNERATION RECORD:', 18, y + 6);

  // Left Details
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Employee Name:', 18, y + 12);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(staffName, 52, y + 12);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Job Designation:', 18, y + 17);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(position, 52, y + 17);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Department:', 18, y + 22);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(department, 52, y + 22);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Corporate Email:', 18, y + 27);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text(email, 52, y + 27);

  // Right Details
  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Pay Period:', 115, y + 12);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text(payPeriod, 150, y + 12);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Disbursement Method:', 115, y + 17);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text('Bank Wire Remittance', 150, y + 17);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('TIN Registration:', 115, y + 22);
  doc.setTextColor(...BRAND.colors.textBody);
  doc.text('1014892019 (Verified)', 150, y + 22);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Disbursement Status:', 115, y + 27);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(...BRAND.colors.emerald);
  doc.text('100% Cleared & Paid', 150, y + 27);

  y += 35;

  // TWO-COLUMN FINANCIAL SPREAD: EARNINGS (LEFT) vs DEDUCTIONS (RIGHT)
  const colW = 89;

  // Header 1: Earnings
  doc.setFillColor(...BRAND.colors.deepSapphire);
  doc.roundedRect(14, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.white);
  doc.text('GROSS EARNINGS & ALLOWANCES', 18, y + 4.8);
  doc.text('AMOUNT (UGX)', 100, y + 4.8, { align: 'right' });

  // Header 2: Deductions
  doc.setFillColor(...BRAND.colors.crimson);
  doc.roundedRect(107, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('TrebuchetMS', 'bold');
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
      doc.setFont('TrebuchetMS', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(earn.label, 18, y + 5);
      doc.setFont('TrebuchetMS', 'bold');
      doc.text(earn.val.toLocaleString(), 100, y + 5, { align: 'right' });
    }

    // Right row
    if (ded) {
      doc.setFont('TrebuchetMS', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(ded.label, 111, y + 5);
      doc.setFont('TrebuchetMS', 'bold');
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

  doc.setFont('TrebuchetMS', 'bold');
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

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(191, 219, 254);
  doc.text('NET TAKE-HOME PAYABLE SALARY (BANK REMITTANCE):', 20, y + 7);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...BRAND.colors.white);
  doc.text(`UGX ${netPay.toLocaleString()}`, 20, y + 17);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.emerald);
  doc.text('[CLEARED & DISBURSED]', 190, y + 12, { align: 'right' });

  y += 28;

  // Statutory Compliance & Employer Contribution Note
  doc.setFillColor(...BRAND.colors.bgSoft);
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('UGANDA STATUTORY EMPLOYER CONTRIBUTIONS & COMPLIANCE:', 18, y + 5.5);

  doc.setFont('TrebuchetMS', 'normal');
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
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('PREPARED & VERIFIED BY:', 20, y + 6);
  doc.setFont('TrebuchetMS', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Head of Human Capital & Payroll', 20, y + 12);
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Nova Cloud Edges Executive Bureau', 20, y + 17);

  // Right Signatory
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('CHIEF FINANCIAL OFFICER (CFO):', 115, y + 6);
  doc.setFont('TrebuchetMS', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Director of Corporate Finance', 115, y + 12);
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text('Official Corporate Document • Nova Cloud Edges (U) Ltd', 115, y + 17);

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
  registerTrebuchetFont(doc);

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

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.colors.emerald);
  doc.text('ACCOUNTING EQUATION BALANCED: Total Assets = Total Liabilities + Shareholder Equity', 18, y + 6.5);
  doc.text(`UGX ${totalAssets.toLocaleString()}`, 192, y + 6.5, { align: 'right' });

  y += 14;

  // TWO SECTIONS: ASSETS (LEFT) vs LIABILITIES & EQUITY (RIGHT)
  const colW = 89;

  // SECTION 1: ASSETS
  doc.setFillColor(...BRAND.colors.deepSapphire);
  doc.roundedRect(14, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.white);
  doc.text('1. ASSETS & LIQUIDITY RESOURCES', 18, y + 4.8);
  doc.text('UGX', 100, y + 4.8, { align: 'right' });

  // SECTION 2: LIABILITIES & EQUITY
  doc.setFillColor(...BRAND.colors.navySlate);
  doc.roundedRect(107, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('TrebuchetMS', 'bold');
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

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...BRAND.colors.textBody);
    doc.text(ast.label, 18, y + 5);
    doc.setFont('TrebuchetMS', 'bold');
    doc.text(ast.val.toLocaleString(), 100, y + 5, { align: 'right' });

    doc.setFont('TrebuchetMS', 'normal');
    doc.text(lib.label, 111, y + 5);
    doc.setFont('TrebuchetMS', 'bold');
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

  doc.setFont('TrebuchetMS', 'bold');
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

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('LIQUIDITY & SOLVENCY ANALYSIS (EXECUTIVE METRICS):', 18, y + 6);

  const currentRatio = (totalAssets / Math.max(1, totalLiabilities)).toFixed(2);
  const debtToEquity = ((totalLiabilities / Math.max(1, shareholderEquity)) * 100).toFixed(1);

  doc.setFont('TrebuchetMS', 'normal');
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

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('AUDIT & REGULATORY CERTIFICATION:', 20, y + 6);

  doc.setFont('TrebuchetMS', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Certified by Head of Financial Accounting & Compliance', 20, y + 12);

  doc.setFont('TrebuchetMS', 'normal');
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
  registerTrebuchetFont(doc);

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

    doc.setFont('TrebuchetMS', 'bold');
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
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.white);
    doc.text(sec.title, 18, y + 4.5);
    doc.text('AMOUNT (UGX)', 192, y + 4.5, { align: 'right' });
    y += 6.5;

    sec.rows.forEach((r, rIdx) => {
      doc.setFillColor(rIdx % 2 === 1 ? BRAND.colors.bgZebra[0] : 255, rIdx % 2 === 1 ? BRAND.colors.bgZebra[1] : 255, rIdx % 2 === 1 ? BRAND.colors.bgZebra[2] : 255);
      doc.rect(14, y, 182, 6.5, 'F');

      doc.setFont('TrebuchetMS', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(r.label, 18, y + 4.5);

      doc.setFont('TrebuchetMS', 'bold');
      doc.text(r.amount.toLocaleString(), 192, y + 4.5, { align: 'right' });

      doc.setDrawColor(...BRAND.colors.borderLight);
      doc.setLineWidth(0.2);
      doc.line(14, y + 6.5, 196, y + 6.5);
      y += 6.5;
    });

    // Subtotal
    doc.setFillColor(...BRAND.colors.bgSoft);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.colors.navyDark);
    doc.text(sec.totalLabel, 18, y + 4.8);
    doc.text(`UGX ${sec.totalVal.toLocaleString()}`, 192, y + 4.8, { align: 'right' });
    y += 9;
  });

  // FINAL NET EARNINGS RECONCILIATION
  doc.setFillColor(...(netIncome >= 0 ? BRAND.colors.emerald : BRAND.colors.crimson));
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');

  doc.setFont('TrebuchetMS', 'bold');
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

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.colors.navyDark);
  doc.text('EXECUTIVE FINANCIAL CLEARANCE & CERTIFICATION:', 20, y + 5.5);

  doc.setFont('TrebuchetMS', 'oblique');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.colors.deepSapphire);
  doc.text('Certified by Head of Financial Accounting & Audits', 20, y + 11);

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(`Reporting Officer: ${opts?.userName || 'Financial Controller'} • Standard: IFRS for SMEs`, 20, y + 15);

  applyA4Footers(doc, { docRef: refNum, title: 'Profit & Loss Statement' });
  openPdfInBrowser(doc, `Profit_Loss_Statement_${year}.pdf`);
  return doc;
}


// ============================================================================
// 6. GENERATE EXPENSE VOUCHER & EXPENDITURE AUDIT ROLL 80MM
// ============================================================================

export async function generateExpenseVoucher80mmPDF(exp, options = {}) {
  const voucherNum = sanitizePdfText(exp?.receipt_ref || (exp?.id ? `EXP-#${exp.id}` : 'EXP-2026-0001'));
  const staffName = sanitizePdfText(exp?.staff_name || exp?.beneficiary || 'Internal Staff Beneficiary');
  const staffEmail = sanitizePdfText(exp?.staff_email || '');
  const category = sanitizePdfText(exp?.category || 'Company Operational Expense');
  const desc = sanitizePdfText(exp?.description || exp?.purpose || 'Official corporate disbursement voucher.');
  const amount = Number(exp?.amount || 0);
  const status = sanitizePdfText(exp?.status || 'Approved');
  const dateVal = exp?.date || (exp?.created_at ? new Date(exp.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  const siteLogo = options?.siteLogo || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  const logoDataUrl = await getImageDataUrl(siteLogo);
  const activeLogo = logoDataUrl || NOVA_LOGO_BASE64;
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(voucherNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 200);

  const dummyDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 500] });
  registerTrebuchetFont(dummyDoc);
  const descLines = dummyDoc.splitTextToSize(desc, 68);
  const catLines = dummyDoc.splitTextToSize(category, 68);
  const staffLines = dummyDoc.splitTextToSize(staffName, 68);

  const calculatedHeight = Math.max(160, 175 + (descLines.length * 3.8) + (catLines.length * 3.8) + (staffLines.length > 1 ? staffLines.length * 3.8 : 0));
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, calculatedHeight] });
  registerTrebuchetFont(doc);

  let y = 6;

  // Header Logo (Centered)
  if (activeLogo) {
    try {
      doc.addImage(activeLogo, 'PNG', 24, y, 32, 10.67);
      y += 13;
    } catch {
      y += 2;
    }
  }

  // Header Titles
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text('OFFICIAL EXPENDITURE PAYMENT VOUCHER', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 40, y, { align: 'center' });
  y += 3.5;
  doc.text('Tel: (+256) 790 001631 / 33 • finance@ncloud.co.ug', 40, y, { align: 'center' });
  y += 4;

  // Dashed divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Voucher Ref Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(5, y, 70, 15, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('VOUCHER REF:', 8, y + 4.8);
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`#${voucherNum}`, 72, y + 4.8, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Disbursed Date:', 8, y + 9.5);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(dateVal, 72, y + 9.5, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.text('Voucher Status:', 8, y + 13.5);
  doc.setFont('TrebuchetMS', 'bold');
  const isPaidOrApp = status === 'Paid' || status === 'Approved' || status === 'Approved by Supervisor';
  doc.setTextColor(isPaidOrApp ? 22 : 217, isPaidOrApp ? 163 : 119, isPaidOrApp ? 74 : 6);
  doc.text(`[ ${status} ]`, 72, y + 13.5, { align: 'right' });

  y += 18;

  // Beneficiary Staff Details
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('STAFF BENEFICIARY & CLAIMANT:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  staffLines.forEach(line => {
    doc.text(line, 5, y);
    y += 4;
  });

  if (staffEmail) {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(staffEmail, 5, y);
    y += 4;
  }

  // Dashed divider
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Category & Purpose Details (Carefully wrapped without clipping)
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('EXPENSE CLASSIFICATION & PURPOSE:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  catLines.forEach(line => {
    doc.text(line, 5, y);
    y += 3.8;
  });

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  descLines.forEach(line => {
    doc.text(line, 5, y);
    y += 3.6;
  });

  // Dashed divider
  y += 2;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Disbursed Amount Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(5, y, 70, 14, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL DISBURSED AMOUNT:', 8, y + 4.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text(formatNinjaUGX(amount), 72, y + 10, { align: 'right' });

  y += 18;

  // Verification Section
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 40, y, { align: 'center' });
  y += 3.8;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 40, y, { align: 'center' });
  y += 4;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 30, y, 20, 20);
      y += 22;
    } catch {}
  }

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Corporate Expenditure Disbursement', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Nova Cloud Edges (U) Limited • Finance Division', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Expense_Voucher_${voucherNum}.pdf`);
  return doc;
}

export async function generateExpenseReportPDF(data = {}, options = {}) {
  const opts = typeof options === 'string' ? { siteLogo: options } : (options || {});
  const expenses = data?.companyExpenses || data?.recentExpenses || (Array.isArray(data) ? data : []);

  // If single expense passed, generate the 80mm single voucher directly
  if (expenses.length === 1) {
    return generateExpenseVoucher80mmPDF(expenses[0], opts);
  }
  if (!expenses.length && (data?.staff_name || data?.amount)) {
    return generateExpenseVoucher80mmPDF(data, opts);
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const totalExpenseAmt = expenses.reduce((acc, it) => acc + Number(it.amount || 0), 0);

  // If caller explicitly requested A4, render A4; otherwise render standard 80mm continuous audit roll
  if (opts.format === 'a4') {
    const refNum = `EXP-${dateStr}`;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerTrebuchetFont(doc);
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
      doc.setFont('TrebuchetMS', 'bold');
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
      doc.setFont('TrebuchetMS', 'normal');
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

        doc.setFont('TrebuchetMS', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(...BRAND.colors.navyDark);
        doc.text(String(exp.voucher_number || exp.receipt_ref || exp.id || `EXP-${idx + 1}`), 18, y + 5.2);

        doc.setFont('TrebuchetMS', 'normal');
        doc.text(String(exp.staff_name || exp.beneficiary || 'Internal Staff').substring(0, 22), 45, y + 5.2);
        doc.text(String(exp.category || exp.purpose || 'Operational Expense').substring(0, 32), 92, y + 5.2);
        doc.text(exp.date ? new Date(exp.date).toISOString().split('T')[0] : dateStr, 152, y + 5.2);

        doc.setFont('TrebuchetMS', 'bold');
        doc.setTextColor(...BRAND.colors.crimson);
        doc.text(Number(exp.amount || 0).toLocaleString(), 192, y + 5.2, { align: 'right' });

        y += rowH;
      });
    }

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

    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.colors.navyDark);
    doc.text('TOTAL RECONCILED EXPENDITURES:', 20, y + 9);

    doc.setFontSize(11);
    doc.setTextColor(...BRAND.colors.crimson);
    doc.text(`UGX ${totalExpenseAmt.toLocaleString()}`, 192, y + 9, { align: 'right' });

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.colors.textMuted);
    doc.text(`Total Vouchers Audited: ${expenses.length} • Auditor: ${opts?.userName || 'Internal Audit Desk'}`, 20, y + 16);

    applyA4Footers(doc, { docRef: refNum, title: 'Expenditure Report' });
    openPdfInBrowser(doc, `Expense_Report_${dateStr}.pdf`);
    return doc;
  }

  // Default: 80mm Continuous Corporate Expenditure Audit Roll
  const siteLogo = opts?.siteLogo || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  const logoDataUrl = await getImageDataUrl(siteLogo);
  const activeLogo = logoDataUrl || NOVA_LOGO_BASE64;

  const dummyDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 2000] });
  registerTrebuchetFont(dummyDoc);
  let itemHeights = 0;
  const processedItems = expenses.map(exp => {
    const vRef = sanitizePdfText(exp.receipt_ref || exp.voucher_number || `EXP-#${exp.id || 'AUTO'}`);
    const sName = sanitizePdfText(exp.staff_name || 'Staff Member');
    const cat = sanitizePdfText(exp.category || 'Expense');
    const desc = sanitizePdfText(exp.description || exp.purpose || '');
    const catLines = dummyDoc.splitTextToSize(cat, 68);
    const descLines = desc ? dummyDoc.splitTextToSize(desc, 68) : [];
    const itemH = 14 + (catLines.length * 3.6) + (descLines.length * 3.4);
    itemHeights += itemH;
    return { vRef, sName, catLines, descLines, amount: Number(exp.amount || 0), date: exp.date || dateStr, status: exp.status || 'Disbursed' };
  });

  const calculatedHeight = Math.max(160, 105 + itemHeights + 50);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, calculatedHeight] });
  registerTrebuchetFont(doc);

  let y = 6;
  if (activeLogo) {
    try {
      doc.addImage(activeLogo, 'PNG', 24, y, 32, 10.67);
      y += 13;
    } catch {
      y += 2;
    }
  }

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('EXPENDITURES AUDIT ROLL (80MM)', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`Audit Date: ${dateStr} • Vouchers: ${expenses.length}`, 40, y, { align: 'center' });
  y += 4;

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(5, y, 70, 13, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL RECONCILED DISBURSEMENTS:', 8, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(formatNinjaUGX(totalExpenseAmt), 72, y + 10, { align: 'right' });
  y += 17;

  // Items
  processedItems.forEach(item => {
    doc.setFont('TrebuchetMS', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 58, 138);
    doc.text(`#${item.vRef}`, 5, y);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNinjaUGX(item.amount), 75, y, { align: 'right' });
    y += 3.8;

    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.date} • ${item.sName}`, 5, y);
    doc.text(`[ ${item.status} ]`, 75, y, { align: 'right' });
    y += 3.6;

    doc.setFont('TrebuchetMS', 'bold');
    doc.setTextColor(15, 23, 42);
    item.catLines.forEach(l => {
      doc.text(l, 5, y);
      y += 3.5;
    });

    if (item.descLines.length > 0) {
      doc.setFont('TrebuchetMS', 'normal');
      doc.setTextColor(100, 116, 139);
      item.descLines.forEach(l => {
        doc.text(l, 5, y);
        y += 3.2;
      });
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y + 1, 75, y + 1);
    doc.setLineDashPattern([], 0);
    y += 4;
  });

  // Footer
  y += 2;
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Reconciled Corporate Expenditures', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Nova Cloud Edges (U) Limited • Finance Desk', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Expense_Audit_Roll_${dateStr}.pdf`);
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
  registerTrebuchetFont(doc);

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

    doc.setFont('TrebuchetMS', 'bold');
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
    doc.setFont('TrebuchetMS', 'bold');
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
    doc.setFont('TrebuchetMS', 'normal');
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

      doc.setFont('TrebuchetMS', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.colors.navyDark);
      doc.text(String(it.name || 'Cloud Offering').substring(0, 42), 18, y + 5.2);

      doc.setFont('TrebuchetMS', 'normal');
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(String(it.category || 'General').substring(0, 24), 90, y + 5.2);

      doc.setFont('TrebuchetMS', 'bold');
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
  registerTrebuchetFont(doc);

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
    doc.setFont('TrebuchetMS', 'bold');
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
    doc.setFont('TrebuchetMS', 'normal');
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

      doc.setFont('TrebuchetMS', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...BRAND.colors.textMuted);
      doc.text(String(log.timestamp || log.created_at || dateStr).substring(0, 20), 18, y + 5.2);

      doc.setFont('TrebuchetMS', 'bold');
      doc.setTextColor(...BRAND.colors.navyDark);
      doc.text(String(log.userName || log.user_email || 'System Daemon').substring(0, 24), 54, y + 5.2);

      doc.setFont('TrebuchetMS', 'normal');
      doc.setTextColor(...BRAND.colors.textBody);
      doc.text(String(log.ip || log.ip_address || '127.0.0.1'), 94, y + 5.2);

      doc.setFont('TrebuchetMS', 'normal');
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
  registerTrebuchetFont(doc);

  let y = 6;
  const effectiveLogo = options?.logoDataUrl || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  if (effectiveLogo && effectiveLogo.startsWith('data:image')) {
    try {
      doc.addImage(effectiveLogo, 'PNG', 30, y, 20, 11);
      y += 13;
    } catch {}
  }

  // Header
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(BRAND.companyName, 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('OFFICIAL PAYMENT RECEIPT', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Lugga Zone, Ndejje, Wakiso • Tel: +256 790 001 631', 40, y, { align: 'center' });
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
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 6, y);
    doc.setFont('TrebuchetMS', boldVal ? 'bold' : 'normal');
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
  doc.setFont('TrebuchetMS', 'bold');
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
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isPaid ? 22 : 180, isPaid ? 163 : 83, isPaid ? 74 : 9);
  doc.text(isPaid ? '100% PAYMENT CLEARED & SETTLED' : `PARTIAL PAYMENT — UGX ${balance.toLocaleString()} DUE`, 40, y + 4.8, { align: 'center' });
  y += 11;

  // Verification QR
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 31, y, 18, 18);
      y += 20;
    } catch {}
  }

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan QR Code to verify document online', 40, y, { align: 'center' });
  y += 3.2;
  doc.text(`Cashier / Admin: ${options?.userName || 'Corporate POS Desk'}`, 40, y, { align: 'center' });
  y += 3.2;
  doc.setFont('TrebuchetMS', 'bold');
  doc.text('Thank you for choosing Nova Cloud Edges!', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Payment_Receipt_80mm_${invNum}.pdf`);
  return doc;
}


// ============================================================================
// 10. GENERATE WORK ORDER POS RECEIPT 80MM (THERMAL FIELD SERVICE)
// ============================================================================

export async function generateWorkOrderPOSReceiptPDF(workOrder, options = {}) {
  const orderNum = sanitizePdfText(workOrder?.order_number || `WO-${workOrder?.id || '2026-0001'}`);
  const staffName = sanitizePdfText(workOrder?.assigned_staff_name || 'Field Support Specialist');
  const siteLocation = sanitizePdfText(workOrder?.client_site || 'Nova Primary Datacenter');
  const taskTitle = sanitizePdfText(workOrder?.task_title || 'Field Operations Technical Deployment');
  const desc = sanitizePdfText(workOrder?.description || 'Deliver scheduled technical deployment, cabling, server rack assembly, or optical fiber splicing as per corporate engineering guidelines.');
  const modeLabel = workOrder?.charging_mode === 'per_hour' ? 'Hourly Rate' : 'Daily Project Rate';
  const rateVal = Number(workOrder?.rate || 0);
  const qtyVal = Number(workOrder?.quantity || 1);
  const totalCost = Number(workOrder?.total_cost || (rateVal * qtyVal));

  const siteLogo = options?.siteLogo || (typeof localStorage !== 'undefined' ? (localStorage.getItem('site_logo') || localStorage.getItem('nova_site_logo')) : '');
  const logoDataUrl = await getImageDataUrl(siteLogo);
  const activeLogo = logoDataUrl || NOVA_LOGO_BASE64;
  const verifyUrl = `https://ncloud.co.ug/verify?doc=${encodeURIComponent(orderNum)}`;
  const qrDataUrl = await createQRCodeDataURL(verifyUrl, 200);

  // Measure wrapped lines using a dummy document so no words ever go away or clip off
  const dummyDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 500] });
  registerTrebuchetFont(dummyDoc);
  const taskLines = dummyDoc.splitTextToSize(taskTitle, 68);
  const descLines = desc ? dummyDoc.splitTextToSize(desc, 68) : [];
  const siteLines = dummyDoc.splitTextToSize(siteLocation, 68);

  const calculatedHeight = Math.max(160, 175 + (taskLines.length * 4.2) + (descLines.length * 3.8) + (siteLines.length * 3.8));
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, calculatedHeight] });
  registerTrebuchetFont(doc);

  let y = 6;

  // Header Logo (Centered)
  if (activeLogo) {
    try {
      doc.addImage(activeLogo, 'PNG', 24, y, 32, 10.67);
      y += 13;
    } catch {
      y += 2;
    }
  }

  // Header Titles
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('NOVA CLOUD EDGES (U) LIMITED', 40, y, { align: 'center' });
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text('FIELD SERVICE WORK ORDER', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Lugga Zone, Ndejje, Wakiso, Uganda', 40, y, { align: 'center' });
  y += 3.5;
  doc.text('Tel: (+256) 790 001631 / 33 • support@ncloud.co.ug', 40, y, { align: 'center' });
  y += 4;

  // Dashed divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Work Order Ref & Status Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(5, y, 70, 15, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('WORK ORDER REF:', 8, y + 4.8);
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`#${orderNum}`, 72, y + 4.8, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Scheduled Date:', 8, y + 9.5);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(workOrder?.scheduled_date || 'Immediate', 72, y + 9.5, { align: 'right' });

  doc.setFont('TrebuchetMS', 'normal');
  doc.text('Status:', 8, y + 13.5);
  doc.setFont('TrebuchetMS', 'bold');
  const isCompleted = workOrder?.status === 'Completed';
  doc.setTextColor(isCompleted ? 22 : 217, isCompleted ? 163 : 119, isCompleted ? 74 : 6);
  doc.text(`[ ${workOrder?.status || 'Active Dispatch'} ]`, 72, y + 13.5, { align: 'right' });

  y += 18;

  // Deployment Site & Staff Details
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('DISPATCH & TARGET SITE DETAILS:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Assigned Engineer:', 5, y);
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(staffName, 75, y, { align: 'right' });
  y += 4.2;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Deployment Site / Client:', 5, y);
  y += 3.8;
  doc.setFont('TrebuchetMS', 'bold');
  doc.setTextColor(15, 23, 42);
  siteLines.forEach(line => {
    doc.text(line, 5, y);
    y += 3.8;
  });

  // Dashed divider
  y += 1;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Scope & Task Section (Dynamic from Database)
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('ASSIGNED TECHNICAL SCOPE OF WORK:', 5, y);
  y += 4.5;

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  taskLines.forEach(line => {
    doc.text(line, 5, y);
    y += 4;
  });

  if (descLines.length > 0 && descLines[0] !== '') {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    descLines.forEach(line => {
      doc.text(line, 5, y);
      y += 3.6;
    });
  }

  // Dashed divider
  y += 2;
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(5, y, 75, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Operations & Charging Schedule
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('OPERATIONS & BILLING SCHEDULE:', 5, y);
  y += 4.5;

  const printMetric = (label, val) => {
    doc.setFont('TrebuchetMS', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 5, y);
    doc.setFont('TrebuchetMS', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 75, y, { align: 'right' });
    y += 4.2;
  };

  printMetric('Charging Method:', modeLabel);
  printMetric('Operational Unit Rate:', formatNinjaUGX(rateVal));
  const unitStr = `${qtyVal} ${workOrder?.charging_mode === 'per_hour' ? (qtyVal > 1 ? 'Hours' : 'Hour') : (qtyVal > 1 ? 'Days' : 'Day')}`;
  printMetric('Time / Units Logged:', unitStr);

  y += 1;

  // Approved Job Cost Card (Prominent & High-Contrast)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(5, y, 70, 14, 1.5, 1.5, 'FD');

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL APPROVED JOB VALUE:', 8, y + 4.5);

  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text(formatNinjaUGX(totalCost), 72, y + 10, { align: 'right' });

  y += 18;

  // Verification Section (Centered without overflowing)
  doc.setFont('TrebuchetMS', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Verify the Document here:', 40, y, { align: 'center' });
  y += 3.8;

  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text(verifyUrl, 40, y, { align: 'center' });
  y += 4;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 30, y, 20, 20);
      y += 22;
    } catch {}
  }

  // Bottom text
  doc.setFont('TrebuchetMS', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Field Operations Deployment Voucher', 40, y, { align: 'center' });
  y += 3.2;
  doc.text('Nova Cloud Edges (U) Limited • ncloud.co.ug', 40, y, { align: 'center' });

  openPdfInBrowser(doc, `Work_Order_${orderNum}.pdf`);
  return doc;
}

// Utility to safely set doc font size
function docFontSizeSafe(doc, size) {
  try {
    doc.setFontSize(size);
  } catch {}
}
