import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mail, MapPin, Phone, X } from 'lucide-react';
import { fetchClientByAccountId, type ClientDirectoryItem } from '../../../lib/admin-service';
import { ProfileAvatar } from '../ProfileImages';

function clientInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function formatLocation(client: ClientDirectoryItem): string {
  return [client.barangay, client.city, client.province].filter(Boolean).join(', ');
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const display = value.trim() || 'Not provided';
  const content = (
    <div className="flex items-start gap-3 rounded-2xl border border-[#D4CDB5]/45 bg-white/90 px-3.5 py-3">
      <span className="mt-0.5 shrink-0 text-[#c49a3c]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">{label}</p>
        <p className="text-[#1E2A35] text-sm font-medium mt-0.5 break-words">{display}</p>
      </div>
    </div>
  );
  if (href && value.trim()) {
    return (
      <a href={href} className="block transition-opacity hover:opacity-90">
        {content}
      </a>
    );
  }
  return content;
}

export function AdminClientContactCardModal({
  accountId,
  fallbackName,
  fallbackEmail,
  fallbackPhoto,
  onClose,
}: {
  accountId: string;
  fallbackName: string;
  fallbackEmail: string;
  fallbackPhoto?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientDirectoryItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchClientByAccountId(accountId).then((row) => {
      if (cancelled) return;
      setClient(row);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const name = client?.name?.trim() || fallbackName;
  const email = client?.email?.trim() || fallbackEmail;
  const photo = client?.photo || fallbackPhoto || '';
  const nickname = client?.nickname?.trim() ?? '';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.45)', backdropFilter: 'blur(4px)' }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-[#FFFCF7] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-client-contact-card-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close contact card"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-[#8A7E6E] shadow-sm border border-[#D4CDB5]/40 hover:bg-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="bg-gradient-to-br from-[#F8F3E8] via-[#FBF9F3] to-white px-6 pt-6 pb-5 border-b border-[#D4CDB5]/45">
          <p className="text-[#c49a3c] text-[10px] font-bold uppercase tracking-[0.22em] pr-10">Contact card</p>
          <div className="flex items-center gap-4 mt-3">
            <ProfileAvatar
              src={photo || undefined}
              initials={clientInitials(name)}
              alt=""
              className="h-16 w-16 rounded-2xl shrink-0 border-2 border-white shadow-md bg-[#c49a3c]/12"
              initialsClassName="text-[#a67f2e] font-bold"
            />
            <div className="min-w-0 pr-8">
              <h2
                id="admin-client-contact-card-title"
                className="text-[#1E2A35] leading-tight truncate"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', letterSpacing: '0.04em' }}
              >
                {name}
              </h2>
              {nickname ? (
                <p className="text-[#8A7E6E] text-xs mt-0.5 truncate">&ldquo;{nickname}&rdquo;</p>
              ) : null}
              {client?.joinDate ? (
                <p className="text-[#9A8E7E] text-xs mt-1">Member since {client.joinDate}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-2.5 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#8A7E6E]">
              <Loader2 size={24} className="animate-spin text-[#c49a3c]" />
              <p className="text-sm">Loading contact details…</p>
            </div>
          ) : (
            <>
              <ContactRow
                icon={<Mail size={16} />}
                label="Email"
                value={email}
                href={email ? `mailto:${email}` : undefined}
              />
              <ContactRow
                icon={<Phone size={16} />}
                label="Phone"
                value={client?.phone ?? ''}
                href={client?.phone?.trim() ? `tel:${client.phone.trim()}` : undefined}
              />
              <ContactRow
                icon={<MapPin size={16} />}
                label="Address"
                value={client ? formatLocation(client) : ''}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
