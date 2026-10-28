import { supabase } from './supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Start a fresh session so older, route-filled assistant messages are not shown.
const STORAGE_KEY = 'balanse-assistant-session-v2';
export const CHAT_MAX_MESSAGE_LENGTH = 2000;

export function loadChatSession(): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ChatMessage =>
      item && (item.role === 'user' || item.role === 'assistant') &&
      typeof item.content === 'string' && item.content.length <= 6000,
    ).slice(-24);
  } catch { return []; }
}

export function saveChatSession(messages: ChatMessage[]): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24))); }
  catch { /* The chat still works when browser storage is unavailable. */ }
}

export async function sendChatMessage(message: string, history: ChatMessage[], signal: AbortSignal): Promise<string> {
  const { data, error } = await supabase.functions.invoke('balanse-chat', {
    body: { message, history: history.slice(-12) },
    signal,
  });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0;
    if (status === 429) throw new Error('Please wait a minute before sending another message.');
    if (status === 503) throw new Error('The assistant is temporarily unavailable. Please try again shortly.');
    throw new Error('I couldn’t connect to the assistant. Please try again.');
  }
  if (!data || data.ok !== true || typeof data.reply !== 'string' ||
    !data.reply.trim() || data.reply.length > 6000) {
    throw new Error('The assistant couldn’t provide a verified response. Please try again.');
  }
  return data.reply.trim();
}
