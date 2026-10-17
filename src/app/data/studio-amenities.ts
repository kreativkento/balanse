import {
  Accessibility,
  Activity,
  ArrowUpDown,
  Car,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Flower2,
  Footprints,
  Lock,
  ShieldCheck,
  Shirt,
  ShowerHead,
  Snowflake,
  Sofa,
  Sparkles,
  Target,
  Users,
  Volume2,
  Waves,
  Wifi,
  Wind,
  type LucideIcon,
} from 'lucide-react';

export type StudioAmenityIconKey =
  | 'Footprints'
  | 'Dumbbell'
  | 'Activity'
  | 'Target'
  | 'Waves'
  | 'Volume2'
  | 'Snowflake'
  | 'ShowerHead'
  | 'Lock'
  | 'Shirt'
  | 'Droplets'
  | 'Wind'
  | 'Wifi'
  | 'Sofa'
  | 'Flower2'
  | 'Sparkles'
  | 'Users'
  | 'Coffee'
  | 'Car'
  | 'ArrowUpDown'
  | 'Accessibility'
  | 'CreditCard'
  | 'ShieldCheck';

export const STUDIO_AMENITY_ICON_MAP: Record<StudioAmenityIconKey, LucideIcon> = {
  Footprints,
  Dumbbell,
  Activity,
  Target,
  Waves,
  Volume2,
  Snowflake,
  ShowerHead,
  Lock,
  Shirt,
  Droplets,
  Wind,
  Wifi,
  Sofa,
  Flower2,
  Sparkles,
  Users,
  Coffee,
  Car,
  ArrowUpDown,
  Accessibility,
  CreditCard,
  ShieldCheck,
};

export interface StudioAmenityDefinition {
  iconKey: StudioAmenityIconKey;
  label: string;
}

export interface StudioAmenityGroupDefinition {
  title: string;
  items: StudioAmenityDefinition[];
}

export const STUDIO_AMENITY_GROUPS: StudioAmenityGroupDefinition[] = [
  {
    title: 'Studio & equipment',
    items: [
      { iconKey: 'Footprints', label: 'Yoga mats & props provided' },
      { iconKey: 'Dumbbell', label: 'Free weights & kettlebells' },
      { iconKey: 'Activity', label: 'Reformer & mat Pilates gear' },
      { iconKey: 'Target', label: 'Boxing bags & gloves' },
      { iconKey: 'Waves', label: 'Cushioned movement flooring' },
      { iconKey: 'Volume2', label: 'Studio sound system' },
    ],
  },
  {
    title: 'Comfort & facilities',
    items: [
      { iconKey: 'Snowflake', label: 'Air-conditioned studios' },
      { iconKey: 'ShowerHead', label: 'Showers & changing rooms' },
      { iconKey: 'Lock', label: 'Personal lockers' },
      { iconKey: 'Shirt', label: 'Towel service' },
      { iconKey: 'Droplets', label: 'Filtered drinking water' },
      { iconKey: 'Wind', label: 'Cross-ventilated studios' },
    ],
  },
  {
    title: 'Guest experience',
    items: [
      { iconKey: 'Wifi', label: 'Free high-speed Wi-Fi' },
      { iconKey: 'Sofa', label: 'Reception lounge' },
      { iconKey: 'Flower2', label: 'Quiet mindfulness corner' },
      { iconKey: 'Sparkles', label: 'Aromatherapy diffusers' },
      { iconKey: 'Users', label: 'Small-group class sizes' },
      { iconKey: 'Coffee', label: 'Complimentary herbal tea' },
    ],
  },
  {
    title: 'Getting here',
    items: [
      { iconKey: 'Car', label: 'Building parking' },
      { iconKey: 'ArrowUpDown', label: 'Elevator access' },
      { iconKey: 'Accessibility', label: 'Step-free studio entry' },
      { iconKey: 'CreditCard', label: 'Card & e-wallet payments' },
      { iconKey: 'ShieldCheck', label: '24/7 building security' },
    ],
  },
];

export const ALL_STUDIO_AMENITY_LABELS = STUDIO_AMENITY_GROUPS.flatMap((group) =>
  group.items.map((item) => item.label),
);

const labelSet = new Set(ALL_STUDIO_AMENITY_LABELS);

export function isStudioAmenityLabel(value: string): boolean {
  return labelSet.has(value);
}

export function resolveStudioAmenityIcon(iconKey: StudioAmenityIconKey): LucideIcon {
  return STUDIO_AMENITY_ICON_MAP[iconKey];
}

export interface StudioAmenityDisplayItem {
  icon: LucideIcon;
  label: string;
}

export interface StudioAmenityDisplayGroup {
  title: string;
  items: StudioAmenityDisplayItem[];
}

/** Preserves catalog group order; only includes selected labels. */
export function buildStudioAmenityDisplayGroups(
  selectedLabels: string[],
): StudioAmenityDisplayGroup[] {
  const selected = new Set(selectedLabels.filter(isStudioAmenityLabel));
  return STUDIO_AMENITY_GROUPS.map((group) => ({
    title: group.title,
    items: group.items
      .filter((item) => selected.has(item.label))
      .map((item) => ({
        label: item.label,
        icon: resolveStudioAmenityIcon(item.iconKey),
      })),
  })).filter((group) => group.items.length > 0);
}

export function flattenStudioAmenityDisplayGroups(
  groups: StudioAmenityDisplayGroup[],
): StudioAmenityDisplayItem[] {
  return groups.flatMap((group) => group.items);
}

/** Empty DB selection → show full catalog on the public site. */
export function normalizePublicAmenitySelection(storedLabels: string[]): string[] {
  const valid = storedLabels.filter(isStudioAmenityLabel);
  if (valid.length === 0) return [...ALL_STUDIO_AMENITY_LABELS];
  return valid;
}

export function normalizeAdminAmenitySelection(storedLabels: string[]): Set<string> {
  const valid = storedLabels.filter(isStudioAmenityLabel);
  if (valid.length === 0) {
    return new Set(ALL_STUDIO_AMENITY_LABELS);
  }
  return new Set(valid);
}
