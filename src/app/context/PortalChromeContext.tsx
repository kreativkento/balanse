import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalSearchOverride {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

interface PortalChromeContextValue {
  mobileOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  mobileSectionKey: string | null;
  openMobileSection: (key: string) => void;
  closeMobileSection: () => void;
  searchOverride: PortalSearchOverride | null;
  setSearchOverride: (value: PortalSearchOverride | null) => void;
  titleToolbarHost: HTMLElement | null;
  setTitleToolbarHost: (node: HTMLElement | null) => void;
}

const PortalChromeContext = createContext<PortalChromeContextValue | null>(null);
const PortalNavIconOnlyContext = createContext(false);
const PortalMobileDrawerContext = createContext(false);

export function PortalChromeProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSectionKey, setMobileSectionKey] = useState<string | null>(null);
  const [searchOverride, setSearchOverride] = useState<PortalSearchOverride | null>(null);
  const [titleToolbarHost, setTitleToolbarHostState] = useState<HTMLElement | null>(null);
  const setTitleToolbarHost = useCallback((node: HTMLElement | null) => {
    setTitleToolbarHostState((current) => (current === node ? current : node));
  }, []);

  const openMobileMenu = useCallback(() => {
    setMobileSectionKey(null);
    setMobileOpen(true);
  }, []);
  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    setMobileSectionKey(null);
  }, []);
  const openMobileSection = useCallback((key: string) => {
    setMobileSectionKey((current) => (current === key ? null : key));
  }, []);
  const closeMobileSection = useCallback(() => setMobileSectionKey(null), []);

  const value = useMemo(
    () => ({
      mobileOpen,
      openMobileMenu,
      closeMobileMenu,
      mobileSectionKey,
      openMobileSection,
      closeMobileSection,
      searchOverride,
      setSearchOverride,
      titleToolbarHost,
      setTitleToolbarHost,
    }),
    [
      mobileOpen,
      openMobileMenu,
      closeMobileMenu,
      mobileSectionKey,
      openMobileSection,
      closeMobileSection,
      searchOverride,
      titleToolbarHost,
      setTitleToolbarHost,
    ],
  );

  return <PortalChromeContext.Provider value={value}>{children}</PortalChromeContext.Provider>;
}

export function PortalNavIconOnlyProvider({
  iconOnly,
  children,
}: {
  iconOnly: boolean;
  children: ReactNode;
}) {
  return <PortalNavIconOnlyContext.Provider value={iconOnly}>{children}</PortalNavIconOnlyContext.Provider>;
}

export function usePortalChrome() {
  return useContext(PortalChromeContext);
}

export function PortalMobileDrawerProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return <PortalMobileDrawerContext.Provider value={active}>{children}</PortalMobileDrawerContext.Provider>;
}

export function usePortalNavIconOnly() {
  return useContext(PortalNavIconOnlyContext);
}

export function usePortalMobileDrawer() {
  return useContext(PortalMobileDrawerContext);
}

/** Renders page controls in the same row as the portal h1 when a host exists; otherwise inline. */
export function PortalTitleToolbar({ children }: { children: ReactNode }) {
  const host = usePortalChrome()?.titleToolbarHost ?? null;
  if (!host) return <>{children}</>;
  return createPortal(children, host);
}

/** Page-level search (e.g. filter a list) replaces portal navigation search while mounted. */
export function usePortalSearchOverride(override: PortalSearchOverride | null) {
  const ctx = usePortalChrome();
  const setSearchOverride = ctx?.setSearchOverride;
  const onSearch = override?.onSearch;
  const placeholder = override?.placeholder;

  useEffect(() => {
    if (!setSearchOverride) return;
    if (!onSearch && !placeholder) {
      setSearchOverride(null);
      return;
    }
    setSearchOverride({ placeholder, onSearch });
    return () => setSearchOverride(null);
  }, [setSearchOverride, onSearch, placeholder]);
}
