import { jsPDF } from 'jspdf';
import {
  PRIVACY_BLOCKS,
  PRIVACY_DOCUMENT_TITLE,
  PRIVACY_LAST_UPDATED,
  PRIVACY_REQUIRES_REACCEPT,
  PRIVACY_VERSION,
} from '../app/data/privacyPolicy';
import {
  TC_DOCUMENT_TITLE,
  TC_LAST_UPDATED,
  TERMS_BLOCKS,
  TERMS_REQUIRES_REACCEPT,
  TERMS_VERSION,
  type TermsBlock,
} from '../app/data/termsAndConditions';
import {
  HEALTH_DOCUMENT_TITLE,
  HEALTH_FORM_LABEL,
  HEALTH_FORM_VERSION,
  HEALTH_QUESTIONS,
  HEALTH_REQUIRES_REACCEPT,
  parseHealthDeclaration,
  type HealthDeclarationFields,
} from './health-declaration';
import { supabase } from './supabase';

export const MEMBER_DOCUMENTS_BUCKET = 'member_documents';

export type MemberDocumentKind = 'terms' | 'privacy' | 'health';
export type MemberDocumentStatus = 'missing' | 'current' | 'reaccept_required' | 'accepted_legacy';

export type DocumentTemplateMeta = {
  version: string;
  label: string;
  requiresReaccept: boolean;
};

export const CURRENT_DOCUMENTS: Record<MemberDocumentKind, DocumentTemplateMeta> = {
  terms: {
    version: TERMS_VERSION,
    label: TC_LAST_UPDATED,
    requiresReaccept: TERMS_REQUIRES_REACCEPT,
  },
  privacy: {
    version: PRIVACY_VERSION,
    label: PRIVACY_LAST_UPDATED,
    requiresReaccept: PRIVACY_REQUIRES_REACCEPT,
  },
  health: {
    version: HEALTH_FORM_VERSION,
    label: HEALTH_FORM_LABEL,
    requiresReaccept: HEALTH_REQUIRES_REACCEPT,
  },
};

export type MemberDocumentAcceptance = {
  path?: string | null;
  version?: string | null;
  signedAt?: string | null;
  accepted?: boolean;
};

export function memberDocumentObjectPath(
  authUserId: string,
  kind: MemberDocumentKind,
  version: string,
): string {
  return `${authUserId}/${kind}-${version}.pdf`;
}

export function memberDocumentFileName(kind: MemberDocumentKind, version: string): string {
  const titles: Record<MemberDocumentKind, string> = {
    terms: 'Balanse-Terms',
    privacy: 'Balanse-Privacy',
    health: 'Balanse-Health-Declaration',
  };
  return `${titles[kind]}-${version}.pdf`;
}

export function documentStatus(
  kind: MemberDocumentKind,
  acceptance: MemberDocumentAcceptance,
  healthDeclarationJson?: string | null,
): MemberDocumentStatus {
  const current = CURRENT_DOCUMENTS[kind];
  const path = (acceptance.path ?? '').trim();
  const acceptedVersion = (acceptance.version ?? '').trim();
  const acceptedFlag = !!acceptance.accepted || !!path || !!acceptedVersion;

  if (kind === 'health') {
    const parsed = parseHealthDeclaration(healthDeclarationJson);
    const schemaVersion = (parsed.schemaVersion || acceptedVersion).trim();
    if (!parsed.acknowledged && !path) return 'missing';
    if (schemaVersion === current.version) return 'current';
    if (current.requiresReaccept) return 'reaccept_required';
    return 'accepted_legacy';
  }

  if (!acceptedFlag) return 'missing';
  if (acceptedVersion === current.version && path) return 'current';
  if (acceptedVersion === current.version) return 'current';
  if (current.requiresReaccept && acceptedVersion !== current.version) return 'reaccept_required';
  return 'accepted_legacy';
}

export function memberNeedsReaccept(docs: {
  terms: MemberDocumentAcceptance;
  privacy: MemberDocumentAcceptance;
}): boolean {
  return documentStatus('terms', docs.terms) === 'reaccept_required'
    || documentStatus('privacy', docs.privacy) === 'reaccept_required';
}

async function currentAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function uploadMemberPdf(
  kind: MemberDocumentKind,
  version: string,
  blob: Blob,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const authUserId = await currentAuthUserId();
  if (!authUserId) return { ok: false, error: 'You must be signed in to save this document.' };

  const path = memberDocumentObjectPath(authUserId, kind, version);
  const { error } = await supabase.storage
    .from(MEMBER_DOCUMENTS_BUCKET)
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    console.error('Failed to upload member document:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, path };
}

export function memberSignatureObjectPath(authUserId: string): string {
  return `${authUserId}/e-signature.png`;
}

function dataUrlToPngBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadMemberSignaturePng(
  dataUrl: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const authUserId = await currentAuthUserId();
  if (!authUserId) return { ok: false, error: 'You must be signed in to save this signature.' };

  const path = memberSignatureObjectPath(authUserId);
  const { error } = await supabase.storage
    .from(MEMBER_DOCUMENTS_BUCKET)
    .upload(path, dataUrlToPngBlob(dataUrl), {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    console.error('Failed to upload e-signature:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, path };
}

export async function loadMemberSignatureUrl(path?: string | null): Promise<string> {
  const trimmed = (path ?? '').trim();
  if (!trimmed) return '';
  const { data, error } = await supabase.storage
    .from(MEMBER_DOCUMENTS_BUCKET)
    .createSignedUrl(trimmed, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

export async function downloadMemberDocument(path: string, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(MEMBER_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60, { download: fileName });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Could not open the signed PDF.');
  }

  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

type PdfBuildInput = {
  title: string;
  lastUpdated: string;
  email: string;
  signerName: string;
  signedAt: Date;
  signatureDataUrl?: string;
  blocks?: TermsBlock[];
  qaRows?: { question: string; answer: string }[];
  details?: string;
  attest: string;
};

function buildDocumentPdfBlob(input: PdfBuildInput): Blob {
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
  doc.text(input.title, marginX, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...body);
  doc.text(`Last updated: ${input.lastUpdated}`, marginX, y);
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

  for (const block of input.blocks ?? []) {
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

  if (input.qaRows?.length) {
    ensureSpace(28);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text('Medical Questionnaire', marginX, y);
    y += 18;

    for (const row of input.qaRows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...body);
      const questionLines = doc.splitTextToSize(row.question, maxW - 50) as string[];
      ensureSpace(questionLines.length * 13 + 16);
      doc.text(questionLines, marginX, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(row.answer, pageW - marginX - 28, y, { align: 'right' });
      y += questionLines.length * 13 + 8;
    }
  }

  if (input.details) {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text('Additional Details', marginX, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...body);
    const detailLines = doc.splitTextToSize(input.details, maxW) as string[];
    ensureSpace(detailLines.length * 13 + 10);
    doc.text(detailLines, marginX, y);
    y += detailLines.length * 13 + 8;
  }

  ensureSpace(input.signatureDataUrl ? 150 : 80);
  y += 8;
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text(input.signatureDataUrl ? 'Electronic Signature' : 'Electronic Acknowledgment', marginX, y);
  y += 16;

  if (input.signatureDataUrl) {
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
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...body);
  const attestLines = doc.splitTextToSize(input.attest, maxW) as string[];
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

  return doc.output('blob');
}

export type SignedUploadResult = {
  path: string;
  version: string;
  signedAt: string;
  fileName: string;
};

async function generateAndUpload(
  kind: MemberDocumentKind,
  version: string,
  blob: Blob,
): Promise<SignedUploadResult> {
  const uploaded = await uploadMemberPdf(kind, version, blob);
  if (!uploaded.ok) throw new Error(uploaded.error);
  return {
    path: uploaded.path,
    version,
    signedAt: new Date().toISOString(),
    fileName: memberDocumentFileName(kind, version),
  };
}

export async function generateAndUploadSignedTermsPdf(input: {
  email: string;
  signerName: string;
  signatureDataUrl: string;
  signedAt?: Date;
}): Promise<SignedUploadResult> {
  const signedAt = input.signedAt ?? new Date();
  const blob = buildDocumentPdfBlob({
    title: TC_DOCUMENT_TITLE,
    lastUpdated: TC_LAST_UPDATED,
    email: input.email,
    signerName: input.signerName,
    signedAt,
    signatureDataUrl: input.signatureDataUrl,
    blocks: TERMS_BLOCKS,
    attest: `Electronically signed by ${input.signerName} (${input.email}) on ${signedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}. This document is the signed Balansé Terms & Conditions, Waiver & Release, and Media Release & Consent Statement.`,
  });
  const result = await generateAndUpload('terms', TERMS_VERSION, blob);
  return { ...result, signedAt: signedAt.toISOString() };
}

export async function generateAndUploadSignedPrivacyPdf(input: {
  email: string;
  signerName: string;
  signedAt?: Date;
}): Promise<SignedUploadResult> {
  const signedAt = input.signedAt ?? new Date();
  const blob = buildDocumentPdfBlob({
    title: PRIVACY_DOCUMENT_TITLE,
    lastUpdated: PRIVACY_LAST_UPDATED,
    email: input.email,
    signerName: input.signerName,
    signedAt,
    blocks: PRIVACY_BLOCKS,
    attest: `Electronically acknowledged by ${input.signerName} (${input.email}) on ${signedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}. This document is the Privacy Policy accepted by the member.`,
  });
  const result = await generateAndUpload('privacy', PRIVACY_VERSION, blob);
  return { ...result, signedAt: signedAt.toISOString() };
}

export async function generateAndUploadHealthDeclarationPdf(input: {
  email: string;
  signerName: string;
  fields: HealthDeclarationFields;
  signatureDataUrl?: string;
  signedAt?: Date;
}): Promise<SignedUploadResult> {
  const signedAt = input.signedAt ?? new Date();
  const version = input.fields.schemaVersion || HEALTH_FORM_VERSION;
  const blob = buildDocumentPdfBlob({
    title: HEALTH_DOCUMENT_TITLE,
    lastUpdated: HEALTH_FORM_LABEL,
    email: input.email,
    signerName: input.signerName,
    signedAt,
    signatureDataUrl: input.signatureDataUrl,
    qaRows: HEALTH_QUESTIONS.map((question) => ({
      question: question.text,
      answer: input.fields.answers[question.id] === 'yes'
        ? 'Yes'
        : input.fields.answers[question.id] === 'no'
          ? 'No'
          : '—',
    })),
    details: input.fields.details.trim(),
    attest: `Electronically signed by ${input.signerName} (${input.email}) on ${signedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}. This snapshot records the health declaration answers on file for schema ${version}.`,
  });
  const result = await generateAndUpload('health', version, blob);
  return { ...result, signedAt: signedAt.toISOString() };
}
