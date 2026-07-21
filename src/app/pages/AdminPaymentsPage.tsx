import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard, Check, X, Search, Receipt, Mail,
  Printer, ChevronDown, AlertCircle, Banknote, FileCheck,
  Smartphone,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminTopBar } from '../components/layout/AdminTopBar';

// ── Types ──────────────────────────────────────────────────────

type PaymentMethod = 'Bank Transfer' | 'Cash' | 'GCash' | 'Maya';
type PaymentStatus = 'pending' | 'approved' | 'rejected';
type ReceiptStatus = 'none' | 'print' | 'email' | 'both';

interface Payment {
  id: number;
  student: string;
  email: string;
  class: string;
  date: string;
  time: string;
  coach: string;
  amount: number;
  method: PaymentMethod;
  ref: string;
  proof: string | null;
  submittedAt: string;
  status: PaymentStatus;
  receiptStatus: ReceiptStatus;
  receiptIssuedAt?: string;
}

// ── Mock Data ──────────────────────────────────────────────────

const INITIAL_PAYMENTS: Payment[] = [
  { id: 1, student: 'Alex Johnson',   email: 'alex.j@email.com',     class: 'Yoga',            date: 'Tue, Apr 14', time: '8:00 AM',  coach: 'Jodi',     amount: 360, method: 'Bank Transfer', ref: 'BPI-202604141', proof: 'bpi_receipt.jpg',    submittedAt: '2 hrs ago',  status: 'pending',  receiptStatus: 'none' },
  { id: 2, student: 'Ryan Bautista',  email: 'ryan.b@email.com',     class: 'Animal Flow',     date: 'Tue, Apr 14', time: '9:00 AM',  coach: 'Ephraim',  amount: 360, method: 'Bank Transfer', ref: 'BDO-202604142', proof: 'transfer.png',       submittedAt: '3 hrs ago',  status: 'pending',  receiptStatus: 'none' },
  { id: 3, student: 'Camille Cruz',   email: 'camille.c@email.com',  class: 'Kickboxing',      date: 'Wed, Apr 15', time: '5:00 PM',  coach: 'Wolf',     amount: 360, method: 'Cash',          ref: 'CASH-001',     proof: null,                submittedAt: '30 min ago', status: 'pending',  receiptStatus: 'none' },
  { id: 4, student: 'Lea Mendoza',    email: 'lea.m@email.com',      class: 'Mat Pilates',     date: 'Thu, Apr 16', time: '9:30 AM',  coach: 'Kate',     amount: 360, method: 'Maya',          ref: 'MAYA-202604143', proof: 'maya_payment.png',  submittedAt: '5 hrs ago',  status: 'pending',  receiptStatus: 'none' },
  { id: 5, student: 'Maria Santos',   email: 'maria.s@email.com',    class: 'Mat Pilates',     date: 'Mon, Apr 7',  time: '10:00 AM', coach: 'Kate',     amount: 360, method: 'Bank Transfer', ref: 'BPI-202604101', proof: 'proof.png',          submittedAt: 'Apr 6',     status: 'approved', receiptStatus: 'email', receiptIssuedAt: 'Apr 7, 2026' },
  { id: 6, student: 'Sofia Reyes',    email: 'sofia.r@email.com',    class: 'Yoga',            date: 'Mon, Apr 7',  time: '8:00 AM',  coach: 'Jodi',     amount: 360, method: 'Bank Transfer', ref: 'BDO-202604100', proof: 'receipt.jpg',        submittedAt: 'Apr 5',     status: 'approved', receiptStatus: 'print', receiptIssuedAt: 'Apr 6, 2026' },
  { id: 7, student: 'Diego Tan',      email: 'diego.t@email.com',    class: 'Calisthenics',    date: 'Tue, Apr 8',  time: '7:00 AM',  coach: 'Rex',      amount: 360, method: 'GCash',         ref: 'GC-202604090',  proof: 'gcash.png',          submittedAt: 'Apr 7',     status: 'rejected', receiptStatus: 'none' },
  { id: 8, student: 'Jan Corpus',     email: 'jan.c@email.com',      class: 'Groundworks',     date: 'Wed, Apr 9',  time: '11:00 AM', coach: 'Alec',     amount: 360, method: 'Cash',          ref: 'CASH-002',     proof: null,                submittedAt: 'Apr 8',     status: 'approved', receiptStatus: 'none', receiptIssuedAt: 'Apr 8, 2026' },
];

// ── Receipt Modal ──────────────────────────────────────────────

function ReceiptModal({
  payment,
  onClose,
  onIssue,
}: {
  payment: Payment;
  onClose: () => void;
  onIssue: (type: 'print' | 'email' | 'both') => void;
}) {
  const [choice, setChoice] = useState<'print' | 'email' | 'both'>('email');
  const [issued, setIssued] = useState(false);

  const handleIssue = () => {
    setIssued(true);
    setTimeout(() => { onIssue(choice); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
            Issue Receipt
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4">
          {/* Payment summary */}
          <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-4">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Payment Summary</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {[
                ['Student', payment.student],
                ['Class', payment.class],
                ['Date', payment.date],
                ['Method', payment.method],
                ['Reference', payment.ref],
                ['Amount', `₱${payment.amount.toLocaleString()}`],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[#9A8E7E] text-xs">{label}</p>
                  <p className="text-[#1E2A35] font-semibold text-sm">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Receipt type */}
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Receipt Format</p>
          <div className="flex flex-col gap-2">
            {([
              { val: 'email' as const, label: 'E-Receipt via Email', desc: `Send to ${payment.email}`, Icon: Mail },
              { val: 'print' as const, label: 'Print Official Receipt', desc: 'Generate printable OR document', Icon: Printer },
              { val: 'both'  as const, label: 'Both (E-Receipt + Print)', desc: 'Issue both formats simultaneously', Icon: Receipt },
            ]).map(({ val, label, desc, Icon }) => (
              <label
                key={val}
                onClick={() => setChoice(val)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${
                  choice === val ? 'border-[#C49A3C]/60 bg-[#C49A3C]/06' : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${choice === val ? 'bg-[#C49A3C]/15' : 'bg-[#EDE8D8]'}`}>
                  <Icon size={15} className={choice === val ? 'text-[#C49A3C]' : 'text-[#8A7E6E]'} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${choice === val ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>{label}</p>
                  <p className="text-[#9A8E7E] text-xs">{desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${choice === val ? 'border-[#C49A3C]' : 'border-[#D4CDB5]'}`}>
                  {choice === val && <div className="w-2 h-2 rounded-full bg-[#C49A3C]" />}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
            Cancel
          </button>
          <button
            onClick={handleIssue}
            disabled={issued}
            className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
          >
            {issued ? <><Check size={15} /> Issued!</> : 'Issue Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [payments, setPayments]     = useState<Payment[]>(INITIAL_PAYMENTS);
  const [activeTab, setActiveTab]   = useState<'pending' | 'history'>('pending');
  const [search, setSearch]         = useState('');
  const [rejectId, setRejectId]     = useState<number | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);
  if (!adminUser) return null;

  const pending  = payments.filter(p => p.status === 'pending');
  const history  = payments.filter(p => p.status !== 'pending');

  const filtered = (list: Payment[]) =>
    list.filter(p =>
      p.student.toLowerCase().includes(search.toLowerCase()) ||
      p.class.toLowerCase().includes(search.toLowerCase()) ||
      p.ref.toLowerCase().includes(search.toLowerCase())
    );

  const approvePayment = (id: number) => {
    setPayments(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'approved', receiptIssuedAt: 'Apr 13, 2026' } : p
    ));
    const p = payments.find(pay => pay.id === id);
    if (p) setReceiptPayment({ ...p, status: 'approved' });
  };

  const rejectPayment = (id: number) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
    setRejectId(null);
  };

  const issueReceipt = (id: number, type: 'print' | 'email' | 'both') => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, receiptStatus: type } : p));
    setReceiptPayment(null);
  };

  const INP = 'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]';

  const STATS = [
    { label: 'Pending',        value: String(pending.length),   icon: <AlertCircle size={17} className="text-amber-500" />,   bg: 'bg-amber-50',       border: 'border-amber-200' },
    { label: 'Approved Today', value: String(history.filter(p => p.status === 'approved').length), icon: <Check size={17} className="text-green-600" />, bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Cash Payments',  value: String(payments.filter(p => p.method === 'Cash').length),    icon: <Banknote size={17} className="text-[#8A9E7A]" />, bg: 'bg-[#EDE8D8]', border: 'border-[#D4CDB5]/60' },
    { label: 'Receipts Issued',value: String(history.filter(p => p.receiptStatus !== 'none').length), icon: <Receipt size={17} className="text-[#C49A3C]" />, bg: 'bg-[#C49A3C]/10', border: 'border-[#C49A3C]/30' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F3E8]">
      <AdminTopBar />
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
          onIssue={(type) => issueReceipt(receiptPayment.id, type)}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-[#C49A3C]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Payments</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Payments &amp; Receipts
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {STATS.map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-4 flex items-center gap-3 ${s.border}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
            {([['pending', 'Pending Payments'], ['history', 'Payment History']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
              >
                {label}
                {id === 'pending' && pending.length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {pending.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student, class, reference…"
              className={INP}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          {/* Head */}
          <div className={`grid gap-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 ${activeTab === 'pending' ? 'grid-cols-[2fr_1.5fr_1.2fr_1fr_1.4fr_1.2fr_auto]' : 'grid-cols-[2fr_1.5fr_1.2fr_1fr_1.2fr_1fr_1.2fr_auto]'}`}>
            {(activeTab === 'pending'
              ? ['Student', 'Class / Date', 'Method', 'Amount', 'Reference', 'Proof', '']
              : ['Student', 'Class / Date', 'Method', 'Amount', 'Reference', 'Status', 'Receipt', '']
            ).map(h => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
            ))}
          </div>

          {/* Rows */}
          {filtered(activeTab === 'pending' ? pending : history).length === 0 ? (
            <div className="px-6 py-14 text-center text-[#B0A898] text-sm">No payments found.</div>
          ) : (
            <div className="divide-y divide-[#D4CDB5]/30">
              {filtered(activeTab === 'pending' ? pending : history).map(p => (
                <div
                  key={p.id}
                  className={`grid gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors ${activeTab === 'pending' ? 'grid-cols-[2fr_1.5fr_1.2fr_1fr_1.4fr_1.2fr_auto]' : 'grid-cols-[2fr_1.5fr_1.2fr_1fr_1.2fr_1fr_1.2fr_auto]'}`}
                >
                  {/* Student */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#C49A3C]/12 border border-[#C49A3C]/25 flex items-center justify-center shrink-0">
                      <span className="text-[#A67E2A] text-xs font-bold">{p.student.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                    </div>
                    <div>
                      <p className="text-[#1E2A35] text-sm font-semibold truncate">{p.student}</p>
                      <p className="text-[#B0A898] text-xs truncate">{p.email}</p>
                    </div>
                  </div>

                  {/* Class / Date */}
                  <div>
                    <p className="text-[#1E2A35] text-sm font-medium">{p.class}</p>
                    <p className="text-[#9A8E7E] text-xs">{p.date} · {p.time}</p>
                  </div>

                  {/* Method */}
                  <div className="flex items-center gap-1.5">
                    {p.method === 'Cash'
                      ? <Banknote size={13} className="text-[#8A9E7A]" />
                      : p.method === 'GCash'
                        ? <Smartphone size={13} style={{ color: '#007DFF' }} />
                        : p.method === 'Maya'
                          ? <Smartphone size={13} style={{ color: '#46BFA8' }} />
                          : <CreditCard size={13} className="text-[#3A4A5A]" />}
                    <span className="text-[#5A5048] text-sm">{p.method}</span>
                  </div>

                  {/* Amount */}
                  <p className="text-[#1E2A35] text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>₱{p.amount.toLocaleString()}</p>

                  {/* Reference */}
                  <p className="text-[#8A7E6E] text-xs font-mono truncate">{p.ref}</p>

                  {/* Status (history only) */}
                  {activeTab === 'history' && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                      p.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {p.status}
                    </span>
                  )}

                  {/* Proof (pending) or Receipt (history) */}
                  {activeTab === 'pending' ? (
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${p.proof ? 'bg-[#EDE8D8] text-[#5A5048]' : 'bg-amber-50 text-amber-700'}`}>
                      {p.proof ? <span className="flex items-center gap-1"><FileCheck size={11} /> {p.proof}</span> : 'Cash – no proof'}
                    </span>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                      p.receiptStatus !== 'none' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60'
                    }`}>
                      {p.receiptStatus !== 'none' ? `Issued (${p.receiptStatus})` : 'Not issued'}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {activeTab === 'pending' ? (
                      rejectId === p.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                          <span className="text-red-700 text-xs font-semibold">Reject?</span>
                          <button onClick={() => rejectPayment(p.id)} className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><Check size={11} /></button>
                          <button onClick={() => setRejectId(null)} className="w-6 h-6 rounded-lg bg-white border border-[#D4CDB5]/60 flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8]"><X size={11} /></button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => approvePayment(p.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setRejectId(p.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl hover:bg-red-100 active:scale-95 transition-all"
                          >
                            <X size={12} /> Reject
                          </button>
                        </>
                      )
                    ) : (
                      p.status === 'approved' && (
                        <button
                          onClick={() => setReceiptPayment(p)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#C49A3C]/10 text-[#A67E2A] border border-[#C49A3C]/30 text-xs font-bold rounded-xl hover:bg-[#C49A3C]/20 active:scale-95 transition-all"
                        >
                          <Receipt size={12} />
                          {p.receiptStatus !== 'none' ? 'Re-issue' : 'Issue OR'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[#B0A898] text-xs mt-4 text-right">
          {filtered(activeTab === 'pending' ? pending : history).length} record{filtered(activeTab === 'pending' ? pending : history).length !== 1 ? 's' : ''} shown
        </p>
      </div>
    </div>
  );
}