import { Landmark } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';

export default createSystemLogPage({
  title: 'Transaction Logs',
  subtitle: 'Tracks payments, approvals, refunds, and other money movement for reconciliation.',
  table: 'transaction_logs',
  icon: Landmark,
  emptyHint: 'Transaction entries will appear when payment flows write to transaction_logs.',
});
