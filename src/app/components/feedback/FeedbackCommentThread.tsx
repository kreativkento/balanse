import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  addFeedbackComment,
  fetchFeedbackComments,
  FEEDBACK_COMMENT_MAX,
  type FeedbackComment,
} from '../../../lib/feedback-comment-service';
import { toastCreated, toastOperationFailed } from '../../../lib/operation-toast';

function formatCommentAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function FeedbackCommentThread({
  ticketId,
  currentAccountId,
}: {
  ticketId: string;
  currentAccountId: string | null;
}) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchFeedbackComments(ticketId).then((result) => {
      if (cancelled) return;
      setComments(result.data);
      setError(result.error ?? '');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const submit = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    const result = await addFeedbackComment(ticketId, draft);
    setSaving(false);
    if (result.error || !result.data) {
      toastOperationFailed(result.error ?? 'Could not post comment.');
      return;
    }
    setComments((prev) => [...prev, result.data!]);
    setDraft('');
    toastCreated('Comment');
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Ticket loop</p>
      <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#8A7E6E]">
            <Loader2 size={14} className="animate-spin text-[#c49a3c]" />
            Loading comments…
          </div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-[#8A7E6E]">{error}</p>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#8A7E6E]">
            No comments yet. Anyone in this ticket loop can reply here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => {
              const mine = currentAccountId === comment.accountId;
              return (
                <li key={comment.id} className={`flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                  <p className="text-[11px] font-semibold text-[#8A7E6E]">
                    {mine ? 'You' : comment.authorName}
                    <span className="ml-1.5 font-normal text-[#B0A898]">{formatCommentAt(comment.createdAt)}</span>
                  </p>
                  <p
                    className={`max-w-[95%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      mine
                        ? 'bg-[#1E2A35] text-white'
                        : 'border border-[#D4CDB5]/70 bg-white text-[#1E2A35]'
                    }`}
                  >
                    {comment.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, FEEDBACK_COMMENT_MAX))}
          rows={3}
          placeholder="Write a comment for everyone in this ticket loop…"
          className="w-full resize-none rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2.5 text-sm text-[#1E2A35] outline-none placeholder:text-[#B0A898] focus:border-[#c49a3c]/50 focus:ring-2 focus:ring-[#c49a3c]/25"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-[#B0A898]">
            {draft.trim().length}/{FEEDBACK_COMMENT_MAX} · Email + in-app notice sent to others in the loop
          </p>
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={() => {
              void submit();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1E2A35] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#263545] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
