import { Landmark } from 'lucide-react';
import { createSystemLogPage } from './SystemLogPage';
import type { LogSystemTableName } from '../../lib/database.types';

const PAYMENT_TABLES: LogSystemTableName[] = [];

export default createSystemLogPage({
  title: 'Transaction Logs',
  subtitle: 'Reserved for payment and money-movement rows in log_system once a payments table exists.',
  tables: PAYMENT_TABLES,
  icon: Landmark,
  emptyHint: 'No payment table is logged yet. CUD on accounts, profiles, classes, bulletin, and feedback already writes to log_system.',
});
