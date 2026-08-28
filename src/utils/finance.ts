import { Member, MonthlyCollection, Loan, LoanRepayment, Income, Expense, Drawing, F5WCollection } from '../types';

export interface FinancialSummary {
  // Grand Total Fund (Paid Monthly + Paid F5W)
  grandTotalFund: number;
  fundCash: number;
  fundGPay: number;
  monthlyCollTotal: number;
  monthlyCollCash: number;
  monthlyCollGPay: number;
  f5wPaidTotal: number;
  f5wCashTotal: number;
  f5wGPayTotal: number;

  // Loans & Given Amounts
  remainingLoanBalance: number; // Loan Total (Active / Remaining loans)
  loanCash: number;
  loanGPay: number;
  totalLoansGiven: number; // Disbursed principal
  totalLoanRepayments: number; // Repayments received

  totalGivenAmount: number; // Given Amount Total (Non-refundable marriage aid / grants)
  givenCash: number;
  givenGPay: number;

  // Other Income & Expenses (if any)
  totalIncome: number;
  incomeCash: number;
  incomeGPay: number;
  totalExpense: number;
  expenseCash: number;
  expenseGPay: number;

  // Drawings / Inter-account transfers
  gpayToCash: number;
  cashToGPay: number;
  netDrawingToCash: number;
  netDrawingToGPay: number;

  // Core Treasury Balances:
  // Total Balance = Cash in Hand + Google Pay Balance = Grand Total - Loan Total - Given Amount Total
  totalBalance: number;
  cashInHand: number;
  googlePayBalance: number;
  sumOfCashAndGPay: number;

  // Formula Breakdown display
  formulaString: string;
}

export function isCashPayment(mode?: string | null): boolean {
  if (!mode) return true; // Default fallback is Cash
  const m = mode.trim().toLowerCase();
  return m === 'cash' || m === 'hand' || m === 'cash in hand';
}

export function isGooglePayPayment(mode?: string | null): boolean {
  if (!mode) return false;
  const m = mode.trim().toLowerCase();
  return (
    m === 'google pay' ||
    m === 'gpay' ||
    m === 'online' ||
    m === 'upi' ||
    m === 'bank transfer' ||
    m === 'bank'
  );
}

/**
 * Calculates unified financial metrics according to the exact business rule:
 * Total Balance = Cash in Hand + Google Pay Balance = Grand Total Fund - Loan Total - Given Amount Total
 */
export function calculateFinancials(params: {
  collections: MonthlyCollection[];
  loans: Loan[];
  repayments: LoanRepayment[];
  income?: Income[];
  expense?: Expense[];
  drawings?: Drawing[];
  f5wData?: F5WCollection[];
}): FinancialSummary {
  const {
    collections = [],
    loans = [],
    repayments = [],
    income = [],
    expense = [],
    drawings = [],
    f5wData = []
  } = params;

  // 1. F5W Collections (5-week weekly contributions)
  let f5wCashTotal = 0;
  let f5wGPayTotal = 0;
  f5wData.forEach((f) => {
    const cols = [
      { amt: f.col1 || 0, mode: f.col1Mode },
      { amt: f.col2 || 0, mode: f.col2Mode },
      { amt: f.col3 || 0, mode: f.col3Mode },
      { amt: f.col4 || 0, mode: f.col4Mode },
      { amt: f.col5 || 0, mode: f.col5Mode }
    ];
    cols.forEach(({ amt, mode }) => {
      if (amt > 0) {
        if (isCashPayment(mode)) {
          f5wCashTotal += amt;
        } else {
          f5wGPayTotal += amt;
        }
      }
    });
  });
  const f5wPaidTotal = f5wCashTotal + f5wGPayTotal;

  // 2. Monthly Collections (Subscriptions marked as Paid)
  let monthlyCollCash = 0;
  let monthlyCollGPay = 0;
  collections.forEach((c) => {
    if (c.status === 'Paid') {
      const amt = c.amount || 0;
      if (isCashPayment(c.paymentMode)) {
        monthlyCollCash += amt;
      } else {
        monthlyCollGPay += amt;
      }
    }
  });
  const monthlyCollTotal = monthlyCollCash + monthlyCollGPay;

  // Grand Total Fund (Consolidated Member Contributions)
  const grandTotalFund = monthlyCollTotal + f5wPaidTotal;
  const fundCash = monthlyCollCash + f5wCashTotal;
  const fundGPay = monthlyCollGPay + f5wGPayTotal;

  // 3. Repayments (Total Loan Repayments Received)
  const totalLoanRepayments = repayments.reduce((sum, r) => sum + (r.amount || 0), 0);

  // 4. Loan Total (Active / Remaining loan balance)
  let remainingLoanBalance = 0;
  let loanCash = 0;
  let loanGPay = 0;

  loans.forEach((l) => {
    if (l.type === 'loan' || !l.type) {
      const remAmt = Math.max(0, l.amount || 0);
      remainingLoanBalance += remAmt;

      if (remAmt > 0) {
        if (l.paymentMode === 'Cash') {
          loanCash += remAmt;
        } else if (l.paymentMode === 'Google Pay') {
          loanGPay += remAmt;
        } else if (l.paymentMode === 'Split' || ((l.cashAmount || 0) > 0 && (l.gpayAmount || 0) > 0)) {
          const splitTotal = (l.cashAmount || 0) + (l.gpayAmount || 0);
          if (splitTotal > 0) {
            const cashPart = Math.round(remAmt * (l.cashAmount || 0) / splitTotal);
            const gpayPart = remAmt - cashPart;
            loanCash += cashPart;
            loanGPay += gpayPart;
          } else {
            loanGPay += remAmt;
          }
        } else if (isCashPayment(l.paymentMode)) {
          loanCash += remAmt;
        } else {
          loanGPay += remAmt;
        }
      }
    }
  });

  const totalLoansGiven = remainingLoanBalance + totalLoanRepayments;

  // 5. Given Amount Total (Marriage aid / non-refundable grants)
  let totalGivenAmount = 0;
  let givenCash = 0;
  let givenGPay = 0;

  loans.forEach((l) => {
    if (l.type === 'given') {
      const amt = Math.max(0, l.amount || 0);
      totalGivenAmount += amt;
      if (isCashPayment(l.paymentMode)) {
        givenCash += amt;
      } else {
        givenGPay += amt;
      }
    }
  });

  // 6. Other Income & Expenses
  let incomeCash = 0;
  let incomeGPay = 0;
  income.forEach((i) => {
    const amt = i.amount || 0;
    if (isCashPayment(i.paymentMode)) {
      incomeCash += amt;
    } else {
      incomeGPay += amt;
    }
  });
  const totalIncome = incomeCash + incomeGPay;

  let expenseCash = 0;
  let expenseGPay = 0;
  expense.forEach((e) => {
    const amt = e.amount || 0;
    if (isCashPayment(e.paymentMode)) {
      expenseCash += amt;
    } else {
      expenseGPay += amt;
    }
  });
  const totalExpense = expenseCash + expenseGPay;

  // 7. Drawings / Transfers
  let gpayToCash = 0;
  let cashToGPay = 0;
  drawings.forEach((d) => {
    const amt = d.amount || 0;
    const from = (d.fromAccount || '').trim().toLowerCase();
    const isFromGPay = from.includes('google') || from.includes('gpay') || from.includes('bank');
    if (isFromGPay) {
      gpayToCash += amt;
    } else {
      cashToGPay += amt;
    }
  });

  const netDrawingToCash = gpayToCash - cashToGPay;
  const netDrawingToGPay = cashToGPay - gpayToCash;

  // 8. Core Total Balance Calculation:
  // Exact formula: Total Balance = Grand Total Fund - Loan Total - Given Amount Total
  const totalBalance = (grandTotalFund + totalIncome) - remainingLoanBalance - totalGivenAmount - totalExpense;

  // Cash in Hand & Google Pay Balance:
  // Cash in Hand = (Cash Fund + Cash Income + Net Drawings to Cash) - Cash Loans - Cash Given - Cash Expense
  const cashInHand = (fundCash + incomeCash + netDrawingToCash) - loanCash - givenCash - expenseCash;

  // Google Pay Balance = (GPay Fund + GPay Income + Net Drawings to GPay) - GPay Loans - GPay Given - GPay Expense
  const googlePayBalance = (fundGPay + incomeGPay + netDrawingToGPay) - loanGPay - givenGPay - expenseGPay;

  // Sum of Cash in Hand + Google Pay Balance
  const sumOfCashAndGPay = cashInHand + googlePayBalance;

  const formulaString = `Total Balance (₹${totalBalance.toLocaleString('en-IN')}) = Grand Total (₹${grandTotalFund.toLocaleString('en-IN')}) − Loan Total (₹${remainingLoanBalance.toLocaleString('en-IN')}) − Given Amount Total (₹${totalGivenAmount.toLocaleString('en-IN')})`;

  return {
    grandTotalFund,
    fundCash,
    fundGPay,
    monthlyCollTotal,
    monthlyCollCash,
    monthlyCollGPay,
    f5wPaidTotal,
    f5wCashTotal,
    f5wGPayTotal,

    remainingLoanBalance,
    loanCash,
    loanGPay,
    totalLoansGiven,
    totalLoanRepayments,

    totalGivenAmount,
    givenCash,
    givenGPay,

    totalIncome,
    incomeCash,
    incomeGPay,

    totalExpense,
    expenseCash,
    expenseGPay,

    gpayToCash,
    cashToGPay,
    netDrawingToCash,
    netDrawingToGPay,

    totalBalance,
    cashInHand,
    googlePayBalance,
    sumOfCashAndGPay,

    formulaString
  };
}
