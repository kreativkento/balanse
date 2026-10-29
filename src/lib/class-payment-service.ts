import { supabase } from './supabase';
import { sendClassPaymentReceiptEmail } from './class-payment-receipt-email';
import { sendClassPaymentReviewFeedbackEmail } from './class-payment-review-email';
import { sendClassPaymentSubmittedEmail } from './class-payment-submitted-email';
import { loadProfileImageUrlsForUser } from './storage-service';

export const PAYMENT_PROOFS_BUCKET = 'payment_proofs';

export const CLASS_PAYMENTS_CHANGED = 'balanse:class-payments-changed';

export function notifyClassPaymentsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLASS_PAYMENTS_CHANGED));
  }
}

export type MemberFinanceAttentionCounts = {
  classReturned: number;
  packReturned: number;
};

export async function fetchPendingClassPaymentCount(): Promise<number> {
  const { count, error } = await supabase
    .from('class_payments_escrow')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('fetchPendingClassPaymentCount:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function fetchMemberFinanceAttentionCounts(): Promise<MemberFinanceAttentionCounts> {
  const [classRes, packRes] = await Promise.all([
    supabase
      .from('class_payments_escrow')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected'),
    supabase
      .from('subscription_package_payments_escrow')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected'),
  ]);

  if (classRes.error) {
    console.error('fetchMemberFinanceAttentionCounts class:', classRes.error.message);
  }
  if (packRes.error) {
    console.error('fetchMemberFinanceAttentionCounts pack:', packRes.error.message);
  }

  return {
    classReturned: classRes.count ?? 0,
    packReturned: packRes.count ?? 0,
  };
}

export type ClassPaymentStatus = 'pending' | 'approved' | 'rejected';

export type PaymentEscrowState =
  | 'pending_review'
  | 'in_escrow'
  | 'finalized'
  | 'rejected'
  | 'refunded';

export interface ClassPaymentDisplay {
  id: string;
  uid: string;
  classId: string | null;
  pricingOfferingId: string | null;
  accountId: string;
  status: ClassPaymentStatus;
  verified: boolean;
  escrowState: PaymentEscrowState | null;
  refundableUntil: string | null;
  finalTransactionId: string | null;
  finalizedAt: string | null;
  cashRefundDisbursedAt: string | null;
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
  officialReceiptNumber: string | null;
  reviewNote: string;
  createdAt: string;
  className: string;
  coachNames: string;
  studentPhotoUrl: string;
}

type FinalTransactionJoin = {
  id: string;
  email_receipt_sent: boolean;
  receipt_printed: boolean;
  receipt_issued_at: string | null;
  receipt_html: string;
  official_receipt_number: string | null;
} | null;

type ClassPaymentRow = {
  id: string;
  uid: string;
  class_id: string | null;
  pricing_offering_id: string | null;
  account_id: string;
  status: ClassPaymentStatus;
  verified: boolean;
  escrow_state: PaymentEscrowState | null;
  refundable_until: string | null;
  final_transaction_id: string | null;
  finalized_at: string | null;
  cash_refund_disbursed_at: string | null;
  final_transaction: FinalTransactionJoin | FinalTransactionJoin[];
  payment_channel_id: string;
  payment_method_label: string;
  payment_reference: string;
  proof_storage_path: string;
  proof_original_filename: string;
  member_notes: string;
  amount_paid: number;
  total_amount_due: number;
  accounts:
    | { email: string; profiles_client: { name: string } | { name: string }[] | null }
    | { email: string; profiles_client: { name: string } | { name: string }[] | null }[]
    | null;
  class_starts_at: string | null;
  class_ends_at: string | null;
  request_physical_receipt: boolean;
  review_note: string;
  created_at: string;
  classes: { name: string } | { name: string }[] | null;
  pricing_offerings: { title: string } | { title: string }[] | null;
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
  const paymentId = payload?.payment_id;

  if (paymentId) {
    void sendClassPaymentSubmittedEmail(paymentId).then(({ ok, error: emailError }) => {
      if (!ok && emailError) {
        console.warn('submitMemberClassPayment: submission email failed:', emailError);
      }
    });
  }

  notifyClassPaymentsChanged();
  return {
    success: true,
    paymentId,
    uid: payload?.uid,
    error: null,
  };
}

export async function resubmitMemberClassPaymentEscrow(input: {
  paymentId: string;
  paymentChannelId: string;
  paymentReference: string;
  proofStoragePath: string;
  proofOriginalFilename?: string;
  memberNotes?: string;
  requestPhysicalReceipt?: boolean;
}): Promise<{ success: boolean; uid?: string; error: string | null }> {
  const { data, error } = await supabase.rpc('member_resubmit_class_payment_escrow', {
    p_payment_id: input.paymentId,
    p_payment_channel_id: input.paymentChannelId,
    p_payment_reference: input.paymentReference,
    p_proof_storage_path: input.proofStoragePath,
    p_member_notes: input.memberNotes ?? '',
    p_request_physical_receipt: input.requestPhysicalReceipt ?? false,
    p_proof_original_filename: input.proofOriginalFilename?.trim() ?? '',
  });

  if (error) {
    console.error('member_resubmit_class_payment_escrow:', error.message);
    return { success: false, error: error.message };
  }

  const payload = data as { uid?: string; payment_id?: string } | null;
  const paymentId = payload?.payment_id ?? input.paymentId;

  void sendClassPaymentSubmittedEmail(paymentId).then(({ ok, error: emailError }) => {
    if (!ok && emailError) {
      console.warn('resubmitMemberClassPaymentEscrow: submission email failed:', emailError);
    }
  });

  notifyClassPaymentsChanged();
  return { success: true, uid: payload?.uid, error: null };
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

function accountFromPaymentRow(row: ClassPaymentRow): {
  email: string;
  name: string;
} {
  const joined = row.accounts;
  const account = Array.isArray(joined) ? joined[0] : joined;
  const email = (account?.email as string)?.trim() ?? '';
  const profileJoin = account?.profiles_client;
  const profile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
  const name = (profile?.name as string)?.trim() || email || 'Member';
  return { email, name };
}

function finalTransactionFromRow(row: ClassPaymentRow): FinalTransactionJoin {
  const joined = row.final_transaction;
  if (!joined) return null;
  return Array.isArray(joined) ? joined[0] ?? null : joined;
}

function mapPaymentRow(row: ClassPaymentRow, coachNames: string): ClassPaymentDisplay {
  const classJoin = row.classes;
  const offeringJoin = row.pricing_offerings;
  const buyer = accountFromPaymentRow(row);
  const className = Array.isArray(classJoin)
    ? classJoin[0]?.name
    : classJoin?.name;
  const offeringTitle = Array.isArray(offeringJoin)
    ? offeringJoin[0]?.title
    : offeringJoin?.title;
  const itemName = className?.trim() || offeringTitle?.trim() || 'Payment';

  const finalTx = finalTransactionFromRow(row);
  const receiptFromFinal = finalTx != null;

  return {
    id: row.id,
    uid: row.uid,
    classId: row.class_id,
    pricingOfferingId: row.pricing_offering_id,
    accountId: row.account_id,
    status: row.status,
    verified: row.verified,
    escrowState: row.escrow_state,
    refundableUntil: row.refundable_until,
    finalTransactionId: row.final_transaction_id ?? finalTx?.id ?? null,
    finalizedAt: row.finalized_at,
    cashRefundDisbursedAt: row.cash_refund_disbursed_at,
    paymentChannelId: row.payment_channel_id,
    paymentMethodLabel: row.payment_method_label,
    paymentReference: row.payment_reference,
    proofStoragePath: row.proof_storage_path,
    proofOriginalFilename: row.proof_original_filename?.trim() ?? '',
    memberNotes: row.member_notes,
    amountPaid: Number(row.amount_paid),
    totalAmountDue: Number(row.total_amount_due),
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    serviceDescription: itemName,
    classStartsAt: row.class_starts_at,
    classEndsAt: row.class_ends_at,
    requestPhysicalReceipt: row.request_physical_receipt,
    emailReceiptSent: receiptFromFinal ? finalTx!.email_receipt_sent : false,
    receiptPrinted: receiptFromFinal ? finalTx!.receipt_printed : false,
    receiptIssuedAt: receiptFromFinal ? finalTx!.receipt_issued_at : null,
    officialReceiptNumber: receiptFromFinal
      ? finalTx!.official_receipt_number?.trim() || null
      : null,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    className: itemName,
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
  pricing_offering_id,
  account_id,
  status,
  verified,
  escrow_state,
  refundable_until,
  final_transaction_id,
  payment_channel_id,
  payment_method_label,
  payment_reference,
  proof_storage_path,
  proof_original_filename,
  member_notes,
  amount_paid,
  total_amount_due,
  class_starts_at,
  class_ends_at,
  request_physical_receipt,
  review_note,
  created_at,
  classes ( name ),
  pricing_offerings ( title ),
  accounts!account_id (
    email,
    profiles_client ( name )
  ),
  final_transaction:final_transactions!final_transaction_id (
    id,
    email_receipt_sent,
    receipt_printed,
    receipt_issued_at,
    receipt_html,
    official_receipt_number
  )
`;

async function attachCoachNamesToPaymentRows(
  rows: ClassPaymentRow[],
): Promise<ClassPaymentDisplay[]> {
  const classIds = [...new Set(rows.map((r) => r.class_id).filter((id): id is string => Boolean(id)))];
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
    mapPaymentRow(row, row.class_id ? coachByClass.get(row.class_id) ?? '—' : '—'),
  );
  return attachStudentProfilePhotos(displays);
}

async function queryClassPaymentRows(): Promise<{
  rows: ClassPaymentRow[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('class_payments_escrow')
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
  classId?: string | null;
  pricingOfferingId?: string | null;
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
    p_class_id: input.classId ?? null,
    p_pricing_offering_id: input.pricingOfferingId ?? null,
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

  notifyClassPaymentsChanged();

  const finalTransactionId = (payload as { final_transaction_id?: string | null })?.final_transaction_id;
  const receiptTargetId = finalTransactionId ?? paymentId;

  if (paymentId && status === 'approved' && finalTransactionId) {
    const emailResult = await sendClassPaymentReceiptEmail(receiptTargetId);
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

  if (paymentId && status === 'approved' && !finalTransactionId) {
    return {
      success: true,
      paymentId,
      uid: payload?.uid,
      status,
      error: null,
      receiptEmailSent: false,
      receiptEmailError:
        'Payment is in escrow until the cancellation refund window ends; e-receipt will be available after finalization.',
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
  feedbackEmailSent?: boolean;
  feedbackEmailError?: string | null;
  receiptEmailSent?: boolean;
  receiptEmailError?: string | null;
}> {
  const { data: reviewData, error } = await supabase.rpc('admin_review_class_payment', {
    p_payment_id: paymentId,
    p_approve: approve,
    p_review_note: reviewNote,
  });

  if (error) {
    console.error('admin_review_class_payment:', error.message);
    return { success: false, error: error.message };
  }

  const reviewPayload = reviewData as {
    final_transaction_id?: string | null;
  } | null;

  notifyClassPaymentsChanged();

  const feedbackResult = await sendClassPaymentReviewFeedbackEmail(paymentId);
  const feedbackEmailSent = feedbackResult.ok;
  const feedbackEmailError = feedbackResult.ok ? null : feedbackResult.error;

  if (!approve) {
    return {
      success: true,
      error: null,
      feedbackEmailSent,
      feedbackEmailError,
    };
  }

  const finalTransactionId = reviewPayload?.final_transaction_id ?? null;
  if (!finalTransactionId) {
    return {
      success: true,
      error: null,
      feedbackEmailSent,
      feedbackEmailError,
      receiptEmailSent: false,
      receiptEmailError:
        'Enrollment approved; e-receipt sends after the refund window (see Policies → cancellation hours).',
    };
  }

  const emailResult = await sendClassPaymentReceiptEmail(finalTransactionId);
  if (!emailResult.ok) {
    return {
      success: true,
      error: null,
      feedbackEmailSent,
      feedbackEmailError,
      receiptEmailSent: false,
      receiptEmailError: emailResult.error,
    };
  }

  return {
    success: true,
    error: null,
    feedbackEmailSent,
    feedbackEmailError,
    receiptEmailSent: !emailResult.alreadySent,
    receiptEmailError: null,
  };
}

export async function finalizeEscrowPayment(escrowPaymentId: string): Promise<{
  success: boolean;
  finalTransactionId: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('finalize_escrow_payment', {
    p_escrow_id: escrowPaymentId,
  });

  if (error) {
    console.error('finalize_escrow_payment:', error.message);
    return { success: false, finalTransactionId: null, error: error.message };
  }

  notifyClassPaymentsChanged();
  return {
    success: true,
    finalTransactionId: (data as string) ?? null,
    error: null,
  };
}

export async function adminRefundClassPaymentEscrow(
  escrowPaymentId: string,
  reviewNote = '',
  cancellationRequestedAt?: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('admin_refund_class_payment_escrow', {
    p_escrow_payment_id: escrowPaymentId,
    p_review_note: reviewNote,
    p_cancellation_requested_at: cancellationRequestedAt ?? new Date().toISOString(),
  });

  if (error) {
    console.error('admin_refund_class_payment_escrow:', error.message);
    return { success: false, error: error.message };
  }

  notifyClassPaymentsChanged();
  return { success: true, error: null };
}

export async function adminForceLockEscrowPayment(
  escrowPaymentId: string,
): Promise<{ success: boolean; finalTransactionId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_force_lock_escrow_payment', {
    p_escrow_id: escrowPaymentId,
  });

  if (error) {
    console.error('admin_force_lock_escrow_payment:', error.message);
    return { success: false, finalTransactionId: null, error: error.message };
  }

  notifyClassPaymentsChanged();

  const finalTransactionId = (data as string) ?? null;
  if (finalTransactionId) {
    const emailResult = await sendClassPaymentReceiptEmail(finalTransactionId);
    if (!emailResult.ok && !emailResult.alreadySent) {
      return {
        success: true,
        finalTransactionId,
        error: emailResult.error ?? 'Locked, but the official receipt email was not sent.',
      };
    }
  }

  return { success: true, finalTransactionId, error: null };
}

export async function adminMarkCashRefundDisbursed(
  escrowPaymentId: string,
  note = 'Cash refund sent manually.',
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('admin_mark_cash_refund_disbursed', {
    p_escrow_payment_id: escrowPaymentId,
    p_note: note,
  });

  if (error) {
    console.error('admin_mark_cash_refund_disbursed:', error.message);
    return { success: false, error: error.message };
  }

  notifyClassPaymentsChanged();
  return { success: true, error: null };
}

export async function finalizeDueEscrowPayments(): Promise<{
  count: number;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('finalize_due_escrow_payments');

  if (error) {
    console.error('finalize_due_escrow_payments:', error.message);
    return { count: 0, error: error.message };
  }

  const count = Number(data ?? 0);
  if (count > 0) notifyClassPaymentsChanged();
  return { count, error: null };
}

async function resolveFinalTransactionId(escrowOrFinalId: string): Promise<{
  finalId: string | null;
  error: string | null;
}> {
  const { data: byFinal, error: finalError } = await supabase
    .from('final_transactions')
    .select('id')
    .eq('id', escrowOrFinalId)
    .maybeSingle();

  if (finalError) {
    return { finalId: null, error: finalError.message };
  }
  if (byFinal?.id) {
    return { finalId: byFinal.id as string, error: null };
  }

  const { data: byEscrow, error: escrowError } = await supabase
    .from('final_transactions')
    .select('id')
    .eq('escrow_payment_id', escrowOrFinalId)
    .maybeSingle();

  if (escrowError) {
    return { finalId: null, error: escrowError.message };
  }
  if (byEscrow?.id) {
    return { finalId: byEscrow.id as string, error: null };
  }

  return {
    finalId: null,
    error: 'Official receipt is not available until the payment is finalized (after the refund window).',
  };
}

export async function fetchClassPaymentReceiptHtml(paymentId: string): Promise<{
  html: string | null;
  error: string | null;
}> {
  const { finalId, error: resolveError } = await resolveFinalTransactionId(paymentId);
  if (resolveError || !finalId) {
    return { html: null, error: resolveError ?? 'Receipt not found.' };
  }

  const { data, error } = await supabase
    .from('final_transactions')
    .select('receipt_html')
    .eq('id', finalId)
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

  const ensure = await sendClassPaymentReceiptEmail(finalId, { storeOnly: true });
  if (!ensure.ok) {
    return { html: null, error: ensure.error ?? 'Could not generate e-receipt.' };
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('final_transactions')
    .select('receipt_html')
    .eq('id', finalId)
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
  const { finalId, error: resolveError } = await resolveFinalTransactionId(paymentId);
  if (resolveError || !finalId) {
    return { ok: false, error: resolveError ?? 'Receipt not finalized yet.' };
  }

  const { error } = await supabase
    .from('final_transactions')
    .update({ receipt_printed: true })
    .eq('id', finalId);

  if (error) {
    console.error('markClassPaymentReceiptPrinted:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Opens the system print dialog (Save as PDF) for stored official receipt HTML. */
export function downloadOfficialReceiptPdfFromHtml(html: string, fileBaseName: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Official receipt');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
  doc.title = fileBaseName;

  win.onload = () => {
    win.focus();
    win.print();
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };
}

export const OFFICIAL_RECEIPTS_BUCKET = 'official_receipts';

export async function uploadOfficialReceiptImage(
  finalTransactionId: string,
  file: File,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  const ext = extensionForProofFile(file);
  const storagePath = `${finalTransactionId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(OFFICIAL_RECEIPTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('uploadOfficialReceiptImage:', uploadError.message);
    return { ok: false, error: uploadError.message };
  }

  const { error: rpcError } = await supabase.rpc('admin_set_final_transaction_official_receipt', {
    p_final_transaction_id: finalTransactionId,
    p_storage_path: storagePath,
    p_original_filename: file.name,
  });

  if (rpcError) {
    console.error('admin_set_final_transaction_official_receipt:', rpcError.message);
    return { ok: false, error: rpcError.message };
  }

  return { ok: true, storagePath };
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
