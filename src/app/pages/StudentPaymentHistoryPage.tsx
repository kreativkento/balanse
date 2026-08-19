import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard, ChevronLeft, Search, Check, X,
  Receipt, Download, Clock, CheckCircle2, Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileIncompleteState } from '../components/ProfileIncompleteState';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

// ── Types ───────────────────────────────────────────────────────

type PaymentStatus = 'approved' | 'pending' | 'rejected';
type PaymentMethod = 'Bank Transfer' | 'GCash' | 'Maya';

interface PaymentRecord {
  id: number;
  class: string;
  coach: string;
  date: string;
  time: string;
  amount: number;
  method: PaymentMethod;
  ref: string;
  submittedAt: string;
  status: PaymentStatus;
  receiptSent: boolean;
  issuedAt?: string;
  rejectionNote?: string;
}

// ── Mock Data ───────────────────────────────────────────────────

const MY_PAYMENTS: PaymentRecord[] = [
  { id: 1, class: 'Yoga',         coach: 'Jodi',    date: 'Mon, Apr 7',  time: '8:00 AM',  amount: 360, method: 'Bank Transfer', ref: 'BPI-202604101', submittedAt: 'Apr 6, 2026',  status: 'approved', receiptSent: true,  issuedAt: 'Apr 7, 2026' },
  { id: 2, class: 'Animal Flow',  coach: 'Ephraim', date: 'Thu, Apr 10', time: '9:00 AM',  amount: 360, method: 'GCash',         ref: 'GC-202604090',  submittedAt: 'Apr 9, 2026',  status: 'approved', receiptSent: true,  issuedAt: 'Apr 10, 2026' },
  { id: 3, class: 'Calisthenics', coach: 'Rex',     date: 'Tue, Apr 14', time: '7:00 AM',  amount: 360, method: 'Bank Transfer', ref: 'BPI-202604141', submittedAt: '2 hrs ago',    status: 'pending',  receiptSent: false },
  { id: 4, class: 'Mat Pilates',  coach: 'Kate',    date: 'Thu, Mar 27', time: '9:30 AM',  amount: 360, method: 'Maya',          ref: 'MAYA-202603270',submittedAt: 'Mar 26, 2026', status: 'rejected', receiptSent: false, rejectionNote: 'Reference number not found. Please re-submit with the correct reference.' },
  { id: 5, class: 'Groundworks',  coach: 'Alec',    date: 'Mon, Mar 24', time: '11:00 AM', amount: 360, method: 'GCash',         ref: 'GC-202603241',  submittedAt: 'Mar 23, 2026', status: 'approved', receiptSent: true,  issuedAt: 'Mar 24, 2026' },
  { id: 6, class: 'Kickboxing',   coach: 'Wolf',    date: 'Wed, Mar 19', time: '5:00 PM',  amount: 360, method: 'Bank Transfer', ref: 'BDO-202603190', submittedAt: 'Mar 18, 2026', status: 'approved', receiptSent: true,  issuedAt: 'Mar 19, 2026' },
];

// ── Helpers ──────────────────────────────────────────────────────

function MethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'GCash')  return <Smartphone size={13} style={{ color: '#007DFF' }} />;
  if (method === 'Maya')   return <Smartphone size={13} style={{ color: '#46BFA8' }} />;
  return <CreditCard size={13} className="text-[#3A4A5A]" />;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map = {
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────

function PaymentDetailModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Payment Receipt</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              #{payment.id.toString().padStart(5, '0')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={payment.status} />
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4">
          {/* Class info */}
          <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/40 p-4">
            <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Class</p>
            <p className="text-[#1E2A35] font-semibold">{payment.class}</p>
            <p className="text-[#9A8E7E] text-xs mt-0.5">{payment.date} · {payment.time} · Coach {payment.coach}</p>
          </div>

          {/* Payment info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Amount',    value: `₱${payment.amount.toLocaleString()}`, bold: true },
              { label: 'Method',    value: payment.method },
              { label: 'Reference', value: payment.ref },
              { label: 'Submitted', value: payment.submittedAt },
              ...(payment.issuedAt ? [{ label: 'Receipt Issued', value: payment.issuedAt }] : []),
              ...(payment.receiptSent ? [{ label: 'E-Receipt', value: '✓ Sent to email' }] : []),
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#D4CDB5]/50 rounded-xl p-3">
                <p className="text-[#9A8E7E] text-xs mb-1">{item.label}</p>
                <p className={`text-[#1E2A35] text-sm ${item.bold ? 'font-bold' : 'font-medium'} truncate`}>{item.value}</p>
              </div>
            ))}
          </div>

          {payment.rejectionNote && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <X size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-xs font-semibold mb-0.5">Rejection Reason</p>
                <p className="text-red-600 text-xs leading-relaxed">{payment.rejectionNote}</p>
              </div>
            </div>
          )}

          {payment.status === 'approved' && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <p className="text-green-700 text-xs">E-receipt was automatically sent to your registered email address.</p>
            </div>
          )}
        </div>

        <div className="px-7 pb-7 flex gap-3">
          {payment.status === 'approved' && (
            <button
              className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              <Download size={13} /> Download Receipt
            </button>
          )}
          <button onClick={onClose}
            className={`py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all ${payment.status === 'approved' ? '' : 'w-full'}`}
            style={payment.status === 'approved' ? { minWidth: '90px' } : {}}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function StudentPaymentHistoryPage() {
  const navigate = useNavigate();
  const { user, profileComplete } = useAuth();

  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all' | PaymentStatus>('all');
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  if (!user) { navigate('/login'); return null; }

  const filtered = MY_PAYMENTS.filter(p => {
    const matchSearch = p.class.toLowerCase().includes(search.toLowerCase()) || p.ref.toLowerCase().includes(search.toLowerCase()) || p.coach.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const totals = {
    total:    MY_PAYMENTS.length,
    approved: MY_PAYMENTS.filter(p => p.status === 'approved').length,
    pending:  MY_PAYMENTS.filter(p => p.status === 'pending').length,
    rejected: MY_PAYMENTS.filter(p => p.status === 'rejected').length,
    spent:    MY_PAYMENTS.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0),
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {selected && <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />}

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-xl bg-white border border-[#D4CDB5]/60 flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8] active:scale-95 transition-all shrink-0">
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CreditCard size={13} className="text-[#C49A3C]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Dashboard › Payments</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', letterSpacing: '0.04em' }}>
              Payment History
            </h1>
          </div>
        </div>

        {/* Profile gate */}
        {!profileComplete && (
          <div className={`bg-white border border-[#D4CDB5]/60 rounded-3xl shadow-sm ${CARD_HOVER_GROW}`}>
            <ProfileIncompleteState
              description="Complete your profile to view your payment history and track your class payments."
            />
          </div>
        )}

        {/* Stats + content (only when profile complete) */}
        {profileComplete && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Paid',  value: `₱${totals.spent.toLocaleString()}`, icon: <CreditCard size={15} className="text-[#C49A3C]" />, bg: 'bg-[#C49A3C]/10', border: 'border-[#C49A3C]/25' },
            { label: 'Approved',    value: String(totals.approved),              icon: <Check size={15} className="text-green-600" />,         bg: 'bg-green-50',     border: 'border-green-200' },
            { label: 'Pending',     value: String(totals.pending),               icon: <Clock size={15} className="text-amber-600" />,         bg: 'bg-amber-50',     border: 'border-amber-200' },
            { label: 'Rejected',    value: String(totals.rejected),              icon: <X size={15} className="text-red-500" />,               bg: 'bg-red-50',       border: 'border-red-200' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-center gap-3 ${s.border}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.04em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
            {(['all', 'approved', 'pending', 'rejected'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search class, coach, reference…"
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]" />
          </div>
        </div>

        {/* List */}
        <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Receipt size={24} className="mx-auto text-[#D4CDB5] mb-3" />
              <p className="text-[#B0A898] text-sm">No payments found</p>
            </div>
          ) : (
            <div className="divide-y divide-[#D4CDB5]/30">
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8F3E8]/70 transition-colors cursor-pointer group"
                >
                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    p.status === 'approved' ? 'bg-green-50 border border-green-200' :
                    p.status === 'pending'  ? 'bg-amber-50 border border-amber-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    {p.status === 'approved' ? <Check size={15} className="text-green-600" /> :
                     p.status === 'pending'  ? <Clock size={15} className="text-amber-600" /> :
                     <X size={15} className="text-red-500" />}
                  </div>

                  {/* Class + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1E2A35] text-sm font-semibold group-hover:text-[#C49A3C] transition-colors truncate">{p.class}</p>
                    <p className="text-[#9A8E7E] text-xs truncate">{p.date} · {p.time} · Coach {p.coach}</p>
                  </div>

                  {/* Method */}
                  <div className="hidden md:flex items-center gap-1.5 shrink-0">
                    <MethodIcon method={p.method} />
                    <span className="text-[#8A7E6E] text-xs">{p.method}</span>
                  </div>

                  {/* Amount */}
                  <p className="text-[#1E2A35] font-bold shrink-0" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                    ₱{p.amount.toLocaleString()}
                  </p>

                  {/* Status badge */}
                  <div className="shrink-0">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[#B0A898] text-xs mt-4 text-center">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''} · Click any row to view receipt details
        </p>
        </>}
      </div>
    </div>
  );
}
