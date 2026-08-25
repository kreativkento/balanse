import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard, Check, X, Search, Receipt, Mail,
  Printer, AlertCircle, FileCheck,
  Smartphone, Eye, Upload, BarChart3,
  TrendingUp, Download, RefreshCcw, Layers,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

// ── Types ──────────────────────────────────────────────────────

type PaymentMethod = 'Bank Transfer' | 'GCash' | 'Maya';
type PaymentStatus = 'pending' | 'approved' | 'rejected';
type MetricPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

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
  emailSent: boolean;
  receiptPrinted: boolean;
  receiptIssuedAt?: string;
  notes?: string;
}

interface Channel {
  method: PaymentMethod;
  filename: string;
  uploadedAt: string;
}

// ── Mock Data ──────────────────────────────────────────────────

const INITIAL_PAYMENTS: Payment[] = [
  { id: 1, student: 'Alex Johnson',   email: 'alex.j@email.com',     class: 'Yoga',         date: 'Tue, Apr 14', time: '8:00 AM',  coach: 'Jodi',    amount: 360, method: 'Bank Transfer', ref: 'BPI-202604141',  proof: 'bpi_receipt.jpg',    submittedAt: '2 hrs ago',  status: 'pending',  emailSent: false, receiptPrinted: false },
  { id: 2, student: 'Ryan Bautista',  email: 'ryan.b@email.com',     class: 'Animal Flow',  date: 'Tue, Apr 14', time: '9:00 AM',  coach: 'Ephraim', amount: 360, method: 'Bank Transfer', ref: 'BDO-202604142',  proof: 'transfer.png',       submittedAt: '3 hrs ago',  status: 'pending',  emailSent: false, receiptPrinted: false },
  { id: 3, student: 'Lea Mendoza',    email: 'lea.m@email.com',      class: 'Mat Pilates',  date: 'Thu, Apr 16', time: '9:30 AM',  coach: 'Kate',    amount: 360, method: 'Maya',          ref: 'MAYA-202604143', proof: 'maya_payment.png',   submittedAt: '5 hrs ago',  status: 'pending',  emailSent: false, receiptPrinted: false },
  { id: 4, student: 'Nico Aquino',    email: 'nico.a@email.com',     class: 'Calisthenics', date: 'Fri, Apr 17', time: '7:00 AM',  coach: 'Rex',     amount: 360, method: 'GCash',         ref: 'GC-202604171',   proof: 'gcash_ss.png',       submittedAt: '1 hr ago',   status: 'pending',  emailSent: false, receiptPrinted: false },
  { id: 5, student: 'Maria Santos',   email: 'maria.s@email.com',    class: 'Mat Pilates',  date: 'Mon, Apr 7',  time: '10:00 AM', coach: 'Kate',    amount: 360, method: 'Bank Transfer', ref: 'BPI-202604101',  proof: 'proof.png',          submittedAt: 'Apr 6',      status: 'approved', emailSent: true, receiptPrinted: false, receiptIssuedAt: 'Apr 7, 2026' },
  { id: 6, student: 'Sofia Reyes',    email: 'sofia.r@email.com',    class: 'Yoga',         date: 'Mon, Apr 7',  time: '8:00 AM',  coach: 'Jodi',    amount: 360, method: 'Bank Transfer', ref: 'BDO-202604100',  proof: 'receipt.jpg',        submittedAt: 'Apr 5',      status: 'approved', emailSent: true, receiptPrinted: true, receiptIssuedAt: 'Apr 6, 2026' },
  { id: 7, student: 'Diego Tan',      email: 'diego.t@email.com',    class: 'Calisthenics', date: 'Tue, Apr 8',  time: '7:00 AM',  coach: 'Rex',     amount: 360, method: 'GCash',         ref: 'GC-202604090',   proof: 'gcash.png',          submittedAt: 'Apr 7',      status: 'rejected', emailSent: false, receiptPrinted: false, notes: 'Reference number not found' },
  { id: 8, student: 'Jan Corpus',     email: 'jan.c@email.com',      class: 'Groundworks',  date: 'Wed, Apr 9',  time: '11:00 AM', coach: 'Alec',    amount: 360, method: 'GCash',         ref: 'GC-202604091',   proof: 'jan_gcash.png',      submittedAt: 'Apr 8',      status: 'approved', emailSent: true, receiptPrinted: false, receiptIssuedAt: 'Apr 8, 2026' },
  { id: 9, student: 'Clara Villanueva', email: 'clara.v@email.com',  class: 'Yoga',         date: 'Thu, Apr 10', time: '8:00 AM',  coach: 'Jodi',    amount: 360, method: 'Maya',          ref: 'MAYA-202604100', proof: 'maya_clara.png',     submittedAt: 'Apr 9',      status: 'approved', emailSent: true, receiptPrinted: true, receiptIssuedAt: 'Apr 9, 2026' },
  { id: 10, student: 'Ben Lim',       email: 'ben.l@email.com',      class: 'Animal Flow',  date: 'Fri, Apr 11', time: '9:00 AM',  coach: 'Ephraim', amount: 360, method: 'Bank Transfer', ref: 'BPI-202604111',  proof: 'ben_proof.jpg',      submittedAt: 'Apr 10',     status: 'approved', emailSent: true, receiptPrinted: false, receiptIssuedAt: 'Apr 11, 2026' },
];

const METRICS: Record<MetricPeriod, { revenue: number; sessions: number; trend: number }> = {
  weekly:    { revenue: 5040,  sessions: 14, trend: +8.5  },
  monthly:   { revenue: 21240, sessions: 59, trend: +12.3 },
  quarterly: { revenue: 61560, sessions: 171, trend: +5.7 },
  yearly:    { revenue: 247320, sessions: 687, trend: +21.0 },
};

// ── Helpers ──────────────────────────────────────────────────

function MethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'GCash')  return <Smartphone size={13} style={{ color: '#007DFF' }} />;
  if (method === 'Maya')   return <Smartphone size={13} style={{ color: '#46BFA8' }} />;
  return <CreditCard size={13} className="text-[#3A4A5A]" />;
}

function PaymentSummaryGrid({ payment }: { payment: Payment }) {
  return (
    <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-4">
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
        {[
          ['Student',   payment.student],
          ['Class',     `${payment.class} · ${payment.date}`],
          ['Coach',     payment.coach],
          ['Amount',    `₱${payment.amount.toLocaleString()}`],
          ['Method',    payment.method],
          ['Reference', payment.ref],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-[#9A8E7E] text-xs">{label}</p>
            <p className="text-[#1E2A35] font-semibold text-sm">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Print Receipt Modal ──────────────────────────────────────

function PrintReceiptModal({ payment, onClose, onPrint }: {
  payment: Payment; onClose: () => void; onPrint: (id: number) => void;
}) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { onPrint(payment.id); onClose(); }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Receipt</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>Print Official Receipt</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
        </div>
        <div className="px-7 py-6 flex flex-col gap-4">
          <PaymentSummaryGrid payment={payment} />
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <Mail size={14} className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">
              An e-receipt has been automatically sent to <span className="font-semibold">{payment.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-2xl px-4 py-3">
            <Printer size={14} className="text-[#8A7E6E] shrink-0" />
            <p className="text-[#5A5048] text-sm">Print an official physical receipt for this payment.</p>
          </div>
        </div>
        <div className="px-7 pb-7 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
            Skip Printing
          </button>
          <button onClick={handlePrint} disabled={printing}
            className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
            {printing ? <><Check size={15} /> Printing…</> : <><Printer size={14} /> Print Receipt</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pending Payment Modal (row-click) ──────────────────────

function PendingPaymentModal({ payment, onClose, onApprove, onReject }: {
  payment: Payment; onClose: () => void;
  onApprove: (id: number) => void; onReject: (id: number) => void;
}) {
  const [confirmReject, setConfirmReject] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Pending Payment</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              #{payment.id.toString().padStart(5, '0')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
              Pending Review
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Student + Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Student</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center">
                  <span className="text-[#5e4a30] text-xs font-bold">{payment.student.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div>
                  <p className="text-[#1E2A35] text-sm font-semibold">{payment.student}</p>
                  <p className="text-[#9A8E7E] text-xs">{payment.email}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Class</p>
              <p className="text-[#1E2A35] text-sm font-semibold">{payment.class}</p>
              <p className="text-[#9A8E7E] text-xs mt-0.5">{payment.date} · {payment.time}</p>
              <p className="text-[#9A8E7E] text-xs">Coach: {payment.coach}</p>
            </div>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Amount',    value: `₱${payment.amount.toLocaleString()}`, bold: true },
              { label: 'Method',    value: payment.method },
              { label: 'Reference', value: payment.ref },
              { label: 'Submitted', value: payment.submittedAt },
              { label: 'Proof File', value: payment.proof ?? 'No file' },
              { label: 'Time',      value: payment.time },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#D4CDB5]/50 rounded-xl p-3">
                <p className="text-[#9A8E7E] text-xs mb-1">{item.label}</p>
                <p className={`text-[#1E2A35] text-sm ${item.bold ? 'font-bold' : 'font-medium'} truncate`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Proof preview */}
          {payment.proof && (
            <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-4">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Payment Proof</p>
              <div className="flex items-center gap-3 bg-white rounded-xl border border-[#D4CDB5]/50 p-3">
                <div className="w-10 h-10 bg-[#EDE8D8] rounded-lg flex items-center justify-center shrink-0">
                  <FileCheck size={18} className="text-[#8A7E6E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1E2A35] text-sm font-semibold truncate">{payment.proof}</p>
                  <p className="text-[#9A8E7E] text-xs">Uploaded · {payment.submittedAt}</p>
                </div>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-[#1E2A35] text-white text-xs rounded-xl hover:bg-[#263545] transition-all">
                  <Eye size={11} /> View
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {confirmReject ? (
          <div className="px-7 pb-7">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold">Reject this payment?</p>
                  <p className="text-red-500 text-xs mt-0.5">This will mark the payment as rejected. The student may resubmit with corrected information.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmReject(false)}
                  className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
                  Cancel
                </button>
                <button onClick={() => { onReject(payment.id); onClose(); }}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all">
                  Yes, Reject
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-7 pb-7 flex gap-3">
            <button onClick={() => setConfirmReject(true)}
              className="flex-1 py-3 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-2">
              <X size={14} /> Reject
            </button>
            <button onClick={() => { onApprove(payment.id); onClose(); }}
              className="flex-1 py-3 rounded-full bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
              <Check size={14} /> Approve Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Payment Modal (row-click) ─────────────────────

function HistoryPaymentModal({ payment, onClose, onReissue, onPrint }: {
  payment: Payment; onClose: () => void;
  onReissue: () => void; onPrint: (id: number) => void;
}) {
  const [printing, setPrinting] = useState(false);

  const handleDownload = () => {
    // simulate download
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { onPrint(payment.id); }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Payment Record</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              #{payment.id.toString().padStart(5, '0')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              payment.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
            }`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Student + Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Student</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center">
                  <span className="text-[#5e4a30] text-xs font-bold">{payment.student.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div>
                  <p className="text-[#1E2A35] text-sm font-semibold">{payment.student}</p>
                  <p className="text-[#9A8E7E] text-xs">{payment.email}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40">
              <p className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2">Class</p>
              <p className="text-[#1E2A35] text-sm font-semibold">{payment.class}</p>
              <p className="text-[#9A8E7E] text-xs mt-0.5">{payment.date} · {payment.time}</p>
              <p className="text-[#9A8E7E] text-xs">Coach: {payment.coach}</p>
            </div>
          </div>

          {/* Payment info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Amount',       value: `₱${payment.amount.toLocaleString()}`, bold: true },
              { label: 'Method',       value: payment.method },
              { label: 'Reference',    value: payment.ref },
              { label: 'Submitted',    value: payment.submittedAt },
              { label: 'Receipt Sent', value: payment.emailSent ? '✓ Email sent' : '—' },
              { label: 'Issued At',    value: payment.receiptIssuedAt ?? '—' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#D4CDB5]/50 rounded-xl p-3">
                <p className="text-[#9A8E7E] text-xs mb-1">{item.label}</p>
                <p className={`text-[#1E2A35] text-sm ${item.bold ? 'font-bold' : 'font-medium'} truncate`}>{item.value}</p>
              </div>
            ))}
          </div>

          {payment.notes && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{payment.notes}</p>
            </div>
          )}
        </div>

        {payment.status === 'approved' && (
          <div className="px-7 pb-7 flex gap-2">
            <button
              onClick={onReissue}
              className="flex-1 py-2.5 rounded-full bg-[#745b3c]/10 text-[#5e4a30] border border-[#745b3c]/30 text-sm font-bold hover:bg-[#745b3c]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Receipt size={13} /> Re-issue Receipt
            </button>
            <button
              onClick={handlePrint}
              className={`flex-1 py-2.5 rounded-full border text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 ${printing ? 'bg-green-500 text-white border-green-500' : 'bg-[#F8F3E8] text-[#5A5048] border-[#D4CDB5]/60 hover:bg-[#EDE8D8]'}`}
            >
              <Printer size={13} /> {printing ? 'Printed!' : 'Print'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 rounded-full bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#263545] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download size={13} /> Download
            </button>
          </div>
        )}
        {payment.status !== 'approved' && (
          <div className="px-7 pb-7">
            <button onClick={onClose}
              className="w-full py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Channel Manager Modal ─────────────────────────────────

function ChannelManagerModal({ uploads, onClose, onUpload }: {
  uploads: Channel[]; onClose: () => void;
  onUpload: (method: PaymentMethod, filename: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<PaymentMethod>('GCash');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(selected, file.name);
  };

  const methods: { method: PaymentMethod; color: string; desc: string }[] = [
    { method: 'GCash',         color: '#007DFF', desc: 'GCash QR code for payments' },
    { method: 'Maya',          color: '#46BFA8', desc: 'Maya/PayMaya QR code' },
    { method: 'Bank Transfer', color: '#3A4A5A', desc: 'Bank deposit / transfer details' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Admin Tools</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>Payment Channels</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
        </div>
        <div className="px-7 py-6 flex flex-col gap-5">
          <p className="text-[#8A7E6E] text-sm leading-relaxed">Manage payment channels available to clients during checkout. Upload QR codes or update account details for each method.</p>
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Payment Methods</p>
            <div className="flex flex-col gap-2">
              {methods.map(({ method, color, desc }) => {
                const existing = uploads.find(u => u.method === method);
                return (
                  <div key={method}
                    onClick={() => setSelected(method)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${selected === method ? 'border-[#745b3c]/60 bg-[#745b3c]/06' : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#745b3c]/30'}`}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
                      <Layers size={15} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${selected === method ? 'text-[#745b3c]' : 'text-[#1E2A35]'}`}>{method}</p>
                      <p className="text-[#9A8E7E] text-xs">{existing ? `✓ ${existing.filename}` : desc}</p>
                    </div>
                    {existing && <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">Active</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#D4CDB5]/70 rounded-2xl p-6 text-center cursor-pointer hover:border-[#745b3c]/50 hover:bg-[#745b3c]/03 transition-all group">
            <Upload size={20} className="mx-auto text-[#B0A898] group-hover:text-[#745b3c] transition-colors mb-2" />
            <p className="text-[#5A5048] text-sm font-semibold">Upload file for <span className="text-[#745b3c]">{selected}</span></p>
            <p className="text-[#B0A898] text-xs mt-1">PNG, JPG, or PDF, max 2MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
        </div>
        <div className="px-7 pb-7">
          <button onClick={onClose}
            className="w-full py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
            Done
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

  const [payments, setPayments]           = useState<Payment[]>(INITIAL_PAYMENTS);
  const [activeTab, setActiveTab]         = useState<'pending' | 'history'>('pending');
  const [search, setSearch]               = useState('');
  const [selectedPending, setSelectedPending] = useState<Payment | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Payment | null>(null);
  const [printPayment, setPrintPayment]   = useState<Payment | null>(null);
  const [showChannels, setShowChannels]   = useState(false);
  const [metricPeriod, setMetricPeriod]   = useState<MetricPeriod>('monthly');
  const [channels, setChannels]           = useState<Channel[]>([
    { method: 'GCash', filename: 'gcash_qr_2026.png', uploadedAt: 'Apr 1, 2026' },
  ]);

  useEffect(() => { if (!adminUser) navigate('/admin-login'); }, [adminUser, navigate]);
  if (!adminUser) return null;

  const pending = payments.filter(p => p.status === 'pending');
  const history = payments.filter(p => p.status !== 'pending');

  const filtered = (list: Payment[]) =>
    list.filter(p =>
      p.student.toLowerCase().includes(search.toLowerCase()) ||
      p.class.toLowerCase().includes(search.toLowerCase()) ||
      p.ref.toLowerCase().includes(search.toLowerCase())
    );

  const approvePayment = (id: number) => {
    setPayments(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'approved', emailSent: true, receiptIssuedAt: 'Apr 14, 2026' } : p
    ));
    const p = payments.find(pay => pay.id === id);
    if (p) setPrintPayment({ ...p, status: 'approved', emailSent: true, receiptIssuedAt: 'Apr 14, 2026' });
  };

  const rejectPayment = (id: number) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  };

  const markPrinted = (id: number) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, receiptPrinted: true } : p));
    setPrintPayment(null);
  };

  const handleChannelUpload = (method: PaymentMethod, filename: string) => {
    setChannels(prev => {
      const filtered = prev.filter(u => u.method !== method);
      return [...filtered, { method, filename, uploadedAt: 'Apr 14, 2026' }];
    });
  };

  const INP = 'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]';

  const currentMetrics = METRICS[metricPeriod];

  return (
    <>
      {selectedPending && (
        <PendingPaymentModal
          payment={selectedPending}
          onClose={() => setSelectedPending(null)}
          onApprove={(id) => { approvePayment(id); setSelectedPending(null); }}
          onReject={(id) => { rejectPayment(id); setSelectedPending(null); }}
        />
      )}
      {selectedHistory && (
        <HistoryPaymentModal
          payment={selectedHistory}
          onClose={() => setSelectedHistory(null)}
          onReissue={() => {
            if (selectedHistory) {
              setPrintPayment(selectedHistory);
              setSelectedHistory(null);
            }
          }}
          onPrint={markPrinted}
        />
      )}
      {printPayment && (
        <PrintReceiptModal
          payment={printPayment}
          onClose={() => setPrintPayment(null)}
          onPrint={markPrinted}
        />
      )}
      {showChannels && (
        <ChannelManagerModal
          uploads={channels}
          onClose={() => setShowChannels(false)}
          onUpload={handleChannelUpload}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-[#745b3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Payments</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Payments &amp; Receipts
            </h1>
          </div>
          <button
            onClick={() => setShowChannels(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#263545] active:scale-95 transition-all shadow-sm"
          >
            <Layers size={15} />
            Manage Payment Channels
            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-white/15 text-white/80 rounded-full font-bold">{channels.length}/3</span>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending Review',  value: String(pending.length),                                    icon: <AlertCircle size={17} className="text-amber-500" />,    bg: 'bg-amber-50',         border: 'border-amber-200'       },
            { label: 'Approved',        value: String(history.filter(p => p.status === 'approved').length), icon: <Check size={17} className="text-green-600" />,          bg: 'bg-green-50',         border: 'border-green-200'       },
            { label: 'Rejected',        value: String(history.filter(p => p.status === 'rejected').length), icon: <X size={17} className="text-red-500" />,               bg: 'bg-red-50',           border: 'border-red-200'         },
            { label: 'E-Receipts Sent', value: String(history.filter(p => p.emailSent).length),            icon: <Mail size={17} className="text-[#745b3c]" />,           bg: 'bg-[#745b3c]/10',    border: 'border-[#745b3c]/30'   },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-4 flex items-center gap-3 ${s.border}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Metrics */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden mb-7">
          <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-[#745b3c]" />
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Payment Metrics</h2>
            </div>
            <div className="flex gap-1 bg-[#EDE8D8] rounded-xl p-1">
              {(['weekly', 'monthly', 'quarterly', 'yearly'] as MetricPeriod[]).map(period => (
                <button key={period} onClick={() => setMetricPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${metricPeriod === period ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue',   value: `₱${currentMetrics.revenue.toLocaleString()}`,     desc: `This ${metricPeriod.replace('ly', '')}`, accent: true },
              { label: 'Sessions Paid',   value: String(currentMetrics.sessions),                    desc: 'Approved payments' },
              { label: 'Growth Rate',     value: `+${currentMetrics.trend}%`,                        desc: 'vs. previous period', color: 'text-green-600' },
              { label: 'Avg per Session', value: `₱${Math.round(currentMetrics.revenue / currentMetrics.sessions).toLocaleString()}`, desc: 'Per paid session' },
            ].map(item => (
              <div key={item.label} className={`rounded-2xl p-4 border ${item.accent ? 'bg-[#1E2A35] border-[#1E2A35]' : 'bg-[#F8F3E8] border-[#D4CDB5]/50'}`}>
                <p className={`text-xs uppercase tracking-widest mb-1.5 ${item.accent ? 'text-[#745b3c]/80' : 'text-[#8A7E6E]'}`}>{item.label}</p>
                <p className={`leading-none mb-1 ${item.accent ? 'text-white' : item.color ?? 'text-[#1E2A35]'}`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{item.value}</p>
                <p className={`text-xs ${item.accent ? 'text-white/50' : 'text-[#9A8E7E]'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-[#745b3c]" />
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Revenue Breakdown by Method</p>
            </div>
            <div className="flex flex-col gap-2">
              {([
                { method: 'Bank Transfer', pct: 52, color: '#3A4A5A' },
                { method: 'GCash',         pct: 31, color: '#007DFF' },
                { method: 'Maya',          pct: 17, color: '#46BFA8' },
              ]).map(({ method, pct, color }) => (
                <div key={method} className="flex items-center gap-3">
                  <p className="text-[#5A5048] text-xs w-28 shrink-0">{method}</p>
                  <div className="flex-1 bg-[#EDE8D8] rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-[#8A7E6E] text-xs w-8 text-right shrink-0">{pct}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
            {([['pending', 'Pending Payments'], ['history', 'Payment History']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>
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
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student, class, reference…" className={INP} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          {activeTab === 'pending' ? (
            <>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                {['Student', 'Class / Date', 'Method', 'Amount', 'Reference'].map(h => (
                  <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>
              {filtered(pending).length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <RefreshCcw size={24} className="mx-auto text-[#D4CDB5] mb-3" />
                  <p className="text-[#B0A898] text-sm">No pending payments</p>
                </div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {filtered(pending).map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPending(p)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/70 transition-colors min-h-[64px] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center shrink-0">
                          <span className="text-[#5e4a30] text-xs font-bold">{p.student.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#745b3c] transition-colors">{p.student}</p>
                          <p className="text-[#B0A898] text-xs truncate">{p.email}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{p.class}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{p.date} · {p.time}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MethodIcon method={p.method} />
                        <span className="text-[#5A5048] text-xs truncate">{p.method}</span>
                      </div>
                      <p className="text-[#1E2A35] font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>₱{p.amount.toLocaleString()}</p>
                      <div className="flex items-center justify-between min-w-0">
                        <p className="text-[#8A7E6E] text-xs font-mono truncate">{p.ref}</p>
                        <ChevronRight size={14} className="text-[#C0B8A8] shrink-0 group-hover:text-[#745b3c] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_80px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                {['Student', 'Class / Date', 'Method', 'Amount', 'Reference', 'Status'].map(h => (
                  <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>
              {filtered(history).length === 0 ? (
                <div className="px-6 py-14 text-center text-[#B0A898] text-sm">No payment history found.</div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {filtered(history).map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedHistory(p)}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_80px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/70 transition-colors min-h-[64px] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center shrink-0">
                          <span className="text-[#5e4a30] text-xs font-bold">{p.student.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#1E2A35] text-sm font-semibold truncate group-hover:text-[#745b3c] transition-colors">{p.student}</p>
                          <p className="text-[#B0A898] text-xs truncate">{p.email}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-sm font-medium truncate">{p.class}</p>
                        <p className="text-[#9A8E7E] text-xs truncate">{p.date} · {p.time}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MethodIcon method={p.method} />
                        <span className="text-[#5A5048] text-xs truncate">{p.method}</span>
                      </div>
                      <p className="text-[#1E2A35] font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>₱{p.amount.toLocaleString()}</p>
                      <div className="flex items-center justify-between min-w-0">
                        <p className="text-[#8A7E6E] text-xs font-mono truncate">{p.ref}</p>
                        <ChevronRight size={14} className="text-[#C0B8A8] shrink-0 group-hover:text-[#745b3c] transition-colors" />
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize w-fit ${
                        p.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-[#B0A898] text-xs mt-4 text-right">
          {filtered(activeTab === 'pending' ? pending : history).length} record{filtered(activeTab === 'pending' ? pending : history).length !== 1 ? 's' : ''} shown · Click any row to view details
        </p>
      </div>
    </>
  );
}
