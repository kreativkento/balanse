import { supabase } from './supabase';
import type {
  BulletinPostRow,
  BulletinPostType,
  BulletinVisibility,
} from './database.types';

export const BULLETIN_RESOURCES_BUCKET = 'bulletin_resources';
export const BULLETIN_TITLE_MAX = 200;
export const BULLETIN_BODY_MAX = 8000;
export const BULLETIN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const BULLETIN_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ATTACHMENT_MIME = new Set([
  ...IMAGE_MIME,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export interface BulletinPostInput {
  title: string;
  body: string;
  category: BulletinPostType;
  visibility: BulletinVisibility;
  pinned?: boolean;
  postedAt?: string | null;
  activeUntil?: string | null;
  isActive?: boolean;
  adminApproved?: boolean;
  imageFile?: File | null;
  attachmentFile?: File | null;
  removeImage?: boolean;
  removeAttachment?: boolean;
}

function extensionForFile(file: File): string | null {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;
  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt === 'jpeg') return 'jpg';
  if (nameExt && ['jpg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'].includes(nameExt)) {
    return nameExt;
  }
  return null;
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
  return base.slice(0, 80) || 'attachment';
}

export function bulletinResourcePublicUrl(path: string): string {
  const { data } = supabase.storage.from(BULLETIN_RESOURCES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function validateImage(file: File): string | null {
  if (!IMAGE_MIME.has(file.type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return 'Cover photo must be a JPG, PNG, WEBP, or GIF.';
  }
  if (file.size > BULLETIN_IMAGE_MAX_BYTES) {
    return 'Cover photo must be 10 MB or smaller.';
  }
  return null;
}

function validateAttachment(file: File): string | null {
  if (!ATTACHMENT_MIME.has(file.type) && !/\.(jpe?g|png|webp|gif|pdf|docx?)$/i.test(file.name)) {
    return 'Attachment must be an image, PDF, or Word document.';
  }
  if (file.size > BULLETIN_ATTACHMENT_MAX_BYTES) {
    return 'Attachment must be 25 MB or smaller.';
  }
  return null;
}

function validateSchedule(postedAt?: string | null, activeUntil?: string | null): string | null {
  if (!postedAt) return 'Post datetime is required.';
  const posted = new Date(postedAt);
  if (Number.isNaN(posted.getTime())) return 'Post datetime is invalid.';
  if (!activeUntil) return null;
  const until = new Date(activeUntil);
  if (Number.isNaN(until.getTime())) return 'Active until datetime is invalid.';
  if (until.getTime() <= posted.getTime()) {
    return 'Active until must be after the post datetime.';
  }
  return null;
}

async function currentAccountId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

async function uploadBulletinFile(
  postId: string,
  kind: 'cover' | 'attachment',
  file: File,
): Promise<{ path: string; name: string; mime: string } | { error: string }> {
  const ext = extensionForFile(file) ?? 'bin';
  const contentType = file.type || (IMAGE_MIME.has(`image/${ext}`) ? `image/${ext}` : file.type);
  const objectPath =
    kind === 'cover'
      ? `${postId}/cover.${ext}`
      : `${postId}/attachment/${sanitizeFileName(file.name) || `file.${ext}`}`;

  const { error } = await supabase.storage.from(BULLETIN_RESOURCES_BUCKET).upload(objectPath, file, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });

  if (error) {
    console.error('Failed to upload bulletin file:', error.message);
    return { error: error.message };
  }

  return { path: objectPath, name: file.name, mime: contentType || file.type };
}

async function removeBulletinFiles(paths: Array<string | null | undefined>) {
  const stale = paths.filter((path): path is string => Boolean(path));
  if (stale.length === 0) return;
  await supabase.storage.from(BULLETIN_RESOURCES_BUCKET).remove(stale);
}

async function expireEndedBulletinPosts() {
  await supabase
    .from('bulletin_posts')
    .update({ is_active: false })
    .eq('is_active', true)
    .not('active_until', 'is', null)
    .lte('active_until', new Date().toISOString());
}

export async function listBulletinPosts(options?: {
  publicOnly?: boolean;
  approvedOnly?: boolean;
  pendingOnly?: boolean;
}): Promise<{ data: BulletinPostRow[]; error: string | null }> {
  await expireEndedBulletinPosts();

  let query = supabase
    .from('bulletin_posts')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.publicOnly) {
    query = query.eq('is_public', true);
  }
  if (options?.approvedOnly) {
    const now = new Date().toISOString();
    query = query
      .eq('admin_approved', true)
      .eq('is_active', true)
      .lte('posted_at', now)
      .or(`active_until.is.null,active_until.gt.${now}`);
  }
  if (options?.pendingOnly) {
    query = query.eq('admin_approved', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load bulletin posts:', error.message);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function createBulletinPost(
  input: BulletinPostInput,
): Promise<{ data: BulletinPostRow | null; error: string | null }> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) return { data: null, error: 'Title is required.' };
  if (title.length > BULLETIN_TITLE_MAX) {
    return { data: null, error: `Title must be ${BULLETIN_TITLE_MAX} characters or fewer.` };
  }
  if (!body) return { data: null, error: 'Description is required.' };
  if (body.length > BULLETIN_BODY_MAX) {
    return { data: null, error: `Description must be ${BULLETIN_BODY_MAX} characters or fewer.` };
  }
  if (input.imageFile) {
    const imageError = validateImage(input.imageFile);
    if (imageError) return { data: null, error: imageError };
  }
  if (input.attachmentFile) {
    const attachmentError = validateAttachment(input.attachmentFile);
    if (attachmentError) return { data: null, error: attachmentError };
  }

  const scheduleError = validateSchedule(input.postedAt, input.activeUntil);
  if (scheduleError) return { data: null, error: scheduleError };

  const accountId = await currentAccountId();

  const { data: inserted, error: insertError } = await supabase
    .from('bulletin_posts')
    .insert({
      title,
      body,
      category: input.category,
      visibility: input.visibility,
      pinned: Boolean(input.pinned),
      posted_at: input.postedAt || new Date().toISOString(),
      active_until: input.activeUntil || null,
      is_active: input.isActive !== false,
      admin_approved: Boolean(input.adminApproved),
      created_by: accountId,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    return { data: null, error: insertError?.message ?? 'Could not create the post.' };
  }

  const updates: Partial<BulletinPostRow> = {};

  if (input.imageFile) {
    const uploaded = await uploadBulletinFile(inserted.id, 'cover', input.imageFile);
    if ('error' in uploaded) {
      await supabase.from('bulletin_posts').delete().eq('id', inserted.id);
      return { data: null, error: uploaded.error };
    }
    updates.image_path = uploaded.path;
  }

  if (input.attachmentFile) {
    const uploaded = await uploadBulletinFile(inserted.id, 'attachment', input.attachmentFile);
    if ('error' in uploaded) {
      await removeBulletinFiles([updates.image_path]);
      await supabase.from('bulletin_posts').delete().eq('id', inserted.id);
      return { data: null, error: uploaded.error };
    }
    updates.attachment_path = uploaded.path;
    updates.attachment_name = uploaded.name;
    updates.attachment_mime = uploaded.mime;
  }

  if (Object.keys(updates).length === 0) {
    return { data: inserted, error: null };
  }

  const { data: updated, error: updateError } = await supabase
    .from('bulletin_posts')
    .update(updates)
    .eq('id', inserted.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return { data: { ...inserted, ...updates }, error: null };
  }

  return { data: updated, error: null };
}

export async function updateBulletinPost(
  id: string,
  input: BulletinPostInput,
  current?: { imagePath?: string | null; attachmentPath?: string | null },
): Promise<{ data: BulletinPostRow | null; error: string | null }> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) return { data: null, error: 'Title is required.' };
  if (!body) return { data: null, error: 'Description is required.' };
  if (input.imageFile) {
    const imageError = validateImage(input.imageFile);
    if (imageError) return { data: null, error: imageError };
  }
  if (input.attachmentFile) {
    const attachmentError = validateAttachment(input.attachmentFile);
    if (attachmentError) return { data: null, error: attachmentError };
  }

  const scheduleError = validateSchedule(input.postedAt, input.activeUntil);
  if (scheduleError) return { data: null, error: scheduleError };

  const updates: Partial<BulletinPostRow> = {
    title,
    body,
    category: input.category,
    visibility: input.visibility,
    pinned: Boolean(input.pinned),
    posted_at: input.postedAt || new Date().toISOString(),
    active_until: input.activeUntil || null,
    is_active: input.isActive !== false,
  };

  if (input.imageFile) {
    const uploaded = await uploadBulletinFile(id, 'cover', input.imageFile);
    if ('error' in uploaded) return { data: null, error: uploaded.error };
    updates.image_path = uploaded.path;
  } else if (input.removeImage) {
    await removeBulletinFiles([current?.imagePath]);
    updates.image_path = null;
  }

  if (input.attachmentFile) {
    const uploaded = await uploadBulletinFile(id, 'attachment', input.attachmentFile);
    if ('error' in uploaded) return { data: null, error: uploaded.error };
    if (current?.attachmentPath && current.attachmentPath !== uploaded.path) {
      await removeBulletinFiles([current.attachmentPath]);
    }
    updates.attachment_path = uploaded.path;
    updates.attachment_name = uploaded.name;
    updates.attachment_mime = uploaded.mime;
  } else if (input.removeAttachment) {
    await removeBulletinFiles([current?.attachmentPath]);
    updates.attachment_path = null;
    updates.attachment_name = null;
    updates.attachment_mime = null;
  }

  const { data, error } = await supabase
    .from('bulletin_posts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Could not update the post.' };
  }

  return { data, error: null };
}

async function setBulletinApproval(
  id: string,
  approved: boolean,
  failMessage: string,
): Promise<{ data: BulletinPostRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('bulletin_posts')
    .update({ admin_approved: approved })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? failMessage };
  }
  return { data, error: null };
}

export async function approveBulletinPost(
  id: string,
): Promise<{ data: BulletinPostRow | null; error: string | null }> {
  return setBulletinApproval(id, true, 'Could not approve the post.');
}

export async function holdBulletinPost(
  id: string,
): Promise<{ data: BulletinPostRow | null; error: string | null }> {
  return setBulletinApproval(id, false, 'Could not hold the post.');
}

export async function deleteBulletinPost(
  post: { id: string; imagePath?: string | null; attachmentPath?: string | null },
): Promise<{ error: string | null }> {
  await removeBulletinFiles([post.imagePath, post.attachmentPath]);
  const { error } = await supabase.from('bulletin_posts').delete().eq('id', post.id);
  if (error) return { error: error.message };
  return { error: null };
}
