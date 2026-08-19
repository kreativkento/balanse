import { UserRound } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Profile Logs',
  subtitle: 'Tracks profile field changes. Medical history values are redacted in stored snapshots.',
  table: 'profile_logs',
  icon: UserRound,
  emptyHint: 'Profile edits will appear here automatically once migration 900_system_logs.sql is applied.',
});
