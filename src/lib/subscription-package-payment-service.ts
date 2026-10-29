import { supabase } from './supabase';
import {
  getPaymentProofSignedUrl,
  resolvePaymentProofDisplayName,
  type PaymentEscrowState,
} from './class-payment-service';
import { sendSubscriptionPackagePaymentReviewFeedbackEmail } from './subscription-package-payment-review-email';
import { sendSubscriptionPackageReceiptEmail } from './subscription-package-receipt-email';
import { loadProfileImageUrlsForUser } from './storage-service';

export const SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED = 'balanse:subscription-package-payments-changed';

export function notifySubscriptionPackagePaymentsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SUBSCRIPTION_PACKAGE_PAYMENTS_CHANGED));
  }
}

export type SubscriptionPackagePaymentStatus = 'pending' | 'approved' | 'rejected';

export interface SubscriptionPackagePaymentDisplay {
  id: string;
  uid: string;
  subscriptionPackageId: string;
  accountId: string;
  status: SubscriptionPackagePaymentStatus;
  verified: boolean;
  escrowState: PaymentEscrowState | null;
  finalTransactionId: string | null;
  paymentChannelId: string;
  paymentMethodLabel: string;
  paymentReference: string;
  proofStoragePath: string;
  proofOriginalFilename: string;
  memberNotes: string;
  amountPaid: number;
  totalAmountDue: number;
  packageName: string;
  packageUid: string;
  creditsGranted: number;
  creditValidityDays: number;
  requestPhysicalReceipt: boolean;
  emailReceiptSent: boolean;
  receiptPrinted: boolean;
  receiptIssuedAt: string | null;
  officialReceiptNumber: string | null;
  reviewNote: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  studentPhotoUrl: string;
}

type Row = {
  id: string;
  uid: string;
  subscription_package_id: string;
  account_id: string;
  status: SubscriptionPackagePaymentStatus;
  verified: boolean;
  escrow_state: PaymentEscrowState | null;
  final_transaction_id: string | null;
  payment_channel_id: string;
  payment_method_label: string;
  payment_reference: string;
  proof_storage_path: string;
  proof_original_filename: string;
  member_notes: string;
  amount_paid: number;
  total_amount_due: number;
  package_name_snapshot: string;
  package_uid_snapshot: string;
  credits_granted_snapshot: number;
  credit_validity_days_snapshot: number;
  request_physical_receipt: boolean;
  review_note: string;
  created_at: string;
  accounts:
    | { email: string; profiles_client: { name: string } | { name: string }[] | null }
    | { email: string; profiles_client: { name: string } | { name: string }[] | null }[]
    | null;
};

const SELECT = `
  id,
  uid,
  subscription_package_id,
  account_id,
  status,
  verified,
  escrow_state,
  final_transaction_id,
  payment_channel_id,
  payment_method_label,
  payment_reference,
  proof_storage_path,
  proof_original_filename,
  member_notes,
  amount_paid,
  total_amount_due,
  package_name_snapshot,
  package_uid_snapshot,
  credits_granted_snapshot,
  credit_validity_days_snapshot,
  request_physical_receipt,
  review_note,
  created_at,
  accounts!subscription_package_payments_escrow_account_id_fkey (
    email,
    profiles_client ( name )
  )
`;

type FinalMeta = {
  email_receipt_sent: boolean;
  receipt_printed: boolean;
  receipt_issued_at: string | null;
  official_receipt_number: string | null;
};

function mapRow(row: Row, finalMeta?: FinalMeta): SubscriptionPackagePaymentDisplay {
  const accountJoin = row.accounts;
  const account = Array.isArray(accountJoin) ? accountJoin[0] : accountJoin;
  const profileJoin = account?.profiles_client;
  const profile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
  const buyerName = (profile?.name as string)?.trim() || (account?.email as string)?.trim() || 'Member';
  const buyerEmail = (account?.email as string)?.trim() || '';

  return {
    id: row.id,
    uid: row.uid,
    subscriptionPackageId: row.subscription_package_id,
    accountId: row.account_id,
    status: row.status,
    verified: row.verified,
    escrowState: row.escrow_state,
    finalTransactionId: row.final_transaction_id,
    paymentChannelId: row.payment_channel_id,
    paymentMethodLabel: row.payment_method_label,
    paymentReference: row.payment_reference,
    proofStoragePath: row.proof_storage_path,
    proofOriginalFilename: row.proof_original_filename,
    memberNotes: row.member_notes,
    amountPaid: Number(row.amount_paid),
    totalAmountDue: Number(row.total_amount_due),
    packageName: row.package_name_snapshot,
    packageUid: row.package_uid_snapshot,
    creditsGranted: row.credits_granted_snapshot,
    creditValidityDays: row.credit_validity_days_snapshot,
    requestPhysicalReceipt: row.request_physical_receipt,
    emailReceiptSent: finalMeta?.email_receipt_sent ?? false,
    receiptPrinted: finalMeta?.receipt_printed ?? false,
    receiptIssuedAt: finalMeta?.receipt_issued_at ?? null,
    officialReceiptNumber: finalMeta?.official_receipt_number?.trim() || null,
    reviewNote: row.review_note ?? '',
    createdAt: row.created_at,
    buyerName,
    buyerEmail,
    studentPhotoUrl: '',
  };
}

async function attachPhotos(rows: SubscriptionPackagePaymentDisplay[]): Promise<SubscriptionPackagePaymentDisplay[]> {
  const accountIds = [...new Set(rows.map((r) => r.accountId))];
  if (accountIds.length === 0) return rows;

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, auth_user_id')
    .in('id', accountIds);

  const authByAccount = new Map<string, string>();
  for (const a of accounts ?? []) {
    if (a.auth_user_id) authByAccount.set(a.id as string, a.auth_user_id as string);
  }

  const photoByAccount = new Map<string, string>();
  await Promise.all(
    accountIds.map(async (accountId) => {
      const authUserId = authByAccount.get(accountId);
      if (!authUserId) return;
      const urls = await loadProfileImageUrlsForUser(authUserId);
      if (urls.avatarUrl) photoByAccount.set(accountId, urls.avatarUrl);
    }),
  );

  return rows.map((r) => ({
    ...r,
    studentPhotoUrl: photoByAccount.get(r.accountId) ?? '',
  }));
}

async function loadFinalMetaById(ids: string[]): Promise<Map<string, FinalMeta>> {
  const map = new Map<string, FinalMeta>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from('subscription_package_final_transactions')
    .select('id, email_receipt_sent, receipt_printed, receipt_issued_at, official_receipt_number')
    .in('id', ids);
  for (const row of data ?? []) {
    map.set(row.id as string, {
      email_receipt_sent: row.email_receipt_sent as boolean,
      receipt_printed: row.receipt_printed as boolean,
      receipt_issued_at: row.receipt_issued_at as string | null,
      official_receipt_number: (row.official_receipt_number as string | null) ?? null,
    });
  }
  return map;
}

async function resolveSubscriptionFinalTransactionId(
  escrowOrFinalId: string,
): Promise<{ finalId: string | null; error: string | null }> {
  const { data: byFinal, error: finalError } = await supabase
    .from('subscription_package_final_transactions')
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
    .from('subscription_package_final_transactions')
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
    error: 'Official receipt is not available until the subscription payment is finalized.',
  };
}

export async function fetchSubscriptionPackageReceiptHtml(paymentId: string): Promise<{
  html: string | null;
  error: string | null;
}> {
  const { finalId, error: resolveError } = await resolveSubscriptionFinalTransactionId(paymentId);
  if (resolveError || !finalId) {
    return { html: null, error: resolveError ?? 'Receipt not found.' };
  }

  const { data, error } = await supabase
    .from('subscription_package_final_transactions')
    .select('receipt_html')
    .eq('id', finalId)
    .maybeSingle();

  if (error) {
    console.error('fetchSubscriptionPackageReceiptHtml:', error.message);
    return { html: null, error: error.message };
  }

  const html = (data?.receipt_html as string)?.trim() ?? '';
  if (!html) {
    const sent = await sendSubscriptionPackageReceiptEmail(finalId);
    if (!sent.ok) {
      return { html: null, error: sent.error ?? 'Could not generate e-receipt.' };
    }
    const { data: refreshed } = await supabase
      .from('subscription_package_final_transactions')
      .select('receipt_html')
      .eq('id', finalId)
      .maybeSingle();
    const refreshedHtml = (refreshed?.receipt_html as string)?.trim() ?? '';
    if (!refreshedHtml) {
      return { html: null, error: 'E-receipt was not stored.' };
    }
    return { html: refreshedHtml, error: null };
  }

  return { html, error: null };
}

async function queryRows(): Promise<{ rows: Row[]; error: string | null }> {
  const { data, error } = await supabase
    .from('subscription_package_payments_escrow')
    .select(SELECT)
    .order('created_at', { ascending: false });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as Row[], error: null };
}

async function mapRowsWithFinal(rows: Row[]): Promise<SubscriptionPackagePaymentDisplay[]> {
  const finalIds = rows.map((r) => r.final_transaction_id).filter(Boolean) as string[];
  const finalMeta = await loadFinalMetaById(finalIds);
  const mapped = rows.map((r) =>
    mapRow(r, r.final_transaction_id ? finalMeta.get(r.final_transaction_id) : undefined),
  );
  return attachPhotos(mapped);
}

export async function fetchSubscriptionPackagePaymentsForMember(): Promise<{
  data: SubscriptionPackagePaymentDisplay[];
  error: string | null;
}> {
  const { rows, error } = await queryRows();
  if (error) {
    console.error('fetchSubscriptionPackagePaymentsForMember:', error);
    return { data: [], error };
  }
  return { data: await mapRowsWithFinal(rows), error: null };
}

export async function fetchPendingSubscriptionPackagePaymentCount(): Promise<number> {
  const { count, error } = await supabase
    .from('subscription_package_payments_escrow')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('fetchPendingSubscriptionPackagePaymentCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchSubscriptionPackagePaymentsForAdmin(): Promise<{
  data: SubscriptionPackagePaymentDisplay[];
  error: string | null;
}> {
  const { rows, error } = await queryRows();
  if (error) {
    console.error('fetchSubscriptionPackagePaymentsForAdmin:', error);
    return { data: [], error };
  }
  return { data: await mapRowsWithFinal(rows), error: null };
}

export async function fetchSubscriptionPackagePaymentByIdForMember(
  paymentId: string,
): Promise<{ data: SubscriptionPackagePaymentDisplay | null; error: string | null }> {
  const { data, error } = await supabase
    .from('subscription_package_payments_escrow')
    .select(SELECT)
    .eq('id', paymentId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Payment not found.' };
  const row = data as Row;
  const finalMeta = row.final_transaction_id
    ? await loadFinalMetaById([row.final_transaction_id])
    : new Map<string, FinalMeta>();
  const [withPhoto] = await attachPhotos([
    mapRow(row, row.final_transaction_id ? finalMeta.get(row.final_transaction_id) : undefined),
  ]);
  return { data: withPhoto, error: null };
}

export async function submitMemberSubscriptionPackagePayment(input: {
  subscriptionPackageId: string;
  paymentChannelId: string;
  paymentReference: string;
  proofStoragePath: string;
  proofOriginalFilename?: string;
  amountPaid: number;
  memberNotes?: string;
  requestPhysicalReceipt?: boolean;
}): Promise<{ success: boolean; uid?: string; paymentId?: string; error: string | null }> {
  const { data, error } = await supabase.rpc('submit_member_subscription_package_payment', {
    p_subscription_package_id: input.subscriptionPackageId,
    p_payment_channel_id: input.paymentChannelId,
    p_payment_reference: input.paymentReference,
    p_proof_storage_path: input.proofStoragePath,
    p_amount_paid: input.amountPaid,
    p_member_notes: input.memberNotes ?? '',
    p_request_physical_receipt: input.requestPhysicalReceipt ?? false,
    p_proof_original_filename: input.proofOriginalFilename?.trim() ?? '',
  });

  if (error) {
    console.error('submit_member_subscription_package_payment:', error.message);
    return { success: false, error: error.message };
  }

  const payload = data as { payment_id?: string; uid?: string } | null;
  notifySubscriptionPackagePaymentsChanged();
  return {
    success: true,
    paymentId: payload?.payment_id,
    uid: payload?.uid,
    error: null,
  };
}

export async function resubmitMemberSubscriptionPackagePayment(input: {
  paymentId: string;
  paymentChannelId: string;
  paymentReference: string;
  proofStoragePath: string;
  proofOriginalFilename?: string;
  memberNotes?: string;
  requestPhysicalReceipt?: boolean;
}): Promise<{ success: boolean; uid?: string; error: string | null }> {
  const { data, error } = await supabase.rpc('member_resubmit_subscription_package_payment', {
    p_payment_id: input.paymentId,
    p_payment_channel_id: input.paymentChannelId,
    p_payment_reference: input.paymentReference,
    p_proof_storage_path: input.proofStoragePath,
    p_member_notes: input.memberNotes ?? '',
    p_request_physical_receipt: input.requestPhysicalReceipt ?? false,
    p_proof_original_filename: input.proofOriginalFilename?.trim() ?? '',
  });

  if (error) {
    console.error('member_resubmit_subscription_package_payment:', error.message);
    return { success: false, error: error.message };
  }

  const payload = data as { uid?: string } | null;
  notifySubscriptionPackagePaymentsChanged();
  return { success: true, uid: payload?.uid, error: null };
}

export async function adminReviewSubscriptionPackagePayment(
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
  const { data: reviewData, error } = await supabase.rpc('admin_review_subscription_package_payment', {
    p_payment_id: paymentId,
    p_approve: approve,
    p_review_note: reviewNote,
  });

  if (error) {
    console.error('admin_review_subscription_package_payment:', error.message);
    return { success: false, error: error.message };
  }

  const reviewPayload = reviewData as { final_transaction_id?: string | null } | null;

  notifySubscriptionPackagePaymentsChanged();

  const feedbackResult = await sendSubscriptionPackagePaymentReviewFeedbackEmail(paymentId);
  const feedbackEmailSent = feedbackResult.ok;
  const feedbackEmailError = feedbackResult.ok ? null : feedbackResult.error;

  if (!approve) {
    return { success: true, error: null, feedbackEmailSent, feedbackEmailError };
  }

  const finalTransactionId = reviewPayload?.final_transaction_id ?? null;
  if (!finalTransactionId) {
    return {
      success: true,
      error: null,
      feedbackEmailSent,
      feedbackEmailError,
      receiptEmailSent: false,
      receiptEmailError: 'Credits were approved but no final transaction was created.',
    };
  }

  const emailResult = await sendSubscriptionPackageReceiptEmail(finalTransactionId);
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

export { getPaymentProofSignedUrl, resolvePaymentProofDisplayName };
