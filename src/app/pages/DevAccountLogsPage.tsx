import { UserCog } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Account Logs',
  subtitle: 'Tracks create, update, and delete activity on accounts (role, email, identity).',
  table: 'account_logs',
  icon: UserCog,
  emptyHint: 'Account changes will appear here automatically once migration 900_system_logs.sql is applied.',
});
