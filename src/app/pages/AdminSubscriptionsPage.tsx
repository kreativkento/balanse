import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { toastCreated, toastDeleted, toastUpdated } from '../../lib/operation-toast';
import {
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  Coins,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';
import { useAdminUrlSearchQuery } from '../hooks/useAdminUrlSearchFilter';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  deleteSubscriptionPackageRecord,
  fetchSubscriptionPackagesForAdmin,
  isValidSubscriptionPackageUid,
  normalizeSubscriptionPackageUid,
  suggestSubscriptionPackageUid,
  upsertSubscriptionPackageRecord,
  type SubscriptionPackageRecord,
} from '../../lib/subscription-package-service';

type PlanFormState = {
  id?: string;
  uid: string;
  name: string;
  description: string;
  creditsGranted: string;
  creditValidityDays: string;
  priceAmount: string;
  isActive: boolean;
  sortOrder: number;
};

function emptyPlanForm(sortOrder: number): PlanFormState {
  return {
    uid: '',
    name: '',
    description: '',
    creditsGranted: '',
    creditValidityDays: '30',
    priceAmount: '',
    isActive: true,
    sortOrder,
  };
}

function recordToForm(record: SubscriptionPackageRecord): PlanFormState {
  return {
    id: record.id,
    uid: record.uid,
    name: record.name,
    description: record.description,
    creditsGranted: String(record.creditsGranted),
    creditValidityDays: String(record.creditValidityDays),
    priceAmount: String(record.priceAmount),
    isActive: record.isActive,
    sortOrder: record.sortOrder,
  };
}

const PACKAGE_ACCENT = '#c49a3c';

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const urlSearchQuery = useAdminUrlSearchQuery();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<SubscriptionPackageRecord[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanFormState | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planFormErrors, setPlanFormErrors] = useState<Record<string, string>>({});
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchSubscriptionPackagesForAdmin();
    if (error) toast.error(error);
    setPackages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void load();
  }, [adminUser, load]);

  const openAddPlan = useCallback(() => {
    const nextOrder =
      packages.length > 0 ? Math.max(...packages.map((p) => p.sortOrder)) + 10 : 10;
    setPlanFormErrors({});
    setEditingPlan(emptyPlanForm(nextOrder));
    setShowAddPlan(true);
  }, [packages]);

  const visiblePackages = useMemo(() => {
    const q = urlSearchQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q)
        || p.uid.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q),
    );
  }, [packages, urlSearchQuery]);

  if (!adminUser) return null;

  const activePackageCount = packages.filter((p) => p.isActive).length;
  const inactivePackageCount = packages.length - activePackageCount;
  const catalogCredits = packages
    .filter((p) => p.isActive)
    .reduce((sum, p) => sum + p.creditsGranted, 0);

  const openEdit = (record: SubscriptionPackageRecord) => {
    setShowAddPlan(false);
    setEditingPlan(recordToForm(record));
    setPlanFormErrors({});
  };

  const closeModal = () => {
    setEditingPlan(null);
    setShowAddPlan(false);
    setPlanFormErrors({});
  };

  const planForm = editingPlan;

  const validatePlanForm = (): boolean => {
    if (!planForm) return false;
    const e: Record<string, string> = {};
    const uid = normalizeSubscriptionPackageUid(planForm.uid);
    if (!uid || !isValidSubscriptionPackageUid(uid)) {
      e.uid = 'Enter a unique UID (2–48 chars: A–Z, 0–9, -, _).';
    }
    if (!planForm.name.trim()) e.name = 'Package name is required.';
    const credits = Number(planForm.creditsGranted);
    if (!planForm.creditsGranted || !Number.isInteger(credits) || credits < 1) {
      e.creditsGranted = 'Enter a whole number of credits (1 or more).';
    }
    const validity = Number(planForm.creditValidityDays);
    if (!planForm.creditValidityDays || !Number.isInteger(validity) || validity < 1) {
      e.creditValidityDays = 'Enter validity in days (1 or more).';
    }
    const price = Number(planForm.priceAmount);
    if (planForm.priceAmount === '' || Number.isNaN(price) || price < 0) {
      e.priceAmount = 'Enter a valid price (0 or more).';
    }
    setPlanFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSavePlan = async () => {
    if (!planForm || !validatePlanForm()) return;

    setSaving(true);
    const result = await upsertSubscriptionPackageRecord({
      id: planForm.id,
      uid: planForm.uid,
      name: planForm.name,
      description: planForm.description,
      creditsGranted: Number(planForm.creditsGranted),
      creditValidityDays: Number(planForm.creditValidityDays),
      priceAmount: Number(planForm.priceAmount),
      isActive: planForm.isActive,
      sortOrder: planForm.sortOrder,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      if (result.error.includes('UID')) {
        setPlanFormErrors((prev) => ({ ...prev, uid: result.error }));
      }
      return;
    }

    if (planForm.id) {
      setSavedPlanId(planForm.id);
      setTimeout(() => setSavedPlanId(null), 2500);
      toastUpdated('Package');
    } else {
      toastCreated('Package');
    }
    closeModal();
    void load();
  };

  const handleDeletePlan = async (record: SubscriptionPackageRecord) => {
    const ok = window.confirm(
      `Delete package “${record.name}” (${record.uid})? This cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(record.id);
    const { ok: deleted, error } = await deleteSubscriptionPackageRecord(record.id);
    setDeletingId(null);

    if (!deleted) {
      toast.error(error ?? 'Could not delete package.');
      return;
    }
    toastDeleted('Package');
    void load();
  };

  const updatePlanForm = (patch: Partial<PlanFormState>) => {
    setEditingPlan((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (patch.name !== undefined && !prev.id && !prev.uid.trim()) {
        next.uid = suggestSubscriptionPackageUid(patch.name);
      }
      return next;
    });
  };

  const INP =
    'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  const modalOpen = Boolean(planForm && (showAddPlan || planForm.id));

  return (
    <>
      <div className="max-w-8xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          {[
            {
              label: 'Active packages',
              value: String(activePackageCount),
              sub: `${packages.length} total in catalog`,
              icon: <CreditCard size={18} className="text-[#c49a3c]" />,
              gold: true,
            },
            {
              label: 'Inactive packages',
              value: String(inactivePackageCount),
              sub: 'Hidden from member catalog',
              icon: <CreditCard size={18} className="text-[#7A9A8A]" />,
              gold: false,
            },
            {
              label: 'Catalog credits',
              value: String(catalogCredits),
              sub: 'Credits granted per active package',
              icon: <Coins size={18} className="text-[#c49a3c]" />,
              gold: true,
            },
            {
              label: 'Total packages',
              value: String(packages.length),
              sub: 'All subscription packages',
              icon: <CreditCard size={18} className="text-amber-600" />,
              gold: false,
              amber: true,
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4 ${CARD_HOVER_GROW} ${
                s.gold ? 'border-[#c49a3c]/40' : s.amber ? 'border-amber-200/60' : 'border-[#D4CDB5]/60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  s.gold ? 'bg-[#c49a3c]/12' : s.amber ? 'bg-amber-50' : 'bg-[#EDE8D8]'
                }`}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
                <p
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem',
                    letterSpacing: '0.04em' }}
                >
                  {s.value}
                </p>
                <p className="text-[#B0A898] text-xs mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-7">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Subscription packages</p>
            <button
              type="button"
              onClick={openAddPlan}
              className="action-button flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm shrink-0"
            >
              <Plus size={16} /> Add package
            </button>
          </div>
          {loading ? (
            <div role="status" aria-live="polite" aria-label="Loading packages">
              <ContentSkeleton variant="cards" />
            </div>
          ) : visiblePackages.length === 0 ? (
            <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white px-6 py-12 text-center text-[#8A7E6E] text-sm">
              {packages.length === 0
                ? 'No packages yet. Use “Add package” to create one.'
                : 'No packages match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visiblePackages.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW} hover:shadow-md ${
                    savedPlanId === plan.id ? 'ring-2 ring-green-400/40' : ''
                  } ${!plan.isActive ? 'opacity-75' : ''}`}
                >
                  <div className="h-1.5" style={{ backgroundColor: PACKAGE_ACCENT }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <h3
                          className="text-[#1E2A35] truncate"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem',
                            letterSpacing: '0.05em' }}
                        >
                          {plan.name}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E] mt-0.5">
                          {plan.uid}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(plan)}
                          className="w-7 h-7 rounded-lg text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"
                          aria-label={`Edit ${plan.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeletePlan(plan)}
                          disabled={deletingId === plan.id}
                          className="w-7 h-7 rounded-lg text-[#8A7E6E] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all disabled:opacity-50"
                          aria-label={`Delete ${plan.name}`}
                        >
                          {deletingId === plan.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[#9A8E7E] text-xs mb-4 leading-relaxed line-clamp-3">
                      {plan.description || 'No description.'}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p
                          className="text-[#1E2A35]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
                            letterSpacing: '0.04em' }}
                        >
                          ₱{plan.priceAmount.toLocaleString()}
                        </p>
                        <p className="text-[#8A7E6E] text-xs">{plan.currency}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-[#1E2A35]"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em',  fontSize: '1.5rem' }}
                        >
                          {plan.creditsGranted}
                        </p>
                        <p className="text-[#8A7E6E] text-xs">
                          credit{plan.creditsGranted !== 1 ? 's' : ''} · {plan.creditValidityDays}d valid
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#D4CDB5]/40 flex items-center justify-end gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          plan.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {savedPlanId === plan.id && (
                      <div className="mt-2 flex items-center gap-1 text-green-600 text-xs">
                        <Check size={12} /> Saved successfully
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && planForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
              >
                {planForm.id ? 'Edit package' : 'Add package'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Package UID <span className="text-red-400">*</span>
                </label>
                <input
                  value={planForm.uid}
                  onChange={(e) => updatePlanForm({ uid: e.target.value.toUpperCase() })}
                  placeholder="e.g. GOLD-MONTH"
                  className={INP + ' font-mono tracking-wide'}
                />
                {planFormErrors.uid && <p className="text-red-500 text-xs mt-1">{planFormErrors.uid}</p>}
                <p className="text-[#B0A898] text-[11px] mt-1">Unique reference for this package. Stored uppercase.</p>
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={planForm.name}
                  onChange={(e) => updatePlanForm({ name: e.target.value })}
                  placeholder="e.g. Gold Membership"
                  className={INP}
                />
                {planFormErrors.name && <p className="text-red-500 text-xs mt-1">{planFormErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                    Credits <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={planForm.creditsGranted}
                    onChange={(e) => updatePlanForm({ creditsGranted: e.target.value })}
                    placeholder="12"
                    className={INP}
                  />
                  {planFormErrors.creditsGranted && (
                    <p className="text-red-500 text-xs mt-1">{planFormErrors.creditsGranted}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                    Validity (days) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={planForm.creditValidityDays}
                    onChange={(e) => updatePlanForm({ creditValidityDays: e.target.value })}
                    placeholder="30"
                    className={INP}
                  />
                  {planFormErrors.creditValidityDays && (
                    <p className="text-red-500 text-xs mt-1">{planFormErrors.creditValidityDays}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Price (₱) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={planForm.priceAmount}
                  onChange={(e) => updatePlanForm({ priceAmount: e.target.value })}
                  placeholder="0"
                  className={INP}
                />
                {planFormErrors.priceAmount && (
                  <p className="text-red-500 text-xs mt-1">{planFormErrors.priceAmount}</p>
                )}
              </div>
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Description
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => updatePlanForm({ description: e.target.value })}
                  rows={3}
                  placeholder="What members get with this package…"
                  className={INP + ' resize-none'}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={(e) => updatePlanForm({ isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-[#D4CDB5] text-[#c49a3c] focus:ring-[#c49a3c]/30"
                />
                <span className="text-sm text-[#1E2A35] font-medium">Active (visible to members when availing)</span>
              </label>
            </div>
            <div className="px-7 pb-7 flex gap-3 sticky bottom-0 bg-white border-t border-[#D4CDB5]/40 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSavePlan()}
                disabled={saving}
                className="action-button flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {planForm.id ? 'Save changes' : 'Create package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
