import { useEffect, useState } from 'react';
import { fetchDisciplinesForPublic } from '../../../lib/discipline-service';
import { getDisciplinePlaceholderLogo } from '../../data/disciplines';

type DisciplineLogoMap = Record<string, string>;

let cachedLogos: DisciplineLogoMap | null = null;
let pendingLogos: Promise<DisciplineLogoMap> | null = null;

function loadDisciplineLogos(): Promise<DisciplineLogoMap> {
  pendingLogos ??= fetchDisciplinesForPublic().then(({ data }) => {
    const logos: DisciplineLogoMap = {};
    for (const discipline of data) {
      const logo = discipline.logoUrl.trim();
      if (!logo) continue;
      logos[discipline.name.trim().toLowerCase()] = logo;
      logos[discipline.slug.trim().toLowerCase()] = logo;
    }
    cachedLogos = logos;
    return logos;
  });

  return pendingLogos;
}

/** Discipline logos keyed by name and slug, fetched once per session and shared. */
export function useDisciplineLogos(): DisciplineLogoMap {
  const [logos, setLogos] = useState<DisciplineLogoMap>(() => cachedLogos ?? {});

  useEffect(() => {
    if (cachedLogos) return;

    let cancelled = false;
    void loadDisciplineLogos().then((loaded) => {
      if (!cancelled) setLogos(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return logos;
}

function useDisciplineLogoUrl(name: string): string {
  const logos = useDisciplineLogos();
  return logos[name.trim().toLowerCase()] || getDisciplinePlaceholderLogo(name);
}

export function DisciplineChip({
  name,
  color,
  variant = 'solid',
}: {
  name: string;
  color: string;
  variant?: 'solid' | 'outline';
}) {
  const logoUrl = useDisciplineLogoUrl(name);
  const [imgError, setImgError] = useState(false);
  const solid = variant === 'solid';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[0.8125rem] font-bold ${
        solid ? 'text-white' : 'border border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048]'
      }`}
      style={solid ? { backgroundColor: color } : undefined}
    >
      {!imgError && (
        <img
          src={logoUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full bg-white/95 object-contain p-0.5"
          onError={() => setImgError(true)}
        />
      )}
      {name}
    </span>
  );
}

/** Logo-only badge for tight spaces — the name is exposed as a tooltip and label. */
export function DisciplineLogo({ name, color }: { name: string; color: string }) {
  const logoUrl = useDisciplineLogoUrl(name);
  const [imgError, setImgError] = useState(false);

  return (
    <span
      title={name}
      aria-label={name}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-sm"
      style={{ borderColor: color }}
    >
      {imgError ? (
        <span className="text-sm font-bold" style={{ color }}>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      )}
    </span>
  );
}

export function DisciplineCountChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center self-center rounded-full bg-[#EDE8D8] px-3 py-1.5 text-[0.8125rem] font-bold text-[#7A6A52]">
      +{count}
    </span>
  );
}
