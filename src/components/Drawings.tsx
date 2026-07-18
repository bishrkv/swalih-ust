import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  ArrowRightLeft,
  Search,
  DollarSign,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Drawing } from '../types';
import { saveDrawing, deleteDrawing } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface DrawingsProps {
  drawings: Drawing[];
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Drawings({ drawings, addToast }: DrawingsProps) {
  // Modal open state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fromAccount, setFromAccount] = useState('Google Pay');
  const [toAccount, setToAccount] = useState('Hand');

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Delete flow state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Total withdrawn amount
  const totalWithdrawn = useMemo(() => {
    return drawings.reduce((sum, d) => sum + d.amount, 0);
  }, [drawings]);

  // Filtered drawings
  const filteredDrawings = useMemo(() => {
    return drawings.filter((d) => {
      const term = searchTerm.toLowerCase();
      return (
        d.description.toLowerCase().includes(term) ||
        d.amount.toString().includes(term) ||
        d.date.includes(term) ||
        d.fromAccount.toLowerCase().includes(term) ||
        d.toAccount.toLowerCase().includes(term)
      );
    });
  }, [drawings, searchTerm]);

  // Save drawing transaction
  const handleSaveDrawing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount) {
      addToast('Please enter an amount', 'error');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    const drawingObj: Drawing = {
      id: `draw_${Date.now()}`,
      date,
      amount: amt,
      description: description.trim() || 'Bank withdrawal (G Pay to Hand)',
      fromAccount,
      toAccount,
      createdAt: Date.now()
    };

    try {
      await saveDrawing(drawingObj);
      addToast(`Recorded withdrawal of ₹${amt.toLocaleString('en-IN')} from G Pay to Hand`, 'success');
      setIsModalOpen(false);

      // Reset
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setFromAccount('Google Pay');
      setToAccount('Hand');
    } catch (err) {
      console.error(err);
      addToast('Failed to record withdrawal', 'error');
    }
  };

  // Confirm and delete record
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      await deleteDrawing(deleteTargetId);
      addToast('Withdrawal record deleted successfully', 'success');
      setDeleteTargetId(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to delete withdrawal record', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            Drawings Ledger
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Record and audit cash withdrawals from Google Pay (Bank) to hand/cash.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            id="drawings-add-btn"
          >
            <Plus className="w-4 h-4" />
            Record Withdrawal
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Total Withdrawn
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 font-mono">
              ₹{totalWithdrawn.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
              Transferred G Pay → Hand
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Total Drawings Recorded
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 font-mono">
              {drawings.length}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
              Audit log size
            </span>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search drawings by description, amount or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
              id="drawings-search"
            />
          </div>
          <div className="text-xs font-bold text-zinc-400 font-mono uppercase">
            Showing {filteredDrawings.length} transactions
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Disbursement Date</th>
                <th className="px-6 py-4">Transfer Route</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm font-medium">
              {filteredDrawings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-400 font-medium font-sans">
                    No drawings recorded matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredDrawings.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors group">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {d.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-[10px] rounded-md font-bold uppercase">
                          {d.fromAccount}
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-[10px] rounded-md font-bold uppercase">
                          {d.toAccount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 font-bold font-mono">
                      ₹{d.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {d.description}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTargetId(d.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete drawing record"
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
      </div>

      {/* Record Drawing modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 p-5 text-white flex items-center justify-between">
                <h3 className="font-bold text-base">Record Cash Withdrawal</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white text-xl">
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveDrawing} className="p-6 space-y-4">
                {/* Date & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Route visual selection */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Transfer Direction
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">From</span>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Google Pay</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-zinc-400 block font-semibold uppercase">To</span>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Cash in Hand</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Cash in hand for emergency loans"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Withdrawal Record"
        message="Are you sure you want to permanently delete this withdrawal record? This will adjust your ledgers immediately."
      />
    </div>
  );
}
