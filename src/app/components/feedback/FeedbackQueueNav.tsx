import { Inbox, MessageSquare, Send } from 'lucide-react';

export type FeedbackQueueMode = 'inbox' | 'mine';

type FeedbackQueueNavProps = {
  mode: FeedbackQueueMode;
  onChange: (mode: FeedbackQueueMode) => void;
  /** Unresolved inbox tickets. Hidden while the queue is still loading. */
  inboxPending: number | null;
};

const TABS: { id: FeedbackQueueMode; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'mine', label: 'My Submissions', icon: Send },
];

export function FeedbackQueueNav({ mode, onChange, inboxPending }: FeedbackQueueNavProps) {
  return (
    <nav
      className="mt-3 mb-4 flex flex-wrap items-center gap-2 border-b border-[#D4CDB5]/60 pb-3"
      aria-label="Feedback pages"
    >
      <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8A7E6E]">
        <span className="text-[#c49a3c]">
          <MessageSquare size={16} />
        </span>
        Feedback
        <span className="text-[#C0B8A8]" aria-hidden>
          ›
        </span>
      </span>
      {TABS.map((tab) => {
        const active = mode === tab.id;
        const Icon = tab.icon;
        const pending = tab.id === 'inbox' ? inboxPending : null;
        const showPending = (pending ?? 0) > 0;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold font-sans transition-all ${
              active
                ? 'bg-[#1E2A35] text-white shadow-sm'
                : 'bg-white text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
            }`}
          >
            <span className={active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>
              <Icon size={16} />
            </span>
            {tab.label}
            {showPending ? (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                aria-label={`${pending} pending`}
              >
                {(pending ?? 0) > 99 ? '99+' : pending}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
