export interface Member {
  id: string; // matches memberNo
  memberNo: string;
  memberName: string;
  phone: string;
  address: string;
  status: 'Active' | 'Inactive';
  createdAt: number;
}

export interface MonthlyCollection {
  id: string; // memberNo_year_month
  memberNo: string;
  memberName: string;
  year: string;  // e.g., "2025-2026", "2026-2027"
  month: string; // e.g., "May", "June"
  amount: number;
  status: 'Paid' | 'Pending';
  remarks: string;
  paymentMode: 'Cash' | 'Google Pay';
  updatedAt: number;
}

export interface Loan {
  id: string;
  memberNo: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason: string;
  notes: string;
  paymentMode: 'Cash' | 'Google Pay';
  createdAt: number;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  memberNo: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMode: 'Cash' | 'Google Pay';
  notes: string;
  createdAt: number;
}

export interface Income {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  description: string;
  paymentMode: 'Cash' | 'Google Pay';
  createdAt: number;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  description: string;
  paymentMode: 'Cash' | 'Google Pay';
  createdAt: number;
}

export interface SystemSettings {
  passwordHash: string; // Defaults to hashing/saving 6780, can be updated
}

export type ActiveTab =
  | 'dashboard'
  | 'members'
  | 'profile'
  | 'collection'
  | 'loans'
  | 'income'
  | 'expense'
  | 'reports'
  | 'settings';
