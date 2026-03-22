/**
 * CaterTrack Payment Config
 * Admin sets these — employees read them. Never exposed in admin UI to employees.
 */

export const PAYMENT_CONFIG_KEY = 'catertrack_payment_config';

export interface PaymentConfig {
  enabledMethods: ('UPI' | 'Card' | 'NetBanking')[];
  amount: number;
  currency: string;
  businessName: string;
  // UPI
  upiId: string;
  upiName: string;
  upiQrUrl: string;       // base64 data URL from upload, or empty to auto-generate from UPI ID
  // Card (instructions only — no real gateway in localStorage mode)
  cardInstructions: string;
  // NetBanking
  bankName: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankAccountHolder: string;
  // Receipt
  receiptNote: string;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  enabledMethods: ['UPI', 'Card', 'NetBanking'],
  amount: 20,
  currency: 'INR',
  businessName: 'CaterTrack Logistics',
  upiId: 'catertrack@okaxis',
  upiName: 'CaterTrack',
  upiQrUrl: '',
  cardInstructions: 'Pay via card at the facility counter. Show this screen to the cashier.',
  bankName: 'HDFC Bank',
  bankAccountNumber: '50100123456789',
  bankIFSC: 'HDFC0001234',
  bankAccountHolder: 'CaterTrack Pvt Ltd',
  receiptNote: 'Thank you! Your meal pass is now active for the week.',
};

export function getPaymentConfig(): PaymentConfig {
  try {
    const raw = localStorage.getItem(PAYMENT_CONFIG_KEY);
    if (raw) return { ...DEFAULT_PAYMENT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PAYMENT_CONFIG;
}

export function savePaymentConfig(config: PaymentConfig): void {
  localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(config));
}

// Generates a UPI deep link QR code URL dynamically
export function getUpiQrUrl(config: PaymentConfig): string {
  if (config.upiQrUrl) return config.upiQrUrl;
  const upiString = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.upiName)}&am=${config.amount}&cu=${config.currency}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
}
