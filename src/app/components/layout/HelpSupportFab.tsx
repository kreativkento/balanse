import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MessageCircle, Send, SquarePen } from 'lucide-react';
import { cn } from '../ui/utils';
import { CHAT_MAX_MESSAGE_LENGTH, loadChatSession, saveChatSession, sendChatMessage, type ChatMessage } from '../../../lib/chat-service';

export function HelpSupportFab({
  withBottomCta = false,
}: {
  withBottomCta?: boolean;
  variant?: 'help' | 'chat';
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatSession);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const conversationVersionRef = useRef(0);
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resizeInput = (input: HTMLTextAreaElement) => {
    input.style.height = 'auto';
    const nextHeight = Math.min(input.scrollHeight, 112);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > 112 ? 'auto' : 'hidden';
  };

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { saveChatSession(messages); }, [messages]);
  useEffect(() => {
    if (inputRef.current) resizeInput(inputRef.current);
  }, [draft, chatOpen]);
  useEffect(() => {
    const container = conversationRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, sending, chatOpen, chatError]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || requestRef.current || message.length > CHAT_MAX_MESSAGE_LENGTH) return;
    const controller = new AbortController();
    const conversationVersion = conversationVersionRef.current;
    requestRef.current = controller;
    setSending(true);
    setChatError(null);
    setDraft('');
    if (inputRef.current) resizeInput(inputRef.current);
    const previous = messages;
    setMessages([...previous, { role: 'user', content: message }]);
    const timeout = window.setTimeout(() => controller.abort(), 65000);
    try {
      const reply = await sendChatMessage(message, previous, controller.signal);
      if (conversationVersionRef.current !== conversationVersion) return;
      setMessages([...previous, { role: 'user', content: message }, { role: 'assistant', content: reply }]);
    } catch (error) {
      if (conversationVersionRef.current !== conversationVersion) return;
      setMessages(previous);
      setDraft(message);
      setChatError(controller.signal.aborted
        ? 'The response took too long. Please try again.'
        : error instanceof Error ? error.message : 'Please try again shortly.');
    } finally {
      window.clearTimeout(timeout);
      if (conversationVersionRef.current === conversationVersion) {
        requestRef.current = null;
        setSending(false);
      }
    }
  };

  const handleNewChat = () => {
    conversationVersionRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setMessages([]);
    saveChatSession([]);
    setDraft('');
    setChatError(null);
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <>
      {!chatOpen && (
        <div
          className={`fixed right-4 z-40 flex flex-col items-end gap-3 md:right-6 ${
            withBottomCta ? 'bottom-24 md:bottom-6' : 'bottom-6'
          }`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <button
            type="button"
            aria-label="Open chatbot"
            onClick={() => setChatOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c49a3c] text-xl font-bold text-white shadow-[0_4px_20px_rgba(196,154,60,0.35)] transition-all duration-200 hover:bg-[#a67f2e] hover:shadow-[0_6px_24px_rgba(196,154,60,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F3E8] active:scale-[0.97]"
          >
            <MessageCircle size={22} aria-hidden="true" />
          </button>
        </div>
      )}

      {chatOpen && (
        <div
          className={`fixed right-4 z-40 h-[min(560px,calc(100dvh-8rem))] w-[min(calc(100vw-2rem),360px)] md:right-6 ${
            withBottomCta ? 'bottom-24 md:bottom-6' : 'bottom-6'
          }`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] shadow-[0_8px_32px_rgba(30,42,53,0.14)] animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            role="dialog"
            aria-label="Chatbot"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#D4CDB5]/60 bg-[#EDE8D8] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#1E2A35]">BALANSÉ Assistant</p>
                <p className="text-xs text-[#8A7E6E]">Ask us anything about classes & membership</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="New Chat"
                  title="New Chat"
                  onClick={handleNewChat}
                  className="rounded-full p-2 text-[#8A7E6E] transition-colors hover:bg-[#F8F3E8] hover:text-[#1E2A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
                >
                  <SquarePen size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Minimize chatbot"
                  onClick={() => setChatOpen(false)}
                  className="rounded-full p-2 text-[#8A7E6E] transition-colors hover:bg-[#F8F3E8] hover:text-[#1E2A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
                >
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
              <div ref={conversationRef} role="log" aria-label="Conversation" aria-live="polite" aria-busy={sending} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth [scrollbar-width:thin] [scrollbar-color:#c49a3c_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c49a3c]/55 [&::-webkit-scrollbar-thumb:hover]:bg-[#a67f2e] [&::-webkit-scrollbar-button]:hidden">
              <div className="ml-1 mr-auto w-fit max-w-[85%] rounded-2xl rounded-tl-sm border border-[#D4CDB5]/60 bg-white px-3 py-2.5 text-sm text-[#5A5048]">
                Hi! I can help with class schedules, pricing, and booking. How can I assist you today?
              </div>
              {messages.map((message, index) => (
                <div key={index} className={cn(
                  'w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border border-[#D4CDB5]/60 px-3 py-2.5 text-sm text-[#5A5048]',
                  message.role === 'assistant' ? 'ml-1 mr-auto rounded-tl-sm bg-white' : 'ml-auto mr-1 rounded-tr-sm border-[#c49a3c] bg-[#c49a3c] text-white',
                )}>
                  <span className="sr-only">{message.role === 'user' ? 'You: ' : 'BALANSÉ Assistant: '}</span>
                  {message.content}
                </div>
              ))}
              {sending && (
                <div role="status" aria-label="BALANSÉ Assistant is typing" className="ml-1 mr-auto flex w-fit max-w-[85%] items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[#D4CDB5]/60 bg-white px-3 py-3">
                  <span className="sr-only">BALANSÉ Assistant is typing</span>
                  <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A7E6E] [animation-delay:-0.3s]" />
                  <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A7E6E] [animation-delay:-0.15s]" />
                  <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A7E6E]" />
                </div>
              )}
              {chatError && <p role="alert" className="text-xs text-[#8A7E6E]">{chatError}</p>}
              </div>

              <form onSubmit={handleSend} className="flex shrink-0 items-end gap-2 rounded-3xl border border-[#D4CDB5]/60 bg-white px-3 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    resizeInput(event.currentTarget);
                  }}
                  maxLength={CHAT_MAX_MESSAGE_LENGTH}
                  disabled={sending}
                  placeholder="Type a message..."
                  aria-label="Chat message"
                  className="max-h-28 min-h-8 min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent py-1 text-sm leading-6 text-[#1E2A35] placeholder:text-[#8A7E6E] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={sending || !draft.trim()}
                  className="action-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c49a3c] text-white transition-colors hover:bg-[#a67f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
