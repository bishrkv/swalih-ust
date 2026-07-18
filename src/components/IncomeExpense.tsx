import React, { useState, useMemo } from 'react';
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Income, Expense } from '../types';
import { saveIncome, deleteIncome, saveExpense, deleteExpense } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface IncomeExpenseProps {
  income: Income[];
  expense: Expense[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const INCOME_CATEGORIES = [
  'Donation / Sadaqah',
  'Marriage Contribution',
  'Special Fundraiser',
  'Bank Interest',
  'Other Income'
];

const EXPENSE_CATEGORIES = [
  'Marriage Financial Aid',
  'Administrative / Office',
  'Stationery & Printing',
  'Travel / Conveyance',
  'Audit & Legal Fees',
  'Refreshments / Event',
  'Other Expense'
];

export default function IncomeExpense({ income, expense, addToast }: IncomeExpenseProps) {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form states - Income
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incCategory, setIncCategory] = useState(INCOME_CATEGORIES[0]);
  const [incAmount, setIncAmount] = useState('');
  const [incDesc, setIncDesc] = useState('');
  const [incPayMode, setIncPayMode] = useState<'Cash' | 'Google Pay'>('Cash');

  // Form states - Expense
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expPayMode, setExpPayMode] = useState<'Cash' | 'Google Pay'>('Cash');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'income' | 'expense' } | null>(null);

  // Totals
  const totalIncome = useMemo(() => {
    return income.reduce((sum, i) => sum + i.amount, 0);
  }, [income]);

  const totalExpense = useMemo(() => {
    return expense.reduce((sum, e) => sum + e.amount, 0);
  }, [expense]);

  // Handle Income Save
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(incAmount);
    if (!incAmount || isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const incomeObj: Income = {
      id: `inc_${Date.now()}`,
      date: incDate,
      category: incCategory,
      amount: amt,
      description: incDesc.trim(),
      paymentMode: incPayMode,
      createdAt: Date.now()
    };

    try {
      await saveIncome(incomeObj);
      addToast('Income record saved successfully', 'success');
      setIsIncomeModalOpen(false);

      // Reset
      setIncAmount('');
      setIncDesc('');
    } catch (err) {
      console.error(err);
      addToast('Failed to save income', 'error');
    }
  };

  // Handle Expense Save
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(expAmount);
    if (!expAmount || isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const expenseObj: Expense = {
      id: `exp_${Date.now()}`,
      date: expDate,
      category: expCategory,
      amount: amt,
      description: expDesc.trim(),
      paymentMode: expPayMode,
      createdAt: Date.now()
    };

    try {
      await saveExpense(expenseObj);
      addToast('Expense record saved successfully', 'success');
      setIsExpenseModalOpen(false);

      // Reset
      setExpAmount('');
      setExpDesc('');
    } catch (err) {
      console.error(err);
      addToast('Failed to save expense', 'error');
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'income') {
        await deleteIncome(deleteTarget.id);
        addToast('Income transaction cleared successfully', 'success');
      } else {
        await deleteExpense(deleteTarget.id);
        addToast('Expense transaction cleared successfully', 'success');
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete transaction', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            Cash Flow (Income / Expense)
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Log miscellaneous donor contributions, administrative fees, charity payouts, and operational expenses.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            id="inc-exp-add-expense-btn"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="inc-exp-add-income-btn"
          >
            <Plus className="w-4 h-4" />
            Add Income
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Total Income */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Other Income</p>
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{totalIncome.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">Excludes member collections</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <ArrowUpRight className="w-6 h-6 animate-bounce" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Expenses</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
              ₹{totalExpense.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">Auto-deducted from balance</p>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl w-full max-w-xs">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'income'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
          }`}
          id="inc-exp-tab-income"
        >
          Income Register
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'expense'
              ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
          }`}
          id="inc-exp-tab-expense"
        >
          Expense Register
        </button>
      </div>

      {/* Tables Log */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {activeTab === 'income' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="income-register-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {income.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400 font-medium">
                      No income records logged yet.
                    </td>
                  </tr>
                ) : (
                  income.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {item.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-md">
                          <Bookmark className="w-3.5 h-3.5 shrink-0" />
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {item.paymentMode || 'Cash'}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-medium max-w-sm truncate">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: item.id, type: 'income' })}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Record"
                          id={`delete-income-btn-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="expense-register-table">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {expense.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400 font-medium">
                      No expense records logged yet.
                    </td>
                  </tr>
                ) : (
                  expense.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {item.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold px-2.5 py-1 rounded-md">
                          <Bookmark className="w-3.5 h-3.5 shrink-0" />
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold font-mono text-rose-600 dark:text-rose-400">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {item.paymentMode || 'Cash'}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-medium max-w-sm truncate">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: item.id, type: 'expense' })}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Record"
                          id={`delete-expense-btn-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Income Modal */}
      <AnimatePresence>
        {isIncomeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIncomeModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 p-5 text-white flex items-center justify-between">
                <h3 className="font-bold text-base" id="income-modal-title">Record General Income</h3>
                <button onClick={() => setIsIncomeModalOpen(false)} className="text-white/80 hover:text-white">
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Income Category *
                  </label>
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    id="income-form-category"
                  >
                    {INCOME_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Date Received *
                    </label>
                    <input
                      type="date"
                      required
                      value={incDate}
                      onChange={(e) => setIncDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      id="income-form-date"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={incAmount}
                      onChange={(e) => setIncAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm"
                      placeholder="e.g. 1000"
                      id="income-form-amount"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Payment Mode
                  </label>
                  <div className="flex gap-2">
                    {(['Cash', 'Google Pay'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setIncPayMode(mode)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          incPayMode === mode
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/20 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                        id={`income-form-paymode-${mode.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Source / Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={incDesc}
                    onChange={(e) => setIncDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Enter details of who gave or purpose"
                    id="income-form-desc"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIncomeModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    id="income-form-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    id="income-form-submit"
                  >
                    Save Income
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-rose-800 to-rose-700 p-5 text-white flex items-center justify-between">
                <h3 className="font-bold text-base" id="expense-modal-title">Record New Expense</h3>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-white/80 hover:text-white">
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Expense Category *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    id="expense-form-category"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Date Paid *
                    </label>
                    <input
                      type="date"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                      id="expense-form-date"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm"
                      placeholder="e.g. 500"
                      id="expense-form-amount"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Payment Mode
                  </label>
                  <div className="flex gap-2">
                    {(['Cash', 'Google Pay'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setExpPayMode(mode)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          expPayMode === mode
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-500 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/20 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                        id={`expense-form-paymode-${mode.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Purpose / Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Enter details of purchase or payment"
                    id="expense-form-desc"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    id="expense-form-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                    id="expense-form-submit"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.type === 'income' ? 'Delete Income Record' : 'Delete Expense Record'}
        message="Are you sure you want to delete this cash flow entry? This will permanently modify books and balance calculations."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
