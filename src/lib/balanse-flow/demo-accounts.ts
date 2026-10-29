import type { BalanseFlowRole, DemoSessionUser } from './mode.ts';

export const DEMO_PASSWORD = 'DemoFlow2026!';

export type DemoAccountDef = DemoSessionUser & {
  password: string;
  homePath: string;
  label: string;
};

export const DEMO_ACCOUNTS: DemoAccountDef[] = [
  {
    id: 'demo-auth-admin',
    email: 'demo.admin@balanse.local',
    role: 'admin',
    accountId: 'demo-acct-admin',
    name: 'Alex Rivera',
    password: DEMO_PASSWORD,
    homePath: '/admin-dashboard',
    label: 'Admin',
  },
  {
    id: 'demo-auth-coach',
    email: 'demo.coach@balanse.local',
    role: 'coach',
    accountId: 'demo-acct-coach',
    name: 'Jordan Cruz',
    password: DEMO_PASSWORD,
    homePath: '/staff-dashboard',
    label: 'Coach',
  },
  {
    id: 'demo-auth-student',
    email: 'demo.student@balanse.local',
    role: 'user',
    accountId: 'demo-acct-student',
    name: 'Sam Reyes',
    password: DEMO_PASSWORD,
    homePath: '/dashboard',
    label: 'Student',
  },
  {
    id: 'demo-auth-frontdesk',
    email: 'demo.frontdesk@balanse.local',
    role: 'frontdesk',
    accountId: 'demo-acct-frontdesk',
    name: 'Pat Lim',
    password: DEMO_PASSWORD,
    homePath: '/frontdesk-dashboard',
    label: 'Front Desk',
  },
  {
    id: 'demo-auth-marketing',
    email: 'demo.marketing@balanse.local',
    role: 'marketing',
    accountId: 'demo-acct-marketing',
    name: 'Riley Tan',
    password: DEMO_PASSWORD,
    homePath: '/marketing-dashboard',
    label: 'Marketing',
  },
];

export function findDemoAccount(email: string, password: string): DemoAccountDef | null {
  const normalized = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.find((account) => account.email === normalized && account.password === password) ??
    null
  );
}

export function demoAccountByRole(role: BalanseFlowRole): DemoAccountDef {
  const match = DEMO_ACCOUNTS.find((account) => account.role === role);
  if (!match) throw new Error(`No demo account for ${role}`);
  return match;
}
