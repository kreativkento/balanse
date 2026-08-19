export interface Discipline {
  id: number;
  name: string;
  slug: string;
  img: string;
  description: string;
}

export const DISCIPLINES: Discipline[] = [
  {
    id: 1,
    name: 'Calisthenics',
    slug: 'calisthenics',
    img: 'https://images.unsplash.com/photo-1758274539089-8b2bd10eee92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Build real strength using only your bodyweight. Master foundational movements and progressions at your own pace.',
  },
  {
    id: 2,
    name: 'Yoga',
    slug: 'yoga',
    img: 'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Reconnect mind and body through guided breathwork, flowing postures, and deep restorative holds.',
  },
  {
    id: 3,
    name: 'Animal Flow',
    slug: 'animal-flow',
    img: 'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Ground-based movement inspired by animal locomotion. Develops mobility, coordination, and fluid strength.',
  },
  {
    id: 4,
    name: 'Groundworks',
    slug: 'groundworks',
    img: 'https://images.unsplash.com/photo-1701824429245-ce783f1dc026?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Deep floor work focusing on joint health, primal movement patterns, and body awareness from the ground up.',
  },
  {
    id: 5,
    name: 'Circuit Training',
    slug: 'circuit-training',
    img: 'https://images.unsplash.com/photo-1602827114685-efbb2717da9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'High-energy stations of cardio and resistance. Burn calories and build endurance in a structured, fun format.',
  },
  {
    id: 6,
    name: 'Mat Pilates',
    slug: 'mat-pilates',
    img: 'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Strengthen your core, improve posture, and cultivate elegant body control through classical Pilates principles.',
  },
  {
    id: 7,
    name: 'Kickboxing',
    slug: 'kickboxing',
    img: 'https://images.unsplash.com/photo-1686133368810-24f662f65cad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Powerful bag work and combination drills fused with cardio. Release tension and build real functional fitness.',
  },
  {
    id: 8,
    name: 'Capoeira',
    slug: 'capoeira',
    img: 'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'Explore the Afro-Brazilian art of Capoeira — a beautiful blend of martial arts, dance, acrobatics, and music.',
  },
  {
    id: 9,
    name: 'Personal Coaching',
    slug: 'personal-coaching',
    img: 'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
    description:
      'One-on-one sessions tailored entirely to your goals. Choose your preferred discipline and coach.',
  },
];

const FALLBACK_BY_SLUG = Object.fromEntries(
  DISCIPLINES.map((discipline) => [
    discipline.slug,
    { name: discipline.name, description: discipline.description },
  ]),
) as Record<string, { name: string; description: string }>;

export function getDisciplineFallback(
  slug: string,
  name: string,
): { name: string; description: string } | undefined {
  return FALLBACK_BY_SLUG[slug] ?? FALLBACK_BY_SLUG[name.toLowerCase().replace(/\s+/g, '-')];
}

export function getDisciplinePlaceholderLogo(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'BL';

  return `https://placehold.co/96x96/C49A3C/FFFFFF/png?text=${encodeURIComponent(initials)}`;
}

export function getDisciplinePlaceholderImage(name: string): string {
  return `https://placehold.co/800x480/EDE8D8/5A5048/png?text=${encodeURIComponent(name)}`;
}
