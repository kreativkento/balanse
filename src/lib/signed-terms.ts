import { jsPDF } from 'jspdf';
import {
  TC_DOCUMENT_TITLE,
  TC_LAST_UPDATED,
  TERMS_BLOCKS,
} from '../app/data/termsAndConditions';

export interface SignedTermsRecord {
  email: string;
  signerName: string;
  signedAt: string;
  signatureDataUrl: string;
  pdfDataUrl: string;
  fileName: string;
}

const STORAGE_PREFIX = 'balanse-signed-terms:';

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

export function getSignedTermsRecord(email: string | undefined | null): SignedTermsRecord | null {
  if (!email || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SignedTermsRecord;
    if (!parsed?.pdfDataUrl || parsed.email?.toLowerCase() !== email.trim().toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSignedTermsRecord(record: SignedTermsRecord) {
  localStorage.setItem(storageKey(record.email), JSON.stringify(record));
}

function fileNameFor(signerName: string, signedAt: Date) {
  const safe = signerName.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'member';
  const date = signedAt.toISOString().slice(0, 10);
  return `Balanse-Terms-${safe}-${date}.pdf`;
}

export async function generateAndSaveSignedTermsPdf(input: {
  email: string;
  signerName: string;
  signatureDataUrl: string;
  signedAt?: Date;
}): Promise<SignedTermsRecord> {
  const signedAt = input.signedAt ?? new Date();
  const pdfDataUrl = await buildSignedTermsPdfDataUrl({
    email: input.email,
    signerName: input.signerName,
    signatureDataUrl: input.signatureDataUrl,
    signedAt,
  });
  const record: SignedTermsRecord = {
    email: input.email.trim().toLowerCase(),
    signerName: input.signerName,
    signedAt: signedAt.toISOString(),
    signatureDataUrl: input.signatureDataUrl,
    pdfDataUrl,
    fileName: fileNameFor(input.signerName, signedAt),
  };
  saveSignedTermsRecord(record);
  return record;
}

export function downloadSignedTermsPdf(record: SignedTermsRecord) {
  const link = document.createElement('a');
  link.href = record.pdfDataUrl;
  link.download = record.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function buildSignedTermsPdfDataUrl(input: {
  email: string;
  signerName: string;
  signatureDataUrl: string;
  signedAt: Date;
}): Promise<string> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 54;
  const marginTop = 52;
  const marginBottom = 56;
  const maxW = pageW - marginX * 2;
  const navy: [number, number, number] = [30, 42, 53];
  const gold: [number, number, number] = [196, 154, 60];
  const body: [number, number, number] = [90, 80, 72];
  let y = marginTop;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  const signedLabel = input.signedAt.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  doc.setFillColor(...gold);
  doc.rect(0, 0, pageW, 8, 'F');

  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(TC_DOCUMENT_TITLE, marginX, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...body);
  doc.text(`Last updated: ${TC_LAST_UPDATED}`, marginX, y);
  y += 16;

  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.text('Signed by', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...body);
  doc.text(`${input.signerName}  ·  ${input.email}`, marginX + 62, y);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('Signed on', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...body);
  doc.text(signedLabel, marginX + 62, y);
  y += 22;

  for (const block of TERMS_BLOCKS) {
    if (block.type === 'heading') {
      ensureSpace(28);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...navy);
      const lines = doc.splitTextToSize(block.text, maxW) as string[];
      doc.text(lines, marginX, y);
      y += lines.length * 15 + 6;
      continue;
    }

    if (block.type === 'labelValue') {
      ensureSpace(16);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(`${block.label}:`, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...body);
      doc.text(block.value, marginX + 110, y);
      y += 14;
      continue;
    }

    if (block.type === 'paragraph') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...body);
      const lines = doc.splitTextToSize(block.text, maxW) as string[];
      ensureSpace(lines.length * 13 + 10);
      doc.text(lines, marginX, y);
      y += lines.length * 13 + 8;
      continue;
    }

    if (block.type === 'bullets') {
      for (const item of block.items) {
        const text = `${item.label} ${item.text}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...body);
        const lines = doc.splitTextToSize(text, maxW - 14) as string[];
        ensureSpace(lines.length * 13 + 8);
        doc.setFillColor(...gold);
        doc.circle(marginX + 3, y - 3, 2, 'F');
        doc.text(lines, marginX + 14, y);
        y += lines.length * 13 + 6;
      }
      y += 4;
      continue;
    }

    if (block.type === 'numbered') {
      block.items.forEach((item, i) => {
        const text = `${i + 1}. ${item}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...body);
        const lines = doc.splitTextToSize(text, maxW) as string[];
        ensureSpace(lines.length * 13 + 8);
        doc.text(lines, marginX, y);
        y += lines.length * 13 + 8;
      });
    }
  }

  ensureSpace(150);
  y += 8;
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text('Electronic Signature', marginX, y);
  y += 16;

  const sigW = 220;
  const sigH = 70;
  ensureSpace(sigH + 40);
  try {
    doc.addImage(input.signatureDataUrl, 'PNG', marginX, y, sigW, sigH, undefined, 'FAST');
  } catch {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...body);
    doc.text('[Signature image could not be embedded]', marginX, y + 24);
  }
  y += sigH + 10;

  doc.setDrawColor(212, 205, 181);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, marginX + sigW, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...body);
  const attest = `Electronically signed by ${input.signerName} (${input.email}) on ${signedLabel}. This document is the signed Balansé Terms & Conditions, Waiver & Release, and Media Release & Consent Statement.`;
  const attestLines = doc.splitTextToSize(attest, maxW) as string[];
  ensureSpace(attestLines.length * 12 + 8);
  doc.text(attestLines, marginX, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFillColor(...gold);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`BALANSÉ Wellness Hub  ·  Page ${i} of ${pageCount}`, marginX, pageH - 4);
  }

  return doc.output('datauristring');
}
