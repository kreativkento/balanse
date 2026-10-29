import { supabase } from './supabase';
import type { UserRole } from './database.types';

export const FEEDBACK_COMMENT_MAX = 2000;
export const ACCOUNT_NOTIFICATIONS_CHANGED = 'balanse:account-notifications-changed';

export interface FeedbackComment {
  id: string;
  ticketId: string;
  accountId: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: UserRole | null;
}

export interface AccountNotification {
  id: string;
  accountId: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  ticketId: string | null;
  readAt: string | null;
  createdAt: string;
}

type CommentRpcRow = {
  id: string;
  ticket_id: string;
  account_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_role: UserRole | null;
};

type NotificationRow = {
  id: string;
  account_id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  ticket_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapComment(row: CommentRpcRow): FeedbackComment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    accountId: row.account_id,
    body: row.body,
    createdAt: row.created_at,
    authorName: row.author_name?.trim() || 'Studio user',
    authorRole: row.author_role,
  };
}

function mapNotification(row: NotificationRow): AccountNotification {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    ticketId: row.ticket_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function emitAccountNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ACCOUNT_NOTIFICATIONS_CHANGED));
}

export async function fetchFeedbackComments(
  ticketId: string,
): Promise<{ data: FeedbackComment[]; error: string | null }> {
  const { data, error } = await supabase.rpc('list_feedback_comments', { p_ticket_id: ticketId });
  if (error) {
    return { data: [], error: error.message };
  }
  return { data: ((data ?? []) as CommentRpcRow[]).map(mapComment), error: null };
}

export async function addFeedbackComment(
  ticketId: string,
  body: string,
): Promise<{ data: FeedbackComment | null; error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed) return { data: null, error: 'Comment cannot be empty.' };
  if (trimmed.length > FEEDBACK_COMMENT_MAX) {
    return { data: null, error: `Comment must be ${FEEDBACK_COMMENT_MAX} characters or fewer.` };
  }

  const { data, error } = await supabase.rpc('add_feedback_comment', {
    p_ticket_id: ticketId,
    p_body: trimmed,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: 'Could not post comment.' };

  void supabase.functions.invoke('send-feedback-comment-email', {
    body: { ticketId, commentId: (row as CommentRpcRow).id },
  }).then(({ error: emailError }) => {
    if (emailError) console.error('send-feedback-comment-email:', emailError.message);
  });

  emitAccountNotificationsChanged();
  return { data: mapComment(row as CommentRpcRow), error: null };
}

export async function markFeedbackTicketRead(ticketId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_feedback_ticket_read', { p_ticket_id: ticketId });
  if (error) {
    console.error('mark_feedback_ticket_read:', error.message);
    return;
  }
  emitAccountNotificationsChanged();
}

export async function fetchAccountNotifications(): Promise<{
  data: AccountNotification[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('account_notifications')
    .select('id, account_id, kind, title, body, href, ticket_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: ((data ?? []) as NotificationRow[]).map(mapNotification), error: null };
}

export async function countUnreadAccountNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('account_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  if (error || count == null) return 0;
  return count;
}

export async function markAccountNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_account_notification_read', { p_id: id });
  if (error) {
    console.error('mark_account_notification_read:', error.message);
    return;
  }
  emitAccountNotificationsChanged();
}

export async function markAllAccountNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_all_account_notifications_read');
  if (error) {
    console.error('mark_all_account_notifications_read:', error.message);
    return;
  }
  emitAccountNotificationsChanged();
}
