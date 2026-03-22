export type Shift = 'Morning' | 'Night';
export type FoodPreference = 'Veg' | 'Non-Veg';

export interface WeeklyPlan {
  monday: FoodPreference;
  tuesday: FoodPreference;
  wednesday: FoodPreference;
  thursday: FoodPreference;
  friday: FoodPreference;
}

export type Step = 'login' | 'shift' | 'food' | 'payment' | 'summary';

export interface EmployeeData {
  id: string;
  shift: Shift | null;
  plan: WeeklyPlan | null;
  paid: boolean;
  lastUpdated: string | null;
}

// ─── TRANSACTION ─────────────────────────────────────────────────────────────
export interface Transaction {
  txnId: string;            // unique ID entered by employee
  method: 'Card' | 'UPI' | 'NetBanking';
  amount: number;
  timestamp: string;        // ISO
  employeeId: string;
  status: 'pending' | 'verified' | 'rejected';
  refundStatus?: 'none' | 'requested' | 'processed';
  refundRequestedAt?: string;
  verifiedAt?: string;
}

// ─── STORED USER ─────────────────────────────────────────────────────────────
export interface StoredUserData {
  shift: Shift | null;
  plan: WeeklyPlan | null;
  isPaid: boolean;
  lastUpdated: string | null;
  terminationRequested: boolean;
  terminationStatus?: 'pending' | 'approved' | 'rejected';
  terminationRef?: string;
  paymentMethod: 'Card' | 'UPI' | 'NetBanking';
  txnId?: string;           // transaction ID entered by employee
}

export type AdminView = 'dashboard' | 'employees' | 'transactions' | 'terminations' | 'manifest' | 'settings' | 'payment-config';

// ─── GLOBAL TXN STORE KEY ────────────────────────────────────────────────────
export const TXN_STORE_KEY = 'catertrack_transactions';

export function getAllTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TXN_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveTransaction(txn: Transaction): void {
  const all = getAllTransactions();
  const idx = all.findIndex(t => t.txnId === txn.txnId);
  if (idx >= 0) all[idx] = txn; else all.unshift(txn);
  localStorage.setItem(TXN_STORE_KEY, JSON.stringify(all));
}

export function isTxnIdUsed(txnId: string): boolean {
  return getAllTransactions().some(t => t.txnId === txnId && t.status !== 'rejected');
}
