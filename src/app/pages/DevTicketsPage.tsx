import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Ticket, Plus, X, ImagePlus, Loader2, AlertCircle, ArrowUpRight,
} from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import { DevSidebar } from '../components/layout/DevSidebar';
import {
  createTicket,
  fetchCurrentAccountId,
  fetchTicketsForDev,
  updateTicketStatus,
  type TicketDisplay,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from '../../lib/ticket-service';

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'support', label: 'Support' },
  { value: 'incident', label: 'Incident' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const INP =
  "w-full px-3 py-2.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all";

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  low: 'bg-[#EDE8D8] text-[#5A5048]',
  medium: 'bg-[#c49a3c]/15 text-[#a67f2e]',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function levelLabel(level: 1 | 2): string {
  return level === 1 ? 'Level 1 · Admin' : 'Level 2 · Developer';
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function DevTicketsPage() {
  const navigate = useNavigate();
  const { devUser } = useDevAuth();

  const [tickets, setTickets] = useState<TicketDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('bug');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [level, setLevel] = useState<1 | 2>(2);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const result = await fetchTicketsForDev();
    setTickets(result.data);
    setLoadError(result.error ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!devUser) navigate('/development');
  }, [devUser, navigate]);

  useEffect(() => {
    if (devUser) loadTickets();
  }, [devUser, loadTickets]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('bug');
    setPriority('medium');
    setLevel(2);
    setImageUrl('');
    setImagePreview(null);
    setFormError('');
  };

  const handleImageFile = (file: File | null) => {
    if (!file) {
      setImagePreview(null);
      setImageUrl('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImagePreview(result);
      setImageUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!devUser) return;

    setSaving(true);
    const creatorAccountId = await fetchCurrentAccountId();
    if (!creatorAccountId) {
      setSaving(false);
      setFormError('Could not resolve your account. Sign in again.');
      return;
    }

    const result = await createTicket({
      title,
      description,
      type,
      priority,
      level,
      imageUrl: imageUrl.trim() || null,
      creatorAccountId,
      creatorEmail: devUser.email,
    });
    setSaving(false);

    if (result.error) {
      setFormError(result.error.includes('relation') || result.error.includes('schema cache')
        ? 'Tickets table missing. Apply migration 901_tickets.sql first.'
        : result.error);
      return;
    }

    resetForm();
    setShowCreate(false);
    await loadTickets();
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    const { error } = await updateTicketStatus(ticketId, status);
    if (error) {
      setLoadError(error);
      return;
    }
    await loadTickets();
  };

  if (!devUser) return null;

  const level2Count = tickets.filter((t) => t.level === 2).length;
  const level1Count = tickets.filter((t) => t.level === 1).length;

  return (
    <DevSidebar>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#1E2A35]/08 border border-[#1E2A35]/15 rounded-full px-3 py-1 mb-3">
              <Ticket size={11} className="text-[#c49a3c]" />
              <span className="text-[#1E2A35] text-xs font-bold uppercase tracking-widest">Tickets</span>
            </div>
            <h1
              className="text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '0.04em', lineHeight: 1 }}
            >
              Ticket Management
            </h1>
            <p className="text-[#B0A898] text-xs mt-1.5">
              Level 1 → admin queue · Level 2 → developer queue · {level2Count} escalated · {level1Count} admin
            </p>
          </div>
          <button
            type="button"
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="shrink-0 flex items-center justify-center gap-2 bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all rounded-full px-5 py-2.5 text-sm font-bold shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            <Plus size={16} /> New Ticket
          </button>
        </div>

        {loadError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-600 text-sm">{loadError}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E8E2D2]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 flex items-center justify-center gap-2 text-[#8A7E6E] text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EDE8D8] flex items-center justify-center mx-auto mb-4">
                <Ticket size={24} className="text-[#8A7E6E]" />
              </div>
              <p className="text-[#1E2A35] font-semibold mb-1">No tickets yet</p>
              <p className="text-[#8A7E6E] text-sm mb-5">Create a ticket with title, type, priority, level, and optional image.</p>
              <button
                type="button"
                onClick={() => { resetForm(); setShowCreate(true); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#a67f2e] hover:text-[#1E2A35] transition-colors"
              >
                <Plus size={14} /> Create first ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E2D2]/70">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="px-5 py-4 hover:bg-[#F8F3E8]/40 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {ticket.imageUrl && (
                      <a href={ticket.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
                        <img
                          src={ticket.imageUrl}
                          alt=""
                          className="w-full md:w-24 h-28 md:h-24 object-cover rounded-xl border border-[#D4CDB5]/60"
                        />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${PRIORITY_STYLE[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#1E2A35]/08 text-[#1E2A35]">
                          {ticket.type}
                        </span>
                        <span className={`text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          ticket.level === 2 ? 'bg-[#c49a3c]/20 text-[#a67f2e]' : 'bg-[#EDE8D8] text-[#5A5048]'
                        }`}>
                          {levelLabel(ticket.level)}
                        </span>
                      </div>
                      <h2 className="text-[#1E2A35] font-semibold text-sm mb-1">{ticket.title}</h2>
                      {ticket.description && (
                        <p className="text-[#8A7E6E] text-sm leading-relaxed mb-2 whitespace-pre-wrap">{ticket.description}</p>
                      )}
                      <p className="text-[#B0A898] text-xs">
                        Creator: {ticket.creatorEmail || '—'} · {formatWhen(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <label className="block text-[#B0A898] text-[0.6rem] uppercase tracking-widest mb-1">Status</label>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                        className="px-3 py-2 rounded-xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-xs outline-none focus:ring-2 focus:ring-[#c49a3c]/25"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3
                  className="text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}
                >
                  New Ticket
                </h3>
                <p className="text-[#8A7E6E] text-sm">Title, description, type, priority, creator, level, and optional image.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-9 h-9 rounded-xl bg-[#EDE8D8] flex items-center justify-center text-[#5A5048] hover:text-[#1E2A35]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Title</label>
                <input className={INP} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Description</label>
                <textarea
                  className={`${INP} min-h-[100px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened / what's needed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Type</label>
                  <select className={INP} value={type} onChange={(e) => setType(e.target.value as TicketType)}>
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Priority</label>
                  <select className={INP} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Level (escalation)</label>
                <select
                  className={INP}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) === 2 ? 2 : 1)}
                >
                  <option value={1}>Level 1 — shown to Admin</option>
                  <option value={2}>Level 2 — shown to Developer</option>
                </select>
                <p className="text-[#B0A898] text-[0.7rem] mt-1.5 flex items-center gap-1">
                  <ArrowUpRight size={11} /> Escalate to level 2 to route the ticket to developers.
                </p>
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Creator</label>
                <input className={`${INP} opacity-80`} value={devUser.email} readOnly />
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Image (optional)</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#D4CDB5] bg-[#F8F3E8] text-[#8A7E6E] text-sm cursor-pointer hover:border-[#c49a3c]/50 hover:text-[#1E2A35] transition-colors">
                    <ImagePlus size={16} />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <input
                    className={INP}
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value || null);
                    }}
                    placeholder="Or paste an image URL"
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="h-28 w-full object-cover rounded-xl border border-[#D4CDB5]/60" />
                  )}
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] active:scale-95 transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DevSidebar>
  );
}
