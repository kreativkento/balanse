import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, FileSpreadsheet, Receipt, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminUrlSearchFilter } from '../hooks/useAdminUrlSearchFilter';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import { CategorizedAddFilter, matchesAnySelected } from '../components/filters/CategorizedAddFilter';
import {
  ChronologicalSortSelect,
  sortChronologically,
  type ChronologicalOrder,
} from '../components/layout/ChronologicalSortSelect';
import {
  downloadOfficialReceiptCsv,
  downloadOfficialReceiptPdf,
  fetchOfficialReceiptRegister,
  formatVatBreakdown,
  type OfficialReceiptRegisterRow,
} from '../../lib/official-receipt-register';

const PH_TZ = 'Asia/Manila';

const OR_GRID_COLS =
  'grid-cols-[2.25rem_minmax(8.5rem,1fr)_7rem_minmax(8rem,1.15fr)_5.5rem_minmax(9rem,1.45fr)_6.5rem_minmax(7.5rem,1.15fr)_minmax(7rem,1fr)]';

function formatIssuedAt(iso: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function peso(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOfficialReceiptsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const [search, setSearch] = useAdminUrlSearchFilter();
  const [rows, setRows] = useState<OfficialReceiptRegisterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [chronoOrder, setChronoOrder] = useState<ChronologicalOrder>('latest');
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const { containerRef, pageSize } = useFitPageSize({ layout: 'table', fallback: 8 });

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (!adminUser) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await fetchOfficialReceiptRegister();
      if (cancelled) return;
      if (result.error) {
        toast.error(result.error);
        setRows([]);
      } else {
        setRows(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminUser]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = rows.filter((row) => {
      const matchesQuery =
        !query
        || row.officialReceiptNumber.toLowerCase().includes(query)
        || row.memberName.toLowerCase().includes(query)
        || row.description.toLowerCase().includes(query)
        || row.gatewayRef.toLowerCase().includes(query)
        || (row.tin ?? '').toLowerCase().includes(query)
        || row.paymentMethod.toLowerCase().includes(query);
      return matchesQuery && matchesAnySelected(sourceFilters, row.source);
    });
    return sortChronologically(matched, (row) => row.issuedAt, chronoOrder);
  }, [rows, search, chronoOrder, sourceFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, chronoOrder, sourceFilters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportRows = selectedIds.length > 0
    ? filtered.filter((row) => selectedIds.includes(row.id))
    : filtered;

  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));
  const somePageSelected = pageRows.some((row) => selectedIds.includes(row.id)) && !allPageSelected;
  const grossTotal = filtered.reduce((sum, row) => sum + row.grossAmount, 0);

  const togglePage = () => {
    setSelectedIds((current) => {
      if (allPageSelected) return current.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const exportCsv = () => {
    if (exportRows.length === 0) {
      toast.error('Nothing to export.');
      return;
    }
    downloadOfficialReceiptCsv(exportRows, formatIssuedAt);
    toast.success(`Exported ${exportRows.length} receipt${exportRows.length === 1 ? '' : 's'} to CSV.`);
  };

  const exportPdf = () => {
    if (exportRows.length === 0) {
      toast.error('Nothing to download.');
      return;
    }
    downloadOfficialReceiptPdf(exportRows, formatIssuedAt);
    toast.success(`Downloaded ${exportRows.length} receipt${exportRows.length === 1 ? '' : 's'} as PDF.`);
  };

  if (!adminUser) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-8xl flex-1 flex-col px-6 py-6">
        <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Finance</p>
            <h2
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}
            >
              OR Register
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#8A7E6E]">
              Cleared drop-ins and credit packs with an official receipt. TIN appears only when a physical receipt was requested.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-full border border-[#D4CDB5] bg-white px-4 py-2 text-xs font-bold text-[#1E2A35] hover:bg-[#F8F3E8]"
            >
              <FileSpreadsheet size={14} />
              Export to CSV for bookkeeper
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-full bg-[#1E2A35] px-4 py-2 text-xs font-bold text-white hover:bg-[#263545]"
            >
              <Download size={14} />
              Bulk download PDFs
            </button>
          </div>
        </div>

        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5A5048]">
            {filtered.length} receipt{filtered.length === 1 ? '' : 's'}
            {' · '}
            Gross {peso(grossTotal)}
            {selectedIds.length > 0 ? ` · ${selectedIds.length} selected for export` : ''}
          </p>
          <div className="flex w-full max-w-xl flex-wrap items-center justify-end gap-2">
            <CategorizedAddFilter
              groups={[{
                id: 'source',
                label: 'Source',
                options: [
                  { value: 'drop_in', label: 'Drop-in' },
                  { value: 'credit_pack', label: 'Credit pack' },
                ],
              }]}
              selected={{ source: sourceFilters }}
              onChange={(next) => setSourceFilters(next.source ?? [])}
            />
            <ChronologicalSortSelect value={chronoOrder} onChange={setChronoOrder} />
            <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search OR, member, class, reference…"
              className="w-full rounded-2xl border border-[#D4CDB5]/70 bg-white py-2.5 pl-10 pr-4 text-sm text-[#1E2A35] outline-none focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
            />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
          <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
            <div className="flex min-h-0 min-w-[70rem] flex-1 flex-col">
              <div className={`grid ${OR_GRID_COLS} shrink-0 gap-x-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 px-4 py-3`}>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected;
                    }}
                    onChange={togglePage}
                    aria-label="Select receipts on this page"
                    className="h-4 w-4 accent-[#c49a3c]"
                  />
                </div>
                {['Official Receipt #', 'Date Issued', 'Member Name', 'TIN', 'Description', 'Gross Amount', 'VAT / Non-VAT', 'Payment Gateway Ref'].map((header) => (
                  <p
                    key={header}
                    className={`text-[10px] font-semibold uppercase tracking-widest text-[#8A7E6E] ${
                      header === 'Gross Amount' ? 'text-right' : ''
                    }`}
                  >
                    {header}
                  </p>
                ))}
              </div>

              {loading ? (
                <div ref={containerRef} className="flex min-h-0 flex-1 items-center justify-center px-6 py-12 text-sm text-[#B0A898]">
                  Loading official receipts…
                </div>
              ) : filtered.length === 0 ? (
                <div ref={containerRef} className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                  <Receipt size={24} className="mb-3 text-[#D4CDB5]" />
                  <p className="text-sm text-[#B0A898]">
                    {rows.length === 0
                      ? 'No cleared official receipts yet. They appear after a drop-in locks or a credit pack is approved.'
                      : 'No receipts match this search.'}
                  </p>
                </div>
              ) : (
                <div ref={containerRef} className="min-h-0 flex-1 divide-y divide-[#D4CDB5]/30 overflow-hidden">
                  {pageRows.map((row) => (
                    <div
                      key={row.id}
                      className={`grid ${OR_GRID_COLS} min-h-[64px] items-center gap-x-4 px-4 py-3 transition-colors hover:bg-[#F8F3E8]/70`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`Select ${row.officialReceiptNumber}`}
                          className="h-4 w-4 accent-[#c49a3c]"
                        />
                      </div>
                      <p className="truncate font-mono text-xs font-semibold text-[#1E2A35]">
                        {row.officialReceiptNumber}
                      </p>
                      <p className="whitespace-nowrap text-sm text-[#1E2A35]">{formatIssuedAt(row.issuedAt)}</p>
                      <p className="truncate text-sm font-medium text-[#1E2A35]">{row.memberName}</p>
                      <p className="truncate whitespace-nowrap text-sm text-[#5A5048]">{row.tin ?? '—'}</p>
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 truncate text-sm text-[#1E2A35]">{row.description}</p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            row.source === 'credit_pack'
                              ? 'border-[#c49a3c]/30 bg-[#c49a3c]/10 text-[#8A6A28]'
                              : 'border-sky-200 bg-sky-50 text-sky-800'
                          }`}
                        >
                          {row.source === 'credit_pack' ? 'Credit pack' : 'Drop-in'}
                        </span>
                      </div>
                      <p
                        className="text-right font-bold tabular-nums text-[#1E2A35]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}
                      >
                        {peso(row.grossAmount)}
                      </p>
                      <p className="truncate text-xs text-[#5A5048]">{formatVatBreakdown(row)}</p>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-[#5A5048]">{row.gatewayRef || '—'}</p>
                        {row.paymentMethod ? (
                          <p className="truncate text-[11px] text-[#9A8E7E]">{row.paymentMethod}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 px-6">
            <AdminTablePagination
              page={currentPage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={filtered.length}
              noun="receipts"
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
