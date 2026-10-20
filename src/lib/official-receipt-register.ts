import { jsPDF } from 'jspdf';
import {
  DEFAULT_STUDIO_ADDRESS,
  DEFAULT_STUDIO_TIN,
} from './class-payment-receipt-html';
import { supabase } from './supabase';

export interface OfficialReceiptRegisterRow {
  id: string;
  source: 'drop_in' | 'credit_pack';
  officialReceiptNumber: string;
  issuedAt: string;
  memberName: string;
  /** Seller TIN printed on the receipt when a physical copy was requested. */
  tin: string | null;
  description: string;
  grossAmount: number;
  vatableSales: number | null;
  vatAmount: number | null;
  vatExemptSales: number | null;
  zeroRatedSales: number | null;
  gatewayRef: string;
  paymentMethod: string;
}

type ClassFinalRow = {
  id: string;
  official_receipt_number: string | null;
  uid: string;
  receipt_issued_at: string | null;
  finalized_at: string;
  buyer_name: string;
  seller_tin: string;
  service_description: string;
  amount_paid: number;
  vatable_sales: number | null;
  vat_amount: number | null;
  vat_exempt_sales: number | null;
  zero_rated_sales: number | null;
  payment_reference: string;
  payment_method_label: string;
  request_physical_receipt: boolean;
  classes: { name?: string } | { name?: string }[] | null;
};

type PackFinalRow = {
  id: string;
  official_receipt_number: string | null;
  uid: string;
  receipt_issued_at: string | null;
  finalized_at: string;
  buyer_name: string;
  seller_tin: string;
  service_description: string;
  package_name: string;
  amount_paid: number;
  vatable_sales: number | null;
  vat_amount: number | null;
  vat_exempt_sales: number | null;
  zero_rated_sales: number | null;
  payment_reference: string;
  payment_method_label: string;
  request_physical_receipt: boolean;
};

const CLASS_SELECT = `
  id,
  official_receipt_number,
  uid,
  receipt_issued_at,
  finalized_at,
  buyer_name,
  seller_tin,
  service_description,
  amount_paid,
  vatable_sales,
  vat_amount,
  vat_exempt_sales,
  zero_rated_sales,
  payment_reference,
  payment_method_label,
  request_physical_receipt,
  classes ( name )
`;

const PACK_SELECT = `
  id,
  official_receipt_number,
  uid,
  receipt_issued_at,
  finalized_at,
  buyer_name,
  seller_tin,
  service_description,
  package_name,
  amount_paid,
  vatable_sales,
  vat_amount,
  vat_exempt_sales,
  zero_rated_sales,
  payment_reference,
  payment_method_label,
  request_physical_receipt
`;

function money(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function tinIfRequested(requested: boolean, sellerTin: string): string | null {
  const tin = sellerTin.trim();
  if (!requested || !tin) return null;
  return tin;
}

function classNameFromJoin(join: ClassFinalRow['classes']): string {
  const row = Array.isArray(join) ? join[0] : join;
  return row?.name?.trim() ?? '';
}

function mapClassRow(row: ClassFinalRow): OfficialReceiptRegisterRow {
  const className = classNameFromJoin(row.classes);
  const description = className
    ? `Single Drop-In: ${className}`
    : row.service_description.trim() || 'Single drop-in class';
  return {
    id: `class:${row.id}`,
    source: 'drop_in',
    officialReceiptNumber: row.official_receipt_number?.trim() || row.uid,
    issuedAt: row.receipt_issued_at ?? row.finalized_at,
    memberName: row.buyer_name.trim() || 'Member',
    tin: tinIfRequested(row.request_physical_receipt, row.seller_tin),
    description,
    grossAmount: Number(row.amount_paid),
    vatableSales: money(row.vatable_sales),
    vatAmount: money(row.vat_amount),
    vatExemptSales: money(row.vat_exempt_sales),
    zeroRatedSales: money(row.zero_rated_sales),
    gatewayRef: row.payment_reference.trim(),
    paymentMethod: row.payment_method_label.trim(),
  };
}

function mapPackRow(row: PackFinalRow): OfficialReceiptRegisterRow {
  const packageName = row.package_name.trim();
  const description = packageName || row.service_description.trim() || 'Credit pack';
  return {
    id: `pack:${row.id}`,
    source: 'credit_pack',
    officialReceiptNumber: row.official_receipt_number?.trim() || row.uid,
    issuedAt: row.receipt_issued_at ?? row.finalized_at,
    memberName: row.buyer_name.trim() || 'Member',
    tin: tinIfRequested(row.request_physical_receipt, row.seller_tin),
    description,
    grossAmount: Number(row.amount_paid),
    vatableSales: money(row.vatable_sales),
    vatAmount: money(row.vat_amount),
    vatExemptSales: money(row.vat_exempt_sales),
    zeroRatedSales: money(row.zero_rated_sales),
    gatewayRef: row.payment_reference.trim(),
    paymentMethod: row.payment_method_label.trim(),
  };
}

export function formatVatBreakdown(row: OfficialReceiptRegisterRow): string {
  const parts: string[] = [];
  if (row.vatableSales != null) parts.push(`VATable ₱${row.vatableSales.toLocaleString()}`);
  if (row.vatAmount != null) parts.push(`VAT ₱${row.vatAmount.toLocaleString()}`);
  if (row.vatExemptSales != null) parts.push(`Exempt ₱${row.vatExemptSales.toLocaleString()}`);
  if (row.zeroRatedSales != null) parts.push(`Zero-rated ₱${row.zeroRatedSales.toLocaleString()}`);
  return parts.length > 0 ? parts.join(' · ') : 'Non-VAT';
}

export async function fetchOfficialReceiptRegister(): Promise<{
  data: OfficialReceiptRegisterRow[];
  error: string | null;
}> {
  const [classResult, packResult] = await Promise.all([
    supabase.from('final_transactions').select(CLASS_SELECT).order('finalized_at', { ascending: false }),
    supabase
      .from('subscription_package_final_transactions')
      .select(PACK_SELECT)
      .order('finalized_at', { ascending: false }),
  ]);

  if (classResult.error) {
    console.error('fetchOfficialReceiptRegister class:', classResult.error.message);
    return { data: [], error: classResult.error.message };
  }
  if (packResult.error) {
    console.error('fetchOfficialReceiptRegister pack:', packResult.error.message);
    return { data: [], error: packResult.error.message };
  }

  const rows = [
    ...((classResult.data ?? []) as ClassFinalRow[]).map(mapClassRow),
    ...((packResult.data ?? []) as PackFinalRow[]).map(mapPackRow),
  ].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  return { data: rows, error: null };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function downloadOfficialReceiptCsv(rows: OfficialReceiptRegisterRow[], issuedLabel: (iso: string) => string): void {
  const header = [
    'Official Receipt #',
    'Date Issued',
    'Member Name',
    'TIN',
    'Description',
    'Gross Amount',
    'VAT / Non-VAT',
    'Payment Gateway Ref',
    'Payment Method',
    'Source',
  ];
  const lines = [
    header.join(','),
    ...rows.map((row) => [
      row.officialReceiptNumber,
      issuedLabel(row.issuedAt),
      row.memberName,
      row.tin ?? '',
      row.description,
      row.grossAmount.toFixed(2),
      formatVatBreakdown(row),
      row.gatewayRef,
      row.paymentMethod,
      row.source === 'drop_in' ? 'Drop-in' : 'Credit pack',
    ].map((cell) => csvCell(String(cell))).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `or-register-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadOfficialReceiptPdf(rows: OfficialReceiptRegisterRow[], issuedLabel: (iso: string) => string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  rows.forEach((row, index) => {
    if (index > 0) doc.addPage();
    let y = 48;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BALANSÉ Wellness Hub', margin, y);
    y += 14;
    doc.setFontSize(11);
    const addressLines = doc.splitTextToSize(DEFAULT_STUDIO_ADDRESS, pageWidth - margin * 2);
    doc.text(addressLines, margin, y);
    y += addressLines.length * 14 + 4;
    doc.text(`TIN: ${DEFAULT_STUDIO_TIN}`, margin, y);
    y += 22;
    doc.setFontSize(14);
    doc.text('Official Receipt', margin, y);
    y += 24;
    doc.setFontSize(12);
    const memberTin = row.tin?.trim() ? row.tin.trim() : '—';
    const lines = [
      `Official Receipt #: ${row.officialReceiptNumber}`,
      `Date issued: ${issuedLabel(row.issuedAt)}`,
      `Member: ${row.memberName}`,
      `Member TIN (if provided): ${memberTin}`,
      `Description: ${row.description}`,
      `Gross amount: PHP ${row.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `VAT / Non-VAT: ${formatVatBreakdown(row)}`,
      `Payment gateway ref: ${row.gatewayRef || '—'}`,
      `Channel: ${row.paymentMethod || '—'}`,
      `Source: ${row.source === 'drop_in' ? 'Drop-in class' : 'Credit pack'}`,
    ];
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 18 + 6;
    }
  });

  doc.save(`or-register-${new Date().toISOString().slice(0, 10)}.pdf`);
}
