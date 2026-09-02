import type { DisciplineStatusDisplay } from '../../../lib/discipline-service';
import { statusColorFromHue } from '../../../lib/discipline-service';

interface StatusDisciplineBadgeProps {
  status: DisciplineStatusDisplay;
  className?: string;
  /** Overlay sits on cover photos; plain matches admin table pills. */
  tone?: 'overlay' | 'plain';
}

export function StatusDisciplineBadge({
  status,
  className = '',
  tone = 'overlay',
}: StatusDisciplineBadgeProps) {
  const color = statusColorFromHue(status.hue);

  if (tone === 'plain') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${className}`}
        style={{
          backgroundColor: `hsl(${status.hue}, 42%, 95%)`,
          borderColor: `hsl(${status.hue}, 32%, 82%)`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span
          className="text-[11px] font-semibold leading-none"
          style={{ color: `hsl(${status.hue}, 38%, 28%)` }}
        >
          {status.name}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-sm border border-white/20 px-2.5 py-1 ${className}`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-white text-[11px] font-semibold leading-none">{status.name}</span>
    </span>
  );
}
