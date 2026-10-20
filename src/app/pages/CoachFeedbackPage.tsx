import { FeedbackPortalPage } from './DevFeedbackPage';

/** Coach feedback: own submissions only (submit at level 2; no member inbox). */
export default function CoachFeedbackPage() {
  return <FeedbackPortalPage forcedPortal="staff" inboxLevelsOverride={[]} />;
}
