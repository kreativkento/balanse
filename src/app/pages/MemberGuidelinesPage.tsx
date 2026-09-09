import { useMemo, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import {
  GUIDELINE_SECTIONS,
  GUIDELINES_INTRO,
  GUIDELINES_LAST_UPDATED,
} from '../data/studioGuidelines';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  downloadStudioGuidelinesImage,
  downloadStudioGuidelinesPdf,
} from '../../lib/studio-guidelines-export';

type GuidelinesExportKind = 'pdf' | 'image';

export default function MemberGuidelinesPage() {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState<GuidelinesExportKind | null>(null);

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return GUIDELINE_SECTIONS;
    return GUIDELINE_SECTIONS.filter(({ title, body }) =>
      `${title} ${body}`.toLowerCase().includes(query),
    );
  }, [search]);

  const runExport = async (kind: GuidelinesExportKind) => {
    if (exporting) return;
    setExporting(kind);
    try {
      if (kind === 'pdf') await downloadStudioGuidelinesPdf();
      else await downloadStudioGuidelinesImage();
    } catch (err) {
      console.error('Failed to download studio guidelines:', err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <MemberPageShell searchPlaceholder="Search studio guidelines…" onSearch={setSearch}>
      <div className="mb-6 flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Class Management</p>
          <h2
            className="text-[#1E2A35] leading-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
          >
            Studio Guidelines
          </h2>
          <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
            {GUIDELINES_INTRO}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              disabled={!!exporting}
              onClick={() => { void runExport('pdf'); }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1E2A35] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#263545] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {exporting === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </button>
            <button
              type="button"
              disabled={!!exporting}
              onClick={() => { void runExport('image'); }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D4CDB5]/80 bg-white px-3.5 py-2 text-xs font-semibold text-[#5A5048] transition-colors hover:bg-[#EDE8D8] hover:text-[#1E2A35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === 'image' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
              {exporting === 'image' ? 'Preparing…' : 'Download Image'}
            </button>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#8A7E6E] sm:text-right">
            Last Updated: {GUIDELINES_LAST_UPDATED}
          </p>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-[#B0A898]">No guidelines match your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {sections.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className={`rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm md:p-6 ${CARD_HOVER_GROW}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h3
                  className="min-w-0 text-[#1E2A35] leading-none"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.25rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  {title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#5A5048]">{body}</p>
            </article>
          ))}
        </div>
      )}
    </MemberPageShell>
  );
}
