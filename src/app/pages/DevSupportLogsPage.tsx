import { Headphones } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Feedback Logs',
  subtitle: 'Tracks create, update, status, and delete activity on feedback_system.',
  tables: ['feedback_system'],
  icon: Headphones,
  emptyHint: 'Feedback tickets appear here when members submit or staff update them.',
});
