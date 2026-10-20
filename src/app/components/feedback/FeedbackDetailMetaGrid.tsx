import type { LucideIcon } from 'lucide-react';
import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_PRIORITY_STYLES,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_STYLES,
  type FeedbackPriority,
  type FeedbackStatus,
} from '../../../lib/feedback-service';
import { FEEDBACK_DETAIL_FIELD_INP } from './feedback-detail-modal-styles';
import { FeedbackTicketDropdown } from './FeedbackTicketDropdown';

export function FeedbackDetailMetaGrid({
  labelText,
  LabelIcon,
  labelTone,
  status,
  priority,
  canEditStatus = false,
  canEditPriority = false,
  statusSaving = false,
  prioritySaving = false,
  fieldsDisabled = false,
  onStatusSelect,
  onPrioritySelect,
}: {
  labelText: string;
  LabelIcon: LucideIcon;
  labelTone: string;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  canEditStatus?: boolean;
  canEditPriority?: boolean;
  statusSaving?: boolean;
  prioritySaving?: boolean;
  fieldsDisabled?: boolean;
  onStatusSelect?: (status: FeedbackStatus) => void;
  onPrioritySelect?: (priority: FeedbackPriority) => void;
}) {
  const statusOptions = FEEDBACK_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
    toneClass: FEEDBACK_STATUS_STYLES[s.value],
  }));

  const priorityOptions = FEEDBACK_PRIORITIES.map((p) => ({
    value: p.value,
    label: p.label,
    toneClass: FEEDBACK_PRIORITY_STYLES[p.value],
  }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">Label</span>
        <div className={`${FEEDBACK_DETAIL_FIELD_INP} flex min-h-[42px] items-center gap-2`}>
          <LabelIcon size={16} className={labelTone} />
          <span className="truncate font-medium">{labelText}</span>
        </div>
      </div>

      <FeedbackTicketDropdown
        fieldLabel="Status"
        value={status}
        options={statusOptions}
        readOnly={!canEditStatus}
        disabled={fieldsDisabled}
        saving={statusSaving}
        onSelect={canEditStatus && onStatusSelect ? onStatusSelect : undefined}
      />

      <FeedbackTicketDropdown
        fieldLabel="Priority"
        value={priority}
        options={priorityOptions}
        placeholder="Not set"
        readOnly={!canEditPriority}
        disabled={fieldsDisabled}
        saving={prioritySaving}
        onSelect={canEditPriority && onPrioritySelect ? onPrioritySelect : undefined}
      />
    </div>
  );
}
