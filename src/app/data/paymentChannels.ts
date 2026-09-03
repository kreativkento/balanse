/**
 * Payment methods shown at checkout, including optional QR images.
 * Admin can later upload/replace `qrImageUrl` per method (public URL or data URL).
 * Add a new entry here (or via upsertPaymentChannel) for future methods.
 */

export interface PaymentChannel {
  id: string;
  label: string;
  sub: string;
  bg: string;
  accountName: string;
  accountNumber?: string;
  accountHint: string;
  /** QR image for this method. Null when none has been set yet. */
  qrImageUrl: string | null;
}

export const PAYMENT_METHOD_LABEL_TO_ID: Record<string, string> = {
  'Bank Transfer': 'bank',
  GCash: 'gcash',
  Maya: 'maya',
};

const INITIAL_PAYMENT_CHANNELS: PaymentChannel[] = [
  {
    id: 'bank',
    label: 'Bank Transfer',
    sub: 'BPI / BDO',
    bg: '#3A4A5A',
    accountName: 'BALANSÉ Studio',
    accountHint: 'BPI',
    qrImageUrl: '/payment-qr/bank.png',
  },
  {
    id: 'gcash',
    label: 'GCash',
    sub: 'E-wallet',
    bg: '#007DFF',
    accountName: 'BALANSÉ Studio',
    accountNumber: '0917 - 123 - 4567',
    accountHint: 'GCash',
    qrImageUrl: '/payment-qr/gcash.png',
  },
  {
    id: 'maya',
    label: 'Maya',
    sub: 'E-wallet',
    bg: '#46BFA8',
    accountName: 'BALANSÉ Studio',
    accountNumber: '0917 - 123 - 4567',
    accountHint: 'Maya',
    qrImageUrl: '/payment-qr/maya.png',
  },
];

let channels: PaymentChannel[] = INITIAL_PAYMENT_CHANNELS.map((channel) => ({ ...channel }));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPaymentChannels() {
  return channels;
}

export function getPaymentChannel(id: string) {
  return channels.find((channel) => channel.id === id);
}

export function subscribePaymentChannels(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Replace the QR image for an existing method, or no-op if the id is unknown. */
export function setPaymentChannelQr(id: string, qrImageUrl: string | null) {
  const exists = channels.some((channel) => channel.id === id);
  if (!exists) return;
  channels = channels.map((channel) => (
    channel.id === id ? { ...channel, qrImageUrl } : channel
  ));
  emit();
}

/** Add or replace a full payment method (for future channels). */
export function upsertPaymentChannel(next: PaymentChannel) {
  const exists = channels.some((channel) => channel.id === next.id);
  channels = exists
    ? channels.map((channel) => (channel.id === next.id ? { ...next } : channel))
    : [...channels, { ...next }];
  emit();
}
