import { Dumbbell } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Discipline Logs',
  subtitle: 'Catalog edits on disciplines and coach specialty tags on coach_disciplines.',
  tables: ['disciplines', 'coach_disciplines'],
  icon: Dumbbell,
  emptyHint: 'Discipline catalog and coach tag changes appear here automatically.',
});
