import { UserCog } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Account Logs',
  subtitle: 'Create, update, and delete activity on accounts (role, email, identity).',
  tables: ['accounts'],
  icon: UserCog,
  emptyHint: 'Account changes appear here automatically after 900_system_logs.sql is applied.',
});
