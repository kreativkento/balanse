import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, FileSpreadsheet, Receipt, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminUrlSearchFilter } from '../hooks/useAdminUrlSearchFilter';
import {
  downloadOfficialReceiptCsv,
  downloadOfficialReceiptPdf,
  fetchOfficialReceiptRegister,
  formatVatBreakdown,
  type OfficialReceiptRegisterRow,
} from '../../lib/official-receipt-register';

const PH_TZ = 'Asia/Manila';

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
    if (!query) return rows;
    return rows.filter((row) =>
      row.officialReceiptNumber.toLowerCase().includes(query)
      || row.memberName.toLowerCase().includes(query)
      || row.description.toLowerCase().includes(query)
      || row.gatewayRef.toLowerCase().includes(query)
      || (row.tin ?? '').toLowerCase().includes(query),
    );
  }, [rows, search]);

  const exportRows = selectedIds.length > 0
    ? filtered.filter((row) => selectedIds.includes(row.id))
    : filtered;

  const allVisibleSelected = filtered.length > 0 && filtered.every((row) => selectedIds.includes(row.id));
  const grossTotal = filtered.reduce((sum, row) => sum + row.grossAmount, 0);

  const toggleAll = () => {
    setSelectedIds(allVisibleSelected ? [] : filtered.map((row) => row.id));
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Finance</p>
          <h2
            className="text-[#1E2A35] leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}
          >
            OR Register
          </h2>
          <p className="text-[#8A7E6E] text-sm mt-2 max-w-2xl">
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[#5A5048] text-sm">
          {filtered.length} receipt{filtered.length === 1 ? '' : 's'}
          {' · '}
          Gross {peso(grossTotal)}
          {selectedIds.length > 0 ? ` · ${selectedIds.length} selected for export` : ''}
        </p>
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

      <div className="overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] text-left text-sm">
            <thead className="border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/70 text-[10px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all visible receipts"
                  />
                </th>
                <th className="px-3 py-3 whitespace-nowrap">Official Receipt #</th>
                <th className="px-3 py-3 whitespace-nowrap">Date Issued</th>
                <th className="px-3 py-3">Member Name</th>
                <th className="px-3 py-3">TIN</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3 text-right">Gross Amount</th>
                <th className="px-3 py-3">VAT / Non-VAT</th>
                <th className="px-3 py-3">Payment Gateway Ref</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-[#B0A898]">Loading official receipts…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center">
                    <Receipt size={24} className="mx-auto mb-3 text-[#D4CDB5]" />
                    <p className="text-[#B0A898] text-sm">
                      {rows.length === 0
                        ? 'No cleared official receipts yet. They appear after a drop-in locks or a credit pack is approved.'
                        : 'No receipts match this search.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-[#D4CDB5]/30 last:border-b-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.officialReceiptNumber}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-[#1E2A35] whitespace-nowrap">
                      {row.officialReceiptNumber}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[#1E2A35]">{formatIssuedAt(row.issuedAt)}</td>
                    <td className="px-3 py-3 text-[#1E2A35]">{row.memberName}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[#5A5048]">{row.tin ?? '—'}</td>
                    <td className="px-3 py-3 text-[#1E2A35]">{row.description}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-[#1E2A35]">{peso(row.grossAmount)}</td>
                    <td className="px-3 py-3 text-xs text-[#5A5048] whitespace-nowrap">{formatVatBreakdown(row)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-[#5A5048]">{row.gatewayRef || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
