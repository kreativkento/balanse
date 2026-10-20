import { supabase } from './supabase';

/** Defaults when row is missing or a field is null (matches migration seed). */
export const STUDIO_POLICY_DEFAULTS = {
  cancelWindowHours: 24,
  loyaltyThreshold: 12,
  referralBonus: 100,
  sessionExpiryDays: 30,
  maxBookingsPerDay: 1,
  classCapacityDefault: 12,
  gracePeriodHours: 48,
} as const;

export type StudioPolicySettings = {
  cancelWindowHours: number;
  loyaltyThreshold: number;
  referralBonus: number;
  sessionExpiryDays: number;
  maxBookingsPerDay: number;
  classCapacityDefault: number;
  gracePeriodHours: number;
  updatedAt: string | null;
};

type StudioPolicyRow = {
  cancel_window_hours: number;
  loyalty_threshold: number;
  referral_bonus: number;
  session_expiry_days: number;
  max_bookings_per_day: number;
  class_capacity_default: number;
  payment_grace_period_hours: number;
  updated_at: string;
};

function rowToSettings(row: StudioPolicyRow): StudioPolicySettings {
  return {
    cancelWindowHours: row.cancel_window_hours,
    loyaltyThreshold: row.loyalty_threshold,
    referralBonus: row.referral_bonus,
    sessionExpiryDays: row.session_expiry_days,
    maxBookingsPerDay: row.max_bookings_per_day,
    classCapacityDefault: row.class_capacity_default,
    gracePeriodHours: row.payment_grace_period_hours,
    updatedAt: row.updated_at ?? null,
  };
}

/** Load studio policies (for admin UI, cancellation rules, booking limits, etc.). */
export async function fetchStudioPolicySettings(): Promise<{
  data: StudioPolicySettings;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('studio_policy_settings')
    .select(
      'cancel_window_hours, loyalty_threshold, referral_bonus, session_expiry_days, max_bookings_per_day, class_capacity_default, payment_grace_period_hours, updated_at',
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('fetchStudioPolicySettings:', error.message);
    return { data: { ...STUDIO_POLICY_DEFAULTS, updatedAt: null }, error: error.message };
  }

  if (!data) {
    return { data: { ...STUDIO_POLICY_DEFAULTS, updatedAt: null }, error: null };
  }

  return { data: rowToSettings(data as StudioPolicyRow), error: null };
}

export async function updateStudioPolicySettings(
  settings: StudioPolicySettings,
): Promise<{ success: boolean; error: string | null }> {
  const row = {
    id: 1,
    cancel_window_hours: settings.cancelWindowHours,
    loyalty_threshold: settings.loyaltyThreshold,
    referral_bonus: settings.referralBonus,
    session_expiry_days: settings.sessionExpiryDays,
    max_bookings_per_day: settings.maxBookingsPerDay,
    class_capacity_default: settings.classCapacityDefault,
    payment_grace_period_hours: settings.gracePeriodHours,
  };

  const { error } = await supabase.from('studio_policy_settings').upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('updateStudioPolicySettings:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/** RPC wrapper — same row, useful from edge functions or future SQL-only paths. */
export async function fetchStudioPolicySettingsRpc(): Promise<{
  data: StudioPolicySettings | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_studio_policy_settings');

  if (error) {
    console.error('get_studio_policy_settings:', error.message);
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: { ...STUDIO_POLICY_DEFAULTS, updatedAt: null }, error: null };
  }

  return { data: rowToSettings(data as StudioPolicyRow), error: null };
}
