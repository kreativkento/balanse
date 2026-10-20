import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdminUrlSearchQuery } from '../hooks/useAdminUrlSearchFilter';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  STUDIO_AMENITY_GROUPS,
  normalizeAdminAmenitySelection,
  resolveStudioAmenityIcon,
} from '../data/studio-amenities';
import {
  fetchAdminStudioAmenitiesSelection,
  saveStudioAmenitiesSelection,
} from '../../lib/studio-amenities-service';

export default function AdminAmenitiesPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const urlSearchQuery = useAdminUrlSearchQuery();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [savedSnapshot, setSavedSnapshot] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { labels, error } = await fetchAdminStudioAmenitiesSelection();
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }
    const next = normalizeAdminAmenitySelection(labels);
    setSelected(new Set(next));
    setSavedSnapshot(new Set(next));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void load();
  }, [adminUser, load]);

  const selectedCount = selected.size;
  const totalCount = useMemo(
    () => STUDIO_AMENITY_GROUPS.reduce((sum, group) => sum + group.items.length, 0),
    [],
  );

  const hasChanges = useMemo(() => {
    if (selected.size !== savedSnapshot.size) return true;
    for (const label of selected) {
      if (!savedSnapshot.has(label)) return true;
    }
    return false;
  }, [selected, savedSnapshot]);

  const visibleGroups = useMemo(() => {
    const q = urlSearchQuery.trim().toLowerCase();
    if (!q) return STUDIO_AMENITY_GROUPS;
    return STUDIO_AMENITY_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q)
          || group.title.toLowerCase().includes(q),
      ),
    })).filter((group) => group.items.length > 0);
  }, [urlSearchQuery]);

  const toggleLabel = (label: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(
      new Set(STUDIO_AMENITY_GROUPS.flatMap((group) => group.items.map((item) => item.label))),
    );
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one amenity.');
      return;
    }
    setSaving(true);
    try {
      const result = await saveStudioAmenitiesSelection([...selected]);
      if (!result.ok) {
        toast.error(result.error || 'Could not save amenities.');
        return;
      }
      setSavedSnapshot(new Set(selected));
      toast.success('Studio amenities saved. They are live on the public website.');
    } catch {
      toast.error('Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!adminUser) return null;

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="max-w-5xl mx-auto px-6 py-8 w-full flex-1 min-h-0 flex flex-col gap-5">
        <div className="shrink-0 rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/80 px-5 py-4">
          <p className="text-[#5A5048] text-sm leading-relaxed">
            Choose which amenities appear on the{' '}
            <span className="font-semibold text-[#1E2A35]">Studio</span> page (preview list and
            “Show all” modal). Icons and labels match the public site catalog.
          </p>
          <p className="mt-2 text-[#9A8E7E] text-xs">
            {selectedCount} of {totalCount} selected
            {hasChanges ? ' · Unsaved changes' : ' · Saved'}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-[#8A7E6E]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading amenities…</span>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-24">
            {visibleGroups.length === 0 ? (
              <p className="text-center text-sm text-[#8A7E6E] py-12">
                No amenities match your search. Clear the search or try another term.
              </p>
            ) : null}
            {visibleGroups.map((group) => (
              <section
                key={group.title}
                className="rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden"
              >
                <div className="border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 px-5 py-3">
                  <h2 className="text-[#1E2A35] text-sm font-bold">{group.title}</h2>
                </div>
                <ul className="divide-y divide-[#D4CDB5]/40">
                  {group.items.map((item) => {
                    const Icon = resolveStudioAmenityIcon(item.iconKey);
                    const checked = selected.has(item.label);
                    return (
                      <li key={item.label}>
                        <label className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-[#F8F3E8]/40 transition-colors">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLabel(item.label)}
                            className="h-4 w-4 rounded border-[#D4CDB5] text-[#c49a3c] focus:ring-[#c49a3c]/30"
                          />
                          <Icon size={22} className="shrink-0 text-[#1E2A35]" strokeWidth={1.5} />
                          <span className="text-[#1E2A35] text-sm leading-snug">{item.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#D4CDB5]/60 bg-white/95 backdrop-blur-sm px-6 py-4 md:pl-[calc(var(--admin-sidebar-width,16rem)+1.5rem)]">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || saving}
              onClick={selectAll}
              className="px-4 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#F8F3E8] disabled:opacity-60"
            >
              Select all
            </button>
            <button
              type="button"
              disabled={loading || saving || !hasChanges}
              onClick={() => void load()}
              className="px-4 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#F8F3E8] disabled:opacity-60"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={loading || saving || !hasChanges || selectedCount === 0}
              onClick={() => void handleSave()}
              className="action-button ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save for website
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
