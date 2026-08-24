import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Calendar,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { Member, MonthlyCollection, Loan, LoanRepayment, Income, Expense, ActiveTab, Drawing, F5WCollection } from '../types';

interface DashboardProps {
  members: Member[];
  collections: MonthlyCollection[];
  loans: Loan[];
  repayments: LoanRepayment[];
  income: Income[];
  expense: Expense[];
  drawings?: Drawing[];
  f5wData?: F5WCollection[];
  onNavigate: (tab: ActiveTab, memberNo?: string) => void;
}

export default function Dashboard({
  members,
  collections,
  loans,
  repayments,
  income,
  expense,
  drawings = [],
  f5wData = [],
  onNavigate
}: DashboardProps) {
  const [time, setTime] = useState(new Date());

  // Clock ticks
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Member stats
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'Active').length;

  // F5W Collection paid total
  const f5wPaidTotal = f5wData.reduce((sum, f) => {
    return sum + (f.col1 || 0) + (f.col2 || 0) + (f.col3 || 0) + (f.col4 || 0) + (f.col5 || 0);
  }, 0);

  // F5W Collection paid via Google Pay (defaults to GPay if colMode is not 'Cash')
  const f5wGPayTotal = f5wData.reduce((sum, f) => {
    const v1 = (f.col1Mode === 'Cash') ? 0 : (f.col1 || 0);
    const v2 = (f.col2Mode === 'Cash') ? 0 : (f.col2 || 0);
    const v3 = (f.col3Mode === 'Cash') ? 0 : (f.col3 || 0);
    const v4 = (f.col4Mode === 'Cash') ? 0 : (f.col4 || 0);
    const v5 = (f.col5Mode === 'Cash') ? 0 : (f.col5 || 0);
    return sum + v1 + v2 + v3 + v4 + v5;
  }, 0);

  // F5W Collection paid via Cash
  const f5wCashTotal = f5wData.reduce((sum, f) => {
    const v1 = (f.col1Mode === 'Cash') ? (f.col1 || 0) : 0;
    const v2 = (f.col2Mode === 'Cash') ? (f.col2 || 0) : 0;
    const v3 = (f.col3Mode === 'Cash') ? (f.col3 || 0) : 0;
    const v4 = (f.col4Mode === 'Cash') ? (f.col4 || 0) : 0;
    const v5 = (f.col5Mode === 'Cash') ? (f.col5 || 0) : 0;
    return sum + v1 + v2 + v3 + v4 + v5;
  }, 0);

  // Collection (Monthly + F5W)
  const totalCollection = collections
    .filter(c => c.status === 'Paid')
    .reduce((sum, c) => sum + c.amount, 0) + f5wPaidTotal;

  // Reconstruct original loan amounts for accurate cash flow & balance tracking
  const processedLoans = useMemo(() => {
    return loans.map(l => {
      const repaymentsForLoan = repayments.filter(r => r.loanId === l.id);
      const totalRepaidForLoan = repaymentsForLoan.reduce((sum, r) => sum + r.amount, 0);
      return {
        ...l,
        amount: l.amount + totalRepaidForLoan
      };
    });
  }, [loans, repayments]);

  // Given Amounts (Grants)
  const totalGivenAmount = processedLoans
    .filter(l => l.type === 'given')
    .reduce((sum, l) => sum + l.amount, 0);

  // Loans Given
  const totalLoans = processedLoans
    .filter(l => l.type === 'loan' || !l.type)
    .reduce((sum, l) => sum + l.amount, 0);

  // Loans & Given combined for total cash outflows
  const totalGiven = totalGivenAmount + totalLoans;

  // Loan Repayments (returned)
  const totalRepayments = repayments.reduce((sum, r) => sum + r.amount, 0);

  // Income
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);

  // Expense
  const totalExpense = expense.reduce((sum, e) => sum + e.amount, 0);

  // Total Balance
  const totalBalance = (totalCollection + totalIncome + totalRepayments) - (totalGiven + totalExpense);

  // Cash calculations
  const collectionsCash = collections
    .filter(c => c.status === 'Paid' && (c.paymentMode === 'Cash' || !c.paymentMode))
    .reduce((sum, c) => sum + c.amount, 0) + f5wCashTotal;
  const incomeCash = income
    .filter(i => i.paymentMode === 'Cash' || !i.paymentMode)
    .reduce((sum, i) => sum + i.amount, 0);
  const repaymentsCash = repayments
    .filter(r => r.paymentMode === 'Cash' || !r.paymentMode)
    .reduce((sum, r) => sum + r.amount, 0);
  const loansCash = processedLoans
    .filter(l => l.paymentMode === 'Cash' || !l.paymentMode)
    .reduce((sum, l) => sum + l.amount, 0);
  const expenseCash = expense
    .filter(e => e.paymentMode === 'Cash' || !e.paymentMode)
    .reduce((sum, e) => sum + e.amount, 0);

  // Drawings / Fund Transfers (Google Pay <-> Hand)
  const gpayToHand = drawings
    .filter(d => (d.fromAccount === 'Google Pay' || !d.fromAccount) && (d.toAccount === 'Hand' || !d.toAccount || d.toAccount === 'Cash in Hand'))
    .reduce((sum, d) => sum + d.amount, 0);

  const handToGpay = drawings
    .filter(d => (d.fromAccount === 'Hand' || d.fromAccount === 'Cash in Hand') && d.toAccount === 'Google Pay')
    .reduce((sum, d) => sum + d.amount, 0);

  const cashInHand = (collectionsCash + incomeCash + repaymentsCash + gpayToHand - handToGpay) - (loansCash + expenseCash);

  // Google Pay calculations
  const collectionsGPay = collections
    .filter(c => c.status === 'Paid' && c.paymentMode === 'Google Pay')
    .reduce((sum, c) => sum + c.amount, 0) + f5wGPayTotal;
  const incomeGPay = income
    .filter(i => i.paymentMode === 'Google Pay')
    .reduce((sum, i) => sum + i.amount, 0);
  const repaymentsGPay = repayments
    .filter(r => r.paymentMode === 'Google Pay')
    .reduce((sum, r) => sum + r.amount, 0);
  const loansGPay = processedLoans
    .filter(l => l.paymentMode === 'Google Pay')
    .reduce((sum, l) => sum + l.amount, 0);
  const expenseGPay = expense
    .filter(e => e.paymentMode === 'Google Pay')
    .reduce((sum, e) => sum + e.amount, 0);

  const googlePayBalance = (collectionsGPay + incomeGPay + repaymentsGPay + handToGpay - gpayToHand) - (loansGPay + expenseGPay);

  // Formatted date and time
  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const statsCards = [
    {
      title: 'Total Balance',
      value: `₹${totalBalance.toLocaleString('en-IN')}`,
      subtitle: 'Net available funds',
      icon: Wallet,
      color: 'from-emerald-600 to-teal-700',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      valueColor: 'text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500',
      tab: 'reports' as const
    },
    {
      title: 'Cash in Hand',
      value: `₹${cashInHand.toLocaleString('en-IN')}`,
      subtitle: 'Physical cash available',
      icon: TrendingUp,
      color: 'from-green-600 to-emerald-800',
      textColor: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100/60 dark:bg-green-950/30',
      valueColor: 'text-green-700 dark:text-green-300 group-hover:text-green-600',
      tab: 'reports' as const
    },
    {
      title: 'Google Pay Balance',
      value: `₹${googlePayBalance.toLocaleString('en-IN')}`,
      subtitle: 'Digital bank funds',
      icon: CreditCard,
      color: 'from-sky-500 to-blue-600',
      textColor: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/20',
      valueColor: 'text-sky-600 dark:text-sky-400 group-hover:text-sky-500',
      tab: 'reports' as const
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner and Time */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="space-y-2 sm:space-y-3 relative z-10">
          <div className="flex flex-wrap gap-2 items-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Sali</h1>
            <span className="px-2.5 py-0.5 bg-white/10 dark:bg-black/20 text-white rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/15">
              {totalMembers} Members ({activeMembers} Active)
            </span>
          </div>
          <p className="text-emerald-100 max-w-xl text-xs sm:text-sm leading-relaxed">
            Welcome to the USBA Marriage Fund
          </p>
        </div>

        {/* Live Date/Time Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 flex items-center gap-3 sm:gap-4 shrink-0 relative z-10">
          <div className="p-2.5 sm:p-3 bg-white/20 rounded-xl text-emerald-100">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold tracking-wider font-mono">{formattedTime}</div>
            <div className="text-[11px] sm:text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid - 3 Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onNavigate(card.tab)}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md dark:hover:border-emerald-900 hover:border-emerald-100 cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99]"
              id={`dashboard-card-${card.title.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  {card.title}
                </p>
                <h3 className={`text-2xl md:text-3xl font-extrabold transition-colors ${card.valueColor || 'text-zinc-900 dark:text-zinc-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                  {card.value}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {card.subtitle}
                </p>
              </div>

              <div className={`p-4 rounded-xl ${card.bgColor} ${card.textColor} group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
