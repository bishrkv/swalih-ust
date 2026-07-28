import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Coins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  History,
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

  // Calculations
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

  const totalWithdrawn = drawings.reduce((sum, d) => sum + d.amount, 0);

  const cashInHand = (collectionsCash + incomeCash + repaymentsCash + totalWithdrawn) - (loansCash + expenseCash);

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

  const googlePayBalance = (collectionsGPay + incomeGPay + repaymentsGPay) - (loansGPay + expenseGPay + totalWithdrawn);

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

  // Recent 5 activities combined
  const activities: { type: string; title: string; amount: number; date: string; mode: string }[] = [];
  
  collections.filter(c => c.status === 'Paid').slice(0, 5).forEach(c => {
    activities.push({
      type: 'Collection',
      title: `Collection from Member ${c.memberNo} (${c.memberName})`,
      amount: c.amount,
      date: new Date(c.updatedAt).toISOString().split('T')[0],
      mode: c.paymentMode || 'Cash'
    });
  });

  processedLoans.slice(0, 5).forEach(l => {
    activities.push({
      type: 'Loan Given',
      title: `Loan given to Member ${l.memberNo} (${l.memberName})`,
      amount: -l.amount,
      date: l.date,
      mode: l.paymentMode || 'Cash'
    });
  });

  repayments.slice(0, 5).forEach(r => {
    activities.push({
      type: 'Repayment',
      title: `Loan repayment by Member ${r.memberNo} (${r.memberName})`,
      amount: r.amount,
      date: r.date,
      mode: r.paymentMode || 'Cash'
    });
  });

  income.slice(0, 5).forEach(i => {
    activities.push({
      type: 'Income',
      title: `${i.category}: ${i.description}`,
      amount: i.amount,
      date: i.date,
      mode: i.paymentMode || 'Cash'
    });
  });

  expense.slice(0, 5).forEach(e => {
    activities.push({
      type: 'Expense',
      title: `${e.category}: ${e.description}`,
      amount: -e.amount,
      date: e.date,
      mode: e.paymentMode || 'Cash'
    });
  });

  // Sort activities by date desc
  const recentActivities = activities
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const statsCards = [
    {
      title: 'Total Balance',
      value: `₹${totalBalance.toLocaleString('en-IN')}`,
      subtitle: 'Net available funds',
      icon: Wallet,
      color: 'from-green-600 to-emerald-700',
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      valueColor: 'text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500',
      tab: 'reports' as const
    },
    {
      title: 'Total Collection',
      value: `₹${totalCollection.toLocaleString('en-IN')}`,
      subtitle: 'Monthly + F5W Collections',
      icon: Coins,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      tab: 'grand-total' as const
    },
    {
      title: 'Cash in Hand',
      value: `₹${cashInHand.toLocaleString('en-IN')}`,
      subtitle: 'Physical cash available',
      icon: TrendingUp,
      color: 'from-emerald-600 to-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-100/50 dark:bg-emerald-950/30',
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
      tab: 'reports' as const
    },
    {
      title: 'Loans Remaining',
      value: `₹${Math.max(0, totalLoans - totalRepayments).toLocaleString('en-IN')}`,
      subtitle: `Total Disbursed: ₹${totalLoans.toLocaleString('en-IN')}`,
      icon: ArrowUpRight,
      color: 'from-rose-500 to-rose-600',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/20',
      valueColor: 'text-rose-600 dark:text-rose-400 group-hover:text-rose-500',
      tab: 'loans' as const
    },
    {
      title: 'Given Amount',
      value: `₹${totalGivenAmount.toLocaleString('en-IN')}`,
      subtitle: 'Non-repayable grants',
      icon: ArrowUpRight,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      tab: 'given' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner and Time */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="space-y-3 relative z-10">
          <div className="flex flex-wrap gap-2 items-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sali</h1>
            <span className="px-2.5 py-0.5 bg-white/10 dark:bg-black/20 text-white rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/15">
              {totalMembers} Members ({activeMembers} Active)
            </span>
          </div>
          <p className="text-emerald-100 max-w-xl text-sm leading-relaxed">
            Welcome to the USBA Marriage Fund
          </p>
        </div>

        {/* Live Date/Time Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 shrink-0 relative z-10">
          <div className="p-3 bg-white/20 rounded-xl text-emerald-100">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-wider font-mono">{formattedTime}</div>
            <div className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onNavigate(card.tab)}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md dark:hover:border-emerald-900 hover:border-emerald-100 cursor-pointer transition-all flex items-center justify-between group"
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

      {/* Lower Section (Recent Activities and Fund Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Ledger Entries */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Recent Activities</h2>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              id="dashboard-all-activities-btn"
            >
              View Reports
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              No recent entries found. Begin adding collections or transactions.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentActivities.map((act, index) => {
                const isNegative = act.amount < 0;
                return (
                  <div key={index} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {act.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md font-medium">
                          {act.type}
                        </span>
                        <span>•</span>
                        <span>{act.date}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {act.mode}
                        </span>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-sm shrink-0 ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isNegative ? '-' : '+'}₹{Math.abs(act.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods and System State */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Payment Methods</h2>
            
            <div className="space-y-4">
              {/* Cash Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Cash in Hand</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    ₹{cashInHand.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${totalBalance > 0 ? Math.max(0, Math.min(100, (cashInHand / totalBalance) * 100)) : 0}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>{totalBalance > 0 ? `${Math.round((cashInHand / totalBalance) * 100)}% of total` : '0%'}</span>
                </div>
              </div>

              {/* GPay Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Google Pay Balance</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    ₹{googlePayBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{
                      width: `${totalBalance > 0 ? Math.max(0, Math.min(100, (googlePayBalance / totalBalance) * 100)) : 0}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>{totalBalance > 0 ? `${Math.round((googlePayBalance / totalBalance) * 100)}% of total` : '0%'}</span>
                </div>
              </div>
            </div>

            {/* Quick Status Box */}
            <div className="mt-6 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
                Account Status
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                The Ledger books are balanced and sync'd to Google Firebase Firestore. Standard security rules are active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
