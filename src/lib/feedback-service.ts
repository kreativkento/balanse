import { supabase } from './supabase';
import type {
  FeedbackLabel,
  FeedbackPriority,
  FeedbackRow,
  FeedbackStatus,
} from './database.types';

export type { FeedbackLabel, FeedbackPriority, FeedbackStatus };

export const FEEDBACK_ATTACHMENTS_BUCKET = 'feedback_attachments';
export const FEEDBACK_TITLE_MAX = 200;
export const FEEDBACK_DESCRIPTION_MAX = 1000;
export const FEEDBACK_MAX_BYTES = 50 * 1024 * 1024;
export const FEEDBACK_MAX_VIDEO_SECONDS = 30;

export const FEEDBACK_LABELS: { value: FeedbackLabel; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'question', label: 'Question' },
  { value: 'improvement', label: 'Improvement' },
];

export const FEEDBACK_STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

export const FEEDBACK_PRIORITIES: { value: FeedbackPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export interface FeedbackDisplay {
  id: string;
  accountId: string;
  title: string;
  description: string;
  label: FeedbackLabel;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  ticketLevel: number;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmitter {
  accountId: string;
  authUserId: string;
  email: string;
}

export interface SubmitFeedbackInput {
  title: string;
  description: string;
  label: FeedbackLabel;
  file?: File | null;
}

function mapFeedback(row: FeedbackRow): FeedbackDisplay {
  return {
    id: row.id,
    accountId: row.account_id,
    title: row.title,
    description: row.description,
    label: row.label,
    status: row.status,
    priority: row.priority,
    ticketLevel: row.ticket_level,
    attachmentPath: row.attachment_path,
    attachmentName: row.attachment_name,
    attachmentMime: row.attachment_mime,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function extensionForFile(file: File): string | null {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;

  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt === 'jpeg') return 'jpg';
  if (nameExt === 'quicktime') return 'mov';
  if (nameExt && ['jpg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'].includes(nameExt)) {
    return nameExt;
  }
  return null;
}

export function isFeedbackImage(file: File): boolean {
  return IMAGE_MIME.has(file.type) || file.type.startsWith('image/');
}

export function isFeedbackVideo(file: File): boolean {
  return VIDEO_MIME.has(file.type) || file.type.startsWith('video/');
}

export function isFeedbackVideoMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return VIDEO_MIME.has(mime) || mime.startsWith('video/');
}

export async function createFeedbackAttachmentUrl(
  path: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!path) return { url: null, error: null };

  const { data, error } = await supabase.storage
    .from(FEEDBACK_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? 'Could not load the attachment.' };
  }

  return { url: data.signedUrl, error: null };
}

export function formatFeedbackFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read that video. Try another file.'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that video. Try another file.'));
    };
    video.src = url;
  });
}

export async function validateFeedbackAttachment(file: File): Promise<string | null> {
  const ext = extensionForFile(file);
  const allowedType = IMAGE_MIME.has(file.type) || VIDEO_MIME.has(file.type) || Boolean(ext);
  if (!allowedType) {
    return 'Please upload a JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV file.';
  }
  if (file.size > FEEDBACK_MAX_BYTES) {
    return 'File must be 50 MB or smaller.';
  }
  if (isFeedbackVideo(file)) {
    try {
      const duration = await readVideoDurationSeconds(file);
      if (duration > FEEDBACK_MAX_VIDEO_SECONDS) {
        return 'Videos can be at most 30 seconds long.';
      }
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not read that video.';
    }
  }
  return null;
}

export async function fetchFeedbackSubmitter(): Promise<FeedbackSubmitter | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('accounts')
    .select('id, email, auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    accountId: data.id,
    authUserId: data.auth_user_id,
    email: data.email,
  };
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
  return base.slice(0, 80) || 'attachment';
}

async function uploadFeedbackAttachment(
  authUserId: string,
  ticketId: string,
  file: File,
): Promise<{ path: string; name: string; mime: string } | { error: string }> {
  const validationError = await validateFeedbackAttachment(file);
  if (validationError) return { error: validationError };

  const ext = extensionForFile(file) ?? 'bin';
  const contentType = file.type || (isFeedbackVideo(file) ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`);
  const objectPath = `${authUserId}/${ticketId}/${sanitizeFileName(file.name) || `attachment.${ext}`}`;

  const { error } = await supabase.storage.from(FEEDBACK_ATTACHMENTS_BUCKET).upload(objectPath, file, {
    upsert: false,
    contentType,
    cacheControl: '3600',
  });

  if (error) {
    console.error('Failed to upload feedback attachment:', error.message);
    return { error: error.message };
  }

  return { path: objectPath, name: file.name, mime: contentType };
}

export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<{ data: FeedbackDisplay | null; error: string | null }> {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) return { data: null, error: 'Title is required.' };
  if (title.length > FEEDBACK_TITLE_MAX) {
    return { data: null, error: `Title must be ${FEEDBACK_TITLE_MAX} characters or fewer.` };
  }
  if (!description) return { data: null, error: 'Description is required.' };
  if (description.length > FEEDBACK_DESCRIPTION_MAX) {
    return { data: null, error: `Description must be ${FEEDBACK_DESCRIPTION_MAX} characters or fewer.` };
  }

  const submitter = await fetchFeedbackSubmitter();
  if (!submitter) {
    return { data: null, error: 'You must be signed in to send feedback.' };
  }

  const ticketId = crypto.randomUUID();
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  let attachmentMime: string | null = null;

  if (input.file) {
    const uploaded = await uploadFeedbackAttachment(submitter.authUserId, ticketId, input.file);
    if ('error' in uploaded) {
      return { data: null, error: uploaded.error };
    }
    attachmentPath = uploaded.path;
    attachmentName = uploaded.name;
    attachmentMime = uploaded.mime;
  }

  const { data, error } = await supabase
    .from('feedback_system')
    .insert({
      id: ticketId,
      account_id: submitter.accountId,
      title,
      description,
      label: input.label,
      status: 'unresolved',
      priority: null,
      ticket_level: 1,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
      attachment_mime: attachmentMime,
    })
    .select('*')
    .single();

  if (error) {
    if (attachmentPath) {
      await supabase.storage.from(FEEDBACK_ATTACHMENTS_BUCKET).remove([attachmentPath]);
    }
    return { data: null, error: error.message };
  }

  return { data: data ? mapFeedback(data) : null, error: null };
}

export async function fetchOwnFeedback(): Promise<{ data: FeedbackDisplay[]; error: string | null }> {
  const submitter = await fetchFeedbackSubmitter();
  if (!submitter) {
    return { data: [], error: 'You must be signed in to view feedback.' };
  }

  const { data, error } = await supabase
    .from('feedback_system')
    .select('*')
    .eq('account_id', submitter.accountId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map(mapFeedback), error: null };
}

export async function deleteOwnFeedback(
  ticketId: string,
): Promise<{ error: string | null }> {
  const submitter = await fetchFeedbackSubmitter();
  if (!submitter) {
    return { error: 'You must be signed in to delete feedback.' };
  }

  const { data: row, error: fetchError } = await supabase
    .from('feedback_system')
    .select('id, status, attachment_path, account_id')
    .eq('id', ticketId)
    .eq('account_id', submitter.accountId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!row) return { error: 'Ticket not found.' };
  if (row.status !== 'unresolved') {
    return { error: 'Only unresolved tickets can be deleted.' };
  }

  const { error } = await supabase.from('feedback_system').delete().eq('id', ticketId);
  if (error) return { error: error.message };

  if (row.attachment_path) {
    await supabase.storage.from(FEEDBACK_ATTACHMENTS_BUCKET).remove([row.attachment_path]);
  }

  return { error: null };
}
