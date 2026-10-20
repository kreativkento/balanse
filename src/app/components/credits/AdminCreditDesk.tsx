import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientDirectoryItem } from '../../../lib/admin-service';
import { fetchClientDirectory } from '../../../lib/admin-service';
import {
  adjustCreditLot,
  downloadExpiringCreditsCsv,
  extendCreditLot,
  fetchCreditLotsForAccount,
  fetchCreditsExpiringWithinDays,
  grantCourtesyCredits,
  type AdminCreditLot,
  type ExpiringCreditRow,
} from '../../../lib/admin-credit-desk';
import type { CreditTransactionDisplay } from '../../../lib/credit-transaction-service';

const PH_TZ = 'Asia/Manila';

function formatDate(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function dateInputValue(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return parts;
}

export function AdminCreditDesk({
  transactions,
  refreshKey,
  grantSignal,
  onChanged,
}: {
  transactions: CreditTransactionDisplay[];
  refreshKey: number;
  grantSignal: number;
  onChanged: () => void;
}) {
  const [clients, setClients] = useState<ClientDirectoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [member, setMember] = useState<ClientDirectoryItem | null>(null);
  const [lots, setLots] = useState<AdminCreditLot[]>([]);
  const [expiring, setExpiring] = useState<ExpiringCreditRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [grantQty, setGrantQty] = useState('1');
  const [grantExpiry, setGrantExpiry] = useState('');
  const [grantReason, setGrantReason] = useState('');

  useEffect(() => {
    void fetchClientDirectory().then(setClients);
  }, []);

  useEffect(() => {
    void fetchCreditsExpiringWithinDays(7).then((result) => {
      if (result.error) toast.error(result.error);
      else setExpiring(result.data);
    });
  }, [refreshKey]);

  useEffect(() => {
    if (!member) {
      setLots([]);
      return;
    }
    void fetchCreditLotsForAccount(member.id).then((result) => {
      if (result.error) toast.error(result.error);
      else setLots(result.data);
    });
  }, [member, refreshKey]);

  useEffect(() => {
    if (grantSignal === 0) return;
    document.getElementById('member-credit-lookup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!member) toast.message('Look up a member before granting a courtesy credit.');
  }, [grantSignal, member]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return clients
      .filter((client) => client.name.toLowerCase().includes(q) || client.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [clients, query]);

  const activeLots = lots.filter((lot) => lot.quantityRemaining > 0);
  const soon = activeLots.filter((lot) => {
    if (!lot.expiresAt) return false;
    const ms = new Date(lot.expiresAt).getTime() - Date.now();
    return ms > 0 && ms <= 7 * 24 * 60 * 60 * 1000;
  });
  const history = transactions
    .filter((txn) => member && txn.accountId === member.id && (txn.kind === 'spend' || txn.kind === 'expire' || txn.delta < 0))
    .slice(0, 8);

  const reload = () => onChanged();

  const grant = async () => {
    if (!member) return;
    const quantity = Number(grantQty);
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error('Enter a credit amount of at least 1.');
      return;
    }
    if (!grantExpiry || !grantReason.trim()) {
      toast.error('Expiry date and an audit reason are required.');
      return;
    }
    setBusy(true);
    const result = await grantCourtesyCredits({
      accountId: member.id,
      quantity,
      expiresAt: new Date(`${grantExpiry}T23:59:00+08:00`).toISOString(),
      reason: grantReason,
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Courtesy credits granted.');
    setGrantReason('');
    reload();
  };

  const extend = async (lot: AdminCreditLot, expiry: string, reason: string) => {
    if (!expiry || !reason.trim()) {
      toast.error('New expiry and an audit reason are required.');
      return;
    }
    setBusy(true);
    const result = await extendCreditLot({
      lotId: lot.id,
      expiresAt: new Date(`${expiry}T23:59:00+08:00`).toISOString(),
      reason,
    });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Expiry extended.');
      reload();
    }
  };

  const adjust = async (lot: AdminCreditLot, rawQty: string, reason: string, revoke: boolean) => {
    const quantity = Number(rawQty);
    if (!Number.isFinite(quantity) || quantity < 1 || !reason.trim()) {
      toast.error('Enter a credit amount and an audit reason.');
      return;
    }
    setBusy(true);
    const result = await adjustCreditLot({
      lotId: lot.id,
      delta: revoke ? -quantity : quantity,
      reason,
    });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(revoke ? 'Credits revoked.' : 'Batch adjusted.');
      reload();
    }
  };

  return (
    <div id="member-credit-lookup" className="mb-4 grid min-w-0 shrink-0 gap-3 lg:grid-cols-2">
      <section className="flex max-h-[15.5rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#D4CDB5]/40 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest">Expiring soon</p>
            <p className="truncate text-sm font-semibold text-[#1E2A35]">Within 7 days</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (expiring.length === 0) {
                toast.error('No credits expiring in the next 7 days.');
                return;
              }
              downloadExpiringCreditsCsv(expiring, (iso) => formatDate(iso));
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D4CDB5] px-2.5 py-1 text-[11px] font-bold text-[#1E2A35] hover:bg-[#F8F3E8]"
          >
            <Download size={12} />
            Export
          </button>
        </div>
        {expiring.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[#B0A898]">No active credits expire in the next 7 days.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#D4CDB5]/30">
            {expiring.map((row) => (
              <div key={row.lotId} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_3.5rem_6.5rem] gap-2 px-4 py-2 text-sm">
                <p className="truncate font-medium text-[#1E2A35]">{row.memberName}</p>
                <p className="truncate text-[#8A7E6E]">{row.email || '—'}</p>
                <p className="font-bold tabular-nums text-[#1E2A35]">{row.quantityRemaining}</p>
                <p className="text-[#5A5048]">{formatDate(row.expiresAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex max-h-[15.5rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-white p-4 shadow-sm">
        <p className="shrink-0 text-[10px] uppercase tracking-widest text-[#8A7E6E]">Member credit lookup</p>
        <div className="relative mt-2 shrink-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member name or email…"
            className="w-full rounded-xl border border-[#D4CDB5]/70 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
          />
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {matches.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[#D4CDB5]/60">
            {matches.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setMember(client);
                  setQuery('');
                }}
                className="block w-full px-3 py-2 text-left hover:bg-[#F8F3E8]"
              >
                <p className="text-sm font-semibold text-[#1E2A35]">{client.name}</p>
                <p className="text-xs text-[#8A7E6E]">{client.email}</p>
              </button>
            ))}
          </div>
        )}

        {member ? (
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-[#1E2A35]">{member.name}</p>
              <p className="text-xs text-[#8A7E6E]">{member.email}</p>
            </div>

            <div className="rounded-xl border border-[#D4CDB5]/50 bg-[#FBF9F3] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E]">Grant courtesy credit</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[4.5rem_8rem_minmax(0,1fr)_auto]">
                <input value={grantQty} onChange={(event) => setGrantQty(event.target.value)} type="number" min={1} className="rounded-xl border border-[#D4CDB5] px-2.5 py-1.5 text-sm" aria-label="Credit amount" />
                <input value={grantExpiry} onChange={(event) => setGrantExpiry(event.target.value)} type="date" className="rounded-xl border border-[#D4CDB5] px-2.5 py-1.5 text-sm" aria-label="Expiry date" />
                <input value={grantReason} onChange={(event) => setGrantReason(event.target.value)} placeholder="Reason, e.g. instructor late" className="rounded-xl border border-[#D4CDB5] px-2.5 py-1.5 text-sm" />
                <button type="button" disabled={busy} onClick={() => void grant()} className="rounded-full bg-[#1E2A35] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Grant</button>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E]">Active batches</p>
              {activeLots.length === 0 ? (
                <p className="text-sm text-[#B0A898]">No credits remaining.</p>
              ) : activeLots.map((lot) => (
                <LotEditor key={lot.id} lot={lot} busy={busy} onExtend={extend} onAdjust={adjust} />
              ))}
            </div>

            {soon.length > 0 && (
              <p className="text-xs text-amber-800">
                Impending expiry: {soon.map((lot) => `${lot.quantityRemaining} on ${formatDate(lot.expiresAt)}`).join(' · ')}
              </p>
            )}

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E]">Consumed history</p>
              {history.length === 0 ? (
                <p className="text-sm text-[#B0A898]">No spends or expiries yet.</p>
              ) : (
                <ul className="space-y-1 text-xs text-[#5A5048]">
                  {history.map((txn) => (
                    <li key={txn.id}>{txn.delta} · {txn.reason || txn.className} · {formatDate(txn.createdAt)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : matches.length === 0 ? (
          <p className="text-sm text-[#B0A898]">Search a member to grant, extend, or revoke with a reason.</p>
        ) : null}
        </div>
      </section>
    </div>
  );
}

function LotEditor({
  lot,
  busy,
  onExtend,
  onAdjust,
}: {
  lot: AdminCreditLot;
  busy: boolean;
  onExtend: (lot: AdminCreditLot, expiry: string, reason: string) => Promise<void>;
  onAdjust: (lot: AdminCreditLot, qty: string, reason: string, revoke: boolean) => Promise<void>;
}) {
  const [expiry, setExpiry] = useState(lot.expiresAt ? dateInputValue(lot.expiresAt) : '');
  const [extendReason, setExtendReason] = useState('');
  const [qty, setQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');

  return (
    <div className="mb-2 rounded-xl border border-[#D4CDB5]/50 px-3 py-2">
      <p className="text-sm font-semibold text-[#1E2A35]">
        {lot.quantityRemaining} left of {lot.quantityInitial} · expires {formatDate(lot.expiresAt)} · {lot.sourceType}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto]">
        <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} className="rounded-xl border border-[#D4CDB5] px-3 py-2 text-sm" />
        <input value={extendReason} onChange={(event) => setExtendReason(event.target.value)} placeholder="Reason to extend expiry" className="rounded-xl border border-[#D4CDB5] px-3 py-2 text-sm" />
        <button type="button" disabled={busy} onClick={() => void onExtend(lot, expiry, extendReason)} className="rounded-full border border-[#1E2A35] px-3 py-2 text-xs font-bold text-[#1E2A35] disabled:opacity-60">Extend expiry</button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto]">
        <input type="number" min={1} value={qty} onChange={(event) => setQty(event.target.value)} className="rounded-xl border border-[#D4CDB5] px-3 py-2 text-sm" aria-label="Adjustment amount" />
        <input value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} placeholder="Reason to revoke or add" className="rounded-xl border border-[#D4CDB5] px-3 py-2 text-sm" />
        <button type="button" disabled={busy} onClick={() => void onAdjust(lot, qty, adjustReason, true)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-60">Revoke</button>
        <button type="button" disabled={busy} onClick={() => void onAdjust(lot, qty, adjustReason, false)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-60">Adjust up</button>
      </div>
    </div>
  );
}
