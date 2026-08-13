import { Headphones } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Customer Support Logs',
  subtitle: 'Tracks support tickets, replies, status changes, and chatbot / email handoffs.',
  table: 'customer_support_logs',
  icon: Headphones,
  emptyHint: 'Support activity will appear here once ticket or help flows start writing logs.',
});
