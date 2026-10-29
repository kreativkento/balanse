import { FeedbackPortalPage } from './DevFeedbackPage';

const FRONTDESK_INBOX_RECEIVE = {
  label: 'Receive',
  successMessage: 'Ticket received',
  ticketLevel: 0 as const,
};

const FRONTDESK_INBOX_FORWARD = {
  label: 'Forward to Admin',
  successMessage: 'Forwarded to admin',
  disabledTitle: 'Receive this ticket first (ticket level must be 1).',
  requiredLevel: 1 as const,
};

/** Front desk: inbox levels 0–1 + My submissions (staff submit at level 2). */
export default function FrontdeskFeedbackPage() {
  return (
    <FeedbackPortalPage
      forcedPortal="frontdesk"
      inboxReceiveAction={FRONTDESK_INBOX_RECEIVE}
      inboxForwardAction={FRONTDESK_INBOX_FORWARD}
    />
  );
}
