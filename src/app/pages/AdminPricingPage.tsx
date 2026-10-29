import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Check, CreditCard, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';
import { useAdminUrlSearchQuery } from '../hooks/useAdminUrlSearchFilter';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { toastCreated, toastDeleted, toastUpdated } from '../../lib/operation-toast';
import {
  deletePricingOffering,
  fetchPricingOfferingsForAdmin,
  isValidPricingSlug,
  normalizePricingSlug,
  PRICING_OFFERING_KINDS,
  suggestPricingSlug,
  upsertPricingOffering,
  type PricingOfferingKind,
  type PricingOfferingRecord,
  type PricingOfferingTier,
} from '../../lib/pricing-offering-service';

type FormState = {
  id?: string;
  slug: string;
  kind: PricingOfferingKind;
  title: string;
  tagline: string;
  description: string;
  badge: string;
  highlight: boolean;
  heroPriceLabel: string;
  heroPriceUnit: string;
  inclusionsText: string;
  chipsText: string;
  tiers: PricingOfferingTier[];
  ctaLabel: string;
  sortOrder: string;
  isActive: boolean;
};

const INP =
  'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

function emptyForm(sortOrder: number): FormState {
  return {
    slug: '',
    kind: 'service',
    title: '',
    tagline: '',
    description: '',
    badge: '',
    highlight: false,
    heroPriceLabel: '',
    heroPriceUnit: '',
    inclusionsText: '',
    chipsText: '',
    tiers: [{ label: '', note: '', price: '', highlight: false }],
    ctaLabel: 'Inquire Now',
    sortOrder: String(sortOrder),
    isActive: true,
  };
}

function recordToForm(record: PricingOfferingRecord): FormState {
  return {
    id: record.id,
    slug: record.slug,
    kind: record.kind,
    title: record.title,
    tagline: record.tagline,
    description: record.description,
    badge: record.badge ?? '',
    highlight: record.highlight,
    heroPriceLabel: record.heroPriceLabel,
    heroPriceUnit: record.heroPriceUnit,
    inclusionsText: record.inclusions.join('\n'),
    chipsText: record.chips.join(', '),
    tiers: record.tiers.length > 0 ? record.tiers : [{ label: '', note: '', price: '', highlight: false }],
    ctaLabel: record.ctaLabel,
    sortOrder: String(record.sortOrder),
    isActive: record.isActive,
  };
}

function kindLabel(kind: PricingOfferingKind): string {
  return PRICING_OFFERING_KINDS.find((row) => row.value === kind)?.label ?? kind;
}

export default function AdminPricingPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const urlSearchQuery = useAdminUrlSearchQuery();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offerings, setOfferings] = useState<PricingOfferingRecord[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchPricingOfferingsForAdmin();
    if (error) toast.error(error);
    setOfferings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void load();
  }, [adminUser, load]);

  const openAdd = () => {
    const nextOrder = offerings.length > 0 ? Math.max(...offerings.map((row) => row.sortOrder)) + 10 : 10;
    setFormErrors({});
    setForm(emptyForm(nextOrder));
    setShowAdd(true);
  };

  const visible = useMemo(() => {
    const q = urlSearchQuery.trim().toLowerCase();
    if (!q) return offerings;
    return offerings.filter((row) =>
      `${row.title} ${row.slug} ${row.tagline} ${row.kind}`.toLowerCase().includes(q),
    );
  }, [offerings, urlSearchQuery]);

  if (!adminUser) return null;

  const updateForm = (patch: Partial<FormState>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (patch.title !== undefined && !prev.id && !prev.slug.trim()) {
        next.slug = suggestPricingSlug(patch.title);
      }
      return next;
    });
  };

  const closeModal = () => {
    setForm(null);
    setShowAdd(false);
    setFormErrors({});
  };

  const validate = (): boolean => {
    if (!form) return false;
    const e: Record<string, string> = {};
    const slug = normalizePricingSlug(form.slug);
    if (!isValidPricingSlug(slug)) e.slug = 'Use a URL slug (2–64 chars, lowercase, hyphens).';
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.heroPriceLabel.trim()) e.heroPriceLabel = 'Display price is required.';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!form || !validate()) return;
    setSaving(true);
    const result = await upsertPricingOffering({
      id: form.id,
      slug: form.slug,
      kind: form.kind,
      title: form.title,
      tagline: form.tagline,
      description: form.description,
      badge: form.badge || null,
      highlight: form.highlight,
      heroPriceLabel: form.heroPriceLabel,
      heroPriceUnit: form.heroPriceUnit,
      inclusions: form.inclusionsText.split('\n'),
      chips: form.chipsText.split(/[,|\n]/),
      tiers: form.tiers.filter((tier) => tier.label.trim() && tier.price.trim()),
      ctaLabel: form.ctaLabel,
      sortOrder: Number(form.sortOrder) || 100,
      isActive: form.isActive,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.error.toLowerCase().includes('slug')) {
        setFormErrors((prev) => ({ ...prev, slug: result.error }));
      }
      return;
    }
    if (form.id) {
      setSavedId(form.id);
      window.setTimeout(() => setSavedId(null), 2500);
      toastUpdated('Pricing offering');
    } else {
      toastCreated('Pricing offering');
    }
    closeModal();
    void load();
  };

  const handleDelete = async (record: PricingOfferingRecord) => {
    const ok = window.confirm(`Delete “${record.title}”? This removes it from the public pricing page.`);
    if (!ok) return;
    setDeletingId(record.id);
    const result = await deletePricingOffering(record.id);
    setDeletingId(null);
    if (!result.ok) {
      toast.error(result.error ?? 'Could not delete.');
      return;
    }
    toastDeleted('Pricing offering');
    void load();
  };

  const modalOpen = Boolean(form && (showAdd || form.id));

  return (
    <>
      <div className="mx-auto max-w-8xl px-6 py-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8A7E6E]">Public site</p>
            <p className="mt-1 max-w-xl text-sm text-[#8A7E6E]">
              These cards appear on /pricing (passes and memberships) and /services (service offerings).
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="action-button flex shrink-0 items-center gap-2 rounded-full bg-[#1E2A35] px-5 py-2.5 text-white shadow-sm transition-all hover:bg-[#263545] active:scale-[0.97]"
          >
            <Plus size={16} /> Add offering
          </button>
        </div>

        {loading ? (
          <ContentSkeleton variant="cards" />
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-[#D4CDB5]/60 bg-white px-6 py-12 text-center text-sm text-[#8A7E6E]">
            {offerings.length === 0 ? 'No offerings yet. Add a pass, membership, or service.' : 'No offerings match your search.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => (
              <div
                key={row.id}
                className={`overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm ${CARD_HOVER_GROW} ${
                  savedId === row.id ? 'ring-2 ring-green-400/40' : ''
                } ${row.isActive ? '' : 'opacity-70'}`}
              >
                <div className={`h-1.5 ${row.highlight ? 'bg-[#c49a3c]' : 'bg-[#1E2A35]'}`} />
                <div className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E]">{kindLabel(row.kind)}</p>
                      <h3
                        className="truncate text-[#1E2A35]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em' }}
                      >
                        {row.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdd(false);
                          setFormErrors({});
                          setForm(recordToForm(row));
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8A7E6E] hover:bg-[#EDE8D8] hover:text-[#1E2A35]"
                        aria-label={`Edit ${row.title}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => void handleDelete(row)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8A7E6E] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Delete ${row.title}`}
                      >
                        {deletingId === row.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#9A8E7E]">{row.tagline || 'No tagline.'}</p>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p
                        className="text-[#1E2A35]"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}
                      >
                        {row.heroPriceLabel || '—'}
                      </p>
                      <p className="text-xs text-[#8A7E6E]">{row.heroPriceUnit}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        row.isActive
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-[#D4CDB5]/70 bg-[#EDE8D8] text-[#5A5048]'
                      }`}
                    >
                      {row.isActive ? 'Live' : 'Hidden'}
                    </span>
                  </div>
                  {savedId === row.id ? (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <Check size={12} /> Saved
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && form ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D4CDB5]/50 bg-white px-7 pb-5 pt-7">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
              >
                {form.id ? 'Edit offering' : 'Add offering'}
              </h3>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8]">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-7 py-6">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Type</label>
                <select
                  value={form.kind}
                  onChange={(event) => updateForm({ kind: event.target.value as PricingOfferingKind })}
                  className={INP}
                >
                  {PRICING_OFFERING_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Title</label>
                <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} className={INP} />
                {formErrors.title ? <p className="mt-1 text-xs text-red-500">{formErrors.title}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Slug</label>
                <input
                  value={form.slug}
                  onChange={(event) => updateForm({ slug: event.target.value.toLowerCase() })}
                  className={`${INP} font-mono`}
                />
                {formErrors.slug ? <p className="mt-1 text-xs text-red-500">{formErrors.slug}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Tagline</label>
                <textarea
                  value={form.tagline}
                  onChange={(event) => updateForm({ tagline: event.target.value })}
                  rows={2}
                  className={`${INP} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Display price</label>
                  <input
                    value={form.heroPriceLabel}
                    onChange={(event) => updateForm({ heroPriceLabel: event.target.value })}
                    placeholder="₱4,800"
                    className={INP}
                  />
                  {formErrors.heroPriceLabel ? <p className="mt-1 text-xs text-red-500">{formErrors.heroPriceLabel}</p> : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Unit</label>
                  <input
                    value={form.heroPriceUnit}
                    onChange={(event) => updateForm({ heroPriceUnit: event.target.value })}
                    placeholder="/month"
                    className={INP}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Badge</label>
                  <input
                    value={form.badge}
                    onChange={(event) => updateForm({ badge: event.target.value })}
                    placeholder="Popular"
                    className={INP}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Sort order</label>
                  <input
                    value={form.sortOrder}
                    onChange={(event) => updateForm({ sortOrder: event.target.value })}
                    className={INP}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Button label</label>
                <input value={form.ctaLabel} onChange={(event) => updateForm({ ctaLabel: event.target.value })} className={INP} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Inclusions (one per line)</label>
                <textarea
                  value={form.inclusionsText}
                  onChange={(event) => updateForm({ inclusionsText: event.target.value })}
                  rows={3}
                  className={`${INP} resize-none`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">Chips / class names (comma separated)</label>
                <input value={form.chipsText} onChange={(event) => updateForm({ chipsText: event.target.value })} className={INP} />
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-widest text-[#8A7E6E]">Detail tiers</p>
                <div className="flex flex-col gap-2">
                  {form.tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2">
                      <input
                        value={tier.label}
                        onChange={(event) => {
                          const next = [...form.tiers];
                          next[index] = { ...tier, label: event.target.value };
                          updateForm({ tiers: next });
                        }}
                        placeholder="Label"
                        className={`${INP} col-span-4 py-2`}
                      />
                      <input
                        value={tier.note ?? ''}
                        onChange={(event) => {
                          const next = [...form.tiers];
                          next[index] = { ...tier, note: event.target.value };
                          updateForm({ tiers: next });
                        }}
                        placeholder="Note"
                        className={`${INP} col-span-4 py-2`}
                      />
                      <input
                        value={tier.price}
                        onChange={(event) => {
                          const next = [...form.tiers];
                          next[index] = { ...tier, price: event.target.value };
                          updateForm({ tiers: next });
                        }}
                        placeholder="₱0"
                        className={`${INP} col-span-3 py-2`}
                      />
                      <button
                        type="button"
                        onClick={() => updateForm({ tiers: form.tiers.filter((_, i) => i !== index) })}
                        className="col-span-1 flex items-center justify-center rounded-xl text-[#8A7E6E] hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove tier"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateForm({ tiers: [...form.tiers, { label: '', note: '', price: '' }] })}
                    className="text-left text-xs font-semibold text-[#c49a3c]"
                  >
                    + Add tier
                  </button>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={form.highlight}
                  onChange={(event) => updateForm({ highlight: event.target.checked })}
                  className="h-4 w-4 rounded border-[#D4CDB5] text-[#c49a3c]"
                />
                <span className="text-sm font-medium text-[#1E2A35]">Highlight (gold treatment)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm({ isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-[#D4CDB5] text-[#c49a3c]"
                />
                <span className="text-sm font-medium text-[#1E2A35]">Live on the public site</span>
              </label>
            </div>
            <div className="sticky bottom-0 flex gap-3 border-t border-[#D4CDB5]/40 bg-white px-7 pb-7 pt-4">
              <button type="button" onClick={closeModal} className="flex-1 rounded-full border border-[#D4CDB5]/70 py-3 text-sm text-[#8A7E6E] hover:bg-[#EDE8D8]">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="action-button inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E2A35] py-3 text-white hover:bg-[#263545] disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {form.id ? 'Save changes' : 'Create offering'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
