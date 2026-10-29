import { FeedbackPortalPage } from './DevFeedbackPage';

const ADMIN_INBOX_RECEIVE = {
  label: 'Receive',
  successMessage: 'Ticket received',
  ticketLevel: 2 as const,
};

const ADMIN_INBOX_FORWARD = {
  label: 'Forward to Dev',
  successMessage: 'Forwarded to development',
  disabledTitle: 'Receive this ticket first (ticket level must be 3).',
  requiredLevel: 3 as const,
  toDev: true,
};

/** Admin inbox: levels 2–3, receive 2→3, forward 3→4, de-escalate member tickets. */
export default function AdminFeedbackPage() {
  return (
    <FeedbackPortalPage
      forcedPortal="admin"
      inboxReceiveAction={ADMIN_INBOX_RECEIVE}
      inboxForwardAction={ADMIN_INBOX_FORWARD}
    />
  );
}
