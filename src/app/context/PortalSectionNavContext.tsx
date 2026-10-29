import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { isPublicNavActive } from '../components/layout/NavBar';

export interface PortalSectionLink {
  path: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  pendingCount?: number;
}

export interface PortalSectionGroup {
  key: string;
  label: string;
  icon: ReactNode;
  links: PortalSectionLink[];
  disabled?: boolean;
}

interface PortalSectionNavValue {
  groups: PortalSectionGroup[];
  activeGroup: PortalSectionGroup | null;
}

const PortalSectionNavContext = createContext<PortalSectionNavValue>({
  groups: [],
  activeGroup: null,
});

function lastPathKey(groupKey: string) {
  return `balanse.section-nav.${groupKey}`;
}

export function rememberSectionPath(groupKey: string, path: string) {
  try {
    window.sessionStorage.setItem(lastPathKey(groupKey), path);
  } catch {
    /* ignore */
  }
}

export function recalledSectionPath(group: PortalSectionGroup): string | undefined {
  try {
    const last = window.sessionStorage.getItem(lastPathKey(group.key));
    if (last && group.links.some((link) => link.path === last && !link.disabled)) {
      return last;
    }
  } catch {
    /* ignore */
  }
  return group.links.find((link) => !link.disabled)?.path ?? group.links[0]?.path;
}

export function groupPendingCount(group: PortalSectionGroup): number {
  return group.links.reduce((sum, link) => sum + (link.pendingCount ?? 0), 0);
}

export function PortalSectionNavProvider({
  groups,
  children,
}: {
  groups: PortalSectionGroup[];
  children: ReactNode;
}) {
  const { pathname } = useLocation();

  const activeGroup = useMemo(
    () =>
      groups.find((group) => group.links.some((link) => isPublicNavActive(pathname, link.path))) ?? null,
    [groups, pathname],
  );

  useEffect(() => {
    if (!activeGroup) return;
    const current = activeGroup.links.find((link) => isPublicNavActive(pathname, link.path));
    if (current) rememberSectionPath(activeGroup.key, current.path);
  }, [activeGroup, pathname]);

  const value = useMemo(
    () => ({ groups, activeGroup }),
    [groups, activeGroup],
  );

  return <PortalSectionNavContext.Provider value={value}>{children}</PortalSectionNavContext.Provider>;
}

export function usePortalSectionNav() {
  return useContext(PortalSectionNavContext);
}
