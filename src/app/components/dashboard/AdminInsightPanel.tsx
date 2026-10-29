import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { buildAdminInsightReply } from '../../../lib/admin-insights';
import type { AdminDashboardSnapshot } from '../../../lib/admin-dashboard-service';

type AdminInsightPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: AdminDashboardSnapshot | null;
  loading: boolean;
  asOfLabel: string;
  onRegenerate: () => void;
};

export function AdminInsightPanel({
  open,
  onOpenChange,
  snapshot,
  loading,
  asOfLabel,
  onRegenerate,
}: AdminInsightPanelProps) {
  const insight = useMemo(
    () => (snapshot && !snapshot.error && !loading ? buildAdminInsightReply(snapshot) : null),
    [snapshot, loading],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-[#D4CDB5] bg-[#FBF9F3] p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-[#D4CDB5]/70 bg-white px-5 py-4 pr-12 text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3E6C4] text-[#745b3c]">
              <Sparkles size={15} />
            </span>
            <SheetTitle
              className="leading-none text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
            >
              AI Summary
            </SheetTitle>
          </div>
          <SheetDescription className="text-[12px] leading-relaxed text-[#8A7E6E]">
            {asOfLabel}. A short read of the studio figures.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[#8A7E6E]">
              <Loader2 size={16} className="animate-spin" />
              Reading the studio overview…
            </div>
          ) : snapshot?.error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {snapshot.error}
            </p>
          ) : insight ? (
            <div className="space-y-4">
              <p className="text-sm font-medium leading-relaxed text-[#1E2A35]">{insight.headline}</p>
              <ul className="space-y-2.5">
                {insight.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[#3E342C]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c49a3c]" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              {insight.actions.length > 0 ? (
                <div className="divide-y divide-[#EDE8D8] overflow-hidden rounded-2xl border border-[#D4CDB5]/70 bg-white">
                  {insight.actions.map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-[#F3E6C4]/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#1E2A35]">
                          {action.label}
                        </span>
                        <span className="block truncate text-[11px] text-[#8A7E6E]">{action.detail}</span>
                      </span>
                      <ChevronRight size={15} className="shrink-0 text-[#C0B8A8]" />
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-sm text-[#8A7E6E]">Studio figures are not available yet.</p>
          )}
        </div>

        <div className="shrink-0 border-t border-[#D4CDB5]/70 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#c49a3c]/45 bg-[#FBF6EA] px-4 py-2.5 text-xs font-semibold text-[#745b3c] transition-colors hover:bg-[#F3E6C4] hover:text-[#1E2A35] disabled:opacity-50"
          >
            <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
            Regenerate
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
