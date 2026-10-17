import { supabase } from './supabase';
import { sendClassPaymentReceiptEmail } from './class-payment-receipt-email';
import { loadProfileImageUrlsForUser } from './storage-service';

export const PAYMENT_PROOFS_BUCKET = 'payment_proofs';

export type ClassPaymentStatus = 'pending' | 'approved' | 'rejected';

export interface ClassPaymentDisplay {
  id: string;
  uid: string;
  classId: string;
  accountId: string;
  status: ClassPaymentStatus;
  verified: boolean;
  paymentChannelId: string;
  paymentMethodLabel: string;
  paymentReference: string;
  proofStoragePath: string;
  proofOriginalFilename: string;
  memberNotes: string;
  amountPaid: number;
  totalAmountDue: number;
  buyerName: string;
  buyerEmail: string;
  serviceDescription: string;
  classStartsAt: string | null;
  classEndsAt: string | null;
  requestPhysicalReceipt: boolean;
  emailReceiptSent: boolean;
  receiptPrinted: boolean;
  receiptIssuedAt: string | null;
  reviewNote: string;
  createdAt: string;
  className: string;
  coachNames: string;
  studentPhotoUrl: string;
}

type ClassPaymentRow = {
  id: string;
  uid: string;
  class_id: string;
  account_id: string;
  status: ClassPaymentStatus;
  verified: boolean;
  payment_channel_id: string;
  payment_method_label: string;
  payment_reference: string;
  proof_storage_path: string;
  proof_original_filename: string;
  member_notes: string;
  amount_paid: number;
  total_amount_due: number;
  buyer_name: string;
  buyer_email: string;
  service_description: string;
  class_starts_at: string | null;
  class_ends_at: string | null;
  request_physical_receipt: boolean;
  email_receipt_sent: boolean;
  receipt_printed: boolean;
  receipt_issued_at: string | null;
  review_note: string;
  created_at: string;
  classes: { name: string } | { name: string }[] | null;
};

function extensionForProofFile(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  if (map[file.type]) return map[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'bin';
}

export async function uploadClassPaymentProof(
  file: File,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: 'You must be signed in to upload proof.' };
  }

  const ext = extensionForProofFile(file);
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: '3600',
      metadata: { originalFileName: file.name },
    });

  if (uploadError) {
    console.error('uploadClassPaymentProof:', uploadError.message);
    return { ok: false, error: uploadError.message };
  }

  return { ok: true, storagePath };
}

export async function submitMemberClassPayment(input: {
  classId: string;
  paymentChannelId: string;
  paymentReference: string;
  proofStoragePath: string;
  proofOriginalFilename?: string;
  amountPaid: number;
  memberNotes?: string;
  requestPhysicalReceipt?: boolean;
}): Promise<{ success: boolean; uid?: string; paymentId?: string; error: string | null }> {
  const { data, error } = await supabase.rpc('submit_member_class_payment', {
    p_class_id: input.classId,
    p_payment_channel_id: input.paymentChannelId,
    p_payment_reference: input.paymentReference,
    p_proof_storage_path: input.proofStoragePath,
    p_amount_paid: input.amountPaid,
    p_member_notes: input.memberNotes ?? '',
    p_request_physical_receipt: input.requestPhysicalReceipt ?? false,
    p_proof_original_filename: input.proofOriginalFilename?.trim() ?? '',
  });

  if (error) {
    console.error('submit_member_class_payment:', error.message);
    return { success: false, error: error.message };
  }

  const payload = data as { payment_id?: string; uid?: string } | null;
  return {
    success: true,
    paymentId: payload?.payment_id,
    uid: payload?.uid,
    error: null,
  };
}

export type MemberClassEnrollmentStatus = 'enrolled' | 'waitlisted';

async function memberAccountIdForAuthUser(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accountRow } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return accountRow?.id ?? null;
}

/** All classes the signed-in member is enrolled in or waitlisted for (calendar badges). */
export async function fetchMemberEnrollmentStatusMap(): Promise<
  Map<string, MemberClassEnrollmentStatus>
> {
  const accountId = await memberAccountIdForAuthUser();
  const map = new Map<string, MemberClassEnrollmentStatus>();
  if (!accountId) return map;

  const [{ data: waitlistRows }, { data: studentRows }] = await Promise.all([
    supabase.from('class_waitlist').select('class_id').eq('account_id', accountId),
    supabase.from('class_students').select('class_id').eq('account_id', accountId),
  ]);

  for (const row of waitlistRows ?? []) {
    if (row.class_id) map.set(row.class_id, 'waitlisted');
  }
  for (const row of studentRows ?? []) {
    if (row.class_id) map.set(row.class_id, 'enrolled');
  }

  return map;
}

export async function fetchMemberClassEnrollmentGate(
  classId: string,
): Promise<'enrolled' | 'waitlisted' | 'none'> {
  const accountId = await memberAccountIdForAuthUser();
  if (!accountId) return 'none';

  const { data: enrolled } = await supabase
    .from('class_students')
    .select('account_id')
    .eq('class_id', classId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (enrolled) return 'enrolled';

  const { data: waitlisted } = await supabase
    .from('class_waitlist')
    .select('account_id')
    .eq('class_id', classId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (waitlisted) return 'waitlisted';

  return 'none';
}

function mapPaymentRow(row: ClassPaymentRow, coachNames: string): ClassPaymentDisplay {
  const classJoin = row.classes;
  const className = Array.isArray(classJoin)
    ? classJoin[0]?.name ?? row.service_description
    : classJoin?.name ?? row.service_description;

  return {
    id: row.id,
    uid: row.uid,
    classId: row.class_id,
    accountId: row.account_id,
    status: row.status,
    verified: row.verified,
    paymentChannelId: row.payment_channel_id,
    paymentMethodLabel: row.payment_method_label,
    paymentReference: row.payment_reference,
    proofStoragePath: row.proof_storage_path,
    proofOriginalFilename: row.proof_original_filename?.trim() ?? '',
    memberNotes: row.member_notes,
    amountPaid: Number(row.amount_paid),
    totalAmountDue: Number(row.total_amount_due),
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    serviceDescription: row.service_description,
    classStartsAt: row.class_starts_at,
    classEndsAt: row.class_ends_at,
    requestPhysicalReceipt: row.request_physical_receipt,
    emailReceiptSent: row.email_receipt_sent,
    receiptPrinted: row.receipt_printed,
    receiptIssuedAt: row.receipt_issued_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    className,
    coachNames,
    studentPhotoUrl: '',
  };
}

async function attachStudentProfilePhotos(
  displays: ClassPaymentDisplay[],
): Promise<ClassPaymentDisplay[]> {
  if (displays.length === 0) return displays;

  const accountIds = [...new Set(displays.map((d) => d.accountId))];

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, auth_user_id')
    .in('id', accountIds);

  const authByAccount = new Map<string, string>();
  for (const row of accounts ?? []) {
    if (row.auth_user_id) authByAccount.set(row.id as string, row.auth_user_id as string);
  }

  const { data: profiles } = await supabase
    .from('profiles_client')
    .select('account_id, photo')
    .in('account_id', accountIds);

  const photoFromProfile = new Map<string, string>();
  for (const row of profiles ?? []) {
    photoFromProfile.set(row.account_id as string, (row.photo as string)?.trim() || '');
  }

  const authUserIds = [...new Set(authByAccount.values())];
  const photoFromBucket = new Map<string, string>();
  await Promise.all(
    authUserIds.map(async (authUserId) => {
      const { photo } = await loadProfileImageUrlsForUser(authUserId);
      photoFromBucket.set(authUserId, photo);
    }),
  );

  return displays.map((display) => {
    const fromProfile = photoFromProfile.get(display.accountId) ?? '';
    const authUserId = authByAccount.get(display.accountId);
    const fromBucket = authUserId ? photoFromBucket.get(authUserId) ?? '' : '';
    return {
      ...display,
      studentPhotoUrl: fromProfile || fromBucket,
    };
  });
}

const CLASS_PAYMENTS_SELECT = `
  id,
  uid,
  class_id,
  account_id,
  status,
  verified,
  payment_channel_id,
  payment_method_label,
  payment_reference,
  proof_storage_path,
  proof_original_filename,
  member_notes,
  amount_paid,
  total_amount_due,
  buyer_name,
  buyer_email,
  service_description,
  class_starts_at,
  class_ends_at,
  request_physical_receipt,
  email_receipt_sent,
  receipt_printed,
  receipt_issued_at,
  review_note,
  created_at,
  classes ( name )
`;

async function attachCoachNamesToPaymentRows(
  rows: ClassPaymentRow[],
): Promise<ClassPaymentDisplay[]> {
  const classIds = [...new Set(rows.map((r) => r.class_id))];
  const coachByClass = new Map<string, string>();

  if (classIds.length > 0) {
    const { data: coachRows } = await supabase
      .from('class_coaches')
      .select('class_id, account_id')
      .in('class_id', classIds);

    const accountIds = [...new Set((coachRows ?? []).map((r) => r.account_id as string))];
    const nameByAccount = new Map<string, string>();

    if (accountIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles_client')
        .select('account_id, name')
        .in('account_id', accountIds);
      for (const p of profiles ?? []) {
        nameByAccount.set(p.account_id as string, (p.name as string)?.trim() || 'Coach');
      }
      const { data: staffProfiles } = await supabase
        .from('profiles_staff')
        .select('account_id, name')
        .in('account_id', accountIds);
      for (const p of staffProfiles ?? []) {
        if (!nameByAccount.has(p.account_id as string)) {
          nameByAccount.set(p.account_id as string, (p.name as string)?.trim() || 'Coach');
        }
      }
    }

    for (const row of coachRows ?? []) {
      const classId = row.class_id as string;
      const label = nameByAccount.get(row.account_id as string) ?? 'Coach';
      const prev = coachByClass.get(classId);
      coachByClass.set(classId, prev ? `${prev}, ${label}` : label);
    }
  }

  const displays = rows.map((row) =>
    mapPaymentRow(row, coachByClass.get(row.class_id) ?? '—'),
  );
  return attachStudentProfilePhotos(displays);
}

async function queryClassPaymentRows(): Promise<{
  rows: ClassPaymentRow[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('class_payments')
    .select(CLASS_PAYMENTS_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (rows ?? []) as ClassPaymentRow[], error: null };
}

/** Member payment history — RLS returns only the signed-in member's rows. */
export async function fetchClassPaymentsForMember(): Promise<{
  data: ClassPaymentDisplay[];
  error: string | null;
}> {
  const { rows, error } = await queryClassPaymentRows();
  if (error) {
    console.error('fetchClassPaymentsForMember:', error);
    return { data: [], error };
  }
  const data = await attachCoachNamesToPaymentRows(rows);
  return { data, error: null };
}

export async function fetchClassPaymentsForAdmin(): Promise<{
  data: ClassPaymentDisplay[];
  error: string | null;
}> {
  const { rows, error } = await queryClassPaymentRows();
  if (error) {
    console.error('fetchClassPaymentsForAdmin:', error);
    return { data: [], error };
  }
  const data = await attachCoachNamesToPaymentRows(rows);
  return { data, error: null };
}

export async function adminCreateClassPayment(input: {
  accountId: string;
  classId: string;
  paymentChannelId: string;
  amountPaid: number;
  paymentReference?: string;
  memberNotes?: string;
  requestPhysicalReceipt?: boolean;
  proofStoragePath?: string;
  proofOriginalFilename?: string;
  autoApprove?: boolean;
}): Promise<{
  success: boolean;
  paymentId?: string;
  uid?: string;
  status?: ClassPaymentStatus;
  error: string | null;
  receiptEmailSent?: boolean;
  receiptEmailError?: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_create_class_payment', {
    p_account_id: input.accountId,
    p_class_id: input.classId,
    p_payment_channel_id: input.paymentChannelId,
    p_amount_paid: input.amountPaid,
    p_payment_reference: input.paymentReference ?? '',
    p_member_notes: input.memberNotes ?? '',
    p_request_physical_receipt: input.requestPhysicalReceipt ?? false,
    p_proof_storage_path: input.proofStoragePath ?? '',
    p_proof_original_filename: input.proofOriginalFilename?.trim() ?? '',
    p_auto_approve: input.autoApprove ?? false,
  });

  if (error) {
    console.error('admin_create_class_payment:', error.message);
    return { success: false, error: error.message };
  }

  const payload = data as { payment_id?: string; uid?: string; status?: ClassPaymentStatus } | null;
  const paymentId = payload?.payment_id;
  const status = payload?.status;

  if (paymentId && status === 'approved') {
    const emailResult = await sendClassPaymentReceiptEmail(paymentId);
    if (!emailResult.ok) {
      return {
        success: true,
        paymentId,
        uid: payload?.uid,
        status,
        error: null,
        receiptEmailSent: false,
        receiptEmailError: emailResult.error,
      };
    }
    return {
      success: true,
      paymentId,
      uid: payload?.uid,
      status,
      error: null,
      receiptEmailSent: true,
      receiptEmailError: null,
    };
  }

  return {
    success: true,
    paymentId,
    uid: payload?.uid,
    status,
    error: null,
  };
}

export async function adminReviewClassPayment(
  paymentId: string,
  approve: boolean,
  reviewNote = '',
): Promise<{
  success: boolean;
  error: string | null;
  receiptEmailSent?: boolean;
  receiptEmailError?: string | null;
}> {
  const { error } = await supabase.rpc('admin_review_class_payment', {
    p_payment_id: paymentId,
    p_approve: approve,
    p_review_note: reviewNote,
  });

  if (error) {
    console.error('admin_review_class_payment:', error.message);
    return { success: false, error: error.message };
  }

  if (!approve) {
    return { success: true, error: null };
  }

  const emailResult = await sendClassPaymentReceiptEmail(paymentId);
  if (!emailResult.ok) {
    return {
      success: true,
      error: null,
      receiptEmailSent: false,
      receiptEmailError: emailResult.error,
    };
  }

  return {
    success: true,
    error: null,
    receiptEmailSent: !emailResult.alreadySent,
    receiptEmailError: null,
  };
}

export async function fetchClassPaymentReceiptHtml(paymentId: string): Promise<{
  html: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('class_payments')
    .select('receipt_html, status, verified')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) {
    console.error('fetchClassPaymentReceiptHtml:', error.message);
    return { html: null, error: error.message };
  }
  if (!data) {
    return { html: null, error: 'Payment not found.' };
  }

  let html = (data.receipt_html as string)?.trim() ?? '';
  if (html) {
    return { html, error: null };
  }

  if (data.status !== 'approved' || !data.verified) {
    return { html: null, error: 'Receipt is available after payment approval.' };
  }

  const ensure = await sendClassPaymentReceiptEmail(paymentId, { storeOnly: true });
  if (!ensure.ok) {
    return { html: null, error: ensure.error ?? 'Could not generate e-receipt.' };
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('class_payments')
    .select('receipt_html')
    .eq('id', paymentId)
    .maybeSingle();

  if (refreshError) {
    return { html: null, error: refreshError.message };
  }

  html = (refreshed?.receipt_html as string)?.trim() ?? '';
  if (!html) {
    return { html: null, error: 'E-receipt was not stored.' };
  }
  return { html, error: null };
}

export async function markClassPaymentReceiptPrinted(paymentId: string): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const { error } = await supabase
    .from('class_payments')
    .update({ receipt_printed: true })
    .eq('id', paymentId);

  if (error) {
    console.error('markClassPaymentReceiptPrinted:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

function storageObjectLeafName(storagePath: string): string {
  const trimmed = storagePath.trim();
  if (!trimmed) return 'Payment proof';
  const leaf = trimmed.split('/').pop();
  return leaf?.trim() || 'Payment proof';
}

function metadataOriginalFileName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  for (const key of ['originalFileName', 'original_filename', 'filename', 'name']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  for (const [key, value] of Object.entries(record)) {
    if (!/original|filename|name/i.test(key)) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function isGeneratedStorageObjectName(name: string, storagePath: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed === storageObjectLeafName(storagePath)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i.test(trimmed);
}

/** Human-readable proof filename (DB snapshot, then storage metadata, then object key). */
export async function resolvePaymentProofDisplayName(options: {
  storagePath: string;
  originalFilename?: string | null;
}): Promise<string> {
  const path = options.storagePath.trim();
  if (!path) return 'Payment proof';

  const fromDb = options.originalFilename?.trim();
  if (fromDb && !isGeneratedStorageObjectName(fromDb, path)) {
    return fromDb;
  }

  const slash = path.lastIndexOf('/');
  const folder = slash >= 0 ? path.slice(0, slash) : '';
  const objectName = slash >= 0 ? path.slice(slash + 1) : path;

  const { data, error } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).list(folder, {
    limit: 1,
    search: objectName,
  });

  if (!error && data?.length) {
    const obj = data.find((file) => file.name === objectName) ?? data[0];
    const fromMeta = metadataOriginalFileName(obj?.metadata);
    if (fromMeta && !isGeneratedStorageObjectName(fromMeta, path)) {
      return fromMeta;
    }
  }

  const leaf = storageObjectLeafName(path);
  if (isGeneratedStorageObjectName(leaf, path)) {
    return 'Payment proof';
  }
  return leaf;
}

export async function getPaymentProofSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!storagePath.trim()) return null;
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error('getPaymentProofSignedUrl:', error.message);
    return null;
  }
  return data.signedUrl;
}
