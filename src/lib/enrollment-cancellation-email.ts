import { supabase } from './supabase';

export async function sendEnrollmentCancellationDecisionEmail(requestId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-enrollment-cancellation-email', {
    body: { requestId },
  });
  if (error) {
    console.error('send-enrollment-cancellation-email:', error.message);
  }
}
