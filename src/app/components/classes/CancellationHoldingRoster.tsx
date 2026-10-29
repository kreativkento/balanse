import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchClassCancelHoldings,
  holdingNeedsNotify,
  holdingRefundPending,
  markClassCancelHoldingNotified,
  markClassCancelHoldingRefunded,
  markClassCancelHoldingsNotifiedAll,
  sendClassCancelHoldingEmails,
  type ClassCancelHoldingListItem,
} from '../../../lib/class-cancel-holding-service';

function refundKindLabel(kind: ClassCancelHoldingListItem['refundKind']): string {
  if (kind === 'credit') return 'Credit';
  if (kind === 'cash') return 'Cash';
  return '—';
}

function formatStamp(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CancellationHoldingRoster({
  requestId,
  canNotify,
  canRefund,
  compact = false,
  onChanged,
}: {
  requestId: string;
  canNotify: boolean;
  canRefund: boolean;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<ClassCancelHoldingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notifyingAll, setNotifyingAll] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await fetchClassCancelHoldings(requestId);
    if (error) toast.error(error);
    setRows(data);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const showRefund = rows.some(
    (row) => row.outcome === 'class_cancelled' || row.refundStatus === 'pending' || row.refundStatus === 'completed',
  );
  const unnotified = rows.filter(holdingNeedsNotify).length;
  const pendingRefunds = rows.filter(holdingRefundPending).length;

  const toggleNotify = async (row: ClassCancelHoldingListItem, notified: boolean) => {
    setBusyId(row.id);
    const { error } = await markClassCancelHoldingNotified({ holdingId: row.id, notified });
    if (error) {
      toast.error(error);
      setBusyId(null);
      return;
    }
    if (notified) {
      const emailed = await sendClassCancelHoldingEmails({ kind: 'holding_pending', holdingId: row.id });
      if (!emailed.ok && emailed.error) toast.error(emailed.error);
      else toast.success(`Notified ${row.memberName}`);
    }
    await load();
    onChanged?.();
    setBusyId(null);
  };

  const notifyAll = async () => {
    setNotifyingAll(true);
    const remaining = rows.filter(holdingNeedsNotify);
    const { error } = await markClassCancelHoldingsNotifiedAll(requestId);
    if (error) {
      toast.error(error);
      setNotifyingAll(false);
      return;
    }
    for (const row of remaining) {
      await sendClassCancelHoldingEmails({ kind: 'holding_pending', holdingId: row.id });
    }
    toast.success(remaining.length === 1 ? 'Notified 1 student' : `Notified ${remaining.length} students`);
    await load();
    onChanged?.();
    setNotifyingAll(false);
  };

  const completeRefund = async (row: ClassCancelHoldingListItem) => {
    setBusyId(row.id);
    const { error } = await markClassCancelHoldingRefunded(row.id);
    if (error) {
      toast.error(error);
      setBusyId(null);
      return;
    }
    const emailed = await sendClassCancelHoldingEmails({ kind: 'holding_refunded', holdingId: row.id });
    if (!emailed.ok && emailed.error) toast.error(emailed.error);
    else toast.success(`Refund recorded for ${row.memberName}`);
    await load();
    onChanged?.();
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/50 px-3 py-3 text-xs text-[#8A7E6E]">
        <Loader2 size={14} className="animate-spin" />
        Loading enrolled students…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/50 px-3 py-2.5 text-[11px] text-[#8A7E6E]">
        No enrolled students on this class. Front desk has no roster to notify.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#D4CDB5]/60 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/70 px-3 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E]">Enrolled students</p>
          <p className="text-[11px] text-[#5A5048]">
            {rows.length} on hold
            {unnotified > 0 ? ` · ${unnotified} not notified` : ''}
            {pendingRefunds > 0 ? ` · ${pendingRefunds} refund pending` : ''}
          </p>
        </div>
        {canNotify && unnotified > 0 ? (
          <button
            type="button"
            disabled={notifyingAll}
            onClick={() => void notifyAll()}
            className="rounded-full border border-[#D4CDB5] bg-white px-2.5 py-1 text-[10px] font-bold text-[#1E2A35] hover:bg-[#F8F3E8] disabled:opacity-60"
          >
            {notifyingAll ? 'Notifying…' : 'Notify remaining'}
          </button>
        ) : null}
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-[#D4CDB5]/30">
        {rows.map((row) => {
          const busy = busyId === row.id;
          return (
            <div
              key={row.id}
              className={`grid items-center gap-2 px-3 py-2 ${
                compact || !showRefund
                  ? 'grid-cols-[1fr_auto]'
                  : 'grid-cols-[1fr_auto_auto]'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#1E2A35]">{row.memberName}</p>
                <p className="truncate text-[10px] text-[#9A8E7E]">
                  {row.memberEmail || '—'}
                  {' · '}
                  {refundKindLabel(row.refundKind)}
                  {row.notifiedAt ? ` · notified ${formatStamp(row.notifiedAt)}` : ''}
                  {row.refundedAt ? ` · refunded ${formatStamp(row.refundedAt)}` : ''}
                </p>
              </div>
              <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${
                canNotify && row.outcome === 'pending_review' ? 'text-[#1E2A35] cursor-pointer' : 'text-[#8A7E6E]'
              }`}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[#c49a3c]"
                  checked={Boolean(row.notifiedAt)}
                  disabled={busy || !canNotify || row.outcome !== 'pending_review'}
                  onChange={(event) => void toggleNotify(row, event.target.checked)}
                />
                Notified
              </label>
              {showRefund ? (
                <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${
                  canRefund && holdingRefundPending(row) ? 'text-[#1E2A35] cursor-pointer' : 'text-[#8A7E6E]'
                }`}>
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#c49a3c]"
                    checked={row.refundStatus === 'completed'}
                    disabled={busy || !canRefund || !holdingRefundPending(row)}
                    onChange={(event) => {
                      if (event.target.checked) void completeRefund(row);
                    }}
                  />
                  Refunded
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
