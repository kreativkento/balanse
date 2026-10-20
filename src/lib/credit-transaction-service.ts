import { supabase } from './supabase';
import { loadProfileImageUrlsForUser } from './storage-service';

export type CreditTransactionKind =
  | 'grant'
  | 'spend'
  | 'expire'
  | 'admin_adjust'
  | 'reversal';

export interface CreditTransactionDisplay {
  id: string;
  reference: string;
  /** Used to hide duplicate grant rows when checkout payment is shown as approved. */
  idempotencyKey: string | null;
  accountId: string;
  student: string;
  studentPhotoUrl: string;
  email: string;
  delta: number;
  balanceAfter: number | null;
  kind: CreditTransactionKind;
  reason: string;
  classId: string | null;
  className: string;
  lotExpiresAt: string | null;
  createdAt: string;
  submittedAt: string;
}

type CreditTransactionRow = {
  id: string;
  account_id: string;
  delta: number;
  balance_after: number | null;
  kind: CreditTransactionKind;
  reason: string;
  class_id: string | null;
  created_at: string;
  idempotency_key: string | null;
  lot_id: string | null;
  account_credit_lots: { expires_at: string | null } | { expires_at: string | null }[] | null;
  classes: { name: string } | { name: string }[] | null;
};

const PH_TZ = 'Asia/Manila';

const TRANSACTION_SELECT = `
  id,
  account_id,
  delta,
  balance_after,
  kind,
  reason,
  class_id,
  created_at,
  idempotency_key,
  lot_id,
  account_credit_lots ( expires_at ),
  classes ( name )
`;

function formatSubmittedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} hrs ago`;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatTransactionDate(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function shortReference(id: string): string {
  return `CR-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function classNameFromRow(row: CreditTransactionRow): string {
  const c = row.classes;
  if (!c) return '—';
  if (Array.isArray(c)) return c[0]?.name?.trim() || '—';
  return c.name?.trim() || '—';
}

function lotExpiresFromRow(row: CreditTransactionRow): string | null {
  const lot = row.account_credit_lots;
  if (!lot) return null;
  const expires = Array.isArray(lot) ? lot[0]?.expires_at : lot.expires_at;
  return expires ?? null;
}

function mapRow(
  row: CreditTransactionRow,
  member: { name: string; email: string; photoUrl: string },
): CreditTransactionDisplay {
  return {
    id: row.id,
    reference: shortReference(row.id),
    idempotencyKey: row.idempotency_key?.trim() || null,
    accountId: row.account_id,
    student: member.name,
    studentPhotoUrl: member.photoUrl,
    email: member.email,
    delta: row.delta,
    balanceAfter: row.balance_after,
    kind: row.kind,
    reason: row.reason?.trim() || '—',
    classId: row.class_id,
    className: classNameFromRow(row),
    lotExpiresAt: lotExpiresFromRow(row),
    createdAt: row.created_at,
    submittedAt: formatSubmittedAt(row.created_at),
  };
}

async function attachMemberDetails(
  rows: CreditTransactionRow[],
): Promise<CreditTransactionDisplay[]> {
  if (rows.length === 0) return [];

  const accountIds = [...new Set(rows.map((r) => r.account_id))];

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, email, auth_user_id')
    .in('id', accountIds);

  const emailByAccount = new Map<string, string>();
  const authByAccount = new Map<string, string>();
  for (const row of accounts ?? []) {
    emailByAccount.set(row.id as string, (row.email as string)?.trim() || '');
    if (row.auth_user_id) authByAccount.set(row.id as string, row.auth_user_id as string);
  }

  const { data: profiles } = await supabase
    .from('profiles_client')
    .select('account_id, name, photo')
    .in('account_id', accountIds);

  const nameByAccount = new Map<string, string>();
  const photoFromProfile = new Map<string, string>();
  for (const row of profiles ?? []) {
    nameByAccount.set(row.account_id as string, (row.name as string)?.trim() || 'Member');
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

  return rows.map((row) => {
    const accountId = row.account_id;
    const authUserId = authByAccount.get(accountId);
    const profilePhoto = photoFromProfile.get(accountId) ?? '';
    const bucketPhoto = authUserId ? photoFromBucket.get(authUserId) ?? '' : '';
    const email = emailByAccount.get(accountId) ?? '';
    const name = nameByAccount.get(accountId) || email.split('@')[0] || 'Member';
    return mapRow(row, {
      name,
      email,
      photoUrl: profilePhoto || bucketPhoto,
    });
  });
}

export async function fetchCreditTransactionsForAdmin(): Promise<{
  data: CreditTransactionDisplay[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('account_credit_transactions')
    .select(TRANSACTION_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchCreditTransactionsForAdmin:', error.message);
    return { data: [], error: error.message };
  }

  const typed = (rows ?? []) as CreditTransactionRow[];
  const data = await attachMemberDetails(typed);
  return { data, error: null };
}

export async function fetchCreditTransactionsForMember(): Promise<{
  data: CreditTransactionDisplay[];
  error: string | null;
}> {
  return fetchCreditTransactionsForAdmin();
}

export function formatCreditDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function creditKindLabel(kind: CreditTransactionKind): string {
  const labels: Record<CreditTransactionKind, string> = {
    grant: 'Grant',
    spend: 'Used',
    expire: 'Expired',
    admin_adjust: 'Adjustment',
    reversal: 'Reversal',
  };
  return labels[kind];
}

/** Member ledger line, e.g. "+1 Monthly Pass" or "-1 Reformer Pilates Class". */
export function formatCreditActivityType(txn: CreditTransactionDisplay): string {
  const deltaLabel = formatCreditDelta(txn.delta);
  const reason = txn.reason?.trim();
  if (txn.kind === 'spend') {
    const target = txn.className !== '—' ? txn.className : 'Class booking';
    return `${deltaLabel} ${target}`;
  }
  if (txn.kind === 'expire') {
    return `${deltaLabel} Expired credits`;
  }
  if (txn.kind === 'reversal') {
    const label = reason && reason !== '—' ? reason : 'Refunded booking';
    return `${deltaLabel} ${label}`;
  }
  if (reason && reason !== '—') {
    return `${deltaLabel} ${reason}`;
  }
  return `${deltaLabel} ${creditKindLabel(txn.kind)}`;
}

export type CreditAllotmentStatus = 'Active' | 'Consumed' | 'Expired' | 'Pending';

export function creditAllotmentStatus(
  txn: CreditTransactionDisplay,
  nowMs: number = Date.now(),
): CreditAllotmentStatus {
  if (txn.kind === 'spend') return 'Consumed';
  if (txn.kind === 'expire') return 'Expired';
  if (txn.lotExpiresAt) {
    const expMs = new Date(txn.lotExpiresAt).getTime();
    if (Number.isFinite(expMs) && expMs <= nowMs) return 'Expired';
  }
  if (txn.delta < 0) return 'Consumed';
  return 'Active';
}

export function formatCreditTransactionWhen(iso: string): { date: string; submittedAt: string } {
  return { date: formatTransactionDate(iso), submittedAt: formatSubmittedAt(iso) };
}
