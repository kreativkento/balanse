/**
 * Checkout payment channel shape (loaded from Supabase `payment_channels`).
 */

export interface PaymentChannel {
  /** Channel UUID from database */
  id: string;
  /** Stable slug for icons / legacy mapping (e.g. gcash, bank) */
  slug: string;
  label: string;
  sub: string;
  bg: string;
  accountName: string;
  accountNumber?: string;
  accountHint: string;
  qrImageUrl: string | null;
}

/** Fallback when API is unavailable (dev / pre-migration). */
export const FALLBACK_PAYMENT_CHANNELS: PaymentChannel[] = [
  {
    id: 'fallback-bank',
    slug: 'bank',
    label: 'Bank Transfer',
    sub: 'BPI / BDO',
    bg: '#3A4A5A',
    accountName: 'BALANSÉ Studio',
    accountHint: 'BPI',
    qrImageUrl: null,
  },
  {
    id: 'fallback-gcash',
    slug: 'gcash',
    label: 'GCash',
    sub: 'E-wallet',
    bg: '#007DFF',
    accountName: 'BALANSÉ Studio',
    accountNumber: '0917 123 4567',
    accountHint: 'GCash',
    qrImageUrl: null,
  },
  {
    id: 'fallback-maya',
    slug: 'maya',
    label: 'Maya',
    sub: 'E-wallet',
    bg: '#46BFA8',
    accountName: 'BALANSÉ Studio',
    accountNumber: '0917 123 4567',
    accountHint: 'Maya',
    qrImageUrl: null,
  },
];
