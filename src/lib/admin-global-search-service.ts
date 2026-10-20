import { supabase } from './supabase';
import { fetchGalleryPostsForGlobalSearch } from './gallery-global-search';
import {
  getAdminPortalNavItems,
  searchAdminPortalNav,
  type AdminPortalNavItem,
} from '../app/lib/admin-portal-nav-search';
import { STUDIO_AMENITY_GROUPS } from '../app/data/studio-amenities';

export interface AdminGlobalSearchResult {
  id: string;
  path: string;
  label: string;
  group: string;
  subtitle?: string;
}

const PER_CATEGORY = 4;
const MAX_RESULTS = 24;

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

function ilikePattern(query: string): string {
  return `%${escapeIlike(query.trim())}%`;
}

function adminListPath(base: string, query: string): string {
  const q = query.trim();
  if (!q) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}q=${encodeURIComponent(q)}`;
}

function navToResult(item: AdminPortalNavItem, query: string): AdminGlobalSearchResult {
  return {
    id: `nav:${item.path}`,
    path: adminListPath(item.path, query),
    label: item.label,
    group: item.group,
    subtitle: 'Go to page',
  };
}

function pushResult(
  bucket: AdminGlobalSearchResult[],
  row: AdminGlobalSearchResult,
) {
  if (bucket.length >= PER_CATEGORY) return;
  if (bucket.some((item) => item.id === row.id)) return;
  bucket.push(row);
}

async function searchClients(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const out: AdminGlobalSearchResult[] = [];
  const filter = `name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},nickname.ilike.${pattern},phone.ilike.${pattern}`;

  const [{ data: profiles }, { data: emailAccounts }] = await Promise.all([
    supabase
      .from('profiles_client')
      .select('account_id, name, phone')
      .or(filter)
      .limit(PER_CATEGORY),
    supabase
      .from('accounts')
      .select('id, email')
      .eq('role', 'user')
      .ilike('email', pattern)
      .limit(PER_CATEGORY),
  ]);

  const accountIds = new Set<string>();
  for (const row of profiles ?? []) {
    if (!row.account_id || accountIds.has(row.account_id)) continue;
    accountIds.add(row.account_id);
    pushResult(out, {
      id: `client:${row.account_id}`,
      path: adminListPath('/admin-students', rawQuery),
      label: (row.name as string)?.trim() || 'Client',
      group: 'Clients',
      subtitle: row.phone ? String(row.phone) : undefined,
    });
  }

  for (const account of emailAccounts ?? []) {
    if (accountIds.has(account.id)) continue;
    accountIds.add(account.id);
    pushResult(out, {
      id: `client:${account.id}`,
      path: adminListPath('/admin-students', rawQuery),
      label: account.email,
      group: 'Clients',
      subtitle: 'Email match',
    });
  }

  return out;
}

async function searchCoaches(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const out: AdminGlobalSearchResult[] = [];
  const filter = `name.ilike.${pattern},display_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`;

  const [{ data: profiles }, { data: emailAccounts }] = await Promise.all([
    supabase
      .from('profiles_staff')
      .select('account_id, name, display_name')
      .or(filter)
      .limit(PER_CATEGORY * 2),
    supabase
      .from('accounts')
      .select('id, email')
      .eq('role', 'coach')
      .ilike('email', pattern)
      .limit(PER_CATEGORY),
  ]);

  const profileAccountIds = (profiles ?? []).map((row) => row.account_id).filter(Boolean) as string[];
  const coachRoleIds = new Set<string>();
  if (profileAccountIds.length > 0) {
    const { data: roleRows } = await supabase
      .from('accounts')
      .select('id')
      .in('id', profileAccountIds)
      .eq('role', 'coach');
    for (const row of roleRows ?? []) coachRoleIds.add(row.id);
  }

  const seen = new Set<string>();
  for (const row of profiles ?? []) {
    if (!row.account_id || !coachRoleIds.has(row.account_id) || seen.has(row.account_id)) continue;
    seen.add(row.account_id);
    const label = (row.display_name as string)?.trim() || (row.name as string)?.trim() || 'Coach';
    pushResult(out, {
      id: `coach:${row.account_id}`,
      path: adminListPath('/admin-coaches', rawQuery),
      label,
      group: 'Coaches',
    });
  }

  for (const account of emailAccounts ?? []) {
    if (seen.has(account.id)) continue;
    seen.add(account.id);
    pushResult(out, {
      id: `coach:${account.id}`,
      path: adminListPath('/admin-coaches', rawQuery),
      label: account.email,
      group: 'Coaches',
      subtitle: 'Email match',
    });
  }

  return out;
}

async function searchStaff(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const out: AdminGlobalSearchResult[] = [];
  const staffRoles = ['admin', 'frontdesk', 'marketing', 'dev'] as const;

  const [{ data: accounts }, { data: profiles }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, email, role')
      .in('role', [...staffRoles])
      .ilike('email', pattern)
      .limit(PER_CATEGORY),
    supabase
      .from('profiles_staff')
      .select('account_id, name, display_name, staff_type')
      .or(`name.ilike.${pattern},display_name.ilike.${pattern},staff_type.ilike.${pattern}`)
      .limit(PER_CATEGORY * 2),
  ]);

  const profileAccountIds = (profiles ?? []).map((row) => row.account_id).filter(Boolean) as string[];
  const staffRoleIds = new Set<string>();
  if (profileAccountIds.length > 0) {
    const { data: roleRows } = await supabase
      .from('accounts')
      .select('id')
      .in('id', profileAccountIds)
      .in('role', [...staffRoles]);
    for (const row of roleRows ?? []) staffRoleIds.add(row.id);
  }

  const seen = new Set<string>();
  for (const row of profiles ?? []) {
    if (!row.account_id || !staffRoleIds.has(row.account_id) || seen.has(row.account_id)) continue;
    seen.add(row.account_id);
    pushResult(out, {
      id: `staff:${row.account_id}`,
      path: adminListPath('/admin-staff', rawQuery),
      label: (row.display_name as string)?.trim() || (row.name as string)?.trim() || 'Staff',
      group: 'Staffing',
      subtitle: row.staff_type ? String(row.staff_type) : undefined,
    });
  }

  for (const account of accounts ?? []) {
    if (seen.has(account.id)) continue;
    seen.add(account.id);
    pushResult(out, {
      id: `staff:${account.id}`,
      path: adminListPath('/admin-staff', rawQuery),
      label: account.email,
      group: 'Staffing',
      subtitle: account.role,
    });
  }

  return out;
}

async function searchDisciplines(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('disciplines')
    .select('id, name, slug')
    .or(`name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`)
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `discipline:${row.id}`,
    path: adminListPath('/admin-disciplines', rawQuery),
    label: row.name,
    group: 'Disciplines',
    subtitle: row.slug,
  }));
}

async function searchClasses(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('classes')
    .select('id, name, uid, starts_at')
    .or(`name.ilike.${pattern},uid.ilike.${pattern}`)
    .order('starts_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => {
    const when = row.starts_at
      ? new Date(row.starts_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : undefined;
    return {
      id: `class:${row.id}`,
      path: `/admin-classes?assign=${encodeURIComponent(row.id)}`,
      label: row.name,
      group: 'Class schedule',
      subtitle: row.uid ? `${row.uid}${when ? ` · ${when}` : ''}` : when,
    };
  });
}

async function searchPayments(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('class_payments_escrow')
    .select(
      'id, uid, payment_reference, payment_method_label, accounts!account_id ( email, profiles_client ( name ) )',
    )
    .or(`uid.ilike.${pattern},payment_reference.ilike.${pattern},payment_method_label.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    const profile = Array.isArray(account?.profiles_client)
      ? account?.profiles_client[0]
      : account?.profiles_client;
    const buyerName = (profile?.name as string)?.trim() || (account?.email as string)?.trim() || '';
    const buyerEmail = (account?.email as string)?.trim() ?? '';
    return {
      id: `payment:${row.id}`,
      path: adminListPath('/admin-payments', rawQuery),
      label: buyerName || (row.uid as string) || 'Payment',
      group: 'Payments',
      subtitle: [row.payment_reference, row.payment_method_label].filter(Boolean).join(' · ') || buyerEmail,
    };
  });
}

async function searchPaymentChannels(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('payment_channels')
    .select('id, label, slug, bank_name')
    .or(`label.ilike.${pattern},slug.ilike.${pattern},bank_name.ilike.${pattern},account_name.ilike.${pattern}`)
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `channel:${row.id}`,
    path: adminListPath('/admin-payment-channels', rawQuery),
    label: row.label,
    group: 'Payment channels',
    subtitle: row.bank_name || row.slug,
  }));
}

async function searchGallery(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const rows = await fetchGalleryPostsForGlobalSearch(pattern, PER_CATEGORY);

  return rows.map((row) => ({
    id: `gallery:${row.id}`,
    path: adminListPath('/admin-gallery', rawQuery),
    label: row.caption.trim().slice(0, 80) || 'Gallery post',
    group: 'Gallery',
    subtitle: row.tag ?? undefined,
  }));
}

async function searchBulletin(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('bulletin_posts')
    .select('id, title, category')
    .or(`title.ilike.${pattern},body.ilike.${pattern}`)
    .order('posted_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `bulletin:${row.id}`,
    path: adminListPath('/admin-bulletin', rawQuery),
    label: row.title,
    group: 'Bulletin',
    subtitle: row.category,
  }));
}

async function searchFeedback(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('feedback_system')
    .select('id, title, label, status')
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `feedback:${row.id}`,
    path: adminListPath('/admin-feedback', rawQuery),
    label: row.title,
    group: 'System feedback',
    subtitle: `${row.label} · ${row.status}`,
  }));
}

async function searchPortalRequests(pattern: string, rawQuery: string): Promise<AdminGlobalSearchResult[]> {
  const { data } = await supabase
    .from('portal_requests')
    .select('id, request_type, status, requester_note')
    .or(`requester_note.ilike.${pattern},review_note.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `portal:${row.id}`,
    path: adminListPath('/admin-coach-requests', rawQuery),
    label: row.request_type === 'slot_request' ? 'Slot request' : 'Cancellation request',
    group: 'Coach requests',
    subtitle: [row.status, row.requester_note?.slice(0, 60)].filter(Boolean).join(' · '),
  }));
}

function searchAmenities(query: string): AdminGlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: AdminGlobalSearchResult[] = [];
  for (const group of STUDIO_AMENITY_GROUPS) {
    for (const item of group.items) {
      if (!item.label.toLowerCase().includes(q) && !group.title.toLowerCase().includes(q)) continue;
      pushResult(out, {
        id: `amenity:${item.label}`,
        path: adminListPath('/admin-amenities', query),
        label: item.label,
        group: 'Amenities',
        subtitle: group.title,
      });
    }
  }
  return out;
}

/**
 * Admin header search — navigation shortcuts plus Supabase rows allowed by admin RLS.
 */
export async function searchAdminGlobal(
  query: string,
  signal?: AbortSignal,
): Promise<AdminGlobalSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return searchAdminPortalNav(trimmed).map((item) => navToResult(item, trimmed));
  }

  if (signal?.aborted) return [];

  const pattern = ilikePattern(trimmed);
  const nav = searchAdminPortalNav(trimmed, getAdminPortalNavItems()).map((item) =>
    navToResult(item, trimmed),
  );

  const [
    clients,
    coaches,
    staff,
    disciplines,
    classes,
    payments,
    channels,
    gallery,
    bulletin,
    feedback,
    portal,
    amenities,
  ] = await Promise.all([
    searchClients(pattern, trimmed),
    searchCoaches(pattern, trimmed),
    searchStaff(pattern, trimmed),
    searchDisciplines(pattern, trimmed),
    searchClasses(pattern, trimmed),
    searchPayments(pattern, trimmed),
    searchPaymentChannels(pattern, trimmed),
    searchGallery(pattern, trimmed),
    searchBulletin(pattern, trimmed),
    searchFeedback(pattern, trimmed),
    searchPortalRequests(pattern, trimmed),
    Promise.resolve(searchAmenities(trimmed)),
  ]);

  if (signal?.aborted) return [];

  const merged = [
    ...nav,
    ...clients,
    ...coaches,
    ...staff,
    ...disciplines,
    ...classes,
    ...payments,
    ...channels,
    ...gallery,
    ...bulletin,
    ...feedback,
    ...portal,
    ...amenities,
  ];

  const seen = new Set<string>();
  const deduped: AdminGlobalSearchResult[] = [];
  for (const row of merged) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
    if (deduped.length >= MAX_RESULTS) break;
  }

  return deduped;
}
