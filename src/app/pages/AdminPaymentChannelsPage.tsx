import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  QrCode,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  deletePaymentChannelRecord,
  fetchPaymentChannelsForAdmin,
  paymentChannelPublicQrUrl,
  slugifyPaymentChannelLabel,
  uploadPaymentChannelQr,
  upsertPaymentChannelRecord,
  type PaymentChannelRecord,
} from '../../lib/payment-channel-service';

const ACCENT_PRESETS = ['#007DFF', '#46BFA8', '#3A4A5A', '#c49a3c', '#6B8E6B', '#7A3A4A'];

type FormState = {
  id?: string;
  slug: string;
  label: string;
  subtitle: string;
  accentColor: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  sortOrder: number;
  isActive: boolean;
  qrStoragePath: string | null;
};

function emptyForm(sortOrder: number): FormState {
  return {
    slug: '',
    label: '',
    subtitle: '',
    accentColor: '#3A4A5A',
    accountName: '',
    accountNumber: '',
    bankName: '',
    sortOrder,
    isActive: true,
    qrStoragePath: null,
  };
}

function recordToForm(record: PaymentChannelRecord): FormState {
  return {
    id: record.id,
    slug: record.slug,
    label: record.label,
    subtitle: record.subtitle,
    accentColor: record.accentColor,
    accountName: record.accountName,
    accountNumber: record.accountNumber,
    bankName: record.bankName,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
    qrStoragePath: record.qrStoragePath,
  };
}

export default function AdminPaymentChannelsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<PaymentChannelRecord[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [pendingQrFile, setPendingQrFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchPaymentChannelsForAdmin();
    if (error) toast.error(error);
    setChannels(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void load();
  }, [adminUser, load]);

  const activeCount = useMemo(() => channels.filter((c) => c.isActive).length, [channels]);

  const openNew = () => {
    const nextOrder = channels.length > 0 ? Math.max(...channels.map((c) => c.sortOrder)) + 10 : 10;
    setPendingQrFile(null);
    setEditing(emptyForm(nextOrder));
  };

  const openEdit = (record: PaymentChannelRecord) => {
    setPendingQrFile(null);
    setEditing(recordToForm(record));
  };

  const closeEditor = () => {
    setEditing(null);
    setPendingQrFile(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.label.trim()) {
      toast.error('Channel name is required.');
      return;
    }
    if (!editing.accountName.trim()) {
      toast.error('Account name is required.');
      return;
    }

    const slug = editing.id
      ? editing.slug
      : slugifyPaymentChannelLabel(editing.label);
    if (!slug) {
      toast.error('Could not generate a slug from the display name.');
      return;
    }
    setSaving(true);
    try {
      let channelId = editing.id;
      let qrPath = editing.qrStoragePath;

      if (!channelId) {
        const created = await upsertPaymentChannelRecord({
          slug,
          label: editing.label,
          subtitle: editing.subtitle,
          accentColor: editing.accentColor,
          accountName: editing.accountName,
          accountNumber: editing.accountNumber,
          bankName: editing.bankName,
          sortOrder: editing.sortOrder,
          isActive: editing.isActive,
          qrStoragePath: null,
        });
        if (!created.ok) {
          toast.error(created.error);
          return;
        }
        channelId = created.id;
      }

      if (pendingQrFile && channelId) {
        const uploaded = await uploadPaymentChannelQr(channelId, pendingQrFile);
        if (!uploaded.ok) {
          toast.error(uploaded.error);
          return;
        }
        qrPath = uploaded.storagePath;
      }

      const saved = await upsertPaymentChannelRecord({
        id: channelId,
        slug,
        label: editing.label,
        subtitle: editing.subtitle,
        accentColor: editing.accentColor,
        accountName: editing.accountName,
        accountNumber: editing.accountNumber,
        bankName: editing.bankName,
        sortOrder: editing.sortOrder,
        isActive: editing.isActive,
        qrStoragePath: qrPath,
      });

      if (!saved.ok) {
        toast.error(saved.error);
        return;
      }

      toast.success(editing.id ? 'Payment channel updated.' : 'Payment channel created.');
      closeEditor();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete “${label}”? This cannot be undone if no payments reference it.`)) return;
    const result = await deletePaymentChannelRecord(id);
    if (!result.ok) {
      toast.error(result.error ?? 'Could not delete. Deactivate instead if payments exist.');
      return;
    }
    toast.success('Channel deleted.');
    await load();
  };

  if (!adminUser) return null;

  const previewQr =
    pendingQrFile != null
      ? URL.createObjectURL(pendingQrFile)
      : paymentChannelPublicQrUrl(editing?.qrStoragePath ?? null);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Finance</p>
          <h1
            className="text-[#1E2A35] leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.05em' }}
          >
            Payment Channels
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-2 max-w-xl">
            Configure where members send class payments. Changes are logged in system audit history.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="action-button flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1E2A35] text-white text-sm hover:bg-[#263545] active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} />
          Add channel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#8A7E6E] gap-2">
          <Loader2 size={18} className="animate-spin" />
          Loading channels…
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center justify-between">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">
              {channels.length} channel{channels.length !== 1 ? 's' : ''} · {activeCount} active at checkout
            </p>
          </div>
          {channels.length === 0 ? (
            <div className="px-6 py-14 text-center text-[#B0A898] text-sm">
              No channels yet. Add GCash, bank transfer, Maya, or any method you accept.
            </div>
          ) : (
            <div className="divide-y divide-[#D4CDB5]/30">
              {channels.map((channel) => {
                const qr = paymentChannelPublicQrUrl(channel.qrStoragePath);
                return (
                  <div
                    key={channel.id}
                    className="px-6 py-4 flex flex-wrap items-center gap-4 hover:bg-[#F8F3E8]/50 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${channel.accentColor}22` }}
                    >
                      {channel.slug.includes('gcash') || channel.slug.includes('maya') ? (
                        <Smartphone size={18} style={{ color: channel.accentColor }} />
                      ) : (
                        <CreditCard size={18} style={{ color: channel.accentColor }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-[12rem]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#1E2A35] font-semibold">{channel.label}</p>
                        {!channel.isActive ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#EDE8D8] text-[#8A7E6E]">
                            Hidden
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[#9A8E7E] text-xs mt-0.5">
                        {channel.accountName}
                        {channel.accountNumber ? ` · ${channel.accountNumber}` : ''}
                      </p>
                      <p className="text-[#B0A898] text-[11px] font-mono mt-0.5">{channel.slug}</p>
                    </div>
                    <div className="w-14 h-14 rounded-lg border border-[#D4CDB5]/60 bg-[#F8F3E8] overflow-hidden flex items-center justify-center shrink-0">
                      {qr ? (
                        <img src={qr} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <QrCode size={20} className="text-[#C0B8A8]" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(channel)}
                        className="px-4 py-2 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] text-xs font-semibold hover:bg-[#EDE8D8] transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(channel.id, channel.label)}
                        className="p-2 rounded-full text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                        aria-label={`Delete ${channel.label}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h2
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                {editing.id ? 'Edit channel' : 'New channel'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4 max-h-[min(70vh,32rem)] overflow-y-auto">
              <label className="block">
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Display name</span>
                <input
                  value={editing.label}
                  onChange={(e) =>
                    setEditing((f) =>
                      f
                        ? {
                            ...f,
                            label: e.target.value,
                            slug: f.id ? f.slug : slugifyPaymentChannelLabel(e.target.value),
                          }
                        : f,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-[#D4CDB5]/70 px-3 py-2.5 text-sm"
                  placeholder="GCash"
                />
              </label>
              <label className="block">
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Subtitle</span>
                <input
                  value={editing.subtitle}
                  onChange={(e) => setEditing((f) => (f ? { ...f, subtitle: e.target.value } : f))}
                  className="mt-1 w-full rounded-xl border border-[#D4CDB5]/70 px-3 py-2.5 text-sm"
                  placeholder="E-wallet"
                />
              </label>
              <div className="block">
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Slug</span>
                <p
                  className="mt-1 w-full rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 px-3 py-2.5 text-sm font-mono text-[#5A5048]"
                  aria-readonly
                >
                  {editing.id
                    ? editing.slug
                    : slugifyPaymentChannelLabel(editing.label) || '—'}
                </p>
                <p className="text-[#B0A898] text-xs mt-1 leading-relaxed">
                  {editing.id
                    ? 'Permanent identifier — cannot be changed.'
                    : 'Generated from the display name when you save.'}
                </p>
              </div>
              <label className="block">
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Account holder name</span>
                <input
                  value={editing.accountName}
                  onChange={(e) => setEditing((f) => (f ? { ...f, accountName: e.target.value } : f))}
                  className="mt-1 w-full rounded-xl border border-[#D4CDB5]/70 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Account / mobile number</span>
                <input
                  value={editing.accountNumber}
                  onChange={(e) => setEditing((f) => (f ? { ...f, accountNumber: e.target.value } : f))}
                  className="mt-1 w-full rounded-xl border border-[#D4CDB5]/70 px-3 py-2.5 text-sm"
                  placeholder="09XX XXX XXXX or account no."
                />
              </label>
              <label className="block">
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Bank or provider label</span>
                <input
                  value={editing.bankName}
                  onChange={(e) => setEditing((f) => (f ? { ...f, bankName: e.target.value } : f))}
                  className="mt-1 w-full rounded-xl border border-[#D4CDB5]/70 px-3 py-2.5 text-sm"
                  placeholder="GCash, BPI, Maya…"
                />
              </label>
              <div>
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Accent color</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditing((f) => (f ? { ...f, accentColor: color } : f))}
                      className={`w-8 h-8 rounded-full border-2 ${editing.accentColor === color ? 'border-[#1E2A35]' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#D4CDB5]/50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#1E2A35]">Show at checkout</p>
                  <p className="text-xs text-[#9A8E7E]">Inactive channels are hidden from members.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing((f) => (f ? { ...f, isActive: !f.isActive } : f))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editing.isActive ? 'bg-[#c49a3c]' : 'bg-[#D4CDB5]'}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editing.isActive ? 'left-[1.35rem]' : 'left-0.5'}`}
                  />
                </button>
              </div>
              <div>
                <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">QR code</span>
                <div className="mt-2 flex gap-4 items-start">
                  <div className="w-24 h-24 rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8] overflow-hidden flex items-center justify-center shrink-0">
                    {previewQr ? (
                      <img src={previewQr} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode size={28} className="text-[#C0B8A8]" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D4CDB5]/70 text-sm font-semibold text-[#1E2A35] hover:bg-[#EDE8D8]"
                  >
                    <Upload size={15} />
                    Upload QR
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingQrFile(file);
                    }}
                  />
                </div>
                <p className="text-[#B0A898] text-xs mt-1">PNG or JPG, max 2MB.</p>
              </div>
            </div>

            <div className="px-7 pb-7 flex gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="action-button flex-1 py-3 rounded-full bg-[#c49a3c] text-white font-bold text-sm hover:bg-[#a67f2e] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save channel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
