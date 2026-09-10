import { Megaphone } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Bulletin Logs',
  subtitle: 'Create, edit, approve, and delete activity on bulletin_posts.',
  tables: ['bulletin_posts'],
  icon: Megaphone,
  emptyHint: 'Bulletin posts appear here when writers create, edit, approve, or delete them.',
});
