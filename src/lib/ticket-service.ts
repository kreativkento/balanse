import { supabase } from './supabase';
import type {
  TicketPriority,
  TicketRow,
  TicketStatus,
  TicketType,
} from './database.types';

export type { TicketPriority, TicketStatus, TicketType };

export interface TicketDisplay {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  level: 1 | 2;
  imageUrl: string | null;
  status: TicketStatus;
  creatorAccountId: string;
  creatorEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  level: 1 | 2;
  imageUrl?: string | null;
  creatorAccountId: string;
  creatorEmail: string;
}

function mapTicket(row: TicketRow): TicketDisplay {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    level: row.level === 2 ? 2 : 1,
    imageUrl: row.image_url,
    status: row.status,
    creatorAccountId: row.creator_account_id,
    creatorEmail: row.creator_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTicketsForDev(): Promise<{ data: TicketDisplay[]; error: string | null }> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map(mapTicket), error: null };
}

export async function createTicket(
  input: CreateTicketInput,
): Promise<{ data: TicketDisplay | null; error: string | null }> {
  const title = input.title.trim();
  if (!title) {
    return { data: null, error: 'Title is required.' };
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title,
      description: input.description.trim(),
      type: input.type,
      priority: input.priority,
      level: input.level,
      image_url: input.imageUrl?.trim() || null,
      creator_account_id: input.creatorAccountId,
      creator_email: input.creatorEmail.trim().toLowerCase(),
      status: 'open',
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ? mapTicket(data) : null, error: null };
}

export async function escalateTicketToDev(
  ticketId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tickets')
    .update({ level: 2 })
    .eq('id', ticketId);

  return { error: error?.message ?? null };
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId);

  return { error: error?.message ?? null };
}

/** Resolve the current signed-in account id for ticket creator. */
export async function fetchCurrentAccountId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return data?.id ?? null;
}
