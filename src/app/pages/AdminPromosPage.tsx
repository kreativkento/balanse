import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Tag, Plus, X, Check, Pencil, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

// ── Types & Data ───────────────────────────────────────────────

type DiscountType = 'percentage' | 'flat';
type PromoStatus  = 'active' | 'inactive' | 'expired';

interface Promo {
  id: number;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  eligibility: string;
  minSessions: number | null;
  status: PromoStatus;
  usedCount: number;
  expiryDate: string;
}

const INITIAL_PROMOS: Promo[] = [
  { id: 1, name: 'Loyalty Reward',    code: 'LOYAL10',   type: 'percentage', value: 10,  eligibility: 'Clients with 12+ sessions',    minSessions: 12, status: 'active',   usedCount: 3,  expiryDate: 'Dec 31, 2026' },
  { id: 2, name: 'Welcome Discount',  code: 'WELCOME200',type: 'flat',       value: 200, eligibility: 'First-time members only',      minSessions: null, status: 'active',  usedCount: 18, expiryDate: 'Jun 30, 2026' },
  { id: 3, name: 'Referral Bonus',    code: 'REFER100',  type: 'flat',       value: 100, eligibility: 'Referring existing member',     minSessions: null, status: 'active',  usedCount: 7,  expiryDate: 'Sep 30, 2026' },
  { id: 4, name: 'Summer Special',    code: 'SUMMER15',  type: 'percentage', value: 15,  eligibility: 'Gold members only',            minSessions: null, status: 'expired',  usedCount: 22, expiryDate: 'Mar 31, 2026' },
  { id: 5, name: 'Anniversary Promo', code: 'ANNIV20',   type: 'percentage', value: 20,  eligibility: 'Members with 24+ sessions',    minSessions: 24, status: 'inactive', usedCount: 0,  expiryDate: 'May 1, 2026'  },
];

const EMPTY_FORM = {
  name: '', code: '', type: 'percentage' as DiscountType, value: '',
  eligibility: '', minSessions: '', status: 'active' as PromoStatus, expiryDate: '',
};

const STATUS_STYLES: Record<PromoStatus, string> = {
  active:   'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-[#EDE8D8] text-[#7A6A52] border-[#D4CDB5]/60',
  expired:  'bg-red-50 text-red-500 border-red-200',
};

// ── Component ──────────────────────────────────────────────────

export default function AdminPromosPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [promos, setPromos]       = useState<Promo[]>(INITIAL_PROMOS);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | PromoStatus>('All');

  useEffect(() => { if (!adminUser) navigate('/admin-login'); }, [adminUser, navigate]);
  if (!adminUser) return null;

  const filtered = promos.filter(p => filterStatus === 'All' || p.status === filterStatus);
  const activeCount = promos.filter(p => p.status === 'active').length;

  const openAdd = () => { setEditingPromo(null); setForm(EMPTY_FORM); setErrors({}); setShowModal(true); };
  const openEdit = (p: Promo) => {
    setEditingPromo(p);
    setForm({ name: p.name, code: p.code, type: p.type, value: String(p.value), eligibility: p.eligibility, minSessions: p.minSessions ? String(p.minSessions) : '', status: p.status, expiryDate: p.expiryDate });
    setErrors({}); setShowModal(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())       e.name = 'Promo name is required.';
    if (!form.code.trim())       e.code = 'Promo code is required.';
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0) e.value = 'Enter a valid discount value.';
    if (!form.eligibility.trim()) e.eligibility = 'Define who qualifies for this promo.';
    if (!form.expiryDate.trim()) e.expiryDate = 'Expiry date is required.';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingPromo) {
      setPromos(prev => prev.map(p => p.id === editingPromo.id ? {
        ...p, name: form.name, code: form.code.toUpperCase(), type: form.type,
        value: Number(form.value), eligibility: form.eligibility,
        minSessions: form.minSessions ? Number(form.minSessions) : null,
        status: form.status, expiryDate: form.expiryDate,
      } : p));
    } else {
      setPromos(prev => [...prev, {
        id: Date.now(), name: form.name, code: form.code.toUpperCase(), type: form.type,
        value: Number(form.value), eligibility: form.eligibility,
        minSessions: form.minSessions ? Number(form.minSessions) : null,
        status: form.status, usedCount: 0, expiryDate: form.expiryDate,
      }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => { setPromos(prev => prev.filter(p => p.id !== id)); setDeleteId(null); };

  const INP = 'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag size={14} className="text-[#745b3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Promos & Discounts</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Promos & Discounts
            </h1>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Create Promo
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: 'Active Promos',   value: String(activeCount),                  sub: 'Currently live',         color: 'border-green-200/60'  },
            { label: 'Total Redemptions', value: String(promos.reduce((s,p)=>s+p.usedCount,0)), sub: 'All-time uses', color: 'border-[#D4CDB5]/60'   },
            { label: 'Expired Promos',  value: String(promos.filter(p=>p.status==='expired').length), sub: 'No longer active', color: 'border-red-100/60' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-3xl border ${s.color} shadow-sm px-5 py-4 ${CARD_HOVER_GROW}`}>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
              <p className="text-[#1E2A35] leading-none my-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}>{s.value}</p>
              <p className="text-[#B0A898] text-xs">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filter + Policy Note ── */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
            {(['All', 'active', 'inactive', 'expired'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${filterStatus === s ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="text-amber-600 shrink-0" />
            <p className="text-amber-700 text-xs">Loyalty promo threshold: <strong>12+ sessions</strong> (editable in Policy Settings)</p>
          </div>
        </div>

        {/* ── Promo Cards ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <Tag size={28} className="text-[#745b3c]/40 mb-3" />
            <p className="text-[#1E2A35] font-semibold mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem' }}>No Promos Found</p>
            <p className="text-[#8A7E6E] text-sm">No promos match the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(promo => (
              <div key={promo.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${CARD_HOVER_GROW} ${promo.status === 'expired' ? 'opacity-70' : 'border-[#D4CDB5]/60'}`}>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>{promo.name}</h3>
                      <code className="text-[#745b3c] text-xs font-bold bg-[#745b3c]/08 px-2 py-0.5 rounded-lg">{promo.code}</code>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_STYLES[promo.status]}`}>{promo.status}</span>
                  </div>

                  {/* Discount badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 bg-[#1E2A35] text-white px-3 py-1.5 rounded-xl">
                      <Tag size={12} />
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                        {promo.type === 'percentage' ? `${promo.value}% OFF` : `₱${promo.value} OFF`}
                      </span>
                    </div>
                    <span className="text-[#8A7E6E] text-xs">via {promo.type === 'percentage' ? 'Percentage' : 'Flat rate'}</span>
                  </div>

                  {/* Eligibility */}
                  <div className="bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 px-3 py-2.5 mb-3">
                    <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-0.5">Eligibility</p>
                    <p className="text-[#1E2A35] text-xs font-medium">{promo.eligibility}</p>
                    {promo.minSessions && (
                      <p className="text-[#9A8E7E] text-[10px] mt-0.5">Minimum {promo.minSessions} sessions required</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-[#8A7E6E]">
                    <span>{promo.usedCount} uses</span>
                    <span>Expires {promo.expiryDate}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <button onClick={() => openEdit(promo)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#EDE8D8] text-[#1E2A35] text-xs font-semibold rounded-xl hover:bg-[#E3DCC8] active:scale-95 transition-all">
                    <Pencil size={12} /> Edit
                  </button>
                  {deleteId === promo.id ? (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3">
                      <span className="text-red-700 text-xs font-semibold">Delete?</span>
                      <button onClick={() => handleDelete(promo.id)} className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center"><Check size={11} /></button>
                      <button onClick={() => setDeleteId(null)} className="w-6 h-6 rounded-lg bg-white border border-[#D4CDB5] flex items-center justify-center text-[#8A7E6E]"><X size={11} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(promo.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-100 active:scale-95 transition-all">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                {editingPromo ? 'Edit Promo' : 'Create Promo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Promo Name <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Loyalty Reward" className={INP} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              {/* Code */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Promo Code <span className="text-red-400">*</span></label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. LOYAL10" className={INP + ' font-mono'} />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>
              {/* Discount Type — Radio Buttons */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Discount Type <span className="text-red-400">*</span></label>
                <div className="flex gap-3">
                  {([
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'flat',       label: 'Flat Amount (₱)' },
                  ] as const).map(opt => (
                    <label key={opt.value} className={`flex items-center gap-2.5 flex-1 px-4 py-3 rounded-2xl border cursor-pointer transition-all ${form.type === opt.value ? 'bg-[#1E2A35] border-[#1E2A35] text-white' : 'bg-[#F8F3E8] border-[#D4CDB5]/70 text-[#5A5048] hover:border-[#745b3c]/40'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${form.type === opt.value ? 'border-white bg-white' : 'border-[#B0A898]'}`}>
                        {form.type === opt.value && <div className="w-2 h-2 rounded-full bg-[#1E2A35]" />}
                      </div>
                      <input type="radio" value={opt.value} checked={form.type === opt.value} onChange={() => setForm(f => ({ ...f, type: opt.value }))} className="sr-only" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Value */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Discount {form.type === 'percentage' ? 'Percentage (%)' : 'Amount (₱)'} <span className="text-red-400">*</span>
                </label>
                <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percentage' ? 'e.g. 10' : 'e.g. 200'} className={INP} />
                {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
              </div>
              {/* Eligibility */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Eligibility Rule <span className="text-red-400">*</span></label>
                <input value={form.eligibility} onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))} placeholder="e.g. Clients with 12+ sessions, Gold members…" className={INP} />
                {errors.eligibility && <p className="text-red-500 text-xs mt-1">{errors.eligibility}</p>}
              </div>
              {/* Min Sessions */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Min. Sessions Required <span className="text-[#B0A898]">(for session-based promos)</span></label>
                <input type="number" value={form.minSessions} onChange={e => setForm(f => ({ ...f, minSessions: e.target.value }))} placeholder="e.g. 12 (leave blank if not applicable)" className={INP} />
              </div>
              {/* Expiry + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Expiry Date <span className="text-red-400">*</span></label>
                  <input value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} placeholder="e.g. Dec 31, 2026" className={INP} />
                  {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PromoStatus }))} className={INP + ' appearance-none cursor-pointer'}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-7 pb-7 flex gap-3 border-t border-[#D4CDB5]/40 pt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                {editingPromo ? 'Save Changes' : 'Create Promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
