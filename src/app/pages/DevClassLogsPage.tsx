import { CalendarDays } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Class Logs',
  subtitle: 'Class shells plus student enrollments and coach assignments.',
  tables: ['classes', 'class_students', 'class_coaches'],
  icon: CalendarDays,
  emptyHint: 'Class create/update/delete, enroll, and coach assign activity appears here.',
});
