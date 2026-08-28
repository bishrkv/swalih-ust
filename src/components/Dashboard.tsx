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
import { calculateFinancials } from '../utils/finance';

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

  // Financial aggregates using centralized calculation
  const financials = useMemo(() => {
    return calculateFinancials({
      collections,
      loans,
      repayments,
      income,
      expense,
      drawings,
      f5wData
    });
  }, [collections, loans, repayments, income, expense, drawings, f5wData]);

  const {
    totalBalance,
    cashInHand,
    googlePayBalance
  } = financials;

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
      subtitle: 'Grand Total − Loan Total − Given Amount',
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
      subtitle: 'Physical cash ledger',
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

