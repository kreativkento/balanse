import { UserRound } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Profile Logs',
  subtitle: 'Tracks profiles_client and profiles_staff. Health declaration values are redacted in stored snapshots.',
  tables: ['profiles_client', 'profiles_staff'],
  icon: UserRound,
  emptyHint: 'Profile edits appear here automatically after 900_system_logs.sql is applied.',
});
