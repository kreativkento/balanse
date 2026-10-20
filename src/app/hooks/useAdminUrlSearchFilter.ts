import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/** Sync list-page search box with `?q=` from admin global search navigation. */
export function useAdminUrlSearchFilter(): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  return [search, setSearch];
}

/** Read `?q=` once for pages that filter in useMemo without a visible search field. */
export function useAdminUrlSearchQuery(): string {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setQuery(q);
  }, [searchParams]);

  return query;
}
