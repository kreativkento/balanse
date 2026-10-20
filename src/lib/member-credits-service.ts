import { supabase } from './supabase';
import {
  creditKindLabel,
  fetchCreditTransactionsForMember,
  type CreditTransactionDisplay,
  type CreditTransactionKind,
} from './credit-transaction-service';

export type MemberSubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface MemberSubscriptionRow {
  id: string;
  packageName: string;
  packageUid: string;
  startDate: string;
  endDate: string;
  status: MemberSubscriptionStatus;
  startsAt: string;
  endsAt: string;
}

export interface MemberCreditLotSummary {
  id: string;
  quantityRemaining: number;
  expiresAt: string | null;
}

export interface ExpiringCreditsCallout {
  creditCount: number;
  expiresAtDisplay: string;
}

export interface MemberCreditsOverview {
  balance: number;
  memberNumber: string;
  /** Most recently availed subscription (any status). */
  latestSubscription: MemberSubscriptionRow | null;
  /** Current active subscription period, if any. */
  activeSubscription: MemberSubscriptionRow | null;
  subscriptions: MemberSubscriptionRow[];
  transactions: CreditTransactionDisplay[];
  creditLots: MemberCreditLotSummary[];
  expiringCredits: ExpiringCreditsCallout | null;
}

const PH_TZ = 'Asia/Manila';

function formatDisplayDate(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatMemberNumber(accountId: string): string {
  const compact = accountId.replace(/-/g, '').toUpperCase();
  const a = compact.slice(0, 4);
  const b = compact.slice(4, 8);
  return `BN · ${a} ${b}`;
}

function resolveSubscriptionStatus(
  rowStatus: MemberSubscriptionStatus,
  endsAt: string,
): MemberSubscriptionStatus {
  if (rowStatus === 'cancelled') return 'cancelled';
  if (rowStatus === 'active' && new Date(endsAt).getTime() < Date.now()) {
    return 'expired';
  }
  return rowStatus;
}

type SubscriptionDbRow = {
  id: string;
  status: MemberSubscriptionStatus;
  starts_at: string;
  ends_at: string;
  subscription_packages: {
    name: string;
    uid: string;
  } | {
    name: string;
    uid: string;
  }[] | null;
};

function mapSubscriptionRow(row: SubscriptionDbRow): MemberSubscriptionRow {
  const pkg = row.subscription_packages;
  const packageName = Array.isArray(pkg) ? pkg[0]?.name ?? 'Package' : pkg?.name ?? 'Package';
  const packageUid = Array.isArray(pkg) ? pkg[0]?.uid ?? '' : pkg?.uid ?? '';
  const status = resolveSubscriptionStatus(row.status, row.ends_at);

  return {
    id: row.id,
    packageName,
    packageUid,
    startDate: formatDisplayDate(row.starts_at),
    endDate: formatDisplayDate(row.ends_at),
    status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

export async function enrollMemberClassWithCredit(classId: string): Promise<{
  success: boolean;
  balanceAfter?: number;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('member_enroll_class_with_credit', {
    p_class_id: classId,
  });

  if (error) {
    console.error('member_enroll_class_with_credit:', error.message);
    return { success: false, error: error.message };
  }

  const payload = data as { balance_after?: number; enrolled?: boolean } | null;
  if (!payload?.enrolled) {
    return { success: false, error: 'Could not complete credit enrollment.' };
  }

  return {
    success: true,
    balanceAfter: payload.balance_after,
    error: null,
  };
}

export async function fetchMemberCreditWalletBalance(): Promise<{
  balance: number;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('account_credit_wallets')
    .select('available_balance')
    .maybeSingle();

  if (error) {
    console.error('fetchMemberCreditWalletBalance:', error.message);
    return { balance: 0, error: error.message };
  }

  return { balance: data?.available_balance ?? 0, error: null };
}

export async function fetchMemberAccountId(): Promise<{
  accountId: string | null;
  error: string | null;
}> {
  const { data, error } = await supabase.from('accounts').select('id').maybeSingle();

  if (error) {
    console.error('fetchMemberAccountId:', error.message);
    return { accountId: null, error: error.message };
  }

  return { accountId: (data?.id as string) ?? null, error: null };
}

export async function fetchMemberSubscriptions(): Promise<{
  data: MemberSubscriptionRow[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('account_subscriptions')
    .select(
      `
      id,
      status,
      starts_at,
      ends_at,
      subscription_packages ( name, uid )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchMemberSubscriptions:', error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (rows ?? []).map((row) => mapSubscriptionRow(row as SubscriptionDbRow)),
    error: null,
  };
}

export function pickLatestMemberSubscription(
  rows: MemberSubscriptionRow[],
): MemberSubscriptionRow | null {
  return rows[0] ?? null;
}

export function pickActiveMemberSubscription(
  rows: MemberSubscriptionRow[],
): MemberSubscriptionRow | null {
  return rows.find((row) => row.status === 'active') ?? null;
}

function phDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function pickNearestCreditExpiration(
  lots: MemberCreditLotSummary[],
): ExpiringCreditsCallout | null {
  const now = Date.now();
  const eligible = lots.filter(
    (lot) => lot.quantityRemaining > 0 && lot.expiresAt && new Date(lot.expiresAt).getTime() > now,
  );
  if (eligible.length === 0) return null;

  eligible.sort(
    (a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime(),
  );
  const nearestIso = eligible[0].expiresAt!;
  const nearestKey = phDateKey(nearestIso);
  const creditCount = eligible
    .filter((lot) => lot.expiresAt && phDateKey(lot.expiresAt) === nearestKey)
    .reduce((sum, lot) => sum + lot.quantityRemaining, 0);

  if (creditCount <= 0) return null;

  return {
    creditCount,
    expiresAtDisplay: formatDisplayDate(nearestIso),
  };
}

export async function fetchMemberCreditLots(): Promise<{
  data: MemberCreditLotSummary[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('account_credit_lots')
    .select('id, quantity_remaining, expires_at')
    .gt('quantity_remaining', 0)
    .order('expires_at', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('fetchMemberCreditLots:', error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (rows ?? []).map((row) => ({
      id: row.id as string,
      quantityRemaining: row.quantity_remaining as number,
      expiresAt: (row.expires_at as string | null) ?? null,
    })),
    error: null,
  };
}

export function formatSubscriptionRenewalLabel(sub: MemberSubscriptionRow): string {
  return `${sub.packageName} — Renews ${formatDisplayDate(sub.endsAt)}`;
}

export async function fetchMemberCreditsOverview(): Promise<{
  data: MemberCreditsOverview | null;
  error: string | null;
}> {
  const [
    { balance, error: walletError },
    { accountId, error: accountError },
    { data: subscriptions, error: subError },
    { data: transactions, error: txnError },
    { data: creditLots, error: lotsError },
  ] = await Promise.all([
    fetchMemberCreditWalletBalance(),
    fetchMemberAccountId(),
    fetchMemberSubscriptions(),
    fetchCreditTransactionsForMember(),
    fetchMemberCreditLots(),
  ]);

  const error = walletError ?? accountError ?? subError ?? txnError ?? lotsError;
  if (error) {
    return { data: null, error };
  }

  const activeSubscription = pickActiveMemberSubscription(subscriptions);

  return {
    data: {
      balance,
      memberNumber: accountId ? formatMemberNumber(accountId) : 'BN · ————',
      latestSubscription: pickLatestMemberSubscription(subscriptions),
      activeSubscription,
      subscriptions,
      transactions,
      creditLots,
      expiringCredits: pickNearestCreditExpiration(creditLots),
    },
    error: null,
  };
}

export type MemberCreditLedgerKind = 'earned' | 'used' | 'expired' | 'adjusted';

export interface MemberCreditLedgerRow {
  id: string;
  date: string;
  label: string;
  delta: number;
  balanceAfter: number;
  kind: MemberCreditLedgerKind;
}

function ledgerKindFromTransaction(
  kind: CreditTransactionKind,
  delta: number,
): MemberCreditLedgerKind {
  if (kind === 'spend') return 'used';
  if (kind === 'expire') return 'expired';
  if (kind === 'grant') return 'earned';
  if (kind === 'reversal') return delta >= 0 ? 'earned' : 'used';
  return 'adjusted';
}

export function creditTransactionToLedgerRow(txn: CreditTransactionDisplay): MemberCreditLedgerRow {
  const label =
    txn.reason && txn.reason !== '—'
      ? txn.reason
      : txn.className !== '—'
        ? `${creditKindLabel(txn.kind)} — ${txn.className}`
        : creditKindLabel(txn.kind);

  return {
    id: txn.reference,
    date: formatDisplayDate(txn.createdAt),
    label,
    delta: txn.delta,
    balanceAfter: txn.balanceAfter ?? 0,
    kind: ledgerKindFromTransaction(txn.kind, txn.delta),
  };
}

export function subscriptionToHistoryRow(sub: MemberSubscriptionRow): {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: MemberSubscriptionStatus;
} {
  return {
    id: sub.packageUid ? `${sub.packageUid}-${sub.id.slice(0, 8).toUpperCase()}` : sub.id,
    type: sub.packageName,
    startDate: sub.startDate,
    endDate: sub.endDate,
    status: sub.status,
  };
}
