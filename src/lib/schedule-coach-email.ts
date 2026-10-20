import { supabase } from './supabase';

export async function sendScheduleCoachPortalDecisionEmail(
  requestId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-schedule-coach-email', {
    body: { kind: 'portal_slot_decision', requestId },
  });

  if (error) {
    console.error('send-schedule-coach-email (portal_slot_decision):', error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    const message = payload?.error ?? 'Could not send schedule notification.';
    console.error('send-schedule-coach-email (portal_slot_decision):', message);
    return { ok: false, error: message };
  }

  return { ok: true, error: null };
}

export async function sendClassCancellationMemberEmails(input: {
  classId: string;
  variant: 'coach_replaced' | 'class_cancelled';
  replacementCoachAccountId?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-schedule-coach-email', {
    body: {
      kind: 'class_cancellation_members',
      classId: input.classId,
      variant: input.variant,
      replacementCoachAccountId: input.replacementCoachAccountId,
    },
  });

  if (error) {
    console.error('send-schedule-coach-email (class_cancellation_members):', error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    const message = payload?.error ?? 'Could not send member notifications.';
    console.error('send-schedule-coach-email (class_cancellation_members):', message);
    return { ok: false, error: message };
  }

  return { ok: true, error: null };
}

export async function sendScheduleCoachAssignedEmail(
  classId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-schedule-coach-email', {
    body: { kind: 'coach_assigned', classId },
  });

  if (error) {
    console.error('send-schedule-coach-email (coach_assigned):', error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    const message = payload?.error ?? 'Could not send assignment notification.';
    console.error('send-schedule-coach-email (coach_assigned):', message);
    return { ok: false, error: message };
  }

  return { ok: true, error: null };
}
