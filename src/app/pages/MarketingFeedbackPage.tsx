import { FeedbackPortalPage } from './DevFeedbackPage';

/** Marketing feedback: own submissions only (submit at level 2; no inbox). */
export default function MarketingFeedbackPage() {
  return <FeedbackPortalPage forcedPortal="marketing" inboxLevelsOverride={[]} />;
}
