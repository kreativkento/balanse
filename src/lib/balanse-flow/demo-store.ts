import { DEMO_ACCOUNTS } from './demo-accounts.ts';
import { getDemoUser } from './mode.ts';

export type DemoTable = Record<string, Record<string, unknown>[]>;

let store: DemoTable | null = null;

function isoDaysFromNow(days: number, hour = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seed(): DemoTable {
  const admin = DEMO_ACCOUNTS[0];
  const coach = DEMO_ACCOUNTS[1];
  const student = DEMO_ACCOUNTS[2];
  const desk = DEMO_ACCOUNTS[3];
  const marketing = DEMO_ACCOUNTS[4];
  const classId = 'demo-class-morning-flow';
  const paymentId = 'demo-pay-drop-in';
  const packPayId = 'demo-pay-pack';

  return {
    accounts: DEMO_ACCOUNTS.map((account) => ({
      id: account.accountId,
      auth_user_id: account.id,
      email: account.email,
      role: account.role,
      status: 'active',
      created_at: isoDaysFromNow(-40),
    })),
    profiles_client: [
      {
        account_id: student.accountId,
        first_name: 'Sam',
        last_name: 'Reyes',
        middle_initial: '',
        nickname: 'Sam',
        name: student.name,
        birthday: '1996-04-12',
        sex: 'prefer_not_to_say',
        phone: '09171234567',
        phone_valid: true,
        nationality: 'Filipino',
        province: 'Metro Manila',
        city: 'Makati',
        barangay: 'Poblacion',
        terms_accepted: true,
        terms_document_path: 'demo/terms.pdf',
        terms_accepted_version: '1',
        terms_signed_at: isoDaysFromNow(-20),
        terms_valid: true,
        privacy_policy_document_path: 'demo/privacy.pdf',
        privacy_accepted_version: '1',
        privacy_signed_at: isoDaysFromNow(-20),
        privacy_valid: true,
        health_declaration: 'None',
        health_declaration_document_path: 'demo/health.pdf',
        health_declaration_signed_at: isoDaysFromNow(-20),
        health_valid: true,
        photo: '',
        cover_image: '',
      },
    ],
    profiles_staff: [
      {
        account_id: admin.accountId,
        name: admin.name,
        display_name: admin.name,
        staff_type: 'Administrator',
        photo: '',
        cover_image: '',
      },
      {
        account_id: coach.accountId,
        name: coach.name,
        display_name: coach.name,
        staff_type: 'Coach',
        photo: '',
        cover_image: '',
      },
      {
        account_id: desk.accountId,
        name: desk.name,
        display_name: desk.name,
        staff_type: 'Administrator',
        photo: '',
        cover_image: '',
      },
      {
        account_id: marketing.accountId,
        name: marketing.name,
        display_name: marketing.name,
        staff_type: 'Administrator',
        photo: '',
        cover_image: '',
      },
    ],
    classes: [
      {
        id: classId,
        name: 'Morning Flow',
        coach_account_id: coach.accountId,
        starts_at: isoDaysFromNow(1, 7),
        ends_at: isoDaysFromNow(1, 8),
        status: 'scheduled',
      },
    ],
    class_students: [
      {
        id: 'demo-enroll-1',
        class_id: classId,
        account_id: student.accountId,
        status: 'waitlisted',
      },
    ],
    class_payments: [
      {
        id: paymentId,
        account_id: student.accountId,
        class_id: classId,
        status: 'pending',
        amount: 850,
        created_at: isoDaysFromNow(0),
      },
    ],
    subscription_package_payments: [
      {
        id: packPayId,
        account_id: student.accountId,
        status: 'pending',
        amount: 3500,
        created_at: isoDaysFromNow(-1),
      },
    ],
    portal_requests: [
      {
        id: 'demo-slot-req',
        request_type: 'slot_request',
        requester_account_id: coach.accountId,
        status: 'pending',
        created_at: isoDaysFromNow(-1),
      },
    ],
    bulletin_posts: [
      {
        id: 'demo-bulletin-1',
        title: 'Studio closed on Friday afternoon',
        status: 'pending_approval',
        admin_approved: false,
        created_by: marketing.accountId,
      },
    ],
  };
}

export function loadDemoStore(): DemoTable {
  if (!store) store = seed();
  return store;
}

export function resetDemoStore(): void {
  store = seed();
}

export function getTable(name: string): Record<string, unknown>[] {
  const tables = loadDemoStore();
  if (!tables[name]) tables[name] = [];
  return tables[name];
}

export function setTable(name: string, rows: Record<string, unknown>[]): void {
  loadDemoStore()[name] = rows;
}

/** Keep reads close to live RLS: students see themselves; coaches see their rows; desk/admin see the studio. */
export function scopeRows(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const user = getDemoUser();
  if (!user) return [];
  if (user.role === 'admin' || user.role === 'frontdesk' || user.role === 'marketing') {
    if (user.role === 'marketing' && ['class_payments', 'class_students', 'accounts'].includes(table)) {
      return [];
    }
    return rows;
  }
  if (user.role === 'user') {
    if (table === 'accounts') return rows.filter((row) => row.id === user.accountId);
    if (table === 'profiles_client') return rows.filter((row) => row.account_id === user.accountId);
    if (['class_students', 'class_payments', 'subscription_package_payments'].includes(table)) {
      return rows.filter((row) => row.account_id === user.accountId);
    }
  }
  if (user.role === 'coach') {
    if (table === 'accounts') return rows.filter((row) => row.id === user.accountId || row.role === 'user');
    if (table === 'profiles_staff') return rows.filter((row) => row.account_id === user.accountId);
    if (table === 'classes') return rows.filter((row) => row.coach_account_id === user.accountId);
    if (table === 'portal_requests') return rows.filter((row) => row.requester_account_id === user.accountId);
  }
  return rows;
}
