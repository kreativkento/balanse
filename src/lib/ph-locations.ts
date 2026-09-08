export function provinceSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export type ProvinceLocations = {
  cities: string[];
  barangays: Record<string, string[]>;
};

const provinceLoaders = import.meta.glob<ProvinceLocations>(
  '../app/data/ph-locations/by-province/*.json',
  { import: 'default' },
);

let provincesPromise: Promise<string[]> | null = null;

export function loadProvinces(): Promise<string[]> {
  if (!provincesPromise) {
    provincesPromise = import('../app/data/ph-locations/provinces.json').then(
      (mod) => (mod.default ?? mod) as unknown as string[],
    );
  }
  return provincesPromise;
}

export async function loadProvinceLocations(province: string): Promise<ProvinceLocations> {
  const slug = provinceSlug(province);
  const key = Object.keys(provinceLoaders).find((path) => path.endsWith(`/${slug}.json`));
  const loader = key ? provinceLoaders[key] : undefined;
  if (!loader) return { cities: [], barangays: {} };
  return loader();
}
