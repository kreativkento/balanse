import { normalizeDisciplineColorHex } from '../../../lib/default-assets';
import type { MemberEnrolledClassItem } from '../../../lib/class-service';

const DEFAULT_ACCENT = '#c49a3c';

export function resolveMyClassDisciplineAccent(
  item: MemberEnrolledClassItem,
  colorByDisciplineId: Map<string, string> | undefined,
): string {
  if (!item.disciplineId || !colorByDisciplineId) {
    return DEFAULT_ACCENT;
  }
  const raw = colorByDisciplineId.get(item.disciplineId);
  if (!raw) return DEFAULT_ACCENT;
  return normalizeDisciplineColorHex(raw) || DEFAULT_ACCENT;
}
