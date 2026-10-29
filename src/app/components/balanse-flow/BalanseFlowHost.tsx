import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { HelpCircle, X } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAuth } from '../../context/AuthContext';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { getDemoUser, isDemoMode, subscribeDemoMode, type BalanseFlowRole } from '../../../lib/balanse-flow/mode';
import { clearOnboarding, isOnboardingPending, markOnboardingPending } from '../../../lib/balanse-flow/onboarding';
import {
  aroundTour,
  explainPageTour,
  HOW_IT_WORKS,
  setupTour,
  type TourStep,
} from '../../../lib/balanse-flow/tours';
import { DEMO_ACCOUNTS } from '../../../lib/balanse-flow/demo-accounts';

type FlowKind = 'around' | 'page' | 'setup' | null;

type FlowContextValue = {
  role: BalanseFlowRole | null;
  locked: boolean;
  demo: boolean;
  startAround: () => void;
  startPage: () => void;
  openHowItWorks: () => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

function typingTarget(event: KeyboardEvent): boolean {
  const el = event.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function usePortalRole(): BalanseFlowRole | null {
  const demoUser = getDemoUser();
  const { user } = useAuth();
  const { staffUser } = useStaffAuth();
  const { adminUser } = useAdminAuth();
  if (isDemoMode() && demoUser) return demoUser.role;
  if (adminUser?.role === 'admin' || adminUser?.role === 'frontdesk' || adminUser?.role === 'marketing') {
    return adminUser.role;
  }
  if (staffUser?.accountRole === 'coach') return 'coach';
  if (staffUser?.accountRole === 'frontdesk') return 'frontdesk';
  if (staffUser?.accountRole === 'marketing') return 'marketing';
  if (user) return 'user';
  return null;
}

export function useBalanseFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useBalanseFlow must be used within BalanseFlowHost');
  return ctx;
}

export function BalanseFlowHost({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [, bump] = useState(0);
  const role = usePortalRole();
  const { user } = useAuth();
  const { staffUser } = useStaffAuth();
  const { adminUser } = useAdminAuth();
  const [kind, setKind] = useState<FlowKind>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const [howRole, setHowRole] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);

  const locked = location.pathname.startsWith('/reset-password');
  const liveUserId = adminUser?.email || staffUser?.email || user?.email || null;

  useEffect(() => subscribeDemoMode(() => bump((n) => n + 1)), []);

  const steps: TourStep[] = useMemo(() => {
    if (!role || !kind) return [];
    if (kind === 'around') return aroundTour(role);
    if (kind === 'setup') return setupTour(role);
    return explainPageTour(location.pathname);
  }, [kind, role, location.pathname]);

  const step = steps[stepIndex];

  const startAround = useCallback(() => {
    if (!role || locked) return;
    setKind('around');
    setStepIndex(0);
  }, [role, locked]);

  const startPage = useCallback(() => {
    if (locked) return;
    setKind('page');
    setStepIndex(0);
  }, [locked]);

  const openHowItWorks = useCallback(() => {
    if (locked) return;
    setHowOpen(true);
  }, [locked]);

  useEffect(() => {
    if (!isDemoMode() || !role || locked) return;
    const key = `balanse-flow-tour:${role}`;
    try {
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    startAround();
  }, [role, locked, startAround]);

  useEffect(() => {
    if (isDemoMode() || !liveUserId || locked) return;
    markOnboardingPending(liveUserId);
    if (!isOnboardingPending(liveUserId) || !role) return;
    try {
      const key = `balanse-flow-setup-started:${liveUserId}`;
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    setKind('setup');
    setStepIndex(0);
  }, [liveUserId, locked, role]);

  useEffect(() => {
    if (!step?.view) return;
    if (location.pathname !== step.view) navigate(step.view);
  }, [step?.view, location.pathname, navigate]);

  useEffect(() => {
    if (!step) {
      setHighlight(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const target = step.target
        ? Array.from(document.querySelectorAll(step.target)).find((node) => {
            const rect = (node as HTMLElement).getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }) as HTMLElement | undefined
        : null;
      if (!target) {
        setHighlight(null);
        if (step.skipIfMissing && step.target) {
          setStepIndex((i) => {
            if (i >= steps.length - 1) {
              setKind(null);
              return 0;
            }
            return i + 1;
          });
        }
        return;
      }
      const cardH = 220;
      const vv = window.visualViewport?.height ?? window.innerHeight;
      const rect = target.getBoundingClientRect();
      if (rect.bottom > vv - cardH - 16) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      setHighlight(target.getBoundingClientRect());
    };
    const id = window.setInterval(tick, 400);
    tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [step, stepIndex, location.pathname]);

  useEffect(() => {
    if (!kind) return;
    const onKey = (event: KeyboardEvent) => {
      if (typingTarget(event)) return;
      if (event.key === 'Escape') {
        setKind(null);
      }
      if (event.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind, steps.length]);

  const closeTour = (skip = false) => {
    if (kind === 'setup' && liveUserId) clearOnboarding(liveUserId);
    if (skip && kind === 'setup' && liveUserId) clearOnboarding(liveUserId);
    setKind(null);
    setStepIndex(0);
  };

  const handsOn = kind === 'setup';
  const value = useMemo(
    () => ({
      role,
      locked,
      demo: isDemoMode(),
      startAround,
      startPage,
      openHowItWorks,
    }),
    [role, locked, startAround, startPage, openHowItWorks],
  );

  return (
    <FlowContext.Provider value={value}>
      {children}
      {isDemoMode() ? (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#1E2A35] px-4 py-2 text-[11px] font-semibold text-white">
          Balanse's Flow demo — reload resets sample data
        </div>
      ) : null}
      {kind && step ? (
        <div className={handsOn ? 'pointer-events-none fixed inset-0 z-[80]' : 'fixed inset-0 z-[80]'}>
          {!handsOn ? <div className="absolute inset-0 bg-[#1E2A35]/50" /> : <div className="absolute inset-0 bg-[#1E2A35]/15" />}
          {highlight ? (
            <div
              className="pointer-events-none absolute rounded-xl ring-2 ring-[#c49a3c] ring-offset-2"
              style={{ top: highlight.top - 4, left: highlight.left - 4, width: highlight.width + 8, height: highlight.height + 8 }}
            />
          ) : null}
          <div
            className={`pointer-events-auto absolute z-[81] w-[min(24rem,calc(100%-1.5rem))] rounded-2xl border border-[#D4CDB5]/70 bg-white p-5 ${
              handsOn ? 'bottom-4 right-4' : 'bottom-4 left-1/2 -translate-x-1/2'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#c49a3c]">Balanse's Flow</p>
            <h3 className="mt-1 text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem' }}>
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-[#5A5048]">{step.body}</p>
            {step.fill ? (
              <p className="mt-2 text-sm font-semibold text-[#1E2A35]">Fill this in now. Tap Next when you are done.</p>
            ) : null}
            {step.points?.length ? (
              <div className="mt-3">
                {step.pointsTitle ? <p className="text-xs font-semibold text-[#1E2A35]">{step.pointsTitle}</p> : null}
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-[#5A5048]">
                  {step.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" className="text-xs text-[#8A7E6E]" onClick={() => closeTour(true)}>
                Skip
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="rounded-full border border-[#D4CDB5] px-3 py-2 text-xs disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex >= steps.length - 1) closeTour();
                    else setStepIndex((i) => i + 1);
                  }}
                  className="rounded-full bg-[#1E2A35] px-4 py-2 text-xs font-semibold text-white"
                >
                  {stepIndex >= steps.length - 1 ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </div>
          <div ref={spacerRef} className="h-40" />
        </div>
      ) : null}
      {howOpen ? <HowItWorks role={role} selected={howRole} onSelect={setHowRole} onClose={() => setHowOpen(false)} /> : null}
    </FlowContext.Provider>
  );
}

function HowItWorks({
  role,
  selected,
  onSelect,
  onClose,
}: {
  role: BalanseFlowRole | null;
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typingTarget(event)) return;
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cadence = (name: string) => {
    const account = DEMO_ACCOUNTS.find((item) => item.label === name);
    if (!account) return [];
    return aroundTour(account.role)
      .filter((step) => step.points)
      .map((step) => ({
        group: step.title === 'Set up first' ? 'Once' : 'Daily',
        items: step.points ?? [],
      }));
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[#1E2A35]/50 p-4 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="How it works"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#D4CDB5]/70 bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#c49a3c]">Balanse's Flow</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem' }}>
              How it works
            </h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#EDE8D8]">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[#8A7E6E]">Who sets it up</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[#5A5048]">
          {HOW_IT_WORKS.setup.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#8A7E6E]">The flow</p>
        <ol className="mt-2 space-y-2">
          {HOW_IT_WORKS.flow.map((item, index) => (
            <li key={`${item.role}-${index}`}>
              <button
                type="button"
                onClick={() => onSelect(item.role)}
                className="w-full rounded-2xl border border-[#D4CDB5]/60 px-3 py-2 text-left hover:bg-[#F8F3E8]"
              >
                <span className="text-sm font-semibold text-[#1E2A35]">
                  {index + 1}. {item.role}
                  {role && item.youRoles.includes(role) ? ' · You' : ''}
                </span>
                <span className="mt-0.5 block text-xs text-[#5A5048]">{item.does}</span>
                <span className="mt-0.5 block text-[11px] text-[#8A7E6E]">{item.tap}</span>
              </button>
            </li>
          ))}
        </ol>
        {selected ? (
          <div className="mt-4 rounded-2xl bg-[#F8F3E8] p-3">
            <p className="text-sm font-semibold text-[#1E2A35]">{selected}</p>
            {cadence(selected).map((group) => (
              <div key={group.group} className="mt-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A7E6E]">{group.group}</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-[#5A5048]">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-[#8A7E6E]">Tap a role to see Once, Daily, and Weekly steps.</p>
        )}
      </div>
    </div>
  );
}

export function BalanseFlowHelpButton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { locked, startAround, startPage, openHowItWorks, role } = useBalanseFlow();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (locked) {
    return (
      <button
        type="button"
        disabled
        data-tour="help-menu"
        className={`flex h-11 w-11 items-center justify-center rounded-full ${variant === 'light' ? 'text-[#C4B8A0]' : 'text-white/40'}`}
        aria-label="Help unavailable"
      >
        <HelpCircle size={18} />
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-tour="help-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Help"
        onClick={() => setOpen((value) => !value)}
        className={
          variant === 'light'
            ? 'flex h-11 w-11 items-center justify-center rounded-full bg-[#EDE8D8] text-[#1E2A35] hover:bg-[#E3DCC8]'
            : 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
        }
      >
        <HelpCircle size={18} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-[90] w-64 rounded-2xl border border-[#D4CDB5]/70 bg-white p-2 shadow-sm">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c49a3c]">Balanse's Flow</p>
          <button
            type="button"
            role="menuitem"
            disabled={!role}
            onClick={() => {
              setOpen(false);
              startAround();
            }}
            className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F8F3E8] disabled:opacity-40"
          >
            <span className="block text-sm font-semibold text-[#1E2A35]">Show me around</span>
            <span className="block text-[11px] text-[#8A7E6E]">A quick tour of your main pages</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              startPage();
            }}
            className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F8F3E8]"
          >
            <span className="block text-sm font-semibold text-[#1E2A35]">Explain this page</span>
            <span className="block text-[11px] text-[#8A7E6E]">What every button here does</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openHowItWorks();
            }}
            className="w-full rounded-xl px-3 py-2 text-left hover:bg-[#F8F3E8]"
          >
            <span className="block text-sm font-semibold text-[#1E2A35]">How it works</span>
            <span className="block text-[11px] text-[#8A7E6E]">What each role does, step by step</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DemoRoleButtons({ portal }: { portal: 'member' | 'staff' | 'admin' }) {
  const { login } = useAuth();
  const { staffLogin } = useStaffAuth();
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const accounts =
    portal === 'member'
      ? DEMO_ACCOUNTS.filter((item) => item.role === 'user')
      : portal === 'staff'
        ? DEMO_ACCOUNTS.filter((item) => item.role === 'coach' || item.role === 'frontdesk' || item.role === 'marketing')
        : DEMO_ACCOUNTS.filter((item) => item.role === 'admin' || item.role === 'frontdesk' || item.role === 'marketing');

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[#D4CDB5] bg-[#F8F3E8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7E6E]">Balanse's Flow</p>
      <p className="mt-1 text-xs text-[#5A5048]">Practice logins. They cannot change live studio data.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={async () => {
              if (portal === 'member') {
                const result = await login(account.email, account.password);
                if (result.success) navigate(account.homePath);
                return;
              }
              if (portal === 'staff') {
                const result = await staffLogin(account.email, account.password);
                if (result.success) navigate(result.redirectTo ?? account.homePath);
                return;
              }
              const result = await adminLogin(account.email, account.password);
              if (result.success) navigate(account.homePath);
            }}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#1E2A35] ring-1 ring-[#D4CDB5]"
          >
            Try as {account.label}
          </button>
        ))}
      </div>
    </div>
  );
}
