import { FileText, Download, Clock, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  CURRENT_DOCUMENTS,
  documentStatus,
  type MemberDocumentKind,
  type MemberDocumentStatus,
} from '../../lib/member-documents';

type DocumentId = MemberDocumentKind | 'guidelines';

type MemberDocument = {
  id: DocumentId;
  title: string;
  note: string;
  viewPath: string;
  updatePath?: string;
  required?: boolean;
};

const DOCUMENTS: MemberDocument[] = [
  {
    id: 'health',
    title: 'Health Declaration',
    note: 'Your fitness and medical disclosure, used by coaches to keep sessions safe.',
    viewPath: '/profile?tab=medical',
    updatePath: '/profile?tab=medical',
    required: true,
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    note: 'Your signed studio membership terms, waiver, and media consent.',
    viewPath: '/profile?tab=terms',
    updatePath: '/profile?tab=terms',
    required: true,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    note: 'How BALANSÉ stores profile, booking, and payment information.',
    viewPath: '/profile?tab=privacy',
    updatePath: '/profile?tab=privacy',
    required: true,
  },
  {
    id: 'guidelines',
    title: 'Studio Guidelines',
    note: 'House rules for arriving, booking, and sharing the practice rooms.',
    viewPath: '/studio/guidelines',
  },
];

const STATUS_LABEL: Record<MemberDocumentStatus, string> = {
  missing: 'Missing',
  current: 'Current',
  accepted_legacy: 'Signed',
  reaccept_required: 'Update required',
};

const STATUS_CLASS: Record<MemberDocumentStatus, string> = {
  missing: 'border-red-200 bg-red-50 text-red-600',
  current: 'border-green-200 bg-green-50 text-green-700',
  accepted_legacy: 'border-amber-200 bg-amber-50 text-amber-700',
  reaccept_required: 'border-red-200 bg-red-50 text-red-600',
};

const STATUS_DOT: Record<MemberDocumentStatus, string> = {
  missing: 'bg-red-500',
  current: 'bg-green-500',
  accepted_legacy: 'bg-amber-500',
  reaccept_required: 'bg-red-500',
};

function formatSignedDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MemberDocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = user?.profile;

  const statusFor = (id: DocumentId): MemberDocumentStatus | null => {
    if (id === 'guidelines') return null;
    if (id === 'health') {
      return documentStatus('health', {
        path: profile?.healthDeclarationDocumentPath,
        version: undefined,
        signedAt: profile?.healthDeclarationSignedAt,
      }, profile?.healthDeclaration);
    }
    if (id === 'terms') {
      return documentStatus('terms', {
        path: profile?.termsDocumentPath,
        version: profile?.termsAcceptedVersion,
        signedAt: profile?.termsSignedAt,
        accepted: profile?.termsAccepted,
      });
    }
    return documentStatus('privacy', {
      path: profile?.privacyPolicyDocumentPath,
      version: profile?.privacyAcceptedVersion,
      signedAt: profile?.privacySignedAt,
    });
  };

  const signedMeta = (id: DocumentId) => {
    if (id === 'health') return { version: undefined as string | undefined, signedAt: profile?.healthDeclarationSignedAt };
    if (id === 'terms') return { version: profile?.termsAcceptedVersion, signedAt: profile?.termsSignedAt };
    if (id === 'privacy') return { version: profile?.privacyAcceptedVersion, signedAt: profile?.privacySignedAt };
    return { version: undefined, signedAt: undefined };
  };

  return (
    <MemberPageShell searchPlaceholder="Search documents…">
      <div className="pt-6 mb-6">
        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Account</p>
        <h2
          className="text-[#1E2A35] leading-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
        >
          Documents
        </h2>
        <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
          Download the copy you signed. Studio updates to current policy do not replace that file.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DOCUMENTS.map((doc) => {
          const updatePath = doc.updatePath;
          const status = statusFor(doc.id);
          const current = doc.id === 'guidelines' ? null : CURRENT_DOCUMENTS[doc.id];
          const signed = signedMeta(doc.id);
          const signedLabel = formatSignedDate(signed.signedAt);
          const footnote = status === 'accepted_legacy' && current
            ? `Signed ${signedLabel ?? signed.version ?? 'earlier'} · Current policy updated ${current.label}`
            : status === 'current' && signedLabel
              ? `Signed ${signedLabel}`
              : current
                ? `Current version ${current.label}`
                : doc.id === 'guidelines'
                  ? 'Studio house rules'
                  : null;

          return (
            <article
              key={doc.id}
              className={`rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm ${CARD_HOVER_GROW}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="min-w-0 truncate text-sm font-semibold text-[#1E2A35]">{doc.title}</h2>
                    {doc.required && (
                      <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-600">
                        Required
                      </span>
                    )}
                    {status && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_CLASS[status]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
                        {STATUS_LABEL[status]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[#5A5048]">{doc.note}</p>
                  {footnote && (
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-[#B0A898]">
                      <Clock size={11} /> {footnote}
                    </p>
                  )}
                </div>
                <div className="flex w-[5.75rem] shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(doc.viewPath)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#D4CDB5]/80 bg-[#F8F3E8] px-3 py-1.5 text-xs font-semibold text-[#5A5048] transition-colors hover:bg-[#EDE8D8] hover:text-[#1E2A35]"
                  >
                    <Download size={12} />
                    View
                  </button>
                  {updatePath && (
                    <button
                      type="button"
                      onClick={() => navigate(updatePath)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#c49a3c]/40 bg-[#c49a3c]/10 px-3 py-1.5 text-xs font-semibold text-[#a67f2e] transition-colors hover:bg-[#c49a3c]/20 hover:text-[#8a6824]"
                    >
                      <Pencil size={12} />
                      {status === 'reaccept_required' ? 'Re-sign' : 'Update'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </MemberPageShell>
  );
}
