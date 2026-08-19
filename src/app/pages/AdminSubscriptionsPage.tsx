import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard, Pencil, Plus, X, Check, ChevronDown, Users, TrendingUp } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { CARD_HOVER_GROW, HOVER_SCALE_SMOOTH } from '../../lib/motion-classes';

// ── Types & Data ───────────────────────────────────────────────

interface Plan {
  id: number;
  name: string;
  fee: number;
  sessions: number;
  desc: string;
  color: string;
}

interface Subscriber {
  id: number;
  student: string;
  email: string;
  plan: string;
  sessionsUsed: number;
  sessionsTotal: number;
  renewalDate: string;
  status: 'active' | 'inactive';
}

const INITIAL_PLANS: Plan[] = [
  { id: 1, name: 'Single Class Pass', fee: 360,  sessions: 1,  color: '#8A7E6E', desc: 'Pay per session, no monthly commitment.' },
  { id: 2, name: 'Silver Membership', fee: 3600, sessions: 12, color: '#7A9A8A', desc: 'Monthly plan · 12 sessions included per month.' },
  { id: 3, name: 'Gold Membership',   fee: 4800, sessions: 20, color: '#C49A3C', desc: 'Monthly plan · 20 sessions included per month.' },
];

const SUBSCRIBERS: Subscriber[] = [
  { id: 1,  student: 'Alex Johnson',   email: 'alex.j@email.com',     plan: 'Gold Membership',   sessionsUsed: 14, sessionsTotal: 20, renewalDate: 'Apr 30, 2026', status: 'active'   },
  { id: 2,  student: 'Sofia Reyes',    email: 'sofia.r@email.com',    plan: 'Gold Membership',   sessionsUsed: 18, sessionsTotal: 20, renewalDate: 'Apr 22, 2026', status: 'active'   },
  { id: 3,  student: 'Pia Villanueva', email: 'pia.v@email.com',      plan: 'Gold Membership',   sessionsUsed: 12, sessionsTotal: 20, renewalDate: 'Apr 22, 2026', status: 'active'   },
  { id: 4,  student: 'Ryan Bautista',  email: 'ryan.b@email.com',     plan: 'Gold Membership',   sessionsUsed: 6,  sessionsTotal: 20, renewalDate: 'Sep 14, 2026', status: 'active'   },
  { id: 5,  student: 'Hannah Ong',     email: 'hannah.o@email.com',   plan: 'Gold Membership',   sessionsUsed: 15, sessionsTotal: 20, renewalDate: 'Aug 30, 2026', status: 'active'   },
  { id: 6,  student: 'Maria Santos',   email: 'maria.s@email.com',    plan: 'Silver Membership', sessionsUsed: 8,  sessionsTotal: 12, renewalDate: 'May 3, 2026',  status: 'active'   },
  { id: 7,  student: 'Marco Lim',      email: 'marco.lim@email.com',  plan: 'Silver Membership', sessionsUsed: 4,  sessionsTotal: 12, renewalDate: 'May 5, 2026',  status: 'active'   },
  { id: 8,  student: 'Camille Cruz',   email: 'camille.c@email.com',  plan: 'Silver Membership', sessionsUsed: 5,  sessionsTotal: 12, renewalDate: 'May 1, 2026',  status: 'active'   },
  { id: 9,  student: 'Jan Corpus',     email: 'jan.c@email.com',      plan: 'Silver Membership', sessionsUsed: 3,  sessionsTotal: 12, renewalDate: 'Feb 18, 2027', status: 'active'   },
  { id: 10, student: 'Cris Dela Cruz', email: 'cris.dc@email.com',    plan: 'Single Class Pass', sessionsUsed: 0,  sessionsTotal: 1,  renewalDate: 'N/A',          status: 'active'   },
  { id: 11, student: 'Diego Tan',      email: 'diego.t@email.com',    plan: 'Single Class Pass', sessionsUsed: 1,  sessionsTotal: 1,  renewalDate: 'N/A',          status: 'inactive' },
  { id: 12, student: 'Lea Mendoza',    email: 'lea.m@email.com',      plan: 'Single Class Pass', sessionsUsed: 0,  sessionsTotal: 1,  renewalDate: 'N/A',          status: 'active'   },
];

const PLAN_FILTER_OPTIONS = ['All Plans', 'Gold Membership', 'Silver Membership', 'Single Class Pass'];

// ── Component ──────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [plans, setPlans]       = useState<Plan[]>(INITIAL_PLANS);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', fee: '', sessions: '', desc: '', color: '#8A7E6E' });
  const [planFormErrors, setPlanFormErrors] = useState<Record<string, string>>({});
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);
  const [subFilter, setSubFilter] = useState('All Plans');

  useEffect(() => { if (!adminUser) navigate('/admin-login'); }, [adminUser, navigate]);
  if (!adminUser) return null;

  const totalCreditsRemaining = SUBSCRIBERS.filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.sessionsTotal - s.sessionsUsed), 0);

  const goldCount   = SUBSCRIBERS.filter(s => s.plan === 'Gold Membership'   && s.status === 'active').length;
  const silverCount = SUBSCRIBERS.filter(s => s.plan === 'Silver Membership' && s.status === 'active').length;
  const passCount   = SUBSCRIBERS.filter(s => s.plan === 'Single Class Pass' && s.status === 'active').length;

  const filtered = SUBSCRIBERS.filter(s => subFilter === 'All Plans' || s.plan === subFilter);

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({ name: p.name, fee: String(p.fee), sessions: String(p.sessions), desc: p.desc, color: p.color });
    setPlanFormErrors({});
  };

  const validatePlanForm = () => {
    const e: Record<string, string> = {};
    if (!planForm.name.trim()) e.name = 'Plan name is required.';
    if (!planForm.fee || isNaN(Number(planForm.fee)) || Number(planForm.fee) < 0) e.fee = 'Enter a valid fee.';
    if (!planForm.sessions || isNaN(Number(planForm.sessions)) || Number(planForm.sessions) < 1) e.sessions = 'Enter a valid session count.';
    setPlanFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSavePlan = () => {
    if (!validatePlanForm()) return;
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id
        ? { ...p, name: planForm.name, fee: Number(planForm.fee), sessions: Number(planForm.sessions), desc: planForm.desc, color: planForm.color }
        : p
      ));
      setSavedPlanId(editingPlan.id);
      setTimeout(() => setSavedPlanId(null), 2500);
      setEditingPlan(null);
    } else {
      const newPlan: Plan = { id: Date.now(), name: planForm.name, fee: Number(planForm.fee), sessions: Number(planForm.sessions), desc: planForm.desc, color: planForm.color };
      setPlans(prev => [...prev, newPlan]);
      setShowAddPlan(false);
    }
    setPlanForm({ name: '', fee: '', sessions: '', desc: '', color: '#8A7E6E' });
  };

  const INP = 'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <AdminSidebar>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-[#C49A3C]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Subscriptions</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Subscription Plans
            </h1>
          </div>
          <button
            onClick={() => { setShowAddPlan(true); setEditingPlan(null); setPlanForm({ name: '', fee: '', sessions: '', desc: '', color: '#8A7E6E' }); setPlanFormErrors({}); }}
            className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Add Plan
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            { label: 'Active Subscribers', value: '200', sub: 'All plans combined',     icon: <Users size={18} className="text-[#C49A3C]" />,     gold: true  },
            { label: 'Gold Members',        value: String(goldCount),   sub: '20 sessions/month',  icon: <CreditCard size={18} className="text-[#C49A3C]" />,  gold: true  },
            { label: 'Silver Members',      value: String(silverCount), sub: '12 sessions/month',  icon: <CreditCard size={18} className="text-[#7A9A8A]" />,  gold: false },
            { label: 'Credits Remaining',   value: String(totalCreditsRemaining), sub: 'Across active plans', icon: <TrendingUp size={18} className="text-amber-600" />, gold: false, amber: true },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4 ${CARD_HOVER_GROW} ${s.gold ? 'border-[#C49A3C]/40' : s.amber ? 'border-amber-200/60' : 'border-[#D4CDB5]/60'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${s.gold ? 'bg-[#C49A3C]/12' : s.amber ? 'bg-amber-50' : 'bg-[#EDE8D8]'}`}>{s.icon}</div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}>{s.value}</p>
                <p className="text-[#B0A898] text-xs mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Plan Cards ── */}
        <div className="mb-7">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4">Current Plans</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW} hover:shadow-md ${savedPlanId === plan.id ? 'ring-2 ring-green-400/40' : ''}`}>
                <div className="h-1.5" style={{ backgroundColor: plan.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}>{plan.name}</h3>
                    <button onClick={() => openEdit(plan)} className="w-7 h-7 rounded-lg text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
                      <Pencil size={13} />
                    </button>
                  </div>
                  <p className="text-[#9A8E7E] text-xs mb-4 leading-relaxed">{plan.desc}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.02em' }}>₱{plan.fee.toLocaleString()}</p>
                      <p className="text-[#8A7E6E] text-xs">{plan.sessions === 1 ? 'per session' : 'per month'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem' }}>{plan.sessions}</p>
                      <p className="text-[#8A7E6E] text-xs">session{plan.sessions !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#D4CDB5]/40">
                    <p className="text-[#8A7E6E] text-xs">
                      {SUBSCRIBERS.filter(s => s.plan === plan.name && s.status === 'active').length} active subscriber{SUBSCRIBERS.filter(s => s.plan === plan.name && s.status === 'active').length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {savedPlanId === plan.id && (
                    <div className="mt-2 flex items-center gap-1 text-green-600 text-xs"><Check size={12} /> Saved successfully</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Subscriber Table ── */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between bg-[#F8F3E8]/60">
            <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>Active Subscribers</h2>
            <div className="relative">
              <select value={subFilter} onChange={e => setSubFilter(e.target.value)} className="pl-3 pr-7 py-1.5 text-xs rounded-xl border border-[#D4CDB5]/70 bg-white text-[#5A5048] appearance-none outline-none focus:ring-2 focus:ring-[#C49A3C]/25 cursor-pointer">
                {PLAN_FILTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
            </div>
          </div>
          {/* Column headers */}
          <div className="grid gap-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40" style={{ gridTemplateColumns: '2fr 1.5fr 1.2fr 1.8fr 0.8fr' }}>
            {['Student', 'Plan', 'Sessions Used', 'Credits Remaining', 'Renewal'].map(h => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-[#D4CDB5]/30">
            {filtered.map(sub => {
              const remaining = sub.sessionsTotal - sub.sessionsUsed;
              const plan = plans.find(p => p.name === sub.plan);
              const fillPct = Math.round((sub.sessionsUsed / sub.sessionsTotal) * 100);
              return (
                <div key={sub.id} className="grid gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors" style={{ gridTemplateColumns: '2fr 1.5fr 1.2fr 1.8fr 0.8fr' }}>
                  <div>
                    <p className="text-[#1E2A35] text-sm font-semibold">{sub.student}</p>
                    <p className="text-[#B0A898] text-xs">{sub.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: plan?.color || '#8A7E6E' }} />
                    <span className="text-[#5A5048] text-sm">{sub.plan}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[#1E2A35] text-sm font-semibold">{sub.sessionsUsed}/{sub.sessionsTotal}</p>
                    <div className="w-full h-1.5 bg-[#EDE8D8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: plan?.color || '#8A7E6E' }} />
                    </div>
                  </div>
                  <div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                      remaining === 0 ? 'bg-red-50 text-red-600 border-red-200' :
                      remaining <= 2 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {remaining} session{remaining !== 1 ? 's' : ''} left
                    </span>
                  </div>
                  <p className="text-[#8A7E6E] text-xs">{sub.renewalDate}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Edit / Add Plan Modal ── */}
      {(editingPlan || showAddPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                {editingPlan ? 'Edit Plan' : 'Add New Plan'}
              </h3>
              <button onClick={() => { setEditingPlan(null); setShowAddPlan(false); }} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Plan Name <span className="text-red-400">*</span></label>
                <input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gold Membership" className={INP} />
                {planFormErrors.name && <p className="text-red-500 text-xs mt-1">{planFormErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Fee (₱) <span className="text-red-400">*</span></label>
                  <input type="number" value={planForm.fee} onChange={e => setPlanForm(f => ({ ...f, fee: e.target.value }))} placeholder="0" className={INP} />
                  {planFormErrors.fee && <p className="text-red-500 text-xs mt-1">{planFormErrors.fee}</p>}
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Sessions <span className="text-red-400">*</span></label>
                  <input type="number" value={planForm.sessions} onChange={e => setPlanForm(f => ({ ...f, sessions: e.target.value }))} placeholder="0" className={INP} />
                  {planFormErrors.sessions && <p className="text-red-500 text-xs mt-1">{planFormErrors.sessions}</p>}
                </div>
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Description</label>
                <textarea value={planForm.desc} onChange={e => setPlanForm(f => ({ ...f, desc: e.target.value }))} rows={2} placeholder="Brief description of this plan…" className={INP + ' resize-none'} />
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Accent Color</label>
                <div className="flex gap-3">
                  {['#C49A3C', '#7A9A8A', '#8A7E6E', '#3A4A5A', '#B86A4A', '#9A7A8A'].map(c => (
                    <button key={c} onClick={() => setPlanForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full ${HOVER_SCALE_SMOOTH} ${planForm.color === c ? 'scale-125 ring-2 ring-offset-1 ring-[#1E2A35]' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-7 pb-7 flex gap-3">
              <button onClick={() => { setEditingPlan(null); setShowAddPlan(false); }} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
              <button onClick={handleSavePlan} className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                {editingPlan ? 'Save Changes' : 'Add Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSidebar>
  );
}
