import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';
import { GUIDELINE_SECTIONS } from '../data/studioGuidelines';

export default function GuidelinesPage() {
  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-5">
          <PublicBreadcrumb parent="Our Studio" current="Guidelines" parentTo="/studio" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.05em',
            }}
          >
            Studio Guidelines
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-2 max-w-xl">
            Temporary house rules for visiting BALANSÉ. Final copy will replace this once the studio confirms its policies.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {GUIDELINE_SECTIONS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm md:p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#c49a3c]">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h2
                  className="text-[#1E2A35] leading-none"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '1.25rem',
                    letterSpacing: '0.05em',
                  }}
                >
                  {title}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-[#5A5048]">{body}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs italic text-[#B0A898]">
          Placeholder content — update these guidelines before launch.
        </p>
      </div>
    </div>
  );
}
