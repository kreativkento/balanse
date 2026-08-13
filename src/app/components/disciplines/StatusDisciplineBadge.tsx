import type { DisciplineStatusDisplay } from '../../../lib/discipline-service';
import { statusColorFromHue } from '../../../lib/discipline-service';

interface StatusDisciplineBadgeProps {
  status: DisciplineStatusDisplay;
  className?: string;
}

export function StatusDisciplineBadge({ status, className = '' }: StatusDisciplineBadgeProps) {
  const color = statusColorFromHue(status.hue);

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
