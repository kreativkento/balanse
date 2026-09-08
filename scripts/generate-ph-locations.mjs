/**
 * Downloads PSGC data and writes lazy-loadable JSON for Province → City → Barangay dropdowns.
 * Source: https://psgc.gitlab.io/api/
 *
 * Usage: node scripts/generate-ph-locations.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../src/app/data/ph-locations');
const API = 'https://psgc.gitlab.io/api';

const NCR_REGION = '130000000';
const METRO_MANILA = 'Metro Manila';

/** Independent cities that have no provinceCode in PSGC. */
const INDEPENDENT_CITY_PROVINCE = {
  'City of Isabela': 'Basilan',
  'City of Cotabato': 'Maguindanao',
};

function slug(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function displayCityName(name) {
  if (name === 'Quezon City') return 'Quezon City';
  return name.replace(/^City of /i, '').replace(/ City$/i, '');
}

function sortNames(a, b) {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

async function fetchJson(path) {
  const res = await fetch(`${API}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Fetching PSGC provinces, cities, and barangays…');
  const [provincesRaw, citiesRaw, barangaysRaw] = await Promise.all([
    fetchJson('provinces.json'),
    fetchJson('cities-municipalities.json'),
    fetchJson('barangays.json'),
  ]);

  const provinceByCode = new Map(provincesRaw.map((p) => [p.code, p.name]));

  function provinceForCity(city) {
    if (city.regionCode === NCR_REGION) return METRO_MANILA;
    if (city.provinceCode && provinceByCode.has(city.provinceCode)) {
      return provinceByCode.get(city.provinceCode);
    }
    return INDEPENDENT_CITY_PROVINCE[city.name] ?? null;
  }

  const citiesByProvince = new Map();
  const cityMetaByCode = new Map();

  for (const city of citiesRaw) {
    const province = provinceForCity(city);
    if (!province) {
      console.warn('Skipping city with no province:', city.name);
      continue;
    }
    const display = displayCityName(city.name);
    if (!citiesByProvince.has(province)) citiesByProvince.set(province, new Map());
    citiesByProvince.get(province).set(display, city.code);
    cityMetaByCode.set(city.code, { province, display });
  }

  const barangaysByProvinceCity = new Map();

  for (const brgy of barangaysRaw) {
    const cityCode = brgy.cityCode || brgy.municipalityCode;
    const meta = cityMetaByCode.get(cityCode);
    if (!meta) continue;
    if (!barangaysByProvinceCity.has(meta.province)) {
      barangaysByProvinceCity.set(meta.province, new Map());
    }
    const byCity = barangaysByProvinceCity.get(meta.province);
    if (!byCity.has(meta.display)) byCity.set(meta.display, []);
    byCity.get(meta.display).push(brgy.name);
  }

  const provinces = [...citiesByProvince.keys()].sort(sortNames);

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, 'by-province'), { recursive: true });

  await writeFile(join(OUT_DIR, 'provinces.json'), `${JSON.stringify(provinces, null, 2)}\n`);

  for (const province of provinces) {
    const cities = [...citiesByProvince.get(province).keys()].sort(sortNames);
    const barangays = {};
    const cityMap = barangaysByProvinceCity.get(province) ?? new Map();
    for (const city of cities) {
      barangays[city] = [...new Set(cityMap.get(city) ?? [])].sort(sortNames);
    }
    await writeFile(
      join(OUT_DIR, 'by-province', `${slug(province)}.json`),
      `${JSON.stringify({ cities, barangays })}\n`,
    );
  }

  console.log(`Wrote ${provinces.length} provinces to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
