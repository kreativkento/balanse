import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface AdminHeaderActionsContextValue {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const AdminHeaderActionsContext = createContext<AdminHeaderActionsContextValue | null>(null);

export function AdminHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);

  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return (
    <AdminHeaderActionsContext.Provider value={value}>{children}</AdminHeaderActionsContext.Provider>
  );
}

export function useAdminHeaderActionsContext() {
  return useContext(AdminHeaderActionsContext);
}

/** Registers primary actions beside the account menu in the admin greeting bar. */
export function useAdminHeaderActions(actions: ReactNode) {
  const ctx = useAdminHeaderActionsContext();
  useEffect(() => {
    if (!ctx) return;
    ctx.setActions(actions);
    return () => ctx.setActions(null);
  }, [actions, ctx]);
}
