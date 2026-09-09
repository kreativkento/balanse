import {
  generateAndUploadSignedTermsPdf,
  type SignedUploadResult,
} from './member-documents';

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

/** Local snapshot from before bucket storage. Prefer profiles_client.terms_document_path. */
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

export function clearSignedTermsRecord(email: string | undefined | null) {
  if (!email || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    /* ignore quota / private mode */
  }
}

export function downloadSignedTermsPdf(record: SignedTermsRecord) {
  const link = document.createElement('a');
  link.href = record.pdfDataUrl;
  link.download = record.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function generateAndSaveSignedTermsPdf(input: {
  email: string;
  signerName: string;
  signatureDataUrl?: string;
  signedAt?: Date;
}): Promise<SignedUploadResult> {
  return generateAndUploadSignedTermsPdf(input);
}
