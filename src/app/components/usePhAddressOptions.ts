import { useEffect, useState } from 'react';
import { loadProvinceLocations, loadProvinces, type ProvinceLocations } from '../../lib/ph-locations';

export function usePhAddressOptions(province: string, city: string) {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [locations, setLocations] = useState<ProvinceLocations | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    void loadProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (!province) {
      setLocations(null);
      setLoadingCities(false);
      return;
    }

    let cancelled = false;
    setLocations(null);
    setLoadingCities(true);
    void loadProvinceLocations(province).then((data) => {
      if (cancelled) return;
      setLocations(data);
      setLoadingCities(false);
    });

    return () => {
      cancelled = true;
    };
  }, [province]);

  const cities = locations?.cities ?? [];
  const barangays = city ? locations?.barangays[city] ?? [] : [];

  return {
    provinces,
    cities,
    barangays,
    loadingCities,
    loadingBarangays: Boolean(province && city && loadingCities),
  };
}
