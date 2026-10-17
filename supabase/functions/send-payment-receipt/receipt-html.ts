/** Official class payment e-receipt HTML (email, print, and stored snapshot). */

export type ClassPaymentReceiptRow = {
  uid: string;
  buyer_name: string;
  buyer_email: string;
  buyer_address: string;
  seller_business_name: string;
  seller_address: string;
  seller_tin: string;
  service_description: string;
  class_starts_at: string | null;
  class_ends_at: string | null;
  payment_method_label: string;
  payment_reference: string;
  amount_paid: number;
  total_amount_due: number;
  unit_price: number;
  quantity: number;
  vatable_sales: number | null;
  vat_amount: number | null;
  vat_exempt_sales: number | null;
  zero_rated_sales: number | null;
  receipt_issued_at: string | null;
  class_name?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₱0.00';
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatManilaDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatClassSchedule(start: string | null, end: string | null): string {
  if (!start) return '—';
  const date = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(start));
  const timeStart = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(start));
  if (!end) return `${date} · ${timeStart}`;
  const timeEnd = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(end));
  return `${date} · ${timeStart} – ${timeEnd}`;
}

export function buildClassPaymentReceiptHtml(
  payment: ClassPaymentReceiptRow,
  siteUrl: string,
): string {
  const base = siteUrl.replace(/\/$/, '');
  const logoUrl = `${base}/logo_main.svg`;
  const issuedAt = formatManilaDateTime(payment.receipt_issued_at ?? new Date().toISOString());
  const classLabel = payment.class_name?.trim() || payment.service_description?.trim() || 'Class booking';
  const description = payment.service_description?.trim() || classLabel;
  const buyerAddress = payment.buyer_address?.trim() || '—';
  const sellerName = payment.seller_business_name?.trim() || 'BALANSÉ Wellness Hub';
  const sellerAddress = payment.seller_address?.trim() || '—';
  const sellerTin = payment.seller_tin?.trim() || '—';
  const method = payment.payment_method_label?.trim() || '—';
  const reference = payment.payment_reference?.trim() || payment.uid;
  const qty = payment.quantity ?? 1;
  const unit = formatMoney(payment.unit_price ?? payment.amount_paid);
  const total = formatMoney(payment.total_amount_due ?? payment.amount_paid);
  const amountPaid = formatMoney(payment.amount_paid);

  const vatBlock: string[] = [];
  if (payment.vatable_sales != null) {
    vatBlock.push(
      `<tr><td>VATable sales</td><td>${formatMoney(payment.vatable_sales)}</td></tr>`,
    );
  }
  if (payment.vat_amount != null) {
    vatBlock.push(`<tr><td>VAT amount (12%)</td><td>${formatMoney(payment.vat_amount)}</td></tr>`);
  }
  if (payment.vat_exempt_sales != null && payment.vat_exempt_sales > 0) {
    vatBlock.push(
      `<tr><td>VAT-exempt sales</td><td>${formatMoney(payment.vat_exempt_sales)}</td></tr>`,
    );
  }
  if (payment.zero_rated_sales != null && payment.zero_rated_sales > 0) {
    vatBlock.push(
      `<tr><td>Zero-rated sales</td><td>${formatMoney(payment.zero_rated_sales)}</td></tr>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Official Receipt ${escapeHtml(payment.uid)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #eceae4;
      font-family: "Courier New", Courier, monospace;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      max-width: 380px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #ccc;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 20px 18px 24px;
    }
    .logo-wrap { text-align: center; margin-bottom: 10px; }
    .logo-wrap img { width: 120px; height: auto; }
    .center { text-align: center; }
    .biz-name {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0 0 4px;
    }
    .muted { font-size: 11px; line-height: 1.45; color: #444; margin: 0; }
    .rule {
      border: none;
      border-top: 1px dashed #888;
      margin: 12px 0;
    }
    .rule-solid {
      border: none;
      border-top: 2px solid #1a1a1a;
      margin: 10px 0;
    }
    .or-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0 0 6px;
    }
    .meta { width: 100%; font-size: 11px; border-collapse: collapse; }
    .meta td { padding: 2px 0; vertical-align: top; }
    .meta td:last-child { text-align: right; font-weight: 700; }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #666;
      margin: 0 0 4px;
    }
    .buyer { font-size: 11px; line-height: 1.45; margin: 0 0 10px; }
    .items { width: 100%; font-size: 11px; border-collapse: collapse; margin: 8px 0; }
    .items th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #333;
      padding: 4px 0;
    }
    .items th:nth-child(2), .items th:nth-child(3), .items th:nth-child(4) { text-align: right; }
    .items td { padding: 6px 0; border-bottom: 1px dashed #ccc; vertical-align: top; }
    .items td:nth-child(2), .items td:nth-child(3), .items td:nth-child(4) { text-align: right; white-space: nowrap; }
    .totals { width: 100%; font-size: 11px; border-collapse: collapse; }
    .totals td { padding: 3px 0; }
    .totals td:last-child { text-align: right; font-weight: 600; }
    .grand {
      margin-top: 8px;
      padding: 10px 0 4px;
      border-top: 2px double #1a1a1a;
      border-bottom: 2px double #1a1a1a;
      text-align: center;
    }
    .grand-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
    .grand-amount { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .footer { font-size: 10px; text-align: center; color: #555; line-height: 1.5; margin-top: 14px; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="logo-wrap">
      <img src="${escapeHtml(logoUrl)}" alt="Balansé" />
    </div>
    <p class="center biz-name">${escapeHtml(sellerName)}</p>
    <p class="center muted">${escapeHtml(sellerAddress)}</p>
    <p class="center muted">TIN: ${escapeHtml(sellerTin)}</p>

    <hr class="rule-solid" />
    <p class="center or-title">Official receipt</p>
    <table class="meta" role="presentation">
      <tr><td>OR / SI No.</td><td>${escapeHtml(payment.uid)}</td></tr>
      <tr><td>Date &amp; time</td><td>${escapeHtml(issuedAt)}</td></tr>
    </table>

    <hr class="rule" />
    <p class="section-label">Sold to</p>
    <p class="buyer">
      <strong>${escapeHtml(payment.buyer_name || '—')}</strong><br />
      ${escapeHtml(payment.buyer_email || '')}<br />
      ${escapeHtml(buyerAddress)}
    </p>

    <p class="section-label">Service</p>
    <p class="buyer">
      <strong>${escapeHtml(classLabel)}</strong><br />
      ${escapeHtml(formatClassSchedule(payment.class_starts_at, payment.class_ends_at))}
    </p>

    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(description)}</td>
          <td>${qty}</td>
          <td>${unit}</td>
          <td>${total}</td>
        </tr>
      </tbody>
    </table>

    ${
      vatBlock.length
        ? `<table class="totals">${vatBlock.join('')}</table>`
        : ''
    }

    <div class="grand">
      <div class="grand-label">Amount paid</div>
      <div class="grand-amount">${amountPaid}</div>
    </div>

    <hr class="rule" />
    <table class="meta">
      <tr><td>Payment method</td><td>${escapeHtml(method)}</td></tr>
      <tr><td>Reference</td><td>${escapeHtml(reference)}</td></tr>
    </table>

    <p class="footer">
      THIS DOCUMENT IS VALID AS AN OFFICIAL RECEIPT FOR CLASS ENROLLMENT.<br />
      Thank you for choosing Balansé Wellness Hub.<br />
      ${escapeHtml(base)}
    </p>
  </div>
</body>
</html>`;
}
