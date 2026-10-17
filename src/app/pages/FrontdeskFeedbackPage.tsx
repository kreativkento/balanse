import { FeedbackPortalPage } from './FeedbackPortalPage';

/** Front desk feedback inbox: `feedback_system` rows with ticket_level = 0. */
export default function FrontdeskFeedbackPage() {
  return <FeedbackPortalPage forcedPortal="frontdesk" />;
}
